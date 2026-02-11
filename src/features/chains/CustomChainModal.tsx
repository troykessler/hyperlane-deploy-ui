import { useState, useEffect } from 'react';
import { ChainMetadata } from '@hyperlane-xyz/sdk';
import { load as parseYaml, dump as dumpYaml } from 'js-yaml';
import { logger } from '../../utils/logger';
import { useStore } from '../store';

interface CustomChainModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (chainName: string, metadata: ChainMetadata) => void;
  existingChain?: { name: string; metadata: ChainMetadata } | null;
}

export function CustomChainModal({ isOpen, onClose, onAdd, existingChain }: CustomChainModalProps) {
  const addCustomChain = useStore((state) => state.addCustomChain);
  const updateCustomChain = useStore((state) => state.updateCustomChain);
  const [yamlInput, setYamlInput] = useState('');
  const [error, setError] = useState('');

  // Update yamlInput when existingChain changes or modal opens
  useEffect(() => {
    if (isOpen) {
      if (existingChain) {
        setYamlInput(serializeMetadata(existingChain.metadata));
      } else {
        setYamlInput('');
      }
      setError('');
    }
  }, [isOpen, existingChain]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    try {
      setError('');

      // Parse YAML
      const parsed = parseYaml(yamlInput);
      if (!parsed || typeof parsed !== 'object') {
        throw new Error('Invalid YAML format');
      }

      const metadata = parsed as ChainMetadata;

      // Basic validation
      if (!metadata.name || !metadata.chainId || !metadata.protocol) {
        throw new Error('Missing required fields: name, chainId, protocol');
      }

      if (!metadata.rpcUrls || metadata.rpcUrls.length === 0) {
        throw new Error('At least one RPC URL is required');
      }

      logger.debug('Adding custom chain', { name: metadata.name, metadata });

      if (existingChain) {
        updateCustomChain(metadata.name, metadata);
      } else {
        addCustomChain(metadata.name, metadata);
      }

      onAdd(metadata.name, metadata);
      onClose();
      setYamlInput('');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse YAML';
      setError(message);
      logger.error('Failed to add custom chain', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {existingChain ? 'Edit Custom Chain' : 'Add Custom Chain'}
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Paste chain metadata in YAML format
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-4 flex-1 overflow-y-auto">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Chain Metadata (YAML)
          </label>
          <textarea
            value={yamlInput}
            onChange={(e) => setYamlInput(e.target.value)}
            className={`w-full h-96 px-3 py-2 font-mono text-sm border rounded-lg focus:outline-none focus:ring-2 ${
              error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder={EXAMPLE_YAML}
            spellCheck={false}
          />
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs text-blue-800">
              <strong>Required fields:</strong> name, chainId, protocol, rpcUrls
              <br />
              <strong>Example protocols:</strong> cosmosnative, radix, aleo
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={() => {
              onClose();
              setYamlInput('');
              setError('');
            }}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            {existingChain ? 'Update' : 'Add'} Chain
          </button>
        </div>
      </div>
    </div>
  );
}

function serializeMetadata(metadata: ChainMetadata): string {
  return dumpYaml(metadata, {
    indent: 2,
    lineWidth: 120,
    noRefs: true,
  });
}

const EXAMPLE_YAML = `name: mychain
chainId: 12345
protocol: cosmosnative
displayName: My Custom Chain
rpcUrls:
  - http: https://rpc.mychain.com
nativeToken:
  name: My Token
  symbol: MYT
  decimals: 18`;
