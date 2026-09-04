interface PolicySection {
  heading: string
  paragraphs: string[]
}

const SECTIONS: PolicySection[] = [
  {
    heading: '一、我们如何处理你的信息',
    paragraphs: [
      '本小程序不提供注册登录，不需要你填写姓名、手机号等个人信息。',
      '你的测试记录、塔罗历史等数据仅保存在你自己的设备（微信本地存储）中，不会上传到我们的服务器；卸载小程序或删除小程序数据后，这些数据随之删除。',
      '当你要删除数据时，可在「我的 → 设置」中一键清空全部本地记录。',
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
      '本小程序提供的人格测试、塔罗解读均为娱乐向内容，不构成医疗建议、心理诊断或专业咨询；如有相关需要，请咨询专业人士。',
      '请勿利用客服通道发布违法、侵权或骚扰内容。',
      '我们可能随产品迭代更新本页面内容，更新后将在页面内展示最新版本与日期。',
    ],
  },
  {
    heading: '五、联系我们',
    paragraphs: [
      '如对本页面内容有疑问，可通过「我的 → 联系作者」与我们联系。',
    ],
  },
]

// 隐私政策与用户条款页：纯静态文案（微信审核要求的合规页面，入口在「我的 → 设置」）
export default function PrivacyPage() {
  return (
    <View className="privacy-page">
      <Text className="privacy-page__title">隐私政策与用户条款</Text>
      <Text className="privacy-page__updated">更新日期：2026-09-04</Text>
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
