import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';
import type { components } from '../lib/api/schema';

export type PresignedUploadInput = components['schemas']['PresignedUploadInput'];
export type PresignedDownloadInput = components['schemas']['PresignedDownloadInput'];
export type DeleteObjectInput = components['schemas']['DeleteObjectInput'];
export type BatchDeleteObjectsInput = components['schemas']['BatchDeleteObjectsInput'];

export function useObjects(bucketName: string, prefix = '', recursive = 'false', limit = '1000') {
  return useQuery({
    queryKey: ['objects', bucketName, prefix, recursive, limit],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/storage/buckets/{name}/objects', {
        params: {
          path: { name: bucketName },
          query: {
            prefix,
            recursive,
            limit,
          },
        },
      });

      if (error) {
        throw new Error((error as any)?.message || 'Failed to list objects');
      }

      return data;
    },
    enabled: !!bucketName,
  });
}

export function useGeneratePresignedUpload(bucketName: string) {
  return useMutation({
    mutationFn: async (requestBody: PresignedUploadInput) => {
      const { data, error } = await apiClient.POST('/storage/buckets/{name}/objects/presigned-upload', {
        params: {
          path: { name: bucketName },
        },
        body: requestBody,
      });

      if (error) {
        throw new Error((error as any)?.message || 'Failed to generate presigned upload URL');
      }

      return data;
    },
  });
}

export function useGeneratePresignedDownload(bucketName: string) {
  return useMutation({
    mutationFn: async (requestBody: PresignedDownloadInput) => {
      const { data, error } = await apiClient.POST('/storage/buckets/{name}/objects/presigned-download', {
        params: {
          path: { name: bucketName },
        },
        body: requestBody,
      });

      if (error) {
        throw new Error((error as any)?.message || 'Failed to generate presigned download URL');
      }

      return data;
    },
  });
}

export function useDeleteObject(bucketName: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestBody: DeleteObjectInput) => {
      const { data, error } = await apiClient.DELETE('/storage/buckets/{name}/objects', {
        params: {
          path: { name: bucketName },
        },
        body: requestBody,
      });

      if (error) {
        throw new Error((error as any)?.message || 'Failed to delete object');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objects', bucketName] });
      queryClient.invalidateQueries({ queryKey: ['buckets', bucketName, 'usage'] });
      queryClient.invalidateQueries({ queryKey: ['storage-usage'] });
    },
  });
}

export function useBatchDeleteObjects(bucketName: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestBody: BatchDeleteObjectsInput) => {
      const { data, error } = await apiClient.POST('/storage/buckets/{name}/objects/batch-delete', {
        params: {
          path: { name: bucketName },
        },
        body: requestBody,
      });

      if (error) {
        throw new Error((error as any)?.message || 'Failed to batch delete objects');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objects', bucketName] });
      queryClient.invalidateQueries({ queryKey: ['buckets', bucketName, 'usage'] });
      queryClient.invalidateQueries({ queryKey: ['storage-usage'] });
    },
  });
}
