#!/usr/bin/env node
'use strict';
/**
 * AYRON — Production seed (CommonJS, no TypeScript required).
 * Idempotent: uses upsert — safe to run on every startup.
 * Creates: organization → clinic → MASTER user → professional → services → feature flags.
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const ORG_ID     = '00000000-0000-0000-0000-000000000001';
const CLINIC_ID  = '00000000-0000-0000-0000-000000000002';
const MASTER_ID  = '00000000-0000-0000-0000-000000000003';
const PROF_ID    = '00000000-0000-0000-0000-000000000010';

async function main() {
  console.log('[seed-prod] Checking MASTER user...');

  const existing = await prisma.user.findFirst({ where: { role: 'MASTER' } });
  if (existing) {
    console.log('[seed-prod] MASTER user already exists — skipping seed.');
    return;
  }

  console.log('[seed-prod] No MASTER found — seeding...');

  const org = await prisma.organization.upsert({
    where: { id: ORG_ID },
    create: {
      id: ORG_ID,
      name: 'AYRON Health Group',
      plan_tier: 'COGNITIVE',
      is_active: true,
    },
    update: {},
  });

  const clinic = await prisma.clinic.upsert({
    where: { id: CLINIC_ID },
    create: {
      id: CLINIC_ID,
      organization_id: org.id,
      name: 'Clínica Piloto AYRON — Endocrinologia',
      specialty: 'endocrinologia',
      timezone: 'America/Sao_Paulo',
      is_active: true,
    },
    update: {},
  });

  const passwordHash = await bcrypt.hash('Ayron@Master2025!', 12);

  const master = await prisma.user.upsert({
    where: { id: MASTER_ID },
    create: {
      id: MASTER_ID,
      organization_id: org.id,
      clinic_id: clinic.id,
      name: 'MASTER Admin',
      email: 'master@ayron.health',
      password_hash: passwordHash,
      role: 'MASTER',
      is_active: true,
    },
    update: {},
  });

  await prisma.professional.upsert({
    where: { id: PROF_ID },
    create: {
      id: PROF_ID,
      clinic_id: clinic.id,
      user_id: master.id,
      name: 'Dr(a). Admin Piloto',
      specialty: 'Endocrinologia & Alta Performance',
      crm: 'CRM/SP 000000',
      is_active: true,
    },
    update: {},
  });

  const services = [
    { id: '00000000-0000-0000-0000-000000000020', name: 'Consulta de Endocrinologia',     duration_min: 50, price: 45000 },
    { id: '00000000-0000-0000-0000-000000000021', name: 'Consulta de Retorno',             duration_min: 30, price: 30000 },
    { id: '00000000-0000-0000-0000-000000000022', name: 'Avaliação de Composição Corporal', duration_min: 60, price: 35000 },
    { id: '00000000-0000-0000-0000-000000000023', name: 'Implante Hormonal',               duration_min: 30, price: 120000 },
    { id: '00000000-0000-0000-0000-000000000024', name: 'Soroterapia',                     duration_min: 90, price: 80000 },
    { id: '00000000-0000-0000-0000-000000000025', name: 'Revisão de Exames',               duration_min: 30, price: 20000 },
  ];

  for (const svc of services) {
    await prisma.service.upsert({
      where: { id: svc.id },
      create: { ...svc, clinic_id: clinic.id, is_active: true },
      update: {},
    });
  }

  const flags = [
    'COGNITIVE_LEARNING','BEHAVIOR_TRACKING','PROACTIVE_SUGGESTIONS',
    'COLLECTIVE_INTELLIGENCE','ANONYMOUS_BENCHMARK','LAB_ANALYSIS_AI',
    'COGNITIVE_MEMORY','DIGITAL_TWIN','SCENARIO_SIMULATOR',
    'ADAPTIVE_INTERFACE','DOCTOR_PROFILE_LEARNING','ORCHESTRATION_MODE',
    'AUTONOMOUS_PLANNING','WEARABLES_INTEGRATION','LAB_DIRECT_INTEGRATION',
    'TELEMEDICINE',
  ];

  for (const flag of flags) {
    await prisma.featureFlag.upsert({
      where: { clinic_id_flag: { clinic_id: clinic.id, flag } },
      create: { clinic_id: clinic.id, flag, enabled: false },
      update: {},
    });
  }

  console.log(`[seed-prod] Done. MASTER: ${master.email} / Ayron@Master2025!`);
}

main()
  .catch((e) => { console.error('[seed-prod] ERROR:', e.message); process.exit(0); }) // non-fatal
  .finally(() => prisma.$disconnect());
