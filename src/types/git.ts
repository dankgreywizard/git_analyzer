/**
 * Represents a single Git operation entry in the history.
 */
export interface GitEntry {
  /** Unique identifier for the operation */
  id: string;
  /** Timestamp of when the operation occurred */
  time: number;
  /** The operation name (e.g., 'clone', 'commit', 'push') */
  op: string;
  /** The original request parameters */
  request: any;
  /** The status of the operation */
  status: 'success' | 'error';
  /** The data returned from a successful operation */
  data?: any;
  /** The error message if the operation failed */
  error?: string;
}
