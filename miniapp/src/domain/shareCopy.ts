import type { TestDefinition } from './testEngine'

export function shareHookByCategory(category: TestDefinition['category']): string {
  if (category === '情感') return '看看关系里的相处方式'
  if (category === '职场') return '给忙碌的自己一个对照'
  if (category === '趣味') return '轻松看看，不必对号入座'
  return '这是一次自我观察，不是定论'
}

export function buildReportShareTitle(
  category: TestDefinition['category'],
  testTitle: string,
  resultTitle: string,
  timeline = false,
): string {
  if (category === '情感') {
    return timeline
      ? `我在${testTitle}里看到「${resultTitle}」这一面`
      : `我在${testTitle}里看到「${resultTitle}」这一面，要不要一起看看`
  }
  if (category === '职场') {
    return timeline
      ? `我在${testTitle}里更接近「${resultTitle}」`
      : `下班后我测了${testTitle}，更接近「${resultTitle}」`
  }
  if (category === '趣味') {
    return timeline
      ? `我在${testTitle}里是「${resultTitle}」`
      : `我在${testTitle}里是「${resultTitle}」，来玩一把`
  }
  return timeline
    ? `我在${testTitle}里更接近「${resultTitle}」`
    : `我在${testTitle}里更接近「${resultTitle}」，你也来看看`
}

export function shareCardDisclaimer(): string {
  return '娱乐向自我观察，不是诊断'
}
