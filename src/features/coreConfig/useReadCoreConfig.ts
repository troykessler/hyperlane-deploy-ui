import { useState, useCallback } from 'react';
import { ChainName, EvmCoreReader } from '@hyperlane-xyz/sdk';
import { chainAddresses } from '@hyperlane-xyz/registry';
import { CoreConfig } from '@hyperlane-xyz/provider-sdk/core';
import { AltVMCoreReader } from '@hyperlane-xyz/deploy-sdk';
import { getProtocolProvider } from '@hyperlane-xyz/provider-sdk';
import { useMultiProvider } from '../chains/hooks';
import { createChainLookup } from '../../utils/chainLookup';
import { logger } from '../../utils/logger';
import { isEvmChain } from '../../utils/protocolUtils';

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

        // Validate mailbox address
        if (!mailboxAddress || mailboxAddress.trim() === '') {
          throw new Error('Mailbox address is required');
        }

        logger.debug('Reading core config', {
          chainName,
          mailboxAddress,
          protocol: chainMetadata.protocol,
          addressLength: mailboxAddress.length
        });

        // Use appropriate reader based on chain protocol type
        let config;
        try {
          if (isEvmChain(chainMetadata)) {
            // Use EVM reader for Ethereum chains
            const evmMultiProvider = multiProvider.toMultiProvider();
            const reader = new EvmCoreReader(evmMultiProvider, chainName);
            config = await reader.deriveCoreConfig({ mailbox: mailboxAddress });
          } else {
            // Use AltVM reader for non-EVM chains (Cosmos, Radix, Aleo, etc.)
            const protocolProvider = getProtocolProvider(chainMetadata.protocol);
            const provider = await protocolProvider.createProvider(chainMetadata);
            const reader = new AltVMCoreReader(chainMetadata, chainLookup, provider);
            config = await reader.read(mailboxAddress);
          }
        } catch (readError) {
          const errorMsg = readError instanceof Error ? readError.message : String(readError);
          logger.error('Failed to read core config', {
            error: errorMsg,
            chainName,
            mailboxAddress,
            protocol: chainMetadata.protocol
          });

          // Provide more helpful error message
          if (errorMsg.includes('not a Cosmos')) {
            throw new Error(
              `Invalid address format for Cosmos chain. The mailbox address "${mailboxAddress}" does not appear to be a valid Cosmos address. ` +
              `Cosmos addresses should start with a prefix like "cosmos1" or "${chainMetadata.bech32Prefix || 'chain-prefix'}1" followed by the address.`
            );
          }

          throw readError;
        }

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
