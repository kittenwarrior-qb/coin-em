import cards from './pdfCatalog.json'
import type { CatalogCard } from '@/features/admin/catalogClient'

// Detached frontend-only fixture; backend parity test prevents canonical drift.
export const pdfCatalogDraft = (): CatalogCard[] => JSON.parse(JSON.stringify(cards)) as CatalogCard[]
