#!/usr/bin/env node
'use strict'

// Explicit offline inputs only; no server, persistence or Redis import/connection.
function runAuditCli(args, audit, stdout, stderr) {
  if (args.length === 1 && args[0] === '--help') {
    stdout('Usage: node scripts/audit-room-backups.cjs --input DIRECTORY [--exclude-deleted JSON_FILE]\nRead-only audit. Exclusion file: JSON array of room IDs. Never restores or edits files.\n')
    return 0
  }
  const values = Object.create(null)
  let valid = args.length > 0 && args.length % 2 === 0
  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i]
    if (!['--input', '--exclude-deleted'].includes(flag) || values[flag] || !args[i + 1] || args[i + 1].startsWith('--')) valid = false
    values[flag] = args[i + 1]
  }
  if (!valid || !values['--input']) {
    stderr('Explicit --input is required; use --help.\n')
    return 2
  } else {
    try {
      const report = audit(values['--input'], values['--exclude-deleted'])
      stdout(`${JSON.stringify(report, null, 2)}\n`)
      return report.summary.quarantineRequired ? 1 : 0
    } catch {
      // Do not print filesystem error paths, filenames or snapshot contents.
      stderr('BACKUP_AUDIT_FAILED: build backend first; verify explicit inputs and exclusion format.\n')
      return 2
    }
  }
}

module.exports = { runAuditCli }
if (require.main === module) {
  process.exitCode = runAuditCli(process.argv.slice(2),
    (input, exclusion) => require('../dist/backup/RoomBackupAudit.js').auditBackupDirectory(input, exclusion),
    text => process.stdout.write(text), text => process.stderr.write(text))
}
