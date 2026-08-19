import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';

export function useStorageUsage() {
  return useQuery({
    queryKey: ['storage-usage'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/storage/usage');

      if (error) {
        throw error;
      }

      return data;
    },
  });
}
