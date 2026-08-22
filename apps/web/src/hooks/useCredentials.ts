import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '../lib/api/client';
import type { components } from '../lib/api/schema';

export type CredentialResponse = components['schemas']['CredentialResponse'];
export type CredentialWithSecretResponse = components['schemas']['CredentialWithSecretResponse']['data'];
export type CreateCredentialInput = components['schemas']['CreateCredentialInput'];

export function useCredentials(page = 1, limit = 20) {
  return useQuery({
    queryKey: ['credentials', page, limit],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/credentials', {
        params: {
          query: {
            page: String(page),
            limit: String(limit),
          },
        },
      });

      if (error) {
        throw new Error((error as any)?.message || 'Failed to list credentials');
      }

      return data!;
    },
  });
}

export function useCreateCredential() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (requestBody: CreateCredentialInput) => {
      const { data, error } = await apiClient.POST('/credentials', {
        body: requestBody,
      });

      if (error) {
        throw new Error((error as any)?.message || 'Failed to create credential');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
    },
  });
}

export function useRevokeCredential() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { data, error } = await apiClient.PATCH('/credentials/{id}/revoke', {
        params: {
          path: { id: String(id) }, // cast as String because id is a number but typescript expects string in the path param due to openapi string generation
        },
      });

      if (error) {
        throw new Error((error as any)?.message || 'Failed to revoke credential');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
    },
  });
}

export function useDeleteCredential() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const { data, error } = await apiClient.DELETE('/credentials/{id}', {
        params: {
          path: { id: String(id) },  // cast as String because id is a number but typescript expects string in the path param due to openapi string generation
        },
      });

      if (error) {
        throw new Error((error as any)?.message || 'Failed to delete credential');
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['credentials'] });
    },
  });
}
