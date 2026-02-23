import { useState } from 'react';
import { DeployedCoreAddresses } from '@hyperlane-xyz/provider-sdk/core';

interface DeploymentAddressesProps {
  addresses: DeployedCoreAddresses;
  chainName: string;
}

/**
 * Component to display deployed contract addresses in YAML format
 * Similar to the CLI output format
 */
export function DeploymentAddresses({ addresses, chainName }: DeploymentAddressesProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // Convert addresses object to YAML string
  const toYAML = () => {
    const lines: string[] = [];

    // Sort keys alphabetically for consistent output
    const sortedKeys = Object.keys(addresses).sort();

    for (const key of sortedKeys) {
      const value = (addresses as any)[key];
      if (value) {
        lines.push(`${key}: "${value}"`);
      } else {
        lines.push(`${key}: ""`);
      }
    }

    return lines.join('\n');
  };

  const handleCopyYAML = async () => {
    try {
      await navigator.clipboard.writeText(toYAML());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy to clipboard', error);
    }
  };

  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-xs font-medium text-blue-600 hover:text-blue-700"
        >
          {isExpanded ? '▼ Hide' : '▶ Show'} All Addresses ({Object.keys(addresses).length})
        </button>
        {isExpanded && (
          <button
            onClick={handleCopyYAML}
            className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy YAML'}
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <pre className="text-xs font-mono text-gray-800 overflow-x-auto whitespace-pre">
            {toYAML()}
          </pre>
        </div>
      )}
    </div>
  );
}
