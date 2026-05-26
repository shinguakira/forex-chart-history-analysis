export function parseAIResponse(text: string): unknown[] {
  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) return parsed
  } catch {
    // fall through
  }

  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fenceMatch) {
    try {
      const parsed = JSON.parse(fenceMatch[1])
      if (Array.isArray(parsed)) return parsed
    } catch {
      // fall through
    }
  }

  throw new Error('Failed to parse AI response as JSON array')
}
