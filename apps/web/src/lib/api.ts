import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth.store';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
const REQUEST_TIMEOUT_MS = 15_000;
const RETRY_MAX = 2;
const RETRY_DELAY_MS = 800;

if (typeof window !== 'undefined' && !process.env.NEXT_PUBLIC_API_URL) {
  console.warn(
    '[AYRON] NEXT_PUBLIC_API_URL is not set. API calls will fail in production. ' +
    'Set this variable in Vercel > Project Settings > Environment Variables.'
  );
}

const api = axios.create({
  baseURL: API_BASE,
  timeout: REQUEST_TIMEOUT_MS,
});

api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = useAuthStore.getState().token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const STATUS_MESSAGES: Record<number, string> = {
  400: 'Dados inválidos. Verifique os campos.',
  401: 'Sessão expirada. Faça login novamente.',
  403: 'Sem permissão para esta ação.',
  404: 'Registro não encontrado.',
  409: 'Conflito com dados existentes.',
  422: 'Dados inválidos. Verifique os campos.',
  500: 'Erro no servidor. Tente novamente em instantes.',
  502: 'Servidor indisponível. Tente novamente.',
  503: 'Serviço em manutenção. Tente novamente em breve.',
  504: 'Servidor demorou demais para responder.',
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

api.interceptors.response.use(
  (res) => res,
  async (err: AxiosError) => {
    const status = err.response?.status;
    const config = err.config as AxiosRequestConfig & { __retryCount?: number };
    const isGet = (config?.method ?? 'get').toLowerCase() === 'get';
    const isNetwork = !err.response;
    const isServer = status != null && status >= 500;

    // Retry GET only — never POST/PATCH/DELETE (avoids duplicate writes)
    if (isGet && (isNetwork || isServer) && config) {
      config.__retryCount = (config.__retryCount ?? 0) + 1;
      if (config.__retryCount <= RETRY_MAX) {
        await sleep(RETRY_DELAY_MS * config.__retryCount);
        return api.request(config);
      }
    }

    if (typeof window === 'undefined') return Promise.reject(err);

    if (status === 401) {
      const { toast } = await import('sonner');
      toast.error('Sessão expirada. Faça login novamente.');
      useAuthStore.getState().logout();
      // Wipe local persistence so stale tokens don't linger
      try { localStorage.removeItem('auth-storage'); } catch {}
      window.location.href = '/login?reason=expired';
      return Promise.reject(err);
    }

    const { toast } = await import('sonner');
    if (isNetwork) {
      toast.error('Não foi possível conectar ao servidor. Verifique sua conexão.');
    } else if (status && STATUS_MESSAGES[status]) {
      // Backend may include a friendlier message — prefer it
      const backendMsg = (err.response?.data as any)?.message;
      toast.error(typeof backendMsg === 'string' ? backendMsg : STATUS_MESSAGES[status]);
    }

    return Promise.reject(err);
  },
);

export default api;
