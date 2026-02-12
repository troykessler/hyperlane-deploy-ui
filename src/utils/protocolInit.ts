import { ProtocolType } from '@hyperlane-xyz/utils';
import { registerProtocol } from '@hyperlane-xyz/provider-sdk';
import { CosmosNativeProtocolProvider } from '@hyperlane-xyz/cosmos-sdk';
// import { RadixProtocolProvider } from '@hyperlane-xyz/radix-sdk';
// import { AleoProtocolProvider } from '@hyperlane-xyz/aleo-sdk';

let isInitialized = false;

/**
 * Register AltVM protocol providers
 * Must be called before using any AltVM modules
 */
export function initializeAltVMProtocols() {
  if (isInitialized) return;

  // Register CosmosNative protocol
  try {
    registerProtocol(ProtocolType.CosmosNative, () => new CosmosNativeProtocolProvider());
  } catch (error) {
    // Protocol already registered, ignore
    if (!(error instanceof Error && error.message.includes('already registered'))) {
      throw error;
    }
  }

  // TODO: Register Radix protocol when available
  // registerProtocol(ProtocolType.Radix, () => new RadixProtocolProvider());

  // TODO: Register Aleo protocol when available
  // registerProtocol(ProtocolType.Aleo, () => new AleoProtocolProvider());

  isInitialized = true;
}
