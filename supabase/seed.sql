-- ══════════════════════════════════════════════════════════════════════════════
-- AYRON v2 — Seed inicial (dados mock convertidos para dados reais)
-- Executa APÓS o schema
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Professionals ─────────────────────────────────────────────────────────────
INSERT INTO professionals (id, name, role, specialty, color) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'Dr. Murilo',       'MEDICO',      'Medicina Integrativa',  '#FF6B00'),
  ('a1000000-0000-0000-0000-000000000002', 'Amanda Gomes',     'MEDICO',      'Nutrologia',            '#10b981'),
  ('a1000000-0000-0000-0000-000000000003', 'Lorrana',          'ENFERMEIRO',  'Enfermagem Clínica',    '#6366f1'),
  ('a1000000-0000-0000-0000-000000000004', 'Dr. André',        'MEDICO',      'Longevidade',           '#f59e0b')
ON CONFLICT (id) DO NOTHING;

-- ── Patients ──────────────────────────────────────────────────────────────────
INSERT INTO patients (id, full_name, birth_date, sex, phone, email, current_status, tier, tags, tipo_contato, mala_direta, professional_id, lgpd_consent) VALUES
  ('P4821', 'Ana Lima',          '1988-03-15', 'F', '(11) 99999-0001', 'ana.lima@email.com',         'AGENDADO',               'DIAMANTE', '{"VIP","PROTOCOLO_ATIVO"}',    'WHATSAPP', TRUE, 'a1000000-0000-0000-0000-000000000001', TRUE),
  ('P3102', 'Carlos Souza',      '1980-07-22', 'M', '(11) 99999-0002', 'carlos.souza@email.com',     'AGENDADO',               'PLATINA',  '{"IMPLANTE","CONVENIO"}',      'WHATSAPP', TRUE, 'a1000000-0000-0000-0000-000000000001', TRUE),
  ('P1089', 'Beatriz Fernandes', '1993-11-08', 'F', '(11) 99999-0003', 'beatriz.f@email.com',        'AGENDADO',               'GOLD',     '{"SOROTERAPIA"}',              'WHATSAPP', TRUE, 'a1000000-0000-0000-0000-000000000002', TRUE),
  ('P2205', 'Pedro Gomes',       '1973-05-30', 'M', '(11) 99999-0004', 'pedro.gomes@email.com',      'AGENDADO',               'SILVER',   '{"INADIMPLENTE","EM_RISCO"}',  'WHATSAPP', FALSE,'a1000000-0000-0000-0000-000000000003', TRUE),
  ('P5542', 'Marina Costa',      '1997-09-14', 'F', '(11) 99999-0005', 'marina.costa@email.com',     'AGENDADO',               'GOLD',     '{"PROTOCOLO_ATIVO","HCG"}',    'WHATSAPP', TRUE, 'a1000000-0000-0000-0000-000000000001', TRUE),
  ('P0932', 'Roberto Alves',     '1964-12-03', 'M', '(11) 99999-0006', 'roberto.alves@email.com',    'AGUARDANDO_AGENDAMENTO', 'SILVER',   '{"EM_RISCO","LONGEVIDADE"}',   'EMAIL',    TRUE, 'a1000000-0000-0000-0000-000000000004', TRUE),
  ('P7731', 'Camila Dias',       '1985-04-19', 'F', '(11) 99999-0007', 'camila.dias@email.com',      'AGUARDANDO_AGENDAMENTO', 'BRONZE',   '{"EM_RISCO","PROTOCOLO_PAUSADO"}','WHATSAPP',FALSE,'a1000000-0000-0000-0000-000000000002', TRUE),
  ('P6621', 'Fernanda Lima',     '1991-01-27', 'F', '(11) 99999-0008', 'fernanda.lima@email.com',    'AGUARDANDO_AGENDAMENTO', 'SILVER',   '{"PROTOCOLO_PAUSADO"}',        'WHATSAPP', TRUE, 'a1000000-0000-0000-0000-000000000002', TRUE),
  ('P8834', 'Lucas Martins',     '1990-06-11', 'M', '(11) 99999-0009', 'lucas.martins@email.com',    'NOVA_LEAD',              'BRONZE',   '{}',                           'WHATSAPP', FALSE,'a1000000-0000-0000-0000-000000000001', FALSE),
  ('P9910', 'Sofia Ramos',       '2000-02-14', 'F', '(11) 99999-0010', 'sofia.ramos@email.com',      'CONFIRMADO',             'GOLD',     '{"SOROTERAPIA","VIP"}',        'INSTAGRAM',TRUE, 'a1000000-0000-0000-0000-000000000002', TRUE)
ON CONFLICT (id) DO NOTHING;

-- ── Appointments ──────────────────────────────────────────────────────────────
INSERT INTO appointments (patient_id, professional_id, start_time, end_time, type, status, procedure_name) VALUES
  ('P4821', 'a1000000-0000-0000-0000-000000000001', NOW() + INTERVAL '1 day 10:00',  NOW() + INTERVAL '1 day 11:00',  'FOLLOW_UP',    'SCHEDULED',  'Mounjaro — Retorno'),
  ('P3102', 'a1000000-0000-0000-0000-000000000001', NOW() + INTERVAL '1 day 11:30',  NOW() + INTERVAL '1 day 12:30',  'CONSULTATION', 'CONFIRMED',  'Implante Testosterona'),
  ('P1089', 'a1000000-0000-0000-0000-000000000002', NOW() + INTERVAL '2 days 09:00', NOW() + INTERVAL '2 days 10:00', 'PROCEDURE',    'SCHEDULED',  'Soroterapia'),
  ('P5542', 'a1000000-0000-0000-0000-000000000001', NOW() + INTERVAL '2 days 14:00', NOW() + INTERVAL '2 days 15:00', 'PROCEDURE',    'SCHEDULED',  'HCG + Enantato'),
  ('P9910', 'a1000000-0000-0000-0000-000000000002', NOW() + INTERVAL '3 days 10:00', NOW() + INTERVAL '3 days 11:00', 'CONSULTATION', 'CONFIRMED',  'Primeira Consulta Soroterapia')
ON CONFLICT DO NOTHING;

-- ── Patient Medical History (Anamnese) ───────────────────────────────────────
INSERT INTO patient_medical_history (patient_id, queixa, hda, antecedentes, habitos, familiar, medicamentos_uso) VALUES
  ('P4821',
   'Ganho de peso progressivo, fadiga e dificuldade de emagrecimento.',
   'Paciente relata aumento de 18kg nos últimos 3 anos após gravidez. Dieta hipocalórica sem resultado. Iniciou protocolo Mounjaro em Jan/2026.',
   'Hipotireoidismo controlado com levotiroxina. Sem DM, HAS ou cardiopatia.',
   'Sedentária. Consumo de álcool social. Nega tabagismo. Sono regular 6h/noite.',
   'Mãe com obesidade e DM2. Pai com HAS.',
   'Levotiroxina 50mcg/dia · Ácido fólico 5mg/dia · Vitamina D3 50.000UI/semana'),
  ('P3102',
   'Queda de libido, fadiga crônica e perda de massa muscular.',
   'Paciente refere sintomas há 2 anos. Testosterona total: 280 ng/dL (referência: 400-1000). Iniciou implante testosterona Mar/2025.',
   'Sem comorbidades relevantes. Ex-atleta amador.',
   'Sedentário. Nega tabagismo e álcool. Sono irregular.',
   'Pai com hipogonadismo tardio.',
   'Implante testosterona 200mg — troca a cada 4 meses'),
  ('P5542',
   'Irregularidade menstrual e queda de rendimento físico.',
   'Atleta amadora, usa HCG + Enantato para otimização hormonal. Protocolo iniciado Fev/2026.',
   'Saudável. Sem alergias conhecidas.',
   'Ativa. Treino 5x/semana. Dieta proteica. Nega fumo e álcool.',
   'Sem relevância.',
   'HCG 5.000 UI IM · Enantato testosterona 25mg/semana')
ON CONFLICT (patient_id) DO NOTHING;

-- ── Patient Evolutions ────────────────────────────────────────────────────────
INSERT INTO patient_evolutions (patient_id, professional_id, date, type, cid, subjetivo, objetivo, avaliacao, plano, ai_summary) VALUES
  ('P4821', 'a1000000-0000-0000-0000-000000000001', '2026-04-11', 'Consulta',
   'E66.0 — Obesidade grau II',
   'Paciente relata redução de 3,2kg no último mês. Boa tolerância à medicação. Apetite controlado. Sono melhorado.',
   'PA: 120/80 · FC: 72bpm · Peso: 87,4kg · IMC: 29.1 · Circunferência abdominal: 94cm',
   'Boa resposta ao protocolo Mounjaro 10mg. Perda de peso progressiva. Sem comorbidades descompensadas.',
   'Manter dose Mounjaro 10mg semanal. Retorno em 14 dias. Solicitar hemograma + glicemia + perfil lipídico.',
   'AYRON: paciente com excelente adesão. Score CSS 82/100. Probabilidade de continuidade: 94%.'),
  ('P4821', 'a1000000-0000-0000-0000-000000000003', '2026-03-28', 'Procedimento',
   'E66.0 — Obesidade grau II',
   'Retorno para aplicação Mounjaro #6. Leve náusea nas primeiras 24h após última aplicação.',
   'Peso: 90,6kg · IMC: 30.1',
   'Náusea leve esperada. Orientações sobre alimentação pós-aplicação reforçadas.',
   'Aplicação Mounjaro 10mg subcutâneo. Próxima sessão: 11/04.',
   NULL),
  ('P3102', 'a1000000-0000-0000-0000-000000000001', '2026-01-22', 'Consulta',
   'E29.1 — Hipogonadismo masculino',
   'Melhora significativa de energia e libido após implante. Sem efeitos adversos.',
   'Testosterona total: 680 ng/dL · Hematócrito: 46%',
   'Resposta excelente ao implante. Valores dentro do alvo terapêutico.',
   'Retorno em 4 meses para nova troca de implante. Manter acompanhamento semestral.',
   'AYRON: adesão 100%. Próxima troca prevista: Mai/2026. Score CSS 78/100.'),
  ('P5542', 'a1000000-0000-0000-0000-000000000001', '2026-04-10', 'Procedimento',
   'Z79.890 — Uso de hormônio',
   'Paciente sem queixas. Energia ótima. Ciclo menstrual estável.',
   'Peso: 64kg · CA: 76cm · PA: 110/70',
   'Evolução satisfatória. Protocolo dentro do plano.',
   'Aplicação HCG 5.000UI + Enantato 25mg. Retorno em 7 dias.',
   NULL)
ON CONFLICT DO NOTHING;

-- ── Prescriptions ─────────────────────────────────────────────────────────────
WITH inserted AS (
  INSERT INTO patient_prescriptions (id, patient_id, professional_id, date, validade, status) VALUES
    ('b1000000-0000-0000-0000-000000000001', 'P4821', 'a1000000-0000-0000-0000-000000000001', '2026-04-11', '2026-05-11', 'ATIVA'),
    ('b1000000-0000-0000-0000-000000000002', 'P4821', 'a1000000-0000-0000-0000-000000000001', '2026-03-01', '2026-04-01', 'VENCIDA'),
    ('b1000000-0000-0000-0000-000000000003', 'P3102', 'a1000000-0000-0000-0000-000000000001', '2026-01-22', '2026-05-22', 'ATIVA')
  ON CONFLICT (id) DO NOTHING
  RETURNING id
)
SELECT 1;

INSERT INTO prescription_items (prescription_id, med, dosagem, qtd, obs) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'Tirzepatida (Mounjaro) 10mg',    '0,5mL subcutâneo semanal',   '4 canetas',       'Aplicar no abdome, coxa ou braço — alternar locais'),
  ('b1000000-0000-0000-0000-000000000002', 'Ácido fólico 5mg',               '1 comprimido ao dia',        '30 comprimidos',  ''),
  ('b1000000-0000-0000-0000-000000000002', 'Vitamina D3 50.000UI',           '1 cápsula por semana',       '4 cápsulas',      'Tomar com refeição'),
  ('b1000000-0000-0000-0000-000000000003', 'Implante Testosterona 200mg',    'Implante subcutâneo',        '1 implante',      'Troca a cada 4 meses — próxima: Mai/2026')
ON CONFLICT DO NOTHING;

-- ── Patient Exams ─────────────────────────────────────────────────────────────
INSERT INTO patient_exams (patient_id, name, date, lab, status, resultado, ai_data) VALUES
  ('P4821', 'Hemograma completo',   '2026-04-01', 'Delboni', 'NORMAL',   'Todos índices dentro da normalidade. Hb: 13,2 · Plaquetas: 248k · Leucócitos: 7.200',
   '[{"item":"Hemoglobina","valor":"13,2","unidade":"g/dL","ref":"12–16","nivel":"ideal"},{"item":"Plaquetas","valor":"248.000","unidade":"/μL","ref":"150k–400k","nivel":"ideal"}]'),
  ('P4821', 'Glicemia de jejum',    '2026-04-01', 'Delboni', 'NORMAL',   'Glicemia: 89 mg/dL — dentro do alvo', NULL),
  ('P4821', 'Perfil lipídico',      '2026-04-01', 'Delboni', 'ATENCAO',  'LDL: 142 mg/dL (limítrofe). HDL: 52. TG: 98.',
   '[{"item":"LDL","valor":"142","unidade":"mg/dL","ref":"<130","nivel":"alto"},{"item":"HDL","valor":"52","unidade":"mg/dL","ref":">40","nivel":"ideal"}]'),
  ('P3102', 'Testosterona total',   '2026-01-22', 'Fleury',  'NORMAL',   'Testosterona total: 680 ng/dL — dentro do alvo terapêutico', NULL),
  ('P2205', 'Perfil lipídico',      '2026-03-10', 'Fleury',  'ATENCAO',  'LDL: 168 mg/dL (elevado). Risco cardiovascular aumentado.',
   '[{"item":"LDL","valor":"168","unidade":"mg/dL","ref":"<130","nivel":"alto"}]')
ON CONFLICT DO NOTHING;

-- ── Treatment Protocols ───────────────────────────────────────────────────────
INSERT INTO treatment_protocols (patient_id, professional_id, protocol_name, category, total_sessions, completed_sessions, start_date, next_session_date, last_session_date, interval_days, status, notes) VALUES
  ('P4821', 'a1000000-0000-0000-0000-000000000001', 'Mounjaro 10mg — Emagrecimento',       'Emagrecimento',  12, 6,  '2026-01-11', '2026-05-09', '2026-04-11', 7,  'ATIVO',   'Boa adesão. Meta: -12kg em 3 meses'),
  ('P3102', 'a1000000-0000-0000-0000-000000000001', 'Implante Testosterona — Ciclo 12m',   'Hormonal',       3,  1,  '2025-09-22', '2026-05-22', '2026-01-22', 120,'ATIVO',   'Troca a cada 4 meses'),
  ('P1089', 'a1000000-0000-0000-0000-000000000002', 'Soroterapia — 10 sessões',            'Nutrição',       10, 4,  '2026-02-10', '2026-05-06', '2026-04-10', 14, 'ATIVO',   ''),
  ('P2205', 'a1000000-0000-0000-0000-000000000003', 'Mounjaro 4mg — Protocolo Inicial',    'Emagrecimento',  12, 4,  '2026-01-15', NULL,         '2026-03-27', 7,  'ATRASADO','Atraso de 18 dias. Inadimplente.'),
  ('P5542', 'a1000000-0000-0000-0000-000000000001', 'HCG + Enantato — Performance',        'Performance',    8,  3,  '2026-02-14', '2026-05-03', '2026-04-10', 7,  'ATIVO',   ''),
  ('P0932', 'a1000000-0000-0000-0000-000000000004', 'NADH — Longevidade 6 meses',          'Longevidade',    6,  2,  '2025-12-01', NULL,         '2026-02-15', 30, 'ATRASADO','Sem retorno há 70 dias'),
  ('P7731', 'a1000000-0000-0000-0000-000000000002', 'Gestrinona — Protocolo Hormonal',     'Hormonal',       6,  2,  '2025-08-01', NULL,         '2025-12-22', 30, 'PAUSADO', 'Protocolo interrompido há 4 meses'),
  ('P6621', 'a1000000-0000-0000-0000-000000000002', 'Soroterapia — 10 sessões',            'Nutrição',       10, 5,  '2025-10-01', NULL,         '2026-03-01', 14, 'PAUSADO', 'Retorno em atraso crítico — 55 dias')
ON CONFLICT DO NOTHING;

-- ── Alerts ────────────────────────────────────────────────────────────────────
INSERT INTO alerts (patient_id, type, severity, title, description, status, due_date) VALUES
  ('P2205', 'FINANCEIRO', 'CRITICAL', 'Fatura vencida há 34 dias', 'Fatura G-2205 de R$ 450,00 vencida. Protocolo ativo em risco.', 'OPEN', NOW()::DATE - 34),
  ('P0932', 'PROTOCOLO',  'HIGH',     'Protocolo NADH atrasado 70 dias', 'Paciente Roberto Alves não retorna há 70 dias.', 'OPEN', NOW()::DATE - 70),
  ('P7731', 'PROTOCOLO',  'HIGH',     'Protocolo Gestrinona pausado 4 meses', 'Camila Dias — protocolo hormonal interrompido. Risco de abandono.', 'OPEN', NOW()::DATE - 120),
  ('P6621', 'RETORNO',    'MEDIUM',   'Retorno em atraso crítico', 'Fernanda Lima — Soroterapia pausada há 55 dias. Retorno não agendado.', 'OPEN', NOW()::DATE - 55),
  ('P2205', 'CLINICO',    'HIGH',     'LDL elevado sem acompanhamento', 'Pedro Gomes — LDL 168 mg/dL. Risco cardiovascular não tratado.', 'OPEN', '2026-03-10')
ON CONFLICT DO NOTHING;

-- ── Financial Transactions ────────────────────────────────────────────────────
INSERT INTO financial_transactions (patient_id, descricao, valor, pago, tipo, status, vencimento, classificacao, forma_pagamento) VALUES
  ('P3102', 'Consulta + Implante Testosterona',    1200.00, 0.00,    'RECEBER', 'ABERTO',  '2026-05-10', 'Receita Clínica',   'PIX'),
  ('P4821', 'Protocolo Mounjaro — Parcela 6/12',   850.00,  850.00,  'RECEBER', 'PAGO',    '2026-04-01', 'Receita Clínica',   'Cartão Crédito'),
  ('P5542', 'Protocolo HCG + Enantato — Sessão 3', 650.00,  400.00,  'RECEBER', 'PARCIAL', '2026-04-30', 'Receita Clínica',   'PIX'),
  ('P2205', 'Consulta Mounjaro — Sessão 4',        450.00,  0.00,    'RECEBER', 'VENCIDO', '2026-03-29', 'Receita Clínica',   'PIX'),
  ('P1089', 'Soroterapia — Sessão 4/10',           380.00,  380.00,  'RECEBER', 'PAGO',    '2026-04-10', 'Receita Clínica',   'Débito'),
  (NULL,    'Aluguel sala procedimentos — Mai/26', 3200.00, 0.00,    'PAGAR',   'ABERTO',  '2026-05-05', 'Despesa Fixa',      NULL),
  (NULL,    'Insumos — Seringas e agulhas',        420.00,  420.00,  'PAGAR',   'PAGO',    '2026-04-20', 'Insumos',           NULL)
ON CONFLICT DO NOTHING;
