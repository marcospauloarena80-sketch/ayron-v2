import { DocumentStatus, DocumentType } from '@prisma/client';

export interface PdfDocumentData {
  type: DocumentType;
  title: string;
  content: string;
  patientName: string;
  patientDocument: string;
  doctorName: string;
  doctorCrm: string;
  clinicName: string;
  documentHash: string;
  status: DocumentStatus;
  signedAt: Date;
  isValidatedVersion?: boolean;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(date);
}

function statusLabel(status: DocumentStatus, isValidated?: boolean): string {
  if (isValidated) return 'Validado externamente (CFM/token médico)';
  if (status === 'PENDING_CFM_VALIDATION') return '⚠️ PENDENTE DE VALIDAÇÃO EXTERNA (CFM/TOKEN MÉDICO) — NÃO É VERSÃO DEFINITIVA';
  return 'Assinado eletronicamente no AYRON';
}

export function buildDocumentHtml(data: PdfDocumentData): string {
  const warningBanner =
    data.status === 'PENDING_CFM_VALIDATION' && !data.isValidatedVersion
      ? `<div style="background:#fff3cd;border:2px solid #ffc107;padding:12px 16px;margin-bottom:20px;border-radius:6px;font-size:13px;font-weight:600;color:#856404;">
           ⚠️ DOCUMENTO PENDENTE DE VALIDAÇÃO EXTERNA — NÃO UTILIZAR COMO VERSÃO DEFINITIVA
         </div>`
      : '';

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #1a1a1a; padding: 40px 48px; }
  .header { border-bottom: 2px solid #e67e22; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
  .clinic-name { font-size: 20px; font-weight: 700; color: #e67e22; }
  .header-sub { font-size: 11px; color: #666; margin-top: 4px; }
  .doc-title { font-size: 16px; font-weight: 700; text-align: center; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.5px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px; background: #f8f8f8; padding: 14px; border-radius: 6px; }
  .info-item label { font-size: 10px; text-transform: uppercase; color: #999; display: block; margin-bottom: 2px; }
  .info-item span { font-size: 12px; font-weight: 600; }
  .content-box { border: 1px solid #e0e0e0; border-radius: 6px; padding: 20px; min-height: 200px; margin-bottom: 24px; line-height: 1.7; white-space: pre-wrap; font-size: 13px; }
  .signature-area { border-top: 1px solid #ccc; margin-top: 32px; padding-top: 12px; text-align: center; }
  .signature-area .doctor { font-size: 13px; font-weight: 700; }
  .signature-area .crm { font-size: 11px; color: #666; }
  .footer { margin-top: 32px; border-top: 1px solid #eee; padding-top: 12px; font-size: 9px; color: #999; }
  .footer .hash { font-family: monospace; font-size: 8px; word-break: break-all; }
  .footer .status-badge { display: inline-block; background: #e8f5e9; color: #2e7d32; padding: 2px 8px; border-radius: 3px; font-size: 9px; font-weight: 600; margin-top: 4px; }
  .footer .status-pending { background: #fff3cd; color: #856404; }
</style>
</head>
<body>
  <div class="header">
    <div>
      <div class="clinic-name">${escapeHtml(data.clinicName)}</div>
      <div class="header-sub">Sistema AYRON — Documento Clínico</div>
    </div>
    <div style="text-align:right;font-size:10px;color:#666;">
      <div>${formatDate(data.signedAt)}</div>
    </div>
  </div>

  ${warningBanner}

  <div class="doc-title">${escapeHtml(data.title)}</div>

  <div class="info-grid">
    <div class="info-item">
      <label>Paciente</label>
      <span>${escapeHtml(data.patientName)}</span>
    </div>
    <div class="info-item">
      <label>Documento</label>
      <span>${escapeHtml(data.patientDocument || '—')}</span>
    </div>
    <div class="info-item">
      <label>Médico Responsável</label>
      <span>${escapeHtml(data.doctorName)}</span>
    </div>
    <div class="info-item">
      <label>CRM</label>
      <span>${escapeHtml(data.doctorCrm || 'A cadastrar')}</span>
    </div>
  </div>

  <div class="content-box">${escapeHtml(data.content)}</div>

  <div class="signature-area">
    <div class="doctor">${escapeHtml(data.doctorName)}</div>
    <div class="crm">CRM: ${escapeHtml(data.doctorCrm || 'A cadastrar')}</div>
    <div style="margin-top:8px;font-size:10px;color:#666;">${escapeHtml(data.clinicName)}</div>
  </div>

  <div class="footer">
    <div>Hash de integridade:</div>
    <div class="hash">SHA-256: ${data.documentHash}</div>
    <div>
      <span class="status-badge ${data.status === 'PENDING_CFM_VALIDATION' ? 'status-pending' : ''}">
        ${statusLabel(data.status, data.isValidatedVersion)}
      </span>
    </div>
  </div>
</body>
</html>`;
}
