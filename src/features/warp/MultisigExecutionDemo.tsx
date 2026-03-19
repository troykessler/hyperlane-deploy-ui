import { useState } from 'react';
import { ChainName } from '@hyperlane-xyz/sdk';
import type { SafeTransactionBatch } from './types';
import { useMultiProvider } from '../chains/hooks';
import { useWallet } from '../wallet/hooks/useWallet';
import { useStore } from '../store';
import { createEvmSigner, createEvmSignerFromPrivateKey } from '../../utils/signerAdapters';
import { logger } from '../../utils/logger';
import { isEvmChain } from '../../utils/protocolUtils';
import { UnlockVaultModal } from '../deployerAccounts/UnlockVaultModal';

/**
 * Demo page for multisig owners to paste transaction batch JSON
 * and execute transactions one by one to ensure nothing is missed
 */
export function MultisigExecutionDemo() {
  const [jsonInput, setJsonInput] = useState('');
  const [batch, setBatch] = useState<SafeTransactionBatch | null>(null);
  const [parseError, setParseError] = useState('');
  const [executionStatus, setExecutionStatus] = useState<Record<number, 'pending' | 'executing' | 'success' | 'error'>>({});
  const [executionErrors, setExecutionErrors] = useState<Record<number, string>>({});
  const [txHashes, setTxHashes] = useState<Record<number, string>>({});
  const [showVaultUnlock, setShowVaultUnlock] = useState(false);
  const [pendingTxIndex, setPendingTxIndex] = useState<number | null>(null);

  const multiProvider = useMultiProvider();
  const { address: walletAddress, walletClient } = useWallet();
  const {
    deployerAccounts,
    selectedDeployerAccountId,
    setSelectedDeployerAccountId,
    hasVaultPin,
    vaultUnlocked,
  } = useStore((state) => ({
    deployerAccounts: state.deployerAccounts,
    selectedDeployerAccountId: state.selectedDeployerAccountId,
    setSelectedDeployerAccountId: state.setSelectedDeployerAccountId,
    hasVaultPin: state.hasVaultPin,
    vaultUnlocked: state.vaultUnlocked,
  }));

  const hasDeployerAccounts = deployerAccounts.length > 0;

  // Helper: Get deployer account private key
  const getDeployerPrivateKey = (): string | undefined => {
    if (!selectedDeployerAccountId) return undefined;
    const account = deployerAccounts.find((a) => a.id === selectedDeployerAccountId);
    const privateKey = account?.privateKey;
    return privateKey && privateKey.length > 0 ? privateKey : undefined;
  };

  const handleVaultUnlocked = async () => {
    setShowVaultUnlock(false);
    if (pendingTxIndex !== null) {
      await executeTransaction(pendingTxIndex);
      setPendingTxIndex(null);
    }
  };

  const handleParse = () => {
    try {
      const parsed = JSON.parse(jsonInput);

      // Validate structure
      if (!parsed.transactions || !Array.isArray(parsed.transactions)) {
        throw new Error('Invalid batch format: missing transactions array');
      }
      if (!parsed.chainId) {
        throw new Error('Invalid batch format: missing chainId');
      }

      setBatch(parsed);
      setParseError('');

      // Initialize all transactions as pending
      const statuses: Record<number, 'pending'> = {};
      parsed.transactions.forEach((_: any, i: number) => {
        statuses[i] = 'pending';
      });
      setExecutionStatus(statuses);
      setExecutionErrors({});
      setTxHashes({});
    } catch (error) {
      setParseError(error instanceof Error ? error.message : 'Invalid JSON');
      setBatch(null);
    }
  };

  const handleExecuteTransaction = async (index: number) => {
    if (!batch) return;

    // Check if vault needs unlocking
    if (selectedDeployerAccountId && hasVaultPin() && !vaultUnlocked) {
      setPendingTxIndex(index);
      setShowVaultUnlock(true);
      return;
    }

    await executeTransaction(index);
  };

  const executeTransaction = async (index: number) => {
    if (!batch) return;

    const tx = batch.transactions[index];

    setExecutionStatus(prev => ({ ...prev, [index]: 'executing' }));

    try {
      // Find chain by chainId
      const chains = multiProvider.getKnownChainNames();
      let chainName: ChainName | null = null;

      for (const name of chains) {
        const metadata = multiProvider.tryGetChainMetadata(name);
        if (metadata?.chainId === parseInt(batch.chainId)) {
          chainName = name;
          break;
        }
      }

      if (!chainName) {
        throw new Error(`Chain with chainId ${batch.chainId} not found in config`);
      }

      const chainMetadata = multiProvider.getChainMetadata(chainName);

      if (!isEvmChain(chainMetadata)) {
        throw new Error('Only EVM chains supported for execution');
      }

      const evmMultiProvider = multiProvider.toMultiProvider();

      // Create signer
      let signer;
      const deployerPrivateKey = getDeployerPrivateKey();

      if (deployerPrivateKey) {
        signer = await createEvmSignerFromPrivateKey(deployerPrivateKey, chainMetadata);
        logger.debug('Using deployer account for transaction execution');
      } else if (walletClient) {
        signer = await createEvmSigner(walletClient, chainMetadata);
        logger.debug('Using wallet for transaction execution');
      } else {
        throw new Error('Please connect wallet or select deployer account');
      }

      evmMultiProvider.setSharedSigner(signer);

      logger.debug('Executing transaction', { index, to: tx.to, data: tx.data?.slice(0, 20) });

      const txResponse = await signer.sendTransaction({
        to: tx.to,
        data: tx.data,
        value: tx.value || '0',
      });

      logger.debug('Transaction sent', { hash: txResponse.hash });

      setTxHashes(prev => ({ ...prev, [index]: txResponse.hash }));

      await txResponse.wait();

      logger.debug('Transaction confirmed', { hash: txResponse.hash });

      setExecutionStatus(prev => ({ ...prev, [index]: 'success' }));
    } catch (error) {
      logger.error('Transaction execution failed', error);
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setExecutionErrors(prev => ({ ...prev, [index]: errorMsg }));
      setExecutionStatus(prev => ({ ...prev, [index]: 'error' }));
    }
  };

  const getStatusColor = (status: 'pending' | 'executing' | 'success' | 'error') => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-700';
      case 'executing': return 'bg-blue-100 text-blue-700';
      case 'success': return 'bg-green-100 text-green-700';
      case 'error': return 'bg-red-100 text-red-700';
    }
  };

  const allExecuted = batch && Object.keys(executionStatus).length === batch.transactions.length &&
    Object.values(executionStatus).every(s => s === 'success' || s === 'error');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Multisig Execution Demo</h2>
        <p className="text-gray-600">
          Paste transaction batch JSON and execute transactions one by one to ensure nothing is missed.
        </p>
      </div>

      {!batch ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paste Transaction Batch JSON
            </label>
            <textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder='{"version":"1.0","chainId":"...","transactions":[...]}'
              className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
            />
          </div>

          {parseError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
              {parseError}
            </div>
          )}

          <button
            onClick={handleParse}
            disabled={!jsonInput.trim()}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              jsonInput.trim() ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-400 text-white cursor-not-allowed'
            }`}
          >
            Parse & Load Transactions
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Batch info */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Chain ID:</span>{' '}
                <span className="font-mono">{batch.chainId}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Transactions:</span>{' '}
                <span>{batch.transactions.length}</span>
              </div>
              {batch.meta.name && (
                <div className="col-span-2">
                  <span className="font-medium text-gray-600">Name:</span>{' '}
                  <span>{batch.meta.name}</span>
                </div>
              )}
            </div>
          </div>

          {/* Wallet/Deployer Selection */}
          <div className="bg-white border border-gray-300 rounded-lg p-4 space-y-3">
            <h3 className="text-sm font-medium text-gray-700">Execution Credentials</h3>

            <div className="space-y-3">
              {/* Wallet Status */}
              {walletAddress ? (
                <div className="bg-green-50 border border-green-200 rounded p-3">
                  <div className="text-xs text-green-800">
                    <strong>Connected Wallet:</strong>
                    <div className="font-mono mt-1">{walletAddress}</div>
                  </div>
                </div>
              ) : !hasDeployerAccounts ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <p className="text-xs text-yellow-800">
                    No wallet connected. Please connect your wallet to execute transactions.
                  </p>
                </div>
              ) : null}

              {/* Deployer Account Selector */}
              {hasDeployerAccounts && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-2">
                    {walletAddress ? 'Or use Deployer Account (optional):' : 'Select Deployer Account:'}
                  </label>
                  <select
                    value={selectedDeployerAccountId || ''}
                    onChange={(e) => setSelectedDeployerAccountId(e.target.value || null)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="">{walletAddress ? 'Use connected wallet' : 'Select an account...'}</option>
                    {deployerAccounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.protocol} - {account.address.slice(0, 10)}...{account.address.slice(-8)}
                        {account.label && ` (${account.label})`}
                      </option>
                    ))}
                  </select>
                  {selectedDeployerAccountId && hasVaultPin() && !vaultUnlocked && (
                    <p className="text-xs text-yellow-700 mt-2">
                      ⚠️ Vault is locked. Unlock your vault before executing transactions.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Progress summary */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm">
              <span className="font-medium">Execution Progress:</span>{' '}
              {Object.values(executionStatus).filter(s => s === 'success').length} / {batch.transactions.length} completed
            </div>
          </div>

          {/* Transactions list */}
          <div className="space-y-3">
            {batch.transactions.map((tx, i) => {
              const status = executionStatus[i] || 'pending';
              const error = executionErrors[i];
              const txHash = txHashes[i];

              return (
                <div key={i} className="bg-white border border-gray-300 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900">Transaction {i + 1}</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(status)}`}>
                        {status.toUpperCase()}
                      </span>
                    </div>
                    <button
                      onClick={() => handleExecuteTransaction(i)}
                      disabled={status === 'executing' || status === 'success'}
                      className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                        status === 'executing' || status === 'success'
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      }`}
                    >
                      {status === 'executing' ? 'Executing...' : status === 'success' ? '✓ Executed' : 'Execute'}
                    </button>
                  </div>

                  {tx.annotation && (
                    <p className="text-sm text-gray-600 mb-3">{tx.annotation}</p>
                  )}

                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="font-medium text-gray-600">To:</span>{' '}
                      <span className="font-mono">{tx.to}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Value:</span>{' '}
                      <span className="font-mono">{tx.value} wei</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-600">Data:</span>{' '}
                      <span className="font-mono break-all">{tx.data.slice(0, 100)}...</span>
                    </div>
                  </div>

                  {txHash && (
                    <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded text-xs">
                      <span className="font-medium text-green-800">Tx Hash:</span>{' '}
                      <span className="font-mono text-green-700">{txHash}</span>
                    </div>
                  )}

                  {error && (
                    <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                      <span className="font-medium">Error:</span> {error}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Summary */}
          {allExecuted && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white text-xl">
                  ✓
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">All Transactions Processed</h3>
                  <p className="text-sm text-gray-600">
                    {Object.values(executionStatus).filter(s => s === 'success').length} succeeded,{' '}
                    {Object.values(executionStatus).filter(s => s === 'error').length} failed
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Reset button */}
          <button
            onClick={() => {
              setBatch(null);
              setJsonInput('');
              setExecutionStatus({});
              setExecutionErrors({});
              setTxHashes({});
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            Load Different Batch
          </button>
        </div>
      )}

      {/* Vault Unlock Modal */}
      {showVaultUnlock && (
        <UnlockVaultModal
          onSuccess={handleVaultUnlocked}
          onCancel={() => {
            setShowVaultUnlock(false);
            setPendingTxIndex(null);
          }}
        />
      )}
    </div>
  );
}
