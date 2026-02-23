import { ProtocolType } from '@hyperlane-xyz/utils';
import { ChainName } from '@hyperlane-xyz/sdk';
import { useAccount, useDisconnect, useWalletClient } from 'wagmi';
import { useCosmosWallet } from './useCosmosWallet';
import { useRadixWallet } from './useRadixWallet';
import { useAleoWallet } from './useAleoWallet';

/**
 * Unified wallet hook that routes to the correct wallet based on protocol type
 * Returns consistent interface across all protocols
 */
export function useWallet(chainName?: ChainName, protocol?: ProtocolType | null) {
  // EVM wallet hooks
  const { address: evmAddress, isConnected: evmIsConnected } = useAccount();
  const { disconnect: evmDisconnect } = useDisconnect();
  const { data: evmWalletClient } = useWalletClient();

  // Cosmos wallet hook - only pass chain if protocol matches
  const cosmosWallet = useCosmosWallet(
    protocol === ProtocolType.Cosmos || protocol === ProtocolType.CosmosNative
      ? chainName
      : undefined
  );

  // Radix wallet hook
  const radixWallet = useRadixWallet();

  // Aleo wallet hook
  const aleoWallet = useAleoWallet();

  // Return wallet interface based on protocol
  if (!protocol) {
    return {
      address: undefined,
      isConnected: false,
      connect: undefined,
      disconnect: undefined,
      walletClient: undefined,
      protocol: null,
    };
  }

  switch (protocol) {
    case ProtocolType.Ethereum:
      return {
        address: evmAddress,
        isConnected: evmIsConnected,
        connect: undefined, // EVM uses RainbowKit ConnectButton
        disconnect: evmDisconnect,
        walletClient: evmWalletClient,
        protocol: ProtocolType.Ethereum,
      };

    case ProtocolType.Cosmos:
    case ProtocolType.CosmosNative:
      return {
        address: cosmosWallet.address,
        isConnected: !!cosmosWallet.address,
        connect: cosmosWallet.connect,
        disconnect: cosmosWallet.disconnect,
        walletClient: async () => await cosmosWallet.getOfflineSigner(),
        protocol: ProtocolType.CosmosNative,
      };

    case ProtocolType.Radix:
      return {
        address: undefined,
        isConnected: radixWallet.isConnected,
        connect: radixWallet.connect,
        disconnect: undefined,
        walletClient: radixWallet.rdt,
        protocol: ProtocolType.Radix,
      };

    case ProtocolType.Aleo:
      return {
        address: aleoWallet.address,
        isConnected: aleoWallet.isConnected,
        connect: async () => {
          await aleoWallet.connect({ name: 'testnet' } as any);
        },
        disconnect: aleoWallet.disconnect,
        walletClient: aleoWallet.wallet,
        protocol: ProtocolType.Aleo,
      };

    case ProtocolType.Sealevel:
      // TODO: Implement Solana wallet support
      return {
        address: undefined,
        isConnected: false,
        connect: undefined,
        disconnect: undefined,
        walletClient: undefined,
        protocol: ProtocolType.Sealevel,
      };

    default:
      return {
        address: undefined,
        isConnected: false,
        connect: undefined,
        disconnect: undefined,
        walletClient: undefined,
        protocol: null,
      };
  }
}
