import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { miniappRoot } from './testPaths'

function repoRoot() {
  return resolve(miniappRoot(), '..')
}

// 与 scripts/publish-assets.mjs 的 TAROT_FILES 同构：22 majors × 2 皮肤 + 2 ui × 2 皮肤
function expectedTarotFiles(): string[] {
  const majors = [
    'the-fool', 'the-magician', 'high-priestess', 'the-empress', 'the-emperor', 'the-hierophant',
    'the-lovers', 'the-chariot', 'strength', 'the-hermit', 'wheel-of-fortune', 'justice',
    'the-hanged-man', 'death', 'temperance', 'the-devil', 'the-tower', 'the-star',
    'the-moon', 'the-sun', 'judgement', 'the-world',
  ]
  return [
    'tarot/ui/sanctuary-background.jpg',
    'tarot/ui/card-back.jpg',
    ...majors.flatMap((name) => [`tarot/cards/${name}.jpg`, `tarot/cards/${name}-clay.jpg`]),
    'tarot/ui/sanctuary-background-clay-v2.jpg',
    'tarot/ui/card-back-clay-v3.jpg',
  ]
}

describe('COS asset publish workflow', () => {
  it('ships check/upload/publish scripts and a 48-file tarot checklist (two skins)', () => {
    const root = repoRoot()
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8')) as { scripts: Record<string, string> }
    const publishSource = readFileSync(resolve(root, 'scripts/publish-assets.mjs'), 'utf8')

    expect(pkg.scripts.assets).toContain('publish-assets.mjs --yes --build')
    expect(pkg.scripts['assets:compress']).toContain('compress-art.mjs')
    expect(existsSync(resolve(root, 'scripts/compress-art.mjs'))).toBe(true)
    expect(pkg.scripts['assets:check']).toContain('publish-assets.mjs --check')
    expect(pkg.scripts['assets:upload']).toContain('publish-assets.mjs')
    expect(pkg.scripts['assets:publish']).toContain('publish-assets.mjs --yes')
    expect(pkg.scripts['assets:hot']).toContain('--live')
    expect(pkg.scripts['assets:channel']).toMatch(/--channel/)
    expect(existsSync(resolve(root, 'scripts/asset-pointer.mjs'))).toBe(true)
    expect(pkg.scripts['assets:registry']).toContain('publish-registry.mjs --yes')
    expect(pkg.scripts['assets:registry:probe']).toContain('--probe')
    expect(existsSync(resolve(root, 'scripts/publish-registry.mjs'))).toBe(true)
    expect(existsSync(resolve(miniappRoot(), 'content/hot-update-probe.json'))).toBe(true)
    expect(pkg.scripts['build:weapp']).toContain('with-asset-env.mjs')
    expect(existsSync(resolve(root, 'scripts/with-asset-env.mjs'))).toBe(true)
    const uploadCmd = readFileSync(resolve(root, '一键上传.cmd'), 'utf8')
    expect(existsSync(resolve(root, '一键上传.cmd'))).toBe(true)
    expect(uploadCmd).toContain('call npm run assets')
    expect(uploadCmd).toMatch(/^[\x00-\x7F]*$/)
    expect(existsSync(resolve(root, 'docs/features/cos-assets.md'))).toBe(true)
    expect(publishSource).toContain('--build')
    expect(publishSource).toContain('--live')
    expect(publishSource).toContain('--channel')
    expect(publishSource).toContain('resolveChannelName')
    expect(publishSource).toContain('readGitChannelHints')
    expect(publishSource).toContain('assets:hot')
    expect(publishSource).toContain('readAssetPointer')
    expect(publishSource).toContain('stampAssetRev')
    expect(publishSource).toContain('assetRev')
    expect(publishSource).toContain('tests/registry-v1.json')
    expect(publishSource).toContain('export-registry.mjs')
    const registryPublish = readFileSync(resolve(root, 'scripts/publish-registry.mjs'), 'utf8')
    expect(registryPublish).toContain('.asset-base-url')
    expect(registryPublish).toContain('tests/registry-v1.json')
    expect(registryPublish).toContain('max-age=60')
    expect(registryPublish).toContain('--probe')
    expect(registryPublish).toContain('hot-update-probe.json')

    // two skins: 24 classic files + 24 clay-suffixed files; cards are built
    // from a majors list, so lock the template + ui literals instead
    expect(expectedTarotFiles()).toHaveLength(48)
    expect(publishSource).toContain("'tarot/ui/sanctuary-background.jpg'")
    expect(publishSource).toContain("'tarot/ui/card-back.jpg'")
    expect(publishSource).toContain("'tarot/ui/sanctuary-background-clay-v2.jpg'")
    expect(publishSource).toContain("'tarot/ui/card-back-clay-v3.jpg'")
    expect(publishSource).toContain("'the-fool'")
    expect(publishSource).toContain("'the-world'")
    expect(publishSource).toContain('`tarot/cards/${name}.jpg`')
    expect(publishSource).toContain('`tarot/cards/${name}-clay.jpg`')
    expect(publishSource.match(/tarot\/(?:ui|cards)\/[\w-]+\.jpg/g)).toHaveLength(4)
  })
})
