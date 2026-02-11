import { ChainMetadata } from '@hyperlane-xyz/sdk';
import { ProtocolType } from '@hyperlane-xyz/utils';
import { AltVM } from '@hyperlane-xyz/provider-sdk';
import type { AnnotatedTx, TxReceipt } from '@hyperlane-xyz/provider-sdk/module';
import { CosmosNativeSigner } from '@hyperlane-xyz/cosmos-sdk';
import { RadixSigner } from '@hyperlane-xyz/radix-sdk';
import { AleoSigner } from '@hyperlane-xyz/aleo-sdk';
import type { OfflineSigner } from '@cosmjs/proto-signing';

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
    case ProtocolType.Cosmos:
      return await createCosmosSigner(rpcUrls, walletClient);
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
  offlineSigner: OfflineSigner
): Promise<AltVM.ISigner<any, any>> {
  if (!offlineSigner) {
    throw new Error('Cosmos wallet not connected');
  }

  // Use CosmosNativeSigner from cosmos-sdk
  const signer = await CosmosNativeSigner.connectWithSigner(
    rpcUrls,
    offlineSigner,
    {
      // Optional: add gas price config
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
