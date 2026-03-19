import { ProtocolType } from '@hyperlane-xyz/utils';
import { useState } from 'react';
import { useStore } from '../store';
import { ChangePinModal } from './ChangePinModal';
import { CosmosBech32Modal } from './CosmosBech32Modal';
import { GenerateAccountModal } from './GenerateAccountModal';
import { SetupPinModal } from './SetupPinModal';
import type { DeployerAccount } from './types';
import { UnlockVaultModal } from './UnlockVaultModal';

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
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [cosmosBech32Account, setCosmosBech32Account] = useState<DeployerAccount | null>(null);

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
    } else if (hasVaultPin() && !vaultUnlocked) {
      // If vault exists but is locked, unlock first
      setShowUnlockModal(true);
    } else {
      setShowGenerateModal(true);
    }
  };

  const handleCopyPrivateKey = (account: DeployerAccount) => {
    console.log('[handleCopyPrivateKey] Copying key for:', {
      id: account.id,
      protocol: account.protocol,
      hasPrivateKey: !!account.privateKey,
      privateKeyLength: account.privateKey?.length,
      privateKeyPreview: account.privateKey?.substring(0, 10) + '...',
    });

    if (!account.privateKey) {
      console.error('[handleCopyPrivateKey] Private key is empty!');
      alert('Private key is empty. Please unlock the vault.');
      return;
    }

    // Format private key based on protocol
    let formattedKey = account.privateKey;

    // EVM keys should have 0x prefix
    if (account.protocol === ProtocolType.Ethereum && !formattedKey.startsWith('0x')) {
      formattedKey = '0x' + formattedKey;
    }

    console.log(
      '[handleCopyPrivateKey] Copying formatted key:',
      formattedKey.substring(0, 10) + '...',
    );

    // Copy to clipboard
    navigator.clipboard.writeText(formattedKey);
    setCopiedKey(account.id);
    setTimeout(() => setCopiedKey(null), 2000);
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
          hasVaultPin() ? 'border-blue-200 bg-blue-50' : 'border-amber-200 bg-amber-50'
        } rounded-lg border p-4`}
      >
        <div className="flex items-start gap-3">
          <span className="text-2xl">{hasVaultPin() ? '🔒' : '⚠️'}</span>
          <div className="flex-1">
            <h3
              className={`mb-1 text-sm font-semibold ${
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
          <p className="mt-1 text-sm text-gray-600">
            Manage temporary accounts for automated deployments
          </p>
        </div>
        <div className="flex gap-3">
          {hasVaultPin() && vaultUnlocked && (
            <button
              onClick={() => setShowChangePin(true)}
              className="rounded-lg bg-purple-600 px-4 py-2 font-medium text-white transition-colors hover:bg-purple-700"
            >
              Change PIN
            </button>
          )}
          {deployerAccounts.length > 0 && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700"
            >
              Delete All
            </button>
          )}
          <button
            onClick={handleGenerateClick}
            className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700"
          >
            + Generate New Account
          </button>
        </div>
      </div>

      {/* Vault Locked Banner */}
      {isVaultLocked && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
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
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-amber-700"
            >
              Unlock Vault
            </button>
          </div>
        </div>
      )}

      {/* Accounts Table */}
      {deployerAccounts.length === 0 ? (
        <div className="rounded-lg border border-gray-200 p-12 text-center">
          <div className="mb-4 text-4xl">🔑</div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900">No Deployer Accounts</h3>
          <p className="mb-4 text-sm text-gray-600">
            Generate an account to start deploying without wallet approval prompts
          </p>
          <button
            onClick={handleGenerateClick}
            className="rounded-lg bg-blue-600 px-6 py-2 font-medium text-white transition-colors hover:bg-blue-700"
          >
            Generate Your First Account
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200">
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
                    <code className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">
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
                        onClick={() => {
                          // For Cosmos chains, show bech32 prefix modal (no vault unlock needed - public address only)
                          if (account.protocol === ProtocolType.CosmosNative) {
                            setCosmosBech32Account(account);
                          } else {
                            // For other chains, copy address directly
                            navigator.clipboard.writeText(account.address);
                          }
                        }}
                        className="rounded bg-gray-100 px-3 py-1 text-xs text-gray-700 transition-colors hover:bg-gray-200"
                        title={
                          account.protocol === ProtocolType.CosmosNative
                            ? 'Generate address with custom bech32 prefix'
                            : 'Copy address to clipboard'
                        }
                      >
                        Copy Address
                      </button>
                      <button
                        onClick={() => {
                          if (isVaultLocked) {
                            setShowUnlockModal(true);
                          } else {
                            handleCopyPrivateKey(account);
                          }
                        }}
                        className={`rounded px-3 py-1 text-xs transition-colors ${
                          isVaultLocked
                            ? 'bg-amber-100 text-amber-700 hover:bg-amber-200'
                            : copiedKey === account.id
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                        title={
                          isVaultLocked ? 'Unlock vault to copy private key' : 'Copy private key'
                        }
                      >
                        {isVaultLocked
                          ? '🔒 Copy Key'
                          : copiedKey === account.id
                            ? '✓ Copied'
                            : 'Copy Key'}
                      </button>
                      <button
                        onClick={() => handleDelete(account.id)}
                        className="rounded bg-red-600 px-3 py-1 text-xs text-white transition-colors hover:bg-red-700"
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

      {showGenerateModal && <GenerateAccountModal onClose={() => setShowGenerateModal(false)} />}

      {/* Delete All Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6">
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Delete All Accounts?</h3>
            <p className="mb-4 text-sm text-gray-600">
              This will permanently delete all {deployerAccounts.length} deployer account(s) from
              localStorage. This action cannot be undone.
            </p>
            <p className="mb-4 rounded bg-amber-50 p-3 text-sm text-amber-800">
              ⚠️ Make sure to sweep any remaining funds before deleting accounts.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="rounded-lg bg-gray-100 px-4 py-2 font-medium text-gray-700 transition-colors hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAll}
                className="rounded-lg bg-red-600 px-4 py-2 font-medium text-white transition-colors hover:bg-red-700"
              >
                Delete All
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cosmos Bech32 Address Modal */}
      {cosmosBech32Account && (
        <CosmosBech32Modal
          existingAddress={cosmosBech32Account.address}
          onClose={() => setCosmosBech32Account(null)}
        />
      )}
    </div>
  );
}
