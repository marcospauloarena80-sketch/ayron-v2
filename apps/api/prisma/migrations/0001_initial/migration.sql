-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateExtension (graceful fallback if pgvector not installed on host)
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS "vector";
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pgvector extension not available on this host, skipping vector support';
END
$$;

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('MASTER', 'GERENTE', 'MEDICO', 'ENFERMEIRA', 'TECNICA', 'CONCIERGE', 'ADMINISTRATIVO', 'FINANCEIRO');

-- CreateEnum
CREATE TYPE "PatientStatus" AS ENUM ('NOVA_LEAD', 'AGUARDANDO_AGENDAMENTO', 'AGENDADO', 'CONFIRMADO', 'CONSULTA', 'PROCEDIMENTO', 'LISTA_ESPERA', 'CANCELADO', 'FALTOU', 'REAGENDADO', 'INATIVO', 'AGUARDANDO_ATENDIMENTO');

-- CreateEnum
CREATE TYPE "PatientRiskLevel" AS ENUM ('PREVENTIVO', 'ATENCAO', 'PRIORITARIO', 'CRITICO');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('SCHEDULED', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'MISSED', 'RESCHEDULED', 'WAITLIST');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('CONSULTATION', 'PROCEDURE', 'RETURN', 'EVALUATION', 'TELECONSULTATION', 'EXAM_REVIEW');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PRESCRIPTION', 'CERTIFICATE', 'EXAM_REQUEST', 'REFERRAL', 'REPORT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('DRAFT', 'SIGNED', 'REVOKED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('REVENUE', 'EXPENSE', 'REFUND', 'TRANSFER');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELLED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'PIX', 'BANK_TRANSFER', 'HEALTH_INSURANCE', 'INSTALLMENT');

-- CreateEnum
CREATE TYPE "InventoryMovementType" AS ENUM ('ENTRY', 'EXIT', 'ADJUSTMENT', 'LOSS', 'TRANSFER');

-- CreateEnum
CREATE TYPE "DecisionProposalStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'MODIFIED_AND_APPROVED', 'EXECUTING', 'EXECUTED', 'EXPIRED', 'ESCALATED');

-- CreateEnum
CREATE TYPE "DecisionProposalType" AS ENUM ('CLINICAL', 'OPERATIONAL', 'FINANCIAL', 'RELATIONAL', 'STRATEGIC', 'INVENTORY');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MODERATE', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "CognitivePriority" AS ENUM ('P0_CRITICAL', 'P1_HIGH', 'P2_OPTIMIZATION', 'P3_INFORMATIONAL');

-- CreateEnum
CREATE TYPE "MemoryType" AS ENUM ('CLINICAL_PATTERN', 'BEHAVIORAL_PATTERN', 'OPERATIONAL_PATTERN', 'FINANCIAL_PATTERN', 'PREFERENCE');

-- CreateEnum
CREATE TYPE "FeatureFlagKey" AS ENUM ('COGNITIVE_LEARNING', 'BEHAVIOR_TRACKING', 'PROACTIVE_SUGGESTIONS', 'COLLECTIVE_INTELLIGENCE', 'ANONYMOUS_BENCHMARK', 'LAB_ANALYSIS_AI', 'COGNITIVE_MEMORY', 'DIGITAL_TWIN', 'SCENARIO_SIMULATOR', 'ADAPTIVE_INTERFACE', 'DOCTOR_PROFILE_LEARNING', 'ORCHESTRATION_MODE', 'AUTONOMOUS_PLANNING', 'WEARABLES_INTEGRATION', 'LAB_DIRECT_INTEGRATION', 'TELEMEDICINE');

-- CreateEnum
CREATE TYPE "ExamMarkerStatus" AS ENUM ('LOW', 'IDEAL', 'HIGH', 'CRITICAL_LOW', 'CRITICAL_HIGH');

-- CreateEnum
CREATE TYPE "CommunicationChannelType" AS ENUM ('GENERAL', 'DOCTORS', 'RECEPTION', 'NURSING', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "MessagePriority" AS ENUM ('NORMAL', 'URGENT', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'READ', 'UPDATE', 'DELETE_SOFT', 'LOGIN', 'LOGOUT', 'APPROVE', 'REJECT', 'SIGN', 'EXPORT', 'AI_GENERATE', 'AI_APPROVE', 'AI_REJECT', 'PERMISSION_CHANGE');

-- CreateEnum
CREATE TYPE "ConsentType" AS ENUM ('TREATMENT_DATA', 'MARKETING', 'RESEARCH_ANONYMOUS', 'THIRD_PARTY_SHARING', 'AI_PROCESSING', 'WEARABLE_INTEGRATION', 'TELEMEDICINE');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('GRANTED', 'REVOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT,
    "plan_tier" TEXT NOT NULL DEFAULT 'CORE',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "settings" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinics" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT,
    "address" JSONB,
    "phone" TEXT,
    "email" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "specialty" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "clinics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "permissions" JSONB NOT NULL DEFAULT '{}',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professionals" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "user_id" TEXT,
    "name" TEXT NOT NULL,
    "specialty" TEXT,
    "crm" TEXT,
    "crm_state" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "professionals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "professional_schedules" (
    "id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "slot_duration" INTEGER NOT NULL DEFAULT 30,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "professional_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "birth_date" TIMESTAMP(3) NOT NULL,
    "sex" TEXT NOT NULL,
    "cpf" TEXT,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" JSONB,
    "insurance" JSONB,
    "risk_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "risk_level" "PatientRiskLevel" NOT NULL DEFAULT 'PREVENTIVO',
    "current_status" "PatientStatus" NOT NULL DEFAULT 'NOVA_LEAD',
    -- "cognitive_vector" vector(1536), -- requires pgvector, deferred
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_status_history" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "from_status" "PatientStatus",
    "to_status" "PatientStatus" NOT NULL,
    "changed_by" TEXT NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "duration_min" INTEGER NOT NULL DEFAULT 30,
    "price" DECIMAL(12,2),
    "color" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "professional_id" TEXT NOT NULL,
    "service_id" TEXT,
    "type" "AppointmentType" NOT NULL DEFAULT 'CONSULTATION',
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "checked_in_at" TIMESTAMP(3),
    "checked_out_at" TIMESTAMP(3),
    "notes" TEXT,
    "cancellation_reason" TEXT,
    "is_telemedicine" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist_entries" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "service_id" TEXT,
    "professional_id" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "waitlist_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_records" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "appointment_id" TEXT,
    "professional_id" TEXT NOT NULL,
    "transcription" TEXT,
    "structured_data" JSONB NOT NULL DEFAULT '{}',
    "summary_ai" TEXT,
    "voice_file_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "clinical_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exams" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "exam_date" TIMESTAMP(3) NOT NULL,
    "laboratory" TEXT,
    "file_url" TEXT,
    "ocr_raw" TEXT,
    "processing_status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_markers" (
    "id" TEXT NOT NULL,
    "exam_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "marker_name" TEXT NOT NULL,
    "standardized_name" TEXT,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "ideal_min" DOUBLE PRECISION,
    "ideal_max" DOUBLE PRECISION,
    "functional_min" DOUBLE PRECISION,
    "functional_max" DOUBLE PRECISION,
    "status" "ExamMarkerStatus" NOT NULL,
    "trend" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exam_markers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "biomarker_references" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "standardized_name" TEXT NOT NULL,
    "unit" TEXT,
    "ideal_min" DOUBLE PRECISION,
    "ideal_max" DOUBLE PRECISION,
    "functional_min" DOUBLE PRECISION,
    "functional_max" DOUBLE PRECISION,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "biomarker_references_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_templates" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "content" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "created_by" TEXT NOT NULL,
    "template_id" TEXT,
    "type" "DocumentType" NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "content" TEXT NOT NULL,
    "file_url" TEXT,
    "signed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_signatures" (
    "id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "signed_by" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "signed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,

    CONSTRAINT "document_signatures_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transactions" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT,
    "appointment_id" TEXT,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(12,2) NOT NULL,
    "payment_method" "PaymentMethod",
    "description" TEXT,
    "reference_code" TEXT,
    "due_date" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "category" TEXT,
    "insurance_claim" JSONB,
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_closings" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "closing_date" TIMESTAMP(3) NOT NULL,
    "total_revenue" DECIMAL(12,2) NOT NULL,
    "total_expenses" DECIMAL(12,2) NOT NULL,
    "net_result" DECIMAL(12,2) NOT NULL,
    "appointments_total" INTEGER NOT NULL,
    "appointments_completed" INTEGER NOT NULL,
    "closing_summary" JSONB NOT NULL DEFAULT '{}',
    "closed_by" TEXT NOT NULL,
    "closed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "has_pendencies" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "daily_closings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_items" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "description" TEXT,
    "unit" TEXT NOT NULL DEFAULT 'UN',
    "quantity" INTEGER NOT NULL DEFAULT 0,
    "minimum_level" INTEGER NOT NULL DEFAULT 0,
    "unit_cost" DECIMAL(12,2),
    "barcode" TEXT,
    "location" TEXT,
    "expiry_date" TIMESTAMP(3),
    "batch_number" TEXT,
    "supplier_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "inventory_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_movements" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "type" "InventoryMovementType" NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_cost" DECIMAL(12,2),
    "ocr_source" TEXT,
    "ocr_data" JSONB,
    "notes" TEXT,
    "performed_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "document" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_channels" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "CommunicationChannelType" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "communication_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "communication_messages" (
    "id" TEXT NOT NULL,
    "channel_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "priority" "MessagePriority" NOT NULL DEFAULT 'NORMAL',
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "communication_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_templates" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "form_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_fields" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "options" JSONB,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "form_fields_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_responses" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "form_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "event_version" TEXT NOT NULL DEFAULT '1.0',
    "entity_type" TEXT,
    "entity_id" TEXT,
    "actor_id" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decision_proposals" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "proposal_type" "DecisionProposalType" NOT NULL,
    "priority" "CognitivePriority" NOT NULL DEFAULT 'P2_OPTIMIZATION',
    "risk_level" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "status" "DecisionProposalStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "context" TEXT NOT NULL,
    "analysis" TEXT NOT NULL,
    "ai_reasoning" TEXT NOT NULL,
    "proposed_action" JSONB NOT NULL,
    "expected_impact" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "data_sources" JSONB NOT NULL,
    "data_snapshot_hash" TEXT,
    "ai_model_version" TEXT,
    "required_role" "UserRole" NOT NULL,
    "expires_at" TIMESTAMP(3),
    "created_by_agent" TEXT NOT NULL,
    "approved_by" TEXT,
    "rejection_reason" TEXT,
    "modification_note" TEXT,
    "approved_at" TIMESTAMP(3),
    "executed_at" TIMESTAMP(3),
    "execution_result" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "decision_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT,
    "organization_id" TEXT,
    "actor_id" TEXT,
    "actor_role" "UserRole",
    "action" "AuditAction" NOT NULL,
    "entity_type" TEXT,
    "entity_id" TEXT,
    "proposal_id" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "data_before" JSONB,
    "data_after" JSONB,
    "data_snapshot_hash" TEXT,
    "ip_address" TEXT,
    "session_id" TEXT,
    "ai_model_version" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_action_logs" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "agent_name" TEXT NOT NULL,
    "model_version" TEXT,
    "input_summary" TEXT NOT NULL,
    "output_type" TEXT NOT NULL,
    "output_id" TEXT,
    "confidence" DOUBLE PRECISION,
    "latency_ms" INTEGER,
    "tokens_used" INTEGER,
    "cost_usd" DOUBLE PRECISION,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_action_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cognitive_memory" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT,
    "memory_type" "MemoryType" NOT NULL,
    "memory_text" TEXT NOT NULL,
    -- "embedding" vector(1536), -- requires pgvector, deferred
    "relevance_score" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "source_events" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3),

    CONSTRAINT "cognitive_memory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "behavior_patterns" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "user_id" TEXT,
    "pattern_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "sample_count" INTEGER NOT NULL DEFAULT 1,
    "pattern_data" JSONB NOT NULL DEFAULT '{}',
    "detected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_confirmed" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "behavior_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digital_twin_snapshots" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "snapshot_type" TEXT NOT NULL,
    "simulation_data" JSONB NOT NULL,
    "prediction_window_days" INTEGER NOT NULL DEFAULT 30,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "scenario_description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "digital_twin_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinic_metrics_daily" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "metric_date" TIMESTAMP(3) NOT NULL,
    "appointments_scheduled" INTEGER NOT NULL DEFAULT 0,
    "appointments_completed" INTEGER NOT NULL DEFAULT 0,
    "appointments_missed" INTEGER NOT NULL DEFAULT 0,
    "appointments_cancelled" INTEGER NOT NULL DEFAULT 0,
    "new_patients" INTEGER NOT NULL DEFAULT 0,
    "returning_patients" INTEGER NOT NULL DEFAULT 0,
    "revenue_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "avg_consultation_min" DOUBLE PRECISION,
    "occupation_rate" DOUBLE PRECISION,
    "clinic_health_score" DOUBLE PRECISION,
    "score_breakdown" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinic_metrics_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feature_flags" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "flag" "FeatureFlagKey" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB DEFAULT '{}',
    "enabled_at" TIMESTAMP(3),
    "updated_by" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_logs" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT,
    "user_id" TEXT,
    "channel" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "sent_at" TIMESTAMP(3),
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wearable_data_points" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "metric_type" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "unit" TEXT,
    "recorded_at" TIMESTAMP(3) NOT NULL,
    "is_anomaly" BOOLEAN NOT NULL DEFAULT false,
    "clinical_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wearable_data_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_consent_records" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "consent_type" "ConsentType" NOT NULL,
    "status" "ConsentStatus" NOT NULL DEFAULT 'GRANTED',
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "ip_address" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'WEB',
    "notes" TEXT,
    "document_url" TEXT,

    CONSTRAINT "patient_consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "organizations_is_active_idx" ON "organizations"("is_active");

-- CreateIndex
CREATE INDEX "clinics_organization_id_is_active_idx" ON "clinics"("organization_id", "is_active");

-- CreateIndex
CREATE INDEX "users_clinic_id_role_is_active_idx" ON "users"("clinic_id", "role", "is_active");

-- CreateIndex
CREATE INDEX "users_email_idx" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_clinic_id_key" ON "users"("email", "clinic_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_expires_at_idx" ON "sessions"("user_id", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "professionals_user_id_key" ON "professionals"("user_id");

-- CreateIndex
CREATE INDEX "professionals_clinic_id_is_active_idx" ON "professionals"("clinic_id", "is_active");

-- CreateIndex
CREATE INDEX "professional_schedules_clinic_id_day_of_week_idx" ON "professional_schedules"("clinic_id", "day_of_week");

-- CreateIndex
CREATE UNIQUE INDEX "professional_schedules_professional_id_day_of_week_key" ON "professional_schedules"("professional_id", "day_of_week");

-- CreateIndex
CREATE INDEX "patients_clinic_id_cpf_idx" ON "patients"("clinic_id", "cpf");

-- CreateIndex
CREATE INDEX "patients_clinic_id_current_status_idx" ON "patients"("clinic_id", "current_status");

-- CreateIndex
CREATE INDEX "patients_clinic_id_risk_level_idx" ON "patients"("clinic_id", "risk_level");

-- CreateIndex
CREATE INDEX "patients_clinic_id_is_active_idx" ON "patients"("clinic_id", "is_active");

-- CreateIndex
CREATE INDEX "patient_status_history_patient_id_created_at_idx" ON "patient_status_history"("patient_id", "created_at");

-- CreateIndex
CREATE INDEX "services_clinic_id_is_active_idx" ON "services"("clinic_id", "is_active");

-- CreateIndex
CREATE INDEX "appointments_clinic_id_start_time_idx" ON "appointments"("clinic_id", "start_time");

-- CreateIndex
CREATE INDEX "appointments_clinic_id_status_start_time_idx" ON "appointments"("clinic_id", "status", "start_time");

-- CreateIndex
CREATE INDEX "appointments_patient_id_start_time_idx" ON "appointments"("patient_id", "start_time");

-- CreateIndex
CREATE INDEX "appointments_professional_id_start_time_idx" ON "appointments"("professional_id", "start_time");

-- CreateIndex
CREATE INDEX "waitlist_entries_clinic_id_resolved_at_priority_idx" ON "waitlist_entries"("clinic_id", "resolved_at", "priority");

-- CreateIndex
CREATE INDEX "clinical_records_clinic_id_patient_id_created_at_idx" ON "clinical_records"("clinic_id", "patient_id", "created_at");

-- CreateIndex
CREATE INDEX "exams_clinic_id_patient_id_exam_date_idx" ON "exams"("clinic_id", "patient_id", "exam_date");

-- CreateIndex
CREATE INDEX "exam_markers_patient_id_standardized_name_created_at_idx" ON "exam_markers"("patient_id", "standardized_name", "created_at" DESC);

-- CreateIndex
CREATE INDEX "exam_markers_exam_id_idx" ON "exam_markers"("exam_id");

-- CreateIndex
CREATE UNIQUE INDEX "biomarker_references_clinic_id_standardized_name_key" ON "biomarker_references"("clinic_id", "standardized_name");

-- CreateIndex
CREATE INDEX "document_templates_clinic_id_type_is_active_idx" ON "document_templates"("clinic_id", "type", "is_active");

-- CreateIndex
CREATE INDEX "documents_clinic_id_patient_id_status_idx" ON "documents"("clinic_id", "patient_id", "status");

-- CreateIndex
CREATE INDEX "transactions_clinic_id_status_due_date_idx" ON "transactions"("clinic_id", "status", "due_date");

-- CreateIndex
CREATE INDEX "transactions_clinic_id_type_created_at_idx" ON "transactions"("clinic_id", "type", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "daily_closings_clinic_id_closing_date_key" ON "daily_closings"("clinic_id", "closing_date");

-- CreateIndex
CREATE INDEX "inventory_items_clinic_id_quantity_minimum_level_idx" ON "inventory_items"("clinic_id", "quantity", "minimum_level");

-- CreateIndex
CREATE INDEX "inventory_movements_item_id_created_at_idx" ON "inventory_movements"("item_id", "created_at");

-- CreateIndex
CREATE INDEX "inventory_movements_clinic_id_type_created_at_idx" ON "inventory_movements"("clinic_id", "type", "created_at");

-- CreateIndex
CREATE INDEX "suppliers_clinic_id_is_active_idx" ON "suppliers"("clinic_id", "is_active");

-- CreateIndex
CREATE INDEX "communication_channels_clinic_id_type_idx" ON "communication_channels"("clinic_id", "type");

-- CreateIndex
CREATE INDEX "communication_messages_channel_id_created_at_idx" ON "communication_messages"("channel_id", "created_at");

-- CreateIndex
CREATE INDEX "communication_messages_clinic_id_priority_is_read_idx" ON "communication_messages"("clinic_id", "priority", "is_read");

-- CreateIndex
CREATE INDEX "form_templates_clinic_id_is_active_idx" ON "form_templates"("clinic_id", "is_active");

-- CreateIndex
CREATE INDEX "form_responses_clinic_id_template_id_completed_idx" ON "form_responses"("clinic_id", "template_id", "completed");

-- CreateIndex
CREATE INDEX "events_clinic_id_created_at_idx" ON "events"("clinic_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "events_clinic_id_event_type_created_at_idx" ON "events"("clinic_id", "event_type", "created_at" DESC);

-- CreateIndex
CREATE INDEX "events_entity_type_entity_id_created_at_idx" ON "events"("entity_type", "entity_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "events_processed_created_at_idx" ON "events"("processed", "created_at");

-- CreateIndex
CREATE INDEX "decision_proposals_clinic_id_status_priority_idx" ON "decision_proposals"("clinic_id", "status", "priority");

-- CreateIndex
CREATE INDEX "decision_proposals_clinic_id_status_expires_at_idx" ON "decision_proposals"("clinic_id", "status", "expires_at");

-- CreateIndex
CREATE INDEX "decision_proposals_clinic_id_proposal_type_created_at_idx" ON "decision_proposals"("clinic_id", "proposal_type", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_clinic_id_created_at_idx" ON "audit_logs"("clinic_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_created_at_idx" ON "audit_logs"("entity_type", "entity_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at" DESC);

-- CreateIndex
CREATE INDEX "ai_action_logs_clinic_id_agent_name_created_at_idx" ON "ai_action_logs"("clinic_id", "agent_name", "created_at");

-- CreateIndex
CREATE INDEX "ai_action_logs_success_created_at_idx" ON "ai_action_logs"("success", "created_at");

-- CreateIndex
CREATE INDEX "cognitive_memory_clinic_id_memory_type_is_active_idx" ON "cognitive_memory"("clinic_id", "memory_type", "is_active");

-- CreateIndex
CREATE INDEX "cognitive_memory_patient_id_memory_type_idx" ON "cognitive_memory"("patient_id", "memory_type");

-- CreateIndex
CREATE INDEX "behavior_patterns_clinic_id_pattern_type_is_active_idx" ON "behavior_patterns"("clinic_id", "pattern_type", "is_active");

-- CreateIndex
CREATE INDEX "digital_twin_snapshots_clinic_id_snapshot_type_created_at_idx" ON "digital_twin_snapshots"("clinic_id", "snapshot_type", "created_at" DESC);

-- CreateIndex
CREATE INDEX "clinic_metrics_daily_clinic_id_metric_date_idx" ON "clinic_metrics_daily"("clinic_id", "metric_date" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "clinic_metrics_daily_clinic_id_metric_date_key" ON "clinic_metrics_daily"("clinic_id", "metric_date");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_clinic_id_flag_key" ON "feature_flags"("clinic_id", "flag");

-- CreateIndex
CREATE INDEX "notification_logs_clinic_id_sent_created_at_idx" ON "notification_logs"("clinic_id", "sent", "created_at");

-- CreateIndex
CREATE INDEX "wearable_data_points_patient_id_metric_type_recorded_at_idx" ON "wearable_data_points"("patient_id", "metric_type", "recorded_at" DESC);

-- CreateIndex
CREATE INDEX "patient_consent_records_clinic_id_patient_id_status_idx" ON "patient_consent_records"("clinic_id", "patient_id", "status");

-- CreateIndex
CREATE INDEX "patient_consent_records_clinic_id_consent_type_status_idx" ON "patient_consent_records"("clinic_id", "consent_type", "status");

-- CreateIndex
CREATE UNIQUE INDEX "patient_consent_records_patient_id_consent_type_clinic_id_key" ON "patient_consent_records"("patient_id", "consent_type", "clinic_id");

-- AddForeignKey
ALTER TABLE "clinics" ADD CONSTRAINT "clinics_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professionals" ADD CONSTRAINT "professionals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "professional_schedules" ADD CONSTRAINT "professional_schedules_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_status_history" ADD CONSTRAINT "patient_status_history_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_fkey" FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist_entries" ADD CONSTRAINT "waitlist_entries_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_records" ADD CONSTRAINT "clinical_records_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_records" ADD CONSTRAINT "clinical_records_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_records" ADD CONSTRAINT "clinical_records_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_records" ADD CONSTRAINT "clinical_records_professional_id_fkey" FOREIGN KEY ("professional_id") REFERENCES "professionals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_markers" ADD CONSTRAINT "exam_markers_exam_id_fkey" FOREIGN KEY ("exam_id") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "document_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_signatures" ADD CONSTRAINT "document_signatures_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_signatures" ADD CONSTRAINT "document_signatures_signed_by_fkey" FOREIGN KEY ("signed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "daily_closings" ADD CONSTRAINT "daily_closings_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_channels" ADD CONSTRAINT "communication_channels_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_messages" ADD CONSTRAINT "communication_messages_channel_id_fkey" FOREIGN KEY ("channel_id") REFERENCES "communication_channels"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_messages" ADD CONSTRAINT "communication_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "form_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_responses" ADD CONSTRAINT "form_responses_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "form_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_responses" ADD CONSTRAINT "form_responses_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_proposals" ADD CONSTRAINT "decision_proposals_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decision_proposals" ADD CONSTRAINT "decision_proposals_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_action_logs" ADD CONSTRAINT "ai_action_logs_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cognitive_memory" ADD CONSTRAINT "cognitive_memory_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cognitive_memory" ADD CONSTRAINT "cognitive_memory_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "behavior_patterns" ADD CONSTRAINT "behavior_patterns_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "digital_twin_snapshots" ADD CONSTRAINT "digital_twin_snapshots_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinic_metrics_daily" ADD CONSTRAINT "clinic_metrics_daily_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feature_flags" ADD CONSTRAINT "feature_flags_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_logs" ADD CONSTRAINT "notification_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wearable_data_points" ADD CONSTRAINT "wearable_data_points_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wearable_data_points" ADD CONSTRAINT "wearable_data_points_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_consent_records" ADD CONSTRAINT "patient_consent_records_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_consent_records" ADD CONSTRAINT "patient_consent_records_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

