import { createFileRoute } from '@tanstack/react-router'
import { NotesPage } from '@/components/notes/NotesPage'
import { BackendRequired } from '@/components/layout/BackendRequired'

export const Route = createFileRoute('/notes')({
  component: () => <BackendRequired><NotesPage /></BackendRequired>,
})
