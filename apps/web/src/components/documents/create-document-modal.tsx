'use client';
import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FileText, X, Download, Lock, Upload, CheckCircle, Clock, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth.store';

type DocType = 'PRESCRIPTION' | 'PRESCRIPTION_CONTROLLED' | 'EXAM_REQUEST' | 'CERTIFICATE' | 'REPORT' | 'CUSTOM';
type DocStatus = 'DRAFT' | 'SIGNED' | 'PENDING_CFM_VALIDATION' | 'SIGNED_VALIDATED' | 'REVOKED' | 'CANCELLED';

const TYPE_LABELS: Record<DocType, string> = {
  PRESCRIPTION: 'Receita Simples',
  PRESCRIPTION_CONTROLLED: 'Receita Controlada',
  EXAM_REQUEST: 'Pedido de Exames',
  CERTIFICATE: 'Atestado',
  REPORT: 'Relatório',
  CUSTOM: 'Personalizado',
};

const TYPE_DEFAULTS: Record<DocType, string> = {
  PRESCRIPTION: 'Uso contínuo:\n\n\nPosologia:\n',
  PRESCRIPTION_CONTROLLED: 'Medicamento controlado:\n\nDosagem:\n\nQuantidade:\n\nInstruções:\n',
  EXAM_REQUEST: 'Solicito os seguintes exames:\n\n- \n- \n- \n\nJustificativa clínica:\n',
  CERTIFICATE: 'Atesto que o(a) paciente esteve sob meus cuidados...\n',
  REPORT: 'Relatório médico:\n\n',
  CUSTOM: '',
};

const STATUS_CONFIG: Record<DocStatus, { label: string; color: string; icon: React.FC<any> }> = {
  DRAFT: { label: 'Rascunho', color: 'bg-gray-100 text-gray-700', icon: FileText },
  SIGNED: { label: 'Assinado', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  PENDING_CFM_VALIDATION: { label: 'Aguardando Validação', color: 'bg-amber-100 text-amber-700', icon: Clock },
  SIGNED_VALIDATED: { label: 'Validado CFM', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  REVOKED: { label: 'Revogado', color: 'bg-red-100 text-red-700', icon: X },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-100 text-red-700', icon: X },
};

interface Props {
  open: boolean;
  onClose: () => void;
  patientId: string;
  appointmentId?: string;
  initialType?: DocType;
}

export function CreateDocumentModal({ open, onClose, patientId, appointmentId, initialType }: Props) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const { user } = useAuthStore();
  const userRole = user?.role;
  const canValidate = userRole === 'GERENTE' || userRole === 'MASTER';

  const [step, setStep] = useState<'select' | 'compose' | 'done'>('select');
  const [type, setType] = useState<DocType>(initialType ?? 'PRESCRIPTION');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [doc, setDoc] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [signError, setSignError] = useState<string | null>(null);

  function reset() {
    setStep('select');
    setType(initialType ?? 'PRESCRIPTION');
    setTitle('');
    setContent('');
    setDoc(null);
    setSignError(null);
  }

  function handleClose() {
    reset();
    onClose();
  }

  const createMut = useMutation({
    mutationFn: (data: any) => api.post('/documents', data).then(r => r.data),
    onSuccess: (created) => {
      setDoc(created);
      setStep('done');
      qc.invalidateQueries({ queryKey: ['documents', patientId] });
    },
  });

  const signMut = useMutation({
    mutationFn: (id: string) => {
      setIsGenerating(true);
      setSignError(null);
      return api.post(`/documents/${id}/sign`).then(r => r.data);
    },
    onSuccess: (updated) => {
      setDoc(updated);
      setIsGenerating(false);
      qc.invalidateQueries({ queryKey: ['documents', patientId] });
    },
    onError: (err: any) => {
      setIsGenerating(false);
      setSignError(err?.response?.data?.message ?? 'Erro ao assinar documento. Tente novamente.');
    },
  });

  const retryMut = useMutation({
    mutationFn: (id: string) => api.post(`/documents/${id}/retry-pdf-upload`).then(r => r.data),
    onSuccess: (updated) => {
      setDoc(updated);
      qc.invalidateQueries({ queryKey: ['documents', patientId] });
    },
    onError: (err: any) => {
      setSignError(err?.response?.data?.message ?? 'Falha no upload. Verifique o MinIO.');
    },
  });

  const uploadMut = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.post(`/documents/${id}/upload-validated`, fd).then(r => r.data);
    },
    onSuccess: (updated) => {
      setDoc(updated);
      qc.invalidateQueries({ queryKey: ['documents', patientId] });
    },
  });

  async function handleDownload(variant: 'original' | 'validated' = 'original') {
    try {
      const res = await api.get(`/documents/${doc.id}/download?variant=${variant}`);
      if (res.data?.url) window.open(res.data.url, '_blank');
    } catch {
      alert('Não foi possível baixar o PDF. O upload pode estar pendente.');
    }
  }

  function selectType(t: DocType) {
    setType(t);
    setTitle(TYPE_LABELS[t]);
    setContent(TYPE_DEFAULTS[t]);
    setStep('compose');
  }

  function handleCreate() {
    createMut.mutate({ patientId, appointmentId, type, title, content });
  }

  if (!open) return null;

  const pdfUploadFailed = !!(doc?.metadata as any)?.pdf_upload_failed;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-base">Novo Documento Clínico</h2>
          </div>
          <button onClick={handleClose} className="rounded-lg p-1.5 hover:bg-muted transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6">
          {step === 'select' && (
            <div>
              <p className="text-sm text-muted-foreground mb-4">Selecione o tipo de documento:</p>
              <div className="grid grid-cols-2 gap-3">
                {(Object.keys(TYPE_LABELS) as DocType[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => selectType(t)}
                    className="flex items-center gap-3 rounded-xl border border-border p-4 text-left hover:border-primary hover:bg-primary/5 transition-all"
                  >
                    <FileText className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <div className="font-medium text-sm">{TYPE_LABELS[t]}</div>
                      {t === 'PRESCRIPTION_CONTROLLED' && (
                        <div className="text-[10px] text-amber-600 mt-0.5">Requer validação CFM</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 'compose' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Título</label>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Conteúdo</label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={10}
                  className="mt-1 w-full rounded-lg border border-border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 font-mono resize-none"
                />
              </div>
              {type === 'PRESCRIPTION_CONTROLLED' && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700">
                    <strong>Receita Controlada:</strong> O documento ficará pendente. A gerente deverá fazer upload do PDF validado via CFM/token do médico.
                  </p>
                </div>
              )}
              <div className="flex gap-2 justify-end pt-2">
                <Button variant="ghost" onClick={() => setStep('select')}>Voltar</Button>
                <Button onClick={handleCreate} disabled={!title || !content || createMut.isPending}>
                  {createMut.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Salvando...</> : 'Salvar Rascunho'}
                </Button>
              </div>
            </div>
          )}

          {step === 'done' && doc && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 rounded-xl bg-gray-50 border border-border p-4">
                <FileText className="h-8 w-8 text-primary" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{doc.title}</p>
                  <p className="text-xs text-muted-foreground">{TYPE_LABELS[doc.type as DocType]}</p>
                </div>
                {(() => {
                  const cfg = STATUS_CONFIG[doc.status as DocStatus];
                  const Icon = cfg.icon;
                  return (
                    <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${cfg.color}`}>
                      <Icon className="h-3 w-3" />{cfg.label}
                    </span>
                  );
                })()}
              </div>

              {signError && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3">
                  <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{signError}</p>
                </div>
              )}

              {pdfUploadFailed && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-amber-700 font-medium">Upload de PDF pendente</p>
                    <p className="text-xs text-amber-600 mt-0.5">Documento assinado com sucesso, mas o PDF não pôde ser enviado. Use o botão quando o serviço estiver disponível.</p>
                  </div>
                  <button
                    onClick={() => retryMut.mutate(doc.id)}
                    disabled={retryMut.isPending}
                    className="flex items-center gap-1 text-xs font-medium text-amber-700 px-2 py-1 rounded border border-amber-300 hover:bg-amber-100 whitespace-nowrap"
                  >
                    {retryMut.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    Tentar novamente
                  </button>
                </div>
              )}

              {doc.document_hash && (
                <div className="rounded-lg bg-gray-50 border border-border p-3">
                  <p className="text-[10px] text-muted-foreground uppercase font-medium mb-1">Hash de Integridade (SHA-256)</p>
                  <p className="font-mono text-[10px] break-all text-gray-600">{doc.document_hash}</p>
                </div>
              )}

              {doc.status === 'DRAFT' && (
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" onClick={reset}>Novo Documento</Button>
                  <Button
                    onClick={() => signMut.mutate(doc.id)}
                    disabled={isGenerating || signMut.isPending}
                    className="min-w-[160px]"
                  >
                    {isGenerating ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Gerando PDF...</>
                    ) : (
                      <><Lock className="h-4 w-4" /> Assinar e Gerar PDF</>
                    )}
                  </Button>
                </div>
              )}

              {(doc.status === 'SIGNED' || doc.status === 'SIGNED_VALIDATED') && (
                <div className="flex gap-2 justify-end flex-wrap">
                  {!pdfUploadFailed && (
                    <Button variant="ghost" onClick={() => handleDownload('original')}>
                      <Download className="h-4 w-4" /> Baixar PDF
                    </Button>
                  )}
                  {doc.status === 'SIGNED_VALIDATED' && (
                    <Button onClick={() => handleDownload('validated')}>
                      <Download className="h-4 w-4" /> Baixar PDF Validado
                    </Button>
                  )}
                </div>
              )}

              {doc.status === 'PENDING_CFM_VALIDATION' && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 p-3">
                    <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700">
                      Aguardando validação externa. Solicite à gerente que faça upload do PDF validado com o token CFM do médico.
                    </p>
                  </div>
                  <div className="flex gap-2 justify-end flex-wrap">
                    {!pdfUploadFailed && (
                      <Button variant="ghost" onClick={() => handleDownload('original')}>
                        <Download className="h-4 w-4" /> Baixar Rascunho
                      </Button>
                    )}
                    {canValidate && (
                      <>
                        <input
                          ref={fileRef}
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
                          onClick={() => fileRef.current?.click()}
                          disabled={uploadMut.isPending}
                        >
                          <Upload className="h-4 w-4" />
                          {uploadMut.isPending ? 'Enviando...' : 'Enviar PDF Validado'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
