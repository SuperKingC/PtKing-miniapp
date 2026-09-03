import { useCallback, useState } from 'react'
import Taro, { useShareAppMessage } from '@tarojs/taro'
import { View } from '@tarojs/components'
import { MiniappTarotFlow } from '../../features/tarot/MiniappTarotFlow'
import { useTabBarSelected } from '../../hooks/useTabBarSelected'
import './index.scss'

// 塔罗页：平移自 Pet10 的完整占卜流程（问题→牌阵→洗牌→切牌→扇形→翻牌→解读→历史）。
// 资产走 COS {根}/tarot/ 前缀（与 Pet10 同一资产约定）；解读阶段的分享标题由此页注册。
// 流程内的「退出」在小程序页面形态下回到测试中心 tab
export default function TarotPage() {
  useTabBarSelected(1)
  const [tarotShareTitle, setTarotShareTitle] = useState('')

  useShareAppMessage(() => {
    if (tarotShareTitle) {
      return { title: tarotShareTitle }
    }
    return { title: 'PtKing 塔罗圣殿 · 来抽一张今日指引' }
  })

  const handleShareTitleChange = useCallback((title: string) => {
    setTarotShareTitle(title)
  }, [])

  return (
    <View className="tarot-page">
      <MiniappTarotFlow
        onClose={() => Taro.switchTab({ url: '/pages/test/index' })}
        onShareTitleChange={handleShareTitleChange}
      />
    </View>
  )
}
