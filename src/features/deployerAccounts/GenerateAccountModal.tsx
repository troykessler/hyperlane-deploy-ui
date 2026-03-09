import { useState } from 'react';
import { ProtocolType } from '@hyperlane-xyz/utils';
import { useStore } from '../store';
import { generateDeployerAccount } from './keyGen';
import type { DeployerAccount } from './types';

interface GenerateAccountModalProps {
  onClose: () => void;
}

/**
 * Modal for generating new deployer accounts
 * Currently supports EVM only
 */
export function GenerateAccountModal({ onClose }: GenerateAccountModalProps) {
  const { addDeployerAccount, hasVaultPin, vaultUnlocked } = useStore();
  const [selectedProtocol, setSelectedProtocol] = useState<ProtocolType>(ProtocolType.Ethereum);
  const [generatedAccount, setGeneratedAccount] = useState<DeployerAccount | null>(null);
  const [error, setError] = useState<string>('');
  const [copied, setCopied] = useState<'address' | 'key' | null>(null);

  const handleGenerate = async () => {
    try {
      setError('');
      const account = await generateDeployerAccount(selectedProtocol);
      setGeneratedAccount(account);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate account');
    }
  };

  const handleDone = async () => {
    if (!generatedAccount) return;

    // If vault exists but is locked, show error
    if (hasVaultPin() && !vaultUnlocked) {
      setError('Vault is locked. Please unlock vault before adding accounts.');
      return;
    }

    await addDeployerAccount(generatedAccount);
    onClose();
  };

  const handleCopy = (text: string, type: 'address' | 'key') => {
    // Format private key based on protocol
    let formattedText = text;
    if (type === 'key' && generatedAccount) {
      // EVM keys should have 0x prefix
      if (generatedAccount.protocol === ProtocolType.Ethereum && !formattedText.startsWith('0x')) {
        formattedText = '0x' + formattedText;
      }
    }

    navigator.clipboard.writeText(formattedText);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Generate Deployer Account</h2>

        {!generatedAccount ? (
          <>
            {/* Protocol Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Protocol
              </label>
              <select
                value={selectedProtocol}
                onChange={(e) => setSelectedProtocol(e.target.value as ProtocolType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={ProtocolType.Ethereum}>EVM (Ethereum)</option>
                <option value={ProtocolType.CosmosNative}>Cosmos Native</option>
                <option value={ProtocolType.Radix}>Radix (Beta)</option>
                <option value={ProtocolType.Aleo}>Aleo (Beta)</option>
              </select>
            </div>

            {/* Warning */}
            <div
              className={`${
                hasVaultPin() ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'
              } border rounded-lg p-4 mb-6`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl">{hasVaultPin() ? '🔒' : '⚠️'}</span>
                <div className="flex-1">
                  <p
                    className={`text-xs ${hasVaultPin() ? 'text-blue-800' : 'text-amber-800'}`}
                  >
                    {hasVaultPin()
                      ? 'This account will be encrypted with your existing vault PIN. The private key will only be decrypted in memory when the vault is unlocked.'
                      : "This private key will be stored unencrypted in your browser's localStorage. Copy and backup securely if needed for later use. Only use for temporary deployments."}
                  </p>
                </div>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Generate Account
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Success */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <span className="text-xl">✅</span>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-green-900 mb-1">
                    Account Generated Successfully
                  </h3>
                  <p className="text-xs text-green-800">
                    Your deployer account has been created and stored locally. Make sure to copy and
                    backup the private key securely.
                  </p>
                </div>
              </div>
            </div>

            {/* Account Details */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={generatedAccount.address}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                  />
                  <button
                    onClick={() => handleCopy(generatedAccount.address, 'address')}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    {copied === 'address' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Private Key
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={generatedAccount.privateKey}
                    readOnly
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
                  />
                  <button
                    onClick={() => handleCopy(generatedAccount.privateKey, 'key')}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                  >
                    {copied === 'key' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {generatedAccount.protocol === ProtocolType.Ethereum && 'Hex format (with 0x prefix)'}
                  {generatedAccount.protocol === ProtocolType.CosmosNative && 'Hex format (32 bytes)'}
                  {generatedAccount.protocol === ProtocolType.Radix && 'Hex format (Ed25519 key)'}
                  {generatedAccount.protocol === ProtocolType.Aleo && 'Hex format (32 bytes)'}
                </p>
              </div>
            </div>

            {/* Close */}
            <div className="flex justify-end">
              <button
                onClick={handleDone}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Done
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
