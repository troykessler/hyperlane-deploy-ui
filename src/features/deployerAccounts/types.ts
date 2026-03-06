import { ProtocolType } from '@hyperlane-xyz/utils';

/**
 * Deployer account stored in browser localStorage
 * WARNING: Private keys are stored in plaintext - only use for temporary deployments
 */
export interface DeployerAccount {
  /** Unique identifier */
  id: string;

  /** Protocol type (ethereum, cosmos, radix, aleo, etc.) */
  protocol: ProtocolType;

  /** Account address */
  address: string;

  /** Private key (plaintext) - INSECURE, only for ephemeral usage */
  privateKey: string;

  /** Optional user-provided label */
  label?: string;

  /** Creation timestamp */
  createdAt: number;
}
