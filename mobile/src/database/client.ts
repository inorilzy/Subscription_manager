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
  close(): Promise<void>
}

const SCHEMA_VERSION = 1
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

class MemoryDatabase implements DatabaseClient {
  private tables = new Map<string, Array<Record<string, unknown>>>()

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
      const rows = this.tables.get('subscriptions') ?? []
      if (sql.includes('COUNT(*)')) {
        const active = rows.filter((row) => row.deleted_at == null)
        return { values: [{ count: active.length }] }
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
  constructor(private readonly connection: SQLiteDBConnection) {}

  async execute(statement: string, params: SqlParams = []): Promise<void> {
    await this.connection.run(statement, params)
  }

  async query(statement: string, params: SqlParams = []): Promise<QueryResult> {
    const result = await this.connection.query(statement, params)
    return { values: (result.values as Array<Record<string, unknown>> | undefined) ?? [] }
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

async function initializeDatabase(): Promise<DatabaseClient> {
  // Tests and plain browser use the in-memory client so CI stays native-free.
  // Native Android/iOS use Capacitor SQLite for durable on-device storage.
  const useNative =
    import.meta.env.MODE !== 'test' && Capacitor.isNativePlatform()

  const client = useNative ? await openNativeDatabase() : new MemoryDatabase()
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
    db = await sqliteConnection.createConnection(DB_NAME, false, 'no-encryption', 1, false)
  }

  await db.open()
  return new NativeSqliteDatabase(db)
}

export async function migrate(client: DatabaseClient): Promise<void> {
  for (const statement of CREATE_STATEMENTS) {
    await client.execute(statement)
  }

  const existing = await client.query(
    'SELECT version FROM schema_migrations WHERE version = ?',
    [SCHEMA_VERSION],
  )

  if ((existing.values?.length ?? 0) === 0) {
    await client.execute('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)', [
      SCHEMA_VERSION,
      new Date().toISOString(),
    ])
  }

  await client.execute('INSERT OR IGNORE INTO preferences (key, value) VALUES (?, ?)', [
    'currency',
    'USD',
  ])
  await client.execute('INSERT OR IGNORE INTO preferences (key, value) VALUES (?, ?)', [
    'language',
    'en',
  ])
  await client.execute('INSERT OR IGNORE INTO preferences (key, value) VALUES (?, ?)', [
    'theme',
    'light',
  ])
}

export async function countActiveSubscriptions(): Promise<number> {
  const db = await getDatabase()
  const result = await db.query(
    'SELECT COUNT(*) as count FROM subscriptions WHERE deleted_at IS NULL',
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

export async function resetDatabaseForTests(): Promise<void> {
  if (sharedClient) {
    await sharedClient.close()
  }
  sharedClient = null
  readyPromise = null
  sharedClient = await initializeDatabase()
}
