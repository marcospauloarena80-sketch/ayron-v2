import api from '@/lib/api'

export interface ClinicTag {
  id: string
  name: string
  clinic_id: string
}

export class TagsApiNotAvailableError extends Error {
  constructor() {
    super('Tags API not available (POST /tags not found)')
  }
}

const DEFAULT_TAGS: ClinicTag[] = [
  { id: 'default-1', name: 'VIP', clinic_id: '' },
  { id: 'default-2', name: 'Indicado', clinic_id: '' },
  { id: 'default-3', name: 'Plano Família', clinic_id: '' },
]

export const tagsService = {
  async list(): Promise<ClinicTag[]> {
    try {
      const r = await api.get('/tags')
      return r.data ?? []
    } catch (e: any) {
      if (e.response?.status === 404) return DEFAULT_TAGS
      throw e
    }
  },

  async create(name: string): Promise<ClinicTag> {
    try {
      const r = await api.post('/tags', { name })
      return r.data
    } catch (e: any) {
      if (e.response?.status === 404) throw new TagsApiNotAvailableError()
      throw e
    }
  },
}

export const CAN_CREATE_TAG = ['GERENTE', 'ADMIN', 'MASTER'] as const
