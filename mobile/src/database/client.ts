import { Capacitor } from '@capacitor/core'
import {
  CapacitorSQLite,
  SQLiteConnection,
  type SQLiteDBConnection,
} from '@capacitor-community/sqlite'

type SqlParams = Array<string | number | null>

export interface QueryResult {
  values?: Array<Record<string, unknown>>
}

export interface DatabaseClient {
  execute(statement: string, params?: SqlParams): Promise<void>
  query(statement: string, params?: SqlParams): Promise<QueryResult>
  transaction<T>(work: () => Promise<T>): Promise<T>
  close(): Promise<void>
}

const SCHEMA_VERSION = 3
const DB_NAME = 'subscout'

const CREATE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY NOT NULL,
    applied_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    amount_minor INTEGER NOT NULL,
    currency TEXT NOT NULL,
    billing_interval TEXT NOT NULL,
    billing_anchor_day INTEGER NOT NULL,
    next_billing_date TEXT NOT NULL,
    category TEXT NOT NULL,
    plan_name TEXT,
    payment_method_label TEXT,
    status TEXT NOT NULL,
    reminder_enabled INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT,
    version INTEGER NOT NULL DEFAULT 1
  )`,
  `CREATE TABLE IF NOT EXISTS preferences (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  )`,
]

const MIGRATIONS = [
  { version: 1, statements: [] },
  {
    version: 2,
    statements: [
      `ALTER TABLE subscriptions ADD COLUMN icon_key TEXT NOT NULL DEFAULT 'auto'`,
      `ALTER TABLE subscriptions ADD COLUMN account_label TEXT`,
    ],
  },
  {
    version: 3,
    statements: [
      `UPDATE subscriptions
       SET category = 'Default',
           updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
           version = version + 1
       WHERE category = 'Other'`,
    ],
  },
] as const

class MemoryDatabase implements DatabaseClient {
  private tables = new Map<string, Array<Record<string, unknown>>>()

  /** Shared store so reinitialize can keep durable test data. */
  static sharedStore: Map<string, Array<Record<string, unknown>>> | null = null

  constructor(reuseShared = false) {
    if (reuseShared && MemoryDatabase.sharedStore) {
      this.tables = MemoryDatabase.sharedStore
    } else {
      this.tables = new Map()
      MemoryDatabase.sharedStore = this.tables
    }
  }

  async execute(statement: string, params: SqlParams = []): Promise<void> {
    const sql = statement.trim()

    if (sql.startsWith('CREATE TABLE')) {
      const match = sql.match(/CREATE TABLE IF NOT EXISTS (\w+)/i)
      const tableName = match?.[1]
      if (tableName && !this.tables.has(tableName)) {
        this.tables.set(tableName, [])
      }
      return
    }

    if (sql.startsWith('INSERT INTO schema_migrations')) {
      this.ensureTable('schema_migrations')
      this.tables.get('schema_migrations')!.push({
        version: params[0],
        applied_at: params[1],
      })
      return
    }

    if (
      sql.startsWith('INSERT OR IGNORE INTO preferences') ||
      sql.startsWith('INSERT INTO preferences')
    ) {
      this.ensureTable('preferences')
      const [key, value] = params
      const rows = this.tables.get('preferences')!
      if (!rows.some((row) => row.key === key)) {
        rows.push({ key, value })
      }
      return
    }

    if (sql.startsWith('UPDATE preferences SET') || sql.startsWith('UPDATE preferences')) {
      this.ensureTable('preferences')
      // Supports: UPDATE preferences SET value = ? WHERE key = ?
      const value = params[0]
      const key = params[1]
      const rows = this.tables.get('preferences')!
      const existing = rows.find((row) => row.key === key)
      if (existing) {
        existing.value = value
      } else {
        rows.push({ key, value })
      }
      return
    }

    if (sql.startsWith('INSERT OR REPLACE INTO preferences')) {
      this.ensureTable('preferences')
      const [key, value] = params
      const rows = this.tables.get('preferences')!
      const existing = rows.find((row) => row.key === key)
      if (existing) {
        existing.value = value
      } else {
        rows.push({ key, value })
      }
      return
    }

    if (sql.startsWith('INSERT INTO subscriptions')) {
      this.ensureTable('subscriptions')
      const [
        id,
        name,
        amount_minor,
        currency,
        billing_interval,
        billing_anchor_day,
        next_billing_date,
        category,
        plan_name,
        payment_method_label,
        icon_key,
        account_label,
        status,
        reminder_enabled,
        created_at,
        updated_at,
        deleted_at,
        version,
      ] = params
      const rows = this.tables.get('subscriptions')!
      if (rows.some((row) => row.id === id)) {
        throw new Error('UNIQUE constraint failed: subscriptions.id')
      }
      rows.push({
        id,
        name,
        amount_minor,
        currency,
        billing_interval,
        billing_anchor_day,
        next_billing_date,
        category,
        plan_name,
        payment_method_label,
        icon_key,
        account_label,
        status,
        reminder_enabled,
        created_at,
        updated_at,
        deleted_at,
        version,
      })
      return
    }

    if (sql.startsWith('UPDATE subscriptions')) {
      this.ensureTable('subscriptions')
      const rows = this.tables.get('subscriptions')!

      if (sql.includes('name = ?') && sql.includes('amount_minor = ?')) {
        const [
          name,
          amount_minor,
          currency,
          billing_interval,
          billing_anchor_day,
          next_billing_date,
          category,
          plan_name,
          payment_method_label,
          icon_key,
          account_label,
          updated_at,
          version,
          id,
        ] = params
        const row = rows.find((item) => item.id === id)
        if (row) {
          Object.assign(row, {
            name,
            amount_minor,
            currency,
            billing_interval,
            billing_anchor_day,
            next_billing_date,
            category,
            plan_name,
            payment_method_label,
            icon_key,
            account_label,
            updated_at,
            version,
          })
        }
        return
      }

      if (sql.includes('SET status = ?') && sql.includes('next_billing_date = ?')) {
        const [status, next_billing_date, updated_at, id] = params
        const row = rows.find((item) => item.id === id)
        if (row) {
          row.status = status
          row.next_billing_date = next_billing_date
          row.updated_at = updated_at
          row.version = Number(row.version ?? 1) + 1
        }
        return
      }

      if (sql.includes('SET status = ?')) {
        const [status, updated_at, id] = params
        const row = rows.find((item) => item.id === id)
        if (row) {
          row.status = status
          row.updated_at = updated_at
          row.version = Number(row.version ?? 1) + 1
        }
        return
      }

      if (sql.includes('SET deleted_at = ?')) {
        const [deleted_at, updated_at, id] = params
        const row = rows.find((item) => item.id === id)
        if (row) {
          row.deleted_at = deleted_at
          row.updated_at = updated_at
          row.version = Number(row.version ?? 1) + 1
        }
        return
      }

      if (sql.includes('SET category = ?') && sql.includes('LOWER(category) = LOWER(?)')) {
        const [category, updatedAt, target] = params
        for (const row of rows) {
          if (
            row.deleted_at == null &&
            String(row.category).toLocaleLowerCase() === String(target).toLocaleLowerCase()
          ) {
            row.category = category
            row.updated_at = updatedAt
            row.version = Number(row.version ?? 1) + 1
          }
        }
        return
      }

      if (sql.includes("SET category = 'Default'") && sql.includes("category = 'Other'")) {
        for (const row of rows) {
          if (row.category === 'Other') {
            row.category = 'Default'
            row.updated_at = new Date().toISOString()
            row.version = Number(row.version ?? 1) + 1
          }
        }
        return
      }

      // advance: SET next_billing_date = ?, updated_at = ?, version = version + 1 WHERE id = ?
      const nextBillingDate = params[0]
      const updatedAt = params[1]
      const id = params[2]
      const row = rows.find((item) => item.id === id)
      if (row) {
        row.next_billing_date = nextBillingDate
        row.updated_at = updatedAt
        row.version = Number(row.version ?? 1) + 1
      }
      return
    }

    if (sql.startsWith('DELETE FROM')) {
      const match = sql.match(/DELETE FROM (\w+)/i)
      const tableName = match?.[1]
      if (tableName) {
        this.tables.set(tableName, [])
      }
    }
  }

  async query(statement: string, params: SqlParams = []): Promise<QueryResult> {
    const sql = statement.trim()

    if (sql.includes('FROM schema_migrations')) {
      const rows = this.tables.get('schema_migrations') ?? []
      if (sql.includes('WHERE version = ?')) {
        return { values: rows.filter((row) => row.version === params[0]) }
      }
      return { values: rows }
    }

    if (sql.includes('FROM subscriptions')) {
      let rows = [...(this.tables.get('subscriptions') ?? [])]

      if (sql.includes('WHERE id = ?')) {
        rows = rows.filter((row) => row.id === params[0])
      }

      if (sql.includes('deleted_at IS NULL')) {
        rows = rows.filter((row) => row.deleted_at == null)
      }

      if (sql.includes('LOWER(category) = LOWER(?)')) {
        const target = String(params[0]).toLocaleLowerCase()
        rows = rows.filter((row) => String(row.category).toLocaleLowerCase() === target)
      }

      if (sql.includes("status = 'active'") || sql.includes('status = ?')) {
        const status = sql.includes('status = ?') ? params[params.length - 1] : 'active'
        rows = rows.filter((row) => row.status === status)
      }

      if (sql.includes('COUNT(*)')) {
        return { values: [{ count: rows.length }] }
      }

      if (sql.includes('ORDER BY next_billing_date')) {
        rows.sort((a, b) => {
          const dateCmp = String(a.next_billing_date).localeCompare(String(b.next_billing_date))
          if (dateCmp !== 0) return dateCmp
          return String(a.name).localeCompare(String(b.name))
        })
      }

      return { values: rows }
    }

    if (sql.includes('FROM preferences')) {
      const rows = this.tables.get('preferences') ?? []
      if (sql.includes('WHERE key = ?')) {
        return { values: rows.filter((row) => row.key === params[0]) }
      }
      return { values: rows }
    }

    return { values: [] }
  }

  async transaction<T>(work: () => Promise<T>): Promise<T> {
    const snapshot = new Map<string, Array<Record<string, unknown>>>(
      [...this.tables.entries()].map(([table, rows]) => [table, rows.map((row) => ({ ...row }))]),
    )
    try {
      return await work()
    } catch (error) {
      this.tables = snapshot
      MemoryDatabase.sharedStore = snapshot
      throw error
    }
  }

  async close(): Promise<void> {
    // no-op for in-memory test database
  }

  private ensureTable(name: string) {
    if (!this.tables.has(name)) {
      this.tables.set(name, [])
    }
  }
}

class NativeSqliteDatabase implements DatabaseClient {
  private inTransaction = false

  constructor(private readonly connection: SQLiteDBConnection) {}

  async execute(statement: string, params: SqlParams = []): Promise<void> {
    await this.connection.run(statement, params, !this.inTransaction)
  }

  async query(statement: string, params: SqlParams = []): Promise<QueryResult> {
    const result = await this.connection.query(statement, params)
    return { values: (result.values as Array<Record<string, unknown>> | undefined) ?? [] }
  }

  async transaction<T>(work: () => Promise<T>): Promise<T> {
    await this.connection.beginTransaction()
    this.inTransaction = true
    try {
      const result = await work()
      await this.connection.commitTransaction()
      return result
    } catch (error) {
      await this.connection.rollbackTransaction().catch(() => undefined)
      throw error
    } finally {
      this.inTransaction = false
    }
  }

  async close(): Promise<void> {
    const isOpen = (await this.connection.isDBOpen()).result
    if (isOpen) {
      await this.connection.close()
    }
  }
}

let sharedClient: DatabaseClient | null = null
let readyPromise: Promise<DatabaseClient> | null = null
let sqliteConnection: SQLiteConnection | null = null

export async function getDatabase(): Promise<DatabaseClient> {
  if (sharedClient) {
    return sharedClient
  }

  if (!readyPromise) {
    readyPromise = initializeDatabase()
  }

  sharedClient = await readyPromise
  return sharedClient
}

async function initializeDatabase(options?: { keepData?: boolean }): Promise<DatabaseClient> {
  // Tests and plain browser use the in-memory client so CI stays native-free.
  // Native Android/iOS use Capacitor SQLite for durable on-device storage.
  const useNative = import.meta.env.MODE !== 'test' && Capacitor.isNativePlatform()

  const client = useNative
    ? await openNativeDatabase()
    : new MemoryDatabase(Boolean(options?.keepData))
  await migrate(client)
  return client
}

async function openNativeDatabase(): Promise<DatabaseClient> {
  sqliteConnection = new SQLiteConnection(CapacitorSQLite)

  const consistency = await sqliteConnection.checkConnectionsConsistency()
  const isConn = (await sqliteConnection.isConnection(DB_NAME, false)).result

  let db: SQLiteDBConnection
  if (consistency.result && isConn) {
    db = await sqliteConnection.retrieveConnection(DB_NAME, false)
  } else {
    db = await sqliteConnection.createConnection(
      DB_NAME,
      false,
      'no-encryption',
      SCHEMA_VERSION,
      false,
    )
  }

  await db.open()
  return new NativeSqliteDatabase(db)
}

export async function migrate(client: DatabaseClient): Promise<void> {
  for (const statement of CREATE_STATEMENTS) {
    await client.execute(statement)
  }

  for (const migration of MIGRATIONS) {
    const existing = await client.query('SELECT version FROM schema_migrations WHERE version = ?', [
      migration.version,
    ])
    if ((existing.values?.length ?? 0) > 0) continue

    await client.transaction(async () => {
      for (const statement of migration.statements) {
        await client.execute(statement)
      }
      await client.execute('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)', [
        migration.version,
        new Date().toISOString(),
      ])
    })
  }

  await client.execute(`PRAGMA user_version = ${SCHEMA_VERSION}`)

  await client.execute('INSERT OR IGNORE INTO preferences (key, value) VALUES (?, ?)', [
    'currency',
    'CNY',
  ])
  await client.execute('INSERT OR IGNORE INTO preferences (key, value) VALUES (?, ?)', [
    'language',
    'zh-CN',
  ])
  await client.execute('INSERT OR IGNORE INTO preferences (key, value) VALUES (?, ?)', [
    'theme',
    'system',
  ])
}

export async function countActiveSubscriptions(): Promise<number> {
  const db = await getDatabase()
  const result = await db.query(
    `SELECT COUNT(*) as count FROM subscriptions
     WHERE deleted_at IS NULL AND status = 'active'`,
  )
  const count = result.values?.[0]?.count
  return typeof count === 'number' ? count : Number(count ?? 0)
}

export async function getPreference(key: string, fallback: string): Promise<string> {
  const db = await getDatabase()
  const result = await db.query('SELECT value FROM preferences WHERE key = ?', [key])
  const value = result.values?.[0]?.value
  return typeof value === 'string' ? value : fallback
}

export async function setPreference(key: string, value: string): Promise<void> {
  const db = await getDatabase()
  await db.execute('INSERT OR REPLACE INTO preferences (key, value) VALUES (?, ?)', [key, value])
}

export async function resetDatabaseForTests(): Promise<void> {
  if (sharedClient) {
    await sharedClient.close()
  }
  sharedClient = null
  readyPromise = null
  MemoryDatabase.sharedStore = null
  sharedClient = await initializeDatabase({ keepData: false })
}

/** Rebind the shared client while keeping the in-memory store (process restart simulation). */
export async function reinitializeDatabaseKeepingDataForTests(): Promise<void> {
  if (sharedClient) {
    await sharedClient.close()
  }
  sharedClient = null
  readyPromise = null
  sharedClient = await initializeDatabase({ keepData: true })
}
