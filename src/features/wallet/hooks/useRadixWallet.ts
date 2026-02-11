/**
 * Hook to access Radix wallet client via Radix DApp Toolkit
 * Note: Radix DApp Toolkit is initialized in RadixWalletContext
 */
export function useRadixWallet() {
  // TODO: Import actual hook from widgets or context when available
  // For now, return stub
  return {
    rdt: null,
    isConnected: false,
    connect: async () => {
      throw new Error('Radix wallet integration not yet implemented');
    },
  };
}
