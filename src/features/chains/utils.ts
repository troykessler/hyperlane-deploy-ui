import { isAbacusWorksChain } from '@hyperlane-xyz/registry';
import {
  ChainMap,
  ChainMetadata,
  ChainName,
  ChainStatus,
  MultiProtocolProvider,
} from '@hyperlane-xyz/sdk';
import { ProtocolType, toTitleCase } from '@hyperlane-xyz/utils';
import { config } from '../../consts/config';

export function getChainDisplayName(
  multiProvider: MultiProtocolProvider,
  chain: ChainName,
  shortName = false,
) {
  if (!chain) return 'Unknown';
  const metadata = multiProvider.tryGetChainMetadata(chain);
  if (!metadata) return 'Unknown';
  const displayName = shortName ? metadata.displayNameShort : metadata.displayName;
  return displayName || metadata.displayName || toTitleCase(metadata.name);
}

export function isPermissionlessChain(multiProvider: MultiProtocolProvider, chain: ChainName) {
  if (!chain) return true;
  const metadata = multiProvider.tryGetChainMetadata(chain);
  return !metadata || !isAbacusWorksChain(metadata);
}

export function hasPermissionlessChain(multiProvider: MultiProtocolProvider, ids: ChainName[]) {
  return !ids.every((c) => !isPermissionlessChain(multiProvider, c));
}

/**
 * Returns chains that support core contract deployment (CosmosNative, Radix, Aleo only)
 */
export function getDeployableChains(chainMetadata: ChainMap<ChainMetadata>): ChainName[] {
  return Object.entries(chainMetadata)
    .filter(([_, metadata]) =>
      metadata.protocol === ProtocolType.CosmosNative ||
      metadata.protocol === ProtocolType.Radix ||
      metadata.protocol === ProtocolType.Aleo
    )
    .map(([name]) => name);
}

/**
 * Checks if a chain is deployable (CosmosNative, Radix, or Aleo)
 */
export function isDeployableChain(chainMetadata: ChainMetadata | null): boolean {
  if (!chainMetadata) return false;
  return (
    chainMetadata.protocol === ProtocolType.CosmosNative ||
    chainMetadata.protocol === ProtocolType.Radix ||
    chainMetadata.protocol === ProtocolType.Aleo
  );
}

export function isChainDisabled(chainMetadata: ChainMetadata | null) {
  if (!config.shouldDisableChains || !chainMetadata) return false;

  return chainMetadata.availability?.status === ChainStatus.Disabled;
}

/**
 * Return given chainName if it is valid, otherwise return undefined
 */
export function tryGetValidChainName(
  chainName: string | null,
  multiProvider: MultiProtocolProvider,
): string | undefined {
  const validChainName = chainName && multiProvider.tryGetChainName(chainName);
  const chainMetadata = validChainName ? multiProvider.tryGetChainMetadata(chainName) : null;
  const chainDisabled = isChainDisabled(chainMetadata);

  if (chainDisabled) return undefined;

  return validChainName ? chainName : undefined;
}
