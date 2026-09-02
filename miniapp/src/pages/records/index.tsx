import { Text, View } from '@tarojs/components'
import './index.scss'

// M0 骨架空态页：M2 接测试记录（服务端存储，关联 openid 跨设备同步）
export default function RecordsPage() {
  return (
    <View className="records-page">
      <Text className="records-page__empty">还没有测试记录，去「测试」页看看吧。</Text>
    </View>
  )
}
