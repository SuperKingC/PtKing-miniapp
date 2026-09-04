import { Button, Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { useTabBarSelected } from '../../hooks/useTabBarSelected'
import { TAROT_HISTORY_OPEN_EVENT } from '../../features/tarot/tarotHistory'
import meBannerImg from '../../assets/illus/me-banner.png'
import './index.scss'

// 我的页「塔罗历史」：切到塔罗 tab 并广播打开历史面板（tab 页常驻，面板状态保留）
const openTarotHistory = () => {
  Taro.eventCenter.trigger(TAROT_HISTORY_OPEN_EVENT)
  wx.switchTab({ url: '/pages/tarot/index' })
}

interface MeEntry {
  label: string
  onTap?: () => void
  /** 微信客服会话（openType=contact，需小程序后台配置客服人员） */
  contact?: boolean
}

const ENTRIES: MeEntry[] = [
  { label: '已做测试', onTap: () => { wx.switchTab({ url: '/pages/records/index' }) } },
  { label: '塔罗历史', onTap: openTarotHistory },
  { label: '联系作者', contact: true },
  { label: '问题反馈', contact: true },
]

// 我的页：已做测试通记录页、塔罗历史通塔罗流程历史面板、联系作者/问题反馈走微信客服会话
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
          <Button
            key={entry.label}
            className="me-page__entry"
            hoverClass="none"
            openType={entry.contact ? 'contact' : undefined}
            onClick={entry.onTap}
          >
            <Text>{entry.label}</Text>
            <Text className="me-page__arrow">›</Text>
          </Button>
        ))}
      </View>
    </View>
  )
}
