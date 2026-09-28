import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import type {
  Incident,
  Runbook,
  Postmortem,
  TimelineEvent,
  ChatMessage,
  Severity,
} from './types';

// ---------------------------------------------------------------------------
// Connection
// ---------------------------------------------------------------------------
// Node's built-in `node:sqlite` module (stable since Node 22.5) is used so the
// project has zero native build dependencies. The DB file lives outside the
// Next.js build output so it survives restarts during local development.

const DATA_DIR = path.join(process.cwd(), '.data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = process.env.DATABASE_URL?.replace(/^file:/, '') || path.join(DATA_DIR, 'app.db');

// Reuse a single connection across hot-reloads in dev.
const globalForDb = globalThis as unknown as { __iraDb?: DatabaseSync };
export const db: DatabaseSync = globalForDb.__iraDb ?? new DatabaseSync(DB_PATH);
if (process.env.NODE_ENV !== 'production') globalForDb.__iraDb = db;

db.exec(`
  CREATE TABLE IF NOT EXISTS incidents (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    service TEXT NOT NULL,
    severity TEXT NOT NULL,
    status TEXT NOT NULL,
    description TEXT NOT NULL,
    logs TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL,
    resolvedAt TEXT,
    rootCause TEXT,
    resolution TEXT,
    runbookId TEXT,
    impactDuration TEXT,
    affectedUsers TEXT,
    lessonsLearned TEXT
  );

  CREATE TABLE IF NOT EXISTS runbooks (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    service TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT NOT NULL,
    steps TEXT NOT NULL,
    verificationSteps TEXT NOT NULL,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS postmortems (
    id TEXT PRIMARY KEY,
    incidentId TEXT NOT NULL,
    rootCause TEXT NOT NULL,
    resolutionSteps TEXT NOT NULL,
    runbookUsed TEXT,
    lessonsLearned TEXT NOT NULL,
    additionalNotes TEXT,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS timeline_events (
    id TEXT PRIMARY KEY,
    incidentId TEXT NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    incidentId TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    createdAt TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS memory_log (
    id TEXT PRIMARY KEY,
    incidentId TEXT,
    operation TEXT NOT NULL,
    bankId TEXT NOT NULL,
    success INTEGER NOT NULL,
    detail TEXT,
    createdAt TEXT NOT NULL
  );
`);

// ---------------------------------------------------------------------------
// Seed data (synthetic + internally consistent, for demo purposes only)
// ---------------------------------------------------------------------------
function seedIfEmpty() {
  const row = db.prepare('SELECT COUNT(*) as c FROM runbooks').get() as unknown as { c: number };
  if (row.c > 0) return;

  const now = Date.now();
  const iso = (msAgo: number) => new Date(now - msAgo).toISOString();

  const runbooks: Runbook[] = [
    {
      id: 'DB-CONNECTION-POOL-01',
      name: 'Database Connection Pool Exhaustion',
      service: 'Payment API',
      description: 'Handle database connection pool exhaustion issues.',
      severity: 'Critical',
      steps: [
        'Check current database connection pool usage and active connection count.',
        'Compare current traffic against baseline to confirm a demand spike.',
        'Increase the connection pool size (e.g. from 20 to 50) if the pool is saturated.',
        'Restart the affected service to apply the new pool configuration.',
        'Monitor connection pool utilization and error rates for 15-30 minutes after the change.',
      ],
      verificationSteps: [
        'Confirm connection pool utilization stays below 80% under current load.',
        'Confirm payment success rate has returned to baseline.',
        'Confirm no new timeout errors appear in the service logs.',
      ],
      notes: 'Set up proactive alerting on connection pool usage to catch this earlier next time.',
    },
    {
      id: 'REDIS-CONN-01',
      name: 'Redis Connection Issues',
      service: 'Cache',
      description: 'Diagnose and recover from Redis connectivity failures.',
      severity: 'High',
      steps: [
        'Check Redis server health and memory usage.',
        'Check for network partition between application and Redis nodes.',
        'Restart the Redis connection pool in the application if idle connections are stale.',
        'Fail over to a Redis replica if the primary is unreachable.',
      ],
      verificationSteps: [
        'Confirm cache hit rate returns to baseline.',
        'Confirm application error logs no longer show Redis timeouts.',
      ],
      notes: null,
    },
    {
      id: 'DB-CPU-01',
      name: 'High Database CPU Usage',
      service: 'Database',
      description: 'Investigate and mitigate sustained high CPU on the primary database.',
      severity: 'High',
      steps: [
        'Identify the top long-running or high-cost queries.',
        'Check for a recently deployed migration or query change.',
        'Add or adjust an index if a query is doing a full table scan.',
        'Scale the database instance vertically if the load is legitimate traffic growth.',
      ],
      verificationSteps: [
        'Confirm CPU utilization drops below the alerting threshold.',
        'Confirm query latency returns to baseline.',
      ],
      notes: null,
    },
    {
      id: 'AUTH-FAIL-01',
      name: 'Authentication Failures',
      service: 'Auth Service',
      description: 'Handle spikes in authentication failures.',
      severity: 'Medium',
      steps: [
        'Check whether failures are concentrated on one auth provider or global.',
        'Check recent deploys to the auth service or token validation logic.',
        'Check for expired signing keys or certificates.',
        'Roll back the most recent auth-related deploy if it correlates with the spike.',
      ],
      verificationSteps: [
        'Confirm login success rate returns to baseline.',
        'Confirm no certificate or key-expiry warnings remain.',
      ],
      notes: null,
    },
    {
      id: 'API-TIMEOUT-01',
      name: 'API Timeout Errors',
      service: 'API Gateway',
      description: 'Investigate elevated timeout rates on an API route.',
      severity: 'High',
      steps: [
        'Identify which upstream dependency is slow.',
        'Check for downstream saturation (database, cache, third-party API).',
        'Increase timeout or add a circuit breaker only as a temporary mitigation.',
        'Address the root latency source in the dependent service.',
      ],
      verificationSteps: [
        'Confirm p95/p99 latency returns to baseline.',
        'Confirm timeout error rate drops to near zero.',
      ],
      notes: null,
    },
    {
      id: 'MEM-EXHAUST-01',
      name: 'Memory Exhaustion',
      service: 'Web Server',
      description: 'Recover a service experiencing high memory usage or OOM restarts.',
      severity: 'Medium',
      steps: [
        'Check for a memory leak pattern (steadily rising RSS over time).',
        'Check for an unusually large in-memory cache or unbounded queue.',
        'Restart affected instances to recover capacity immediately.',
        'Roll back a recent deploy if the leak correlates with it.',
      ],
      verificationSteps: [
        'Confirm memory usage stabilizes below the alerting threshold.',
        'Confirm no further OOM restarts occur.',
      ],
      notes: null,
    },
    {
      id: 'KAFKA-LAG-01',
      name: 'Kafka Consumer Lag',
      service: 'Kafka',
      description: 'Reduce growing consumer lag on a critical topic.',
      severity: 'Medium',
      steps: [
        'Check consumer group lag per partition.',
        'Check for a slow or crashing consumer instance.',
        'Scale out consumer instances if partitions allow it.',
        'Check for a downstream dependency slowing message processing.',
      ],
      verificationSteps: [
        'Confirm lag is decreasing and trending back to near-zero.',
        'Confirm no consumer instances are crash-looping.',
      ],
      notes: null,
    },
    {
      id: 'EMAIL-FAIL-01',
      name: 'Email Service Failures',
      service: 'Email Service',
      description: 'Restore transactional email delivery.',
      severity: 'High',
      steps: [
        'Check the email provider status page for an outage.',
        'Check API credentials and rate limits with the provider.',
        'Failover to a backup email provider if configured.',
        'Queue and retry failed sends once the provider recovers.',
      ],
      verificationSteps: [
        'Confirm delivery success rate returns to baseline.',
        'Confirm the retry queue is draining.',
      ],
      notes: null,
    },
  ];

  const insertRunbook = db.prepare(
    `INSERT INTO runbooks (id, name, service, description, severity, steps, verificationSteps, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const rb of runbooks) {
    insertRunbook.run(
      rb.id,
      rb.name,
      rb.service,
      rb.description,
      rb.severity,
      JSON.stringify(rb.steps),
      JSON.stringify(rb.verificationSteps),
      rb.notes
    );
  }

  // The key historical incident used to demonstrate the Hindsight memory
  // workflow (see README's "demo story").
  const incidents: Incident[] = [
    {
      id: 'INC-1042',
      title: 'Database connection timeout',
      service: 'Payment API',
      severity: 'Critical',
      status: 'Resolved',
      description:
        'Payment API was failing due to database connection pool exhaustion during a peak-traffic window.',
      logs: 'ERROR pool.acquire timeout after 5000ms, active=20/20, waiting=147',
      createdAt: iso(1000 * 60 * 60 * 24 * 320),
      updatedAt: iso(1000 * 60 * 60 * 24 * 320 - 1000 * 60 * 18),
      resolvedAt: iso(1000 * 60 * 60 * 24 * 320 - 1000 * 60 * 18),
      rootCause: 'Connection pool exhaustion due to high concurrent requests during peak traffic.',
      resolution: 'Increased connection pool size from 20 to 50 and restarted the payment service.',
      runbookId: 'DB-CONNECTION-POOL-01',
      impactDuration: '18 minutes',
      affectedUsers: '~12,000',
      lessonsLearned:
        'Monitor connection pool usage proactively. Set up alerts for high connection usage.',
    },
    {
      id: 'INC-1021',
      title: 'High DB connection usage',
      service: 'Payment API',
      severity: 'High',
      status: 'Resolved',
      description: 'Connection pool usage approached saturation during a marketing campaign traffic spike.',
      logs: 'WARN pool utilization at 92% for 6 minutes',
      createdAt: iso(1000 * 60 * 60 * 24 * 400),
      updatedAt: iso(1000 * 60 * 60 * 24 * 400 - 1000 * 60 * 25),
      resolvedAt: iso(1000 * 60 * 60 * 24 * 400 - 1000 * 60 * 25),
      rootCause: 'Traffic spike from a marketing campaign pushed connection usage close to the pool limit.',
      resolution: 'Temporarily increased pool size and throttled a non-critical background job.',
      runbookId: 'DB-CONNECTION-POOL-01',
      impactDuration: '25 minutes',
      affectedUsers: '~4,000',
      lessonsLearned: 'Coordinate marketing campaigns with infrastructure capacity planning.',
    },
    {
      id: 'INC-1045',
      title: 'Redis connection issues',
      service: 'Cache',
      severity: 'High',
      status: 'Resolved',
      description: 'Application lost connectivity to the primary Redis node.',
      logs: 'ERROR ECONNRESET redis-primary:6379',
      createdAt: iso(1000 * 60 * 60 * 2),
      updatedAt: iso(1000 * 60 * 60 * 2 - 1000 * 60 * 10),
      resolvedAt: iso(1000 * 60 * 60 * 2 - 1000 * 60 * 10),
      rootCause: 'Redis primary node was restarted by the cloud provider for maintenance.',
      resolution: 'Application reconnected automatically once the failover replica was promoted.',
      runbookId: 'REDIS-CONN-01',
      impactDuration: '10 minutes',
      affectedUsers: '~800',
      lessonsLearned: 'Confirm client library retry/backoff is tuned for provider maintenance windows.',
    },
    {
      id: 'INC-1044',
      title: 'High memory usage',
      service: 'Web Server',
      severity: 'Medium',
      status: 'Resolved',
      description: 'Web server instances showed steadily climbing memory usage.',
      logs: 'WARN heap usage 88%',
      createdAt: iso(1000 * 60 * 60 * 3),
      updatedAt: iso(1000 * 60 * 60 * 3 - 1000 * 60 * 30),
      resolvedAt: iso(1000 * 60 * 60 * 3 - 1000 * 60 * 30),
      rootCause: 'An in-memory response cache had no eviction policy and grew unbounded.',
      resolution: 'Added an LRU eviction policy and restarted affected instances.',
      runbookId: 'MEM-EXHAUST-01',
      impactDuration: '30 minutes',
      affectedUsers: '~2,000',
      lessonsLearned: 'Add a memory ceiling and alert before OOM restarts occur.',
    },
    {
      id: 'INC-1043',
      title: 'Email service failures',
      service: 'Email Service',
      severity: 'High',
      status: 'Resolved',
      description: 'Transactional emails were not being delivered.',
      logs: 'ERROR provider 503 rate_limited',
      createdAt: iso(1000 * 60 * 60 * 5),
      updatedAt: iso(1000 * 60 * 60 * 5 - 1000 * 60 * 22),
      resolvedAt: iso(1000 * 60 * 60 * 5 - 1000 * 60 * 22),
      rootCause: 'Email provider rate-limited the account after a burst of password-reset emails.',
      resolution: 'Failed over to the backup email provider and requested a limit increase.',
      runbookId: 'EMAIL-FAIL-01',
      impactDuration: '22 minutes',
      affectedUsers: '~1,500',
      lessonsLearned: 'Add local rate limiting before hitting the provider limit.',
    },
    {
      id: 'INC-1041',
      title: 'Kafka consumer lag',
      service: 'Kafka',
      severity: 'Medium',
      status: 'Resolved',
      description: 'Consumer lag grew steadily on the order-events topic.',
      logs: 'WARN lag=45000 partition=3',
      createdAt: iso(1000 * 60 * 60 * 24 * 17),
      updatedAt: iso(1000 * 60 * 60 * 24 * 17 - 1000 * 60 * 40),
      resolvedAt: iso(1000 * 60 * 60 * 24 * 17 - 1000 * 60 * 40),
      rootCause: 'A downstream enrichment call slowed down, backing up the consumer.',
      resolution: 'Scaled out consumer instances and added a timeout on the enrichment call.',
      runbookId: 'KAFKA-LAG-01',
      impactDuration: '40 minutes',
      affectedUsers: 'N/A (internal processing delay)',
      lessonsLearned: 'Add a circuit breaker around the enrichment dependency.',
    },
    // Currently open incidents shown on the dashboard.
    {
      id: 'INC-1048',
      title: 'Payment API timeout errors',
      service: 'Payment API',
      severity: 'Critical',
      status: 'Active',
      description:
        "We are seeing database connection timeout errors in the payment service. Users are facing failures while making payments.",
      logs: null,
      createdAt: iso(1000 * 60 * 5),
      updatedAt: iso(1000 * 60 * 5),
      resolvedAt: null,
      rootCause: null,
      resolution: null,
      runbookId: null,
      impactDuration: null,
      affectedUsers: null,
      lessonsLearned: null,
    },
    {
      id: 'INC-1047',
      title: 'High database CPU usage',
      service: 'Database',
      severity: 'High',
      status: 'Active',
      description: 'Primary database CPU has been sustained above 90% for 20 minutes.',
      logs: null,
      createdAt: iso(1000 * 60 * 22),
      updatedAt: iso(1000 * 60 * 22),
      resolvedAt: null,
      rootCause: null,
      resolution: null,
      runbookId: null,
      impactDuration: null,
      affectedUsers: null,
      lessonsLearned: null,
    },
    {
      id: 'INC-1046',
      title: 'Authentication failures',
      service: 'Auth Service',
      severity: 'Medium',
      status: 'Active',
      description: 'Elevated login failure rate reported by the mobile client.',
      logs: null,
      createdAt: iso(1000 * 60 * 60),
      updatedAt: iso(1000 * 60 * 60),
      resolvedAt: null,
      rootCause: null,
      resolution: null,
      runbookId: null,
      impactDuration: null,
      affectedUsers: null,
      lessonsLearned: null,
    },
  ];

  const insertIncident = db.prepare(
    `INSERT INTO incidents
      (id, title, service, severity, status, description, logs, createdAt, updatedAt, resolvedAt,
       rootCause, resolution, runbookId, impactDuration, affectedUsers, lessonsLearned)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const inc of incidents) {
    insertIncident.run(
      inc.id, inc.title, inc.service, inc.severity, inc.status, inc.description, inc.logs,
      inc.createdAt, inc.updatedAt, inc.resolvedAt, inc.rootCause, inc.resolution, inc.runbookId,
      inc.impactDuration, inc.affectedUsers, inc.lessonsLearned
    );
  }

  const insertEvent = db.prepare(
    `INSERT INTO timeline_events (id, incidentId, type, message, createdAt) VALUES (?, ?, ?, ?, ?)`
  );
  const seedTimeline = (incidentId: string, createdAt: string, resolvedAt: string | null) => {
    insertEvent.run(randomUUID(), incidentId, 'created', 'Incident created', createdAt);
    if (resolvedAt) {
      insertEvent.run(randomUUID(), incidentId, 'resolved', 'Incident resolved', resolvedAt);
      insertEvent.run(randomUUID(), incidentId, 'postmortem', 'Post-mortem created', resolvedAt);
    }
  };
  for (const inc of incidents) {
    seedTimeline(inc.id, inc.createdAt, inc.resolvedAt);
  }

  const insertPostmortem = db.prepare(
    `INSERT INTO postmortems (id, incidentId, rootCause, resolutionSteps, runbookUsed, lessonsLearned, additionalNotes, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const inc of incidents) {
    if (inc.status === 'Resolved' && inc.rootCause) {
      insertPostmortem.run(
        randomUUID(),
        inc.id,
        inc.rootCause,
        inc.resolution || '',
        inc.runbookId,
        inc.lessonsLearned || '',
        null,
        inc.resolvedAt || inc.updatedAt
      );
    }
  }
}

seedIfEmpty();

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

function rowToRunbook(r: any): Runbook {
  return {
    id: r.id,
    name: r.name,
    service: r.service,
    description: r.description,
    severity: r.severity,
    steps: JSON.parse(r.steps),
    verificationSteps: JSON.parse(r.verificationSteps),
    notes: r.notes,
  };
}

export function listRunbooks(): Runbook[] {
  const rows = db.prepare('SELECT * FROM runbooks ORDER BY id').all();
  return rows.map(rowToRunbook);
}

export function getRunbook(id: string): Runbook | null {
  const row = db.prepare('SELECT * FROM runbooks WHERE id = ?').get(id);
  return row ? rowToRunbook(row) : null;
}

export function listIncidents(filters?: {
  service?: string;
  status?: string;
  severity?: string;
  search?: string;
}): Incident[] {
  let sql = 'SELECT * FROM incidents WHERE 1=1';
  const params: any[] = [];
  if (filters?.service && filters.service !== 'All Services') {
    sql += ' AND service = ?';
    params.push(filters.service);
  }
  if (filters?.status && filters.status !== 'All Status') {
    sql += ' AND status = ?';
    params.push(filters.status);
  }
  if (filters?.severity) {
    sql += ' AND severity = ?';
    params.push(filters.severity);
  }
  if (filters?.search) {
    sql += ' AND (title LIKE ? OR id LIKE ? OR service LIKE ?)';
    const like = `%${filters.search}%`;
    params.push(like, like, like);
  }
  sql += ' ORDER BY createdAt DESC';
  return db.prepare(sql).all(...params) as unknown as Incident[];
}

export function getIncident(id: string): Incident | null {
  return (db.prepare('SELECT * FROM incidents WHERE id = ?').get(id) as unknown as Incident) || null;
}

export function createIncident(data: {
  title: string;
  service: string;
  severity: Severity;
  description: string;
  logs?: string | null;
}): Incident {
  const max = (
    db.prepare("SELECT MAX(CAST(SUBSTR(id, 5) AS INTEGER)) as m FROM incidents").get() as unknown as { m: number | null }
  ).m;
  const id = `INC-${(max || 1048) + 1}`;
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO incidents
      (id, title, service, severity, status, description, logs, createdAt, updatedAt, resolvedAt,
       rootCause, resolution, runbookId, impactDuration, affectedUsers, lessonsLearned)
     VALUES (?, ?, ?, ?, 'Active', ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL)`
  ).run(id, data.title, data.service, data.severity, data.description, data.logs || null, now, now);
  addTimelineEvent(id, 'created', 'Incident created');
  return getIncident(id)!;
}

export function updateIncidentStatus(id: string, status: string) {
  db.prepare('UPDATE incidents SET status = ?, updatedAt = ? WHERE id = ?').run(
    status,
    new Date().toISOString(),
    id
  );
}

export function addTimelineEvent(incidentId: string, type: string, message: string): TimelineEvent {
  const event: TimelineEvent = {
    id: randomUUID(),
    incidentId,
    type,
    message,
    createdAt: new Date().toISOString(),
  };
  db.prepare(
    'INSERT INTO timeline_events (id, incidentId, type, message, createdAt) VALUES (?, ?, ?, ?, ?)'
  ).run(event.id, event.incidentId, event.type, event.message, event.createdAt);
  return event;
}

export function listTimeline(incidentId: string): TimelineEvent[] {
  return db
    .prepare('SELECT * FROM timeline_events WHERE incidentId = ? ORDER BY createdAt ASC')
    .all(incidentId) as unknown as TimelineEvent[];
}

export function addChatMessage(incidentId: string, role: 'user' | 'agent', content: string): ChatMessage {
  const msg: ChatMessage = {
    id: randomUUID(),
    incidentId,
    role,
    content,
    createdAt: new Date().toISOString(),
  };
  db.prepare(
    'INSERT INTO chat_messages (id, incidentId, role, content, createdAt) VALUES (?, ?, ?, ?, ?)'
  ).run(msg.id, msg.incidentId, msg.role, msg.content, msg.createdAt);
  return msg;
}

export function listChatMessages(incidentId: string): ChatMessage[] {
  return db
    .prepare('SELECT * FROM chat_messages WHERE incidentId = ? ORDER BY createdAt ASC')
    .all(incidentId) as unknown as ChatMessage[];
}

export function createPostmortem(data: {
  incidentId: string;
  rootCause: string;
  resolutionSteps: string;
  runbookUsed: string | null;
  lessonsLearned: string;
  additionalNotes: string | null;
}): Postmortem {
  const pm: Postmortem = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...data,
  };
  db.prepare(
    `INSERT INTO postmortems (id, incidentId, rootCause, resolutionSteps, runbookUsed, lessonsLearned, additionalNotes, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(pm.id, pm.incidentId, pm.rootCause, pm.resolutionSteps, pm.runbookUsed, pm.lessonsLearned, pm.additionalNotes, pm.createdAt);

  const now = new Date().toISOString();
  db.prepare(
    `UPDATE incidents SET status = 'Resolved', resolvedAt = ?, updatedAt = ?, rootCause = ?, resolution = ?, runbookId = COALESCE(?, runbookId), lessonsLearned = ?
     WHERE id = ?`
  ).run(now, now, data.rootCause, data.resolutionSteps, data.runbookUsed, data.lessonsLearned, data.incidentId);

  addTimelineEvent(data.incidentId, 'resolved', 'Incident resolved');
  addTimelineEvent(data.incidentId, 'postmortem', 'Post-mortem created');
  return pm;
}

export function getPostmortem(incidentId: string): Postmortem | null {
  return (
    (db
      .prepare('SELECT * FROM postmortems WHERE incidentId = ? ORDER BY createdAt DESC LIMIT 1')
      .get(incidentId) as unknown as Postmortem) || null
  );
}

export function logMemoryOperation(data: {
  incidentId: string | null;
  operation: 'recall' | 'retain';
  bankId: string;
  success: boolean;
  detail?: string;
}) {
  db.prepare(
    `INSERT INTO memory_log (id, incidentId, operation, bankId, success, detail, createdAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run(
    randomUUID(),
    data.incidentId,
    data.operation,
    data.bankId,
    data.success ? 1 : 0,
    data.detail || null,
    new Date().toISOString()
  );
}

export function dashboardStats() {
  const active = (db.prepare("SELECT COUNT(*) as c FROM incidents WHERE status != 'Resolved'").get() as unknown as { c: number }).c;
  const monthAgo = new Date(Date.now() - 1000 * 60 * 60 * 24 * 30).toISOString();
  const resolvedThisMonth = (
    db.prepare("SELECT COUNT(*) as c FROM incidents WHERE status = 'Resolved' AND resolvedAt >= ?").get(monthAgo) as {
      c: number;
    }
  ).c;
  const total = (db.prepare('SELECT COUNT(*) as c FROM incidents').get() as unknown as { c: number }).c;
  const runbooks = (db.prepare('SELECT COUNT(*) as c FROM runbooks').get() as unknown as { c: number }).c;
  return { active, resolvedThisMonth, total, runbooks };
}
