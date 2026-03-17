import { createFileRoute } from '@tanstack/react-router'
import { AnalysisPage } from '@/components/analysis/AnalysisPage'

export const Route = createFileRoute('/analysis')({
  component: AnalysisPage,
})
