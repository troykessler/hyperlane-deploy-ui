import { useState, useMemo } from 'react';
import { ChainName } from '@hyperlane-xyz/sdk';
import { useMultiProvider } from './hooks';
import { getDeployableChains } from './utils';

interface ChainSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (chain: ChainName) => void;
  selectedChain?: ChainName;
}

export function ChainSelectorModal({ isOpen, onClose, onSelect, selectedChain }: ChainSelectorModalProps) {
  const [search, setSearch] = useState('');
  const multiProvider = useMultiProvider();
  const deployableChains = getDeployableChains(multiProvider.metadata);

  const filteredChains = useMemo(() => {
    if (!search.trim()) return deployableChains;

    const searchLower = search.toLowerCase();
    return deployableChains.filter((chainName) => {
      const metadata = multiProvider.tryGetChainMetadata(chainName);
      const chainId = metadata?.chainId?.toString() || '';
      const displayName = metadata?.displayName || '';

      return (
        chainName.toLowerCase().includes(searchLower) ||
        displayName.toLowerCase().includes(searchLower) ||
        chainId.includes(searchLower)
      );
    });
  }, [deployableChains, search, multiProvider]);

  const handleSelect = (chain: ChainName) => {
    onSelect(chain);
    onClose();
    setSearch('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl font-bold text-gray-900">Select Chain</h2>
            <button
              onClick={() => {
                onClose();
                setSearch('');
              }}
              className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, chain ID..."
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Chain List */}
        <div className="flex-1 overflow-y-auto p-4">
          {filteredChains.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">No chains found matching "{search}"</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {filteredChains.map((chainName) => {
                const metadata = multiProvider.tryGetChainMetadata(chainName);
                const isSelected = chainName === selectedChain;

                return (
                  <button
                    key={chainName}
                    onClick={() => handleSelect(chainName)}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {/* Chain Logo */}
                    <div className="flex-shrink-0">
                      {metadata?.logoURI ? (
                        <img
                          src={metadata.logoURI}
                          alt={chainName}
                          className="w-10 h-10 rounded-full"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <div className={`w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-sm ${metadata?.logoURI ? 'hidden' : ''}`}>
                        {chainName.slice(0, 2).toUpperCase()}
                      </div>
                    </div>

                    {/* Chain Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                          {metadata?.displayName || chainName}
                        </span>
                        {isSelected && (
                          <svg className="h-4 w-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-600">
                          {chainName}
                        </span>
                        {metadata?.chainId && (
                          <>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs text-gray-500">
                              ID: {metadata.chainId}
                            </span>
                          </>
                        )}
                        {metadata?.protocol && (
                          <>
                            <span className="text-xs text-gray-400">•</span>
                            <span className="text-xs px-1.5 py-0.5 bg-gray-200 text-gray-700 rounded uppercase">
                              {metadata.protocol}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-600">
            {filteredChains.length} {filteredChains.length === 1 ? 'chain' : 'chains'} available
          </p>
        </div>
      </div>
    </div>
  );
}
