import { useEffect } from 'react';
import { ChainName } from '@hyperlane-xyz/sdk';
import { useAccountForChain } from '@hyperlane-xyz/widgets';
import { useMultiProvider } from '../chains/hooks';
import { useWallet } from '../wallet/hooks/useWallet';
import { useStore } from '../store';

interface WarpBaseFieldsProps {
  owner: string;
  mailbox: string;
  onChange: (field: 'owner' | 'mailbox', value: string) => void;
  chainName?: ChainName;
}

export function WarpBaseFields({ owner, mailbox, onChange, chainName }: WarpBaseFieldsProps) {
  const multiProvider = useMultiProvider();
  const account = useAccountForChain(multiProvider, chainName || '');
  const deployments = useStore((s) => s.deployments);

  // Get chain metadata to determine protocol
  const chainMetadata = chainName ? multiProvider.tryGetChainMetadata(chainName) : null;
  const protocol = chainMetadata?.protocol;

  // Get unified wallet
  const wallet = useWallet(chainName, protocol);

  // Auto-populate mailbox address from previous deployments or registry
  useEffect(() => {
    if (!chainName || mailbox) return; // Don't override existing value

    // First, check previous deployments
    const deployment = deployments.find((d) => d.chainName === chainName);
    if (deployment?.addresses?.mailbox) {
      onChange('mailbox', deployment.addresses.mailbox);
      return;
    }

    // Then try to get from registry
    try {
      const metadata = multiProvider.getChainMetadata(chainName) as any;
      // Try different possible locations for mailbox address
      const mailboxAddr = metadata?.mailbox || metadata?.addresses?.mailbox;
      if (mailboxAddr && typeof mailboxAddr === 'string') {
        onChange('mailbox', mailboxAddr);
      }
    } catch {
      // Chain not in registry or no mailbox address
    }
  }, [chainName, mailbox, deployments, multiProvider, onChange]);

  const handleUseWalletAddress = () => {
    // Prefer unified wallet address, fallback to account for EVM
    const address = wallet.address || account?.addresses?.[0]?.address;

    if (address) {
      onChange('owner', address);
    }
  };

  // Determine if we have a wallet connected
  const hasWalletAddress = () => {
    return wallet.isConnected || !!account?.addresses?.[0]?.address;
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="owner" className="block text-sm font-medium text-gray-700 mb-2">
          Owner Address *
        </label>
        <div className="relative">
          <input
            type="text"
            id="owner"
            value={owner}
            onChange={(e) => onChange('owner', e.target.value)}
            placeholder="0x..."
            className="w-full px-4 py-2 pr-32 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {hasWalletAddress() && (
            <button
              type="button"
              onClick={handleUseWalletAddress}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
            >
              Use Wallet
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Address that will own and control the warp route contract
        </p>
      </div>

      <div>
        <label htmlFor="mailbox" className="block text-sm font-medium text-gray-700 mb-2">
          Mailbox Address *
        </label>
        <input
          type="text"
          id="mailbox"
          value={mailbox}
          onChange={(e) => onChange('mailbox', e.target.value)}
          placeholder="0x..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          Hyperlane mailbox contract address on this chain
          {chainName && !mailbox && ' (will auto-populate if available)'}
        </p>
      </div>
    </div>
  );
}
