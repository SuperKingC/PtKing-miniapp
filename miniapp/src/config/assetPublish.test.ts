import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { miniappRoot } from './testPaths'

function repoRoot() {
  return resolve(miniappRoot(), '..')
}

describe('COS asset publish workflow', () => {
  it('ships check/upload/publish scripts and a 24-file tarot checklist', () => {
    const root = repoRoot()
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as { scripts: Record<string, string> }
    const publishSource = readFileSync(resolve(root, 'scripts/publish-assets.mjs'), 'utf8')

    expect(pkg.scripts.assets).toContain('publish-assets.mjs --yes --build')
    expect(pkg.scripts['assets:compress']).toContain('compress-art.mjs')
    expect(existsSync(resolve(root, 'scripts/compress-art.mjs'))).toBe(true)
    expect(pkg.scripts['assets:check']).toContain('publish-assets.mjs --check')
    expect(pkg.scripts['assets:upload']).toContain('publish-assets.mjs')
    expect(pkg.scripts['assets:publish']).toContain('publish-assets.mjs --yes')
    expect(pkg.scripts['build:weapp']).toContain('with-asset-env.mjs')
    expect(existsSync(resolve(root, 'scripts/with-asset-env.mjs'))).toBe(true)
    expect(existsSync(resolve(root, '一键上传.cmd'))).toBe(true)
    expect(existsSync(resolve(root, 'docs/features/cos-assets.md'))).toBe(true)
    expect(publishSource).toContain('--build')

    expect(publishSource).toContain('tarot/ui/sanctuary-background.jpg')
    expect(publishSource).toContain('tarot/ui/card-back.jpg')
    expect(publishSource).toContain('tarot/cards/the-fool.jpg')
    expect(publishSource).toContain('tarot/cards/the-world.jpg')
    expect(publishSource.match(/tarot\/(?:ui|cards)\/[\w-]+\.jpg/g)).toHaveLength(24)
  })
})
