import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'MASTER' | 'ADMIN' | 'GERENTE' | 'MEDICO' | 'ENFERMEIRO' | 'RECEPCIONISTA';

export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  language: 'pt-BR' | 'en';
  notifications: boolean;
  emailDigest: boolean;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  clinic_id?: string;
  unit?: string;      // current unit (branch)
  permissions: string[];
  preferences: UserPreferences;
  avatar?: string;
}

// Role → default permissions
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  MASTER: ['*'],  // all
  ADMIN: ['patients.*', 'agenda.*', 'clinical.*', 'financial.*', 'settings.*', 'marketing.*', 'reports.*'],
  GERENTE: ['patients.view', 'agenda.*', 'financial.*', 'reports.*', 'marketing.*'],
  MEDICO: ['patients.*', 'agenda.view', 'clinical.*', 'sessions.*'],
  ENFERMEIRO: ['patients.view', 'agenda.view', 'clinical.view', 'sessions.*'],
  RECEPCIONISTA: ['patients.view', 'agenda.*', 'financial.view'],
};

const DEFAULT_PREFERENCES: UserPreferences = {
  theme: 'light',
  language: 'pt-BR',
  notifications: true,
  emailDigest: false,
};

// Mock user injected at login bypass (middleware sets ayron_token cookie)
export const MOCK_USERS_BY_ROLE: Record<UserRole, AuthUser> = {
  MASTER: {
    id: 'u-master',
    name: 'Dr. Marcos (Master)',
    email: 'master@clinica.com',
    role: 'MASTER',
    clinic_id: 'clinic-1',
    unit: 'Clínica Barra',
    permissions: ROLE_PERMISSIONS.MASTER,
    preferences: DEFAULT_PREFERENCES,
  },
  ADMIN: {
    id: 'u-admin',
    name: 'Amanda Admin',
    email: 'admin@clinica.com',
    role: 'ADMIN',
    clinic_id: 'clinic-1',
    unit: 'Clínica Barra',
    permissions: ROLE_PERMISSIONS.ADMIN,
    preferences: DEFAULT_PREFERENCES,
  },
  GERENTE: {
    id: 'u-gerente',
    name: 'Carlos Gerente',
    email: 'gerente@clinica.com',
    role: 'GERENTE',
    clinic_id: 'clinic-1',
    unit: 'Clínica Teresópolis',
    permissions: ROLE_PERMISSIONS.GERENTE,
    preferences: DEFAULT_PREFERENCES,
  },
  MEDICO: {
    id: 'u-medico',
    name: 'Dra. Sarah Médica',
    email: 'medico@clinica.com',
    role: 'MEDICO',
    clinic_id: 'clinic-1',
    unit: 'Clínica Barra',
    permissions: ROLE_PERMISSIONS.MEDICO,
    preferences: DEFAULT_PREFERENCES,
  },
  ENFERMEIRO: {
    id: 'u-enfermeiro',
    name: 'Ana Enfermeira',
    email: 'enfermeiro@clinica.com',
    role: 'ENFERMEIRO',
    clinic_id: 'clinic-1',
    unit: 'Clínica Barra',
    permissions: ROLE_PERMISSIONS.ENFERMEIRO,
    preferences: DEFAULT_PREFERENCES,
  },
  RECEPCIONISTA: {
    id: 'u-recep',
    name: 'Lucia Recepção',
    email: 'recepcao@clinica.com',
    role: 'RECEPCIONISTA',
    clinic_id: 'clinic-1',
    unit: 'Clínica Barra',
    permissions: ROLE_PERMISSIONS.RECEPCIONISTA,
    preferences: DEFAULT_PREFERENCES,
  },
};

export const UNITS = ['Clínica Barra', 'Clínica Teresópolis'];

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  setAuth: (user: AuthUser, token: string) => void;
  logout: () => void;
  updateUser: (changes: Partial<AuthUser>) => void;
  updatePreferences: (prefs: Partial<UserPreferences>) => void;
  switchUnit: (unit: string) => void;
  hasPermission: (perm: string) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      // Default to MASTER mock so UI always has a user in dev/test
      user: MOCK_USERS_BY_ROLE.MASTER,
      token: 'test-token-bypass',
      setAuth: (user, token) => set({ user, token }),
      logout: () => {
        if (typeof document !== 'undefined') {
          document.cookie = 'ayron_token=; path=/; max-age=0';
        }
        set({ user: null, token: null });
      },
      updateUser: (changes) => set(s => ({ user: s.user ? { ...s.user, ...changes } : null })),
      updatePreferences: (prefs) => set(s => ({
        user: s.user ? { ...s.user, preferences: { ...s.user.preferences, ...prefs } } : null,
      })),
      switchUnit: (unit) => set(s => ({ user: s.user ? { ...s.user, unit } : null })),
      hasPermission: (perm: string) => {
        const perms = get().user?.permissions ?? [];
        return perms.includes('*') || perms.includes(perm) || perms.some(p => {
          const [ns] = p.split('.');
          return p.endsWith('.*') && perm.startsWith(ns + '.');
        });
      },
    }),
    { name: 'ayron-auth' },
  ),
);
