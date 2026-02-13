import { ChainMetadata } from '@hyperlane-xyz/sdk';
import { ProtocolType } from '@hyperlane-xyz/utils';

/**
 * Determines if a chain uses EVM protocol
 */
export function isEvmChain(chainMetadata: ChainMetadata): boolean {
  return chainMetadata.protocol === ProtocolType.Ethereum;
}

/**
 * Determines if a chain uses AltVM protocol (Cosmos, Radix, Aleo, Sealevel, etc.)
 */
export function isAltVMChain(chainMetadata: ChainMetadata): boolean {
  return !isEvmChain(chainMetadata);
}
