import { useState } from 'react';
import type { IsmConfig } from '@hyperlane-xyz/provider-sdk/ism';

interface WarpIsmConfigFormProps {
  value: IsmConfig | string | undefined;
  onChange: (config: IsmConfig | string | undefined) => void;
}

export function WarpIsmConfigForm({ value, onChange }: WarpIsmConfigFormProps) {
  const [useAddress, setUseAddress] = useState(typeof value === 'string');
  const [ismType, setIsmType] = useState<'merkleRootMultisigIsm' | 'messageIdMultisigIsm' | 'testIsm'>('merkleRootMultisigIsm');

  // Parse existing config
  const existingAddress = typeof value === 'string' ? value : '';
  const existingConfig = typeof value === 'object' ? value : null;

  const [ismAddress, setIsmAddress] = useState(existingAddress);
  const [validators, setValidators] = useState<string[]>(
    existingConfig && 'validators' in existingConfig ? existingConfig.validators : ['']
  );
  const [threshold, setThreshold] = useState(
    existingConfig && 'threshold' in existingConfig ? existingConfig.threshold : 1
  );

  const handleToggle = (checked: boolean) => {
    setUseAddress(checked);
    if (checked) {
      onChange(ismAddress || undefined);
    } else {
      buildAndSetConfig();
    }
  };

  const handleAddressChange = (address: string) => {
    setIsmAddress(address);
    onChange(address || undefined);
  };

  const buildAndSetConfig = () => {
    if (ismType === 'testIsm') {
      onChange({ type: 'testIsm' });
      return;
    }

    const validValidators = validators.filter(v => v.trim() !== '');
    if (validValidators.length === 0) {
      onChange(undefined);
      return;
    }

    const config: IsmConfig = {
      type: ismType,
      validators: validValidators,
      threshold: Math.min(threshold, validValidators.length),
    };
    onChange(config);
  };

  const handleValidatorChange = (index: number, value: string) => {
    const newValidators = [...validators];
    newValidators[index] = value;
    setValidators(newValidators);

    if (!useAddress) {
      setTimeout(buildAndSetConfig, 0);
    }
  };

  const addValidator = () => {
    setValidators([...validators, '']);
  };

  const removeValidator = (index: number) => {
    const newValidators = validators.filter((_, i) => i !== index);
    setValidators(newValidators.length > 0 ? newValidators : ['']);

    if (!useAddress) {
      setTimeout(buildAndSetConfig, 0);
    }
  };

  const handleTypeChange = (type: typeof ismType) => {
    setIsmType(type);
    setTimeout(buildAndSetConfig, 0);
  };

  const handleThresholdChange = (value: number) => {
    setThreshold(value);
    if (!useAddress) {
      setTimeout(buildAndSetConfig, 0);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          Interchain Security Module (Optional)
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={useAddress}
            onChange={(e) => handleToggle(e.target.checked)}
            className="rounded"
          />
          Use existing ISM address
        </label>
      </div>

      {useAddress ? (
        <div>
          <input
            type="text"
            value={ismAddress}
            onChange={(e) => handleAddressChange(e.target.value)}
            placeholder="0x... (ISM contract address)"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-gray-500">
            Address of an existing ISM contract to use for message verification
          </p>
        </div>
      ) : (
        <div className="space-y-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">ISM Type</label>
            <select
              value={ismType}
              onChange={(e) => handleTypeChange(e.target.value as typeof ismType)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="merkleRootMultisigIsm">Merkle Root Multisig ISM</option>
              <option value="messageIdMultisigIsm">Message ID Multisig ISM</option>
              <option value="testIsm">Test ISM (for testing only)</option>
            </select>
          </div>

          {ismType !== 'testIsm' && (
            <>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">Validators</label>
                  <button
                    type="button"
                    onClick={addValidator}
                    className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    + Add Validator
                  </button>
                </div>
                <div className="space-y-2">
                  {validators.map((validator, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={validator}
                        onChange={(e) => handleValidatorChange(index, e.target.value)}
                        placeholder="0x... (validator address)"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm"
                      />
                      {validators.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeValidator(index)}
                          className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Threshold ({threshold} of {validators.filter(v => v.trim()).length})
                </label>
                <input
                  type="number"
                  value={threshold}
                  onChange={(e) => handleThresholdChange(parseInt(e.target.value) || 1)}
                  min="1"
                  max={validators.filter(v => v.trim()).length || 1}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Number of validator signatures required to verify a message
                </p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
