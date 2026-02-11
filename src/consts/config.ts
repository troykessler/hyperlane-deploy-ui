import { ChainMap } from '@hyperlane-xyz/sdk';
import { ProtocolType } from '@hyperlane-xyz/utils';
import { ADDRESS_BLACKLIST } from './blacklist';

const isDevMode = process?.env?.NODE_ENV === 'development';
const version = process?.env?.NEXT_PUBLIC_VERSION || '0.0.0';
const registryUrl = process?.env?.NEXT_PUBLIC_REGISTRY_URL || undefined;
const registryBranch = process?.env?.NEXT_PUBLIC_REGISTRY_BRANCH || undefined;
const registryProxyUrl = process?.env?.NEXT_PUBLIC_GITHUB_PROXY || 'https://proxy.hyperlane.xyz';
const walletConnectProjectId = process?.env?.NEXT_PUBLIC_WALLET_CONNECT_ID || '';
const chainWalletWhitelists = JSON.parse(process?.env?.NEXT_PUBLIC_CHAIN_WALLET_WHITELISTS || '{}');
const rpcOverrides = process?.env?.NEXT_PUBLIC_RPC_OVERRIDES || '';

interface Config {
  addressBlacklist: string[]; // A list of addresses that are blacklisted and cannot be used in the app
  chainWalletWhitelists: ChainMap<string[]>; // A map of chain names to a list of wallet names that work for it
  defaultChain: string | undefined; // The initial chain to show when app first loads
  enableExplorerLink: boolean; // Include a link to the hyperlane explorer
  isDevMode: boolean; // Enables some debug features in the app
  registryUrl: string | undefined; // Optional URL to use a custom registry instead of the published canonical version
  registryBranch?: string | undefined; // Optional customization of the registry branch instead of main
  registryProxyUrl?: string; // Optional URL to use a custom proxy for the GithubRegistry
  showAddChainButton: boolean; // Show/Hide add custom chain in the chain search menu
  shouldDisableChains: boolean; // Enable chain disabling for ChainSearchMenu. When true it will deactivate chains that have disabled status
  version: string; // Matches version number in package.json
  walletConnectProjectId: string; // Project ID provided by walletconnect
  walletProtocols: ProtocolType[]; // Wallet Protocols to show in the wallet connect modal (CosmosNative, Radix, Aleo)
  rpcOverrides: string; // JSON string containing a map of chain names to an object with an URL for RPC overrides (For an example check the .env.example file)
  enableTrackingEvents: boolean; // Allow tracking events to happen on some actions;
}

export const config: Config = Object.freeze({
  addressBlacklist: ADDRESS_BLACKLIST.map((address) => address.toLowerCase()),
  chainWalletWhitelists,
  enableExplorerLink: false,
  defaultChain: undefined,
  isDevMode,
  registryUrl,
  registryBranch,
  registryProxyUrl,
  showAddChainButton: true,
  version,
  walletConnectProjectId,
  walletProtocols: [
    ProtocolType.CosmosNative,
    ProtocolType.Radix,
    ProtocolType.Aleo,
  ],
  shouldDisableChains: false,
  rpcOverrides,
  enableTrackingEvents: false,
});
