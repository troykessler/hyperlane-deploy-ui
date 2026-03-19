import { useState, useEffect } from 'react';
import { fromBech32, toBech32 } from '@cosmjs/encoding';

interface CosmosBech32ModalProps {
  existingAddress: string;
  onClose: () => void;
}

/**
 * Modal for converting Cosmos address to different bech32 prefix
 * Decodes existing address and re-encodes with custom prefix
 */
export function CosmosBech32Modal({ existingAddress, onClose }: CosmosBech32ModalProps) {
  const [bech32Prefix, setBech32Prefix] = useState('');
  const [generatedAddress, setGeneratedAddress] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  // Generate address live as user types
  useEffect(() => {
    if (!bech32Prefix) {
      setGeneratedAddress('');
      setError('');
      return;
    }

    // Validate prefix (lowercase alphanumeric)
    if (!/^[a-z0-9]+$/.test(bech32Prefix)) {
      setGeneratedAddress('');
      setError('Prefix must be lowercase alphanumeric (e.g., "cosmos", "osmo")');
      return;
    }

    try {
      // Decode existing bech32 address to get the data bytes
      const { data } = fromBech32(existingAddress);

      // Re-encode with new prefix
      const newAddress = toBech32(bech32Prefix, data);

      setGeneratedAddress(newAddress);
      setError('');
    } catch (err) {
      console.error('Failed to convert Cosmos address:', err);
      setGeneratedAddress('');
      setError(err instanceof Error ? err.message : 'Failed to convert address');
    }
  }, [bech32Prefix, existingAddress]);

  const handleCopy = () => {
    if (generatedAddress) {
      navigator.clipboard.writeText(generatedAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Generate Cosmos Address</h2>
          <p className="text-sm text-gray-600 mt-1">
            Enter bech32 prefix for your chain
          </p>
        </div>

        {/* Body */}
        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bech32 Prefix
            </label>
            <input
              type="text"
              value={bech32Prefix}
              onChange={(e) => setBech32Prefix(e.target.value.toLowerCase())}
              placeholder="e.g., cosmos, osmo, juno, hyp"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-1">
              Common prefixes: <code className="bg-gray-100 px-1 rounded">cosmos</code>,{' '}
              <code className="bg-gray-100 px-1 rounded">osmo</code>,{' '}
              <code className="bg-gray-100 px-1 rounded">juno</code>,{' '}
              <code className="bg-gray-100 px-1 rounded">hyp</code>
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {generatedAddress && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-xs font-medium text-green-900 mb-1">Generated Address:</p>
              <code className="text-xs text-green-800 break-all block">
                {generatedAddress}
              </code>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
          <button
            onClick={handleCopy}
            disabled={!generatedAddress}
            className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              copied
                ? 'bg-green-600 text-white'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {copied ? '✓ Copied' : 'Copy Address'}
          </button>
        </div>
      </div>
    </div>
  );
}
