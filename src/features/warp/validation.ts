import { z } from 'zod';
import type { WarpConfig } from './types';

/**
 * Base warp config schema with common fields
 */
const baseWarpSchema = z.object({
  owner: z.string().min(1, 'Owner address is required'),
  mailbox: z.string().min(1, 'Mailbox address is required'),
  interchainSecurityModule: z.union([z.string(), z.any()]).optional(),
  hook: z.union([z.string(), z.any()]).optional(),
  remoteRouters: z
    .record(
      z.object({
        address: z.string().min(1, 'Router address is required'),
      })
    )
    .optional(),
  destinationGas: z.record(z.string()).optional(),
});

/**
 * Collateral warp route schema
 */
const collateralWarpSchema = baseWarpSchema.extend({
  type: z.literal('collateral'),
  token: z.string().min(1, 'Token address is required for collateral warp routes'),
});

/**
 * Synthetic warp route schema
 */
const syntheticWarpSchema = baseWarpSchema.extend({
  type: z.literal('synthetic'),
  name: z.string().optional(),
  symbol: z.string().optional(),
  decimals: z.number().min(0).max(18).optional(),
});

/**
 * Native warp route schema
 */
const nativeWarpSchema = baseWarpSchema.extend({
  type: z.literal('native'),
});

/**
 * Union schema for all warp route types
 */
export const warpConfigSchema = z.discriminatedUnion('type', [
  collateralWarpSchema,
  syntheticWarpSchema,
  nativeWarpSchema,
]);

/**
 * Validate warp route configuration
 * @throws {z.ZodError} if validation fails
 */
export function validateWarpConfig(config: unknown): WarpConfig {
  return warpConfigSchema.parse(config);
}

/**
 * Safe validation that returns error message instead of throwing
 */
export function validateWarpConfigSafe(config: unknown): {
  success: boolean;
  data?: WarpConfig;
  error?: string;
} {
  const result = warpConfigSchema.safeParse(config);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const firstError = result.error.errors[0];
  const errorMessage = firstError
    ? `${firstError.path.join('.')}: ${firstError.message}`
    : 'Invalid warp route configuration';

  return { success: false, error: errorMessage };
}
