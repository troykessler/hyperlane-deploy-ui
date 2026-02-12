import { useState, useEffect } from 'react';
import type { HookConfig } from '@hyperlane-xyz/provider-sdk/hook';

type HookType = 'merkleTreeHook' | 'interchainGasPaymaster' | 'protocolFee';

interface WarpHookConfigFormProps {
  config: HookConfig | string | undefined;
  onChange: (config: HookConfig | string | undefined) => void;
  useAddress: boolean;
  onToggleAddress: (useAddress: boolean) => void;
}

export function WarpHookConfigForm({
  config,
  onChange,
  useAddress,
  onToggleAddress,
}: WarpHookConfigFormProps) {
  const [hookAddress, setHookAddress] = useState('');
  const [hookType, setHookType] = useState<HookType>('merkleTreeHook');

  // IGP-specific fields
  const [beneficiary, setBeneficiary] = useState('');
  const [gasOracle, setGasOracle] = useState('');

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
        setBeneficiary((config as any).beneficiary || '');
        setGasOracle((config as any).gasOracle || '');
      } else if (type === 'protocolFee') {
        setMaxProtocolFee((config as any).maxProtocolFee || '');
        setProtocolFeeValue((config as any).protocolFee || '');
        setFeeRecipient((config as any).beneficiary || '');
      }
    }
  }, [config]);

  const handleToggle = (checked: boolean) => {
    onToggleAddress(checked);
    if (checked) {
      onChange(hookAddress || undefined);
    } else {
      updateHookConfig(hookType);
    }
  };

  const handleAddressChange = (value: string) => {
    setHookAddress(value);
    if (useAddress) {
      onChange(value || undefined);
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
      const config: any = { type: 'interchainGasPaymaster' };
      if (beneficiary) config.beneficiary = beneficiary;
      if (gasOracle) config.gasOracle = gasOracle;
      onChange(config);
    } else if (type === 'protocolFee') {
      const config: any = { type: 'protocolFee' };
      if (maxProtocolFee) config.maxProtocolFee = maxProtocolFee;
      if (protocolFeeValue) config.protocolFee = protocolFeeValue;
      if (feeRecipient) config.beneficiary = feeRecipient;
      onChange(config);
    }
  };

  const handleIGPFieldChange = (field: 'beneficiary' | 'gasOracle', value: string) => {
    if (field === 'beneficiary') setBeneficiary(value);
    else setGasOracle(value);

    const config: any = { type: 'interchainGasPaymaster' };
    if (field === 'beneficiary' ? value : beneficiary) config.beneficiary = field === 'beneficiary' ? value : beneficiary;
    if (field === 'gasOracle' ? value : gasOracle) config.gasOracle = field === 'gasOracle' ? value : gasOracle;
    onChange(config);
  };

  const handleProtocolFeeFieldChange = (field: 'maxProtocolFee' | 'protocolFee' | 'beneficiary', value: string) => {
    if (field === 'maxProtocolFee') setMaxProtocolFee(value);
    else if (field === 'protocolFee') setProtocolFeeValue(value);
    else setFeeRecipient(value);

    const config: any = { type: 'protocolFee' };
    if (field === 'maxProtocolFee' ? value : maxProtocolFee) config.maxProtocolFee = field === 'maxProtocolFee' ? value : maxProtocolFee;
    if (field === 'protocolFee' ? value : protocolFeeValue) config.protocolFee = field === 'protocolFee' ? value : protocolFeeValue;
    if (field === 'beneficiary' ? value : feeRecipient) config.beneficiary = field === 'beneficiary' ? value : feeRecipient;
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Beneficiary Address (Optional)
                </label>
                <input
                  type="text"
                  value={beneficiary}
                  onChange={(e) => handleIGPFieldChange('beneficiary', e.target.value)}
                  placeholder="0x... (Address to receive gas payments)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Address that will receive gas payment fees
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gas Oracle Address (Optional)
                </label>
                <input
                  type="text"
                  value={gasOracle}
                  onChange={(e) => handleIGPFieldChange('gasOracle', e.target.value)}
                  placeholder="0x... (Gas oracle contract address)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Contract that provides gas price data for destination chains
                </p>
              </div>
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
