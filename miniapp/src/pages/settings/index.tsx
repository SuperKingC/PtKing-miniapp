import { useState } from 'react'
import { Button, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { trackEvent } from '../../services/monitor'
import { clearTestRecords, loadTestRecords } from '../../services/testRecords'
import { clearTarotHistory, listTarotHistory } from '../../features/tarot/tarotHistory'
import './index.scss'

/** 与 miniapp/package.json 的 version 保持一致（无后端，版本号本地维护） */
export const APP_VERSION = '0.1.0'

// 设置页：关于/版本号、隐私与条款入口、本地数据管理（清空测试记录 / 塔罗历史，均二次确认）
export default function SettingsPage() {
  const [recordCount, setRecordCount] = useState(() => loadTestRecords().length)
  const [tarotCount, setTarotCount] = useState(() => listTarotHistory().length)

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

  return (
    <View className="settings-page">
      <View className="settings-page__section">
        <View className="settings-page__about">
          <Text className="settings-page__about-title">PtKing</Text>
          <Text className="settings-page__about-sub">测测你的隐藏人格 · 版本 {APP_VERSION}</Text>
        </View>
      </View>
      <View className="settings-page__section">
        <Button
          className="settings-page__entry"
          hoverClass="none"
          onClick={() => {
            wx.navigateTo({ url: '/pages/privacy/index' })
          }}
        >
          <Text>隐私政策与用户条款</Text>
          <Text className="settings-page__arrow">›</Text>
        </Button>
        <Button className="settings-page__entry" hoverClass="none" onClick={clearRecords}>
          <Text>清空测试记录{recordCount > 0 ? `（${recordCount} 条）` : ''}</Text>
          <Text className="settings-page__arrow">›</Text>
        </Button>
        <Button className="settings-page__entry" hoverClass="none" onClick={clearTarot}>
          <Text>清空塔罗历史{tarotCount > 0 ? `（${tarotCount} 条）` : ''}</Text>
          <Text className="settings-page__arrow">›</Text>
        </Button>
      </View>
      <Text className="settings-page__foot">测试记录与塔罗历史仅保存在本机，清空后无法恢复。</Text>
    </View>
  )
}
