import { MultiProtocolProvider } from '@hyperlane-xyz/sdk';
import { ChainLookup } from '@hyperlane-xyz/provider-sdk/chain';

/**
 * Create a ChainLookup adapter from MultiProtocolProvider
 * ChainLookup is required by the deploy-sdk modules
 */
export function createChainLookup(multiProvider: MultiProtocolProvider): ChainLookup {
  return {
    getChainMetadata(chain: string | number) {
      const chainName = typeof chain === 'number' ? multiProvider.getChainName(chain) : chain;
      const metadata = multiProvider.tryGetChainMetadata(chainName);
      if (!metadata) {
        throw new Error(`Chain metadata not found for ${chain}`);
      }
      return metadata;
    },

    getChainName(chainId: number | string) {
      return multiProvider.getChainName(chainId);
    },

    getDomainId(chain: string | number) {
      const chainName = typeof chain === 'number' ? multiProvider.getChainName(chain) : chain;
      const metadata = multiProvider.getChainMetadata(chainName);
      return metadata.domainId ?? metadata.chainId;
    },

    getKnownChainNames() {
      return multiProvider.getKnownChainNames();
    },
  };
}
