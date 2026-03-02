import { useState, useEffect } from 'react';
import { ChainName } from '@hyperlane-xyz/sdk';
import { DeployedCoreAddresses } from '@hyperlane-xyz/provider-sdk/core';
import { useStore } from '../../features/store';

interface CoreConfigSelectorProps {
  chainName: ChainName;
  onSelect: (mailbox: string, addresses?: DeployedCoreAddresses) => void;
  selectedMailbox?: string;
}

/**
 * Component to list and select from available core deployments for a chain
 * Shows deployments from both:
 * 1. Registry (official Hyperlane deployments)
 * 2. Local deployments (user's previous deployments)
 */
export function CoreConfigSelector({
  chainName,
  onSelect,
  selectedMailbox,
}: CoreConfigSelectorProps) {
  const { registry, deployments } = useStore();
  const [registryAddresses, setRegistryAddresses] = useState<DeployedCoreAddresses | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch registry addresses for the chain
  useEffect(() => {
    if (!chainName) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // Try to get addresses from registry
    const getAddresses = async () => {
      try {
        const addresses = await registry?.getChainAddresses(chainName);
        if (addresses && addresses.mailbox) {
          setRegistryAddresses(addresses as DeployedCoreAddresses);
        } else {
          setRegistryAddresses(null);
        }
      } catch (error) {
        console.warn(`No registry addresses found for ${chainName}:`, error);
        setRegistryAddresses(null);
      } finally {
        setLoading(false);
      }
    };

    getAddresses();
  }, [chainName, registry]);

  // Get local deployments for this chain
  const localDeployments = deployments.filter((d) => d.chainName === chainName);

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-600">Loading available core configs...</p>
      </div>
    );
  }

  const hasRegistry = registryAddresses && registryAddresses.mailbox;
  const hasLocal = localDeployments.length > 0;

  if (!hasRegistry && !hasLocal) {
    return (
      <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
        <p className="text-sm text-amber-800">
          No core deployments found for <strong>{chainName}</strong>.
          <br />
          You can enter a mailbox address manually below to read an existing deployment.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Select Core Deployment
      </label>

      {(hasRegistry || hasLocal) && (
        <p className="text-xs text-gray-600">
          Select a deployment to automatically read its configuration. If reading fails, you can manually enter the mailbox address below.
        </p>
      )}

      {/* Registry Deployment */}
      {hasRegistry && (
        <button
          onClick={() => onSelect(registryAddresses.mailbox, registryAddresses)}
          className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
            selectedMailbox === registryAddresses.mailbox
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-900">Official Registry Deployment</span>
                <span className="px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                  REGISTRY
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Mailbox: <code className="bg-gray-100 px-1 rounded">{registryAddresses.mailbox}</code>
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Note: Registry deployments may be outdated and not fully readable with the current SDK
              </p>
            </div>
          </div>
        </button>
      )}

      {/* Local Deployments */}
      {hasLocal && (
        <div className="space-y-2">
          {localDeployments.map((deployment) => (
            <button
              key={deployment.id}
              onClick={() => onSelect(deployment.addresses.mailbox, deployment.addresses)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                selectedMailbox === deployment.addresses.mailbox
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      Local Deployment
                    </span>
                    <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-800 rounded">
                      LOCAL
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Deployed: {new Date(deployment.timestamp).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-500">
                    Mailbox: <code className="bg-gray-100 px-1 rounded">{deployment.addresses.mailbox}</code>
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
