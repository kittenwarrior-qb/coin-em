import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

describe('production TypeScript log privacy boundary', () => {
  it('routes runtime diagnostics through the closed metadata-only logger', () => {
    const root = path.resolve(__dirname, '../../src')
    const sources: string[] = []
    const visit = (directory: string) => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const target = path.join(directory, entry.name)
        if (entry.isDirectory() && entry.name !== '__mocks__') visit(target)
        else if (entry.isFile() && entry.name.endsWith('.ts')) sources.push(target)
      }
    }
    visit(root)
    expect(sources.length).toBeGreaterThan(30)
    for (const source of sources) {
      const content = fs.readFileSync(source, 'utf8')
      const relative = path.relative(root, source).replaceAll('\\', '/')
      expect(content, relative).not.toMatch(/console\s*\.\s*(?:log|info|warn|error|debug|trace|dir|table)\s*\(/)
      if (relative !== 'telemetry/operationalDiagnostics.ts') {
        expect(content, relative).not.toMatch(/console\s*\[/)
      }
    }
  })
})
