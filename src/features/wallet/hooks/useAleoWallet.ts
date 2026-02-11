/**
 * Hook to access Aleo wallet client
 *
 * Note: Stub implementation due to alpha SDK compatibility issues.
 * Returns empty wallet state until stable Aleo wallet SDK is available.
 */
export function useAleoWallet() {
  return {
    address: undefined,
    isConnected: false,
    connect: async (_config?: any) => {
      console.warn('Aleo wallet not configured. Using stub implementation.');
    },
    disconnect: async () => {},
    signMessage: undefined,
    executeTransaction: undefined,
    wallet: undefined,
  };
}
