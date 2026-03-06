import { useState, useEffect } from 'react';
import { ChainName } from '@hyperlane-xyz/sdk';
import { ProtocolType } from '@hyperlane-xyz/utils';
import { useMultiProvider } from '../chains/hooks';
import { useWallet } from './hooks/useWallet';
import { useStore } from '../store';

interface DeployerInfoProps {
  selectedChain?: ChainName;
  selectedProtocol?: ProtocolType | null;
}

export function DeployerInfo({ selectedChain, selectedProtocol }: DeployerInfoProps) {
  const wallet = useWallet(selectedChain, selectedProtocol);
  const { useDeployerAccounts, selectedDeployerAccountId, deployerAccounts } = useStore();
  const multiProvider = useMultiProvider();
  const [balance, setBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine which address to display
  const selectedDeployerAccount = useDeployerAccounts && selectedDeployerAccountId
    ? deployerAccounts.find(a => a.id === selectedDeployerAccountId)
    : null;
  const displayAddress = selectedDeployerAccount?.address || wallet.address;
  const isUsingDeployerAccount = !!selectedDeployerAccount;

  useEffect(() => {
    async function fetchBalance() {
      if (!displayAddress || !selectedChain) {
        setBalance(null);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const metadata = multiProvider.tryGetChainMetadata(selectedChain);
        const provider = multiProvider.tryGetProvider(selectedChain);

        if (!provider) {
          setError('Provider not available');
          setBalance(null);
          return;
        }

        if (!metadata) {
          setError('Chain metadata not found');
          setBalance(null);
          return;
        }

        // Get native token balance (EVM only for now)
        // For non-EVM protocols, balance display not yet implemented
        if (metadata.protocol !== ProtocolType.Ethereum) {
          setError('Balance display only available for EVM chains');
          setBalance(null);
          return;
        }

        let balanceWei: bigint | string;
        try {
          // Use provider's getBalance for EVM chains
          balanceWei = await (provider as any).getBalance(displayAddress);
        } catch (err) {
          // If balance fetch fails
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.warn('Balance fetch failed:', errorMsg);
          setError(`RPC error: ${errorMsg.slice(0, 40)}`);
          setBalance(null);
          return;
        }

        // Format balance to readable format (e.g., ETH, MATIC, etc.)
        const decimals = metadata.nativeToken?.decimals || 18;
        const balanceNumber = typeof balanceWei === 'bigint'
          ? Number(balanceWei)
          : Number(balanceWei);
        const balanceFormatted = balanceNumber / Math.pow(10, decimals);

        // Show up to 6 decimal places
        const balanceStr = balanceFormatted.toFixed(6).replace(/\.?0+$/, '');
        setBalance(balanceStr);
        setError(null);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.error('Failed to fetch balance:', errorMsg);
        setError(`Error: ${errorMsg.slice(0, 50)}`);
        setBalance(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchBalance();
  }, [displayAddress, selectedChain, multiProvider]);

  // If no chain selected, show placeholder
  if (!selectedChain) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-sm text-gray-600">
          Select chain to view deployer account
        </p>
      </div>
    );
  }

  // Check if we have a valid account to display
  const hasAccount = isUsingDeployerAccount ? !!selectedDeployerAccount : (wallet.isConnected && wallet.address);

  if (!hasAccount) {
    return (
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <p className="text-sm text-amber-800">
          <strong>No account selected</strong> - {isUsingDeployerAccount
            ? 'Please select a deployer account or unlock vault'
            : `Please connect your ${selectedProtocol || 'wallet'} wallet to deploy contracts`}.
        </p>
      </div>
    );
  }

  const metadata = multiProvider.tryGetChainMetadata(selectedChain);
  const nativeTokenSymbol = metadata?.nativeToken?.symbol || 'tokens';

  return (
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-sm font-medium text-blue-900">Deployer Account</p>
            <span className="text-xs px-2 py-0.5 bg-blue-200 text-blue-800 rounded">
              {isUsingDeployerAccount ? 'Deployer Account' : 'Connected Wallet'}
            </span>
          </div>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-blue-700 font-medium mb-1">Address</p>
              <code className="text-xs bg-white px-2 py-1 rounded border border-blue-200 font-mono text-blue-900 break-all">
                {displayAddress}
              </code>
            </div>
            <div>
              <p className="text-xs text-blue-700 font-medium mb-1">Balance</p>
              {isLoading ? (
                <span className="text-xs text-blue-600">Loading...</span>
              ) : balance !== null ? (
                <span className="text-sm font-semibold text-blue-900">
                  {balance} {nativeTokenSymbol}
                </span>
              ) : error ? (
                <span className="text-xs text-amber-600" title={error}>
                  {error}
                </span>
              ) : (
                <span className="text-xs text-blue-600">Balance unavailable</span>
              )}
            </div>
          </div>
        </div>
        <div className="ml-3">
          <div className="w-3 h-3 bg-green-500 rounded-full" title="Connected" />
        </div>
      </div>
    </div>
  );
}
