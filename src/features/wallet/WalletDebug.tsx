import { useEffect } from 'react';
import { ProtocolType } from '@hyperlane-xyz/utils';
import { useMultiProvider } from '../chains/hooks';
import { config } from '../../consts/config';

export function WalletDebug() {
  const multiProvider = useMultiProvider();

  useEffect(() => {
    console.log('=== WALLET DEBUG ===');
    console.log('Configured wallet protocols:', config.walletProtocols);

    const chains = multiProvider.getKnownChainNames();
    console.log('Total chains:', chains.length);

    const cosmosChains = chains.filter(chain => {
      const metadata = multiProvider.tryGetChainMetadata(chain);
      return metadata?.protocol === ProtocolType.CosmosNative;
    });

    console.log('Cosmos chains found:', cosmosChains.length);
    if (cosmosChains.length > 0) {
      console.log('Cosmos chain names:', cosmosChains.slice(0, 5));
      // Check first chain's protocol value
      const firstChain = multiProvider.tryGetChainMetadata(cosmosChains[0]);
      console.log('First cosmos chain protocol:', firstChain?.protocol);
    }

    // Check if Keplr is installed
    if (typeof window !== 'undefined') {
      console.log('Keplr installed:', !!(window as any).keplr);
      console.log('Leap installed:', !!(window as any).leap);
    }
  }, [multiProvider]);

  return null;
}
