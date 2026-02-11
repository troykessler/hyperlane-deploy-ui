import { useState, useCallback } from 'react';
import { ChainName } from '@hyperlane-xyz/sdk';
import { chainAddresses } from '@hyperlane-xyz/registry';
import { CoreConfig } from '@hyperlane-xyz/provider-sdk/core';
import { AltVMCoreReader } from '@hyperlane-xyz/deploy-sdk';
import { getProtocolProvider } from '@hyperlane-xyz/provider-sdk';
import { useMultiProvider } from '../chains/hooks';
import { createChainLookup } from '../../utils/chainLookup';
import { logger } from '../../utils/logger';

interface ReadProgress {
  status: 'idle' | 'reading' | 'success' | 'error';
  message: string;
  error?: string;
}

export function useReadCoreConfig() {
  const [progress, setProgress] = useState<ReadProgress>({
    status: 'idle',
    message: '',
  });
  const [currentConfig, setCurrentConfig] = useState<CoreConfig | null>(null);
  const multiProvider = useMultiProvider();

  const readConfig = useCallback(
    async (chainName: ChainName, mailboxAddressOverride?: string): Promise<CoreConfig | null> => {
      try {
        setProgress({
          status: 'reading',
          message: 'Reading current core configuration...',
        });

        const chainMetadata = multiProvider.tryGetChainMetadata(chainName);
        if (!chainMetadata) {
          throw new Error(`Chain metadata not found for ${chainName}`);
        }

        // Get mailbox address from override, registry, or error
        let mailboxAddress = mailboxAddressOverride;
        if (!mailboxAddress) {
          mailboxAddress = chainAddresses[chainName]?.mailbox;
          if (!mailboxAddress) {
            throw new Error(`Mailbox address not found for ${chainName} in registry. For custom chains, please provide the mailbox address manually.`);
          }
        }

        const chainLookup = createChainLookup(multiProvider);

        logger.debug('Reading core config', { chainName, mailboxAddress });

        // Create read-only provider (no wallet needed!)
        const protocolProvider = getProtocolProvider(chainMetadata.protocol);
        const provider = await protocolProvider.createProvider(chainMetadata);

        // Use AltVMCoreReader for read-only operations
        const reader = new AltVMCoreReader(chainMetadata, chainLookup, provider);
        const config = await reader.read(mailboxAddress);

        logger.debug('Core config read successfully', { chainName, config });

        setProgress({
          status: 'success',
          message: 'Configuration read successfully',
        });

        setCurrentConfig(config as CoreConfig);
        return config as CoreConfig;
      } catch (error) {
        logger.error('Failed to read core config', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        setProgress({
          status: 'error',
          message: 'Failed to read configuration',
          error: errorMessage,
        });

        setCurrentConfig(null);
        return null;
      }
    },
    [multiProvider]
  );

  const reset = useCallback(() => {
    setProgress({
      status: 'idle',
      message: '',
    });
    setCurrentConfig(null);
  }, []);

  return {
    readConfig,
    currentConfig,
    progress,
    reset,
    isReading: progress.status === 'reading',
  };
}
