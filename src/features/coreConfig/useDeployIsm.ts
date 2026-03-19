import { useCallback } from 'react';
import { ChainName, EvmIsmModule, MultiProvider, ProxyFactoryFactoriesAddresses } from '@hyperlane-xyz/sdk';
import { IsmConfig } from '@hyperlane-xyz/provider-sdk/ism';
import { logger } from '../../utils/logger';

/**
 * Hook for deploying ISM configurations using SDK modules
 */
export function useDeployIsm() {
  const deployIsm = useCallback(
    async (
      chainName: ChainName,
      ismConfig: IsmConfig,
      mailboxAddress: string,
      factories: ProxyFactoryFactoriesAddresses,
      evmMultiProvider: MultiProvider
    ): Promise<string> => {
      logger.debug('Deploying ISM configuration', { chainName, ismConfig, mailboxAddress });

      const ismModule = await EvmIsmModule.create({
        chain: chainName,
        config: ismConfig,
        proxyFactoryFactories: factories,
        mailbox: mailboxAddress,
        multiProvider: evmMultiProvider,
      });

      const serialized = ismModule.serialize();
      const ismAddress = serialized.deployedIsm;

      if (!ismAddress) {
        throw new Error('ISM deployment failed - no address returned');
      }

      logger.debug('ISM deployed successfully', { chainName, ismAddress });
      return ismAddress;
    },
    []
  );

  return { deployIsm };
}
