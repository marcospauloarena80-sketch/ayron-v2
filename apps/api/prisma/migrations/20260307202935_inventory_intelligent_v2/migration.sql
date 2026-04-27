-- CreateEnum
CREATE TYPE "InventoryItemStatus" AS ENUM ('ACTIVE', 'BLOCKED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('SUGGESTED', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CANCELLED', 'DIVERGENT');

-- CreateEnum
CREATE TYPE "PurchaseOrderUrgency" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "InventoryReservationStatus" AS ENUM ('ACTIVE', 'CONSUMED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InventoryLossType" AS ENUM ('EXPIRY', 'ERROR', 'DAMAGE', 'THEFT', 'DISCARD', 'OTHER');

-- CreateEnum
CREATE TYPE "InventoryAuditAction" AS ENUM ('CREATE', 'UPDATE', 'MOVEMENT', 'RESERVATION', 'LOSS', 'PURCHASE', 'ADJUSTMENT', 'COUNT');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InventoryMovementType" ADD VALUE 'RESERVATION_CONSUME';
ALTER TYPE "InventoryMovementType" ADD VALUE 'RETURN';

-- AlterTable
ALTER TABLE "inventory_items" ADD COLUMN     "abc_class" TEXT,
ADD COLUMN     "average_cost" DECIMAL(12,2),
ADD COLUMN     "consumption_30d" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "consumption_90d" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "days_remaining" INTEGER,
ADD COLUMN     "ideal_stock" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "internal_code" TEXT,
ADD COLUMN     "last_counted_at" TIMESTAMP(3),
ADD COLUMN     "lead_time_days" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "manufacturer" TEXT,
ADD COLUMN     "max_stock" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "qr_code" TEXT,
ADD COLUMN     "risk_score" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "secondary_supplier_id" TEXT,
ADD COLUMN     "status" "InventoryItemStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "storage_sector" TEXT,
ADD COLUMN     "subcategory" TEXT,
ADD COLUMN     "technical_name" TEXT,
ADD COLUMN     "temperature_max" DOUBLE PRECISION,
ADD COLUMN     "temperature_min" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "inventory_movements" ADD COLUMN     "appointment_id" TEXT,
ADD COLUMN     "loss_type" "InventoryLossType",
ADD COLUMN     "patient_id" TEXT,
ADD COLUMN     "protocol_id" TEXT,
ADD COLUMN     "purchase_order_item_id" TEXT,
ADD COLUMN     "reservation_id" TEXT;

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "address" TEXT,
ADD COLUMN     "contact_name" TEXT,
ADD COLUMN     "deleted_at" TIMESTAMP(3),
ADD COLUMN     "lead_time_days" INTEGER NOT NULL DEFAULT 7,
ADD COLUMN     "payment_terms" TEXT,
ADD COLUMN     "website" TEXT;

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "supplier_id" TEXT,
    "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'SUGGESTED',
    "urgency" "PurchaseOrderUrgency" NOT NULL DEFAULT 'LOW',
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "justification" TEXT,
    "requested_by_user_id" TEXT,
    "approved_by_user_id" TEXT,
    "sent_at" TIMESTAMP(3),
    "received_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_items" (
    "id" TEXT NOT NULL,
    "purchase_order_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "quantity_requested" INTEGER NOT NULL,
    "quantity_received" INTEGER,
    "unit_cost_estimated" DECIMAL(12,2),
    "unit_cost_actual" DECIMAL(12,2),
    "notes" TEXT,

    CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_reservations" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "patient_id" TEXT,
    "appointment_id" TEXT,
    "protocol_id" TEXT,
    "quantity_reserved" INTEGER NOT NULL,
    "status" "InventoryReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "reserved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "consumed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_by_user_id" TEXT NOT NULL,

    CONSTRAINT "inventory_reservations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_losses" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "loss_type" "InventoryLossType" NOT NULL DEFAULT 'OTHER',
    "estimated_cost" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "reason" TEXT NOT NULL,
    "photo_url" TEXT,
    "registered_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_losses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_audit_logs" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "item_id" TEXT,
    "action" "InventoryAuditAction" NOT NULL,
    "actor_user_id" TEXT,
    "before_json" JSONB,
    "after_json" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "purchase_orders_clinic_id_status_idx" ON "purchase_orders"("clinic_id", "status");

-- CreateIndex
CREATE INDEX "purchase_orders_clinic_id_urgency_idx" ON "purchase_orders"("clinic_id", "urgency");

-- CreateIndex
CREATE INDEX "inventory_reservations_clinic_id_status_idx" ON "inventory_reservations"("clinic_id", "status");

-- CreateIndex
CREATE INDEX "inventory_reservations_item_id_status_idx" ON "inventory_reservations"("item_id", "status");

-- CreateIndex
CREATE INDEX "inventory_losses_clinic_id_loss_type_idx" ON "inventory_losses"("clinic_id", "loss_type");

-- CreateIndex
CREATE INDEX "inventory_losses_clinic_id_created_at_idx" ON "inventory_losses"("clinic_id", "created_at");

-- CreateIndex
CREATE INDEX "inventory_audit_logs_clinic_id_created_at_idx" ON "inventory_audit_logs"("clinic_id", "created_at");

-- CreateIndex
CREATE INDEX "inventory_audit_logs_item_id_created_at_idx" ON "inventory_audit_logs"("item_id", "created_at");

-- CreateIndex
CREATE INDEX "inventory_items_clinic_id_status_idx" ON "inventory_items"("clinic_id", "status");

-- CreateIndex
CREATE INDEX "inventory_items_clinic_id_expiry_date_idx" ON "inventory_items"("clinic_id", "expiry_date");

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_items" ADD CONSTRAINT "inventory_items_secondary_supplier_id_fkey" FOREIGN KEY ("secondary_supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_losses" ADD CONSTRAINT "inventory_losses_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_losses" ADD CONSTRAINT "inventory_losses_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_audit_logs" ADD CONSTRAINT "inventory_audit_logs_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_audit_logs" ADD CONSTRAINT "inventory_audit_logs_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "clinics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
