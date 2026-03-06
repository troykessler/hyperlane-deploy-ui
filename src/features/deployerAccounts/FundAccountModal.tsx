import { useState, useEffect } from 'react';
import { parseEther, formatEther } from 'ethers';
import type { DeployerAccount } from './types';
import { fundDeployerAccount } from './fundingUtils';
import { useMultiProvider } from '../chains/hooks';
import { useWallet } from '../wallet/hooks/useWallet';

interface FundAccountModalProps {
  account: DeployerAccount;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Modal for funding a deployer account from connected wallet
 */
export function FundAccountModal({ account, onClose, onSuccess }: FundAccountModalProps) {
  const multiProvider = useMultiProvider();
  const [selectedChain, setSelectedChain] = useState<string>('');
  const [amount, setAmount] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [txHash, setTxHash] = useState('');

  // Get EVM chains for dropdown
  const evmChains = multiProvider
    .getKnownChainNames()
    .filter((chain) => {
      const metadata = multiProvider.tryGetChainMetadata(chain);
      return metadata?.protocol === account.protocol;
    });

  // Auto-select first chain
  useEffect(() => {
    if (evmChains.length > 0 && !selectedChain) {
      setSelectedChain(evmChains[0]);
    }
  }, [evmChains, selectedChain]);

  const chainMetadata = selectedChain ? multiProvider.tryGetChainMetadata(selectedChain) : null;
  const wallet = useWallet(selectedChain, chainMetadata?.protocol);

  const handleMaxClick = () => {
    // For now, suggest 0.1 ETH as max
    // In production, would fetch actual wallet balance
    setAmount('0.1');
  };

  const handleFund = async () => {
    if (!amount || !selectedChain || !chainMetadata) {
      setError('Please enter amount and select chain');
      return;
    }

    if (!wallet.walletClient) {
      setError('Please connect your wallet first');
      return;
    }

    try {
      setIsLoading(true);
      setError('');

      // Parse amount to wei
      const amountWei = parseEther(amount);

      // Get wallet client
      let walletClient = wallet.walletClient;
      if (typeof walletClient === 'function') {
        walletClient = await walletClient();
      }

      // Send transaction
      const hash = await fundDeployerAccount(
        walletClient,
        account.address,
        amountWei,
        chainMetadata
      );

      setTxHash(hash);
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fund account');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Fund Deployer Account</h2>

        {!txHash ? (
          <>
            {/* Account Info */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deployer Address
              </label>
              <code className="block text-xs bg-gray-100 px-3 py-2 rounded text-gray-700 break-all">
                {account.address}
              </code>
            </div>

            {/* Chain Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Chain</label>
              <select
                value={selectedChain}
                onChange={(e) => setSelectedChain(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {evmChains.map((chain) => (
                  <option key={chain} value={chain}>
                    {chain}
                  </option>
                ))}
              </select>
            </div>

            {/* Wallet Status */}
            {!wallet.isConnected && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-800">
                  Please connect your wallet to fund this account
                </p>
              </div>
            )}

            {/* Amount Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount ({chainMetadata?.nativeToken?.symbol || 'ETH'})
              </label>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.1"
                  step="0.01"
                  min="0"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleMaxClick}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Max
                </button>
              </div>
            </div>

            {/* Warning */}
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800">
                ⚠️ Only fund the minimum amount needed for deployment. These keys are stored
                insecurely in browser localStorage.
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
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleFund}
                disabled={isLoading || !wallet.isConnected || !amount}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? 'Funding...' : 'Fund Account'}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Success */}
            <div className="mb-6">
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-3xl">✅</span>
                </div>
              </div>
              <h3 className="text-lg font-semibold text-center text-gray-900 mb-2">
                Transaction Sent!
              </h3>
              <p className="text-sm text-gray-600 text-center mb-4">
                Your deployer account will be funded once the transaction confirms.
              </p>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">Transaction Hash:</p>
                <code className="text-xs text-gray-900 break-all">{txHash}</code>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                Close
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
