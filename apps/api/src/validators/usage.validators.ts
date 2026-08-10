import { z } from 'zod';
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';

extendZodWithOpenApi(z);

/**
 * Zod schema for usage history query parameters.
 */
export const UsageHistoryQuerySchema = z
  .object({
    limit: z
      .string()
      .optional()
      .transform((val) => (val ? Math.min(100, Math.max(1, parseInt(val, 10))) : 30))
      .openapi({ description: 'Number of historical data points (default: 30)', example: '30' }),
  })
  .openapi('UsageHistoryQuery');

export type UsageHistoryQueryInput = z.infer<typeof UsageHistoryQuerySchema>;
