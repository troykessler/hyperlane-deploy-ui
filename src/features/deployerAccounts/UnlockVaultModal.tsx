import { useState } from 'react';
import { hashPin, decryptAccounts } from './vaultEncryption';
import { useStore } from '../store';

interface UnlockVaultModalProps {
  onCancel?: () => void;
  onSuccess?: () => void;
}

/**
 * Modal for unlocking the vault with PIN
 * Shown when vault is locked and user tries to access accounts
 */
export function UnlockVaultModal({ onCancel, onSuccess }: UnlockVaultModalProps = {}) {
  const { vaultPinHash, encryptedVault, unlockVault } = useStore();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [attempts, setAttempts] = useState(0);

  const handlePinChange = (value: string) => {
    // Only allow digits, max 4 characters
    const sanitized = value.replace(/\D/g, '').slice(0, 4);
    setPin(sanitized);
    setError('');

    // Auto-submit when 4 digits entered
    if (sanitized.length === 4) {
      setTimeout(() => handleUnlock(sanitized), 100);
    }
  };

  const handleUnlock = async (pinToUse?: string) => {
    const pinValue = pinToUse || pin;

    if (pinValue.length !== 4) {
      setError('PIN must be 4 digits');
      return;
    }

    try {
      setIsProcessing(true);
      setError('');

      // Verify PIN hash matches
      const inputPinHash = await hashPin(pinValue);
      if (inputPinHash !== vaultPinHash) {
        setAttempts((a) => a + 1);
        setError('Incorrect PIN');
        setPin('');
        return;
      }

      // Decrypt accounts
      if (!encryptedVault) {
        throw new Error('No encrypted vault found');
      }

      const decrypted = await decryptAccounts(encryptedVault, pinValue);

      // Unlock vault
      unlockVault(decrypted);

      // Call success callback to close modal
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      setAttempts((a) => a + 1);
      setError('Incorrect PIN');
      setPin('');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        {/* Lock Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
            <span className="text-4xl">🔒</span>
          </div>
        </div>

        <h2 className="text-xl font-bold text-gray-900 text-center mb-2">Vault Locked</h2>
        <p className="text-sm text-gray-600 text-center mb-6">
          Enter your 4-digit PIN to access deployer accounts
        </p>

        {/* PIN Input */}
        <div className="mb-4">
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => handlePinChange(e.target.value)}
            placeholder="••••"
            maxLength={4}
            disabled={isProcessing}
            className="w-full px-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-3xl tracking-widest disabled:opacity-50"
            autoFocus
          />
        </div>

        {/* Attempts Counter */}
        {attempts > 0 && (
          <div className="mb-4 text-center">
            <p className="text-xs text-gray-500">
              {attempts} failed attempt{attempts !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800 text-center">{error}</p>
          </div>
        )}

        {/* Warning after multiple attempts */}
        {attempts >= 3 && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-800">
              ⚠️ Multiple failed attempts. If you forgot your PIN, there is no recovery option. You
              will need to delete all accounts and start over.
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {onCancel && (
            <button
              onClick={onCancel}
              disabled={isProcessing}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            onClick={() => handleUnlock()}
            disabled={isProcessing || pin.length !== 4}
            className={`${onCancel ? 'flex-1' : 'w-full'} px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50`}
          >
            {isProcessing ? 'Unlocking...' : 'Unlock Vault'}
          </button>
        </div>
      </div>
    </div>
  );
}
