import { useState, useEffect } from 'react';
import type { HookConfig } from '@hyperlane-xyz/provider-sdk/hook';

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

  useEffect(() => {
    if (typeof config === 'string') {
      setHookAddress(config);
    }
  }, [config]);

  const handleToggle = (checked: boolean) => {
    onToggleAddress(checked);
    if (checked) {
      onChange(hookAddress || undefined);
    } else {
      // Default to merkleTreeHook when using config mode
      onChange({ type: 'merkleTreeHook' });
    }
  };

  const handleAddressChange = (value: string) => {
    setHookAddress(value);
    if (useAddress) {
      onChange(value || undefined);
    }
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
            <div className="p-3 bg-gray-100 border border-gray-200 rounded text-sm text-gray-600">
              <strong>Merkle Tree Hook</strong>: Stores a merkle tree of dispatched message IDs. No additional configuration needed.
            </div>
          </div>
        </div>
      )}

      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-800">
          <strong>Hook:</strong> Optional post-dispatch processing. Use the merkle tree hook for standard
          message verification, or provide an existing hook contract address.
        </p>
      </div>
    </div>
  );
}
