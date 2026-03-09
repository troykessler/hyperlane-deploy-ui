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
import type { DeployerAccount } from './deployerAccounts/types';
import {
  encryptPrivateKeys,
  extractPrivateKeys,
  mergePrivateKeys,
  clearPrivateKeys,
} from './deployerAccounts/vaultEncryption';
import type {
  WarpConfig,
  WarpConfigInputMethod,
  WarpDeploymentRecord,
} from './warp/types';

// Initialize AltVM protocols (Cosmos, Radix, Aleo)
initializeAltVMProtocols();

// Increment this when persist state has breaking changes
const PERSIST_STATE_VERSION = 4;

export type DeploymentStatus = 'pending' | 'deploying' | 'success' | 'failed';
export type DeploymentType = 'core' | 'warp' | 'update';

export interface DeploymentRecord {
  id: string;
  chainName: ChainName;
  timestamp: number;
  addresses: DeployedCoreAddresses;
  config: CoreConfig;
  txHashes: string[];
  status: DeploymentStatus;
  type: DeploymentType;
  error?: string;
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

  // Custom chains
  customChains: ChainMap<ChainMetadata>;
  addCustomChain: (chainName: string, metadata: ChainMetadata) => Promise<void>;
  updateCustomChain: (chainName: string, metadata: ChainMetadata) => Promise<void>;
  deleteCustomChain: (chainName: string) => Promise<void>;

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

  // Warp deployment state
  currentWarpConfig: WarpConfig | null;
  setCurrentWarpConfig: (config: WarpConfig | null) => void;
  warpDeployments: WarpDeploymentRecord[];
  addWarpDeployment: (deployment: WarpDeploymentRecord) => void;
  resetWarpDeployments: () => void;
  warpConfigInputMethod: WarpConfigInputMethod;
  setWarpConfigInputMethod: (method: WarpConfigInputMethod) => void;
  warpMultiChainConfigs: Record<ChainName, WarpConfig>;
  setWarpChainConfig: (chain: ChainName, config: WarpConfig) => void;
  clearWarpMultiChainConfigs: () => void;

  // Deployer accounts state
  deployerAccounts: DeployerAccount[];
  addDeployerAccount: (account: DeployerAccount) => void;
  deleteDeployerAccount: (accountId: string) => void;
  clearAllDeployerAccounts: () => void;
  useDeployerAccounts: boolean;
  setUseDeployerAccounts: (use: boolean) => void;
  selectedDeployerAccountId: string | null;
  setSelectedDeployerAccountId: (accountId: string | null) => void;

  // Vault protection state
  vaultPinHash: string | null;
  encryptedVault: string | null;
  vaultUnlocked: boolean;
  vaultPin: string | null; // Stored in memory only while unlocked (never persisted)
  setVaultPin: (pinHash: string, encryptedVault: string, pin: string) => Promise<void>;
  unlockVault: (decryptedPrivateKeys: Record<string, string>, pin: string) => void;
  lockVault: () => Promise<void>;
  hasVaultPin: () => boolean;

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
          customChains: get().customChains,
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

      // Custom chains
      customChains: {},
      addCustomChain: async (chainName, metadata) => {
        logger.debug('Adding custom chain', { chainName });
        const state = get();
        const newCustomChains = { ...state.customChains, [chainName]: metadata };

        // Re-initialize deploy context to include new chain
        const context = await initDeployContext({
          registry: state.registry,
          chainMetadataOverrides: state.chainMetadataOverrides,
          customChains: newCustomChains,
        });

        // Only update state after multiProvider is ready
        set({
          ...context,
          customChains: newCustomChains,
        });
      },
      updateCustomChain: async (chainName, metadata) => {
        logger.debug('Updating custom chain', { chainName });
        const state = get();
        const updatedCustomChains = { ...state.customChains, [chainName]: metadata };

        // Re-initialize deploy context with updated chain
        const context = await initDeployContext({
          registry: state.registry,
          chainMetadataOverrides: state.chainMetadataOverrides,
          customChains: updatedCustomChains,
        });

        // Only update state after multiProvider is ready
        set({
          ...context,
          customChains: updatedCustomChains,
        });
      },
      deleteCustomChain: async (chainName) => {
        logger.debug('Deleting custom chain', { chainName });
        const state = get();
        const { [chainName]: _, ...remainingCustomChains } = state.customChains;

        // Re-initialize deploy context without deleted chain
        const context = await initDeployContext({
          registry: state.registry,
          chainMetadataOverrides: state.chainMetadataOverrides,
          customChains: remainingCustomChains,
        });

        // Only update state after multiProvider is ready
        set({
          ...context,
          customChains: remainingCustomChains,
        });
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

      // Warp deployment state
      currentWarpConfig: null,
      setCurrentWarpConfig: (currentWarpConfig) => {
        set(() => ({ currentWarpConfig }));
      },
      warpDeployments: [],
      addWarpDeployment: (deployment) => {
        set((state) => ({ warpDeployments: [...state.warpDeployments, deployment] }));
      },
      resetWarpDeployments: () => {
        set(() => ({ warpDeployments: [] }));
      },
      warpConfigInputMethod: 'builder',
      setWarpConfigInputMethod: (warpConfigInputMethod) => {
        set(() => ({ warpConfigInputMethod }));
      },
      warpMultiChainConfigs: {},
      setWarpChainConfig: (chain, config) => {
        set((state) => ({
          warpMultiChainConfigs: {
            ...state.warpMultiChainConfigs,
            [chain]: config,
          },
        }));
      },
      clearWarpMultiChainConfigs: () => {
        set(() => ({ warpMultiChainConfigs: {} }));
      },

      // Deployer accounts state
      deployerAccounts: [],
      addDeployerAccount: async (account) => {
        const state = get();
        console.log('[addDeployerAccount] Adding account:', {
          id: account.id,
          protocol: account.protocol,
          hasPrivateKey: !!account.privateKey,
          privateKeyLength: account.privateKey?.length,
          hasVault: !!state.vaultPinHash,
          vaultUnlocked: !!state.vaultPin,
        });

        // If vault exists, store account WITH private key (vault unlocked) and update encrypted vault
        if (state.vaultPinHash && state.vaultPin) {
          // When vault is unlocked, store account WITH private key in memory
          const newAccounts = [...state.deployerAccounts, account];

          // Extract all private keys and add the new one
          const privateKeys = extractPrivateKeys(state.deployerAccounts);
          privateKeys[account.id] = account.privateKey;

          console.log('[addDeployerAccount] Encrypting private keys:', Object.keys(privateKeys));

          // Re-encrypt private keys
          const encrypted = await encryptPrivateKeys(privateKeys, state.vaultPin);

          set(() => ({
            deployerAccounts: newAccounts,
            encryptedVault: encrypted,
          }));

          console.log('[addDeployerAccount] Account stored with vault. Total accounts:', newAccounts.length);
        } else {
          // No vault - store account with private key
          set(() => ({
            deployerAccounts: [...state.deployerAccounts, account],
          }));

          console.log('[addDeployerAccount] Account stored without vault');
        }
      },
      deleteDeployerAccount: async (accountId) => {
        const state = get();
        const newAccounts = state.deployerAccounts.filter((a) => a.id !== accountId);

        // If vault exists, also remove from encrypted vault
        if (state.vaultPinHash && state.vaultPin) {
          const privateKeys = extractPrivateKeys(state.deployerAccounts);
          delete privateKeys[accountId]; // Remove deleted account's key

          const encrypted = await encryptPrivateKeys(privateKeys, state.vaultPin);

          set(() => ({
            deployerAccounts: newAccounts,
            encryptedVault: encrypted,
            selectedDeployerAccountId:
              state.selectedDeployerAccountId === accountId ? null : state.selectedDeployerAccountId,
          }));
        } else {
          set(() => ({
            deployerAccounts: newAccounts,
            selectedDeployerAccountId:
              state.selectedDeployerAccountId === accountId ? null : state.selectedDeployerAccountId,
          }));
        }
      },
      clearAllDeployerAccounts: () => {
        set(() => ({
          deployerAccounts: [],
          selectedDeployerAccountId: null,
        }));
      },
      useDeployerAccounts: false,
      setUseDeployerAccounts: (use) => {
        set(() => ({ useDeployerAccounts: use }));
      },
      selectedDeployerAccountId: null,
      setSelectedDeployerAccountId: (accountId) => {
        set(() => ({ selectedDeployerAccountId: accountId }));
      },

      // Vault protection state
      vaultPinHash: null,
      encryptedVault: null,
      vaultUnlocked: false,
      vaultPin: null,
      setVaultPin: async (pinHash, encryptedVault, pin) => {
        set(() => ({
          vaultPinHash: pinHash,
          encryptedVault,
          vaultUnlocked: true,
          vaultPin: pin, // Store PIN in memory while unlocked
        }));
      },
      unlockVault: (decryptedPrivateKeys, pin) => {
        const state = get();

        console.log('[unlockVault] Decrypted private keys:', {
          keyCount: Object.keys(decryptedPrivateKeys).length,
          accountIds: Object.keys(decryptedPrivateKeys),
          existingAccountIds: state.deployerAccounts.map(a => a.id),
        });

        // Merge decrypted private keys into existing account metadata
        const accountsWithKeys = mergePrivateKeys(state.deployerAccounts, decryptedPrivateKeys);

        console.log('[unlockVault] Accounts after merge:', accountsWithKeys.map(a => ({
          id: a.id,
          protocol: a.protocol,
          hasKey: !!a.privateKey,
          keyLength: a.privateKey?.length,
        })));

        set(() => ({
          vaultUnlocked: true,
          vaultPin: pin, // Store PIN in memory while unlocked
          deployerAccounts: accountsWithKeys,
        }));
      },
      lockVault: async () => {
        const state = get();
        // Extract and encrypt private keys before locking
        const privateKeys = extractPrivateKeys(state.deployerAccounts);
        const encrypted = state.vaultPin
          ? await encryptPrivateKeys(privateKeys, state.vaultPin)
          : state.encryptedVault;
        const accountsWithoutKeys = clearPrivateKeys(state.deployerAccounts);

        set(() => ({
          vaultUnlocked: false,
          vaultPin: null, // Clear PIN from memory
          encryptedVault: encrypted,
          deployerAccounts: accountsWithoutKeys,
          selectedDeployerAccountId: null,
        }));
      },
      hasVaultPin: () => {
        return get().vaultPinHash !== null;
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
        customChains: state.customChains,
        deployments: state.deployments,
        selectedChain: state.selectedChain,
        warpDeployments: state.warpDeployments,
        // Clear private keys from accounts if vault exists (they're stored encrypted)
        // Keep private keys if no vault (plaintext mode)
        deployerAccounts: state.vaultPinHash
          ? state.deployerAccounts.map((acc) => ({ ...acc, privateKey: '' }))
          : state.deployerAccounts,
        useDeployerAccounts: state.useDeployerAccounts,
        selectedDeployerAccountId: state.selectedDeployerAccountId,
        vaultPinHash: state.vaultPinHash,
        encryptedVault: state.encryptedVault,
        // Always rehydrate as locked for security
        vaultUnlocked: false,
      }),
      version: PERSIST_STATE_VERSION,
      onRehydrateStorage: () => {
        logger.debug('Rehydrating state');
        return (state, error) => {
          if (error || !state) {
            logger.error('Error during hydration', error);
            return;
          }

          // Security: Ensure vault is locked on rehydration
          if (state.vaultPinHash) {
            state.vaultUnlocked = false;
            state.vaultPin = null; // Clear PIN from memory
            // deployerAccounts already persisted without private keys
            logger.debug('Vault locked on rehydration');
          }

          initDeployContext({
            registry: state.registry,
            chainMetadataOverrides: state.chainMetadataOverrides,
            customChains: state.customChains || {},
          }).then((context) => {
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
  customChains = {},
}: {
  registry: IRegistry;
  chainMetadataOverrides: ChainMap<Partial<ChainMetadata> | undefined>;
  customChains?: ChainMap<ChainMetadata>;
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

    // Merge custom chains with registry chains
    const mergedChainMetadata = {
      ...chainMetadata,
      ...customChains,
    };

    const mergedChainMetadataWithOverrides = {
      ...chainMetadataWithOverrides,
      ...customChains,
    };

    const multiProvider = new MultiProtocolProvider(mergedChainMetadataWithOverrides);

    return {
      registry: currentRegistry,
      chainMetadata: mergedChainMetadata,
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
