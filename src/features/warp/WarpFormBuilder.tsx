import { useState, useEffect } from 'react';
import { ChainName } from '@hyperlane-xyz/sdk';
import { WarpTokenTypeSelector } from './WarpTokenTypeSelector';
import { WarpBaseFields } from './WarpBaseFields';
import { WarpCollateralFields } from './WarpCollateralFields';
import { WarpSyntheticFields } from './WarpSyntheticFields';
import { WarpIsmConfigForm } from './WarpIsmConfigForm';
import { WarpHookConfigForm } from './WarpHookConfigForm';
import { WarpRemoteRoutersEditor } from './WarpRemoteRoutersEditor';
import { WarpDestinationGasEditor } from './WarpDestinationGasEditor';
import type { WarpConfig, WarpTokenType, RemoteRouters, DestinationGas } from './types';
import type { IsmConfig } from '@hyperlane-xyz/provider-sdk/ism';
import type { HookConfig } from '@hyperlane-xyz/provider-sdk/hook';

interface WarpFormBuilderProps {
  chainName: ChainName;
  initialConfig?: WarpConfig | null;
  onChange: (config: WarpConfig | null) => void;
}

export function WarpFormBuilder({ chainName, initialConfig, onChange }: WarpFormBuilderProps) {
  const [tokenType, setTokenType] = useState<WarpTokenType>(
    initialConfig?.type || 'collateral'
  );
  const [owner, setOwner] = useState(initialConfig?.owner || '');
  const [mailbox, setMailbox] = useState(initialConfig?.mailbox || '');

  // Collateral fields
  const [token, setToken] = useState(
    initialConfig?.type === 'collateral' ? initialConfig.token : ''
  );

  // Synthetic fields
  const [name, setName] = useState(
    initialConfig?.type === 'synthetic' ? initialConfig.name || '' : ''
  );
  const [symbol, setSymbol] = useState(
    initialConfig?.type === 'synthetic' ? initialConfig.symbol || '' : ''
  );
  const [decimals, setDecimals] = useState(
    initialConfig?.type === 'synthetic' ? initialConfig.decimals || 18 : 18
  );

  // Advanced fields
  const [ism, setIsm] = useState<IsmConfig | string | undefined>(
    initialConfig?.interchainSecurityModule
  );
  const [hook, setHook] = useState<HookConfig | string | undefined>(initialConfig?.hook);
  const [hookUseAddress, setHookUseAddress] = useState(typeof initialConfig?.hook === 'string');
  const [remoteRouters, setRemoteRouters] = useState<RemoteRouters | undefined>(
    initialConfig?.remoteRouters
  );
  const [destinationGas, setDestinationGas] = useState<DestinationGas | undefined>(
    initialConfig?.destinationGas
  );

  const [showAdvanced, setShowAdvanced] = useState(false);

  // Build config whenever fields change
  useEffect(() => {
    if (!owner || !mailbox) {
      onChange(null);
      return;
    }

    let config: WarpConfig | null = null;

    const baseConfig = {
      owner,
      mailbox,
      ...(ism && { interchainSecurityModule: ism }),
      ...(hook && { hook }),
      ...(remoteRouters && { remoteRouters }),
      ...(destinationGas && { destinationGas }),
    };

    switch (tokenType) {
      case 'collateral':
        if (token) {
          config = {
            ...baseConfig,
            type: 'collateral',
            token,
          };
        }
        break;

      case 'synthetic':
        config = {
          ...baseConfig,
          type: 'synthetic',
          ...(name && { name }),
          ...(symbol && { symbol }),
          ...(decimals !== undefined && { decimals }),
        };
        break;

      case 'native':
        config = {
          ...baseConfig,
          type: 'native',
        };
        break;
    }

    onChange(config);
  }, [
    tokenType,
    owner,
    mailbox,
    token,
    name,
    symbol,
    decimals,
    ism,
    hook,
    remoteRouters,
    destinationGas,
    onChange,
  ]);

  const handleBaseFieldChange = (field: 'owner' | 'mailbox', value: string) => {
    if (field === 'owner') setOwner(value);
    else setMailbox(value);
  };

  const handleSyntheticFieldChange = (
    field: 'name' | 'symbol' | 'decimals',
    value: string | number
  ) => {
    if (field === 'name') setName(value as string);
    else if (field === 'symbol') setSymbol(value as string);
    else setDecimals(value as number);
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Token Type */}
      <div className="p-6 border border-gray-200 rounded-lg bg-white">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">1. Select Token Type</h3>
        <WarpTokenTypeSelector value={tokenType} onChange={setTokenType} />
      </div>

      {/* Step 2: Basic Configuration */}
      <div className="p-6 border border-gray-200 rounded-lg bg-white">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">2. Basic Configuration</h3>
        <WarpBaseFields owner={owner} mailbox={mailbox} onChange={handleBaseFieldChange} />
      </div>

      {/* Step 3: Token-Specific Configuration */}
      <div className="p-6 border border-gray-200 rounded-lg bg-white">
        <h3 className="text-sm font-semibold text-gray-900 mb-4">
          3. Token Configuration
        </h3>

        {tokenType === 'collateral' && (
          <WarpCollateralFields chainName={chainName} token={token} onChange={setToken} />
        )}

        {tokenType === 'synthetic' && (
          <WarpSyntheticFields
            name={name}
            symbol={symbol}
            decimals={decimals}
            onChange={handleSyntheticFieldChange}
          />
        )}

        {tokenType === 'native' && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>Native Token:</strong> This warp route will wrap the native gas token (e.g.,
              ETH, MATIC) on this chain for cross-chain transfer. No additional configuration
              needed.
            </p>
          </div>
        )}
      </div>

      {/* Step 4: Advanced Configuration (Collapsible) */}
      <div className="border border-gray-200 rounded-lg bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="w-full p-6 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <h3 className="text-sm font-semibold text-gray-900">
            4. Advanced Configuration (Optional)
          </h3>
          <span className="text-gray-500">
            {showAdvanced ? '▼' : '▶'}
          </span>
        </button>

        {showAdvanced && (
          <div className="p-6 pt-0 space-y-6 border-t border-gray-200">
            <WarpIsmConfigForm value={ism} onChange={setIsm} />
            <WarpHookConfigForm
              config={hook}
              onChange={setHook}
              useAddress={hookUseAddress}
              onToggleAddress={setHookUseAddress}
            />
            <WarpRemoteRoutersEditor
              value={remoteRouters}
              onChange={setRemoteRouters}
              excludeChain={chainName}
            />
            <WarpDestinationGasEditor value={destinationGas} onChange={setDestinationGas} />
          </div>
        )}
      </div>
    </div>
  );
}
