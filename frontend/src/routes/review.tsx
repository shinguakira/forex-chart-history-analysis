import { createFileRoute } from '@tanstack/react-router'
import { ReviewPage } from '@/components/ai/ReviewPage'

export const Route = createFileRoute('/review')({
  component: ReviewPage,
})
