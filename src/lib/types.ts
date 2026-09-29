export interface User {
  id: string;
  name: string;
  role: 'CEO' | 'Accountant' | 'Manager' | 'Agent';
  title: string;
  initials: string;
  office: string;
  agentId?: string;
}

export interface NavTab {
  id: string;
  label: string;
  need?: string;
}

export interface NavSection {
  id: string;
  label: string;
  u: string;
  icon: string;
  group: string;
  tabs: NavTab[];
}

export interface DateRange {
  key: string;
  label: string;
  start: Date;
  end: Date;
}

export interface Filters {
  project: string;
  agent: string;
  office: string;
  type: string;
  status: string;
  payStatus: string;
  propIds?: string[];
}

export interface TableColumn<T = any> {
  key: string;
  label: string;
  a?: 'r';
  cls?: string;
  sum?: boolean;
  render?: (row: T) => React.ReactNode;
}

export interface ModalState {
  id: 'property' | 'sale' | 'expense' | 'payment';
  values: Record<string, any>;
  errors: Record<string, string>;
}

export interface MenuState {
  id: string;
  x: number;
  y: number;
}
