import { useState, useCallback } from 'react';
import { ChainName, EvmWarpModule } from '@hyperlane-xyz/sdk';
import { AltVMWarpModule } from '@hyperlane-xyz/deploy-sdk';
import { ProtocolType } from '@hyperlane-xyz/utils';
import { useMultiProvider } from '../chains/hooks';
import { createChainLookup } from '../../utils/chainLookup';
import { createAltVMSigner, createEvmSigner, createEvmSignerFromPrivateKey, createCosmosSignerFromPrivateKey, createRadixSignerFromPrivateKey, createAleoSignerFromPrivateKey } from '../../utils/signerAdapters';
import { logger } from '../../utils/logger';
import type { WarpConfig, WarpApplyExecutionMode, SafeTransactionBatch } from './types';
import { validateWarpConfig } from './validation';
import { isEvmChain } from '../../utils/protocolUtils';
import { convertToSafeBatch } from './safeBatchConverter';

interface UpdateProgress {
  status: 'idle' | 'validating' | 'applying' | 'success' | 'error';
  message: string;
  error?: string;
}

interface UpdateOptions {
  executionMode?: WarpApplyExecutionMode;
  safeAddress?: string;
}

export function useWarpUpdate() {
  const [progress, setProgress] = useState<UpdateProgress>({
    status: 'idle',
    message: '',
  });
  const [generatedBatch, setGeneratedBatch] = useState<SafeTransactionBatch | null>(null);
  const multiProvider = useMultiProvider();

  const applyUpdate = useCallback(
    async (
      chainName: ChainName,
      warpRouteAddress: string,
      config: WarpConfig,
      walletClient: any,
      deployerPrivateKey?: string,
      options?: UpdateOptions
    ): Promise<boolean> => {
      const mode = options?.executionMode || 'direct';
      try {
        setProgress({
          status: 'validating',
          message: 'Validating new configuration...',
        });

        // Validate config
        validateWarpConfig(config);

        const chainMetadata = multiProvider.tryGetChainMetadata(chainName);
        if (!chainMetadata) {
          throw new Error(`Chain metadata not found for ${chainName}`);
        }

        // MULTISIG MODE: Generate transactions without executing
        if (mode === 'multisig') {
          // EVM-only check
          if (!isEvmChain(chainMetadata)) {
            throw new Error('Multisig export only supports EVM chains. AltVM support coming soon.');
          }

          setProgress({
            status: 'applying',
            message: 'Generating transactions...',
          });

          logger.debug('Generating transactions for multisig', { chainName, warpRouteAddress });

          // Use SDK to generate transactions (returns AnnotatedEV5Transaction[])
          const evmMultiProvider = multiProvider.toMultiProvider();

          // For updates, we need to provide the deployed warp route address
          // ProxyFactoryFactories are not needed for updates (only reads + generates txs)
          // Provide zero addresses as placeholders
          const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
          const module = new EvmWarpModule(evmMultiProvider, {
            chain: chainName,
            config: config as any,
            addresses: {
              deployedTokenRoute: warpRouteAddress,
              staticMerkleRootMultisigIsmFactory: ZERO_ADDRESS,
              staticMessageIdMultisigIsmFactory: ZERO_ADDRESS,
              staticAggregationIsmFactory: ZERO_ADDRESS,
              staticAggregationHookFactory: ZERO_ADDRESS,
              domainRoutingIsmFactory: ZERO_ADDRESS,
              staticMerkleRootWeightedMultisigIsmFactory: ZERO_ADDRESS,
              staticMessageIdWeightedMultisigIsmFactory: ZERO_ADDRESS,
            },
          });

          // SDK's update() returns the transactions it would execute
          const transactions = await module.update(config as any);

          logger.debug('SDK generated transactions', { chainName, txCount: transactions.length });

          // Convert to Safe format
          const batch = convertToSafeBatch(
            transactions,
            Number(chainMetadata.chainId!),
            chainName,
            options?.safeAddress
          );

          setGeneratedBatch(batch);
          setProgress({
            status: 'success',
            message: `Generated ${transactions.length} transaction(s)`,
          });

          logger.debug('Transactions generated successfully', {
            chainName,
            txCount: transactions.length
          });

          return true;
        }

        // DIRECT MODE: Execute immediately (existing behavior)
        setProgress({
          status: 'applying',
          message: 'Applying configuration updates...',
        });

        logger.debug('Creating warp module for update', { chainName, warpRouteAddress });

        if (isEvmChain(chainMetadata)) {
          // EVM chain: use EvmWarpModule
          const evmMultiProvider = multiProvider.toMultiProvider();

          // Create signer from deployer account or wallet
          let signer;
          if (deployerPrivateKey) {
            logger.debug('Using deployer account for warp update', { chainName });
            signer = await createEvmSignerFromPrivateKey(deployerPrivateKey, chainMetadata);
            evmMultiProvider.setSharedSigner(signer);
          } else if (walletClient) {
            logger.debug('Using wallet client for warp update', { chainName });
            signer = await createEvmSigner(walletClient, chainMetadata);
            evmMultiProvider.setSharedSigner(signer);
          } else {
            throw new Error('No wallet or deployer account available');
          }

          // For updates, provide the deployed warp route address
          // ProxyFactoryFactories are not needed for updates (only reads + generates txs)
          // Provide zero addresses as placeholders
          const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
          const module = new EvmWarpModule(evmMultiProvider, {
            chain: chainName,
            config: config as any,
            addresses: {
              deployedTokenRoute: warpRouteAddress,
              staticMerkleRootMultisigIsmFactory: ZERO_ADDRESS,
              staticMessageIdMultisigIsmFactory: ZERO_ADDRESS,
              staticAggregationIsmFactory: ZERO_ADDRESS,
              staticAggregationHookFactory: ZERO_ADDRESS,
              domainRoutingIsmFactory: ZERO_ADDRESS,
              staticMerkleRootWeightedMultisigIsmFactory: ZERO_ADDRESS,
              staticMessageIdWeightedMultisigIsmFactory: ZERO_ADDRESS,
            },
          });

          logger.debug('Applying warp config update (EVM)', { chainName, config });

          // SDK's update() returns transactions - we need to execute them
          const transactions = await module.update(config as any);

          logger.debug(`Executing ${transactions.length} transaction(s)`, { chainName });

          // Execute each transaction
          for (const tx of transactions) {
            const txResponse = await signer.sendTransaction({
              to: tx.to,
              data: tx.data,
              value: tx.value || 0,
            });
            logger.debug('Transaction sent', { hash: txResponse.hash, annotation: tx.annotation });
            await txResponse.wait();
            logger.debug('Transaction confirmed', { hash: txResponse.hash });
          }
        } else {
          // AltVM chain: use AltVMWarpModule
          const chainLookup = createChainLookup(multiProvider);

          let signer;
          if (deployerPrivateKey) {
            logger.debug('Using deployer account for warp update (AltVM)', { chainName, protocol: chainMetadata.protocol });

            // Create signer based on protocol
            if (chainMetadata.protocol === ProtocolType.CosmosNative) {
              signer = await createCosmosSignerFromPrivateKey(deployerPrivateKey, chainMetadata);
            } else if (chainMetadata.protocol === ProtocolType.Radix) {
              signer = await createRadixSignerFromPrivateKey(deployerPrivateKey, chainMetadata);
            } else if (chainMetadata.protocol === ProtocolType.Aleo) {
              signer = await createAleoSignerFromPrivateKey(deployerPrivateKey, chainMetadata);
            } else {
              throw new Error(`Unsupported AltVM protocol for deployer accounts: ${chainMetadata.protocol}`);
            }
          } else if (walletClient) {
            logger.debug('Using wallet client for warp update (AltVM)', { chainName });
            signer = await createAltVMSigner(chainMetadata, walletClient);
          } else {
            throw new Error('No wallet or deployer account available');
          }

          const module = new AltVMWarpModule(chainLookup, signer, {
            chain: chainName,
            addresses: { deployedTokenRoute: warpRouteAddress },
            config,
          });

          logger.debug('Applying warp config update (AltVM)', { chainName, config });
          await module.update(config);
        }

        logger.debug('Warp config update successful', { chainName });

        setProgress({
          status: 'success',
          message: 'Updates applied successfully',
        });

        return true;
      } catch (error) {
        logger.error('Failed to apply warp config update', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        setProgress({
          status: 'error',
          message: 'Failed to apply configuration',
          error: errorMessage,
        });

        return false;
      }
    },
    [multiProvider]
  );

  const reset = useCallback(() => {
    setProgress({
      status: 'idle',
      message: '',
    });
  }, []);

  const clearBatch = useCallback(() => {
    setGeneratedBatch(null);
  }, []);

  return {
    applyUpdate,
    progress,
    reset,
    isApplying: progress.status === 'applying' || progress.status === 'validating',
    generatedBatch,
    clearBatch,
  };
}
