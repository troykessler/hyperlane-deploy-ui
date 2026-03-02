import { ProtocolType } from '@hyperlane-xyz/utils';
import { registerProtocol } from '@hyperlane-xyz/provider-sdk';
import { CosmosNativeProtocolProvider } from '@hyperlane-xyz/cosmos-sdk';
import { RadixProtocolProvider } from '@hyperlane-xyz/radix-sdk';
import { AleoProtocolProvider } from '@hyperlane-xyz/aleo-sdk';

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

  // Register Radix protocol
  try {
    registerProtocol(ProtocolType.Radix, () => new RadixProtocolProvider());
  } catch (error) {
    // Protocol already registered, ignore
    if (!(error instanceof Error && error.message.includes('already registered'))) {
      throw error;
    }
  }

  // Register Aleo protocol
  try {
    registerProtocol(ProtocolType.Aleo, () => new AleoProtocolProvider());
  } catch (error) {
    // Protocol already registered, ignore
    if (!(error instanceof Error && error.message.includes('already registered'))) {
      throw error;
    }
  }

  isInitialized = true;
}
