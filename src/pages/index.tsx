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
import { useWarpRead } from '../features/warp/useWarpRead';
import { useWarpUpdate } from '../features/warp/useWarpUpdate';
import { FloatingButtonStrip } from '../components/nav/FloatingButtonStrip';
import { WalletStatusBar } from '../features/wallet/WalletStatusBar';
import { useCosmosWallet } from '../features/wallet/hooks/useCosmosWallet';
import { useRadixWallet } from '../features/wallet/hooks/useRadixWallet';
import { useAleoWallet } from '../features/wallet/hooks/useAleoWallet';
import { CustomChainsList } from '../features/chains/CustomChainsList';
import { WarpConfigUpload } from '../features/warp/WarpConfigUpload';
import { WarpFormBuilder } from '../features/warp/WarpFormBuilder';
import { WarpMultiChainWizard } from '../features/warp/WarpMultiChainWizard';
import { WarpConfigPreview } from '../features/warp/WarpConfigPreview';
import { useWarpDeploy } from '../features/warp/useWarpDeploy';
import type { WarpConfig } from '../features/warp/types';

const Home: NextPage = () => {
  const [activeTab, setActiveTab] = useState<'deploy' | 'warp' | 'view' | 'apply' | 'chains'>('deploy');
  const [selectedChain, setSelectedChain] = useState<ChainName>('');
  const [currentConfig, setCurrentConfig] = useState<CoreConfig | null>(null);
  const [uploadError, setUploadError] = useState<string>('');

  // Warp-specific state
  const [warpInputMethod, setWarpInputMethod] = useState<'upload' | 'builder' | 'multichain'>('builder');
  const [warpError, setWarpError] = useState<string>('');

  const { deployments, addDeployment, customChains, warpDeployments, addWarpDeployment, currentWarpConfig, setCurrentWarpConfig } = useStore((s) => ({
    deployments: s.deployments,
    addDeployment: s.addDeployment,
    customChains: s.customChains,
    warpDeployments: s.warpDeployments,
    addWarpDeployment: s.addWarpDeployment,
    currentWarpConfig: s.currentWarpConfig,
    setCurrentWarpConfig: s.setCurrentWarpConfig,
  }));

  const multiProvider = useMultiProvider();
  const { deploy, progress, isDeploying } = useCoreDeploy();
  const { readConfig, currentConfig: readCoreConfig, progress: readProgress, isReading } = useReadCoreConfig();
  const { applyConfig, progress: applyProgress, isApplying } = useApplyCoreConfig();
  const { deploy: deployWarp, progress: warpProgress, isDeploying: isDeployingWarp } = useWarpDeploy();
  const { readConfig: readWarpConfig, currentConfig: readWarpConfigData, progress: warpReadProgress, isReading: isReadingWarp } = useWarpRead();
  const { applyUpdate: applyWarpUpdate, progress: warpUpdateProgress, isApplying: isApplyingWarp } = useWarpUpdate();

  // State for Apply Updates tab
  const [updateType, setUpdateType] = useState<'core' | 'warp'>('core');
  const [editedConfig, setEditedConfig] = useState<CoreConfig | null>(null);
  const [applyError, setApplyError] = useState<string>('');
  const [mailboxAddress, setMailboxAddress] = useState<string>('');
  const [warpRouteAddress, setWarpRouteAddress] = useState<string>('');
  const [editedWarpConfig, setEditedWarpConfig] = useState<WarpConfig | null>(null);

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

  // Check if selected chain is a custom chain
  const isCustomChain = useMemo(() => {
    return selectedChain ? !!customChains[selectedChain] : false;
  }, [selectedChain, customChains]);

  // Clear mailbox address when chain changes
  useEffect(() => {
    setMailboxAddress('');
  }, [selectedChain]);

  // Auto-read config when chain is selected (for Apply Updates tab)
  // Skip auto-read for custom chains - they need manual mailbox address
  useEffect(() => {
    if (selectedChain && activeTab === 'apply' && !isCustomChain) {
      handleReadConfig();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedChain, activeTab, isCustomChain]);

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

    // For custom chains, require mailbox address
    if (isCustomChain && !mailboxAddress) {
      setApplyError('Please provide the mailbox address for this custom chain');
      return;
    }

    try {
      // Read config - no wallet needed!
      // Only pass mailbox address for custom chains
      await readConfig(selectedChain, isCustomChain ? mailboxAddress : undefined);
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

  const handleWarpDeploy = async () => {
    if (!selectedChain || !currentWarpConfig) {
      setWarpError('Please select a chain and configure the warp route');
      return;
    }

    setWarpError('');

    try {
      const walletClient = await getWalletClient();
      if (!walletClient) {
        setWarpError('Please connect your wallet first');
        return;
      }

      const result = await deployWarp(selectedChain, currentWarpConfig, walletClient);

      if (result) {
        addWarpDeployment({
          id: `${result.chainName}-${result.timestamp}`,
          chainName: result.chainName,
          timestamp: result.timestamp,
          address: result.address,
          config: currentWarpConfig,
          type: currentWarpConfig.type,
          txHashes: result.txHashes,
        });
      }
    } catch (error) {
      setWarpError(`Failed to deploy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleReadWarpConfig = async () => {
    if (!selectedChain || !warpRouteAddress) {
      setApplyError('Please select a chain and provide warp route address');
      return;
    }

    try {
      await readWarpConfig(selectedChain, warpRouteAddress);
      setApplyError('');
    } catch (error) {
      setApplyError(`Failed to read warp config: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleApplyWarpUpdates = async () => {
    if (!selectedChain || !warpRouteAddress || !editedWarpConfig) {
      setApplyError('Please select a chain, provide warp route address, and edit the configuration');
      return;
    }

    setApplyError('');

    try {
      const walletClient = await getWalletClient();
      if (!walletClient) {
        setApplyError('Please connect your wallet first');
        return;
      }

      const success = await applyWarpUpdate(selectedChain, warpRouteAddress, editedWarpConfig, walletClient);
      if (success) {
        await handleReadWarpConfig();
      }
    } catch (error) {
      setApplyError(`Failed to apply warp updates: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy to clipboard', error);
    }
  };

  return (
    <div className="space-y-4 pt-4 max-w-4xl mx-auto px-4">
      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('deploy')}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === 'deploy'
              ? 'border-b-2 border-blue-500 text-blue-600 bg-white'
              : 'text-gray-900 hover:text-gray-900 hover:bg-gray-100 font-semibold'
          }`}
        >
          Deploy Core
        </button>
        <button
          onClick={() => setActiveTab('warp')}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === 'warp'
              ? 'border-b-2 border-blue-500 text-blue-600 bg-white'
              : 'text-gray-900 hover:text-gray-900 hover:bg-gray-100 font-semibold'
          }`}
        >
          Deploy Warp
        </button>
        <button
          onClick={() => setActiveTab('view')}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === 'view'
              ? 'border-b-2 border-blue-500 text-blue-600 bg-white'
              : 'text-gray-900 hover:text-gray-900 hover:bg-gray-100 font-semibold'
          }`}
        >
          View Deployments ({deployments.length + warpDeployments.length})
        </button>
        <button
          onClick={() => setActiveTab('apply')}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === 'apply'
              ? 'border-b-2 border-blue-500 text-blue-600 bg-white'
              : 'text-gray-900 hover:text-gray-900 hover:bg-gray-100 font-semibold'
          }`}
        >
          Apply Updates
        </button>
        <button
          onClick={() => setActiveTab('chains')}
          className={`px-6 py-3 font-semibold transition-colors ${
            activeTab === 'chains'
              ? 'border-b-2 border-blue-500 text-blue-600 bg-white'
              : 'text-gray-900 hover:text-gray-900 hover:bg-gray-100 font-semibold'
          }`}
        >
          Manage Chains
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

        {activeTab === 'warp' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Deploy Warp Route</h2>

            {/* Wallet Status */}
            <WalletStatusBar selectedChain={selectedChain} selectedProtocol={selectedProtocol} />

            {/* Input Method Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Choose Input Method
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setWarpInputMethod('builder')}
                  className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                    warpInputMethod === 'builder'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  Form Builder
                </button>
                <button
                  onClick={() => setWarpInputMethod('upload')}
                  className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                    warpInputMethod === 'upload'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  Upload YAML
                </button>
                <button
                  onClick={() => setWarpInputMethod('multichain')}
                  className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                    warpInputMethod === 'multichain'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  Multi-Chain Wizard
                </button>
              </div>
            </div>

            {/* Upload Method */}
            {warpInputMethod === 'upload' && (
              <>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">1. Upload Configuration</h3>
                  <WarpConfigUpload
                    onConfigLoaded={setCurrentWarpConfig}
                    onError={setWarpError}
                  />
                </div>

                {currentWarpConfig && <WarpConfigPreview config={currentWarpConfig} />}

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">2. Select Target Chain</h3>
                  <ChainSelectField value={selectedChain} onChange={setSelectedChain} label="" />
                </div>
              </>
            )}

            {/* Form Builder Method */}
            {warpInputMethod === 'builder' && (
              <>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">1. Select Target Chain</h3>
                  <ChainSelectField value={selectedChain} onChange={setSelectedChain} label="" />
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">2. Configure Warp Route</h3>
                  <WarpFormBuilder
                    chainName={selectedChain}
                    initialConfig={currentWarpConfig}
                    onChange={setCurrentWarpConfig}
                  />
                </div>
              </>
            )}

            {/* Multi-Chain Wizard */}
            {warpInputMethod === 'multichain' && (
              <WarpMultiChainWizard />
            )}

            {/* Deploy Button (only for upload and builder methods) */}
            {warpInputMethod !== 'multichain' && (
              <>
                <DeployProgress
                  status={
                    warpProgress.status === 'idle' ? DeploymentStatus.Idle :
                    warpProgress.status === 'validating' ? DeploymentStatus.Validating :
                    warpProgress.status === 'deploying' ? DeploymentStatus.Deploying :
                    warpProgress.status === 'deployed' ? DeploymentStatus.Deployed :
                    DeploymentStatus.Failed
                  }
                  message={warpProgress.message}
                  error={warpProgress.error}
                />

                {warpError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                    {warpError}
                  </div>
                )}

                <button
                  onClick={handleWarpDeploy}
                  disabled={!selectedChain || !currentWarpConfig || isDeployingWarp}
                  className={`w-full px-6 py-3 rounded-lg font-medium transition-colors ${
                    selectedChain && currentWarpConfig && !isDeployingWarp
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-400 text-white cursor-not-allowed'
                  }`}
                >
                  {isDeployingWarp ? 'Deploying...' : 'Deploy Warp Route'}
                </button>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> This will deploy a Hyperlane warp route contract to the selected chain.
                    Make sure your wallet is connected and has sufficient funds for gas.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'view' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Your Deployments</h2>

            {deployments.length === 0 && warpDeployments.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No deployments yet</p>
                <div className="mt-4 flex gap-3 justify-center">
                  <button
                    onClick={() => setActiveTab('deploy')}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Deploy Core
                  </button>
                  <button
                    onClick={() => setActiveTab('warp')}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Deploy Warp
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Core Deployments */}
                {deployments.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Core Deployments ({deployments.length})
                    </h3>
                    <div className="space-y-3">
                      {deployments.map((deployment) => (
                        <div
                          key={deployment.id}
                          className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {deployment.chainName}
                                </h3>
                                <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">
                                  CORE
                                </span>
                              </div>
                              <p className="text-sm text-gray-500 mt-1">
                                {new Date(deployment.timestamp).toLocaleString()}
                              </p>
                              <div className="mt-3 space-y-1">
                                <div className="flex items-center justify-between text-xs text-gray-600">
                                  <div>
                                    <strong>Mailbox:</strong>{' '}
                                    <code className="bg-gray-100 px-1 rounded">
                                      {deployment.addresses.mailbox.slice(0, 10)}...{deployment.addresses.mailbox.slice(-8)}
                                    </code>
                                  </div>
                                  <button
                                    onClick={() => copyToClipboard(deployment.addresses.mailbox)}
                                    className="ml-2 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                                  >
                                    Copy
                                  </button>
                                </div>
                                <div className="flex items-center justify-between text-xs text-gray-600">
                                  <div>
                                    <strong>Validator Announce:</strong>{' '}
                                    <code className="bg-gray-100 px-1 rounded">
                                      {deployment.addresses.validatorAnnounce.slice(0, 10)}...{deployment.addresses.validatorAnnounce.slice(-8)}
                                    </code>
                                  </div>
                                  <button
                                    onClick={() => copyToClipboard(deployment.addresses.validatorAnnounce)}
                                    className="ml-2 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                                  >
                                    Copy
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Warp Deployments */}
                {warpDeployments.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-3">
                      Warp Route Deployments ({warpDeployments.length})
                    </h3>
                    <div className="space-y-3">
                      {warpDeployments.map((deployment) => (
                        <div
                          key={deployment.id}
                          className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="text-lg font-semibold text-gray-900">
                                  {deployment.chainName}
                                </h3>
                                <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded uppercase">
                                  {deployment.type}
                                </span>
                              </div>
                              <p className="text-sm text-gray-500 mt-1">
                                {new Date(deployment.timestamp).toLocaleString()}
                              </p>
                              <div className="mt-3 space-y-1">
                                <div className="flex items-center justify-between text-xs text-gray-600">
                                  <div>
                                    <strong>Warp Route:</strong>{' '}
                                    <code className="bg-gray-100 px-1 rounded">
                                      {deployment.address.slice(0, 10)}...{deployment.address.slice(-8)}
                                    </code>
                                  </div>
                                  <button
                                    onClick={() => copyToClipboard(deployment.address)}
                                    className="ml-2 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                                  >
                                    Copy
                                  </button>
                                </div>
                                {deployment.config.type === 'collateral' && (
                                  <div className="flex items-center justify-between text-xs text-gray-600">
                                    <div>
                                      <strong>Token:</strong>{' '}
                                      <code className="bg-gray-100 px-1 rounded">
                                        {(deployment.config as any).token.slice(0, 10)}...{(deployment.config as any).token.slice(-8)}
                                      </code>
                                    </div>
                                    <button
                                      onClick={() => copyToClipboard((deployment.config as any).token)}
                                      className="ml-2 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
                                    >
                                      Copy
                                    </button>
                                  </div>
                                )}
                                {deployment.config.type === 'synthetic' && deployment.config.name && (
                                  <p className="text-xs text-gray-600">
                                    <strong>Token:</strong> {deployment.config.name} ({deployment.config.symbol})
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {activeTab === 'apply' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Apply Config Updates</h2>

            {/* Wallet Status */}
            <WalletStatusBar selectedChain={selectedChain} selectedProtocol={selectedProtocol} />

            {/* Deployment Type Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Select Deployment Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setUpdateType('core')}
                  className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                    updateType === 'core'
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  Core Contracts
                </button>
                <button
                  onClick={() => setUpdateType('warp')}
                  className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                    updateType === 'warp'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  Warp Routes
                </button>
              </div>
            </div>

            {/* Chain Selection */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">1. Select Chain</h3>
              <ChainSelectField
                value={selectedChain}
                onChange={setSelectedChain}
                label=""
              />
            </div>

            {/* Core-specific: Mailbox Address (for custom chains) */}
            {updateType === 'core' && isCustomChain && selectedChain && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">2. Mailbox Address</h3>
                <input
                  type="text"
                  value={mailboxAddress}
                  onChange={(e) => setMailboxAddress(e.target.value)}
                  placeholder="Enter deployed mailbox contract address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Custom chains require the mailbox address to read existing configuration.
                </p>
              </div>
            )}

            {/* Warp-specific: Warp Route Address */}
            {updateType === 'warp' && selectedChain && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">2. Warp Route Address</h3>
                <input
                  type="text"
                  value={warpRouteAddress}
                  onChange={(e) => setWarpRouteAddress(e.target.value)}
                  placeholder="Enter deployed warp route contract address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
                <p className="mt-2 text-xs text-gray-500">
                  Provide the warp route contract address to read and update its configuration.
                </p>
              </div>
            )}

            {/* Core: Read Progress */}
            {updateType === 'core' && selectedChain && (
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

            {/* Warp: Read Progress */}
            {updateType === 'warp' && selectedChain && warpRouteAddress && (
              <div>
                <DeployProgress
                  status={
                    warpReadProgress.status === 'idle' ? DeploymentStatus.Idle :
                    warpReadProgress.status === 'reading' ? DeploymentStatus.Validating :
                    warpReadProgress.status === 'success' ? DeploymentStatus.Deployed :
                    DeploymentStatus.Failed
                  }
                  message={warpReadProgress.message}
                  error={warpReadProgress.error}
                />
              </div>
            )}

            {/* Core: Config Editor */}
            {updateType === 'core' && readCoreConfig && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  {isCustomChain ? '3' : '2'}. Edit Configuration
                </h3>
                <CoreConfigEditor
                  initialConfig={readCoreConfig}
                  onChange={setEditedConfig}
                  onError={setApplyError}
                />
              </div>
            )}

            {/* Warp: Config Editor */}
            {updateType === 'warp' && readWarpConfigData && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">3. Edit Configuration</h3>
                <WarpFormBuilder
                  chainName={selectedChain}
                  initialConfig={readWarpConfigData as WarpConfig}
                  onChange={setEditedWarpConfig}
                />
              </div>
            )}

            {/* Core: Apply Progress */}
            {updateType === 'core' && applyProgress.status !== 'idle' && (
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

            {/* Warp: Apply Progress */}
            {updateType === 'warp' && warpUpdateProgress.status !== 'idle' && (
              <DeployProgress
                status={
                  warpUpdateProgress.status === 'validating' ? DeploymentStatus.Validating :
                  warpUpdateProgress.status === 'applying' ? DeploymentStatus.Deploying :
                  warpUpdateProgress.status === 'success' ? DeploymentStatus.Deployed :
                  DeploymentStatus.Failed
                }
                message={warpUpdateProgress.message}
                error={warpUpdateProgress.error}
              />
            )}

            {/* Error Display */}
            {applyError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                {applyError}
              </div>
            )}

            {/* Core: Action Buttons */}
            {updateType === 'core' && (
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
            )}

            {/* Warp: Action Buttons */}
            {updateType === 'warp' && (
              <div className="flex gap-3">
                <button
                  onClick={handleReadWarpConfig}
                  disabled={!selectedChain || !warpRouteAddress || isReadingWarp}
                  className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
                    selectedChain && warpRouteAddress && !isReadingWarp
                      ? 'bg-gray-600 text-white hover:bg-gray-700'
                      : 'bg-gray-400 text-white cursor-not-allowed'
                  }`}
                >
                  {isReadingWarp ? 'Reading...' : 'Read Current Config'}
                </button>

                <button
                  onClick={handleApplyWarpUpdates}
                  disabled={!selectedChain || !warpRouteAddress || !editedWarpConfig || isApplyingWarp}
                  className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
                    selectedChain && warpRouteAddress && editedWarpConfig && !isApplyingWarp
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-400 text-white cursor-not-allowed'
                  }`}
                >
                  {isApplyingWarp ? 'Applying...' : 'Apply Updates'}
                </button>
              </div>
            )}

            {/* Info */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> This will read the current {updateType === 'core' ? 'core' : 'warp route'} configuration from the chain,
                allow you to edit it, and apply any changes as transactions. Make sure your wallet is connected.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'chains' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Manage Custom Chains</h2>
            <p className="text-gray-600">
              Add custom chain metadata to deploy to chains not in the Hyperlane registry.
              Custom chains are stored locally in your browser.
            </p>
            <CustomChainsList />
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
