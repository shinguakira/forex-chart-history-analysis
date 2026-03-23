const TZ = 'Asia/Tokyo'

const dtf = new Intl.DateTimeFormat('ja-JP', {
  timeZone: TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

function toDate(v: Date | string | number): Date {
  if (v instanceof Date) return v
  if (typeof v === 'number') return new Date(v)
  return new Date(v)
}

/** Format as "2024/03/23 14:30" in JST */
export function formatDateJST(v: Date | string | number): string {
  const parts = dtf.formatToParts(toDate(v))
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ''
  return `${get('year')}/${get('month')}/${get('day')} ${get('hour')}:${get('minute')}`
}

/** Get JST hour (0-23) */
export function getJSTHour(v: Date | string): number {
  const d = toDate(v)
  return Number(
    new Intl.DateTimeFormat('en-US', {
      timeZone: TZ,
      hour: 'numeric',
      hour12: false,
    }).format(d),
  )
}

const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

/** Get JST day of week (0=Sun … 6=Sat) */
export function getJSTDayOfWeek(v: Date | string): number {
  const d = toDate(v)
  const day = new Intl.DateTimeFormat('en-US', {
    timeZone: TZ,
    weekday: 'short',
  }).format(d)
  return dayMap[day] ?? 0
}

/** Format unix seconds → "2024/03/23 14:30" in JST */
export function formatCandleTimeJST(unixSeconds: number): string {
  return formatDateJST(unixSeconds * 1000)
}

/** Format unix seconds → "14:30" in JST (for chart tick marks) */
export function formatTimeOnlyJST(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000)
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ''
  return `${get('hour')}:${get('minute')}`
}

/** Format unix seconds → "03/23" in JST (for chart date marks) */
export function formatDateOnlyJST(unixSeconds: number): string {
  const d = new Date(unixSeconds * 1000)
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: TZ,
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? ''
  return `${get('month')}/${get('day')}`
}
