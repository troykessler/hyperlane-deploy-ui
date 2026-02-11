import type { WarpTokenType } from './types';

interface WarpTokenTypeSelectorProps {
  value: WarpTokenType;
  onChange: (type: WarpTokenType) => void;
}

export function WarpTokenTypeSelector({ value, onChange }: WarpTokenTypeSelectorProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">Token Type</label>

      <div className="space-y-2">
        <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="radio"
            name="tokenType"
            value="collateral"
            checked={value === 'collateral'}
            onChange={() => onChange('collateral')}
            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
          />
          <div className="ml-3">
            <div className="text-sm font-medium text-gray-900">Collateral</div>
            <div className="text-xs text-gray-500">
              Wrap an existing ERC20 token for cross-chain transfer
            </div>
          </div>
        </label>

        <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="radio"
            name="tokenType"
            value="synthetic"
            checked={value === 'synthetic'}
            onChange={() => onChange('synthetic')}
            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
          />
          <div className="ml-3">
            <div className="text-sm font-medium text-gray-900">Synthetic</div>
            <div className="text-xs text-gray-500">
              Mint a new token on this chain that represents a token on another chain
            </div>
          </div>
        </label>

        <label className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="radio"
            name="tokenType"
            value="native"
            checked={value === 'native'}
            onChange={() => onChange('native')}
            className="w-4 h-4 text-blue-600 focus:ring-blue-500"
          />
          <div className="ml-3">
            <div className="text-sm font-medium text-gray-900">Native</div>
            <div className="text-xs text-gray-500">
              Wrap the native gas token (e.g., ETH, MATIC) for cross-chain transfer
            </div>
          </div>
        </label>
      </div>

      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>Tip:</strong> Choose <strong>Collateral</strong> to bridge an existing token,{' '}
          <strong>Synthetic</strong> for the destination chain, or <strong>Native</strong> to wrap
          gas tokens like ETH.
        </p>
      </div>
    </div>
  );
}
