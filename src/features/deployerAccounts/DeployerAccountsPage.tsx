import { useState } from 'react';
import { useStore } from '../store';
import { GenerateAccountModal } from './GenerateAccountModal';
import { UnlockVaultModal } from './UnlockVaultModal';
import { SetupPinModal } from './SetupPinModal';
import { ChangePinModal } from './ChangePinModal';
import type { DeployerAccount } from './types';

/**
 * Deployer Accounts Management Page
 * Allows users to generate, fund, and manage ephemeral deployer accounts
 * for automated deployments without wallet approval prompts
 */
export function DeployerAccountsPage() {
  const {
    deployerAccounts,
    clearAllDeployerAccounts,
    deleteDeployerAccount,
    vaultUnlocked,
    hasVaultPin,
  } = useStore();
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showSetupPin, setShowSetupPin] = useState(false);
  const [showChangePin, setShowChangePin] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);

  const isVaultLocked = hasVaultPin() && !vaultUnlocked;

  const handleDeleteAll = () => {
    clearAllDeployerAccounts();
    setShowDeleteConfirm(false);
  };

  const handleDelete = (accountId: string) => {
    if (confirm('Delete this account? This action cannot be undone.')) {
      deleteDeployerAccount(accountId);
    }
  };

  const handleGenerateClick = () => {
    // If first time (no accounts and no PIN), show PIN setup first
    if (deployerAccounts.length === 0 && !hasVaultPin()) {
      setShowSetupPin(true);
    } else {
      setShowGenerateModal(true);
    }
  };

  const handlePinSetupComplete = () => {
    setShowSetupPin(false);
    setShowGenerateModal(true);
  };

  return (
    <div className="space-y-6">
      {/* Security Warning Banner */}
      <div
        className={`${
          hasVaultPin() ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'
        } border rounded-lg p-4`}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl">{hasVaultPin() ? '🔒' : '⚠️'}</span>
          <div className="flex-1">
            <h3
              className={`text-sm font-semibold mb-1 ${
                hasVaultPin() ? 'text-blue-900' : 'text-amber-900'
              }`}
            >
              {hasVaultPin() ? 'Vault Protected' : 'Security Warning'}
            </h3>
            <p className={`text-xs ${hasVaultPin() ? 'text-blue-800' : 'text-amber-800'}`}>
              {hasVaultPin()
                ? 'Deployer accounts are encrypted with a 4-digit PIN. Private keys are only decrypted in memory when vault is unlocked.'
                : 'Deployer accounts store private keys in browser localStorage (plaintext). Only use for temporary deployments. Delete accounts and sweep funds when done.'}
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deployer Accounts</h1>
          <p className="text-sm text-gray-600 mt-1">
            Manage temporary accounts for automated deployments
          </p>
        </div>
        <div className="flex gap-3">
          {hasVaultPin() && vaultUnlocked && (
            <button
              onClick={() => setShowChangePin(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
            >
              Change PIN
            </button>
          )}
          {deployerAccounts.length > 0 && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
            >
              Delete All
            </button>
          )}
          <button
            onClick={handleGenerateClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            + Generate New Account
          </button>
        </div>
      </div>

      {/* Vault Locked Banner */}
      {isVaultLocked && (
        <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🔒</span>
              <div>
                <h3 className="text-sm font-semibold text-amber-900">Vault Locked</h3>
                <p className="text-xs text-amber-800">
                  Unlock vault to export private keys or deploy contracts
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowUnlockModal(true)}
              className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors text-sm"
            >
              Unlock Vault
            </button>
          </div>
        </div>
      )}

      {/* Accounts Table */}
      {deployerAccounts.length === 0 ? (
        <div className="border border-gray-200 rounded-lg p-12 text-center">
          <div className="text-4xl mb-4">🔑</div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Deployer Accounts</h3>
          <p className="text-sm text-gray-600 mb-4">
            Generate an account to start deploying without wallet approval prompts
          </p>
          <button
            onClick={handleGenerateClick}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Generate Your First Account
          </button>
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">Protocol</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">Address</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">Created</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700">Balance</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {deployerAccounts.map((account) => (
                <tr key={account.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">{account.protocol}</td>
                  <td className="px-4 py-3">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-700">
                      {account.address.slice(0, 10)}...{account.address.slice(-8)}
                    </code>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(account.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">-</td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => navigator.clipboard.writeText(account.address)}
                        className="px-3 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                      >
                        Copy Address
                      </button>
                      <button
                        onClick={() => {
                          if (isVaultLocked) {
                            setShowUnlockModal(true);
                          } else if (account.privateKey) {
                            navigator.clipboard.writeText(account.privateKey);
                          }
                        }}
                        className={`px-3 py-1 text-xs rounded transition-colors ${
                          isVaultLocked
                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        title={isVaultLocked ? 'Unlock vault to copy private key' : 'Copy private key'}
                      >
                        {isVaultLocked ? '🔒 Copy Key' : 'Copy Key'}
                      </button>
                      <button
                        onClick={() => handleDelete(account.id)}
                        className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {showUnlockModal && (
        <UnlockVaultModal
          onCancel={() => setShowUnlockModal(false)}
          onSuccess={() => setShowUnlockModal(false)}
        />
      )}

      {showSetupPin && (
        <SetupPinModal
          onComplete={handlePinSetupComplete}
          onCancel={() => setShowSetupPin(false)}
        />
      )}

      {showChangePin && (
        <ChangePinModal
          onComplete={() => setShowChangePin(false)}
          onCancel={() => setShowChangePin(false)}
        />
      )}

      {showGenerateModal && (
        <GenerateAccountModal onClose={() => setShowGenerateModal(false)} />
      )}

      {/* Delete All Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete All Accounts?</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will permanently delete all {deployerAccounts.length} deployer account(s) from
              localStorage. This action cannot be undone.
            </p>
            <p className="text-sm text-amber-800 bg-amber-50 p-3 rounded mb-4">
              ⚠️ Make sure to sweep any remaining funds before deleting accounts.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                className="px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 transition-colors"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
