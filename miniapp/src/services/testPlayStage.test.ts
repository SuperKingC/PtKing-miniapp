import { describe, expect, it } from 'vitest'
import { getTestPlayStage } from './testPlayStage'

describe('getTestPlayStage', () => {
  it('给初始阶段轻量提示', () => {
    expect(getTestPlayStage(0, 20)).toBe('刚开始，跟着第一反应选')
  })
  it('过半后鼓励继续', () => {
    expect(getTestPlayStage(10, 20)).toBe('快过半了，继续按第一反应选')
  })
  it('最后三题提示保持直觉', () => {
    expect(getTestPlayStage(17, 20)).toBe('最后几题，保持直觉')
  })
})
