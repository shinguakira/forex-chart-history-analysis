import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'

import type { Note } from '@/generated/bindings'
import { rspc } from '@/lib/rspc'

const LIST_KEY = ['notes.list'] as const

export function NotesPage() {
  const qc = useQueryClient()
  const [draft, setDraft] = useState('')
  const [editId, setEditId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

  const notesQuery = useQuery({
    queryKey: LIST_KEY,
    queryFn: () => rspc.query(['notes.list', null]),
  })

  const upsert = useMutation({
    mutationFn: (input: { id?: string | null; text: string }) =>
      rspc.mutation(['notes.upsert', { id: input.id ?? null, text: input.text }]),
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  })

  const remove = useMutation({
    mutationFn: (id: string) => rspc.mutation(['notes.delete', { id }]),
    onSuccess: () => qc.invalidateQueries({ queryKey: LIST_KEY }),
  })

  const notes = notesQuery.data ?? []
  const loaded = notesQuery.isSuccess

  const handleAdd = () => {
    const text = draft.trim()
    if (!text) return
    upsert.mutate({ text })
    setDraft('')
  }

  const handleEditStart = (note: Note) => {
    setEditId(note.id)
    setEditText(note.text)
  }

  const handleEditSave = () => {
    if (!editId) return
    const text = editText.trim()
    if (!text) {
      remove.mutate(editId)
    } else {
      upsert.mutate({ id: editId, text })
    }
    setEditId(null)
    setEditText('')
  }

  const formatTime = (ts: number) => {
    const d = new Date(ts)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }

  return (
    <div className="min-h-screen bg-[#0f1117] text-gray-200 p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-xl font-bold text-white">Notes</h1>

        <div className="flex gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleAdd()
            }}
            placeholder="Write a note... (Ctrl+Enter to save)"
            rows={3}
            className="flex-1 rounded bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 resize-none"
          />
          <button
            type="button"
            className="self-end px-4 py-2 text-xs rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
            onClick={handleAdd}
            disabled={upsert.isPending}
          >
            Add
          </button>
        </div>

        {!loaded && <div className="text-xs text-gray-500">Loading...</div>}
        {notesQuery.isError && (
          <div className="text-xs text-red-400">Failed to load notes: {String(notesQuery.error)}</div>
        )}

        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
              {editId === note.id ? (
                <div className="space-y-2">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleEditSave()
                      if (e.key === 'Escape') setEditId(null)
                    }}
                    rows={3}
                    className="w-full rounded bg-gray-800 border border-gray-700 px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 resize-none"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="px-3 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-500"
                      onClick={handleEditSave}
                    >
                      Save
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1 text-xs rounded bg-gray-800 text-gray-400 hover:text-gray-200"
                      onClick={() => setEditId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="text-sm text-gray-200 whitespace-pre-wrap">{note.text}</div>
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-800">
                    <span className="text-[10px] text-gray-600">{formatTime(note.createdAt)}</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="text-xs text-gray-500 hover:text-gray-300"
                        onClick={() => handleEditStart(note)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="text-xs text-gray-500 hover:text-red-400"
                        onClick={() => remove.mutate(note.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {loaded && notes.length === 0 && (
            <div className="text-xs text-gray-500 text-center py-8">No notes yet.</div>
          )}
        </div>
      </div>
    </div>
  )
}
