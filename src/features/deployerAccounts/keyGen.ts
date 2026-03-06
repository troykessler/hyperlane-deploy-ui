import { Wallet } from 'ethers';
import { ProtocolType } from '@hyperlane-xyz/utils';
import type { DeployerAccount } from './types';

/**
 * Generate a unique ID for deployer account
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Generate a new EVM deployer account
 * Uses ethers.js to create a random wallet with private key
 *
 * WARNING: Private key is returned in plaintext
 */
export function generateEvmAccount(): DeployerAccount {
  const wallet = Wallet.createRandom();

  return {
    id: generateId(),
    protocol: ProtocolType.Ethereum,
    address: wallet.address,
    privateKey: wallet.privateKey,
    createdAt: Date.now(),
  };
}

/**
 * Generate deployer account for specified protocol
 * Currently only supports EVM
 *
 * @throws Error if protocol not supported
 */
export function generateDeployerAccount(protocol: ProtocolType): DeployerAccount {
  switch (protocol) {
    case ProtocolType.Ethereum:
      return generateEvmAccount();

    case ProtocolType.Sealevel:
    case ProtocolType.CosmosNative:
    case ProtocolType.Radix:
    case ProtocolType.Aleo:
      throw new Error(`Protocol ${protocol} not yet supported for deployer accounts`);

    default:
      throw new Error(`Unknown protocol: ${protocol}`);
  }
}
