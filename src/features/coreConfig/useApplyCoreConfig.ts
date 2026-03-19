import { useState, useCallback } from 'react';
import { ChainName } from '@hyperlane-xyz/sdk';
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

interface ApplyProgress {
  status: 'idle' | 'validating' | 'applying' | 'success' | 'error';
  message: string;
  error?: string;
}

export function useApplyCoreConfig() {
  const [progress, setProgress] = useState<ApplyProgress>({
    status: 'idle',
    message: '',
  });
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
      deployerPrivateKey?: string
    ): Promise<boolean> => {
      try {
        setProgress({
          status: 'validating',
          message: 'Validating new configuration...',
        });

        const chainMetadata = multiProvider.tryGetChainMetadata(chainName);
        if (!chainMetadata) {
          throw new Error(`Chain metadata not found for ${chainName}`);
        }

        setProgress({
          status: 'applying',
          message: 'Applying configuration updates...',
        });

        if (!mailboxAddress) {
          throw new Error('Mailbox address is required for updates. Please provide the mailbox address.');
        }

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

  return {
    applyConfig,
    progress,
    reset,
    isApplying: progress.status === 'applying' || progress.status === 'validating',
  };
}
