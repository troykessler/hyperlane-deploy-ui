import { useState, useEffect } from 'react';
import { ChainName } from '@hyperlane-xyz/sdk';
import { CoreConfig } from '@hyperlane-xyz/provider-sdk/core';
import type { IsmConfig } from '@hyperlane-xyz/provider-sdk/ism';
import type { HookConfig } from '@hyperlane-xyz/provider-sdk/hook';
import { CoreBaseFields } from './CoreBaseFields';
import { WarpIsmConfigForm } from '../warp/WarpIsmConfigForm';
import { WarpHookConfigForm } from '../warp/WarpHookConfigForm';

interface CoreFormBuilderProps {
  chainName?: ChainName;
  initialConfig?: CoreConfig | null;
  onChange: (config: CoreConfig | null) => void;
}

export function CoreFormBuilder({ chainName, initialConfig, onChange }: CoreFormBuilderProps) {
  const [owner, setOwner] = useState(initialConfig?.owner || '');
  const [defaultIsm, setDefaultIsm] = useState<IsmConfig | string | undefined>(
    initialConfig?.defaultIsm
  );
  const [defaultHook, setDefaultHook] = useState<HookConfig | string | undefined>(
    initialConfig?.defaultHook
  );
  const [requiredHook, setRequiredHook] = useState<HookConfig | string | undefined>(
    initialConfig?.requiredHook
  );

  const [defaultHookUseAddress, setDefaultHookUseAddress] = useState(
    typeof initialConfig?.defaultHook === 'string'
  );
  const [requiredHookUseAddress, setRequiredHookUseAddress] = useState(
    typeof initialConfig?.requiredHook === 'string'
  );

  // Build config whenever fields change
  useEffect(() => {
    if (!owner || !defaultIsm || !defaultHook || !requiredHook) {
      onChange(null);
      return;
    }

    const config: CoreConfig = {
      owner,
      defaultIsm,
      defaultHook,
      requiredHook,
    };

    onChange(config);
  }, [owner, defaultIsm, defaultHook, requiredHook, onChange]);

  return (
    <div className="space-y-6">
      {/* Step 1: Basic Configuration */}
      <div className="p-6 border border-gray-200 rounded-lg bg-white">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">1. Basic Configuration</h3>
        <CoreBaseFields owner={owner} onChange={setOwner} chainName={chainName} />
      </div>

      {/* Step 2: Default ISM */}
      <div className="p-6 border border-gray-200 rounded-lg bg-white">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          2. Default Interchain Security Module (ISM)
        </h3>
        <WarpIsmConfigForm value={defaultIsm} onChange={setDefaultIsm} />
      </div>

      {/* Step 3: Default Hook */}
      <div className="p-6 border border-gray-200 rounded-lg bg-white">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">3. Default Hook</h3>
        <WarpHookConfigForm
          config={defaultHook}
          onChange={setDefaultHook}
          useAddress={defaultHookUseAddress}
          onToggleAddress={setDefaultHookUseAddress}
        />
      </div>

      {/* Step 4: Required Hook */}
      <div className="p-6 border border-gray-200 rounded-lg bg-white">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">4. Required Hook</h3>
        <WarpHookConfigForm
          config={requiredHook}
          onChange={setRequiredHook}
          useAddress={requiredHookUseAddress}
          onToggleAddress={setRequiredHookUseAddress}
        />
      </div>
    </div>
  );
}
