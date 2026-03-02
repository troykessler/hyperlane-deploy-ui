import { useState, useEffect } from 'react';
import { ChainName } from '@hyperlane-xyz/sdk';
import type { HookConfig } from '@hyperlane-xyz/provider-sdk/hook';
import { IGPConfigFields } from './IGPConfigFields';

type HookType = 'merkleTreeHook' | 'interchainGasPaymaster' | 'protocolFee';

interface WarpHookConfigFormProps {
  config: HookConfig | string | undefined;
  onChange: (config: HookConfig | string | undefined) => void;
  useAddress: boolean;
  onToggleAddress: (useAddress: boolean) => void;
  chainName?: ChainName;
}

export function WarpHookConfigForm({
  config,
  onChange,
  useAddress,
  onToggleAddress,
  chainName,
}: WarpHookConfigFormProps) {
  const [hookAddress, setHookAddress] = useState('');
  const [hookType, setHookType] = useState<HookType>('merkleTreeHook');

  // IGP-specific fields
  const [igpOwner, setIgpOwner] = useState('');
  const [igpBeneficiary, setIgpBeneficiary] = useState('');
  const [igpOracleKey, setIgpOracleKey] = useState('');
  const [igpOverhead, setIgpOverhead] = useState<Record<string, string>>({});
  const [igpOracleConfig, setIgpOracleConfig] = useState<Record<string, { gasPrice: string; tokenExchangeRate: string }>>({});

  // Protocol Fee fields
  const [maxProtocolFee, setMaxProtocolFee] = useState('');
  const [protocolFeeValue, setProtocolFeeValue] = useState('');
  const [feeRecipient, setFeeRecipient] = useState('');

  useEffect(() => {
    if (typeof config === 'string') {
      setHookAddress(config);
    } else if (config && typeof config === 'object') {
      const type = (config as any).type;
      if (type) setHookType(type);

      if (type === 'interchainGasPaymaster') {
        setIgpOwner((config as any).owner || '');
        setIgpBeneficiary((config as any).beneficiary || '');
        setIgpOracleKey((config as any).oracleKey || '');
        setIgpOverhead((config as any).overhead || {});
        setIgpOracleConfig((config as any).oracleConfig || {});
      } else if (type === 'protocolFee') {
        setMaxProtocolFee((config as any).maxProtocolFee || '');
        setProtocolFeeValue((config as any).protocolFee || '');
        setFeeRecipient((config as any).beneficiary || '');
      }
    }
  }, [config]);

  // Build initial config when in builder mode (not using address)
  useEffect(() => {
    if (!useAddress && !config) {
      // Build default merkleTreeHook config on mount
      onChange({ type: 'merkleTreeHook' });
    }
  }, [useAddress, config, onChange]);

  const handleToggle = (checked: boolean) => {
    onToggleAddress(checked);
    if (checked) {
      onChange(hookAddress || undefined);
    } else {
      updateHookConfig(hookType);
    }
  };

  const handleAddressChange = (value: string) => {
    // Normalize address to lowercase to avoid checksum validation errors
    const normalized = value.trim().toLowerCase();
    setHookAddress(normalized);
    if (useAddress) {
      onChange(normalized || undefined);
    }
  };

  const handleHookTypeChange = (type: HookType) => {
    setHookType(type);
    updateHookConfig(type);
  };

  const updateHookConfig = (type: HookType) => {
    if (type === 'merkleTreeHook') {
      onChange({ type: 'merkleTreeHook' });
    } else if (type === 'interchainGasPaymaster') {
      const config: any = {
        type: 'interchainGasPaymaster',
        // Always include overhead and oracleConfig, even if empty
        overhead: igpOverhead,
        oracleConfig: igpOracleConfig,
      };
      if (igpOwner) config.owner = igpOwner;
      if (igpBeneficiary) config.beneficiary = igpBeneficiary;
      if (igpOracleKey) config.oracleKey = igpOracleKey;
      onChange(config);
    } else if (type === 'protocolFee') {
      const config: any = { type: 'protocolFee' };
      if (maxProtocolFee) config.maxProtocolFee = maxProtocolFee;
      if (protocolFeeValue) config.protocolFee = protocolFeeValue;
      if (feeRecipient) config.beneficiary = feeRecipient;
      onChange(config);
    }
  };

  const handleIGPConfigChange = (igpConfig: {
    owner: string;
    beneficiary: string;
    oracleKey: string;
    overhead: Record<string, string>;
    oracleConfig: Record<string, { gasPrice: string; tokenExchangeRate: string }>;
  }) => {
    setIgpOwner(igpConfig.owner);
    setIgpBeneficiary(igpConfig.beneficiary);
    setIgpOracleKey(igpConfig.oracleKey);
    setIgpOverhead(igpConfig.overhead);
    setIgpOracleConfig(igpConfig.oracleConfig);

    const config: any = {
      type: 'interchainGasPaymaster',
      // Always include overhead and oracleConfig, even if empty
      overhead: igpConfig.overhead,
      oracleConfig: igpConfig.oracleConfig,
    };
    if (igpConfig.owner) config.owner = igpConfig.owner;
    if (igpConfig.beneficiary) config.beneficiary = igpConfig.beneficiary;
    if (igpConfig.oracleKey) config.oracleKey = igpConfig.oracleKey;
    onChange(config);
  };

  const handleProtocolFeeFieldChange = (field: 'maxProtocolFee' | 'protocolFee' | 'beneficiary', value: string) => {
    // Normalize address fields to lowercase
    const normalized = field === 'beneficiary' ? value.trim().toLowerCase() : value;

    if (field === 'maxProtocolFee') setMaxProtocolFee(normalized);
    else if (field === 'protocolFee') setProtocolFeeValue(normalized);
    else setFeeRecipient(normalized);

    const config: any = { type: 'protocolFee' };
    if (field === 'maxProtocolFee' ? normalized : maxProtocolFee) config.maxProtocolFee = field === 'maxProtocolFee' ? normalized : maxProtocolFee;
    if (field === 'protocolFee' ? normalized : protocolFeeValue) config.protocolFee = field === 'protocolFee' ? normalized : protocolFeeValue;
    if (field === 'beneficiary' ? normalized : feeRecipient) config.beneficiary = field === 'beneficiary' ? normalized : feeRecipient;
    onChange(config);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Hook (Optional)</label>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={useAddress}
            onChange={(e) => handleToggle(e.target.checked)}
            className="rounded"
          />
          Use existing hook address
        </label>
      </div>

      {useAddress ? (
        <div>
          <input
            type="text"
            value={hookAddress}
            onChange={(e) => handleAddressChange(e.target.value)}
            placeholder="0x... (Hook contract address)"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Address of an existing hook contract for post-dispatch processing
          </p>
        </div>
      ) : (
        <div className="space-y-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Hook Type</label>
            <select
              value={hookType}
              onChange={(e) => handleHookTypeChange(e.target.value as HookType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="merkleTreeHook">Merkle Tree Hook</option>
              <option value="interchainGasPaymaster">Interchain Gas Paymaster (IGP)</option>
              <option value="protocolFee">Protocol Fee</option>
            </select>
          </div>

          {/* Merkle Tree Hook - No config needed */}
          {hookType === 'merkleTreeHook' && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
              <strong>Merkle Tree Hook</strong>: Stores a merkle tree of dispatched message IDs. No additional configuration needed.
            </div>
          )}

          {/* IGP Configuration */}
          {hookType === 'interchainGasPaymaster' && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                <strong>Interchain Gas Paymaster</strong>: Handles gas payment for cross-chain messages.
              </div>

              <IGPConfigFields
                owner={igpOwner}
                beneficiary={igpBeneficiary}
                oracleKey={igpOracleKey}
                overhead={igpOverhead}
                oracleConfig={igpOracleConfig}
                onChange={handleIGPConfigChange}
                chainName={chainName}
              />
            </div>
          )}

          {/* Protocol Fee Configuration */}
          {hookType === 'protocolFee' && (
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
                <strong>Protocol Fee</strong>: Collects protocol fees on message dispatch.
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Max Protocol Fee (Optional)
                </label>
                <input
                  type="text"
                  value={maxProtocolFee}
                  onChange={(e) => handleProtocolFeeFieldChange('maxProtocolFee', e.target.value)}
                  placeholder="Maximum fee in wei"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Protocol Fee (Optional)
                </label>
                <input
                  type="text"
                  value={protocolFeeValue}
                  onChange={(e) => handleProtocolFeeFieldChange('protocolFee', e.target.value)}
                  placeholder="Fee amount in wei"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fee Recipient (Optional)
                </label>
                <input
                  type="text"
                  value={feeRecipient}
                  onChange={(e) => handleProtocolFeeFieldChange('beneficiary', e.target.value)}
                  placeholder="0x... (Address to receive fees)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>Hook:</strong> Optional post-dispatch processing. Choose a hook type or provide an existing hook contract address.
        </p>
      </div>
    </div>
  );
}
