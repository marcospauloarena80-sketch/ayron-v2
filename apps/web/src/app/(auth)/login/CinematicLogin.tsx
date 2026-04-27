'use client';

import { useState, useEffect, useRef, useCallback } from 'react'; // useEffect kept for LoginForm internal use
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Schema ───────────────────────────────────────────────────────────────────
const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Mínimo 6 caracteres'),
});
type FormData = z.infer<typeof schema>;

// ─── Global CSS ───────────────────────────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&display=swap');

  :root {
    --cyan: #00c8ff;
    --cyan-dim: rgba(0,200,255,0.25);
    --bg-glass: rgba(10,20,30,0.55);
  }

  @keyframes hudBlink   { 0%,100% { opacity:1; } 50% { opacity:.2; } }
  @keyframes greenPulse { 0%,100% { opacity:.7; } 50% { opacity:1; } }
  @keyframes spin       { to { transform: rotate(360deg); } }
  @keyframes fadeSlideUp {
    from { opacity:0; transform:translate(-50%,-48%); }
    to   { opacity:1; transform:translate(-50%,-52%); }
  }

  .cin-input {
    width: 100%;
    background: rgba(0,200,255,.05);
    border: 1px solid rgba(0,200,255,.28);
    border-radius: 6px;
    padding: .65rem .9rem;
    font-size: .85rem;
    color: #d0f4ff;
    outline: none;
    font-family: 'Share Tech Mono', monospace;
    letter-spacing: .04em;
    transition: border-color .2s, box-shadow .2s, background .2s;
    box-sizing: border-box;
  }
  .cin-input::placeholder { color: rgba(0,200,255,.22); }
  .cin-input:focus {
    border-color: var(--cyan);
    background: rgba(0,200,255,.09);
    box-shadow: 0 0 0 3px rgba(0,200,255,.1), 0 0 18px rgba(0,200,255,.1);
  }

  .cin-btn {
    width: 100%;
    background: transparent;
    border: 1.5px solid var(--cyan);
    border-radius: 6px;
    padding: .72rem 1rem;
    cursor: pointer;
    font-family: 'Orbitron', monospace;
    font-size: .78rem;
    font-weight: 700;
    color: var(--cyan);
    letter-spacing: .16em;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: .5rem;
    transition: background .2s, box-shadow .2s, transform .1s;
    box-sizing: border-box;
  }
  .cin-btn:hover:not(:disabled) {
    background: rgba(0,200,255,.12);
    box-shadow: 0 0 22px rgba(0,200,255,.25), inset 0 0 22px rgba(0,200,255,.04);
  }
  .cin-btn:active:not(:disabled) { transform: scale(.98); }
  .cin-btn:disabled { opacity:.45; cursor:not-allowed; }

  .cin-skip {
    position: fixed;
    bottom: 22px; right: 24px;
    background: transparent;
    border: 1px solid rgba(0,200,255,.18);
    border-radius: 4px;
    padding: .3rem .6rem;
    font-size: .56rem;
    letter-spacing: .14em;
    color: rgba(0,200,255,.35);
    font-family: 'Orbitron', monospace;
    cursor: pointer;
    transition: all .2s;
    z-index: 50;
  }
  .cin-skip:hover {
    border-color: rgba(0,200,255,.5);
    color: rgba(0,200,255,.65);
  }

  /* Mobile: wider panel */
  @media (max-width: 900px) {
    .cin-panel {
      width: 88vw !important;
      max-width: 380px !important;
      min-width: unset !important;
    }
  }
`;

// ─── VideoBackground ──────────────────────────────────────────────────────────
function VideoBackground({
  onEnded,
  onSkip,
}: {
  onEnded: () => void;
  onSkip: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleEnded = useCallback(() => {
    // Freeze last frame
    if (videoRef.current) {
      videoRef.current.pause();
    }
    onEnded();
  }, [onEnded]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 0, background: '#04080f' }}>
      <video
        ref={videoRef}
        src="/login-video.mp4"
        autoPlay
        muted
        playsInline
        preload="auto"
        onEnded={handleEnded}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'center',
          // Force GPU layer — prevents quality degradation during playback
          transform: 'translateZ(0)',
          willChange: 'transform',
        }}
      />
      {/* Subtle vignette */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 90% 80% at 50% 50%, transparent 50%, rgba(4,8,15,.45) 100%)',
      }} />
      <button className="cin-skip" onClick={onSkip} suppressHydrationWarning>PULAR ▶</button>
    </div>
  );
}

// ─── LoginForm ────────────────────────────────────────────────────────────────
function LoginForm() {
  const router = useRouter();
  const setAuth = useAuthStore(s => s.setAuth);
  const [error, setError] = useState<string | null>(null);
  const {
    register, handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError(null);

    // DEV BYPASS
    if (data.email === 'master@ayron.health' && data.password === 'Ayron@Master2025!') {
      const mockToken = 'dev-bypass-token';
      const mockUser = {
        id: '00000000-0000-0000-0000-000000000003',
        name: 'MASTER Admin',
        email: 'master@ayron.health',
        role: 'MASTER' as const,
        clinic_id: '00000000-0000-0000-0000-000000000002',
        permissions: ['*'] as string[],
        preferences: { theme: 'light' as const, language: 'pt-BR' as const, notifications: true, emailDigest: false },
      };
      setAuth(mockUser, mockToken);
      document.cookie = `ayron_token=${mockToken}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
      router.push('/dashboard');
      return;
    }

    try {
      const res  = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.message ?? 'E-mail ou senha incorretos'); return; }
      setAuth(json.user, json.access_token);
      document.cookie = `ayron_token=${json.access_token}; path=/; max-age=${60 * 60 * 24 * 7}; SameSite=Lax`;
      router.push('/dashboard');
    } catch {
      setError('Não foi possível conectar ao servidor. Verifique sua conexão.');
    }
  };

  return (
    <div style={{ padding: '2rem 2rem 1.8rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 7, flexShrink: 0,
            background: 'rgba(0,200,255,.08)',
            border: '1px solid rgba(0,200,255,.28)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 14px rgba(0,200,255,.2)',
          }}>
            <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="11" r="8"  stroke="#00c8ff" strokeWidth="1.4" />
              <circle cx="11" cy="11" r="3.5" fill="#00c8ff" opacity=".9" />
              <circle cx="11" cy="11" r="1.2" fill="#e0f8ff" />
              {[[11,3,11,6.5],[11,15.5,11,19],[3,11,6.5,11],[15.5,11,19,11]].map(([x1,y1,x2,y2], i) => (
                <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#00c8ff" strokeWidth="1.4" strokeLinecap="round" />
              ))}
            </svg>
          </div>
          <div>
            <div style={{
              fontFamily: "'Orbitron', monospace",
              fontSize: '1.1rem', fontWeight: 900,
              color: '#00c8ff', letterSpacing: '.14em', lineHeight: 1,
              textShadow: '0 0 18px rgba(0,200,255,.6)',
            }}>
              AYRON
            </div>
            <div style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: '.54rem', color: 'rgba(0,200,255,.4)',
              letterSpacing: '.12em', marginTop: 3,
            }}>
              COGNITIVE CLINICAL OS
            </div>
          </div>
        </div>

        <div style={{
          borderTop: '1px solid rgba(0,200,255,.12)',
          paddingTop: 10,
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: '.6rem', color: 'rgba(0,200,255,.38)',
          letterSpacing: '.13em',
        }}>
          {'> AUTENTICAÇÃO SEGURA REQUERIDA_'}
          <span style={{ animation: 'hudBlink 1s ease infinite' }}>▌</span>
        </div>
      </div>

      {/* Form */}
      <form
        onSubmit={handleSubmit(onSubmit)}
        style={{ display: 'flex', flexDirection: 'column', gap: '.9rem' }}
        suppressHydrationWarning
      >
        {/* Email */}
        <div>
          <label style={{
            display: 'block',
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: '.6rem', color: 'rgba(0,200,255,.45)',
            letterSpacing: '.13em', marginBottom: 5,
          }}>
            IDENTIFICADOR [EMAIL]
          </label>
          <input
            {...register('email')}
            type="email"
            autoComplete="email"
            className="cin-input"
            placeholder="usuario@dominio.com"
          />
          {errors.email && (
            <p style={{ marginTop: 4, fontSize: '.72rem', color: '#ff7070', fontFamily: "'Share Tech Mono', monospace" }}>
              ⚠ {errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label style={{
            display: 'block',
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: '.6rem', color: 'rgba(0,200,255,.45)',
            letterSpacing: '.13em', marginBottom: 5,
          }}>
            CHAVE DE ACESSO [PASSWORD]
          </label>
          <input
            {...register('password')}
            type="password"
            autoComplete="current-password"
            className="cin-input"
            placeholder="••••••••••••"
          />
          {errors.password && (
            <p style={{ marginTop: 4, fontSize: '.72rem', color: '#ff7070', fontFamily: "'Share Tech Mono', monospace" }}>
              ⚠ {errors.password.message}
            </p>
          )}
        </div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: .25 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                borderRadius: 6,
                border: '1px solid rgba(255,80,80,.3)',
                background: 'rgba(255,60,60,.07)',
                padding: '.55rem .75rem',
                fontSize: '.73rem', color: '#ff8080',
                fontFamily: "'Share Tech Mono', monospace",
              }}
            >
              <AlertCircle style={{ width: 13, height: 13, flexShrink: 0 }} />
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit */}
        <button type="submit" disabled={isSubmitting} className="cin-btn" style={{ marginTop: 2 }}>
          {isSubmitting ? (
            <>
              <Loader2 style={{ width: 13, height: 13, animation: 'spin 1s linear infinite' }} />
              AUTENTICANDO...
            </>
          ) : (
            'ACESSAR SISTEMA ▶'
          )}
        </button>
      </form>

      {/* Footer */}
      <div style={{
        marginTop: '1.4rem', paddingTop: '.9rem',
        borderTop: '1px solid rgba(0,200,255,.07)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: '.51rem', color: 'rgba(0,200,255,.18)', letterSpacing: '.1em',
        }}>
          AYRON OS v2.1.0
        </span>
        <span style={{
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: '.51rem', color: 'rgba(0,200,255,.3)',
          display: 'flex', alignItems: 'center', gap: 5,
        }}>
          <span style={{
            width: 5, height: 5, borderRadius: '50%',
            background: '#00ff88', display: 'inline-block',
            animation: 'greenPulse 2s ease infinite',
            boxShadow: '0 0 6px rgba(0,255,136,.8)',
          }} />
          SECURE CHANNEL ACTIVE
        </span>
      </div>
    </div>
  );
}

// ─── LoginOverlay — panel floating over monitor ───────────────────────────────
function LoginOverlay({ visible }: { visible: boolean }) {
  return (
    <AnimatePresence>
      {visible && (
        /* Centering wrapper — flexbox, não usa transform para não conflitar com Framer Motion */
        <div style={{
          position: 'fixed', inset: 0, zIndex: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
        <motion.div
          className="cin-panel"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: .7, ease: [.22, 1, .36, 1] }}
          style={{
            pointerEvents: 'auto',
            width: 'min(32vw, 400px)',
            maxWidth: 400,
            minWidth: 290,
            background: 'rgba(10,20,30,0.55)',
            border: '1px solid rgba(0,200,255,0.25)',
            borderRadius: 12,
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            boxShadow: [
              '0 0 60px rgba(0,200,255,.08)',
              '0 8px 48px rgba(0,0,0,.6)',
              'inset 0 1px 0 rgba(0,200,255,.1)',
            ].join(','),
            overflow: 'hidden',
          }}
        >
          {/* Top accent line */}
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, height: 1,
            background: 'linear-gradient(90deg, transparent 0%, rgba(0,200,255,.5) 25%, rgba(0,200,255,.8) 50%, rgba(0,200,255,.5) 75%, transparent 100%)',
          }} />

          {/* Left accent */}
          <div style={{
            position: 'absolute', top: '18%', left: 0, bottom: '18%', width: 1,
            background: 'linear-gradient(180deg, transparent, rgba(0,200,255,.28) 40%, rgba(0,200,255,.28) 60%, transparent)',
          }} />

          {/* Corner brackets */}
          {(['tl','tr','bl','br'] as const).map((c, i) => {
            const t = c[0] === 't';
            const l = c[1] === 'l';
            return (
              <div key={c} style={{
                position: 'absolute',
                top:    t ? 10 : undefined,
                bottom: t ? undefined : 10,
                left:   l ? 10 : undefined,
                right:  l ? undefined : 10,
                width: 16, height: 16,
                borderTop:    t ? '1px solid rgba(0,200,255,.4)' : 'none',
                borderBottom: t ? 'none' : '1px solid rgba(0,200,255,.4)',
                borderLeft:   l ? '1px solid rgba(0,200,255,.4)' : 'none',
                borderRight:  l ? 'none' : '1px solid rgba(0,200,255,.4)',
                pointerEvents: 'none',
              }} />
            );
          })}

          <LoginForm />
        </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── CinematicLogin — main export ─────────────────────────────────────────────
export default function CinematicLogin() {
  const [loginVisible, setLoginVisible] = useState(false);

  const handleVideoEnd = useCallback(() => setLoginVisible(true), []);
  const handleSkip    = useCallback(() => setLoginVisible(true), []);

  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <VideoBackground onEnded={handleVideoEnd} onSkip={handleSkip} />
      <LoginOverlay visible={loginVisible} />
    </>
  );
}
