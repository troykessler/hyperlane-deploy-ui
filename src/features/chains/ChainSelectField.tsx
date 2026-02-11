import { ChainName } from '@hyperlane-xyz/sdk';
import { useMultiProvider } from './hooks';
import { getDeployableChains } from './utils';

interface ChainSelectFieldProps {
  value: ChainName;
  onChange: (chain: ChainName) => void;
  label?: string;
}

export function ChainSelectField({ value, onChange, label }: ChainSelectFieldProps) {
  const multiProvider = useMultiProvider();
  const deployableChains = getDeployableChains(multiProvider.metadata);

  return (
    <div className="flex-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg"
      >
        <option value="">Select a chain...</option>
        {deployableChains.map((chain) => (
          <option key={chain} value={chain}>
            {chain}
          </option>
        ))}
      </select>
    </div>
  );
}
