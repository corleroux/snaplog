/**
 * Database Transaction Utilities
 *
 * Provides transaction support for multi-record operations.
 * Since Supabase client doesn't support true client-side transactions,
 * these utilities use stored procedures (via RPC) which run in database transactions.
 */

export {
  executeTransaction,
  executeBatch,
  executeBatchWithCleanup,
  createRecords,
  updateRecords,
  deleteRecords,
  type TransactionResult,
} from './transaction'
