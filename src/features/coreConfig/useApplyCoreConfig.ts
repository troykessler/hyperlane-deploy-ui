import { useState, useCallback } from 'react';
import { ChainName, EvmCoreModule } from '@hyperlane-xyz/sdk';
import { chainAddresses } from '@hyperlane-xyz/registry';
import { CoreConfig } from '@hyperlane-xyz/provider-sdk/core';
import { ProtocolType } from '@hyperlane-xyz/utils';
import { useMultiProvider } from '../chains/hooks';
import { useDeployFactories } from './useDeployFactories';
import { useDeployIsm } from './useDeployIsm';
import { useDeployHook } from './useDeployHook';
import {
  createAltVMSigner,
  createEvmSigner,
  createEvmSignerFromPrivateKey,
  createCosmosSignerFromPrivateKey,
  createRadixSignerFromPrivateKey,
  createAleoSignerFromPrivateKey
} from '../../utils/signerAdapters';
import { logger } from '../../utils/logger';
import { isEvmChain } from '../../utils/protocolUtils';
import type { SafeTransactionBatch } from '../warp/types';
import { convertToSafeBatch } from '../warp/safeBatchConverter';

interface ApplyProgress {
  status: 'idle' | 'validating' | 'applying' | 'success' | 'error';
  message: string;
  error?: string;
}

type CoreApplyExecutionMode = 'direct' | 'multisig';

interface ApplyOptions {
  executionMode?: CoreApplyExecutionMode;
}

export function useApplyCoreConfig() {
  const [progress, setProgress] = useState<ApplyProgress>({
    status: 'idle',
    message: '',
  });
  const [generatedBatch, setGeneratedBatch] = useState<SafeTransactionBatch | null>(null);
  const multiProvider = useMultiProvider();
  const { deployFactories } = useDeployFactories();
  const { deployIsm } = useDeployIsm();
  const { deployHook } = useDeployHook();

  const applyConfig = useCallback(
    async (
      chainName: ChainName,
      newConfig: CoreConfig,
      walletClient: any,
      mailboxAddress?: string,
      deployerPrivateKey?: string,
      options?: ApplyOptions,
      currentConfig?: CoreConfig
    ): Promise<boolean> => {
      const mode = options?.executionMode || 'direct';
      try {
        setProgress({
          status: 'validating',
          message: 'Validating new configuration...',
        });

        const chainMetadata = multiProvider.tryGetChainMetadata(chainName);
        if (!chainMetadata) {
          throw new Error(`Chain metadata not found for ${chainName}`);
        }

        if (!mailboxAddress) {
          throw new Error('Mailbox address is required for updates. Please provide the mailbox address.');
        }

        // MULTISIG MODE: Generate transactions without executing
        if (mode === 'multisig') {
          // EVM-only check
          if (!isEvmChain(chainMetadata)) {
            throw new Error('Multisig mode only supports EVM chains. AltVM support coming soon.');
          }

          // Check for NEW object configs (not supported in multisig mode)
          // Allow object configs if they match currentConfig (user didn't change them)
          if (typeof newConfig.defaultIsm === 'object') {
            if (!currentConfig || newConfig.defaultIsm !== currentConfig.defaultIsm) {
              throw new Error('Multisig mode does not support ISM deployment. Please deploy the ISM first and use its address.');
            }
          }
          if (typeof newConfig.defaultHook === 'object') {
            if (!currentConfig || newConfig.defaultHook !== currentConfig.defaultHook) {
              throw new Error('Multisig mode does not support hook deployment. Please deploy the hook first and use its address.');
            }
          }
          if (typeof newConfig.requiredHook === 'object') {
            if (!currentConfig || newConfig.requiredHook !== currentConfig.requiredHook) {
              throw new Error('Multisig mode does not support hook deployment. Please deploy the hook first and use its address.');
            }
          }

          setProgress({
            status: 'applying',
            message: 'Generating transactions...',
          });

          logger.debug('Generating transactions for multisig core update', { chainName, mailboxAddress });

          // Use SDK to generate transactions (returns AnnotatedEV5Transaction[])
          const evmMultiProvider = multiProvider.toMultiProvider();

          // Get addresses: prioritize currentConfig (from read), fallback to registry, then zero addresses
          const registryAddresses = chainAddresses[chainName];
          const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

          const getAddress = (field: keyof typeof registryAddresses): string => {
            // First try currentConfig (from read operation)
            if (currentConfig && (currentConfig as any)[field]) {
              return (currentConfig as any)[field];
            }
            // Then try registry
            if (registryAddresses?.[field]) {
              return registryAddresses[field] as string;
            }
            // Finally fall back to zero address
            return ZERO_ADDRESS;
          };

          logger.debug('Using addresses for core module', {
            chainName,
            source: currentConfig ? 'read config' : registryAddresses ? 'registry' : 'zero addresses',
            hasProxyAdmin: !!getAddress('proxyAdmin') && getAddress('proxyAdmin') !== ZERO_ADDRESS,
            hasValidatorAnnounce: !!getAddress('validatorAnnounce') && getAddress('validatorAnnounce') !== ZERO_ADDRESS
          });

          // For updates, use addresses from currentConfig -> registry -> zero addresses
          const module = new EvmCoreModule(evmMultiProvider, {
            chain: chainName,
            config: newConfig as any,
            addresses: {
              mailbox: mailboxAddress,
              proxyAdmin: getAddress('proxyAdmin'),
              validatorAnnounce: getAddress('validatorAnnounce'),
              interchainAccountRouter: getAddress('interchainAccountRouter'),
              testRecipient: getAddress('testRecipient'),
              staticMerkleRootMultisigIsmFactory: getAddress('staticMerkleRootMultisigIsmFactory'),
              staticMessageIdMultisigIsmFactory: getAddress('staticMessageIdMultisigIsmFactory'),
              staticAggregationIsmFactory: getAddress('staticAggregationIsmFactory'),
              staticAggregationHookFactory: getAddress('staticAggregationHookFactory'),
              domainRoutingIsmFactory: getAddress('domainRoutingIsmFactory'),
              staticMerkleRootWeightedMultisigIsmFactory: getAddress('staticMerkleRootWeightedMultisigIsmFactory'),
              staticMessageIdWeightedMultisigIsmFactory: getAddress('staticMessageIdWeightedMultisigIsmFactory'),
            },
          });

          // SDK's update() returns the transactions it would execute
          const transactions = await module.update(newConfig as any);

          logger.debug('SDK generated transactions', { chainName, txCount: transactions.length });

          if (transactions.length === 0) {
            throw new Error('No configuration changes detected. Current config matches new config.');
          }

          // Convert to Safe format
          const batch = convertToSafeBatch(
            transactions,
            Number(chainMetadata.chainId!),
            chainName
          );

          setGeneratedBatch(batch);
          setProgress({
            status: 'success',
            message: `Generated ${transactions.length} transaction(s)`,
          });

          logger.debug('Transactions generated successfully', {
            chainName,
            txCount: transactions.length
          });

          return true;
        }

        // DIRECT MODE: Execute immediately (existing behavior)
        setProgress({
          status: 'applying',
          message: 'Applying configuration updates...',
        });

        logger.debug('Applying core config update', {
          chainName,
          mailboxAddress,
          newConfig,
          defaultIsmType: typeof newConfig.defaultIsm,
          defaultHookType: typeof newConfig.defaultHook,
          requiredHookType: typeof newConfig.requiredHook,
        });

        let txCount = 0;

        if (isEvmChain(chainMetadata)) {
          // EVM chain: Call mailbox contract methods directly
          const evmMultiProvider = multiProvider.toMultiProvider();

          // Create signer from private key or wallet client
          let signer;
          if (deployerPrivateKey) {
            signer = await createEvmSignerFromPrivateKey(deployerPrivateKey, chainMetadata);
            evmMultiProvider.setSharedSigner(signer);
            logger.debug('Using deployer account signer for config update');
          } else if (walletClient) {
            signer = await createEvmSigner(walletClient, chainMetadata);
            evmMultiProvider.setSharedSigner(signer);
            logger.debug('Using connected wallet signer for config update');
          } else {
            throw new Error('No signer available - connect wallet or select deployer account');
          }

          logger.debug('Updating EVM mailbox config', { chainName, mailboxAddress });

          // Get mailbox contract instance
          const { Contract } = await import('ethers');
          const mailboxAbi = [
            'function defaultIsm() view returns (address)',
            'function defaultHook() view returns (address)',
            'function requiredHook() view returns (address)',
            'function owner() view returns (address)',
            'function setDefaultIsm(address _module) external',
            'function setDefaultHook(address _hook) external',
            'function setRequiredHook(address _hook) external',
            'function transferOwnership(address newOwner) external',
          ];
          const mailbox = new Contract(mailboxAddress, mailboxAbi, signer);

          // Read current config
          const [currentIsm, currentDefaultHook, currentRequiredHook, currentOwner] =
            await Promise.all([
              mailbox.defaultIsm(),
              mailbox.defaultHook(),
              mailbox.requiredHook(),
              mailbox.owner(),
            ]);

          logger.debug('Current mailbox state', {
            currentIsm,
            currentDefaultHook,
            currentRequiredHook,
            currentOwner,
          });

          // Update defaultIsm if changed
          if (newConfig.defaultIsm) {
            if (typeof newConfig.defaultIsm === 'string') {
              const newIsm = newConfig.defaultIsm.toLowerCase();
              if (newIsm !== currentIsm.toLowerCase()) {
                logger.debug('Updating default ISM with address', { from: currentIsm, to: newIsm });
                const tx = await mailbox.setDefaultIsm(newConfig.defaultIsm);
                await tx.wait();
                logger.debug('Default ISM updated', { txHash: tx.hash });
                txCount++;
              }
            } else if (typeof newConfig.defaultIsm === 'object') {
              // ISM is a config object that needs deployment
              logger.debug('ISM is a config object, needs deployment', { config: newConfig.defaultIsm });

              try {
                // Deploy factories (registry → cache → deploy)
                setProgress({
                  status: 'applying',
                  message: 'Deploying factory contracts...',
                });
                const factories = await deployFactories(chainName, evmMultiProvider);

                // Deploy ISM using SDK module
                setProgress({
                  status: 'applying',
                  message: 'Deploying ISM configuration...',
                });
                const deployedIsmAddress = await deployIsm(
                  chainName,
                  newConfig.defaultIsm,
                  mailboxAddress,
                  factories,
                  evmMultiProvider
                );

                logger.debug('ISM deployed successfully', { address: deployedIsmAddress });

                // Update mailbox to use the newly deployed ISM
                if (deployedIsmAddress.toLowerCase() !== currentIsm.toLowerCase()) {
                  setProgress({
                    status: 'applying',
                    message: 'Setting default ISM on mailbox...',
                  });
                  logger.debug('Setting deployed ISM as default on mailbox', {
                    address: deployedIsmAddress,
                  });
                  const tx = await mailbox.setDefaultIsm(deployedIsmAddress);
                  await tx.wait();
                  logger.debug('Default ISM updated with deployed address', { txHash: tx.hash });
                  txCount++;
                }
              } catch (deployError) {
                logger.error('Failed to deploy ISM config', deployError);
                throw new Error(
                  `Failed to deploy ISM configuration: ${deployError instanceof Error ? deployError.message : 'Unknown error'}. ` +
                  `Try using "Use existing address" mode to reference a pre-deployed ISM instead.`
                );
              }
            }
          }

          // Update defaultHook if changed
          if (newConfig.defaultHook) {
            if (typeof newConfig.defaultHook === 'string') {
              const newHook = newConfig.defaultHook.toLowerCase();
              if (newHook !== currentDefaultHook.toLowerCase()) {
                logger.debug('Updating default hook', { from: currentDefaultHook, to: newHook });
                const tx = await mailbox.setDefaultHook(newConfig.defaultHook);
                await tx.wait();
                logger.debug('Default hook updated', { txHash: tx.hash });
                txCount++;
              }
            } else if (typeof newConfig.defaultHook === 'object') {
              // Hook is a config object that needs deployment
              logger.debug('Default hook is a config object, needs deployment', { config: newConfig.defaultHook });

              try {
                // Deploy factories (registry → cache → deploy)
                setProgress({
                  status: 'applying',
                  message: 'Deploying factory contracts...',
                });
                const factories = await deployFactories(chainName, evmMultiProvider);

                // Deploy hook using SDK module
                setProgress({
                  status: 'applying',
                  message: 'Deploying default hook configuration...',
                });
                const deployedHookAddress = await deployHook(
                  chainName,
                  newConfig.defaultHook,
                  { mailbox: mailboxAddress, proxyAdmin: currentOwner },
                  factories,
                  evmMultiProvider
                );

                logger.debug('Default hook deployed successfully', { address: deployedHookAddress });

                // Update mailbox to use the newly deployed hook
                if (deployedHookAddress.toLowerCase() !== currentDefaultHook.toLowerCase()) {
                  setProgress({
                    status: 'applying',
                    message: 'Setting default hook on mailbox...',
                  });
                  logger.debug('Setting deployed hook as default on mailbox', {
                    address: deployedHookAddress,
                  });
                  const tx = await mailbox.setDefaultHook(deployedHookAddress);
                  await tx.wait();
                  logger.debug('Default hook updated with deployed address', { txHash: tx.hash });
                  txCount++;
                }
              } catch (deployError) {
                logger.error('Failed to deploy default hook config', deployError);
                throw new Error(
                  `Failed to deploy default hook configuration: ${deployError instanceof Error ? deployError.message : 'Unknown error'}. ` +
                  `Try using "Use existing address" mode to reference a pre-deployed hook instead.`
                );
              }
            }
          }

          // Update requiredHook if changed
          if (newConfig.requiredHook) {
            if (typeof newConfig.requiredHook === 'string') {
              const newHook = newConfig.requiredHook.toLowerCase();
              if (newHook !== currentRequiredHook.toLowerCase()) {
                logger.debug('Updating required hook', { from: currentRequiredHook, to: newHook });
                const tx = await mailbox.setRequiredHook(newConfig.requiredHook);
                await tx.wait();
                logger.debug('Required hook updated', { txHash: tx.hash });
                txCount++;
              }
            } else if (typeof newConfig.requiredHook === 'object') {
              // Hook is a config object that needs deployment
              logger.debug('Required hook is a config object, needs deployment', { config: newConfig.requiredHook });

              try {
                // Deploy factories (registry → cache → deploy)
                setProgress({
                  status: 'applying',
                  message: 'Deploying factory contracts...',
                });
                const factories = await deployFactories(chainName, evmMultiProvider);

                // Deploy hook using SDK module
                setProgress({
                  status: 'applying',
                  message: 'Deploying required hook configuration...',
                });
                const deployedHookAddress = await deployHook(
                  chainName,
                  newConfig.requiredHook,
                  { mailbox: mailboxAddress, proxyAdmin: currentOwner },
                  factories,
                  evmMultiProvider
                );

                logger.debug('Required hook deployed successfully', { address: deployedHookAddress });

                // Update mailbox to use the newly deployed hook
                if (deployedHookAddress.toLowerCase() !== currentRequiredHook.toLowerCase()) {
                  setProgress({
                    status: 'applying',
                    message: 'Setting required hook on mailbox...',
                  });
                  logger.debug('Setting deployed hook as required on mailbox', {
                    address: deployedHookAddress,
                  });
                  const tx = await mailbox.setRequiredHook(deployedHookAddress);
                  await tx.wait();
                  logger.debug('Required hook updated with deployed address', { txHash: tx.hash });
                  txCount++;
                }
              } catch (deployError) {
                logger.error('Failed to deploy required hook config', deployError);
                throw new Error(
                  `Failed to deploy required hook configuration: ${deployError instanceof Error ? deployError.message : 'Unknown error'}. ` +
                  `Try using "Use existing address" mode to reference a pre-deployed hook instead.`
                );
              }
            }
          }

          // Update owner if changed
          if (newConfig.owner && newConfig.owner.toLowerCase() !== currentOwner.toLowerCase()) {
            logger.debug('Transferring ownership', { from: currentOwner, to: newConfig.owner });
            const tx = await mailbox.transferOwnership(newConfig.owner);
            await tx.wait();
            logger.debug('Ownership transferred', { txHash: tx.hash });
            txCount++;
          }
        } else {
          // AltVM chain: Call update methods via signer
          logger.debug('Creating AltVM signer', { chainName });

          // Create signer from private key or wallet client
          let signer;
          if (deployerPrivateKey) {
            // Use deployer account
            switch (chainMetadata.protocol) {
              case ProtocolType.CosmosNative:
                signer = await createCosmosSignerFromPrivateKey(deployerPrivateKey, chainMetadata);
                logger.debug('Using Cosmos deployer account signer for config update');
                break;
              case ProtocolType.Radix:
                signer = await createRadixSignerFromPrivateKey(deployerPrivateKey, chainMetadata);
                logger.debug('Using Radix deployer account signer for config update');
                break;
              case ProtocolType.Aleo:
                signer = await createAleoSignerFromPrivateKey(deployerPrivateKey, chainMetadata);
                logger.debug('Using Aleo deployer account signer for config update');
                break;
              default:
                throw new Error(`Deployer accounts not yet supported for ${chainMetadata.protocol}`);
            }
          } else if (walletClient) {
            // Use connected wallet
            signer = await createAltVMSigner(chainMetadata, walletClient);
            logger.debug('Using connected wallet signer for config update');
          } else {
            throw new Error('No signer available - connect wallet or select deployer account');
          }

          logger.debug('Updating AltVM mailbox config', { chainName, mailboxAddress });

          // Update ISM if changed
          if (newConfig.defaultIsm) {
            if (typeof newConfig.defaultIsm === 'string') {
              logger.debug('Updating default ISM with address', { ism: newConfig.defaultIsm });
              try {
                if (typeof signer.setDefaultIsm === 'function') {
                  await signer.setDefaultIsm({
                    mailboxAddress,
                    ismAddress: newConfig.defaultIsm,
                  });
                  txCount++;
                } else {
                  logger.warn('setDefaultIsm not available on signer');
                }
              } catch (error) {
                logger.error('Failed to update default ISM', error);
                throw error;
              }
            } else if (typeof newConfig.defaultIsm === 'object') {
              // ISM is a config object that needs deployment
              logger.debug('ISM is a config object, attempting to deploy', { config: newConfig.defaultIsm });
              try {
                if (typeof signer.deployAndSetIsm === 'function') {
                  await signer.deployAndSetIsm({
                    mailboxAddress,
                    ismConfig: newConfig.defaultIsm,
                  });
                  txCount++;
                } else {
                  throw new Error(
                    'Cannot deploy ISM config objects on this chain yet. ' +
                    'Please deploy the ISM separately and use its address instead. ' +
                    'Toggle "Use existing address" in the ISM form and enter the deployed ISM address.'
                  );
                }
              } catch (error) {
                logger.error('Failed to deploy and set ISM', error);
                throw error;
              }
            }
          }

          // Update default hook if changed and is an address
          if (typeof newConfig.defaultHook === 'string') {
            logger.debug('Updating default hook', { hook: newConfig.defaultHook });
            try {
              if (typeof signer.setDefaultHook === 'function') {
                await signer.setDefaultHook({
                  mailboxAddress,
                  hookAddress: newConfig.defaultHook,
                });
                txCount++;
              } else {
                logger.warn('setDefaultHook not available on signer');
              }
            } catch (error) {
              logger.error('Failed to update default hook', error);
              throw error;
            }
          }

          // Update required hook if changed and is an address
          if (typeof newConfig.requiredHook === 'string') {
            logger.debug('Updating required hook', { hook: newConfig.requiredHook });
            try {
              if (typeof signer.setRequiredHook === 'function') {
                await signer.setRequiredHook({
                  mailboxAddress,
                  hookAddress: newConfig.requiredHook,
                });
                txCount++;
              } else {
                logger.warn('setRequiredHook not available on signer');
              }
            } catch (error) {
              logger.error('Failed to update required hook', error);
              throw error;
            }
          }

          // Update owner if changed
          if (newConfig.owner) {
            logger.debug('Transferring ownership', { owner: newConfig.owner });
            try {
              if (typeof signer.transferOwnership === 'function') {
                await signer.transferOwnership({
                  mailboxAddress,
                  newOwner: newConfig.owner,
                });
                txCount++;
              } else {
                logger.warn('transferOwnership not available on signer - skipping ownership transfer');
              }
            } catch (error) {
              logger.error('Failed to transfer ownership', error);
              throw error;
            }
          }
        }

        logger.debug('Config update successful', { chainName, txCount });

        setProgress({
          status: 'success',
          message: `Successfully applied ${txCount} transaction(s)`,
        });

        return true;
      } catch (error) {
        logger.error('Failed to apply config update', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        setProgress({
          status: 'error',
          message: 'Failed to apply configuration',
          error: errorMessage,
        });

        return false;
      }
    },
    [multiProvider, deployFactories, deployIsm, deployHook]
  );

  const reset = useCallback(() => {
    setProgress({
      status: 'idle',
      message: '',
    });
  }, []);

  const clearBatch = useCallback(() => {
    setGeneratedBatch(null);
  }, []);

  return {
    applyConfig,
    progress,
    reset,
    isApplying: progress.status === 'applying' || progress.status === 'validating',
    generatedBatch,
    clearBatch,
  };
}
