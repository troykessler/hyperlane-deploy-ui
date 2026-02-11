import { ChainName } from '@hyperlane-xyz/sdk';
import { IsmConfig } from '@hyperlane-xyz/provider-sdk/ism';
import { HookConfig } from '@hyperlane-xyz/provider-sdk/hook';

/**
 * Token types for warp routes
 */
export type WarpTokenType = 'collateral' | 'synthetic' | 'native';

/**
 * Remote routers mapping: chain name -> router address
 */
export type RemoteRouters = Record<string, { address: string }>;

/**
 * Destination gas mapping: chain name -> gas amount
 */
export type DestinationGas = Record<string, string>;

/**
 * Base warp route configuration
 */
export interface BaseWarpConfig {
  owner: string;
  mailbox: string;
  interchainSecurityModule?: IsmConfig | string;
  hook?: HookConfig | string;
  remoteRouters?: RemoteRouters;
  destinationGas?: DestinationGas;
}

/**
 * Collateral warp route config (wraps existing token)
 */
export interface CollateralWarpConfig extends BaseWarpConfig {
  type: 'collateral';
  token: string; // Token address to wrap
}

/**
 * Synthetic warp route config (mints new token)
 */
export interface SyntheticWarpConfig extends BaseWarpConfig {
  type: 'synthetic';
  name?: string;
  symbol?: string;
  decimals?: number;
}

/**
 * Native warp route config (wraps native gas token)
 */
export interface NativeWarpConfig extends BaseWarpConfig {
  type: 'native';
}

/**
 * Union type for all warp route configs
 */
export type WarpConfig = CollateralWarpConfig | SyntheticWarpConfig | NativeWarpConfig;

/**
 * Token metadata fetched from chain
 */
export interface TokenMetadata {
  name: string;
  symbol: string;
  decimals: number;
}

/**
 * Warp route deployment record for history
 */
export interface WarpDeploymentRecord {
  id: string;
  chainName: ChainName;
  timestamp: number;
  address: string; // deployedTokenRoute address
  config: WarpConfig;
  type: WarpTokenType;
  txHashes: string[];
}

/**
 * Warp deployment result
 */
export interface WarpDeployResult {
  chainName: ChainName;
  address: string;
  config: WarpConfig;
  timestamp: number;
  txHashes: string[];
}

/**
 * Deployment status for tracking progress
 */
export type WarpDeployStatus =
  | 'idle'
  | 'validating'
  | 'deploying'
  | 'deployed'
  | 'enrolling'
  | 'complete'
  | 'failed';

/**
 * Deployment progress state
 */
export interface WarpDeployProgress {
  status: WarpDeployStatus;
  message: string;
  error?: string;
}

/**
 * Multi-chain deployment status mapping
 */
export type MultiChainDeployStatuses = Record<ChainName, WarpDeployStatus>;

/**
 * Config input methods
 */
export type WarpConfigInputMethod = 'upload' | 'builder' | 'multichain';
