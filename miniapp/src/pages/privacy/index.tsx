import { Text, View } from '@tarojs/components'
import { useAppTheme } from '../../hooks/useAppTheme'

interface PolicySection {
  heading: string
  paragraphs: string[]
}

const SECTIONS: PolicySection[] = [
  {
    heading: '一、我们如何处理你的信息',
    paragraphs: [
      '本小程序不提供注册登录，不需要你填写姓名、手机号等个人信息。',
      '你的测试记录、答题草稿、塔罗历史，以及主题、震动等偏好，仅保存在你自己的设备（微信本地存储）中，不会上传到我们的服务器；卸载小程序或删除小程序数据后，这些数据随之删除。',
      '可在记录页删除单条测试记录，或在「我的 → 清空测试记录」中清空测试报告；此操作不等于清除塔罗历史、草稿和偏好。清除全部本地数据可使用微信的小程序数据管理功能。',
      '点击微信客服后，你主动发送的内容由微信客服系统处理。',
      '为展示测试与塔罗内容，我们会从对象存储拉取公开的题库、文案和图片资源；该过程不上传你的个人信息。',
      '为排查异常和改善流程，我们使用微信实时日志记录页面路径、测试标识、题目序号和流程事件，不记录姓名、联系方式或选项原文。日志由微信平台按其规则处理。',
    ],
  },
  {
    heading: '二、第三方服务',
    paragraphs: [
      '转发分享、客服消息等基础能力由微信平台提供，相关信息的处理遵循《微信隐私保护指引》。',
      '观看激励视频广告时，广告由微信广告提供并展示；微信广告会按照其隐私政策处理必要的设备信息，用于广告展示与计费，具体以微信官方说明为准。',
    ],
  },
  {
    heading: '三、未成年人保护',
    paragraphs: [
      '本产品为测试娱乐向内容；未成年人请在监护人的陪同与同意下使用。',
    ],
  },
  {
    heading: '四、用户条款',
    paragraphs: [
      '测测子提供的测试和塔罗解读均为娱乐化自我观察，不构成医疗建议、心理诊断、能力评估或专业咨询；如有相关需要，请咨询专业人士。',
      '请勿利用客服通道发布违法、侵权或骚扰内容。',
      '我们可能随产品迭代更新本页面内容，更新后将在页面内展示最新版本与日期。',
    ],
  },
  {
    heading: '五、联系我们',
    paragraphs: [
      '如对本页面内容有疑问，可通过「我的 → 问题反馈」与我们联系。',
    ],
  },
]

// 隐私政策与用户条款页：纯静态文案（微信审核要求的合规页面，入口在「我的」页）
export default function PrivacyPage() {
  const theme = useAppTheme()
  return (
    <View className={`privacy-page theme-${theme}`}>
      <View className="privacy-page__header">
        <Text className="privacy-page__title">隐私政策与用户条款</Text>
        <Text className="privacy-page__updated">更新日期：2026-09-08</Text>
      </View>
      {SECTIONS.map((section) => (
        <View key={section.heading} className="privacy-page__section">
          <Text className="privacy-page__heading">{section.heading}</Text>
          {section.paragraphs.map((paragraph) => (
            <Text key={paragraph.slice(0, 12)} className="privacy-page__paragraph">{paragraph}</Text>
          ))}
        </View>
      ))}
    </View>
  )
}
