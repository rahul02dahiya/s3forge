import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';
import type { components } from '../lib/api/schema';

export type CreateBucketRequest = components['schemas']['CreateBucketRequest'];

export function useBuckets(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['buckets', page, limit],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/storage/buckets', {
        params: {
          query: {
            page,
            limit,
          },
        },
      });

      if (error) {
        throw error;
      }

      return data;
    },
  });
}

export function useBucket(name: string) {
  return useQuery({
    queryKey: ['buckets', name],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/storage/buckets/{name}', {
        params: {
          path: { name },
        },
      });

      if (error) {
        throw error;
      }

      return data;
    },
    enabled: !!name,
  });
}

export function useBucketUsage(name: string, page = 1, limit = 30) {
  return useQuery({
    queryKey: ['buckets', name, 'usage', page, limit],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/storage/buckets/{name}/usage', {
        params: {
          path: { name },
          query: { page: String(page), limit: String(limit) },
        },
      });

      if (error) {
        throw error;
      }

      return data;
    },
    enabled: !!name,
  });
}

export function useCreateBucket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestBody: CreateBucketRequest) => {
      const { data, error } = await apiClient.POST('/storage/buckets', {
        body: requestBody,
      });

      if (error) {
        throw new Error((error as any)?.message || 'Failed to create bucket');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buckets'] });
      queryClient.invalidateQueries({ queryKey: ['storage-usage'] });
    },
  });
}

export function useUpdateBucket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, visibility, quotaBytes }: { name: string; visibility?: 'private' | 'public'; quotaBytes?: number }) => {
      const { data, error } = await apiClient.PATCH('/storage/buckets/{name}', {
        params: {
          path: { name },
        },
        body: {
          visibility,
          quotaBytes,
        },
      });

      if (error) {
        throw new Error((error as any)?.message || 'Failed to update bucket');
      }

      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['buckets'] });
      queryClient.invalidateQueries({ queryKey: ['buckets', variables.name] });
      queryClient.invalidateQueries({ queryKey: ['storage-usage'] });
    },
  });
}

export function useDeleteBucket() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await apiClient.DELETE('/storage/buckets/{name}', {
        params: {
          path: { name },
        },
      });

      if (error) {
        throw new Error((error as any)?.message || 'Failed to delete bucket');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['buckets'] });
      queryClient.invalidateQueries({ queryKey: ['storage-usage'] });
    },
  });
}
