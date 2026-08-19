import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api/client';

export function useAuth() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) throw new Error('No token found');

      const { data, error } = await apiClient.GET('/auth/me');
      
      if (error) {
        throw error;
      }
      
      const payload = (data as any)?.data?.user;
      return payload as { id: number; email: string; displayName: string; role: string };
    },
    retry: false,
  });
}
