import { createFileRoute } from '@tanstack/react-router'
import { PlaybookPage } from '@/components/playbook/PlaybookPage'
import { BackendRequired } from '@/components/layout/BackendRequired'

export const Route = createFileRoute('/playbook')({
  component: () => <BackendRequired><PlaybookPage /></BackendRequired>,
})
