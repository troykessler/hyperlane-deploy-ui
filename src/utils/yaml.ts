import { dump, load } from 'js-yaml';
import { CoreConfig } from '@hyperlane-xyz/provider-sdk/core';
import { logger } from './logger';

/**
 * Parse YAML string to CoreConfig
 */
export function parseYamlConfig(yamlString: string): CoreConfig {
  try {
    const parsed = load(yamlString);
    // Basic validation - check required fields exist
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid YAML: must be an object');
    }
    const config = parsed as any;
    if (!config.owner || !config.defaultIsm || !config.defaultHook || !config.requiredHook) {
      throw new Error('Missing required fields: owner, defaultIsm, defaultHook, requiredHook');
    }
    return config as CoreConfig;
  } catch (error) {
    logger.error('Failed to parse YAML config', error);
    throw new Error(`Invalid YAML config: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Serialize CoreConfig to YAML string
 */
export function serializeConfigToYaml(config: CoreConfig): string {
  try {
    return dump(config, {
      indent: 2,
      lineWidth: 120,
      noRefs: true,
    });
  } catch (error) {
    logger.error('Failed to serialize config to YAML', error);
    throw new Error(`Failed to serialize config: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Validate YAML string without parsing
 */
export function validateYaml(yamlString: string): boolean {
  try {
    load(yamlString);
    return true;
  } catch {
    return false;
  }
}
