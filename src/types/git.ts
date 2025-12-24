export interface GitEntry {
  id: string;
  time: number;
  op: string;
  request: any;
  status: 'success' | 'error';
  data?: any;
  error?: string;
}
