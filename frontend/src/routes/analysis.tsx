import { createFileRoute } from '@tanstack/react-router'
import { AnalysisPage } from '@/components/analysis/AnalysisPage'
import { BackendRequired } from '@/components/layout/BackendRequired'

export const Route = createFileRoute('/analysis')({
  component: () => <BackendRequired><AnalysisPage /></BackendRequired>,
})
