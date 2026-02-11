import { useChain } from '@cosmos-kit/react';

/**
 * Hook to access Cosmos wallet client
 * Returns the signing client and account info for a given chain
 */
export function useCosmosWallet(chainName?: string) {
  // Default to cosmoshub if no chain specified
  const chain = useChain(chainName || 'cosmoshub');

  return {
    address: chain.address,
    isConnected: chain.isWalletConnected,
    connect: chain.connect,
    disconnect: chain.disconnect,
    getSigningCosmWasmClient: chain.getSigningCosmWasmClient,
    getSigningStargateClient: chain.getSigningStargateClient,
    status: chain.status,
  };
}
