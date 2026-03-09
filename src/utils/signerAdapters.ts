import { ChainMetadata } from '@hyperlane-xyz/sdk';
import { ProtocolType } from '@hyperlane-xyz/utils';
import { AltVM } from '@hyperlane-xyz/provider-sdk';
import type { AnnotatedTx, TxReceipt } from '@hyperlane-xyz/provider-sdk/module';
import { CosmosNativeSigner } from '@hyperlane-xyz/cosmos-sdk';
import { RadixSigner } from '@hyperlane-xyz/radix-sdk';
import { AleoSigner } from '@hyperlane-xyz/aleo-sdk';
import type { OfflineSigner } from '@cosmjs/proto-signing';
import { DirectSecp256k1Wallet } from '@cosmjs/proto-signing';
import { Wallet, type Signer } from 'ethers';
import type { WalletClient } from 'viem';
import { walletClientToSigner } from './viemToEthers';

/**
 * Create EVM signer from private key (for deployer accounts)
 * Returns ethers Wallet instance connected to RPC provider
 */
export async function createEvmSignerFromPrivateKey(
  privateKey: string,
  chainMetadata: ChainMetadata
): Promise<Signer> {
  if (!privateKey) {
    throw new Error('Private key not provided');
  }

  const { providers } = await import('ethers');

  // Get RPC URL from chain metadata
  const rpcUrl = chainMetadata.rpcUrls[0]?.http;
  if (!rpcUrl) {
    throw new Error(`No RPC URL found for chain ${chainMetadata.name}`);
  }

  // Create provider
  const provider = new providers.JsonRpcProvider(rpcUrl);

  // Create wallet from private key and connect to provider
  const wallet = new Wallet(privateKey, provider);

  return wallet;
}

/**
 * Create Cosmos signer from private key (for deployer accounts)
 * Returns CosmosNativeSigner instance connected to RPC
 */
export async function createCosmosSignerFromPrivateKey(
  privateKey: string,
  chainMetadata: ChainMetadata
): Promise<AltVM.ISigner<any, any>> {
  if (!privateKey) {
    throw new Error('Private key not provided');
  }

  // Convert hex string to Uint8Array
  const privkeyBytes = new Uint8Array(
    privateKey.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
  );

  // Create wallet from private key with appropriate prefix
  const prefix = chainMetadata.bech32Prefix || 'cosmos';
  const offlineSigner = await DirectSecp256k1Wallet.fromKey(privkeyBytes, prefix);

  // Get RPC URLs
  const rpcUrls = chainMetadata.rpcUrls.map((rpc) => rpc.http);

  // Create CosmosNativeSigner
  const signer = await CosmosNativeSigner.connectWithSigner(rpcUrls, offlineSigner, {
    metadata: chainMetadata,
    fee: 'auto',
  });

  return signer as any;
}

/**
 * Create Radix signer from private key (for deployer accounts)
 * Returns RadixSigner instance connected to RPC
 *
 * NOTE: This is a basic implementation and may need refinement
 */
export async function createRadixSignerFromPrivateKey(
  privateKey: string,
  chainMetadata: ChainMetadata
): Promise<AltVM.ISigner<any, any>> {
  if (!privateKey) {
    throw new Error('Private key not provided');
  }

  // Convert hex string to Uint8Array
  const privkeyBytes = new Uint8Array(
    privateKey.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
  );

  // Get RPC URLs
  const rpcUrls = chainMetadata.rpcUrls.map((rpc) => rpc.http);

  // Create wallet object for Radix (placeholder structure)
  const radixWallet = {
    privateKey: privkeyBytes,
    // TODO: Add proper Radix wallet structure
  };

  // Create RadixSigner
  const signer = await RadixSigner.connectWithSigner(rpcUrls, radixWallet, {});

  return signer as any;
}

/**
 * Create Aleo signer from private key (for deployer accounts)
 * Returns AleoSigner instance connected to RPC
 *
 * NOTE: This is a basic implementation and may need refinement
 */
export async function createAleoSignerFromPrivateKey(
  privateKey: string,
  chainMetadata: ChainMetadata
): Promise<AltVM.ISigner<any, any>> {
  if (!privateKey) {
    throw new Error('Private key not provided');
  }

  // Convert hex string to Uint8Array
  const privkeyBytes = new Uint8Array(
    privateKey.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
  );

  // Get RPC URLs
  const rpcUrls = chainMetadata.rpcUrls.map((rpc) => rpc.http);

  // Create wallet object for Aleo (placeholder structure)
  const aleoWallet = {
    privateKey: privkeyBytes,
    // TODO: Add proper Aleo wallet structure
  };

  // Create AleoSigner
  const signer = await AleoSigner.connectWithSigner(rpcUrls, aleoWallet, {});

  return signer as any;
}

/**
 * Create EVM signer from wagmi wallet client (viem)
 * Converts viem WalletClient to ethers v5 Signer
 */
export async function createEvmSigner(
  walletClient: WalletClient | any,
  chainMetadata: ChainMetadata
): Promise<Signer> {
  if (!walletClient) {
    throw new Error('Wallet not connected');
  }

  // Convert viem WalletClient to ethers Signer
  const signer = walletClientToSigner(walletClient);
  return signer;
}

/**
 * Get the appropriate AltVM signer for a given chain
 * This creates protocol-specific signer instances
 */
export async function createAltVMSigner(
  chainMetadata: ChainMetadata,
  walletClient: any
): Promise<AltVM.ISigner<AnnotatedTx, TxReceipt>> {
  const rpcUrls = chainMetadata.rpcUrls.map(rpc => rpc.http);

  switch (chainMetadata.protocol) {
    case ProtocolType.CosmosNative:
      return await createCosmosSigner(rpcUrls, walletClient, chainMetadata);
    case ProtocolType.Radix:
      return await createRadixSigner(rpcUrls, walletClient);
    case ProtocolType.Aleo:
      return await createAleoSigner(rpcUrls, walletClient);
    default:
      throw new Error(`Unsupported protocol for deployment: ${chainMetadata.protocol}`);
  }
}

/**
 * Create Cosmos signer from Cosmos Kit wallet
 */
async function createCosmosSigner(
  rpcUrls: string[],
  offlineSigner: OfflineSigner,
  chainMetadata: ChainMetadata
): Promise<AltVM.ISigner<any, any>> {
  if (!offlineSigner) {
    throw new Error('Cosmos wallet not connected');
  }

  // Use CosmosNativeSigner from cosmos-sdk
  const signer = await CosmosNativeSigner.connectWithSigner(
    rpcUrls,
    offlineSigner,
    {
      metadata: chainMetadata,
      fee: 'auto',
    }
  );

  return signer as any; // Type assertion for compatibility
}

/**
 * Create Radix signer from Radix DApp Toolkit
 */
async function createRadixSigner(
  rpcUrls: string[],
  radixToolkit: any
): Promise<AltVM.ISigner<any, any>> {
  if (!radixToolkit || !radixToolkit.walletApi) {
    throw new Error('Radix wallet not connected');
  }

  // Use RadixSigner from radix-sdk
  // Note: This is a placeholder - actual implementation depends on Radix SDK API
  const signer = await RadixSigner.connectWithSigner(
    rpcUrls,
    radixToolkit,
    {}
  );

  return signer as any;
}

/**
 * Create Aleo signer from Aleo wallet adapter
 */
async function createAleoSigner(
  rpcUrls: string[],
  aleoWallet: any
): Promise<AltVM.ISigner<any, any>> {
  if (!aleoWallet || !aleoWallet.publicKey) {
    throw new Error('Aleo wallet not connected');
  }

  // Use AleoSigner from aleo-sdk
  // Note: This is a placeholder - actual implementation depends on Aleo SDK API
  const signer = await AleoSigner.connectWithSigner(
    rpcUrls,
    aleoWallet,
    {}
  );

  return signer as any;
}
