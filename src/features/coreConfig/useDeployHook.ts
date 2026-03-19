import { useCallback } from 'react';
import { ChainName, EvmHookModule, MultiProvider, ProxyFactoryFactoriesAddresses } from '@hyperlane-xyz/sdk';
import { HookConfig } from '@hyperlane-xyz/provider-sdk/hook';
import { logger } from '../../utils/logger';

interface CoreAddresses {
  mailbox: string;
  proxyAdmin: string;
}

/**
 * Hook for deploying Hook configurations using SDK modules
 */
export function useDeployHook() {
  const deployHook = useCallback(
    async (
      chainName: ChainName,
      hookConfig: HookConfig,
      coreAddresses: CoreAddresses,
      factories: ProxyFactoryFactoriesAddresses,
      evmMultiProvider: MultiProvider
    ): Promise<string> => {
      logger.debug('Deploying hook configuration', { chainName, hookConfig, coreAddresses });

      const hookModule = await EvmHookModule.create({
        chain: chainName,
        config: hookConfig,
        proxyFactoryFactories: factories,
        coreAddresses,
        multiProvider: evmMultiProvider,
      });

      const serialized = hookModule.serialize();
      const hookAddress = serialized.deployedHook;

      if (!hookAddress) {
        throw new Error('Hook deployment failed - no address returned');
      }

      logger.debug('Hook deployed successfully', { chainName, hookAddress });
      return hookAddress;
    },
    []
  );

  return { deployHook };
}
