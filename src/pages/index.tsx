import type { NextPage } from 'next';
import { useState, useMemo, useEffect } from 'react';
import { CoreConfig } from '@hyperlane-xyz/provider-sdk/core';
import { ChainName } from '@hyperlane-xyz/sdk';
import { ProtocolType } from '@hyperlane-xyz/utils';
import { useStore } from '../features/store';
import { useMultiProvider } from '../features/chains/hooks';
import { ChainSelectField } from '../features/chains/ChainSelectField';
import { ConfigUpload } from '../features/deploy/ConfigUpload';
import { ConfigPreview } from '../features/deploy/ConfigPreview';
import { DeployProgress } from '../features/deploy/DeployProgress';
import { useCoreDeploy } from '../features/deploy/useCoreDeploy';
import { DeploymentStatus } from '../features/deploy/types';
import { useReadCoreConfig } from '../features/coreConfig/useReadCoreConfig';
import { useApplyCoreConfig } from '../features/coreConfig/useApplyCoreConfig';
import { CoreConfigEditor } from '../features/coreConfig/CoreConfigEditor';
import { FloatingButtonStrip } from '../components/nav/FloatingButtonStrip';
import { WalletStatusBar } from '../features/wallet/WalletStatusBar';
import { useCosmosWallet } from '../features/wallet/hooks/useCosmosWallet';
import { useRadixWallet } from '../features/wallet/hooks/useRadixWallet';
import { useAleoWallet } from '../features/wallet/hooks/useAleoWallet';

const Home: NextPage = () => {
  const [activeTab, setActiveTab] = useState<'deploy' | 'view' | 'apply'>('deploy');
  const [selectedChain, setSelectedChain] = useState<ChainName>('');
  const [currentConfig, setCurrentConfig] = useState<CoreConfig | null>(null);
  const [uploadError, setUploadError] = useState<string>('');

  const { deployments, addDeployment } = useStore((s) => ({
    deployments: s.deployments,
    addDeployment: s.addDeployment,
  }));

  const multiProvider = useMultiProvider();
  const { deploy, progress, isDeploying } = useCoreDeploy();
  const { readConfig, currentConfig: readCoreConfig, progress: readProgress, isReading } = useReadCoreConfig();
  const { applyConfig, progress: applyProgress, isApplying } = useApplyCoreConfig();

  // State for Apply Updates tab
  const [editedConfig, setEditedConfig] = useState<CoreConfig | null>(null);
  const [applyError, setApplyError] = useState<string>('');

  // Wallet hooks
  const cosmosWallet = useCosmosWallet(selectedChain);
  const radixWallet = useRadixWallet();
  const aleoWallet = useAleoWallet();

  // Get protocol for selected chain
  const selectedProtocol = useMemo(() => {
    if (!selectedChain) return null;
    const metadata = multiProvider.tryGetChainMetadata(selectedChain);
    return metadata?.protocol || null;
  }, [selectedChain, multiProvider]);

  // Auto-read config when chain is selected (for Apply Updates tab)
  useEffect(() => {
    if (selectedChain && activeTab === 'apply') {
      handleReadConfig();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChain, activeTab]);

  const getWalletClient = async () => {
    if (selectedProtocol === ProtocolType.CosmosNative) {
      return await cosmosWallet.getOfflineSigner();
    } else if (selectedProtocol === ProtocolType.Radix) {
      return radixWallet.rdt;
    } else if (selectedProtocol === ProtocolType.Aleo) {
      return aleoWallet.wallet;
    }
    return null;
  };

  const handleReadConfig = async () => {
    if (!selectedChain) return;

    try {
      // Read config - no wallet needed!
      await readConfig(selectedChain);
      setApplyError('');
    } catch (error) {
      setApplyError(`Failed to read config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleApplyUpdates = async () => {
    if (!selectedChain || !editedConfig) {
      setApplyError('Please select a chain and edit the configuration');
      return;
    }

    setApplyError('');

    try {
      const walletClient = await getWalletClient();
      if (!walletClient) {
        setApplyError('Please connect your wallet first');
        return;
      }

      const success = await applyConfig(selectedChain, editedConfig, walletClient);
      if (success) {
        // Refresh the config after successful apply
        await handleReadConfig();
      }
    } catch (error) {
      setApplyError(`Failed to apply updates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDeploy = async () => {
    if (!selectedChain || !currentConfig) {
      setUploadError('Please select a chain and upload a config');
      return;
    }

    setUploadError('');

    try {
      const walletClient = await getWalletClient();
      if (!walletClient) {
        setUploadError('Please connect your wallet first');
        return;
      }

      const result = await deploy(selectedChain, currentConfig, walletClient);

      if (result) {
        addDeployment({
          id: `${result.chainName}-${result.timestamp}`,
          chainName: result.chainName,
          timestamp: result.timestamp,
          addresses: result.addresses,
          config: currentConfig,
          txHashes: result.txHashes,
        });
      }
    } catch (error) {
      setUploadError(`Failed to deploy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="space-y-4 pt-4 max-w-4xl mx-auto px-4">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('deploy')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'deploy'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Deploy
        </button>
        <button
          onClick={() => setActiveTab('view')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'view'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          View Deployments ({deployments.length})
        </button>
        <button
          onClick={() => setActiveTab('apply')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'apply'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Apply Updates
        </button>
      </div>

      {/* Content */}
      <div className="relative bg-white rounded-lg shadow-md p-6">
        <FloatingButtonStrip />

        {activeTab === 'deploy' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Deploy Core Contracts</h2>

            {/* Wallet Status */}
            <WalletStatusBar selectedChain={selectedChain} selectedProtocol={selectedProtocol} />

            {/* Config Upload */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">1. Upload Configuration</h3>
              <ConfigUpload
                onConfigLoaded={setCurrentConfig}
                onError={setUploadError}
              />
            </div>

            {/* Config Preview */}
            {currentConfig && (
              <ConfigPreview config={currentConfig} />
            )}

            {/* Chain Selection */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">2. Select Target Chain</h3>
              <ChainSelectField
                value={selectedChain}
                onChange={setSelectedChain}
                label=""
              />
            </div>

            {/* Progress */}
            <DeployProgress
              status={progress.status}
              message={progress.message}
              error={progress.error}
            />

            {/* Error Display */}
            {uploadError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                {uploadError}
              </div>
            )}

            {/* Deploy Button */}
            <button
              onClick={handleDeploy}
              disabled={!selectedChain || !currentConfig || isDeploying}
              className={`w-full px-6 py-3 rounded-lg font-medium transition-colors ${
                selectedChain && currentConfig && !isDeploying
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-400 text-white cursor-not-allowed'
              }`}
            >
              {isDeploying ? 'Deploying...' : 'Deploy Core Contracts'}
            </button>

            {/* Info */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> This will deploy the Hyperlane core contracts (Mailbox, ISM, Hooks) to the selected chain.
                Make sure your wallet is connected and has sufficient funds for gas.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'view' && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Deployments</h2>
            {deployments.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No deployments yet</p>
                <button
                  onClick={() => setActiveTab('deploy')}
                  className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Deploy Your First Contract
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {deployments.map((deployment) => (
                  <div
                    key={deployment.id}
                    className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {deployment.chainName}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          {new Date(deployment.timestamp).toLocaleString()}
                        </p>
                        <div className="mt-3 space-y-1">
                          <p className="text-xs text-gray-600">
                            <strong>Mailbox:</strong>{' '}
                            <code className="bg-gray-100 px-1 rounded">
                              {deployment.addresses.mailbox.slice(0, 10)}...
                            </code>
                          </p>
                          <p className="text-xs text-gray-600">
                            <strong>Validator Announce:</strong>{' '}
                            <code className="bg-gray-100 px-1 rounded">
                              {deployment.addresses.validatorAnnounce.slice(0, 10)}...
                            </code>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'apply' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Apply Config Updates</h2>

            {/* Wallet Status */}
            <WalletStatusBar selectedChain={selectedChain} selectedProtocol={selectedProtocol} />

            {/* Chain Selection */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">1. Select Chain</h3>
              <ChainSelectField
                value={selectedChain}
                onChange={setSelectedChain}
                label=""
              />
            </div>

            {/* Read Progress */}
            {selectedChain && (
              <div>
                <DeployProgress
                  status={
                    readProgress.status === 'idle' ? DeploymentStatus.Idle :
                    readProgress.status === 'reading' ? DeploymentStatus.Validating :
                    readProgress.status === 'success' ? DeploymentStatus.Deployed :
                    DeploymentStatus.Failed
                  }
                  message={readProgress.message}
                  error={readProgress.error}
                />
              </div>
            )}

            {/* Config Editor */}
            {readCoreConfig && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">2. Edit Configuration</h3>
                <CoreConfigEditor
                  initialConfig={readCoreConfig}
                  onChange={setEditedConfig}
                  onError={setApplyError}
                />
              </div>
            )}

            {/* Apply Progress */}
            {applyProgress.status !== 'idle' && (
              <DeployProgress
                status={
                  applyProgress.status === 'validating' ? DeploymentStatus.Validating :
                  applyProgress.status === 'applying' ? DeploymentStatus.Deploying :
                  applyProgress.status === 'success' ? DeploymentStatus.Deployed :
                  DeploymentStatus.Failed
                }
                message={applyProgress.message}
                error={applyProgress.error}
              />
            )}

            {/* Error Display */}
            {applyError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                {applyError}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleReadConfig}
                disabled={!selectedChain || isReading}
                className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
                  selectedChain && !isReading
                    ? 'bg-gray-600 text-white hover:bg-gray-700'
                    : 'bg-gray-400 text-white cursor-not-allowed'
                }`}
              >
                {isReading ? 'Reading...' : 'Read Current Config'}
              </button>

              <button
                onClick={handleApplyUpdates}
                disabled={!selectedChain || !editedConfig || isApplying}
                className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
                  selectedChain && editedConfig && !isApplying
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-400 text-white cursor-not-allowed'
                }`}
              >
                {isApplying ? 'Applying...' : 'Apply Updates'}
              </button>
            </div>

            {/* Info */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> This will read the current core configuration from the chain, allow you to edit it,
                and apply any changes as transactions. Make sure your wallet is connected.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
