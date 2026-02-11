import { useState, useCallback } from 'react';
import { load as parseYaml } from 'js-yaml';
import { logger } from '../../utils/logger';
import { validateWarpConfig } from './validation';
import type { WarpConfig } from './types';

interface WarpConfigUploadProps {
  onConfigLoaded: (config: WarpConfig) => void;
  onError: (error: string) => void;
}

export function WarpConfigUpload({ onConfigLoaded, onError }: WarpConfigUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      try {
        setFileName(file.name);
        const text = await file.text();

        // Parse YAML
        const parsed = parseYaml(text);

        // Validate warp config
        const config = validateWarpConfig(parsed);

        onConfigLoaded(config);
      } catch (error) {
        logger.error('Failed to parse warp config file', error);
        onError(error instanceof Error ? error.message : 'Failed to parse config');
        setFileName(null);
      }
    },
    [onConfigLoaded, onError]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const files = Array.from(e.dataTransfer.files);
      const yamlFile = files.find((f) => f.name.endsWith('.yaml') || f.name.endsWith('.yml'));

      if (!yamlFile) {
        onError('Please upload a YAML file (.yaml or .yml)');
        return;
      }

      handleFile(yamlFile);
    },
    [handleFile, onError]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center transition-colors
          ${
            isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 bg-gray-50 hover:border-gray-400'
          }
        `}
      >
        <div className="space-y-4">
          <div className="text-4xl">📄</div>
          <div>
            <p className="text-lg font-medium text-gray-700">
              {fileName ? fileName : 'Drop warp-route-config.yaml here'}
            </p>
            <p className="text-sm text-gray-500 mt-1">or click to browse</p>
          </div>
          <input
            type="file"
            accept=".yaml,.yml"
            onChange={handleFileInput}
            className="hidden"
            id="warp-config-file-input"
          />
          <label
            htmlFor="warp-config-file-input"
            className="inline-block px-6 py-2 bg-blue-600 text-white rounded-lg font-medium cursor-pointer hover:bg-blue-700 transition-colors"
          >
            Browse Files
          </label>
        </div>
      </div>

      {fileName && (
        <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-green-600">✓</span>
            <span className="text-sm text-green-800">Config loaded: {fileName}</span>
          </div>
          <button
            onClick={() => {
              setFileName(null);
              onError('');
            }}
            className="text-sm text-green-600 hover:text-green-800"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
