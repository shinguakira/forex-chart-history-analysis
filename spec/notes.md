# Notes  (route: `/notes`)

## What it's for

A simple persistent notepad for capturing thoughts, observations, or trade ideas without leaving the app.

## Layout

- **Header** — page title.
- **New note input** — textarea + Add button at the top.
- **Notes list** — newest first; each note in its own card with timestamp + Edit/Delete actions.

## Controls & actions

### Add a note

- **Textarea** at top — type your note. Empty notes are silently ignored.
- **Add** button — saves the note.
- **Ctrl+Enter / Cmd+Enter** — keyboard shortcut to save.

### Per-note actions

- **Edit** — switches the note into an inline edit textarea with Save / Cancel buttons.
- **Delete** — removes the note immediately (no confirm dialog).

### Edit mode

- **Save** button or **Ctrl+Enter** — saves changes. **Saving with empty text deletes the note** (intentional — quick way to clear).
- **Cancel** button or **Escape** — discards changes.

## Workflows

**Quick capture** — Click the textarea, type, hit Ctrl+Enter. Note appears at the top.

**Cleanup** — Edit a note, clear all the text, hit Ctrl+Enter. The note is deleted.

## Data shown

- Each note row: full text (preserving line breaks), creation timestamp (`YYYY/MM/DD HH:MM` JST).

## Configuration

None.

## Storage / persistence

- **Notes** — `data/notes.json` via `/api/notes` Vite plugin.
- Saves are debounced 300ms after the last change, so rapid edits coalesce into one write.

## Limits / gotchas

- No tags, no folders, no search — pure list.
- Saving with empty text from edit mode deletes the note. Use Cancel (or Esc) if you wanted to keep it.
- No undo — once deleted, a note is gone.
