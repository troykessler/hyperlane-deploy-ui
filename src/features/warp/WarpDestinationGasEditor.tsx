import { useState } from 'react';
import { ChainName } from '@hyperlane-xyz/sdk';
import { ChainSelectField } from '../chains/ChainSelectField';
import type { DestinationGas } from './types';

interface WarpDestinationGasEditorProps {
  value: DestinationGas | undefined;
  onChange: (gas: DestinationGas | undefined) => void;
}

export function WarpDestinationGasEditor({ value, onChange }: WarpDestinationGasEditorProps) {
  const gas = value || {};
  const [newChain, setNewChain] = useState<ChainName>('');
  const [newGasAmount, setNewGasAmount] = useState('');

  const handleAddGas = () => {
    if (!newChain || !newGasAmount.trim()) {
      return;
    }

    const updated = {
      ...gas,
      [newChain]: newGasAmount.trim(),
    };

    onChange(updated);
    setNewChain('');
    setNewGasAmount('');
  };

  const handleRemoveGas = (chain: string) => {
    const { [chain]: _, ...remaining } = gas;
    onChange(Object.keys(remaining).length > 0 ? remaining : undefined);
  };

  const gasEntries = Object.entries(gas);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          Destination Gas (Optional)
        </label>
        <span className="text-xs text-gray-500">{gasEntries.length} configured</span>
      </div>

      {gasEntries.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Chain</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">
                  Gas Amount
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {gasEntries.map(([chain, amount]) => (
                <tr key={chain} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{chain}</td>
                  <td className="px-4 py-3">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
                      {amount} wei
                    </code>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveGas(chain)}
                      className="text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="p-4 border border-gray-200 rounded-lg bg-gray-50 space-y-3">
        <div className="text-sm font-medium text-gray-700">Add Destination Gas</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Destination Chain
            </label>
            <ChainSelectField value={newChain} onChange={setNewChain} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Gas Amount (wei)</label>
            <input
              type="text"
              value={newGasAmount}
              onChange={(e) => setNewGasAmount(e.target.value)}
              placeholder="100000"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddGas}
          disabled={!newChain || !newGasAmount.trim()}
          className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Add Gas Config
        </button>
      </div>

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>Destination Gas:</strong> Configure gas amounts for message delivery on
          destination chains. This ensures sufficient gas is provided for cross-chain message
          processing. Leave empty to use default gas limits.
        </p>
      </div>
    </div>
  );
}
