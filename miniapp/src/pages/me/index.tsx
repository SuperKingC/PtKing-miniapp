import { Text, View } from '@tarojs/components'
import './index.scss'

const ENTRIES = ['已做测试', '塔罗历史', '联系作者', '问题反馈'] as const

// M0 骨架静态页：M2 起接入账号信息与历史跳转
export default function MePage() {
  return (
    <View className="me-page">
      <View className="me-page__entries">
        {ENTRIES.map((label) => (
          <View key={label} className="me-page__entry">
            <Text>{label}</Text>
            <Text className="me-page__arrow">›</Text>
          </View>
        ))}
      </View>
    </View>
  )
}
