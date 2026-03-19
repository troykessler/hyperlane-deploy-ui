import { ChainName } from '@hyperlane-xyz/sdk';

/**
 * Download JSON data as a file
 * @param data - Any JSON-serializable data
 * @param filename - Name of the file to download
 */
export function downloadJSON(data: any, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL object
  URL.revokeObjectURL(url);
}

/**
 * Generate standardized filename for warp multisig proposals
 * Format: warp-multisig-{chainName}-{timestamp}.json
 * @param chainName - Chain name for the proposal
 * @returns Filename string
 */
export function generateWarpMultisigFilename(chainName: ChainName): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  return `warp-multisig-${chainName}-${timestamp}.json`;
}
