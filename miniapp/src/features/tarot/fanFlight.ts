import type { CSSProperties } from 'react'
import type { TarotSkin } from './tarotSkin'

/** 五牌阵已选槽：上三下二。数值与 MiniappTarotFlow.scss 的 picked-row--5 对齐。 */
export const FIVE_PICK_SLOT = {
  classic: { width: 152, height: 238, gap: 28 },
  clay: { width: 136, height: 212, gap: 20 },
} as const

const SINGLE_ROW_STEP = 158

export function getFanFlightVars(
  needCount: number,
  slotIndex: number,
  skin: TarotSkin,
): CSSProperties {
  if (needCount !== 5) {
    return {
      '--fly-x': `${(slotIndex - (needCount - 1) / 2) * SINGLE_ROW_STEP}rpx`,
    } as CSSProperties
  }

  const { width, height, gap } = FIVE_PICK_SLOT[skin]
  const step = width + gap
  const flyX = slotIndex < 3
    ? (slotIndex - 1) * step
    : (slotIndex === 3 ? -step / 2 : step / 2)

  const pickedHeight = height * 2 + gap
  const slotTop = slotIndex < 3 ? 0 : height + gap
  const fanHeight = skin === 'clay' ? 270 : 360
  const fanCardHeight = 158
  const fanCardBottom = skin === 'clay' ? 32 : 20
  const fanMarginTop = skin === 'clay' ? 0 : -12
  const flyY = -(pickedHeight - slotTop + fanMarginTop + (fanHeight - fanCardBottom - fanCardHeight))

  return {
    '--fly-x': `${flyX}rpx`,
    '--fly-y': `${flyY}rpx`,
    '--fly-y-mid': `${Math.round(flyY * 0.77)}rpx`,
  } as CSSProperties
}
