import { ChainMetadata, ChainName, EvmWarpModule, MultiProtocolProvider } from '@hyperlane-xyz/sdk';
import { logger } from '../../utils/logger';
import { isEvmChain } from '../../utils/protocolUtils';
import type { AnnotatedTransaction, WarpConfig } from './types';

/**
 * Generate warp update transactions without executing them
 * Uses hybrid approach: try SDK method first, fall back to manual building
 * @param chainName - Target chain name
 * @param warpRouteAddress - Deployed warp route contract address
 * @param config - New warp configuration to apply
 * @param chainMetadata - Chain metadata
 * @param multiProvider - MultiProtocolProvider instance
 * @returns Array of annotated transactions to execute
 * @throws Error if chain is not EVM or generation fails
 */
export async function generateUpdateTransactions(
  chainName: ChainName,
  warpRouteAddress: string,
  config: WarpConfig,
  chainMetadata: ChainMetadata,
  multiProvider: MultiProtocolProvider
): Promise<AnnotatedTransaction[]> {

  if (!isEvmChain(chainMetadata)) {
    throw new Error('Multisig export only supports EVM chains. AltVM support coming soon.');
  }

  // APPROACH 1: Try SDK transaction generation (if exposed)
  try {
    logger.debug('Attempting SDK transaction generation', { chainName });

    const evmMultiProvider = multiProvider.toMultiProvider();
    const module = await EvmWarpModule.create({
      chain: chainName,
      config: config as any,
      multiProvider: evmMultiProvider,
      addresses: { deployedTokenRoute: warpRouteAddress },
    });

    // Check if module has transaction generation method (may not exist)
    if (typeof (module as any).buildUpdateTransactions === 'function') {
      logger.debug('SDK has buildUpdateTransactions method, using it');
      return await (module as any).buildUpdateTransactions(config);
    }

    logger.debug('SDK does not expose buildUpdateTransactions, falling back to manual');
  } catch (err) {
    logger.warn('SDK transaction generation failed, falling back to manual', err);
  }

  // APPROACH 2: Manual transaction building (fallback)
  return await buildEvmUpdateTransactionsManually(
    warpRouteAddress,
    config,
    chainMetadata,
    multiProvider
  );
}

/**
 * Manually build EVM warp update transactions by encoding contract calls
 * Reads current config from chain and builds transactions for differences
 * @param warpRouteAddress - Warp route contract address
 * @param config - New configuration to apply
 * @param chainMetadata - Chain metadata
 * @param multiProvider - MultiProtocolProvider instance
 * @returns Array of transactions
 */
async function buildEvmUpdateTransactionsManually(
  warpRouteAddress: string,
  config: WarpConfig,
  chainMetadata: ChainMetadata,
  multiProvider: MultiProtocolProvider
): Promise<AnnotatedTransaction[]> {
  logger.debug('Building transactions manually', { warpRouteAddress, chainName: chainMetadata.name });

  const { Contract, Interface } = await import('ethers');
  const txs: AnnotatedTransaction[] = [];

  // Get provider for reading current config
  const evmMultiProvider = multiProvider.toMultiProvider();
  const provider = evmMultiProvider.getProvider(chainMetadata.name);

  // ABI for warp route contract (minimal interface)
  const routerAbi = [
    'function interchainSecurityModule() view returns (address)',
    'function hook() view returns (address)',
    'function owner() view returns (address)',
    'function setInterchainSecurityModule(address _ism)',
    'function setHook(address _hook)',
    'function transferOwnership(address newOwner)'
  ];

  const contract = new Contract(warpRouteAddress, routerAbi, provider);

  // Read current config from contract
  let currentIsm: string;
  let currentHook: string;
  let currentOwner: string;

  try {
    [currentIsm, currentHook, currentOwner] = await Promise.all([
      contract.interchainSecurityModule(),
      contract.hook(),
      contract.owner()
    ]);

    logger.debug('Current warp config read from chain', {
      currentIsm,
      currentHook,
      currentOwner
    });
  } catch (err) {
    logger.error('Failed to read current config from chain', err);
    throw new Error('Failed to read current warp configuration from chain. Ensure the warp route address is correct.');
  }

  // Build transactions for each config field that changed

  // 1. ISM update
  if (config.interchainSecurityModule) {
    const newIsm = typeof config.interchainSecurityModule === 'string'
      ? config.interchainSecurityModule
      : undefined; // TODO: Handle object ISM configs (requires deployment)

    if (newIsm && newIsm.toLowerCase() !== currentIsm.toLowerCase()) {
      const iface = new Interface(['function setInterchainSecurityModule(address)']);
      txs.push({
        to: warpRouteAddress,
        data: iface.encodeFunctionData('setInterchainSecurityModule', [newIsm]),
        value: '0',
        annotation: `Update ISM to ${newIsm}`,
        chainId: chainMetadata.chainId
      });
      logger.debug('Added ISM update transaction', { newIsm });
    }
  }

  // 2. Hook update
  if (config.hook) {
    const newHook = typeof config.hook === 'string'
      ? config.hook
      : undefined; // TODO: Handle object hook configs (requires deployment)

    if (newHook && newHook.toLowerCase() !== currentHook.toLowerCase()) {
      const iface = new Interface(['function setHook(address)']);
      txs.push({
        to: warpRouteAddress,
        data: iface.encodeFunctionData('setHook', [newHook]),
        value: '0',
        annotation: `Update hook to ${newHook}`,
        chainId: chainMetadata.chainId
      });
      logger.debug('Added hook update transaction', { newHook });
    }
  }

  // 3. Owner transfer (always last for safety)
  if (config.owner && config.owner.toLowerCase() !== currentOwner.toLowerCase()) {
    const iface = new Interface(['function transferOwnership(address)']);
    txs.push({
      to: warpRouteAddress,
      data: iface.encodeFunctionData('transferOwnership', [config.owner]),
      value: '0',
      annotation: `Transfer ownership to ${config.owner}`,
      chainId: chainMetadata.chainId
    });
    logger.debug('Added ownership transfer transaction', { newOwner: config.owner });
  }

  if (txs.length === 0) {
    logger.warn('No transactions generated - config matches current state');
    throw new Error('No configuration changes detected. Current config matches new config.');
  }

  logger.debug(`Generated ${txs.length} transaction(s)`, { count: txs.length });
  return txs;
}
