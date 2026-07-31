import { createFileRoute } from '@tanstack/react-router'
import { PracticePage } from '@/components/practice/PracticePage'
import { BackendRequired } from '@/components/layout/BackendRequired'

export const Route = createFileRoute('/practice')({
  component: () => <BackendRequired><PracticePage /></BackendRequired>,
})
