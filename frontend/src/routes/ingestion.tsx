import { createFileRoute } from '@tanstack/react-router'
import { IngestionPage } from '@/components/ingestion/IngestionPage'

export const Route = createFileRoute('/ingestion')({
  component: IngestionPage,
})
