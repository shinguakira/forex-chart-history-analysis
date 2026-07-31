import { createFileRoute } from '@tanstack/react-router'
import { IngestionPage } from '@/components/ingestion/IngestionPage'
import { BackendRequired } from '@/components/layout/BackendRequired'

export const Route = createFileRoute('/ingestion')({
  component: () => <BackendRequired><IngestionPage /></BackendRequired>,
})
