import { ChainName } from '@hyperlane-xyz/sdk';
import { WarpFormBuilder } from './WarpFormBuilder';
import type { WarpConfig } from './types';

interface WarpChainConfigListProps {
  selectedChains: ChainName[];
  configs: Record<ChainName, WarpConfig | null>;
  onConfigChange: (chain: ChainName, config: WarpConfig | null) => void;
}

export function WarpChainConfigList({
  selectedChains,
  configs,
  onConfigChange,
}: WarpChainConfigListProps) {
  if (selectedChains.length === 0) {
    return (
      <div className="p-6 border border-gray-200 rounded-lg bg-gray-50 text-center">
        <p className="text-sm text-gray-600">No chains selected</p>
        <p className="text-xs text-gray-500 mt-1">
          Select chains above to configure warp routes
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {selectedChains.map((chain, index) => {
        const config = configs[chain];
        const isConfigured = config !== null && config !== undefined;

        return (
          <div
            key={chain}
            className="border-2 rounded-lg overflow-hidden"
            style={{
              borderColor: isConfigured ? '#10b981' : '#d1d5db',
            }}
          >
            {/* Chain Header */}
            <div
              className="px-6 py-4 flex items-center justify-between"
              style={{
                backgroundColor: isConfigured ? '#d1fae5' : '#f9fafb',
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg font-semibold text-gray-900">
                  {index + 1}. {chain}
                </span>
                {isConfigured && (
                  <span className="text-xs px-2 py-1 bg-green-600 text-white rounded font-medium">
                    ✓ Configured
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-600">
                {config?.type && (
                  <span className="px-2 py-1 bg-white rounded border border-gray-200">
                    {config.type.toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            {/* Chain Config Form */}
            <div className="p-6 bg-white">
              <WarpFormBuilder
                chainName={chain}
                initialConfig={config}
                onChange={(newConfig) => onConfigChange(chain, newConfig)}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
