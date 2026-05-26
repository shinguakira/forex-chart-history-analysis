import { createFileRoute } from '@tanstack/react-router'
import { ForecastPage } from '@/components/ai/ForecastPage'

export const Route = createFileRoute('/forecast')({
  component: ForecastPage,
})
