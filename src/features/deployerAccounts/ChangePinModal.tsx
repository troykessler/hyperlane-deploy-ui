import { useState } from 'react';
import { hashPin, encryptPrivateKeys, decryptPrivateKeys, extractPrivateKeys, isValidPin } from './vaultEncryption';
import { useStore } from '../store';

interface ChangePinModalProps {
  onComplete: () => void;
  onCancel: () => void;
}

/**
 * Modal for changing vault PIN
 * Requires current PIN, then new PIN + confirmation
 */
export function ChangePinModal({ onComplete, onCancel }: ChangePinModalProps) {
  const { deployerAccounts, encryptedVault, setVaultPin } = useStore();
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePinChange = (value: string, field: 'current' | 'new' | 'confirm') => {
    // Only allow digits, max 4 characters
    const sanitized = value.replace(/\D/g, '').slice(0, 4);
    if (field === 'current') {
      setCurrentPin(sanitized);
    } else if (field === 'new') {
      setNewPin(sanitized);
    } else {
      setConfirmPin(sanitized);
    }
    setError('');
  };

  const handleSubmit = async () => {
    if (!isValidPin(currentPin)) {
      setError('Current PIN must be exactly 4 digits');
      return;
    }

    if (!isValidPin(newPin)) {
      setError('New PIN must be exactly 4 digits');
      return;
    }

    if (newPin !== confirmPin) {
      setError('New PINs do not match');
      return;
    }

    if (currentPin === newPin) {
      setError('New PIN must be different from current PIN');
      return;
    }

    try {
      setIsProcessing(true);
      setError('');

      // Verify current PIN by trying to decrypt
      if (!encryptedVault) {
        setError('No encrypted vault found');
        return;
      }

      try {
        await decryptPrivateKeys(encryptedVault, currentPin);
      } catch {
        setError('Incorrect current PIN');
        return;
      }

      // Hash new PIN
      const pinHash = await hashPin(newPin);

      // Re-encrypt private keys with new PIN
      const privateKeys = extractPrivateKeys(deployerAccounts);
      const encrypted = await encryptPrivateKeys(privateKeys, newPin);

      // Update vault
      await setVaultPin(pinHash, encrypted, newPin);

      onComplete();
    } catch (err) {
      setError('Failed to change PIN');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Change Vault PIN</h2>
        <p className="text-sm text-gray-600 mb-6">
          Enter your current PIN and choose a new 4-digit PIN.
        </p>

        {/* Current PIN Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Current PIN
          </label>
          <input
            type="password"
            inputMode="numeric"
            value={currentPin}
            onChange={(e) => handlePinChange(e.target.value, 'current')}
            placeholder="••••"
            maxLength={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
            autoFocus
          />
        </div>

        {/* New PIN Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            New PIN
          </label>
          <input
            type="password"
            inputMode="numeric"
            value={newPin}
            onChange={(e) => handlePinChange(e.target.value, 'new')}
            placeholder="••••"
            maxLength={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
          />
        </div>

        {/* Confirm New PIN Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Confirm New PIN
          </label>
          <input
            type="password"
            inputMode="numeric"
            value={confirmPin}
            onChange={(e) => handlePinChange(e.target.value, 'confirm')}
            placeholder="••••"
            maxLength={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
          />
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              isProcessing ||
              currentPin.length !== 4 ||
              newPin.length !== 4 ||
              confirmPin.length !== 4
            }
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isProcessing ? 'Changing...' : 'Change PIN'}
          </button>
        </div>
      </div>
    </div>
  );
}
