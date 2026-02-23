import { utils } from 'ethers';

/**
 * Checksum a single Ethereum address
 * Converts lowercase addresses to proper EIP-55 checksummed format
 */
export function checksumAddress(address: string): string {
  try {
    // utils.getAddress will checksum the address and throw if invalid
    return utils.getAddress(address);
  } catch (error) {
    // If address is invalid or not an Ethereum address, return as-is
    console.warn(`Failed to checksum address ${address}:`, error);
    return address;
  }
}

/**
 * Recursively checksum all addresses in an object
 * Handles nested objects and arrays
 */
export function checksumAddresses<T>(obj: T): T {
  if (typeof obj === 'string') {
    // Check if it looks like an Ethereum address (0x followed by 40 hex chars)
    if (/^0x[0-9a-fA-F]{40}$/.test(obj)) {
      return checksumAddress(obj) as any;
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => checksumAddresses(item)) as any;
  }

  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = checksumAddresses(value);
    }
    return result;
  }

  return obj;
}
