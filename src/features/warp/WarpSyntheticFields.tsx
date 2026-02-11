interface WarpSyntheticFieldsProps {
  name: string;
  symbol: string;
  decimals: number;
  onChange: (field: 'name' | 'symbol' | 'decimals', value: string | number) => void;
}

export function WarpSyntheticFields({
  name,
  symbol,
  decimals,
  onChange,
}: WarpSyntheticFieldsProps) {
  return (
    <div className="space-y-4">
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>Synthetic Token:</strong> These fields are optional. If not provided, the token
          will use default values or inherit from the collateral token on the origin chain.
        </p>
      </div>

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          Token Name (Optional)
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => onChange('name', e.target.value)}
          placeholder="e.g., Wrapped Ether"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">Full name of the synthetic token</p>
      </div>

      <div>
        <label htmlFor="symbol" className="block text-sm font-medium text-gray-700 mb-2">
          Token Symbol (Optional)
        </label>
        <input
          type="text"
          id="symbol"
          value={symbol}
          onChange={(e) => onChange('symbol', e.target.value)}
          placeholder="e.g., WETH"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">Short symbol for the synthetic token</p>
      </div>

      <div>
        <label htmlFor="decimals" className="block text-sm font-medium text-gray-700 mb-2">
          Decimals (Optional)
        </label>
        <input
          type="number"
          id="decimals"
          value={decimals}
          onChange={(e) => onChange('decimals', parseInt(e.target.value) || 18)}
          min="0"
          max="18"
          placeholder="18"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          Number of decimal places (0-18, default is 18)
        </p>
      </div>
    </div>
  );
}
