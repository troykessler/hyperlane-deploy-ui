interface CoreBaseFieldsProps {
  owner: string;
  onChange: (value: string) => void;
}

export function CoreBaseFields({ owner, onChange }: CoreBaseFieldsProps) {
  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="owner" className="block text-sm font-medium text-gray-700 mb-2">
          Owner Address <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          id="owner"
          value={owner}
          onChange={(e) => onChange(e.target.value)}
          placeholder="0x..."
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          Address that will own the core contracts and have admin privileges
        </p>
      </div>
    </div>
  );
}
