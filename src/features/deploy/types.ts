import { CoreConfig, DeployedCoreAddresses } from '@hyperlane-xyz/provider-sdk/core';
import { ChainName } from '@hyperlane-xyz/sdk';

export interface DeployFormValues {
  chainName: ChainName;
  config: CoreConfig;
}

export enum DeploymentStatus {
  Idle = 'idle',
  Validating = 'validating',
  Deploying = 'deploying',
  Deployed = 'deployed',
  Failed = 'failed',
}

export interface DeploymentProgress {
  status: DeploymentStatus;
  currentStep?: string;
  completedSteps: string[];
  totalSteps: number;
  error?: string;
}

export interface DeployResult {
  chainName: ChainName;
  addresses: DeployedCoreAddresses;
  txHashes: string[];
  timestamp: number;
}
