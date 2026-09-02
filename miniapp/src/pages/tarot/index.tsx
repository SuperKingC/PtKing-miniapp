import { Text, View } from '@tarojs/components'
import './index.scss'

// M0 骨架占位页：塔罗全流程（洗牌/切牌/牌阵/解读/历史）在 M3 从 Pet10 平移，
// 资产走 COS {根}/tarot/ 子路径，本页届时替换为流程挂载容器
export default function TarotPage() {
  return (
    <View className="tarot-page">
      <View className="tarot-page__panel">
        <Text className="tarot-page__title">塔罗圣殿</Text>
        <Text className="tarot-page__desc">洗牌仪式准备中，静候开启。</Text>
      </View>
    </View>
  )
}
