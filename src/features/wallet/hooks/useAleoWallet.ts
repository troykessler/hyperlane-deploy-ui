import { useWallet } from '@provablehq/aleo-wallet-adaptor-react';

/**
 * Hook to access Aleo wallet client
 */
export function useAleoWallet() {
  const wallet = useWallet();

  return {
    address: wallet.address,
    isConnected: wallet.connected,
    connect: wallet.connect,
    disconnect: wallet.disconnect,
    signMessage: wallet.signMessage,
    executeTransaction: wallet.executeTransaction,
    wallet: wallet.wallet,
  };
}
