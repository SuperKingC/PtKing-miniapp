import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { miniappRoot } from './testPaths'

// M4 分享契约：分享入口三处齐备——全局开启菜单、报告页结果标题、塔罗页解读标题
describe('share capability wiring', () => {
  it('opens the share menu once at app launch', () => {
    const app = readFileSync(resolve(miniappRoot(), 'src/app.tsx'), 'utf8')
    const service = readFileSync(resolve(miniappRoot(), 'src/services/shareMenu.ts'), 'utf8')

    expect(app).toContain('showShareMenu()')
    expect(app).toMatch(/useEffect\(\(\) => \{\s*showShareMenu\(\)/)
    expect(service).toContain('showShareMenu?:')
  })

  it('registers result-flavored share titles on the report page', () => {
    const report = readFileSync(resolve(miniappRoot(), 'src/pages/test-report/index.tsx'), 'utf8')

    expect(report).toContain('useShareAppMessage')
    expect(report).toContain('你也来试试')
  })

  it('keeps the tarot page share title wiring from Pet10', () => {
    const tarotPage = readFileSync(resolve(miniappRoot(), 'src/pages/tarot/index.tsx'), 'utf8')

    expect(tarotPage).toContain('useShareAppMessage')
    expect(tarotPage).toContain('tarotShareTitle')
  })
})
