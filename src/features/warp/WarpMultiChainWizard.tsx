import { useState, useMemo } from 'react';
import { ChainName } from '@hyperlane-xyz/sdk';
import { useMultiProvider } from '../chains/hooks';
import { getDeployableChains } from '../chains/utils';
import { WarpChainConfigList } from './WarpChainConfigList';
import { WarpDeployProgress } from './WarpDeployProgress';
import { useWarpMultiDeploy } from './useWarpMultiDeploy';
import { useCosmosWallet } from '../wallet/hooks/useCosmosWallet';
import { useRadixWallet } from '../wallet/hooks/useRadixWallet';
import { useAleoWallet } from '../wallet/hooks/useAleoWallet';
import { useStore } from '../store';
import { logger } from '../../utils/logger';
import type { WarpConfig } from './types';

export function WarpMultiChainWizard() {
  const [step, setStep] = useState<'select' | 'configure' | 'deploy'>('select');
  const [selectedChains, setSelectedChains] = useState<ChainName[]>([]);
  const multiProvider = useMultiProvider();

  const { warpMultiChainConfigs, setWarpChainConfig, addWarpDeployment } = useStore();
  const { deploy, chainStatuses, deployedAddresses, reset, isDeploying } = useWarpMultiDeploy();

  // Get all deployable chains
  const deployableChains = useMemo(() => {
    return getDeployableChains(multiProvider.metadata);
  }, [multiProvider]);

  // Wallet hooks (we'll need to get the appropriate wallet for each chain)
  const cosmosWallet = useCosmosWallet(selectedChains[0] || ''); // Simplified for now
  const radixWallet = useRadixWallet();
  const aleoWallet = useAleoWallet();

  const handleChainToggle = (chain: ChainName) => {
    setSelectedChains((prev) =>
      prev.includes(chain) ? prev.filter((c) => c !== chain) : [...prev, chain]
    );
  };

  const handleSelectAll = () => {
    setSelectedChains(deployableChains);
  };

  const handleClearAll = () => {
    setSelectedChains([]);
  };

  const handleNextStep = () => {
    if (step === 'select') {
      setStep('configure');
    } else if (step === 'configure') {
      setStep('deploy');
    }
  };

  const handlePrevStep = () => {
    if (step === 'deploy') {
      setStep('configure');
    } else if (step === 'configure') {
      setStep('select');
    }
  };

  const handleConfigChange = (chain: ChainName, config: WarpConfig | null) => {
    if (config) {
      setWarpChainConfig(chain, config);
    }
  };

  const handleDeploy = async () => {
    try {
      // Validate all configs
      const configsMap: Record<ChainName, WarpConfig> = {};
      const walletsMap: Record<ChainName, any> = {};

      for (const chain of selectedChains) {
        const config = warpMultiChainConfigs[chain];
        if (!config) {
          logger.error(`No config found for chain ${chain}`, new Error('Config missing'));
          return;
        }
        configsMap[chain] = config;

        // Get wallet for chain based on protocol
        const chainMetadata = multiProvider.tryGetChainMetadata(chain);
        if (!chainMetadata) {
          logger.error(`No metadata found for chain ${chain}`, new Error('Metadata missing'));
          return;
        }

        // Simplified wallet selection - in production, need proper per-chain wallet handling
        switch (chainMetadata.protocol) {
          case 'cosmosnative':
            walletsMap[chain] = await cosmosWallet.getOfflineSigner();
            break;
          case 'radix':
            walletsMap[chain] = radixWallet.rdt;
            break;
          case 'aleo':
            walletsMap[chain] = aleoWallet.wallet;
            break;
          default:
            logger.error(`Unsupported protocol for chain ${chain}: ${chainMetadata.protocol}`, new Error('Unsupported protocol'));
            return;
        }
      }

      logger.debug('Starting multi-chain deployment', { chains: selectedChains });

      const addresses = await deploy(configsMap, walletsMap);

      if (addresses) {
        // Save deployments to store
        Object.entries(addresses).forEach(([chain, address]) => {
          addWarpDeployment({
            id: `${chain}-${Date.now()}`,
            chainName: chain as ChainName,
            timestamp: Date.now(),
            address,
            config: configsMap[chain],
            type: configsMap[chain].type,
            txHashes: [],
          });
        });

        logger.debug('Multi-chain deployment complete', { addresses });
      }
    } catch (error) {
      logger.error('Multi-chain deployment failed', error);
    }
  };

  // Check if all selected chains have configs
  const allConfigured = selectedChains.every((chain) => warpMultiChainConfigs[chain]);

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center gap-4">
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            step === 'select' ? 'bg-blue-100 text-blue-900' : 'bg-gray-100 text-gray-600'
          }`}
        >
          <span className="font-semibold">1</span>
          <span>Select Chains</span>
        </div>
        <div className="flex-1 h-px bg-gray-300"></div>
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            step === 'configure' ? 'bg-blue-100 text-blue-900' : 'bg-gray-100 text-gray-600'
          }`}
        >
          <span className="font-semibold">2</span>
          <span>Configure</span>
        </div>
        <div className="flex-1 h-px bg-gray-300"></div>
        <div
          className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            step === 'deploy' ? 'bg-blue-100 text-blue-900' : 'bg-gray-100 text-gray-600'
          }`}
        >
          <span className="font-semibold">3</span>
          <span>Deploy</span>
        </div>
      </div>

      {/* Step 1: Select Chains */}
      {step === 'select' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Select Chains</h3>
            <div className="flex gap-2">
              <button
                onClick={handleSelectAll}
                className="text-xs px-3 py-1 text-blue-600 hover:bg-blue-50 rounded"
              >
                Select All
              </button>
              <button
                onClick={handleClearAll}
                className="text-xs px-3 py-1 text-gray-600 hover:bg-gray-50 rounded"
              >
                Clear All
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {deployableChains.map((chain) => (
              <label
                key={chain}
                className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all ${
                  selectedChains.includes(chain)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedChains.includes(chain)}
                  onChange={() => handleChainToggle(chain)}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="ml-2 text-sm font-medium text-gray-900">{chain}</span>
              </label>
            ))}
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Selected:</strong> {selectedChains.length} chain(s)
            </p>
          </div>
        </div>
      )}

      {/* Step 2: Configure Chains */}
      {step === 'configure' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Configure Warp Routes</h3>
          <WarpChainConfigList
            selectedChains={selectedChains}
            configs={warpMultiChainConfigs}
            onConfigChange={handleConfigChange}
          />
        </div>
      )}

      {/* Step 3: Deploy */}
      {step === 'deploy' && (
        <div className="space-y-6">
          <h3 className="text-lg font-semibold text-gray-900">Review & Deploy</h3>

          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Chains:</span>
                <span className="ml-2 font-semibold text-gray-900">{selectedChains.length}</span>
              </div>
              <div>
                <span className="text-gray-600">Configured:</span>
                <span className="ml-2 font-semibold text-gray-900">
                  {selectedChains.filter((c) => warpMultiChainConfigs[c]).length}
                </span>
              </div>
            </div>
          </div>

          <WarpDeployProgress
            chainStatuses={chainStatuses}
            deployedAddresses={deployedAddresses}
          />

          {!isDeploying && Object.keys(chainStatuses).length === 0 && (
            <button
              onClick={handleDeploy}
              disabled={!allConfigured}
              className="w-full px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Deploy All Warp Routes
            </button>
          )}

          {Object.keys(chainStatuses).length > 0 && (
            <button
              onClick={reset}
              disabled={isDeploying}
              className="w-full px-6 py-3 bg-gray-600 text-white font-semibold rounded-lg hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-4 border-t border-gray-200">
        <button
          onClick={handlePrevStep}
          disabled={step === 'select'}
          className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          ← Previous
        </button>

        {step !== 'deploy' && (
          <button
            onClick={handleNextStep}
            disabled={
              (step === 'select' && selectedChains.length === 0) ||
              (step === 'configure' && !allConfigured)
            }
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            Next →
          </button>
        )}
      </div>
    </div>
  );
}
