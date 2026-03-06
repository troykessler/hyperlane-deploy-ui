import { ChainMetadata } from '@hyperlane-xyz/sdk';
import type { WalletClient } from 'viem';
import { Wallet, Provider } from 'ethers';
import { logger } from '../../utils/logger';

/**
 * Fund a deployer account from connected wallet
 * Sends native token from wallet to deployer account address
 *
 * @param fromWalletClient Connected wallet client (viem)
 * @param toAddress Deployer account address to fund
 * @param amount Amount in wei to transfer
 * @param chainMetadata Chain metadata for RPC/chain ID
 * @returns Transaction hash
 */
export async function fundDeployerAccount(
  fromWalletClient: WalletClient,
  toAddress: string,
  amount: bigint,
  chainMetadata: ChainMetadata
): Promise<string> {
  try {
    logger.debug('Funding deployer account', {
      toAddress,
      amount: amount.toString(),
      chain: chainMetadata.name,
    });

    // Send transaction using wallet client
    const hash = await fromWalletClient.sendTransaction({
      to: toAddress as `0x${string}`,
      value: amount,
      chain: {
        id: chainMetadata.chainId,
        name: chainMetadata.name,
      } as any,
    });

    logger.debug('Fund transaction sent', { hash, toAddress });

    return hash;
  } catch (error) {
    logger.error('Failed to fund deployer account', error);
    throw error;
  }
}

/**
 * Sweep all funds from deployer account back to specified address
 * Transfers maximum amount minus estimated gas cost
 *
 * @param privateKey Deployer account private key
 * @param toAddress Destination address (usually connected wallet)
 * @param chainMetadata Chain metadata for RPC/chain ID
 * @returns Transaction hash
 */
export async function sweepDeployerAccount(
  privateKey: string,
  toAddress: string,
  chainMetadata: ChainMetadata
): Promise<string> {
  try {
    logger.debug('Sweeping deployer account', {
      toAddress,
      chain: chainMetadata.name,
    });

    // Get RPC URL
    const rpcUrl = chainMetadata.rpcUrls[0]?.http;
    if (!rpcUrl) {
      throw new Error('No RPC URL found for chain');
    }

    // Create provider and wallet
    const provider = new Provider(rpcUrl);
    const wallet = new Wallet(privateKey, provider);

    // Get balance
    const balance = await provider.getBalance(wallet.address);
    logger.debug('Current balance', { balance: balance.toString() });

    if (balance === 0n) {
      throw new Error('Account has zero balance');
    }

    // Estimate gas for transfer
    const gasPrice = await provider.getFeeData();
    const gasLimit = 21000n; // Standard ETH transfer gas
    const gasCost = (gasPrice.gasPrice || 0n) * gasLimit;

    // Calculate amount to send (balance minus gas)
    const amountToSend = balance - gasCost;

    if (amountToSend <= 0n) {
      throw new Error('Insufficient balance to cover gas fees');
    }

    logger.debug('Sending sweep transaction', {
      amountToSend: amountToSend.toString(),
      gasCost: gasCost.toString(),
    });

    // Send transaction
    const tx = await wallet.sendTransaction({
      to: toAddress,
      value: amountToSend,
      gasLimit,
    });

    logger.debug('Sweep transaction sent', { hash: tx.hash });

    // Wait for confirmation
    await tx.wait();

    logger.debug('Sweep transaction confirmed', { hash: tx.hash });

    return tx.hash;
  } catch (error) {
    logger.error('Failed to sweep deployer account', error);
    throw error;
  }
}

/**
 * Get native token balance for an address
 *
 * @param address Address to check balance
 * @param chainMetadata Chain metadata for RPC
 * @returns Balance in wei as string
 */
export async function getBalance(address: string, chainMetadata: ChainMetadata): Promise<string> {
  try {
    const rpcUrl = chainMetadata.rpcUrls[0]?.http;
    if (!rpcUrl) {
      throw new Error('No RPC URL found for chain');
    }

    const provider = new Provider(rpcUrl);
    const balance = await provider.getBalance(address);

    return balance.toString();
  } catch (error) {
    logger.error('Failed to get balance', error);
    throw error;
  }
}

/**
 * Format wei amount to human-readable format with symbol
 *
 * @param weiAmount Amount in wei as string
 * @param decimals Token decimals (default 18 for native tokens)
 * @param symbol Token symbol (e.g., 'ETH')
 * @returns Formatted string like "0.5 ETH"
 */
export function formatBalance(
  weiAmount: string,
  decimals: number = 18,
  symbol: string = 'ETH'
): string {
  const amount = BigInt(weiAmount);
  const divisor = 10n ** BigInt(decimals);
  const whole = amount / divisor;
  const remainder = amount % divisor;

  // Format with up to 6 decimal places
  const remainderStr = remainder.toString().padStart(decimals, '0');
  const decimalPart = remainderStr.slice(0, 6).replace(/0+$/, '');

  if (decimalPart) {
    return `${whole}.${decimalPart} ${symbol}`;
  }

  return `${whole} ${symbol}`;
}
