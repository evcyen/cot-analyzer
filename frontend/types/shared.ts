/**
 * Inspect ModelUsage shape (per model).
 * Shared for batch-level, trace-level, and parsed eval log usage.
 */
export interface ModelUsageEntry {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  input_tokens_cache_write?: number;
  input_tokens_cache_read?: number;
  reasoning_tokens?: number;
  total_cost?: number;
}
