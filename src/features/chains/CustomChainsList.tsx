import { useState } from 'react';
import { ChainMetadata } from '@hyperlane-xyz/sdk';
import { useStore } from '../store';
import { CustomChainModal } from './CustomChainModal';

export function CustomChainsList() {
  const customChains = useStore((state) => state.customChains);
  const deleteCustomChain = useStore((state) => state.deleteCustomChain);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingChain, setEditingChain] = useState<{ name: string; metadata: ChainMetadata } | null>(null);

  const handleEdit = (chainName: string, metadata: ChainMetadata) => {
    setEditingChain({ name: chainName, metadata });
    setIsModalOpen(true);
  };

  const handleDelete = async (chainName: string) => {
    if (window.confirm(`Are you sure you want to delete ${chainName}?`)) {
      await deleteCustomChain(chainName);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingChain(null);
  };

  const customChainEntries = Object.entries(customChains);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900">Custom Chains</h3>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Add Custom Chain
        </button>
      </div>

      {customChainEntries.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No custom chains added yet. Click &quot;Add Custom Chain&quot; to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {customChainEntries.map(([chainName, metadata]) => (
            <div
              key={chainName}
              className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="flex-1">
                <div className="font-medium text-gray-900">
                  {metadata.displayName || metadata.name}
                </div>
                <div className="text-sm text-gray-600">
                  Chain ID: {metadata.chainId} • Protocol: {metadata.protocol}
                </div>
                {metadata.rpcUrls && metadata.rpcUrls.length > 0 && (
                  <div className="text-xs text-gray-500 mt-1">
                    RPC: {metadata.rpcUrls[0].http}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(chainName, metadata)}
                  className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(chainName)}
                  className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CustomChainModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onAdd={() => {
          // The onAdd handler will use either addCustomChain or updateCustomChain
          // based on whether we're editing or adding
          handleCloseModal();
        }}
        existingChain={editingChain}
      />
    </div>
  );
}
