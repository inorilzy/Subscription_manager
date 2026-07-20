let fixedNow: Date | null = null

/** Override "now" for deterministic tests. Pass null to restore system time. */
export function setNow(date: Date | string | null): void {
  if (date == null) {
    fixedNow = null
    return
  }
  fixedNow = typeof date === 'string' ? new Date(date) : new Date(date.getTime())
}

export function now(): Date {
  return fixedNow ? new Date(fixedNow.getTime()) : new Date()
}

/** Device-local calendar date as YYYY-MM-DD (or from controlled clock). */
export function todayDateOnly(): string {
  const d = now()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
