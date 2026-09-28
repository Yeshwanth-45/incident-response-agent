// Loads the resolved incidents from the local SQLite seed data into the
// Hindsight memory bank, so recall works in the demo (e.g. INC-1042).
// Usage: cp .env.example .env.local, fill in Hindsight settings, then:
//   npm run seed:memory
import { listIncidents } from '../src/lib/db';
import { isHindsightConfigured, retainIncidentMemory } from '../src/lib/hindsight';

async function main() {
  if (!isHindsightConfigured()) {
    console.error('HINDSIGHT_BASE_URL is not set in .env.local - nothing to seed.');
    process.exit(1);
  }
  const resolved = listIncidents({ status: 'Resolved' });
  let ok = 0;
  for (const inc of resolved) {
    const r = await retainIncidentMemory(inc);
    console.log(`${inc.id}: ${r.success ? 'retained' : 'FAILED - ' + r.error}`);
    if (r.success) ok++;
  }
  console.log(`\n${ok}/${resolved.length} incidents retained in Hindsight.`);
  process.exit(ok === resolved.length ? 0 : 1);
}
main();
