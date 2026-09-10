import { useState } from 'react'
import { Button, Image, ScrollView, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useShareAppMessage } from '@tarojs/taro'
import { useTabBarSelected } from '../../hooks/useTabBarSelected'
import { useAppTheme } from '../../hooks/useAppTheme'
import { topInsetStyle } from '../../services/navMetrics'
import { trackEvent } from '../../services/monitor'
import { isHapticsEnabled, setHapticsEnabled } from '../../services/haptics'
import {
  THEME_CHANGE_EVENT,
  getThemePreference,
  setThemePreference,
  type ThemePreference,
} from '../../services/theme'
import { APP_SHARE_TITLE } from '../../services/brand'
import { clearTestRecords, loadTestRecords } from '../../services/testRecords'
import meBannerImg from '../../assets/illus/me-banner-transparent-v2.png'
import iconClear from '../../assets/illus/icon-me-clear-v4.png'
import iconPrivacy from '../../assets/illus/icon-me-privacy-v4.png'
import iconShare from '../../assets/illus/icon-me-share-v4.png'
import iconFeedback from '../../assets/illus/icon-me-feedback-v4.png'
import iconTheme from '../../assets/illus/icon-me-theme-v4.png'
import iconHaptics from '../../assets/illus/icon-me-haptics-v4.png'
import './index.scss'

/** 与 miniapp/package.json 的 version 保持一致（无后端，版本号本地维护） */
export const APP_VERSION = '0.1.0'

interface MeEntry {
  id: string
  label: string
  icon: string
  onTap?: () => void
  /** 微信客服会话（openType=contact，需小程序后台配置客服人员） */
  contact?: boolean
}

function SlimSwitch({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (on: boolean) => void
}) {
  return (
    <View
      className={`me-page__switch${checked ? ' me-page__switch--on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <View className="me-page__switch-knob" />
    </View>
  )
}

// 我的页：数据管理直出（清空测试记录，二次确认）+ 主题/震动开关 + 隐私条款 + 分享 + 问题反馈。
export default function MePage() {
  useTabBarSelected(3)
  const theme = useAppTheme()
  const [recordCount, setRecordCount] = useState(() => loadTestRecords().length)
  const [themePref, setThemePref] = useState(() => getThemePreference())
  const [haptics, setHaptics] = useState(() => isHapticsEnabled())

  // tab 页常驻：每次回到本页刷新计数（刚测完/刚清空后回来数字要准）
  useDidShow(() => {
    setRecordCount(loadTestRecords().length)
  })

  // 转发小程序（openType=share 之外的手动兜底入口），标题与首页一致
  useShareAppMessage(() => ({ title: APP_SHARE_TITLE }))

  const changeTheme = (pref: ThemePreference) => {
    setThemePref(pref)
    setThemePreference(pref)
    trackEvent('theme_change', { pref })
    // 广播给所有已挂载页面与 tabBar（tab 页常驻，eventCenter 是唯一可靠通知路径）
    Taro.eventCenter.trigger(THEME_CHANGE_EVENT)
  }

  const changeHaptics = (enabled: boolean) => {
    if (setHapticsEnabled(enabled)) setHaptics(enabled)
    else void Taro.showToast({ title: '设置未保存，请重试', icon: 'none' })
  }

  const clearRecords = () => {
    if (recordCount === 0) {
      Taro.showToast({ title: '还没有测试记录', icon: 'none' })
      return
    }
    Taro.showModal({
      title: '清空测试记录',
      content: `将删除全部 ${recordCount} 条测试报告记录，无法恢复。`,
      confirmText: '清空',
      cancelText: '取消',
      confirmColor: '#c05f35',
      success: (res) => {
        if (!res.confirm) return
        clearTestRecords()
        setRecordCount(0)
        trackEvent('settings_clear_records')
        Taro.showToast({ title: '已清空', icon: 'success' })
      },
    })
  }

  const ENTRIES: MeEntry[] = [
    { id: 'clear', label: `清空测试记录${recordCount > 0 ? `（${recordCount} 条）` : ''}`, icon: iconClear, onTap: clearRecords },
    { id: 'privacy', label: '隐私政策与用户条款', icon: iconPrivacy, onTap: () => { wx.navigateTo({ url: '/pages/privacy/index' }) } },
    { id: 'share', label: '分享给好友', icon: iconShare, contact: false },
    { id: 'feedback', label: '问题反馈', icon: iconFeedback, contact: true },
  ]

  return (
    <View className={`tab-page theme-${theme}`} style={topInsetStyle()}>
    <ScrollView
      className="tab-page__scroll"
      scrollY
      showScrollbar={false}
    >
      <View className="me-page">
      <View className="me-page__banner">
        <View className="me-page__banner-clip">
          <Image className="me-page__banner-img" src={meBannerImg} mode="widthFix" />
        </View>
      </View>
      <View className="me-page__entries">
        <View className="me-page__entries-clip">
        {ENTRIES.map((entry) =>
          entry.id === 'share' ? (
            <Button
              key={entry.id}
              className="me-page__entry"
              hoverClass="pressable--pressed"
              openType="share"
            >
              <Image className="me-page__icon" src={entry.icon} mode="aspectFit" />
              <Text className="me-page__entry-label">{entry.label}</Text>
              <Text className="me-page__arrow">›</Text>
            </Button>
          ) : (
            <Button
              key={entry.id}
              className="me-page__entry"
              hoverClass="pressable--pressed"
              openType={entry.contact ? 'contact' : undefined}
              onClick={entry.onTap}
            >
              <Image className="me-page__icon" src={entry.icon} mode="aspectFit" />
              <Text className="me-page__entry-label">{entry.label}</Text>
              <Text className="me-page__arrow">›</Text>
            </Button>
          ),
        )}
        </View>
      </View>
      <View className="me-page__prefs">
        <View className="me-page__prefs-clip">
        <View className="me-page__switch-row">
          <Image className="me-page__icon" src={iconTheme} mode="aspectFit" />
          <Text className="me-page__switch-label">深色模式</Text>
          <SlimSwitch
            checked={themePref === 'dark'}
            onChange={(on) => changeTheme(on ? 'dark' : 'light')}
          />
        </View>
        <View className="me-page__switch-row">
          <Image className="me-page__icon" src={iconHaptics} mode="aspectFit" />
          <Text className="me-page__switch-label">震动反馈</Text>
          <SlimSwitch
            checked={haptics}
            onChange={changeHaptics}
          />
        </View>
        </View>
      </View>
      <View className="me-page__foot">
        <Text className="me-page__foot-version">版本 {APP_VERSION}</Text>
      </View>
      </View>
    </ScrollView>
    </View>
  )
}
