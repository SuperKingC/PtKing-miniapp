import { describe, expect, it } from 'vitest'
import { FIVE_PICK_SLOT, getFanFlightVars } from './fanFlight'

function readFlight(needCount: number, slotIndex: number, skin: 'clay' | 'classic') {
  return getFanFlightVars(needCount, slotIndex, skin) as Record<string, string>
}

function readFlyY(needCount: number, slotIndex: number, skin: 'clay' | 'classic') {
  return Number(readFlight(needCount, slotIndex, skin)['--fly-y'].replace('rpx', ''))
}

describe('fan flight offsets', () => {
  it('keeps single-row flight x for one- and three-card spreads', () => {
    expect(readFlight(1, 0, 'classic')['--fly-x']).toBe('0rpx')
    expect(readFlight(3, 0, 'classic')['--fly-x']).toBe('-158rpx')
    expect(readFlight(3, 1, 'classic')['--fly-x']).toBe('0rpx')
    expect(readFlight(3, 2, 'classic')['--fly-x']).toBe('158rpx')
    expect(readFlight(3, 0, 'classic')['--fly-y']).toBeUndefined()
  })

  it('places five-card slots as three on top and two centered below', () => {
    const step = FIVE_PICK_SLOT.classic.width + FIVE_PICK_SLOT.classic.gap
    const classic = [0, 1, 2, 3, 4].map((slot) => readFlight(5, slot, 'classic'))

    expect(classic.map((item) => item['--fly-x'])).toEqual([
      `${-step}rpx`,
      '0rpx',
      `${step}rpx`,
      `${-step / 2}rpx`,
      `${step / 2}rpx`,
    ])

    const topY = readFlyY(5, 0, 'classic')
    const bottomY = readFlyY(5, 3, 'classic')
    expect(topY).toBeLessThan(bottomY)
    expect(bottomY - topY).toBe(FIVE_PICK_SLOT.classic.height + FIVE_PICK_SLOT.classic.gap)
  })

  it('shortens clay five-card lift so the card still lands in the slot', () => {
    expect(FIVE_PICK_SLOT.clay).toEqual({ width: 136, height: 212, gap: 20 })
    const clayStep = FIVE_PICK_SLOT.clay.width + FIVE_PICK_SLOT.clay.gap
    expect(readFlight(5, 0, 'clay')['--fly-x']).toBe(`${-clayStep}rpx`)
    expect(Math.abs(readFlyY(5, 0, 'clay'))).toBeLessThan(Math.abs(readFlyY(5, 0, 'classic')))
  })
})
