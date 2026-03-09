import { useEffect } from 'react';
import { useStore } from '../store';

interface DeployerAccountSelectorProps {
  onVaultLocked?: () => void;
}

/**
 * Selector for choosing between connected wallet and deployer accounts
 * Shows at the beginning of deploy flows
 */
export function DeployerAccountSelector({ onVaultLocked }: DeployerAccountSelectorProps) {
  const {
    deployerAccounts,
    hasVaultPin,
    vaultUnlocked,
    useDeployerAccounts,
    setUseDeployerAccounts,
    selectedDeployerAccountId,
    setSelectedDeployerAccountId,
    encryptedVault,
  } = useStore();

  // Auto-select first account when vault is unlocked and no account is selected
  useEffect(() => {
    if (useDeployerAccounts && vaultUnlocked && deployerAccounts.length > 0 && !selectedDeployerAccountId) {
      setSelectedDeployerAccountId(deployerAccounts[0].id);
    }
  }, [useDeployerAccounts, vaultUnlocked, deployerAccounts, selectedDeployerAccountId, setSelectedDeployerAccountId]);

  const handleSourceChange = (useDeployer: boolean) => {
    setUseDeployerAccounts(useDeployer);

    // If switching to deployer accounts and vault is locked, trigger callback
    if (useDeployer && hasVaultPin() && !vaultUnlocked && onVaultLocked) {
      onVaultLocked();
    }
  };

  const handleAccountChange = (accountId: string) => {
    setSelectedDeployerAccountId(accountId);
  };

  // Don't show if no accounts and no encrypted vault
  if (deployerAccounts.length === 0 && !encryptedVault) {
    return null;
  }

  const isVaultLocked = hasVaultPin() && !vaultUnlocked;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Deployment Source
        </label>
        <div className="space-y-2">
          <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="radio"
              name="deploySource"
              checked={!useDeployerAccounts}
              onChange={() => handleSourceChange(false)}
              className="mr-3"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900">Connected Wallet</div>
              <div className="text-xs text-gray-600">
                Sign transactions with your connected wallet (requires approval for each tx)
              </div>
            </div>
          </label>

          <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <input
              type="radio"
              name="deploySource"
              checked={useDeployerAccounts}
              onChange={() => handleSourceChange(true)}
              className="mr-3"
            />
            <div className="flex-1">
              <div className="font-medium text-gray-900">
                Deployer Account
                {isVaultLocked && useDeployerAccounts && (
                  <span className="ml-2 text-xs text-amber-600">🔒 Vault Locked</span>
                )}
              </div>
              <div className="text-xs text-gray-600">
                Automated signing without wallet approval prompts
              </div>
            </div>
          </label>
        </div>
      </div>

      {useDeployerAccounts && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Deployer Account {isVaultLocked && <span className="text-xs text-amber-600">(locked)</span>}
          </label>
          <select
            value={selectedDeployerAccountId || ''}
            onChange={(e) => handleAccountChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select an account...</option>
            {deployerAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.protocol} - {account.address.slice(0, 10)}...{account.address.slice(-8)}
                {account.label && ` (${account.label})`}
              </option>
            ))}
          </select>
          {isVaultLocked && (
            <p className="mt-2 text-xs text-amber-600">
              ⚠️ Vault is locked. You'll be prompted to enter your PIN before deployment starts.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
