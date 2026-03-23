import { createFileRoute } from '@tanstack/react-router'
import { LearningPage } from '@/components/learning/LearningPage'

export const Route = createFileRoute('/learning')({
  component: LearningPage,
})
