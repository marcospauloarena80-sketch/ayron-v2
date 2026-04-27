'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, Download, Upload, X, CheckCircle, Clock, AlertCircle, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';
import { CreateDocumentModal } from './create-document-modal';
import { DocumentDetailModal } from './document-detail-modal';

type DocType = 'PRESCRIPTION' | 'PRESCRIPTION_CONTROLLED' | 'EXAM_REQUEST' | 'CERTIFICATE' | 'REPORT' | 'CUSTOM';
type DocStatus = 'DRAFT' | 'SIGNED' | 'PENDING_CFM_VALIDATION' | 'SIGNED_VALIDATED' | 'REVOKED' | 'CANCELLED';

const TYPE_LABELS: Record<DocType, string> = {
  PRESCRIPTION: 'Receita',
  PRESCRIPTION_CONTROLLED: 'Controlada',
  EXAM_REQUEST: 'Exames',
  CERTIFICATE: 'Atestado',
  REPORT: 'Relatório',
  CUSTOM: 'Personalizado',
};

const STATUS_CFG: Record<DocStatus, { label: string; color: string; icon: React.FC<any> }> = {
  DRAFT: { label: 'Rascunho', color: 'text-gray-600 bg-gray-100', icon: FileText },
  SIGNED: { label: 'Assinado', color: 'text-green-700 bg-green-100', icon: CheckCircle },
  PENDING_CFM_VALIDATION: { label: 'Ag. Validação', color: 'text-amber-700 bg-amber-100', icon: Clock },
  SIGNED_VALIDATED: { label: 'Validado', color: 'text-blue-700 bg-blue-100', icon: CheckCircle },
  REVOKED: { label: 'Revogado', color: 'text-red-700 bg-red-100', icon: X },
  CANCELLED: { label: 'Cancelado', color: 'text-red-700 bg-red-100', icon: X },
};

interface Props {
  patientId: string;
  appointmentId?: string;
}

export function DocumentsList({ patientId, appointmentId }: Props) {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const userRole = user?.role;
  const canValidate = userRole === 'GERENTE' || userRole === 'MASTER';

  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['documents', patientId, typeFilter, statusFilter],
    queryFn: () => {
      const params = new URLSearchParams({ limit: '50' });
      if (typeFilter) params.set('type', typeFilter);
      if (statusFilter) params.set('status', statusFilter);
      return api.get(`/patients/${patientId}/documents?${params}`).then(r => r.data);
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
    },
  });

  async function handleDownload(id: string, variant: 'original' | 'validated' = 'original') {
    try {
      const res = await api.get(`/documents/${id}/download?variant=${variant}`);
      if (res.data?.url) window.open(res.data.url, '_blank');
    } catch {
      alert('Não foi possível baixar o PDF.');
    }
  }

  const docs = data?.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="text-xs border border-border rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Todos os tipos</option>
            {(Object.keys(TYPE_LABELS) as DocType[]).map(t => (
              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs border border-border rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="">Todos os status</option>
            {(Object.keys(STATUS_CFG) as DocStatus[]).map(s => (
              <option key={s} value={s}>{STATUS_CFG[s].label}</option>
            ))}
          </select>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" /> Novo Documento
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" /> Carregando documentos...
        </div>
      ) : docs.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          <FileText className="h-8 w-8 mx-auto mb-2 opacity-30" />
          Nenhum documento encontrado
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map((doc: any) => {
            const cfg = STATUS_CFG[doc.status as DocStatus] ?? STATUS_CFG.DRAFT;
            const Icon = cfg.icon;
            const meta = (doc.metadata as Record<string, any>) ?? {};
            const pdfUploadFailed = !!meta.pdf_upload_failed;
            return (
              <div
                key={doc.id}
                className="flex items-center gap-3 rounded-xl border border-border p-3 hover:bg-muted/30 transition-colors cursor-pointer"
                onClick={() => setSelectedDoc(doc)}
              >
                <FileText className="h-5 w-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {TYPE_LABELS[doc.type as DocType]} · {new Date(doc.created_at).toLocaleDateString('pt-BR')}
                    {doc.creator && ` · ${doc.creator.name}`}
                  </p>
                  {doc.document_hash && (
                    <p className="font-mono text-[9px] text-gray-400 mt-0.5 truncate">
                      SHA-256: {doc.document_hash.substring(0, 24)}...
                    </p>
                  )}

                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${cfg.color}`}>
                    <Icon className="h-3 w-3" />{cfg.label}
                  </span>
                  {pdfUploadFailed && (
                    <span className="flex items-center gap-1 text-[9px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap bg-amber-100 text-amber-700">
                      <AlertCircle className="h-2.5 w-2.5" />PDF pendente
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                  {doc.pdf_object_key && (
                    <button
                      onClick={() => handleDownload(doc.id)}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-primary"
                      title="Baixar PDF"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {doc.validated_pdf_object_key && (
                    <button
                      onClick={() => handleDownload(doc.id, 'validated')}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors text-blue-500 hover:text-blue-700"
                      title="Baixar PDF Validado"
                    >
                      <CheckCircle className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {doc.status === 'PENDING_CFM_VALIDATION' && canValidate && (
                    <>
                      <input
                        id={`upload-validated-${doc.id}`}
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) uploadMut.mutate({ id: doc.id, file: f });
                          e.target.value = '';
                        }}
                      />
                      <button
                        onClick={() => document.getElementById(`upload-validated-${doc.id}`)?.click()}
                        disabled={uploadMut.isPending}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-amber-500 hover:text-amber-700"
                        title="Enviar PDF Validado"
                      >
                        {uploadMut.isPending
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Upload className="h-3.5 w-3.5" />}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateDocumentModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        patientId={patientId}
        appointmentId={appointmentId}
      />

      {selectedDoc && (
        <DocumentDetailModal
          doc={selectedDoc}
          onClose={() => setSelectedDoc(null)}
          patientId={patientId}
        />
      )}
    </div>
  );
}
