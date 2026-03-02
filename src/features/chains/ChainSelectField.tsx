import { useState } from 'react';
import { ChainName } from '@hyperlane-xyz/sdk';
import { useMultiProvider } from './hooks';
import { ChainSelectorModal } from './ChainSelectorModal';

interface ChainSelectFieldProps {
  value: ChainName;
  onChange: (chain: ChainName) => void;
  label?: string;
}

export function ChainSelectField({ value, onChange, label }: ChainSelectFieldProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const multiProvider = useMultiProvider();
  const metadata = value ? multiProvider.tryGetChainMetadata(value) : null;

  return (
    <div className="flex-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}

      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white transition-colors text-left flex items-center justify-between"
      >
        {value ? (
          <div className="flex items-center gap-3">
            {/* Chain Logo */}
            <div className="flex-shrink-0">
              {metadata?.logoURI ? (
                <img
                  src={metadata.logoURI}
                  alt={value}
                  className="w-8 h-8 rounded-full"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : null}
              <div className={`w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-xs ${metadata?.logoURI ? 'hidden' : ''}`}>
                {value.slice(0, 2).toUpperCase()}
              </div>
            </div>

            {/* Chain Info */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900">
                {metadata?.displayName || value}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-600">{value}</span>
                {metadata && metadata.chainId !== undefined && metadata.chainId !== null && (
                  <>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">ID: {metadata.chainId}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <span className="text-gray-500">Select a chain...</span>
        )}

        {/* Chevron Icon */}
        <svg
          className="h-5 w-5 text-gray-400 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <ChainSelectorModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelect={onChange}
        selectedChain={value}
      />
    </div>
  );
}
