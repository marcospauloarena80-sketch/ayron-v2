import axios from 'axios';
import { useAuthStore } from '@/store/auth.store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

if (typeof window !== 'undefined' && !process.env.NEXT_PUBLIC_API_URL) {
  console.warn(
    '[AYRON] NEXT_PUBLIC_API_URL is not set. API calls will fail in production. ' +
    'Set this variable in Vercel > Project Settings > Environment Variables.'
  );
}

const api = axios.create({
  baseURL: API_BASE,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = useAuthStore.getState().token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const status = err.response?.status;

    if (status === 401 && typeof window !== 'undefined') {
      useAuthStore.getState().logout();
      window.location.href = '/login';
      return Promise.reject(err);
    }

    if (status === 403 && typeof window !== 'undefined') {
      // Lazy import to avoid circular deps
      const { toast } = await import('sonner');
      toast.error('Sem permissão para realizar esta ação.');
    }

    if (status != null && status >= 500 && typeof window !== 'undefined') {
      const { toast } = await import('sonner');
      toast.error('Erro no servidor. Tente novamente em instantes.');
    }

    if (!err.response && typeof window !== 'undefined') {
      // Network error / backend unreachable
      const { toast } = await import('sonner');
      toast.error('Não foi possível conectar ao servidor.');
    }

    return Promise.reject(err);
  },
);

export default api;
