import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding AYRON database...');

  const org = await prisma.organization.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'AYRON Health Group',
      plan_tier: 'COGNITIVE',
      is_active: true,
    },
    update: {},
  });

  const clinic = await prisma.clinic.upsert({
    where: { id: '00000000-0000-0000-0000-000000000002' },
    create: {
      id: '00000000-0000-0000-0000-000000000002',
      organization_id: org.id,
      name: 'Clínica Piloto AYRON — Endocrinologia',
      specialty: 'endocrinologia',
      timezone: 'America/Sao_Paulo',
      is_active: true,
    },
    update: {},
  });

  const masterPassword = await bcrypt.hash('Ayron@Master2025!', 12);

  const master = await prisma.user.upsert({
    where: { id: '00000000-0000-0000-0000-000000000003' },
    create: {
      id: '00000000-0000-0000-0000-000000000003',
      organization_id: org.id,
      clinic_id: clinic.id,
      name: 'MASTER Admin',
      email: 'master@ayron.health',
      password_hash: masterPassword,
      role: UserRole.MASTER,
      is_active: true,
    },
    update: {},
  });

  // Professional linked to MASTER user
  const professional = await prisma.professional.upsert({
    where: { id: '00000000-0000-0000-0000-000000000010' },
    create: {
      id: '00000000-0000-0000-0000-000000000010',
      clinic_id: clinic.id,
      user_id: master.id,
      name: 'Dr(a). Admin Piloto',
      specialty: 'Endocrinologia & Alta Performance',
      crm: 'CRM/SP 000000',
      is_active: true,
    },
    update: {},
  });

  // Services for Endocrinology / High Performance
  const serviceDefs = [
    { id: '00000000-0000-0000-0000-000000000020', name: 'Consulta de Endocrinologia', duration_min: 50, price: 45000 },
    { id: '00000000-0000-0000-0000-000000000021', name: 'Consulta de Retorno', duration_min: 30, price: 30000 },
    { id: '00000000-0000-0000-0000-000000000022', name: 'Avaliação de Composição Corporal', duration_min: 60, price: 35000 },
    { id: '00000000-0000-0000-0000-000000000023', name: 'Implante Hormonal', duration_min: 30, price: 120000 },
    { id: '00000000-0000-0000-0000-000000000024', name: 'Soroterapia', duration_min: 90, price: 80000 },
    { id: '00000000-0000-0000-0000-000000000025', name: 'Revisão de Exames', duration_min: 30, price: 20000 },
  ];

  for (const svc of serviceDefs) {
    await prisma.service.upsert({
      where: { id: svc.id },
      create: {
        ...svc,
        clinic_id: clinic.id,
        is_active: true,
        price: svc.price,
      },
      update: {},
    });
  }

  const featureFlags = [
    'COGNITIVE_LEARNING', 'BEHAVIOR_TRACKING', 'PROACTIVE_SUGGESTIONS',
    'COLLECTIVE_INTELLIGENCE', 'ANONYMOUS_BENCHMARK', 'LAB_ANALYSIS_AI',
    'COGNITIVE_MEMORY', 'DIGITAL_TWIN', 'SCENARIO_SIMULATOR',
    'ADAPTIVE_INTERFACE', 'DOCTOR_PROFILE_LEARNING', 'ORCHESTRATION_MODE',
    'AUTONOMOUS_PLANNING', 'WEARABLES_INTEGRATION', 'LAB_DIRECT_INTEGRATION',
    'TELEMEDICINE',
  ] as const;

  for (const flag of featureFlags) {
    await prisma.featureFlag.upsert({
      where: { clinic_id_flag: { clinic_id: clinic.id, flag } },
      create: { clinic_id: clinic.id, flag, enabled: false },
      update: {},
    });
  }

  console.log('Seed completed:');
  console.log(` Organization: ${org.name} (${org.id})`);
  console.log(` Clinic: ${clinic.name} (${clinic.id})`);
  console.log(` MASTER user: ${master.email} / Ayron@Master2025!`);
  console.log(` Professional: ${professional.name}`);
  console.log(` Services: ${serviceDefs.length} created`);
  console.log(` Feature flags: ${featureFlags.length} created (all disabled)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
