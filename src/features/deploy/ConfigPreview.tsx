import { CoreConfig } from '@hyperlane-xyz/provider-sdk/core';
import { serializeConfigToYaml } from '../../utils/yaml';

interface ConfigPreviewProps {
  config: CoreConfig;
}

export function ConfigPreview({ config }: ConfigPreviewProps) {
  const yamlContent = serializeConfigToYaml(config);

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-gray-700">Configuration Preview</h3>
      <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
        {yamlContent}
      </pre>
    </div>
  );
}
