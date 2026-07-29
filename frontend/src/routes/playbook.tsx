import { createFileRoute } from '@tanstack/react-router'
import { PlaybookPage } from '@/components/playbook/PlaybookPage'

export const Route = createFileRoute('/playbook')({
  component: PlaybookPage,
})
