import { ProtocolType } from '@hyperlane-xyz/utils';
import { ChainName } from '@hyperlane-xyz/sdk';
import { useCosmosWallet } from './hooks/useCosmosWallet';
import { useRadixWallet } from './hooks/useRadixWallet';
import { useAleoWallet } from './hooks/useAleoWallet';

interface WalletStatusBarProps {
  selectedChain: ChainName;
  selectedProtocol: ProtocolType | null;
}

export function WalletStatusBar({ selectedChain, selectedProtocol }: WalletStatusBarProps) {
  const cosmosWallet = useCosmosWallet(selectedChain);
  const radixWallet = useRadixWallet();
  const aleoWallet = useAleoWallet();

  // Determine which wallet to show based on protocol
  const getWalletInfo = () => {
    if (!selectedProtocol) {
      return { isConnected: false, address: null, connect: null, disconnect: null, protocol: '' };
    }

    switch (selectedProtocol) {
      case ProtocolType.CosmosNative:
        return {
          isConnected: !!cosmosWallet.address,
          address: cosmosWallet.address,
          connect: async () => {
            // Cosmos Kit handles connection via UI
            console.log('Use Cosmos Kit UI to connect');
          },
          disconnect: cosmosWallet.disconnect,
          protocol: 'Cosmos Native',
        };
      case ProtocolType.Radix:
        return {
          isConnected: radixWallet.isConnected,
          address: null, // Radix wallet doesn't expose address in stub
          connect: radixWallet.connect,
          disconnect: null,
          protocol: 'Radix',
        };
      case ProtocolType.Aleo:
        return {
          isConnected: aleoWallet.isConnected,
          address: aleoWallet.address,
          connect: async () => {
            // Aleo connect requires network parameter - use testnet by default
            await aleoWallet.connect({ name: 'testnet' } as any);
          },
          disconnect: aleoWallet.disconnect,
          protocol: 'Aleo',
        };
      default:
        return { isConnected: false, address: null, connect: null, disconnect: null, protocol: '' };
    }
  };

  const wallet = getWalletInfo();

  if (!selectedProtocol || !selectedChain) {
    return null;
  }

  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              wallet.isConnected ? 'bg-green-500' : 'bg-gray-400'
            }`}
          />
          <span className="text-sm font-medium text-gray-700">
            {wallet.protocol} Wallet
          </span>
        </div>
        {wallet.address && (
          <div className="text-sm text-gray-600">
            <code className="bg-gray-200 px-2 py-1 rounded">
              {wallet.address.slice(0, 8)}...{wallet.address.slice(-6)}
            </code>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {!wallet.isConnected && wallet.connect && (
          <button
            onClick={() => wallet.connect?.()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Connect Wallet
          </button>
        )}
        {wallet.isConnected && wallet.disconnect && (
          <button
            onClick={() => wallet.disconnect?.()}
            className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors"
          >
            Disconnect
          </button>
        )}
      </div>
    </div>
  );
}
