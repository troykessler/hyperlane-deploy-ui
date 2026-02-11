import { XIcon } from '@hyperlane-xyz/widgets';
import { useStore } from '../store';

export function SideBarMenu() {
  const { isSideBarOpen, setIsSideBarOpen, deployments } = useStore((s) => ({
    isSideBarOpen: s.isSideBarOpen,
    setIsSideBarOpen: s.setIsSideBarOpen,
    deployments: s.deployments,
  }));

  const onClose = () => {
    setIsSideBarOpen(false);
  };

  return (
    <div
      className={`fixed right-0 top-0 h-full w-88 bg-white shadow-lg transform transition-transform duration-300 ease-in-out z-30 ${
        isSideBarOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
        <h2 className="text-lg font-medium">Deployment History</h2>
        <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
          <XIcon width={20} height={20} />
        </button>
      </div>
      <div className="p-4">
        {deployments.length === 0 ? (
          <p className="text-gray-500 text-sm">No deployments yet</p>
        ) : (
          <div className="space-y-3">
            {deployments.map((deployment) => (
              <div key={deployment.id} className="border border-gray-200 rounded p-3">
                <div className="text-sm font-medium">{deployment.chainName}</div>
                <div className="text-xs text-gray-500">
                  {new Date(deployment.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
