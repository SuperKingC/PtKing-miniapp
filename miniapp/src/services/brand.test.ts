import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { miniappRoot } from '../config/testPaths'
import {
  APP_DISPLAY_NAME,
  APP_ENTERTAINMENT_DISCLAIMER,
  APP_SHARE_TITLE,
  APP_TAROT_SHARE_TITLE,
} from './brand'

describe('visible brand', () => {
  it('uses 测测子 as the public name', () => {
    expect(APP_DISPLAY_NAME).toBe('测测子')
    expect(APP_SHARE_TITLE).toContain('测测子')
    expect(APP_TAROT_SHARE_TITLE).toContain('测测子')
    expect(APP_ENTERTAINMENT_DISCLAIMER).toContain('娱乐化自我观察')
    expect(APP_ENTERTAINMENT_DISCLAIMER).toContain('不是心理诊断')
  })

  it('keeps user-facing surfaces on the display name and leaves storage keys alone', () => {
    const files = [
      'src/app.config.ts',
      'src/pages/test/index.tsx',
      'src/pages/me/index.tsx',
      'src/pages/test-report/index.tsx',
      'src/pages/tarot/index.tsx',
      'src/pages/privacy/index.tsx',
      'src/services/reportShareCard.ts',
    ]
    const joined = files.map((file) => readFileSync(resolve(miniappRoot(), file), 'utf8')).join('\n')
    expect(joined).toContain('测测子')
    expect(joined).not.toMatch(/PtKing/)
    expect(joined).not.toContain('我的 → 设置')
    expect(joined).not.toContain('联系作者')

    const drafts = readFileSync(resolve(miniappRoot(), 'src/services/testDrafts.ts'), 'utf8')
    const records = readFileSync(resolve(miniappRoot(), 'src/services/testRecords.ts'), 'utf8')
    expect(drafts).toContain('ptking_test_draft:')
    expect(records).toContain('ptking_test_records')
  })
})
