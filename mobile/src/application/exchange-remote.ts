import { ratesFromCnyBaseResponse, type ExchangeRates } from '../domain/exchange'

const EXCHANGE_API_URL = 'https://open.er-api.com/v6/latest/CNY'
const REQUEST_TIMEOUT_MS = 10_000

export interface RemoteRatesResult {
  rates: ExchangeRates
  fetchedAt: string
}

/**
 * Fetch fresh CNY-anchored rates from open.er-api.com. This is the only place
 * the app touches the network for rates; callers persist the returned values as
 * the user's manual rates, so all later math stays offline and deterministic.
 * Throws on network failure, non-2xx, timeout, or an unusable payload — callers
 * degrade to the existing manual rates instead of overwriting them with zeros.
 */
export async function fetchRemoteRates(): Promise<RemoteRatesResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  let payload: unknown
  try {
    const response = await fetch(EXCHANGE_API_URL, {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    })
    if (!response.ok) {
      throw new Error(`Exchange service returned ${response.status}.`)
    }
    payload = await response.json()
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Exchange request timed out.')
    }
    throw error instanceof Error ? error : new Error('Exchange request failed.')
  } finally {
    clearTimeout(timer)
  }

  const rates = ratesFromCnyBaseResponse(payload)
  if (Object.keys(rates).length === 0) {
    throw new Error('Exchange service returned no usable rates.')
  }

  return { rates, fetchedAt: new Date().toISOString() }
}
