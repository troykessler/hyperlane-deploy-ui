import { useState } from 'react';
import { ChainName } from '@hyperlane-xyz/sdk';
import { ChainSelectField } from '../chains/ChainSelectField';
import type { RemoteRouters } from './types';

interface WarpRemoteRoutersEditorProps {
  value: RemoteRouters | undefined;
  onChange: (routers: RemoteRouters | undefined) => void;
  excludeChain?: ChainName; // Exclude the current chain from selection
}

export function WarpRemoteRoutersEditor({
  value,
  onChange,
  excludeChain,
}: WarpRemoteRoutersEditorProps) {
  const routers = value || {};
  const [newChain, setNewChain] = useState<ChainName>('');
  const [newAddress, setNewAddress] = useState('');

  const handleAddRouter = () => {
    if (!newChain || !newAddress.trim()) {
      return;
    }

    const updated = {
      ...routers,
      [newChain]: { address: newAddress.trim() },
    };

    onChange(updated);
    setNewChain('');
    setNewAddress('');
  };

  const handleRemoveRouter = (chain: string) => {
    const { [chain]: _, ...remaining } = routers;
    onChange(Object.keys(remaining).length > 0 ? remaining : undefined);
  };

  const routerEntries = Object.entries(routers);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Remote Routers (Optional)</label>
        <span className="text-xs text-gray-500">{routerEntries.length} configured</span>
      </div>

      {routerEntries.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">Chain</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-700">
                  Router Address
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-700">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {routerEntries.map(([chain, { address }]) => (
                <tr key={chain} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{chain}</td>
                  <td className="px-4 py-3">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
                      {address}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemoveRouter(chain)}
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
        <div className="text-sm font-medium text-gray-700">Add Remote Router</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Chain</label>
            <ChainSelectField value={newChain} onChange={setNewChain} />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Router Address
            </label>
            <input
              type="text"
              value={newAddress}
              onChange={(e) => setNewAddress(e.target.value)}
              placeholder="0x..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={handleAddRouter}
          disabled={!newChain || !newAddress.trim()}
          className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          Add Router
        </button>
      </div>

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>Remote Routers:</strong> Specify warp route addresses on other chains to enable
          cross-chain transfers. You can add these now or after deploying on multiple chains.
        </p>
      </div>
    </div>
  );
}
