import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isValidTestDefinition } from '../services/testRegistryMerge'
import { miniappRoot } from './testPaths'

function repoRoot() {
  return resolve(miniappRoot(), '..')
}

describe('local-dev registry export', () => {
  it('wires preview to export registry-v1.json before serving generated-art', () => {
    const root = repoRoot()
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as {
      scripts: Record<string, string>
    }
    const source = readFileSync(resolve(miniappRoot(), 'content/export-registry.mjs'), 'utf8')

    expect(pkg.scripts['content:export']).toContain('export-registry.mjs')
    expect(pkg.scripts['art:preview']).toMatch(/export-registry\.mjs/)
    expect(pkg.scripts['art:preview']).toContain('--dir art/generated-art')
    expect(source).toContain('art/generated-art/tests/registry-v1.json')
  })

  it('writes a versioned JSON catalog the simulator can fetch from 8787', () => {
    const outDir = mkdtempSync(resolve(tmpdir(), 'ptking-registry-'))
    const out = resolve(outDir, 'registry-v1.json')
    try {
      execFileSync(process.execPath, [resolve(miniappRoot(), 'content/export-registry.mjs')], {
        cwd: repoRoot(),
        env: { ...process.env, PTKING_REGISTRY_OUT: out },
        stdio: 'pipe',
      })
      const payload = JSON.parse(readFileSync(out, 'utf8')) as {
        version: number
        tests: Array<{ id?: string }>
      }
      expect(payload.version).toBe(1)
      expect(payload.tests.length).toBeGreaterThanOrEqual(29)
      expect(payload.tests.some((test) => test.id === 'mbti')).toBe(true)
      expect(Buffer.byteLength(readFileSync(out))).toBeLessThan(900 * 1024)
      const probe = JSON.parse(readFileSync(resolve(miniappRoot(), 'content/hot-update-probe.json'), 'utf8'))
      expect(isValidTestDefinition(probe)).toBe(true)
      expect(probe.id).toBe('cos-hot-probe')
      expect(payload.tests.some((test) => test.id === probe.id)).toBe(false)
    } finally {
      rmSync(outDir, { recursive: true, force: true })
    }
  })
})
