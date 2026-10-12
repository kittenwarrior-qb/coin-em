import path from 'node:path'

// The runner selects explicit source roots; package-root runtime data is never
// selected. A nested src/data directory is legitimate source, not room storage.
export function cleanSourceEntryAllowed(source) {
  const name = path.basename(source).toLowerCase()
  return !name.startsWith('.env') && name !== '.npmrc' &&
    !['node_modules', 'dist', 'test-data'].includes(name)
}
