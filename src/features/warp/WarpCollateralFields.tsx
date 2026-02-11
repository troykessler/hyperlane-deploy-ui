import { useEffect } from 'react';
import { ChainName } from '@hyperlane-xyz/sdk';
import { useTokenMetadata } from './useTokenMetadata';

interface WarpCollateralFieldsProps {
  chainName: ChainName;
  token: string;
  onChange: (token: string) => void;
}

export function WarpCollateralFields({ chainName, token, onChange }: WarpCollateralFieldsProps) {
  const { metadata, loading, error, fetchMetadata, reset } = useTokenMetadata();

  // Fetch metadata when token address changes
  useEffect(() => {
    if (token && token.trim() !== '' && chainName) {
      fetchMetadata(chainName, token);
    } else {
      reset();
    }
  }, [token, chainName, fetchMetadata, reset]);

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="token" className="block text-sm font-medium text-gray-700 mb-2">
          Token Address *
        </label>
        <input
          type="text"
          id="token"
          value={token}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0x..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          Address of the ERC20 token to wrap for cross-chain transfer
        </p>
      </div>

      {loading && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          <span className="text-sm text-blue-800">Fetching token metadata...</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {metadata && !loading && !error && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm font-semibold text-green-900">Token Found</span>
          </div>
          <div className="grid grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-xs text-green-700 font-medium">Name</div>
              <div className="text-green-900 font-semibold">{metadata.name}</div>
            </div>
            <div>
              <div className="text-xs text-green-700 font-medium">Symbol</div>
              <div className="text-green-900 font-semibold">{metadata.symbol}</div>
            </div>
            <div>
              <div className="text-xs text-green-700 font-medium">Decimals</div>
              <div className="text-green-900 font-semibold">{metadata.decimals}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
