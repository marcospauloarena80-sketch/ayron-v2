'use client';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, X, Download, Clock, CheckCircle, AlertCircle, Loader2, Upload, RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

type DocStatus = 'DRAFT' | 'SIGNED' | 'PENDING_CFM_VALIDATION' | 'SIGNED_VALIDATED' | 'REVOKED' | 'CANCELLED';
type DocType = 'PRESCRIPTION' | 'PRESCRIPTION_CONTROLLED' | 'EXAM_REQUEST' | 'CERTIFICATE' | 'REPORT' | 'CUSTOM';

const TYPE_LABELS: Record<DocType, string> = {
  PRESCRIPTION: 'Receita Simples',
  PRESCRIPTION_CONTROLLED: 'Receita Controlada',
  EXAM_REQUEST: 'Pedido de Exames',
  CERTIFICATE: 'Atestado',
  REPORT: 'Relatório',
  CUSTOM: 'Personalizado',
};

const STATUS_CFG: Record<DocStatus, { label: string; color: string; icon: React.FC<any> }> = {
  DRAFT: { label: 'Rascunho', color: 'bg-gray-100 text-gray-700', icon: FileText },
  SIGNED: { label: 'Assinado', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  PENDING_CFM_VALIDATION: { label: 'Ag. Validação CFM', color: 'bg-amber-100 text-amber-700', icon: Clock },
  SIGNED_VALIDATED: { label: 'Validado CFM', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  REVOKED: { label: 'Revogado', color: 'bg-red-100 text-red-700', icon: X },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: X },
};

interface Props {
  doc: any;
  onClose: () => void;
  patientId: string;
}

export function DocumentDetailModal({ doc, onClose, patientId }: Props) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const userRole = user?.role;
  const canValidate = userRole === 'GERENTE' || userRole === 'MASTER';

  const [retryError, setRetryError] = useState<string | null>(null);

  const retryMut = useMutation({
    mutationFn: (id: string) => api.post(`/documents/${id}/retry-pdf-upload`).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents', patientId] });
      setRetryError(null);
    },
    onError: (err: any) => {
      setRetryError(err?.response?.data?.message ?? 'Falha ao fazer upload. Verifique o MinIO.');
    },
  });

  const uploadMut = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.post(`/documents/${id}/upload-validated`, fd).then(r => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['documents', patientId] });
      onClose();
    },
  });

  async function handleDownload(variant: 'original' | 'validated' = 'original') {
    try {
      const res = await api.get(`/documents/${doc.id}/download?variant=${variant}`);
      if (res.data?.url) {
        window.open(res.data.url, '_blank');
      }
    } catch {
      alert('Não foi possível baixar o PDF. O arquivo pode estar com upload pendente.');
    }
  }

  function copyHash() {
    if (doc.document_hash) navigator.clipboard.writeText(doc.document_hash);
  }

  const cfg = STATUS_CFG[doc.status as DocStatus] ?? STATUS_CFG.DRAFT;
  const Icon = cfg.icon;
  const meta = (doc.metadata as Record<string, any>) ?? {};
  const pdfUploadFailed = !!meta.pdf_upload_failed;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative w-full max-w-2xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-base truncate max-w-sm">{doc.title}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 hover:bg-muted transition-colors ml-2 shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.color}`}>
              <Icon className="h-3 w-3" />{cfg.label}
            </span>
            <span className="text-xs text-muted-foreground">
              {TYPE_LABELS[doc.type as DocType] ?? doc.type}
            </span>
            <span className="text-xs text-muted-foreground">
              Criado em {new Date(doc.created_at).toLocaleString('pt-BR')}
            </span>
            {doc.signed_at && (
              <span className="text-xs text-muted-foreground">
                Assinado em {new Date(doc.signed_at).toLocaleString('pt-BR')}
                {doc.signer && ` por ${doc.signer.name}`}
              </span>
            )}
          </div>

          {pdfUploadFailed && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-amber-700 font-medium">Upload de PDF pendente</p>
                <p className="text-xs text-amber-600 mt-0.5">O documento foi assinado mas o PDF não pôde ser enviado ao MinIO. Clique em "Tentar novamente" quando o serviço estiver disponível.</p>
              </div>
              <button
                onClick={() => { setRetryError(null); retryMut.mutate(doc.id); }}
                disabled={retryMut.isPending}
                className="flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-900 px-2 py-1 rounded border border-amber-300 hover:bg-amber-100 transition-colors whitespace-nowrap"
              >
                {retryMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Tentar novamente
              </button>
            </div>
          )}

          {retryError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700">{retryError}</div>
          )}

          {doc.document_hash && (
            <div className="rounded-lg bg-gray-50 border border-border p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-muted-foreground uppercase font-medium">Hash SHA-256 (integridade)</p>
                <button onClick={copyHash} className="text-[10px] text-primary hover:underline">Copiar</button>
              </div>
              <p className="font-mono text-[10px] break-all text-gray-600">{doc.document_hash}</p>
            </div>
          )}

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Conteúdo</p>
            <pre className="bg-gray-50 border border-border rounded-lg p-4 text-xs font-mono whitespace-pre-wrap text-gray-700 max-h-64 overflow-y-auto">
              {doc.content}
            </pre>
          </div>

          {doc.status === 'PENDING_CFM_VALIDATION' && (
            <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
              <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Aguardando validação CFM. A gerente deve fazer upload do PDF validado com o token do médico.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 justify-end px-6 py-4 border-t border-border shrink-0">
          {(doc.status === 'SIGNED' || doc.status === 'PENDING_CFM_VALIDATION' || doc.status === 'SIGNED_VALIDATED') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDownload('original')}
              disabled={pdfUploadFailed}
            >
              <Download className="h-4 w-4" />
              {doc.status === 'PENDING_CFM_VALIDATION' ? 'Baixar Rascunho' : 'Baixar PDF'}
            </Button>
          )}
          {doc.status === 'SIGNED_VALIDATED' && doc.validated_pdf_object_key && (
            <Button size="sm" onClick={() => handleDownload('validated')}>
              <Download className="h-4 w-4" /> Baixar PDF Validado
            </Button>
          )}
          {doc.status === 'PENDING_CFM_VALIDATION' && canValidate && (
            <>
              <input
                id={`validated-upload-${doc.id}`}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) uploadMut.mutate({ id: doc.id, file: f });
                  e.target.value = '';
                }}
              />
              <Button
                size="sm"
                onClick={() => document.getElementById(`validated-upload-${doc.id}`)?.click()}
                disabled={uploadMut.isPending}
              >
                {uploadMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Enviar PDF Validado
              </Button>
            </>
          )}
          <Button variant="ghost" size="sm" onClick={onClose}>Fechar</Button>
        </div>
      </div>
    </div>
  );
}
