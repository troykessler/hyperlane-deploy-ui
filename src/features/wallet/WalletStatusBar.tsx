import { ProtocolType } from '@hyperlane-xyz/utils';
import { ChainName } from '@hyperlane-xyz/sdk';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWallet } from './hooks/useWallet';

interface WalletStatusBarProps {
  selectedChain: ChainName;
  selectedProtocol: ProtocolType | null;
}

export function WalletStatusBar({ selectedChain, selectedProtocol }: WalletStatusBarProps) {
  const wallet = useWallet(selectedChain, selectedProtocol);

  const getWalletInfo = () => {
    if (!selectedProtocol || !wallet.protocol) {
      return { isConnected: false, address: null, connect: null, disconnect: null, protocol: '', isEvm: false };
    }

    const protocolName =
      wallet.protocol === ProtocolType.Ethereum
        ? 'EVM'
        : wallet.protocol === ProtocolType.CosmosNative || wallet.protocol === ProtocolType.Cosmos
        ? 'Cosmos Native'
        : wallet.protocol === ProtocolType.Radix
        ? 'Radix'
        : wallet.protocol === ProtocolType.Aleo
        ? 'Aleo'
        : wallet.protocol === ProtocolType.Sealevel
        ? 'Solana'
        : '';

    return {
      isConnected: wallet.isConnected,
      address: wallet.address,
      connect: wallet.connect,
      disconnect: wallet.disconnect,
      protocol: protocolName,
      isEvm: wallet.protocol === ProtocolType.Ethereum,
    };
  };

  const walletInfo = getWalletInfo();

  if (!selectedProtocol || !selectedChain) {
    return null;
  }

  // For EVM, use RainbowKit's ConnectButton
  if (walletInfo.isEvm) {
    return (
      <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className={`w-2 h-2 rounded-full ${
                walletInfo.isConnected ? 'bg-green-500' : 'bg-gray-400'
              }`}
            />
            <span className="text-sm font-medium text-gray-700">EVM Wallet</span>
          </div>
        </div>
        <ConnectButton chainStatus="icon" showBalance={false} />
      </div>
    );
  }

  // For other protocols, use custom wallet UI
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${
              walletInfo.isConnected ? 'bg-green-500' : 'bg-gray-400'
            }`}
          />
          <span className="text-sm font-medium text-gray-700">
            {walletInfo.protocol} Wallet
          </span>
        </div>
        {walletInfo.address && (
          <div className="text-sm text-gray-600">
            <code className="bg-gray-200 px-2 py-1 rounded">
              {walletInfo.address.slice(0, 8)}...{walletInfo.address.slice(-6)}
            </code>
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {!walletInfo.isConnected && walletInfo.connect && (
          <button
            onClick={() => walletInfo.connect?.()}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Connect Wallet
          </button>
        )}
        {walletInfo.isConnected && walletInfo.disconnect && (
          <button
            onClick={() => walletInfo.disconnect?.()}
            className="px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors shadow-sm"
          >
            Disconnect
          </button>
        )}
      </div>
    </div>
  );
}
