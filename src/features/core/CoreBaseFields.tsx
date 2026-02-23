import { ChainName } from '@hyperlane-xyz/sdk';
import { useAccountForChain } from '@hyperlane-xyz/widgets';
import { useMultiProvider } from '../chains/hooks';
import { useWallet } from '../wallet/hooks/useWallet';

interface CoreBaseFieldsProps {
  owner: string;
  onChange: (value: string) => void;
  chainName?: ChainName;
}

export function CoreBaseFields({ owner, onChange, chainName }: CoreBaseFieldsProps) {
  const multiProvider = useMultiProvider();
  const account = useAccountForChain(multiProvider, chainName || '');

  // Get chain metadata to determine protocol
  const chainMetadata = chainName ? multiProvider.tryGetChainMetadata(chainName) : null;
  const protocol = chainMetadata?.protocol;

  // Get unified wallet
  const wallet = useWallet(chainName, protocol);

  const handleUseWalletAddress = () => {
    // Prefer unified wallet address, fallback to account for EVM
    const address = wallet.address || account?.addresses?.[0]?.address;

    if (address) {
      onChange(address);
    }
  };

  // Determine if we have a wallet connected
  const hasWalletAddress = () => {
    return wallet.isConnected || !!account?.addresses?.[0]?.address;
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="owner" className="block text-sm font-medium text-gray-700 mb-2">
          Owner Address <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <input
            type="text"
            id="owner"
            value={owner}
            onChange={(e) => onChange(e.target.value)}
            placeholder="0x..."
            className="w-full px-3 py-2 pr-32 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {hasWalletAddress() && (
            <button
              type="button"
              onClick={handleUseWalletAddress}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
            >
              Use Wallet
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Address that will own the core contracts and have admin privileges
        </p>
      </div>
    </div>
  );
}
