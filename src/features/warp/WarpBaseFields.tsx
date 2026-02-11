interface WarpBaseFieldsProps {
  owner: string;
  mailbox: string;
  onChange: (field: 'owner' | 'mailbox', value: string) => void;
}

export function WarpBaseFields({ owner, mailbox, onChange }: WarpBaseFieldsProps) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="owner" className="block text-sm font-medium text-gray-700 mb-2">
          Owner Address *
        </label>
        <input
          type="text"
          id="owner"
          value={owner}
          onChange={(e) => onChange('owner', e.target.value)}
          placeholder="0x..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          Address that will own and control the warp route contract
        </p>
      </div>

      <div>
        <label htmlFor="mailbox" className="block text-sm font-medium text-gray-700 mb-2">
          Mailbox Address *
        </label>
        <input
          type="text"
          id="mailbox"
          value={mailbox}
          onChange={(e) => onChange('mailbox', e.target.value)}
          placeholder="0x..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          Hyperlane mailbox contract address on this chain
        </p>
      </div>
    </div>
  );
}
