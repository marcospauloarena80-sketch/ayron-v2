'use client';
import { useRef, useState, useEffect } from 'react';
import {
  Bell, Search, Lock, Calendar, Settings, LogOut, ChevronDown, X,
  ChevronRight, FileText, Users, UserCog, Shield, SlidersHorizontal,
  Building2, Check, Eye, EyeOff,
} from 'lucide-react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore, UNITS, MOCK_USERS_BY_ROLE, type UserRole } from '@/store/auth.store';
import api from '@/lib/api';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ROLE_LABELS: Record<string, string> = {
  MASTER: 'Master', ADMIN: 'Admin', GERENTE: 'Gerente',
  MEDICO: 'Médico', ENFERMEIRO: 'Enfermeiro', RECEPCIONISTA: 'Recepcionista',
};

const ROLE_COLORS: Record<string, string> = {
  MASTER: 'bg-red-100 text-red-700',
  ADMIN: 'bg-orange-100 text-orange-700',
  GERENTE: 'bg-amber-100 text-amber-700',
  MEDICO: 'bg-blue-100 text-blue-700',
  ENFERMEIRO: 'bg-green-100 text-green-700',
  RECEPCIONISTA: 'bg-purple-100 text-purple-700',
};

// ── Profile Modal ──────────────────────────────────────────────────────────

function ProfileModal({ onClose }: { onClose: () => void }) {
  const user = useAuthStore(s => s.user);
  const updateUser = useAuthStore(s => s.updateUser);
  const updatePreferences = useAuthStore(s => s.updatePreferences);
  const [form, setForm] = useState({ name: user?.name ?? '', email: user?.email ?? '' });
  const [prefs, setPrefs] = useState(user?.preferences ?? { theme: 'light' as const, language: 'pt-BR' as const, notifications: true, emailDigest: false });

  function handleSave() {
    updateUser({ name: form.name, email: form.email });
    updatePreferences(prefs);
    toast.success('Perfil atualizado');
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-2xl border bg-white shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-gray-900">Meu Perfil</h2>
          <button onClick={onClose}><X className="h-4 w-4 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          {/* Avatar */}
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-violet-600 flex items-center justify-center text-white font-black text-xl">
              {form.name[0] ?? 'U'}
            </div>
            <div>
              <p className="font-semibold text-gray-900">{user?.name}</p>
              <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', ROLE_COLORS[user?.role ?? ''] ?? 'bg-gray-100 text-gray-600')}>
                {ROLE_LABELS[user?.role ?? ''] ?? user?.role}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">Nome</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider block mb-1">E-mail</label>
              <input value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500" />
            </div>
          </div>

          <div className="border-t pt-4 space-y-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Preferências</p>
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Notificações push</span>
              <button onClick={() => setPrefs(p => ({ ...p, notifications: !p.notifications }))}
                className={cn('w-10 h-5 rounded-full transition-colors relative', prefs.notifications ? 'bg-violet-600' : 'bg-gray-200')}>
                <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', prefs.notifications ? 'left-5' : 'left-0.5')} />
              </button>
            </label>
            <label className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Resumo por e-mail</span>
              <button onClick={() => setPrefs(p => ({ ...p, emailDigest: !p.emailDigest }))}
                className={cn('w-10 h-5 rounded-full transition-colors relative', prefs.emailDigest ? 'bg-violet-600' : 'bg-gray-200')}>
                <span className={cn('absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all', prefs.emailDigest ? 'left-5' : 'left-0.5')} />
              </button>
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 p-5 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancelar</button>
          <button onClick={handleSave} className="px-4 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700">Salvar</button>
        </div>
      </div>
    </div>
  );
}

// ── Permissions Modal ──────────────────────────────────────────────────────

function PermissionsModal({ onClose }: { onClose: () => void }) {
  const user = useAuthStore(s => s.user);
  const setAuth = useAuthStore(s => s.setAuth);
  const token = useAuthStore(s => s.token);
  const roles = Object.keys(MOCK_USERS_BY_ROLE) as UserRole[];

  function switchRole(role: UserRole) {
    const mockUser = MOCK_USERS_BY_ROLE[role];
    setAuth(mockUser, token ?? 'test-token-bypass');
    toast.success(`Perfil alterado para ${ROLE_LABELS[role]}`);
    onClose();
  }

  const perms = user?.permissions ?? [];
  const isAll = perms.includes('*');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-lg rounded-2xl border bg-white shadow-2xl">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-gray-900">Permissões do Usuário</h2>
          <button onClick={onClose}><X className="h-4 w-4 text-gray-400" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
            <div className="h-10 w-10 rounded-full bg-violet-600 flex items-center justify-center text-white font-bold">
              {user?.name?.[0]}
            </div>
            <div>
              <p className="font-semibold text-sm">{user?.name}</p>
              <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', ROLE_COLORS[user?.role ?? ''] ?? '')}>
                {ROLE_LABELS[user?.role ?? ''] ?? user?.role}
              </span>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Permissões Ativas</p>
            <div className="flex flex-wrap gap-1.5">
              {isAll ? (
                <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 font-medium">✓ Acesso Total (Master)</span>
              ) : (
                perms.map(p => (
                  <span key={p} className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 font-mono">{p}</span>
                ))
              )}
            </div>
          </div>

          {user?.role === 'MASTER' && (
            <div className="border-t pt-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Testar como outro perfil</p>
              <div className="grid grid-cols-3 gap-2">
                {roles.map(role => (
                  <button key={role} onClick={() => switchRole(role)}
                    className={cn('border rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                      user.role === role
                        ? 'border-violet-500 bg-violet-50 text-violet-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300')}>
                    {ROLE_LABELS[role]}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end p-5 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Fechar</button>
        </div>
      </div>
    </div>
  );
}

// ── Main Topbar ────────────────────────────────────────────────────────────

export function Topbar({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const switchUnit = useAuthStore((s) => s.switchUnit);
  const router = useRouter();
  const pathname = usePathname();
  const showSearch = pathname !== '/dashboard';

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [showPwCurrent, setShowPwCurrent] = useState(false);
  const [showPwNext, setShowPwNext] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Open search with ⌘K or Ctrl+K
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(v => !v);
      }
      if (e.key === 'Escape') setSearchOpen(false);
    }
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (searchOpen) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
      setSearchQuery('');
      setSearchResults([]);
    }
  }, [searchOpen]);

  // Cleanup search timer on unmount
  useEffect(() => {
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, []);

  // Debounced search
  function handleSearchInput(val: string) {
    setSearchQuery(val);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    if (!val.trim()) { setSearchResults([]); return; }
    setSearchLoading(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const r = await api.get('/patients', { params: { search: val, limit: 6 } });
        const patients = r.data?.data ?? [];
        setSearchResults(patients.map((p: any) => ({ type: 'patient', id: p.id, label: p.full_name, sub: p.phone ?? p.email ?? '', href: `/patients/${p.id}` })));
      } catch {
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }

  // Close on outside click
  function handleBackdrop(e: React.MouseEvent) {
    if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
      setDropdownOpen(false);
    }
  }

  async function handleChangePassword() {
    if (pwForm.next !== pwForm.confirm) {
      toast.error('As senhas não coincidem');
      return;
    }
    setPwLoading(true);
    try {
      await api.patch('/auth/change-password', { current_password: pwForm.current, new_password: pwForm.next });
      toast.success('Senha alterada com sucesso');
      setShowPasswordModal(false);
      setPwForm({ current: '', next: '', confirm: '' });
    } catch {
      toast.error('Erro ao alterar senha');
    } finally {
      setPwLoading(false);
    }
  }

  function handleSyncAgenda() {
    const url = `${window.location.origin}/agenda`;
    navigator.clipboard.writeText(url).then(() => toast.success('Link copiado!')).catch(() => toast.error('Erro ao copiar link'));
    setDropdownOpen(false);
  }

  function handleLogout() {
    logout();
    router.push('/login');
  }

  return (
    <>
      <div className="flex h-14 items-center justify-between border-b border-border bg-white px-6">
        <div className="flex items-baseline gap-2">
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
        </div>
        <div className="flex items-center gap-3">
          {actions}
          {showSearch && (
            <button
              onClick={() => setSearchOpen(v => !v)}
              className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted transition-colors"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Buscar</span>
              <kbd className="hidden sm:inline rounded border border-border bg-white px-1 py-0.5 text-[10px] font-medium">⌘K</kbd>
            </button>
          )}
          <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted transition-colors relative">
            <Bell className="h-4 w-4" />
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
          </button>

          {/* User dropdown trigger */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 hover:bg-muted/40 transition-colors"
            >
              <div className="h-6 w-6 rounded-full bg-secondary flex items-center justify-center">
                <span className="text-xs font-bold text-white">{user?.name?.[0] ?? 'U'}</span>
              </div>
              <span className="text-sm font-medium">{user?.name ?? 'Usuário'}</span>
              <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {dropdownOpen && (
              <>
                {/* Invisible backdrop */}
                <div className="fixed inset-0 z-40" onClick={handleBackdrop} />
                <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-xl border border-border bg-white shadow-xl">
                  {/* Header */}
                  <div className="px-4 py-3">
                    <p className="text-sm font-semibold text-foreground">{user?.name ?? 'Usuário'}</p>
                    <p className="text-xs text-muted-foreground">{`Último login: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}</p>
                  </div>
                  <div className="border-t border-border" />

                  {/* Role badge */}
                  <div className="px-4 pb-2">
                    <span className={cn('px-2 py-0.5 rounded-full text-xs font-medium', ROLE_COLORS[user?.role ?? ''] ?? 'bg-gray-100 text-gray-600')}>
                      {ROLE_LABELS[user?.role ?? ''] ?? user?.role ?? 'Usuário'}
                    </span>
                    {user?.unit && <span className="ml-2 text-xs text-muted-foreground">· {user.unit}</span>}
                  </div>

                  {/* Items */}
                  <div className="border-t border-border py-1">
                    <button
                      onClick={() => { setDropdownOpen(false); setShowProfileModal(true); }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                    >
                      <UserCog className="h-4 w-4 text-muted-foreground" />
                      Meu Perfil
                    </button>
                    <button
                      onClick={() => { setDropdownOpen(false); setShowPasswordModal(true); }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                    >
                      <Lock className="h-4 w-4 text-muted-foreground" />
                      Trocar Senha
                    </button>
                    <button
                      onClick={() => { setDropdownOpen(false); setShowPermissionsModal(true); }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                    >
                      <Shield className="h-4 w-4 text-muted-foreground" />
                      Permissões
                    </button>
                    <button
                      onClick={() => { setDropdownOpen(false); router.push('/settings'); }}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted/50 transition-colors"
                    >
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      Configurações
                    </button>
                  </div>

                  {/* Switch unit */}
                  {UNITS.length > 1 && (
                    <>
                      <div className="border-t border-border py-1">
                        <p className="px-4 py-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Alternar Unidade</p>
                        {UNITS.map(unit => (
                          <button key={unit} onClick={() => { switchUnit(unit); setDropdownOpen(false); toast.success(`Unidade: ${unit}`); }}
                            className="flex w-full items-center gap-3 px-4 py-2 text-sm text-foreground hover:bg-muted/50 transition-colors">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            {unit}
                            {user?.unit === unit && <Check className="h-3.5 w-3.5 text-primary ml-auto" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  <div className="border-t border-border py-1">
                    <button
                      onClick={handleLogout}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="h-4 w-4" />
                      Sair
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Global Search Overlay */}
      {searchOpen && (
        <div className="fixed inset-0 z-[200] flex flex-col" onClick={() => setSearchOpen(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative z-10 mx-auto mt-16 w-full max-w-xl px-4" onClick={e => e.stopPropagation()}>
            <div className="rounded-2xl border border-border bg-white shadow-2xl overflow-hidden">
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <input
                  ref={searchInputRef}
                  value={searchQuery}
                  onChange={e => handleSearchInput(e.target.value)}
                  placeholder="Buscar paciente, CID, procedimento..."
                  className="flex-1 text-sm outline-none placeholder:text-muted-foreground"
                />
                {searchLoading && <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin flex-shrink-0" />}
                <button onClick={() => setSearchOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Quick links (shown when no query) */}
              {!searchQuery && (
                <div className="p-3 space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-2 mb-2">Acesso rápido</p>
                  {[
                    { icon: Users, label: 'Pacientes', href: '/patients' },
                    { icon: Calendar, label: 'Agenda de hoje', href: '/agenda' },
                    { icon: FileText, label: 'Prontuários', href: '/clinical' },
                    { icon: Bell, label: 'Alertas', href: '/alerts' },
                    { icon: Settings, label: 'Configurações', href: '/settings' },
                  ].map(({ icon: Icon, label, href }) => (
                    <button
                      key={href}
                      onClick={() => { router.push(href); setSearchOpen(false); }}
                      className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-left"
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      {label}
                      <ChevronRight className="h-3.5 w-3.5 ml-auto opacity-50" />
                    </button>
                  ))}
                </div>
              )}

              {/* Search results */}
              {searchQuery && searchResults.length > 0 && (
                <div className="p-3 space-y-1">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-2 mb-2">Pacientes</p>
                  {searchResults.map(r => (
                    <button
                      key={r.id}
                      onClick={() => { router.push(r.href); setSearchOpen(false); }}
                      className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted transition-colors text-left"
                    >
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold flex-shrink-0">
                        {r.label?.[0]}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{r.label}</p>
                        {r.sub && <p className="text-xs text-muted-foreground">{r.sub}</p>}
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
                    </button>
                  ))}
                </div>
              )}

              {/* No results */}
              {searchQuery && !searchLoading && searchResults.length === 0 && (
                <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                  <Search className="h-8 w-8 mb-2 opacity-20" />
                  <p className="text-sm">Nenhum resultado para "{searchQuery}"</p>
                  <p className="text-xs mt-1">Tente buscar por nome, CPF ou telefone</p>
                </div>
              )}

              <div className="border-t border-border px-4 py-2 flex items-center gap-4 text-[10px] text-muted-foreground">
                <span><kbd className="rounded border border-border px-1">↵</kbd> abrir</span>
                <span><kbd className="rounded border border-border px-1">Esc</kbd> fechar</span>
                <span><kbd className="rounded border border-border px-1">⌘K</kbd> alternar</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-foreground">Trocar Senha</h2>
              <button onClick={() => { setShowPasswordModal(false); setPwForm({ current: '', next: '', confirm: '' }); }}
                className="rounded-lg p-1 hover:bg-muted transition-colors">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Senha atual</label>
                <div className="relative">
                  <input type={showPwCurrent ? 'text' : 'password'} value={pwForm.current}
                    onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
                    className="w-full rounded-lg border border-border px-3 py-2 pr-9 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPwCurrent(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPwCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Nova senha</label>
                <div className="relative">
                  <input type={showPwNext ? 'text' : 'password'} value={pwForm.next}
                    onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))}
                    className="w-full rounded-lg border border-border px-3 py-2 pr-9 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                    placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPwNext(v => !v)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPwNext ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Confirmar nova senha</label>
                <input type="password" value={pwForm.confirm}
                  onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="••••••••" />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={() => { setShowPasswordModal(false); setPwForm({ current: '', next: '', confirm: '' }); }}
                className="flex-1 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors">
                Cancelar
              </button>
              <button onClick={handleChangePassword} disabled={pwLoading}
                className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50 transition-colors">
                {pwLoading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && <ProfileModal onClose={() => setShowProfileModal(false)} />}

      {/* Permissions Modal */}
      {showPermissionsModal && <PermissionsModal onClose={() => setShowPermissionsModal(false)} />}
    </>
  );
}
