import { useState, useMemo } from 'react';
import { ChainName } from '@hyperlane-xyz/sdk';
import { useAccountForChain } from '@hyperlane-xyz/widgets';
import { useMultiProvider } from '../chains/hooks';
import { useWallet } from '../wallet/hooks/useWallet';
import { ChainSelectorModal } from '../chains/ChainSelectorModal';

interface IGPConfigFieldsProps {
  owner: string;
  beneficiary: string;
  oracleKey: string;
  overhead: Record<string, string>;
  oracleConfig: Record<string, { gasPrice: string; tokenExchangeRate: string }>;
  onChange: (config: {
    owner: string;
    beneficiary: string;
    oracleKey: string;
    overhead: Record<string, string>;
    oracleConfig: Record<string, { gasPrice: string; tokenExchangeRate: string }>;
  }) => void;
  chainName?: ChainName;
}

export function IGPConfigFields({
  owner,
  beneficiary,
  oracleKey,
  overhead,
  oracleConfig,
  onChange,
  chainName,
}: IGPConfigFieldsProps) {
  const multiProvider = useMultiProvider();
  const account = useAccountForChain(multiProvider, chainName || '');

  // Get chain metadata to determine protocol
  const chainMetadata = chainName ? multiProvider.tryGetChainMetadata(chainName) : null;
  const protocol = chainMetadata?.protocol;

  // Get unified wallet
  const wallet = useWallet(chainName, protocol);

  const [newOverheadChain, setNewOverheadChain] = useState<ChainName>('');
  const [newOverheadGas, setNewOverheadGas] = useState('');
  const [isOverheadChainModalOpen, setIsOverheadChainModalOpen] = useState(false);

  const [newOracleChain, setNewOracleChain] = useState<ChainName>('');
  const [newOracleGasPrice, setNewOracleGasPrice] = useState('');
  const [newOracleExchangeRate, setNewOracleExchangeRate] = useState('');
  const [isOracleChainModalOpen, setIsOracleChainModalOpen] = useState(false);

  // Get all available chains
  const availableChains = useMemo(() => {
    return multiProvider.getKnownChainNames().sort();
  }, [multiProvider]);

  // Helper to get domain ID from chain name
  const getDomainId = (chainName: ChainName): string => {
    const metadata = multiProvider.tryGetChainMetadata(chainName);
    return metadata?.domainId?.toString() || '';
  };

  // Helper to get chain name from domain ID
  const getChainName = (domainId: string): ChainName | null => {
    const chains = multiProvider.getKnownChainNames();
    for (const chain of chains) {
      const metadata = multiProvider.tryGetChainMetadata(chain);
      if (metadata?.domainId?.toString() === domainId) {
        return chain;
      }
    }
    return null;
  };

  // Helper to format gas price from wei to gwei for display
  const formatGasPrice = (gasPriceWei: string): string => {
    try {
      return (parseFloat(gasPriceWei) / 1e9).toString();
    } catch {
      return gasPriceWei;
    }
  };

  // Helper to format token exchange rate from scaled to decimal for display
  const formatExchangeRate = (exchangeRateScaled: string): string => {
    try {
      return (parseFloat(exchangeRateScaled) / 1e10).toString();
    } catch {
      return exchangeRateScaled;
    }
  };

  const handleUseWalletAddress = () => {
    // Prefer unified wallet address, fallback to account for EVM
    const address = wallet.address || account?.addresses?.[0]?.address;

    if (address) {
      updateConfig({ owner: address });
    }
  };

  const handleUseWalletForBeneficiary = () => {
    const address = wallet.address || account?.addresses?.[0]?.address;
    if (address) {
      updateConfig({ beneficiary: address });
    }
  };

  const handleUseWalletForOracleKey = () => {
    const address = wallet.address || account?.addresses?.[0]?.address;
    if (address) {
      updateConfig({ oracleKey: address });
    }
  };

  // Determine if we have a wallet connected
  const hasWalletAddress = () => {
    return wallet.isConnected || !!account?.addresses?.[0]?.address;
  };

  const updateConfig = (updates: Partial<{
    owner: string;
    beneficiary: string;
    oracleKey: string;
    overhead: Record<string, string>;
    oracleConfig: Record<string, { gasPrice: string; tokenExchangeRate: string }>;
  }>) => {
    // Normalize address fields to lowercase to avoid checksum validation errors
    const normalized = { ...updates };
    if (normalized.owner !== undefined) {
      normalized.owner = normalized.owner.trim().toLowerCase();
    }
    if (normalized.beneficiary !== undefined) {
      normalized.beneficiary = normalized.beneficiary.trim().toLowerCase();
    }
    if (normalized.oracleKey !== undefined) {
      normalized.oracleKey = normalized.oracleKey.trim().toLowerCase();
    }

    const finalConfig = {
      owner,
      beneficiary,
      oracleKey,
      overhead,
      oracleConfig,
      ...normalized,
    };

    onChange(finalConfig);
  };

  const addOverhead = () => {
    if (newOverheadChain && newOverheadGas) {
      const domainId = getDomainId(newOverheadChain);
      if (domainId) {
        updateConfig({
          overhead: {
            ...overhead,
            [domainId]: newOverheadGas,
          },
        });
        setNewOverheadChain('');
        setNewOverheadGas('');
      }
    }
  };

  const removeOverhead = (domain: string) => {
    const { [domain]: _, ...rest } = overhead;
    updateConfig({ overhead: rest });
  };

  const addOracleConfig = () => {
    if (newOracleChain && newOracleGasPrice && newOracleExchangeRate) {
      const domainId = getDomainId(newOracleChain);
      if (domainId) {
        // Convert user-friendly inputs to SDK format
        // Gas price: convert from gwei to wei (multiply by 10^9)
        const gasPriceInWei = (parseFloat(newOracleGasPrice) * 1e9).toFixed(0);

        // Token exchange rate: convert to protocol decimals
        // For Ethereum/EVM chains: 10 decimals (multiply by 10^10)
        // For simplicity, we assume all chains use 10 decimals here
        const exchangeRateScaled = (parseFloat(newOracleExchangeRate) * 1e10).toFixed(0);

        updateConfig({
          oracleConfig: {
            ...oracleConfig,
            [domainId]: {
              gasPrice: gasPriceInWei,
              tokenExchangeRate: exchangeRateScaled,
            },
          },
        });
        setNewOracleChain('');
        setNewOracleGasPrice('');
        setNewOracleExchangeRate('');
      }
    }
  };

  const removeOracleConfig = (domain: string) => {
    const { [domain]: _, ...rest } = oracleConfig;
    updateConfig({ oracleConfig: rest });
  };

  return (
    <div className="space-y-4">
      {/* Info note about reading from deployed contracts */}
      {(!overhead || Object.keys(overhead).length === 0) && (!oracleConfig || Object.keys(oracleConfig).length === 0) && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>Note:</strong> Overhead and oracle config may not be available when reading from deployed contracts.
            These values are typically stored in a format that's not easily queryable.
            You may need to manually re-enter these values if updating the configuration.
          </p>
        </div>
      )}

      {/* Owner */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Owner Address
        </label>
        <div className="relative">
          <input
            type="text"
            value={owner}
            onChange={(e) => updateConfig({ owner: e.target.value })}
            placeholder="0x..."
            className="w-full px-3 py-2 pr-32 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          Address that owns the IGP contract
        </p>
      </div>

      {/* Beneficiary */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Beneficiary Address
        </label>
        <div className="relative">
          <input
            type="text"
            value={beneficiary}
            onChange={(e) => updateConfig({ beneficiary: e.target.value })}
            placeholder="0x..."
            className="w-full px-3 py-2 pr-32 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {hasWalletAddress() && (
            <button
              type="button"
              onClick={handleUseWalletForBeneficiary}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
            >
              Use Wallet
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Address that receives gas payment fees
        </p>
      </div>

      {/* Oracle Key */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Oracle Key Address
        </label>
        <div className="relative">
          <input
            type="text"
            value={oracleKey}
            onChange={(e) => updateConfig({ oracleKey: e.target.value })}
            placeholder="0x..."
            className="w-full px-3 py-2 pr-32 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {hasWalletAddress() && (
            <button
              type="button"
              onClick={handleUseWalletForOracleKey}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 transition-colors"
            >
              Use Wallet
            </button>
          )}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Address authorized to update gas oracle data
        </p>
      </div>

      {/* Overhead Config */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Gas Overhead per Domain ({Object.keys(overhead).length})
        </label>

        {/* Existing overhead entries */}
        {Object.entries(overhead).length > 0 && (
          <div className="mb-3 space-y-2">
            {Object.entries(overhead).map(([domain, gas]) => {
              const chainName = getChainName(domain);
              return (
                <div key={domain} className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200">
                  <span className="text-sm flex-1">
                    <span className="font-medium">{chainName || `Domain ${domain}`}</span>
                    {chainName && <span className="text-gray-500 text-xs ml-2">(domain: {domain})</span>}
                    : {gas} gas
                  </span>
                  <button
                    type="button"
                    onClick={() => removeOverhead(domain)}
                    className="px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Add new overhead */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setIsOverheadChainModalOpen(true)}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-left"
          >
            {newOverheadChain || <span className="text-gray-500">Select chain...</span>}
          </button>
          <input
            type="text"
            value={newOverheadGas}
            onChange={(e) => setNewOverheadGas(e.target.value)}
            placeholder="Gas amount"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={addOverhead}
            disabled={!newOverheadChain || !newOverheadGas}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Add
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Gas overhead for each destination domain
        </p>
      </div>

      {/* Oracle Config */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Oracle Config per Domain ({Object.keys(oracleConfig).length})
        </label>

        {/* Existing oracle configs */}
        {Object.entries(oracleConfig).length > 0 && (
          <div className="mb-3 space-y-2">
            {Object.entries(oracleConfig).map(([domain, config]) => {
              const chainName = getChainName(domain);
              return (
                <div key={domain} className="p-3 bg-gray-50 rounded border border-gray-200">
                  <div className="flex items-start justify-between mb-1">
                    <div className="text-sm">
                      <span className="font-medium">{chainName || `Domain ${domain}`}</span>
                      {chainName && <span className="text-gray-500 text-xs ml-2">(domain: {domain})</span>}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeOracleConfig(domain)}
                      className="px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="text-xs font-mono text-gray-600 space-y-1">
                    <div>Gas Price: {formatGasPrice(config.gasPrice)} gwei</div>
                    <div>Exchange Rate: {formatExchangeRate(config.tokenExchangeRate)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add new oracle config */}
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setIsOracleChainModalOpen(true)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-left"
          >
            {newOracleChain || <span className="text-gray-500">Select chain...</span>}
          </button>
          <div className="flex gap-2">
            <input
              type="text"
              value={newOracleGasPrice}
              onChange={(e) => setNewOracleGasPrice(e.target.value)}
              placeholder="Gas price in gwei (e.g., 1)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={newOracleExchangeRate}
              onChange={(e) => setNewOracleExchangeRate(e.target.value)}
              placeholder="Exchange rate (e.g., 1 for 1:1)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={addOracleConfig}
            disabled={!newOracleChain || !newOracleGasPrice || !newOracleExchangeRate}
            className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Add Oracle Config
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Gas price in <strong>gwei</strong> and token exchange rate as decimal (e.g., 1.0 for 1:1 ratio) for each destination domain
        </p>
      </div>

      {/* Chain Selector Modals */}
      <ChainSelectorModal
        isOpen={isOverheadChainModalOpen}
        onClose={() => setIsOverheadChainModalOpen(false)}
        onSelect={(chain) => setNewOverheadChain(chain)}
        selectedChain={newOverheadChain}
      />
      <ChainSelectorModal
        isOpen={isOracleChainModalOpen}
        onClose={() => setIsOracleChainModalOpen(false)}
        onSelect={(chain) => setNewOracleChain(chain)}
        selectedChain={newOracleChain}
      />
    </div>
  );
}
