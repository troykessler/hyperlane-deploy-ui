import { XIcon, AccountList, ChevronIcon } from '@hyperlane-xyz/widgets';
import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import { useMultiProvider } from '../chains/hooks';
import { useStore } from '../store';

export function SideBarMenu() {
  const multiProvider = useMultiProvider();
  const { isSideBarOpen, setIsSideBarOpen, setShowEnvSelectModal, deployments, resetDeployments } = useStore((s) => ({
    isSideBarOpen: s.isSideBarOpen,
    setIsSideBarOpen: s.setIsSideBarOpen,
    setShowEnvSelectModal: s.setShowEnvSelectModal,
    deployments: s.deployments,
    resetDeployments: s.resetDeployments,
  }));

  const [collapseWallets, setCollapseWallets] = useState(false);
  const [collapseHistory, setCollapseHistory] = useState(false);

  const onClose = () => {
    setIsSideBarOpen(false);
  };

  const onClickConnectWallet = () => {
    setShowEnvSelectModal(true);
  };

  const onCopySuccess = () => {
    toast.success('Address copied to clipboard', { autoClose: 1200 });
  };

  const sortedDeployments = useMemo(
    () => [...deployments].sort((a, b) => b.timestamp - a.timestamp),
    [deployments]
  );

  return (
    <div
      className={`fixed right-0 top-0 h-full w-96 bg-white shadow-2xl transform transition-transform duration-300 ease-in-out z-50 flex flex-col ${
        isSideBarOpen ? 'translate-x-0' : 'translate-x-full'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3 bg-blue-600">
        <h2 className="text-lg font-semibold text-white">Wallet & Activity</h2>
        <button onClick={onClose} className="p-1 rounded hover:bg-blue-700 text-white">
          <XIcon width={20} height={20} />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Connected Wallets Section */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => setCollapseWallets(!collapseWallets)}
            className="w-full flex items-center justify-between bg-blue-50 px-4 py-3 hover:bg-blue-100 transition-colors"
          >
            <span className="text-sm font-medium text-blue-900">Connected Wallets</span>
            <ChevronIcon
              width={16}
              height={16}
              direction={collapseWallets ? 'e' : 's'}
              className="text-blue-600"
            />
          </button>
          {!collapseWallets && (
            <div className="px-3 py-3">
              <AccountList
                multiProvider={multiProvider}
                onClickConnectWallet={onClickConnectWallet}
                onCopySuccess={onCopySuccess}
              />
            </div>
          )}
        </div>

        {/* Deployment History Section */}
        <div className="border-b border-gray-200">
          <button
            onClick={() => setCollapseHistory(!collapseHistory)}
            className="w-full flex items-center justify-between bg-blue-50 px-4 py-3 hover:bg-blue-100 transition-colors"
          >
            <span className="text-sm font-medium text-blue-900">
              Deployment History ({deployments.length})
            </span>
            <ChevronIcon
              width={16}
              height={16}
              direction={collapseHistory ? 'e' : 's'}
              className="text-blue-600"
            />
          </button>
          {!collapseHistory && (
            <div className="px-4 py-3">
              {sortedDeployments.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No deployments yet</p>
              ) : (
                <div className="space-y-2">
                  {sortedDeployments.map((deployment) => (
                    <div
                      key={deployment.id}
                      className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900">
                              {deployment.chainName}
                            </span>
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              deployment.status === 'success'
                                ? 'bg-green-100 text-green-700'
                                : deployment.status === 'failed'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}>
                              {deployment.status}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(deployment.timestamp).toLocaleString()}
                          </div>
                          {deployment.type && (
                            <div className="text-xs text-gray-600 mt-1">
                              Type: {deployment.type}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      {deployments.length > 0 && (
        <div className="border-t border-gray-200 px-4 py-3 bg-gray-50">
          <button
            onClick={() => {
              if (window.confirm('Are you sure you want to reset deployment history?')) {
                resetDeployments();
                toast.success('Deployment history cleared');
              }
            }}
            className="w-full px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors border border-red-200"
          >
            Reset Deployment History
          </button>
        </div>
      )}
    </div>
  );
}
