import React from 'react';

export type NavigationPage =
  | 'deploy-core'
  | 'deploy-warp'
  | 'read-core'
  | 'read-warp'
  | 'apply-core'
  | 'apply-warp'
  | 'view-deployments'
  | 'explorer-map'
  | 'manage-chains';

interface NavItem {
  id: NavigationPage;
  label: string;
  icon?: string;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarProps {
  activePage: NavigationPage;
  onNavigate: (page: NavigationPage) => void;
  deploymentCount: number;
  customChainCount: number;
}

export function Sidebar({ activePage, onNavigate, deploymentCount, customChainCount }: SidebarProps) {
  const sections: NavSection[] = [
    {
      title: 'READ',
      items: [
        { id: 'read-core', label: 'Core Config' },
        { id: 'read-warp', label: 'Warp Config' },
      ],
    },
    {
      title: 'DEPLOY',
      items: [
        { id: 'deploy-core', label: 'Core Contracts' },
        { id: 'deploy-warp', label: 'Warp Routes' },
      ],
    },
    {
      title: 'APPLY',
      items: [
        { id: 'apply-core', label: 'Core Updates' },
        { id: 'apply-warp', label: 'Warp Updates' },
      ],
    },
    {
      title: 'MANAGE',
      items: [
        { id: 'view-deployments', label: 'View Deployments' },
        { id: 'manage-chains', label: 'Custom Chains' },
      ],
    },
    {
      title: 'EXPLORE',
      items: [
        { id: 'explorer-map', label: 'Warp Routes Map' },
      ],
    },
  ];

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 h-screen overflow-y-auto flex-shrink-0">
      <div className="p-4">
        <h1 className="text-xl font-bold text-gray-900">Hyperlane Deploy</h1>
      </div>

      <nav className="px-3 pb-4">
        {sections.map((section) => (
          <div key={section.title} className="mb-6">
            <h2 className="px-3 mb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {section.title}
            </h2>
            <div className="space-y-1">
              {section.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activePage === item.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span>{item.label}</span>
                    {item.id === 'view-deployments' && deploymentCount > 0 && (
                      <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded-full">
                        {deploymentCount}
                      </span>
                    )}
                    {item.id === 'manage-chains' && customChainCount > 0 && (
                      <span className="px-2 py-0.5 text-xs bg-gray-200 text-gray-700 rounded-full">
                        {customChainCount}
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </div>
  );
}
