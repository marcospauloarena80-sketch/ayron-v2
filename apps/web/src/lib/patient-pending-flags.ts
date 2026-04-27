// TODO(api): adicionar campos has_prontuario e has_pending_financial no endpoint /patients

export interface PatientPendingFlags {
  dados: { hasPending: boolean; reasons: string[] }
  agenda: { hasPending: boolean; reasons: string[] }
  prontuario: { hasPending: boolean; reasons: string[] }
  financeiro: { hasPending: boolean; reasons: string[] }
}

export function getPatientPendingFlags(patient: any): PatientPendingFlags {
  const dadosReasons: string[] = []
  if (!patient.cpf) dadosReasons.push('CPF ausente')
  if (!patient.email) dadosReasons.push('E-mail ausente')
  if (!patient.phone) dadosReasons.push('Telefone ausente')
  if (!patient.address?.city) dadosReasons.push('Endereço incompleto')

  const agendaReasons: string[] = []
  if (!patient.next_appointment_date) agendaReasons.push('Sem próxima consulta')
  if ((patient.days_absent ?? 0) > 90) agendaReasons.push('Retorno vencido')
  if (patient.current_status === 'AGUARDANDO_AGENDAMENTO') agendaReasons.push('Aguardando agendamento')

  // TODO(api): adicionar has_prontuario no endpoint /patients — ausente = sem pendência automática
  const prontuarioReasons: string[] = []
  if (patient.has_prontuario === false) prontuarioReasons.push('Sem prontuário iniciado')

  // TODO(api): adicionar has_pending_financial no endpoint /patients — ausente = sem pendência automática
  const financeiroReasons: string[] = []
  if (patient.has_pending_financial === true) financeiroReasons.push('Pendência financeira')

  return {
    dados:      { hasPending: dadosReasons.length > 0,      reasons: dadosReasons },
    agenda:     { hasPending: agendaReasons.length > 0,     reasons: agendaReasons },
    prontuario: { hasPending: prontuarioReasons.length > 0, reasons: prontuarioReasons },
    financeiro: { hasPending: financeiroReasons.length > 0, reasons: financeiroReasons },
  }
}
