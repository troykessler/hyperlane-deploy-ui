import { useMemo } from 'react';
import { dump as dumpYaml } from 'js-yaml';
import type { WarpConfig } from './types';

interface WarpConfigPreviewProps {
  config: WarpConfig;
}

export function WarpConfigPreview({ config }: WarpConfigPreviewProps) {
  const yamlText = useMemo(() => {
    try {
      return dumpYaml(config, {
        indent: 2,
        lineWidth: 120,
        noRefs: true,
      });
    } catch (error) {
      return 'Error serializing config';
    }
  }, [config]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">Configuration Preview</label>
        <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
          {config.type.toUpperCase()}
        </span>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <pre className="p-4 bg-gray-50 text-xs font-mono overflow-x-auto max-h-96">
          {yamlText}
        </pre>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="p-2 bg-gray-50 border border-gray-200 rounded">
          <div className="text-gray-600 font-medium">Owner</div>
          <code className="text-gray-900">{config.owner || 'Not set'}</code>
        </div>
        <div className="p-2 bg-gray-50 border border-gray-200 rounded">
          <div className="text-gray-600 font-medium">Mailbox</div>
          <code className="text-gray-900">{config.mailbox || 'Not set'}</code>
        </div>
        {config.type === 'collateral' && (
          <div className="p-2 bg-gray-50 border border-gray-200 rounded col-span-2">
            <div className="text-gray-600 font-medium">Token Address</div>
            <code className="text-gray-900">{config.token}</code>
          </div>
        )}
        {config.type === 'synthetic' && (
          <>
            {config.name && (
              <div className="p-2 bg-gray-50 border border-gray-200 rounded">
                <div className="text-gray-600 font-medium">Token Name</div>
                <div className="text-gray-900">{config.name}</div>
              </div>
            )}
            {config.symbol && (
              <div className="p-2 bg-gray-50 border border-gray-200 rounded">
                <div className="text-gray-600 font-medium">Symbol</div>
                <div className="text-gray-900">{config.symbol}</div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
