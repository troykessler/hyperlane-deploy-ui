import { useState } from 'react';

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
}

export function IGPConfigFields({
  owner,
  beneficiary,
  oracleKey,
  overhead,
  oracleConfig,
  onChange,
}: IGPConfigFieldsProps) {
  const [newOverheadDomain, setNewOverheadDomain] = useState('');
  const [newOverheadGas, setNewOverheadGas] = useState('');

  const [newOracleDomain, setNewOracleDomain] = useState('');
  const [newOracleGasPrice, setNewOracleGasPrice] = useState('');
  const [newOracleExchangeRate, setNewOracleExchangeRate] = useState('');

  const updateConfig = (updates: Partial<{
    owner: string;
    beneficiary: string;
    oracleKey: string;
    overhead: Record<string, string>;
    oracleConfig: Record<string, { gasPrice: string; tokenExchangeRate: string }>;
  }>) => {
    onChange({
      owner,
      beneficiary,
      oracleKey,
      overhead,
      oracleConfig,
      ...updates,
    });
  };

  const addOverhead = () => {
    if (newOverheadDomain && newOverheadGas) {
      updateConfig({
        overhead: {
          ...overhead,
          [newOverheadDomain]: newOverheadGas,
        },
      });
      setNewOverheadDomain('');
      setNewOverheadGas('');
    }
  };

  const removeOverhead = (domain: string) => {
    const { [domain]: _, ...rest } = overhead;
    updateConfig({ overhead: rest });
  };

  const addOracleConfig = () => {
    if (newOracleDomain && newOracleGasPrice && newOracleExchangeRate) {
      updateConfig({
        oracleConfig: {
          ...oracleConfig,
          [newOracleDomain]: {
            gasPrice: newOracleGasPrice,
            tokenExchangeRate: newOracleExchangeRate,
          },
        },
      });
      setNewOracleDomain('');
      setNewOracleGasPrice('');
      setNewOracleExchangeRate('');
    }
  };

  const removeOracleConfig = (domain: string) => {
    const { [domain]: _, ...rest } = oracleConfig;
    updateConfig({ oracleConfig: rest });
  };

  return (
    <div className="space-y-4">
      {/* Owner */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Owner Address
        </label>
        <input
          type="text"
          value={owner}
          onChange={(e) => updateConfig({ owner: e.target.value })}
          placeholder="0x..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          Address that owns the IGP contract
        </p>
      </div>

      {/* Beneficiary */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Beneficiary Address
        </label>
        <input
          type="text"
          value={beneficiary}
          onChange={(e) => updateConfig({ beneficiary: e.target.value })}
          placeholder="0x..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          Address that receives gas payment fees
        </p>
      </div>

      {/* Oracle Key */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Oracle Key Address
        </label>
        <input
          type="text"
          value={oracleKey}
          onChange={(e) => updateConfig({ oracleKey: e.target.value })}
          placeholder="0x..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
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
            {Object.entries(overhead).map(([domain, gas]) => (
              <div key={domain} className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200">
                <span className="text-sm font-mono flex-1">
                  Domain {domain}: {gas} gas
                </span>
                <button
                  type="button"
                  onClick={() => removeOverhead(domain)}
                  className="px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add new overhead */}
        <div className="flex gap-2">
          <input
            type="text"
            value={newOverheadDomain}
            onChange={(e) => setNewOverheadDomain(e.target.value)}
            placeholder="Domain ID"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
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
            {Object.entries(oracleConfig).map(([domain, config]) => (
              <div key={domain} className="p-3 bg-gray-50 rounded border border-gray-200">
                <div className="flex items-start justify-between mb-1">
                  <span className="text-sm font-medium">Domain {domain}</span>
                  <button
                    type="button"
                    onClick={() => removeOracleConfig(domain)}
                    className="px-2 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                  >
                    Remove
                  </button>
                </div>
                <div className="text-xs font-mono text-gray-600 space-y-1">
                  <div>Gas Price: {config.gasPrice}</div>
                  <div>Exchange Rate: {config.tokenExchangeRate}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add new oracle config */}
        <div className="space-y-2">
          <input
            type="text"
            value={newOracleDomain}
            onChange={(e) => setNewOracleDomain(e.target.value)}
            placeholder="Domain ID"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={newOracleGasPrice}
              onChange={(e) => setNewOracleGasPrice(e.target.value)}
              placeholder="Gas price (wei)"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              value={newOracleExchangeRate}
              onChange={(e) => setNewOracleExchangeRate(e.target.value)}
              placeholder="Token exchange rate"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="button"
            onClick={addOracleConfig}
            className="w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
          >
            Add Oracle Config
          </button>
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Gas price and token exchange rate for each destination domain
        </p>
      </div>
    </div>
  );
}
