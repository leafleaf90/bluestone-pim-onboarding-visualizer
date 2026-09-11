/**
 * Stub converter. Replace this file after the user confirms a schema.
 *
 * Default: sample the first N records for fast iteration.
 * Full load: pnpm convert -- --limit 0
 */
const IMPLEMENTED = false

function fail(message: string): never {
  console.error(message)
  process.exit(1)
}

if (!IMPLEMENTED) {
  fail([
    'No converter yet.',
    'Drop source files in prospect/, then ask the agent to analyze them and write scripts/convert.ts.'
  ].join('\n'))
}
