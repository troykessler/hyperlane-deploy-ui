import {
  chainAddresses,
  chainMetadata as registryChainMetadata,
  GithubRegistry,
  IRegistry,
  PartialRegistry,
} from '@hyperlane-xyz/registry';
import {
  ChainMap,
  ChainMetadata,
  ChainName,
  MultiProtocolProvider,
} from '@hyperlane-xyz/sdk';
import { CoreConfig, DeployedCoreAddresses } from '@hyperlane-xyz/provider-sdk/core';
import { objFilter } from '@hyperlane-xyz/utils';
import { toast } from 'react-toastify';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { config } from '../consts/config';
import { logger } from '../utils/logger';
import { initializeAltVMProtocols } from '../utils/protocolInit';
import { assembleChainMetadata } from './chains/metadata';

// Initialize AltVM protocols (Cosmos, Radix, Aleo)
initializeAltVMProtocols();

// Increment this when persist state has breaking changes
const PERSIST_STATE_VERSION = 3;

export interface DeploymentRecord {
  id: string;
  chainName: ChainName;
  timestamp: number;
  addresses: DeployedCoreAddresses;
  config: CoreConfig;
  txHashes: string[];
}

export type ConfigInputMethod = 'upload' | 'builder';

interface DeployContext {
  registry: IRegistry;
  chainMetadata: ChainMap<ChainMetadata>;
  multiProvider: MultiProtocolProvider;
}

// Keeping everything here for now as state is simple
// Will refactor into slices as necessary
export interface AppState {
  // Chains and providers
  chainMetadata: ChainMap<ChainMetadata>;
  chainMetadataOverrides: ChainMap<Partial<ChainMetadata>>;
  setChainMetadataOverrides: (overrides?: ChainMap<Partial<ChainMetadata> | undefined>) => void;
  multiProvider: MultiProtocolProvider;
  registry: IRegistry;
  setDeployContext: (context: DeployContext) => void;

  // Deployment state
  selectedChain: ChainName;
  setSelectedChain: (chain: ChainName) => void;
  currentConfig: CoreConfig | null;
  setCurrentConfig: (config: CoreConfig | null) => void;
  deployments: DeploymentRecord[];
  addDeployment: (deployment: DeploymentRecord) => void;
  resetDeployments: () => void;
  deploymentInProgress: boolean;
  setDeploymentInProgress: (inProgress: boolean) => void;
  configInputMethod: ConfigInputMethod;
  setConfigInputMethod: (method: ConfigInputMethod) => void;

  // Shared component state
  isSideBarOpen: boolean;
  setIsSideBarOpen: (isOpen: boolean) => void;
  showEnvSelectModal: boolean;
  setShowEnvSelectModal: (show: boolean) => void;
}

export const useStore = create<AppState>()(
  persist(
    // Store reducers
    (set, get) => ({
      // Chains and providers
      chainMetadata: {},
      chainMetadataOverrides: {},
      setChainMetadataOverrides: async (
        overrides: ChainMap<Partial<ChainMetadata> | undefined> = {},
      ) => {
        logger.debug('Setting chain overrides in store');
        const filtered = objFilter(overrides, (_, metadata) => !!metadata);
        const { multiProvider, chainMetadata } = await initDeployContext({
          ...get(),
          chainMetadataOverrides: filtered,
        });
        set({
          chainMetadataOverrides: filtered,
          multiProvider,
          chainMetadata,
        });
      },
      multiProvider: new MultiProtocolProvider({}),
      registry: new GithubRegistry({
        uri: config.registryUrl,
        branch: config.registryBranch,
        proxyUrl: config.registryProxyUrl,
      }),
      setDeployContext: (context) => {
        logger.debug('Setting deploy context in store');
        set(context);
      },

      // Deployment state
      selectedChain: '',
      setSelectedChain: (selectedChain) => {
        set(() => ({ selectedChain }));
      },
      currentConfig: null,
      setCurrentConfig: (currentConfig) => {
        set(() => ({ currentConfig }));
      },
      deployments: [],
      addDeployment: (deployment) => {
        set((state) => ({ deployments: [...state.deployments, deployment] }));
      },
      resetDeployments: () => {
        set(() => ({ deployments: [] }));
      },
      deploymentInProgress: false,
      setDeploymentInProgress: (deploymentInProgress) => {
        set(() => ({ deploymentInProgress }));
      },
      configInputMethod: 'upload',
      setConfigInputMethod: (configInputMethod) => {
        set(() => ({ configInputMethod }));
      },

      // Shared component state
      isSideBarOpen: false,
      setIsSideBarOpen: (isSideBarOpen) => {
        set(() => ({ isSideBarOpen }));
      },
      showEnvSelectModal: false,
      setShowEnvSelectModal: (showEnvSelectModal) => {
        set(() => ({ showEnvSelectModal }));
      },
    }),

    // Store config
    {
      name: 'deploy-app-state',
      partialize: (state) => ({
        // fields to persist
        chainMetadataOverrides: state.chainMetadataOverrides,
        deployments: state.deployments,
        selectedChain: state.selectedChain,
      }),
      version: PERSIST_STATE_VERSION,
      onRehydrateStorage: () => {
        logger.debug('Rehydrating state');
        return (state, error) => {
          if (error || !state) {
            logger.error('Error during hydration', error);
            return;
          }
          initDeployContext(state).then((context) => {
            state.setDeployContext(context);
            logger.debug('Rehydration complete');
          });
        };
      },
    },
  ),
);

async function initDeployContext({
  registry,
  chainMetadataOverrides,
}: {
  registry: IRegistry;
  chainMetadataOverrides: ChainMap<Partial<ChainMetadata> | undefined>;
}): Promise<DeployContext> {
  let currentRegistry = registry;
  try {
    // Pre-load registry content to avoid repeated requests
    await currentRegistry.listRegistryContent();
  } catch (error) {
    currentRegistry = new PartialRegistry({
      chainAddresses: chainAddresses,
      chainMetadata: registryChainMetadata,
    });
    logger.warn(
      'Failed to list registry content using GithubRegistry, will continue with PartialRegistry.',
      error,
    );
  }

  try {
    // Get all chains from registry
    const allChains = Object.keys(registryChainMetadata);
    const { chainMetadata, chainMetadataWithOverrides } = await assembleChainMetadata(
      allChains,
      currentRegistry,
      chainMetadataOverrides,
    );
    const multiProvider = new MultiProtocolProvider(chainMetadataWithOverrides);

    return {
      registry: currentRegistry,
      chainMetadata,
      multiProvider,
    };
  } catch (error) {
    toast.error('Error initializing deploy context. Please check connection status.');
    logger.error('Error initializing deploy context', error);
    return {
      registry,
      chainMetadata: {},
      multiProvider: new MultiProtocolProvider({}),
    };
  }
}
