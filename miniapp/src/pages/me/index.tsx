import { useState } from 'react'
import { Button, Image, Text, View } from '@tarojs/components'
import Taro, { useDidShow } from '@tarojs/taro'
import { useTabBarSelected } from '../../hooks/useTabBarSelected'
import { trackEvent } from '../../services/monitor'
import { clearTestRecords, loadTestRecords } from '../../services/testRecords'
import { clearTarotHistory, listTarotHistory } from '../../features/tarot/tarotHistory'
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

// 我的页：数据管理直出（清空测试记录/塔罗历史，二次确认）+ 隐私条款 + 问题反馈。
// 原独立设置页已并入本页（版本号在 banner 下），塔罗历史入口留在塔罗页内
export default function MePage() {
  useTabBarSelected(3)
  const [recordCount, setRecordCount] = useState(() => loadTestRecords().length)
  const [tarotCount, setTarotCount] = useState(() => listTarotHistory().length)

  // tab 页常驻：每次回到本页刷新计数（刚测完/刚清空后回来数字要准）
  useDidShow(() => {
    setRecordCount(loadTestRecords().length)
    setTarotCount(listTarotHistory().length)
  })

  const confirmClear = (title: string, content: string, onConfirm: () => void) => {
    Taro.showModal({
      title,
      content,
      confirmText: '清空',
      cancelText: '取消',
      confirmColor: '#c05f35',
      success: (res) => {
        if (!res.confirm) return
        onConfirm()
        Taro.showToast({ title: '已清空', icon: 'success' })
      },
    })
  }

  const clearRecords = () => {
    if (recordCount === 0) {
      Taro.showToast({ title: '还没有测试记录', icon: 'none' })
      return
    }
    confirmClear('清空测试记录', `将删除全部 ${recordCount} 条测试报告记录，无法恢复。`, () => {
      clearTestRecords()
      setRecordCount(0)
      trackEvent('settings_clear_records')
    })
  }

  const clearTarot = () => {
    if (tarotCount === 0) {
      Taro.showToast({ title: '还没有塔罗历史', icon: 'none' })
      return
    }
    confirmClear('清空塔罗历史', `将删除全部 ${tarotCount} 条塔罗解读历史，无法恢复。`, () => {
      clearTarotHistory()
      setTarotCount(0)
    })
  }

  const ENTRIES: MeEntry[] = [
    { label: '已做测试', onTap: () => { wx.switchTab({ url: '/pages/records/index' }) } },
    { label: `清空测试记录${recordCount > 0 ? `（${recordCount} 条）` : ''}`, onTap: clearRecords },
    { label: `清空塔罗历史${tarotCount > 0 ? `（${tarotCount} 条）` : ''}`, onTap: clearTarot },
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
      <Text className="me-page__foot">测试记录与塔罗历史仅保存在本机，清空后无法恢复。</Text>
    </View>
  )
}
