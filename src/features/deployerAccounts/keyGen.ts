import { Wallet } from 'ethers';
import { ProtocolType } from '@hyperlane-xyz/utils';
import { DirectSecp256k1Wallet } from '@cosmjs/proto-signing';
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
 * Generate a new Cosmos deployer account
 * Uses @cosmjs to create a random wallet with private key
 *
 * WARNING: Private key is returned in plaintext (hex format)
 */
export async function generateCosmosAccount(): Promise<DeployerAccount> {
  // Generate random 32 bytes for private key
  const privkey = new Uint8Array(32);
  crypto.getRandomValues(privkey);

  // Create wallet from private key
  const wallet = await DirectSecp256k1Wallet.fromKey(privkey, 'neutron');

  // Get accounts (address)
  const accounts = await wallet.getAccounts();
  const address = accounts[0].address;

  // Convert private key to hex string for storage
  const privateKeyHex = Array.from(privkey)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return {
    id: generateId(),
    protocol: ProtocolType.CosmosNative,
    address,
    privateKey: privateKeyHex,
    createdAt: Date.now(),
  };
}

/**
 * Generate a new Radix deployer account
 * Uses Ed25519 key generation for Radix
 *
 * WARNING: Private key is returned in plaintext (hex format)
 * NOTE: This is a basic implementation and may need refinement for production use
 */
export async function generateRadixAccount(): Promise<DeployerAccount> {
  // Generate random 32 bytes for Ed25519 private key
  const privkey = new Uint8Array(32);
  crypto.getRandomValues(privkey);

  // Convert private key to hex string for storage
  const privateKeyHex = Array.from(privkey)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Derive public key (simplified - actual Radix address derivation is more complex)
  // For now, using a placeholder address format
  // TODO: Implement proper Radix address derivation using Radix SDK
  const address = `account_rdx1${privateKeyHex.slice(0, 56)}`;

  return {
    id: generateId(),
    protocol: ProtocolType.Radix,
    address,
    privateKey: privateKeyHex,
    createdAt: Date.now(),
  };
}

/**
 * Generate a new Aleo deployer account
 * Uses Aleo's cryptographic primitives
 *
 * WARNING: Private key is returned in plaintext (hex format)
 * NOTE: This is a basic implementation and may need refinement for production use
 */
export async function generateAleoAccount(): Promise<DeployerAccount> {
  // Generate random 32 bytes for private key
  const privkey = new Uint8Array(32);
  crypto.getRandomValues(privkey);

  // Convert private key to hex string for storage
  const privateKeyHex = Array.from(privkey)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  // Derive address (simplified - actual Aleo address derivation is more complex)
  // For now, using a placeholder address format
  // TODO: Implement proper Aleo address derivation using Aleo SDK
  const address = `aleo1${privateKeyHex.slice(0, 59)}`;

  return {
    id: generateId(),
    protocol: ProtocolType.Aleo,
    address,
    privateKey: privateKeyHex,
    createdAt: Date.now(),
  };
}

/**
 * Generate deployer account for specified protocol
 * Supports EVM, Cosmos, Radix, and Aleo
 *
 * @throws Error if protocol not supported
 */
export async function generateDeployerAccount(protocol: ProtocolType): Promise<DeployerAccount> {
  switch (protocol) {
    case ProtocolType.Ethereum:
      return generateEvmAccount();

    case ProtocolType.CosmosNative:
      return await generateCosmosAccount();

    case ProtocolType.Radix:
      return await generateRadixAccount();

    case ProtocolType.Aleo:
      return await generateAleoAccount();

    case ProtocolType.Sealevel:
      throw new Error(`Protocol ${protocol} not yet supported for deployer accounts`);

    default:
      throw new Error(`Unknown protocol: ${protocol}`);
  }
}
