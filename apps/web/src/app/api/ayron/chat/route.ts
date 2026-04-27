import { NextRequest, NextResponse } from 'next/server';

// n8n webhook — AYRON Teste Base
const N8N_WEBHOOK_URL = 'https://n8n-production-ef55.up.railway.app/webhook/ayron-teste';
const AYRON_LOG: { ts: string; userId: string; module: string; tokens: number }[] = [];

// Strip fields that must not leave the server (LGPD)
const SENSITIVE_KEYS = ['cpf', 'rg', 'creditCard', 'password', 'token', 'prontuario_full'];

function sanitize(obj: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([k]) => !SENSITIVE_KEYS.includes(k))
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { message, history = [], context = {} } = body as {
      message: string;
      history: { role: string; content: string }[];
      context: Record<string, unknown>;
    };

    if (!message?.trim()) {
      return NextResponse.json({ error: 'message required' }, { status: 400 });
    }

    // Permission check — basic guard
    const userRole = (context.userRole as string) ?? 'UNKNOWN';
    const allowedRoles = ['MASTER', 'ADMIN', 'MEDICO', 'ENFERMEIRO', 'RECEPCIONISTA', 'GERENTE'];
    if (!allowedRoles.includes(userRole)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Sanitize context before forwarding
    const safeContext = sanitize(context as Record<string, unknown>);

    // Usage log (in-memory; real impl → DB)
    AYRON_LOG.push({
      ts: new Date().toISOString(),
      userId: (context.userId as string) ?? 'anonymous',
      module: (context.module as string) ?? 'unknown',
      tokens: message.length,
    });

    // Build payload for n8n — extend the "from/body" Digisac format
    // n8n workflow parses "body" as the user message
    const n8nPayload = {
      from: (context.userId as string) ?? 'web-user',
      body: message,
      source: 'web',
      context: safeContext,
      history: history.slice(-10), // last 10 messages for context
    };

    const n8nRes = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(n8nPayload),
      signal: AbortSignal.timeout(15000),
    });

    if (!n8nRes.ok) {
      throw new Error(`n8n responded ${n8nRes.status}`);
    }

    const n8nData = await n8nRes.json();

    // n8n workflow returns the Claude response in various shapes — normalise
    const reply =
      n8nData?.reply ??
      n8nData?.output ??
      n8nData?.message ??
      n8nData?.text ??
      n8nData?.[0]?.output ??
      n8nData?.[0]?.reply ??
      'AYRON processou sua mensagem.';

    return NextResponse.json({ reply, source: 'n8n' });
  } catch (err) {
    // Return fallback — never expose stack trace
    console.error('[ayron/chat]', err);
    return NextResponse.json(
      { reply: 'Estou temporariamente indisponível. Tente novamente em alguns instantes.', source: 'fallback' },
      { status: 200 }, // keep 200 so client shows the message
    );
  }
}

// GET /api/ayron/chat — usage logs (MASTER only, basic demo)
export async function GET(req: NextRequest) {
  const role = req.headers.get('x-user-role');
  if (role !== 'MASTER') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }
  return NextResponse.json({ logs: AYRON_LOG.slice(-100) });
}
