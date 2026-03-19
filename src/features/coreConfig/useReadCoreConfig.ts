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

        // Read the full deployment configuration including all addresses
        let config: CoreConfig;
        try {
          if (isEvmChain(chainMetadata)) {
            // EVM: Use EvmCoreReader to get full deployment addresses
            const evmMultiProvider = multiProvider.toMultiProvider();
            const reader = new EvmCoreReader(evmMultiProvider, chainName);

            // deriveCoreConfig expects an object with addresses
            config = await reader.deriveCoreConfig({ mailbox: mailboxAddress });
          } else {
            // AltVM: Try to read addresses from mailbox
            const protocolProvider = getProtocolProvider(chainMetadata.protocol);
            const provider = await protocolProvider.createProvider(chainMetadata);
            const reader = new AltVMCoreReader(chainMetadata, chainLookup, provider);

            // The AltVM reader might return full configs, but we'll try to extract addresses
            const fullConfig = await reader.read(mailboxAddress);

            // Convert config objects to addresses where possible
            config = {
              owner: fullConfig.owner,
              defaultIsm: typeof fullConfig.defaultIsm === 'string' ? fullConfig.defaultIsm : fullConfig.defaultIsm,
              defaultHook: typeof fullConfig.defaultHook === 'string' ? fullConfig.defaultHook : fullConfig.defaultHook,
              requiredHook: typeof fullConfig.requiredHook === 'string' ? fullConfig.requiredHook : fullConfig.requiredHook,
            };
          }
        } catch (readError) {
          const errorMsg = readError instanceof Error ? readError.message : String(readError);
          logger.error('Failed to read core config', {
            error: errorMsg,
            chainName,
            mailboxAddress,
            protocol: chainMetadata.protocol
          });

          // Provide more helpful error messages
          if (errorMsg.includes('not a Cosmos')) {
            throw new Error(
              `Invalid address format for Cosmos chain. The mailbox address "${mailboxAddress}" does not appear to be a valid Cosmos address. ` +
              `Cosmos addresses should start with a prefix like "cosmos1" or "${chainMetadata.bech32Prefix || 'chain-prefix'}1" followed by the address.`
            );
          }

          if (errorMsg.includes('missing revert data') || errorMsg.includes('Transaction reverted')) {
            throw new Error(
              `Failed to read configuration from mailbox at ${mailboxAddress}. This could mean:\n` +
              `• The deployment is incomplete or corrupted\n` +
              `• Some core contracts (hooks, ISM) are not properly configured\n` +
              `• The RPC endpoint is having issues\n` +
              `• The deployment was done with an incompatible SDK version\n\n` +
              `Try using a different deployment or manually enter the configuration.`
            );
          }

          if (errorMsg.includes('could not detect network') || errorMsg.includes('network does not support')) {
            throw new Error(
              `Network error: Could not connect to ${chainName}. Please check:\n` +
              `• Your internet connection\n` +
              `• The RPC endpoint is working\n` +
              `• The chain configuration is correct`
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
