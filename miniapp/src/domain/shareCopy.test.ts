import { describe, expect, it } from 'vitest'
import { buildReportShareTitle, shareCardDisclaimer, shareHookByCategory } from './shareCopy'

describe('分享文案', () => {
  it('按分类区分语气且不带分数', () => {
    expect(buildReportShareTitle('人格', 'MBTI 人格测试', '建筑师')).toContain('更接近')
    expect(buildReportShareTitle('趣味', '发疯指数测试', '已疯但可爱')).toContain('来玩一把')
    expect(shareHookByCategory('情感')).toContain('关系')
    expect(shareCardDisclaimer()).toContain('不是诊断')
    expect(buildReportShareTitle('职场', '倦怠', '还撑得住', true)).not.toMatch(/\d+分/)
  })
})
