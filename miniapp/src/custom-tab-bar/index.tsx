import { Component } from 'react'
import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import testIcon from '../assets/tabbar/test-v2.png'
import testActiveIcon from '../assets/tabbar/test-active-v2.png'
import tarotIcon from '../assets/tabbar/tarot-v2.png'
import tarotActiveIcon from '../assets/tabbar/tarot-active-v2.png'
import recordsIcon from '../assets/tabbar/records-v2.png'
import recordsActiveIcon from '../assets/tabbar/records-active-v2.png'
import meIcon from '../assets/tabbar/me-v2.png'
import meActiveIcon from '../assets/tabbar/me-active-v2.png'
import './index.scss'

// 自定义 tabBar：图标+文字整体垂直居中（原生 tabBar 布局不可调）；毛玻璃底+暖色选中态。
// 选中态由各 tab 页在 onShow 时经 getTabBar().setState 同步（见 hooks/useTabBarSelected）
const TABS = [
  { text: '测试', icon: testIcon, activeIcon: testActiveIcon, path: '/pages/test/index' },
  { text: '塔罗', icon: tarotIcon, activeIcon: tarotActiveIcon, path: '/pages/tarot/index' },
  { text: '记录', icon: recordsIcon, activeIcon: recordsActiveIcon, path: '/pages/records/index' },
  { text: '我的', icon: meIcon, activeIcon: meActiveIcon, path: '/pages/me/index' },
]

export default class CustomTabBar extends Component {
  state = { selected: 0 }

  handleSwitch = (index: number) => {
    Taro.switchTab({ url: TABS[index].path })
  }

  render() {
    const { selected } = this.state
    return (
      <View className="tabbar">
        {TABS.map((tab, index) => (
          <View
            key={tab.path}
            className="tabbar__item"
            hoverClass="none"
            onClick={() => this.handleSwitch(index)}
          >
            <Image
              className="tabbar__icon"
              src={selected === index ? tab.activeIcon : tab.icon}
              mode="aspectFit"
            />
            <Text className={selected === index ? 'tabbar__text tabbar__text--active' : 'tabbar__text'}>
              {tab.text}
            </Text>
          </View>
        ))}
      </View>
    )
  }
}
