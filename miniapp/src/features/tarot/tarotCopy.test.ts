import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const USER_FACING = [
  'MiniappTarotFlow.tsx',
  'MiniappTarotHistoryPanel.tsx',
  'tarotSpreads.ts',
  'tarotReading.ts',
]

describe('塔罗文案合规', () => {
  it('用户可见文案不含占卜、算命、改运', () => {
    for (const file of USER_FACING) {
      const source = readFileSync(resolve(__dirname, file), 'utf8')
      expect(source, file).not.toMatch(/占卜|算命|改运/)
    }
  })
})
