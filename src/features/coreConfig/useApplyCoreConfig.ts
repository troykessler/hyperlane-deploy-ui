import { useState, useCallback } from 'react';
import { ChainName, EvmCoreModule } from '@hyperlane-xyz/sdk';
import { CoreConfig } from '@hyperlane-xyz/provider-sdk/core';
import { AltVMCoreModule } from '@hyperlane-xyz/deploy-sdk';
import { useMultiProvider } from '../chains/hooks';
import { createChainLookup } from '../../utils/chainLookup';
import { createAltVMSigner, createEvmSigner, createEvmSignerFromPrivateKey } from '../../utils/signerAdapters';
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
            logger.debug('Using deployer account signer for config update');
          } else if (walletClient) {
            signer = await createEvmSigner(walletClient, chainMetadata);
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
              logger.debug('ISM is a config object, needs deployment first', { config: newConfig.defaultIsm });
              throw new Error(
                'Cannot deploy ISM config objects directly yet. ' +
                'Please deploy the ISM separately and use its address instead. ' +
                'In the form, toggle "Use existing address" and enter the deployed ISM address.'
              );
            }
          }

          // Update defaultHook if changed
          if (typeof newConfig.defaultHook === 'string') {
            const newHook = newConfig.defaultHook.toLowerCase();
            if (newHook !== currentDefaultHook.toLowerCase()) {
              logger.debug('Updating default hook', { from: currentDefaultHook, to: newHook });
              const tx = await mailbox.setDefaultHook(newConfig.defaultHook);
              await tx.wait();
              logger.debug('Default hook updated', { txHash: tx.hash });
              txCount++;
            }
          }

          // Update requiredHook if changed
          if (typeof newConfig.requiredHook === 'string') {
            const newHook = newConfig.requiredHook.toLowerCase();
            if (newHook !== currentRequiredHook.toLowerCase()) {
              logger.debug('Updating required hook', { from: currentRequiredHook, to: newHook });
              const tx = await mailbox.setRequiredHook(newConfig.requiredHook);
              await tx.wait();
              logger.debug('Required hook updated', { txHash: tx.hash });
              txCount++;
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
          const signer = await createAltVMSigner(chainMetadata, walletClient);

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
    [multiProvider]
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
