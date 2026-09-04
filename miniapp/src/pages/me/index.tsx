import { useState } from 'react'
import { Button, Image, Text, View } from '@tarojs/components'
import Taro, { useDidShow, useShareAppMessage } from '@tarojs/taro'
import { useTabBarSelected } from '../../hooks/useTabBarSelected'
import { useAppTheme } from '../../hooks/useAppTheme'
import { trackEvent } from '../../services/monitor'
import {
  THEME_CHANGE_EVENT,
  THEME_PREFERENCE_LABELS,
  THEME_PREFERENCE_ORDER,
  getThemePreference,
  setThemePreference,
  type ThemePreference,
} from '../../services/theme'
import { clearTestRecords, loadTestRecords } from '../../services/testRecords'
import meBannerImg from '../../assets/illus/me-banner.png'
import './index.scss'

/** 与 miniapp/package.json 的 version 保持一致（无后端，版本号本地维护） */
export const APP_VERSION = '0.1.0'

interface MeEntry {
  label: string
  onTap?: () => void
  /** 微信客服会话（openType=contact，需小程序后台配置客服人员） */
  contact?: boolean
}

// 我的页：数据管理直出（清空测试记录，二次确认）+ 主题切换 + 隐私条款 + 分享 + 问题反馈。
// 原独立设置页已并入本页（版本号在 banner 下）
export default function MePage() {
  useTabBarSelected(3)
  const theme = useAppTheme()
  const [recordCount, setRecordCount] = useState(() => loadTestRecords().length)
  const [themePref, setThemePref] = useState(() => getThemePreference())

  // tab 页常驻：每次回到本页刷新计数（刚测完/刚清空后回来数字要准）
  useDidShow(() => {
    setRecordCount(loadTestRecords().length)
  })

  // 转发小程序（openType=share 之外的手动兜底入口），标题与首页一致
  useShareAppMessage(() => ({ title: 'PtKing · 测测你的隐藏人格' }))

  const changeTheme = (pref: ThemePreference) => {
    setThemePref(pref)
    setThemePreference(pref)
    trackEvent('theme_change', { pref })
    // 广播给所有已挂载页面与 tabBar（tab 页常驻，eventCenter 是唯一可靠通知路径）
    Taro.eventCenter.trigger(THEME_CHANGE_EVENT)
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
    { label: '已做测试', onTap: () => { wx.switchTab({ url: '/pages/records/index' }) } },
    { label: `清空测试记录${recordCount > 0 ? `（${recordCount} 条）` : ''}`, onTap: clearRecords },
    { label: '隐私政策与用户条款', onTap: () => { wx.navigateTo({ url: '/pages/privacy/index' }) } },
    { label: '分享给好友', contact: false },
    { label: '问题反馈', contact: true },
  ]

  return (
    <View className={`me-page theme-${theme}`}>
      <View className="me-page__banner">
        <Image className="me-page__banner-img" src={meBannerImg} mode="aspectFit" />
        <View className="me-page__banner-text">
          <Text className="me-page__banner-title">PtKing</Text>
          <Text className="me-page__banner-sub">测测你的隐藏人格</Text>
          <Text className="me-page__banner-version">版本 {APP_VERSION}</Text>
        </View>
      </View>
      <View className="me-page__entries">
        {ENTRIES.map((entry) =>
          entry.label === '分享给好友' ? (
            <Button
              key={entry.label}
              className="me-page__entry"
              hoverClass="none"
              openType="share"
            >
              <Text>{entry.label}</Text>
              <Text className="me-page__arrow">›</Text>
            </Button>
          ) : (
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
          ),
        )}
      </View>
      <View className="me-page__theme">
        <Text className="me-page__theme-title">主题</Text>
        <View className="me-page__theme-options">
          {THEME_PREFERENCE_ORDER.map((pref) => (
            <View
              key={pref}
              className={
                themePref === pref
                  ? 'me-page__theme-option me-page__theme-option--active'
                  : 'me-page__theme-option'
              }
              hoverClass="none"
              onClick={() => changeTheme(pref)}
            >
              <Text>{THEME_PREFERENCE_LABELS[pref]}</Text>
            </View>
          ))}
        </View>
      </View>
      <Text className="me-page__foot">测试记录仅保存在本机，清空后无法恢复。</Text>
    </View>
  )
}
