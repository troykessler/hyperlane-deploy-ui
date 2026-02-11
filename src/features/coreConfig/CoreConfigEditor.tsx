import { useState, useEffect } from 'react';
import { CoreConfig } from '@hyperlane-xyz/provider-sdk/core';
import { serializeYamlConfig, parseYamlConfig } from '../../utils/yaml';

interface CoreConfigEditorProps {
  initialConfig: CoreConfig | null;
  onChange: (config: CoreConfig | null) => void;
  onError: (error: string) => void;
}

export function CoreConfigEditor({ initialConfig, onChange, onError }: CoreConfigEditorProps) {
  const [yamlText, setYamlText] = useState('');
  const [parseError, setParseError] = useState<string>('');

  // Initialize YAML text from config
  useEffect(() => {
    if (initialConfig) {
      try {
        const serialized = serializeYamlConfig(initialConfig);
        setYamlText(serialized);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to serialize config';
        setParseError(message);
        onError(message);
      }
    }
  }, [initialConfig, onError]);

  const handleYamlChange = (newText: string) => {
    setYamlText(newText);
    setParseError('');

    // Try to parse on every change
    if (!newText.trim()) {
      onChange(null);
      return;
    }

    try {
      const parsed = parseYamlConfig(newText);
      onChange(parsed);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid YAML';
      setParseError(message);
      onError(message);
      onChange(null);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          Core Configuration (YAML)
        </label>
        {parseError && (
          <span className="text-xs text-red-600">{parseError}</span>
        )}
      </div>

      <textarea
        value={yamlText}
        onChange={(e) => handleYamlChange(e.target.value)}
        className={`w-full h-96 px-3 py-2 font-mono text-sm border rounded-lg focus:outline-none focus:ring-2 ${
          parseError
            ? 'border-red-300 focus:ring-red-500'
            : 'border-gray-300 focus:ring-blue-500'
        }`}
        placeholder="Edit your core configuration here..."
        spellCheck={false}
      />

      <div className="text-xs text-gray-500">
        Edit the YAML configuration above. Changes are validated in real-time.
      </div>
    </div>
  );
}
