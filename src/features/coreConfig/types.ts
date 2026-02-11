import { CoreConfig } from '@hyperlane-xyz/provider-sdk/core';

export interface ConfigValidationError {
  field: string;
  message: string;
}

export interface ConfigBuilderState {
  config: Partial<CoreConfig>;
  errors: ConfigValidationError[];
  isValid: boolean;
}
