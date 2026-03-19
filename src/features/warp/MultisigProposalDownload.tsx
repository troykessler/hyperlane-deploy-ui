import { useState } from 'react';
import { ChainName } from '@hyperlane-xyz/sdk';
import type { SafeTransactionBatch } from './types';

interface MultisigProposalDownloadProps {
  batch: SafeTransactionBatch;
  chainName: ChainName;
  onClose: () => void;
}

/**
 * Component for displaying multisig transactions in easy-to-copy format
 * Shows each transaction with copy buttons for individual fields
 */
export function MultisigProposalDownload({
  batch,
  chainName,
  onClose
}: MultisigProposalDownloadProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  const handleCopy = (text: string, index: number, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setCopiedField(field);
    setTimeout(() => {
      setCopiedIndex(null);
      setCopiedField(null);
    }, 2000);
  };

  const handleCopyJson = () => {
    navigator.clipboard.writeText(JSON.stringify(batch, null, 2));
    setCopiedJson(true);
    setTimeout(() => {
      setCopiedJson(false);
    }, 2000);
  };

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-6 space-y-4">
      {/* Success header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-green-600 rounded-full flex items-center justify-center text-white text-xl">
          ✓
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Transactions Generated
          </h3>
          <p className="text-sm text-gray-600">
            {batch.transactions.length} transaction(s) for {chainName}
          </p>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded p-3">
        <p className="text-xs text-blue-800">
          <strong>For multisig wallets:</strong> Copy the transaction details below and paste them into your multisig wallet interface (Safe, Multisig.xyz, etc.)
        </p>
      </div>

      {/* Copy all as JSON button */}
      <button
        onClick={handleCopyJson}
        className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-lg transition-colors font-medium text-sm"
      >
        {copiedJson ? '✓ Copied All as JSON' : 'Copy All as JSON'}
      </button>

      {/* Transactions list */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {batch.transactions.map((tx, i) => (
          <div key={i} className="bg-white border border-gray-300 rounded-lg p-4">
            <div className="mb-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900">Transaction {i + 1}</span>
                {batch.meta.description && i === 0 && (
                  <span className="text-xs font-normal text-gray-500">
                    {batch.transactions.length} total txs
                  </span>
                )}
              </div>
              {tx.annotation && (
                <p className="text-sm text-gray-600 mt-1">{tx.annotation}</p>
              )}
            </div>

            <div className="space-y-3">
              {/* To Address */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-600">To Address</label>
                  <button
                    onClick={() => handleCopy(tx.to, i, 'to')}
                    className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  >
                    {copiedIndex === i && copiedField === 'to' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <code className="block w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs font-mono break-all">
                  {tx.to}
                </code>
              </div>

              {/* Value */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-600">Value (wei)</label>
                  <button
                    onClick={() => handleCopy(tx.value, i, 'value')}
                    className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  >
                    {copiedIndex === i && copiedField === 'value' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <code className="block w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs font-mono">
                  {tx.value}
                </code>
              </div>

              {/* Data */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-medium text-gray-600">Data (hex)</label>
                  <button
                    onClick={() => handleCopy(tx.data, i, 'data')}
                    className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  >
                    {copiedIndex === i && copiedField === 'data' ? '✓ Copied' : 'Copy'}
                  </button>
                </div>
                <code className="block w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded text-xs font-mono break-all max-h-32 overflow-y-auto">
                  {tx.data}
                </code>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chain ID info */}
      <div className="bg-gray-50 border border-gray-200 rounded p-3">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-600">
            <strong>Chain ID:</strong> {batch.chainId}
          </div>
          <button
            onClick={() => handleCopy(batch.chainId, -1, 'chainId')}
            className="text-xs px-2 py-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
          >
            {copiedIndex === -1 && copiedField === 'chainId' ? '✓ Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Close button */}
      <button
        onClick={onClose}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
      >
        Close
      </button>
    </div>
  );
}
