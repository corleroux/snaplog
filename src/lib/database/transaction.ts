/**
 * Database Transaction Utilities
 *
 * This module provides transaction-related utilities for multi-record operations.
 *
 * IMPORTANT: Supabase Postgres stored procedures (like commit_vendor and commit_fabric_style)
 * already run within a single database transaction. The entire plpgsql block is atomic -
 * if any error occurs, all changes are rolled back automatically.
 *
 * For client-side multi-record operations, use Supabase RPC to call stored procedures,
 * or create new stored procedures for complex operations.
 */

import { supabase } from '@/lib/supabase/client'
import { createLogger } from '@/lib/logger'

const logger = createLogger('Transaction')

/**
 * Transaction result type
 */
export interface TransactionResult<T> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Execute multiple operations in a "pseudo-transaction" by calling a stored procedure.
 *
 * Note: Client-side cannot directly manage Postgres transactions. Use this pattern:
 * 1. Create a stored procedure that does all work in one plpgsql block (atomic)
 * 2. Call the stored procedure via RPC
 * 3. The stored procedure's entire execution is a single transaction
 *
 * @param functionName - Name of the stored procedure to call
 * @param params - Parameters to pass to the stored procedure
 * @returns Transaction result with data or error
 */
export async function executeTransaction<T>(
  functionName: string,
  params: Record<string, unknown> = {}
): Promise<TransactionResult<T>> {
  try {
    const { data, error } = await supabase.rpc(functionName, params)

    if (error) {
      logger.error('Transaction failed', { function: functionName, error: error.message })
      return { success: false, error: error.message }
    }

    return { success: true, data: data as T }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    logger.error('Transaction error', { function: functionName, error: message })
    return { success: false, error: message }
  }
}

/**
 * Execute a batch of operations via RPC, failing fast if any error occurs.
 *
 * This is NOT a true transaction - each RPC call is its own transaction.
 * Use this only when operations are independent and can be rolled back manually.
 *
 * For true multi-table transactions, create a stored procedure that does all work.
 */
export async function executeBatch<T>(
  operations: Array<{ functionName: string; params: Record<string, unknown> }>
): Promise<TransactionResult<T[]>> {
  const results: T[] = []

  for (const operation of operations) {
    const result = await executeTransaction<T>(operation.functionName, operation.params)

    if (!result.success) {
      // Rollback would need to be implemented based on operation type
      logger.error('Batch operation failed', {
        function: operation.functionName,
        error: result.error,
      })
      return { success: false, error: `Batch failed at ${operation.functionName}: ${result.error}` }
    }

    if (result.data) {
      results.push(result.data)
    }
  }

  return { success: true, data: results }
}

/**
 * Existing transactional stored procedures:
 *
 * commit_vendor(p_event_id, p_company_name, p_booth_number, ...)
 *   - Creates vendor record
 *   - Updates scan session
 *   - Creates audit log entry
 *   - All in one atomic transaction
 *
 * commit_fabric_style(p_event_id, p_vendor_id, p_item_code, ...)
 *   - Creates fabric_style record
 *   - Updates scan session
 *   - Creates audit log entry
 *   - All in one atomic transaction
 *
 * To add new transactional operations:
 * 1. Create a stored procedure in supabase/migrations/
 * 2. Use the plpgsql LANGUAGE for automatic transaction handling
 * 3. Call via supabase.rpc() from client code
 */

// ============================================================================
// BATCH OPERATIONS WITH CLEANUP
// ============================================================================

/**
 * Execute a batch of operations with automatic cleanup on failure.
 *
 * This function executes operations in sequence and provides a cleanup
 * function that can undo completed operations if a later one fails.
 *
 * @param operations - Array of operations to execute
 * @param cleanupFn - Function that cleans up completed operations on failure
 * @returns Transaction result with all results or error
 */
export async function executeBatchWithCleanup<T>(
  operations: Array<{ fn: () => Promise<T>; undoFn?: (result: T) => Promise<void> }>,
  cleanupFn?: (results: Array<{ result: T; undoFn?: (result: T) => Promise<void> }>) => Promise<void>
): Promise<TransactionResult<T[]>> {
  const completed: Array<{ result: T; undoFn?: (result: T) => Promise<void> }> = []

  for (const operation of operations) {
    try {
      const result = await operation.fn()
      completed.push({ result, undoFn: operation.undoFn })
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err))
      logger.error('Batch operation failed', { error: error.message, completed: completed.length })

      // Cleanup completed operations
      if (cleanupFn) {
        try {
          await cleanupFn(completed)
        } catch (cleanupError) {
          logger.error('Batch cleanup failed', { error: cleanupError instanceof Error ? cleanupError.message : String(cleanupError) })
        }
      }

      return { success: false, error: `Batch failed: ${error.message}` }
    }
  }

  const results = completed.map((c) => c.result)
  return { success: true, data: results }
}

/**
 * Creates multiple records in a table atomically via RPC.
 *
 * @param tableName - Name of the table
 * @param records - Array of records to insert
 * @returns Created records or error
 */
export async function createRecords<T>(
  tableName: string,
  records: Array<Record<string, unknown>>
): Promise<TransactionResult<T[]>> {
  return executeTransaction<T[]>(
    'bulk_insert_records',
    {
      p_table_name: tableName,
      p_records: JSON.stringify(records),
    }
  )
}

/**
 * Updates multiple records in a table atomically via RPC.
 *
 * @param tableName - Name of the table
 * @param ids - Array of record IDs to update
 * @param updates - Update payload to apply to all records
 * @returns Updated records or error
 */
export async function updateRecords<T>(
  tableName: string,
  ids: string[],
  updates: Record<string, unknown>
): Promise<TransactionResult<T[]>> {
  return executeTransaction<T[]>(
    'bulk_update_records',
    {
      p_table_name: tableName,
      p_ids: ids,
      p_updates: JSON.stringify(updates),
    }
  )
}

/**
 * Deletes multiple records from a table atomically via RPC.
 *
 * @param tableName - Name of the table
 * @param ids - Array of record IDs to delete
 * @returns Deleted count or error
 */
export async function deleteRecords(
  tableName: string,
  ids: string[]
): Promise<TransactionResult<number>> {
  return executeTransaction<number>(
    'bulk_delete_records',
    {
      p_table_name: tableName,
      p_ids: ids,
    }
  )
}
