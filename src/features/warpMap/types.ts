import { ChainName, WarpCoreConfig } from '@hyperlane-xyz/sdk';

export interface GraphNode {
  id: ChainName;
  label: string;
  routeCount: number;
}

export interface GraphLink {
  source: ChainName;
  target: ChainName;
  routeIds: string[];
  configs: WarpCoreConfig[];
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}
