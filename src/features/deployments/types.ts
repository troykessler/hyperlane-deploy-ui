import { DeploymentRecord } from '../store';

export type { DeploymentRecord };

export interface DeploymentFilter {
  chainName?: string;
  dateFrom?: number;
  dateTo?: number;
}
