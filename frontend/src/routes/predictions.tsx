import { createFileRoute } from '@tanstack/react-router'
import { PredictionsPage } from '@/components/predictions/PredictionsPage'

export const Route = createFileRoute('/predictions')({
  component: PredictionsPage,
})
