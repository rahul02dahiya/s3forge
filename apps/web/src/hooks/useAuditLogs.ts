import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';
import type { components } from '../lib/api/schema';

export type AuditLogResponse = components['schemas']['AuditLogResponse'];

export function useAuditLogs(page = 1, limit = 50, action?: string) {
  return useQuery({
    queryKey: ['audit-logs', page, limit, action],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/audit-logs', {
        params: {
          query: {
            page: String(page),
            limit: String(limit),
            ...(action ? { action } : {}),
          },
        },
      });

      if (error) {
        throw new Error((error as any)?.message || 'Failed to fetch audit logs');
      }

      return data!;
    },
  });
}
