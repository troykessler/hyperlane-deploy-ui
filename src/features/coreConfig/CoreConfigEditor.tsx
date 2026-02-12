import { useState, useMemo } from 'react';
import { ChainName } from '@hyperlane-xyz/sdk';
import { CoreConfig } from '@hyperlane-xyz/provider-sdk/core';
import { serializeYamlConfig, parseYamlConfig } from '../../utils/yaml';
import { CoreFormBuilder } from '../core/CoreFormBuilder';

interface CoreConfigEditorProps {
  chainName?: ChainName;
  initialConfig: CoreConfig | null;
  onChange: (config: CoreConfig | null) => void;
  onError: (error: string) => void;
}

type EditorMode = 'form' | 'yaml';

export function CoreConfigEditor({ chainName, initialConfig, onChange, onError }: CoreConfigEditorProps) {
  const [editorMode, setEditorMode] = useState<EditorMode>('form');

  // Serialize initial config to YAML
  const initialYaml = useMemo(() => {
    if (!initialConfig) return '';
    try {
      return serializeYamlConfig(initialConfig);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to serialize config';
      onError(message);
      return '';
    }
  }, [initialConfig, onError]);

  const [yamlText, setYamlText] = useState(initialYaml);
  const [parseError, setParseError] = useState<string>('');

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
      {/* Editor Mode Toggle */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">
          Core Configuration
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditorMode('form')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
              editorMode === 'form'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Form
          </button>
          <button
            type="button"
            onClick={() => setEditorMode('yaml')}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
              editorMode === 'yaml'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            YAML
          </button>
        </div>
      </div>

      {/* Form View */}
      {editorMode === 'form' && (
        <CoreFormBuilder chainName={chainName} initialConfig={initialConfig} onChange={onChange} />
      )}

      {/* YAML View */}
      {editorMode === 'yaml' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
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
      )}
    </div>
  );
}
