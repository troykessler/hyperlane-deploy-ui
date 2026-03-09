import { ChainName } from '@hyperlane-xyz/sdk';
import { ProtocolType } from '@hyperlane-xyz/utils';
import { useStore } from '../store';
import { useMultiProvider } from '../chains/hooks';

interface ChainDeployerAccountSelectorProps {
  chainName: ChainName;
  useDeployerAccount: boolean;
  selectedAccountId: string | null;
  onSourceChange: (useDeployer: boolean) => void;
  onAccountChange: (accountId: string | null) => void;
}

/**
 * Per-chain selector for choosing between wallet and deployer account
 * Filters deployer accounts by chain protocol
 */
export function ChainDeployerAccountSelector({
  chainName,
  useDeployerAccount,
  selectedAccountId,
  onSourceChange,
  onAccountChange,
}: ChainDeployerAccountSelectorProps) {
  const { deployerAccounts, hasVaultPin, vaultUnlocked, encryptedVault } = useStore();
  const multiProvider = useMultiProvider();

  // Get chain protocol to filter accounts
  const chainMetadata = multiProvider.tryGetChainMetadata(chainName);
  const protocol = chainMetadata?.protocol as ProtocolType;

  // Filter accounts by protocol
  const compatibleAccounts = deployerAccounts.filter((acc) => acc.protocol === protocol);

  // Don't show if no compatible accounts and no vault
  if (compatibleAccounts.length === 0 && !encryptedVault) {
    return null;
  }

  const isVaultLocked = hasVaultPin() && !vaultUnlocked;

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">Deployment Source</label>

      <div className="space-y-2">
        <label className="flex items-center p-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="radio"
            name={`deploy-source-${chainName}`}
            checked={!useDeployerAccount}
            onChange={() => {
              onSourceChange(false);
              onAccountChange(null);
            }}
            className="mr-2"
          />
          <div className="text-sm">
            <div className="font-medium text-gray-900">Connected Wallet</div>
            <div className="text-xs text-gray-600">Sign with wallet (requires approval)</div>
          </div>
        </label>

        <label className="flex items-center p-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
          <input
            type="radio"
            name={`deploy-source-${chainName}`}
            checked={useDeployerAccount}
            onChange={() => onSourceChange(true)}
            className="mr-2"
          />
          <div className="flex-1 text-sm">
            <div className="font-medium text-gray-900">
              Deployer Account
              {isVaultLocked && useDeployerAccount && (
                <span className="ml-2 text-xs text-amber-600">🔒 Locked</span>
              )}
            </div>
            <div className="text-xs text-gray-600">Automated signing without prompts</div>
          </div>
        </label>
      </div>

      {useDeployerAccount && (
        <div>
          <select
            value={selectedAccountId || ''}
            onChange={(e) => onAccountChange(e.target.value || null)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select account...</option>
            {compatibleAccounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.protocol} - {account.address.slice(0, 10)}...{account.address.slice(-8)}
                {account.label && ` (${account.label})`}
              </option>
            ))}
          </select>
          {compatibleAccounts.length === 0 && (
            <p className="mt-1 text-xs text-amber-600">
              No {protocol} deployer accounts. Create one in Manage → Deployer Accounts.
            </p>
          )}
          {isVaultLocked && compatibleAccounts.length > 0 && (
            <p className="mt-1 text-xs text-amber-600">
              ⚠️ Vault locked. Unlock before deploying.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
