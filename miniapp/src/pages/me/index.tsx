import { useState } from 'react'
import { Button, Image, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useTabBarSelected } from '../../hooks/useTabBarSelected'
import { trackEvent } from '../../services/monitor'
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

// 我的页：数据管理直出（清空测试记录，二次确认）+ 隐私条款 + 问题反馈。
// 原独立设置页已并入本页（版本号在 banner 下）
export default function MePage() {
  useTabBarSelected(3)
  const [recordCount, setRecordCount] = useState(() => loadTestRecords().length)

  // tab 页常驻：每次回到本页刷新计数（刚测完/刚清空后回来数字要准）
  useDidShow(() => {
    setRecordCount(loadTestRecords().length)
  })

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
    { label: '问题反馈', contact: true },
  ]

  return (
    <View className="me-page">
      <View className="me-page__banner">
        <Image className="me-page__banner-img" src={meBannerImg} mode="aspectFit" />
        <View className="me-page__banner-text">
          <Text className="me-page__banner-title">PtKing</Text>
          <Text className="me-page__banner-sub">测测你的隐藏人格</Text>
          <Text className="me-page__banner-version">版本 {APP_VERSION}</Text>
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
      <Text className="me-page__foot">测试记录仅保存在本机，清空后无法恢复。</Text>
    </View>
  )
}
