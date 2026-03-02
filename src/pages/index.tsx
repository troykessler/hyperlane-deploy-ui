import type { NextPage } from 'next';
import { useState, useMemo, useEffect } from 'react';
import { CoreConfig } from '@hyperlane-xyz/provider-sdk/core';
import { ChainName } from '@hyperlane-xyz/sdk';
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
import { useWallet } from '../features/wallet/hooks/useWallet';
import { DeployerInfo } from '../features/wallet/DeployerInfo';
import { CustomChainsList } from '../features/chains/CustomChainsList';
import { DeploymentAddresses } from '../components/deploy/DeploymentAddresses';
import { CoreConfigSelector } from '../components/deploy/CoreConfigSelector';
import { WarpConfigUpload } from '../features/warp/WarpConfigUpload';
import { WarpFormBuilder } from '../features/warp/WarpFormBuilder';
import { WarpMultiChainWizard } from '../features/warp/WarpMultiChainWizard';
import { WarpConfigPreview } from '../features/warp/WarpConfigPreview';
import { useWarpDeploy } from '../features/warp/useWarpDeploy';
import type { WarpConfig } from '../features/warp/types';
import { WarpRouteSelect } from '../features/warpRoutes/WarpRouteSelect';
import { CoreFormBuilder } from '../features/core/CoreFormBuilder';
import { WarpRoutesGraph } from '../features/warpMap';
import { Sidebar, NavigationPage } from '../components/nav/Sidebar';

const Home: NextPage = () => {
  const [activePage, setActivePage] = useState<NavigationPage>('read-core');
  const [selectedChain, setSelectedChain] = useState<ChainName>('');
  const [currentConfig, setCurrentConfig] = useState<CoreConfig | null>(null);
  const [uploadError, setUploadError] = useState<string>('');

  // Core-specific state
  const [coreInputMethod, setCoreInputMethod] = useState<'upload' | 'builder'>('builder');

  // Warp-specific state
  const [warpInputMethod, setWarpInputMethod] = useState<'upload' | 'builder' | 'multichain'>('builder');
  const [warpError, setWarpError] = useState<string>('');

  const { deployments, addDeployment, warpDeployments, addWarpDeployment, currentWarpConfig, setCurrentWarpConfig, customChains } = useStore((s) => ({
    deployments: s.deployments,
    addDeployment: s.addDeployment,
    warpDeployments: s.warpDeployments,
    addWarpDeployment: s.addWarpDeployment,
    currentWarpConfig: s.currentWarpConfig,
    setCurrentWarpConfig: s.setCurrentWarpConfig,
    customChains: s.customChains,
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

  // Get protocol for selected chain
  const selectedProtocol = useMemo(() => {
    if (!selectedChain) return null;
    const metadata = multiProvider.tryGetChainMetadata(selectedChain);
    return metadata?.protocol || null;
  }, [selectedChain, multiProvider]);

  // Unified wallet hook - automatically routes to correct wallet based on protocol
  const wallet = useWallet(selectedChain, selectedProtocol);

  // Clear mailbox address when chain changes
  useEffect(() => {
    setMailboxAddress('');
  }, [selectedChain]);

  const getWalletClient = async () => {
    if (!wallet.walletClient) {
      return null;
    }
    // For Cosmos, walletClient is a function that returns the offline signer
    if (typeof wallet.walletClient === 'function') {
      return await wallet.walletClient();
    }
    return wallet.walletClient;
  };

  const handleCoreConfigSelect = async (mailbox: string) => {
    setMailboxAddress(mailbox);
    setApplyError('');

    // Auto-trigger config read (non-blocking - user can still proceed manually if this fails)
    if (selectedChain) {
      try {
        await readConfig(selectedChain, mailbox);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        setApplyError(
          `Auto-read failed: ${errorMsg}\n\n` +
          `The mailbox address (${mailbox}) has been saved. You can:\n` +
          `• Try a different deployment from the list above\n` +
          `• Use the form builder in the "Deploy Core" tab to create a new config\n` +
          `• Manually configure and deploy new contracts to this chain`
        );
      }
    }
  };

  const handleReadConfig = async () => {
    if (!selectedChain) return;

    try {
      // Read config - no wallet needed!
      // Pass mailbox address if available (from selector or manual input)
      // Otherwise, readConfig will try to get it from registry
      await readConfig(selectedChain, mailboxAddress || undefined);
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
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar
        activePage={activePage}
        onNavigate={setActivePage}
        deploymentCount={deployments.length + warpDeployments.length}
        customChainCount={Object.keys(customChains).length}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-y-scroll bg-gray-100" style={{ scrollbarGutter: 'stable' }}>
        <div className="max-w-6xl mx-auto p-6">
          <FloatingButtonStrip />

          {activePage === 'deploy-core' && (
          <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Deploy Core Contracts</h2>

            {/* Deployer Info */}
            <DeployerInfo selectedChain={selectedChain} selectedProtocol={selectedProtocol} />

            {/* Input Method Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Choose Input Method
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setCoreInputMethod('builder')}
                  className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                    coreInputMethod === 'builder'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  Form Builder
                </button>
                <button
                  onClick={() => setCoreInputMethod('upload')}
                  className={`px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                    coreInputMethod === 'upload'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  Upload YAML
                </button>
              </div>
            </div>

            {/* Upload Method */}
            {coreInputMethod === 'upload' && (
              <>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">1. Upload Configuration</h3>
                  <ConfigUpload
                    onConfigLoaded={setCurrentConfig}
                    onError={setUploadError}
                  />
                </div>

                {currentConfig && <ConfigPreview config={currentConfig} />}

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">2. Select Target Chain</h3>
                  <ChainSelectField value={selectedChain} onChange={setSelectedChain} label="" />
                </div>
              </>
            )}

            {/* Form Builder Method */}
            {coreInputMethod === 'builder' && (
              <>
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">1. Select Target Chain</h3>
                  <ChainSelectField value={selectedChain} onChange={setSelectedChain} label="" />
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">2. Configure Core Contracts</h3>
                  <CoreFormBuilder
                    chainName={selectedChain}
                    initialConfig={currentConfig}
                    onChange={setCurrentConfig}
                  />
                </div>
              </>
            )}

            {/* Deploy Button */}
            <DeployProgress
              status={progress.status}
              message={progress.message}
              error={progress.error}
            />

            {uploadError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                {uploadError}
              </div>
            )}

            {/* Validation errors */}
            {!currentConfig && coreInputMethod === 'builder' && selectedChain && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm font-medium text-amber-900 mb-2">Complete all required fields:</p>
                <ul className="text-sm text-amber-800 list-disc list-inside space-y-1">
                  <li><strong>Owner Address</strong> - Address that will own the core contracts</li>
                  <li><strong>Default ISM</strong> - Configure validators (at least one) or use existing ISM address</li>
                  <li><strong>Default Hook</strong> - Required for all outbound messages (auto-filled with Merkle Tree Hook)</li>
                  <li><strong>Required Hook</strong> - Enforced for all outbound messages (auto-filled with Merkle Tree Hook)</li>
                </ul>
                <p className="mt-2 text-xs text-amber-700">
                  Note: Hooks are auto-filled with default values. Make sure to configure the ISM and enter validator addresses.
                </p>
              </div>
            )}
            {!selectedChain && coreInputMethod === 'builder' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Select a target chain</strong> to begin configuration
                </p>
              </div>
            )}

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

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> This will deploy the Hyperlane core contracts (Mailbox, ISM, Hooks) to the selected chain.
                Make sure your wallet is connected and has sufficient funds for gas.
              </p>
            </div>
          </div>
        )}

        {activePage === 'deploy-warp' && (
          <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Deploy Warp Route</h2>

            {/* Deployer Info */}
            <DeployerInfo selectedChain={selectedChain} selectedProtocol={selectedProtocol} />

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

        {activePage === 'view-deployments' && (
          <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Your Deployments</h2>

            {deployments.length === 0 && warpDeployments.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">No deployments yet</p>
                <div className="mt-4 flex gap-3 justify-center">
                  <button
                    onClick={() => setActivePage('deploy-core')}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Deploy Core
                  </button>
                  <button
                    onClick={() => setActivePage('deploy-warp')}
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
                      {deployments
                        .slice()
                        .sort((a, b) => b.timestamp - a.timestamp)
                        .map((deployment) => (
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

                              <DeploymentAddresses
                                addresses={deployment.addresses}
                                chainName={deployment.chainName}
                              />
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
                      {warpDeployments
                        .slice()
                        .sort((a, b) => b.timestamp - a.timestamp)
                        .map((deployment) => (
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

        {activePage === 'read-core' && (
          <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Read Core Config</h2>
            <p className="text-gray-600">
              Read the current core configuration from an existing deployment on any chain.
              No wallet connection required.
            </p>

            {/* Chain Selection */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">1. Select Chain</h3>
              <ChainSelectField
                value={selectedChain}
                onChange={setSelectedChain}
                label=""
              />
            </div>

            {/* Core Config Selector */}
            {selectedChain && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">2. Select Core Deployment</h3>
                <CoreConfigSelector
                  chainName={selectedChain}
                  onSelect={handleCoreConfigSelect}
                  selectedMailbox={mailboxAddress}
                />
              </div>
            )}

            {/* Manual Mailbox Address Input */}
            {selectedChain && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">
                  3. Or Enter Mailbox Address Manually
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={mailboxAddress}
                    onChange={(e) => setMailboxAddress(e.target.value)}
                    placeholder="Enter deployed mailbox contract address"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                  <button
                    onClick={handleReadConfig}
                    disabled={!mailboxAddress || isReading}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                      mailboxAddress && !isReading
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-400 text-white cursor-not-allowed'
                    }`}
                  >
                    {isReading ? 'Reading...' : 'Read Config'}
                  </button>
                </div>
              </div>
            )}

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

            {/* Config Display (Read-only) */}
            {readCoreConfig && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700">Configuration</h3>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(readCoreConfig, null, 2))}
                    className="text-xs px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors"
                  >
                    Copy JSON
                  </button>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <pre className="text-xs whitespace-pre-wrap break-words">{JSON.stringify(readCoreConfig, null, 2)}</pre>
                </div>
              </div>
            )}

            {/* Error Display */}
            {applyError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                <pre className="whitespace-pre-wrap font-sans">{applyError}</pre>
              </div>
            )}
          </div>
        )}

        {activePage === 'read-warp' && (
          <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Read Warp Config</h2>
            <p className="text-gray-600">
              Read the current warp route configuration from an existing deployment.
              No wallet connection required.
            </p>

            {/* Chain Selection */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">1. Select Chain</h3>
              <ChainSelectField
                value={selectedChain}
                onChange={setSelectedChain}
                label=""
              />
            </div>

            {/* Warp Route Address */}
            {selectedChain && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">2. Warp Route Address</h3>
                <WarpRouteSelect
                  chainName={selectedChain}
                  value={warpRouteAddress}
                  onChange={setWarpRouteAddress}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
                <button
                  onClick={handleReadWarpConfig}
                  disabled={!selectedChain || !warpRouteAddress || isReadingWarp}
                  className={`mt-3 px-6 py-2 rounded-lg font-medium transition-colors ${
                    selectedChain && warpRouteAddress && !isReadingWarp
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-400 text-white cursor-not-allowed'
                  }`}
                >
                  {isReadingWarp ? 'Reading...' : 'Read Config'}
                </button>
              </div>
            )}

            {/* Read Progress */}
            {selectedChain && warpRouteAddress && (
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

            {/* Config Display (Read-only) */}
            {readWarpConfigData && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-gray-700">Configuration</h3>
                  <button
                    onClick={() => copyToClipboard(JSON.stringify(readWarpConfigData, null, 2))}
                    className="text-xs px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg font-medium transition-colors"
                  >
                    Copy JSON
                  </button>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <pre className="text-xs whitespace-pre-wrap break-words">{JSON.stringify(readWarpConfigData, null, 2)}</pre>
                </div>
              </div>
            )}

            {/* Error Display */}
            {applyError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                <pre className="whitespace-pre-wrap font-sans">{applyError}</pre>
              </div>
            )}
          </div>
        )}

        {activePage === 'apply-core' && (
          <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Apply Core Config Updates</h2>
            <p className="text-gray-600">
              Read, edit, and apply configuration updates to existing core deployments.
            </p>

            {/* Deployer Info */}
            <DeployerInfo selectedChain={selectedChain} selectedProtocol={selectedProtocol} />

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">1. Select Chain</h3>
              <ChainSelectField value={selectedChain} onChange={setSelectedChain} label="" />
            </div>

            {selectedChain && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">2. Select Core Deployment</h3>
                <CoreConfigSelector
                  chainName={selectedChain}
                  onSelect={handleCoreConfigSelect}
                  selectedMailbox={mailboxAddress}
                />
              </div>
            )}

            {selectedChain && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">3. Or Enter Mailbox Address Manually</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={mailboxAddress}
                    onChange={(e) => setMailboxAddress(e.target.value)}
                    placeholder="Enter deployed mailbox contract address (optional)"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  />
                  <button
                    onClick={handleReadConfig}
                    disabled={!mailboxAddress || isReading}
                    className={`px-6 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                      mailboxAddress && !isReading ? 'bg-gray-600 text-white hover:bg-gray-700' : 'bg-gray-400 text-white cursor-not-allowed'
                    }`}
                  >
                    {isReading ? 'Reading...' : 'Read Config'}
                  </button>
                </div>
                <p className="mt-2 text-xs text-gray-500">Enter a different mailbox address if you want to read from a deployment not listed above.</p>
              </div>
            )}

            {selectedChain && (
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
            )}

            {readCoreConfig && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">4. Edit Configuration</h3>
                <CoreConfigEditor
                  chainName={selectedChain}
                  initialConfig={readCoreConfig}
                  onChange={setEditedConfig}
                  onError={setApplyError}
                />
              </div>
            )}

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

            {applyError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                <pre className="whitespace-pre-wrap font-sans">{applyError}</pre>
              </div>
            )}

            <div className="flex gap-3">
              {readCoreConfig && (
                <button
                  onClick={handleReadConfig}
                  disabled={!selectedChain || isReading}
                  className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
                    selectedChain && !isReading ? 'bg-gray-600 text-white hover:bg-gray-700' : 'bg-gray-400 text-white cursor-not-allowed'
                  }`}
                >
                  {isReading ? 'Refreshing...' : 'Refresh Config'}
                </button>
              )}
              <button
                onClick={handleApplyUpdates}
                disabled={!selectedChain || !editedConfig || isApplying}
                className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
                  selectedChain && editedConfig && !isApplying ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-400 text-white cursor-not-allowed'
                }`}
              >
                {isApplying ? 'Applying...' : 'Apply Updates'}
              </button>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Read current core configuration, edit it, and apply changes. Wallet must be connected.
              </p>
              <p className="text-sm text-blue-800 mt-2">
                <strong>Tip:</strong> If registry deployments fail, use local deployments or deploy new contracts.
              </p>
            </div>
          </div>
        )}

        {activePage === 'apply-warp' && (
          <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Apply Warp Config Updates</h2>
            <p className="text-gray-600">
              Read, edit, and apply configuration updates to existing warp route deployments.
            </p>

            {/* Deployer Info */}
            <DeployerInfo selectedChain={selectedChain} selectedProtocol={selectedProtocol} />

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">1. Select Chain</h3>
              <ChainSelectField value={selectedChain} onChange={setSelectedChain} label="" />
            </div>

            {selectedChain && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">2. Warp Route Address</h3>
                <WarpRouteSelect
                  chainName={selectedChain}
                  value={warpRouteAddress}
                  onChange={setWarpRouteAddress}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
              </div>
            )}

            {selectedChain && warpRouteAddress && (
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
            )}

            {readWarpConfigData && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">3. Edit Configuration</h3>
                <WarpFormBuilder
                  chainName={selectedChain}
                  initialConfig={readWarpConfigData as WarpConfig}
                  onChange={setEditedWarpConfig}
                />
              </div>
            )}

            {warpUpdateProgress.status !== 'idle' && (
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

            {applyError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
                <pre className="whitespace-pre-wrap font-sans">{applyError}</pre>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleReadWarpConfig}
                disabled={!selectedChain || !warpRouteAddress || isReadingWarp}
                className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
                  selectedChain && warpRouteAddress && !isReadingWarp ? 'bg-gray-600 text-white hover:bg-gray-700' : 'bg-gray-400 text-white cursor-not-allowed'
                }`}
              >
                {isReadingWarp ? 'Reading...' : 'Read Current Config'}
              </button>
              <button
                onClick={handleApplyWarpUpdates}
                disabled={!selectedChain || !warpRouteAddress || !editedWarpConfig || isApplyingWarp}
                className={`flex-1 px-6 py-3 rounded-lg font-medium transition-colors ${
                  selectedChain && warpRouteAddress && editedWarpConfig && !isApplyingWarp ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-400 text-white cursor-not-allowed'
                }`}
              >
                {isApplyingWarp ? 'Applying...' : 'Apply Updates'}
              </button>
            </div>

            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> Read current warp route configuration, edit it, and apply changes. Wallet must be connected.
              </p>
            </div>
          </div>
        )}

        {activePage === 'manage-chains' && (
          <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Manage Custom Chains</h2>
            <p className="text-gray-600">
              Add custom chain metadata to deploy to chains not in the Hyperlane registry.
              Custom chains are stored locally in your browser.
            </p>
            <CustomChainsList />
          </div>
        )}

        {activePage === 'explorer-map' && (
          <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Warp Routes Explorer</h2>
            <p className="text-gray-600">
              Interactive graph visualization of warp routes. Click chains to view core configs,
              or click warp route edges to read and edit warp configurations.
            </p>
            <WarpRoutesGraph
              useTestData={false}
              onChainClick={(chain) => {
                setSelectedChain(chain);
                setActivePage('view-deployments');
                readConfig(chain);
              }}
              onWarpRouteClick={(sourceChain, _targetChain, _routeId, address) => {
                setSelectedChain(sourceChain);
                setWarpRouteAddress(address);
                setActivePage('apply-warp');
              }}
            />
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default Home;
