import { Image, Text, View } from '@tarojs/components'
import { useTabBarSelected } from '../../hooks/useTabBarSelected'
import meBannerImg from '../../assets/illus/me-banner.png'
import './index.scss'

const ENTRIES: Array<{ label: string; onTap?: () => void }> = [
  { label: '已做测试', onTap: () => { wx.switchTab({ url: '/pages/records/index' }) } },
  { label: '塔罗历史' },
  { label: '联系作者' },
  { label: '问题反馈' },
]

// 我的页（M1）：已做测试入口通记录页；其余条目 M2 起接账号信息与历史跳转
export default function MePage() {
  useTabBarSelected(3)
  return (
    <View className="me-page">
      <View className="me-page__banner">
        <Image className="me-page__banner-img" src={meBannerImg} mode="aspectFit" />
        <View className="me-page__banner-text">
          <Text className="me-page__banner-title">PtKing</Text>
          <Text className="me-page__banner-sub">测测你的隐藏人格</Text>
        </View>
      </View>
      <View className="me-page__entries">
        {ENTRIES.map((entry) => (
          <View
            key={entry.label}
            className="me-page__entry"
            hoverClass="none"
            onClick={() => entry.onTap?.()}
          >
            <Text>{entry.label}</Text>
            <Text className="me-page__arrow">›</Text>
          </View>
        ))}
      </View>
    </View>
  )
}
