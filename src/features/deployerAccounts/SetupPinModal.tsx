import { useState } from 'react';
import { hashPin, encryptAccounts, isValidPin } from './vaultEncryption';
import { useStore } from '../store';
import type { DeployerAccount } from './types';

interface SetupPinModalProps {
  firstAccount?: DeployerAccount;
  onComplete: () => void;
  onCancel: () => void;
}

/**
 * Modal for setting up 4-digit PIN for vault protection
 * Shown before generating first account, or when adding first account
 */
export function SetupPinModal({ firstAccount, onComplete, onCancel }: SetupPinModalProps) {
  const { setVaultPin } = useStore();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePinChange = (value: string, isConfirm: boolean) => {
    // Only allow digits, max 4 characters
    const sanitized = value.replace(/\D/g, '').slice(0, 4);
    if (isConfirm) {
      setConfirmPin(sanitized);
    } else {
      setPin(sanitized);
    }
    setError('');
  };

  const handleSubmit = async () => {
    if (!isValidPin(pin)) {
      setError('PIN must be exactly 4 digits');
      return;
    }

    if (pin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    try {
      setIsProcessing(true);
      setError('');

      // Hash PIN for storage
      const pinHash = await hashPin(pin);

      // Encrypt accounts (may be empty if no account provided yet)
      const accounts = firstAccount ? [firstAccount] : [];
      const encrypted = await encryptAccounts(accounts, pin);

      // Store in vault (pass PIN to keep in memory while unlocked)
      setVaultPin(pinHash, encrypted, pin);

      onComplete();
    } catch (err) {
      setError('Failed to setup PIN protection');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Setup Vault PIN</h2>
        <p className="text-sm text-gray-600 mb-6">
          Protect your deployer accounts with a 4-digit PIN. You'll need this PIN to access your
          accounts.
        </p>

        {/* PIN Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enter 4-Digit PIN
          </label>
          <input
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => handlePinChange(e.target.value, false)}
            placeholder="••••"
            maxLength={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
            autoFocus
          />
        </div>

        {/* Confirm PIN Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Confirm PIN
          </label>
          <input
            type="password"
            inputMode="numeric"
            value={confirmPin}
            onChange={(e) => handlePinChange(e.target.value, true)}
            placeholder="••••"
            maxLength={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
          />
        </div>

        {/* Warning */}
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-xs text-amber-800">
            ⚠️ <strong>Remember this PIN!</strong> If you forget it, you'll lose access to all your deployer accounts. There is no recovery option.
          </p>
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
            disabled={isProcessing || pin.length !== 4 || confirmPin.length !== 4}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isProcessing ? 'Setting up...' : 'Setup PIN'}
          </button>
        </div>
      </div>
    </div>
  );
}
