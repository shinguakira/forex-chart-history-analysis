import { createFileRoute } from '@tanstack/react-router'
import { ReviewPage } from '@/components/ai/ReviewPage'
import { BackendRequired } from '@/components/layout/BackendRequired'

export const Route = createFileRoute('/review')({
  component: () => <BackendRequired><ReviewPage /></BackendRequired>,
})
