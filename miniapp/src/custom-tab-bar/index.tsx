import { Component } from 'react'
import { Image, Text, View } from '@tarojs/components'
import Taro from '@tarojs/taro'
import {
  THEME_CHANGE_EVENT,
  currentSystemTheme,
  getThemePreference,
  resolveTheme,
  type ResolvedTheme,
} from '../services/theme'
import testIcon from '../assets/tabbar/test-v2.png'
import testActiveIcon from '../assets/tabbar/test-active-v2.png'
import tarotIcon from '../assets/tabbar/tarot-v2.png'
import tarotActiveIcon from '../assets/tabbar/tarot-active-v2.png'
import recordsIcon from '../assets/tabbar/records-v2.png'
import recordsActiveIcon from '../assets/tabbar/records-active-v2.png'
import meIcon from '../assets/tabbar/me-v2.png'
import meActiveIcon from '../assets/tabbar/me-active-v2.png'
import { TABBAR_SELECT_EVENT } from '../hooks/useTabBarSelected'
import { TAROT_TAB_INDEX, TAROT_TAB_ROUTE, shouldHideCustomTabBar, tabPathToRoute } from './tabBarVisibility'
import './index.scss'

// 自定义 tabBar：图标+文字整体垂直居中（原生 tabBar 布局不可调）；毛玻璃底+暖色选中态。
// 选中态双保险：①点击时乐观置位（即时反馈）②各 tab 页 onShow 经 eventCenter 广播索引
// （经 getTabBar().setState 的官方路子在 Taro 4 实测静默失效，见 hooks/useTabBarSelected）

type PageLike = { route?: string }

function currentPage(): PageLike | undefined {
  const pages = Taro.getCurrentPages()
  return pages[pages.length - 1] as PageLike | undefined
}

function currentRoute(): string {
  return currentPage()?.route ?? ''
}

const TABS = [
  { text: '测试', icon: testIcon, activeIcon: testActiveIcon, path: '/pages/test/index' },
  { text: '塔罗', icon: tarotIcon, activeIcon: tarotActiveIcon, path: '/pages/tarot/index' },
  { text: '记录', icon: recordsIcon, activeIcon: recordsActiveIcon, path: '/pages/records/index' },
  { text: '我的', icon: meIcon, activeIcon: meActiveIcon, path: '/pages/me/index' },
]

export default class CustomTabBar extends Component {
  ownRoute = currentRoute()

  state = {
    selected: this.ownRoute === TAROT_TAB_ROUTE ? TAROT_TAB_INDEX : 0,
    theme: 'light' as ResolvedTheme,
    hidden: shouldHideCustomTabBar(
      this.ownRoute,
      this.ownRoute,
      this.ownRoute === TAROT_TAB_ROUTE ? TAROT_TAB_INDEX : 0,
    ),
  }

  applyVisibility(selected = this.state.selected) {
    const webviewRoute = currentRoute() || this.ownRoute
    this.ownRoute = webviewRoute
    const selectedRoute = tabPathToRoute(TABS[selected]?.path ?? '')
    this.setState({
      selected,
      hidden: shouldHideCustomTabBar(webviewRoute, selectedRoute, selected),
    })
  }

  componentDidMount() {
    this.ownRoute = Taro.getCurrentInstance()?.page?.path || currentRoute() || this.ownRoute
    Taro.eventCenter.on(TABBAR_SELECT_EVENT, this.handleSelectEvent)
    Taro.eventCenter.on(THEME_CHANGE_EVENT, this.handleThemeEvent)
    this.setState({
      theme: resolveTheme(getThemePreference(), currentSystemTheme()),
    })
    this.applyVisibility(this.ownRoute === TAROT_TAB_ROUTE ? TAROT_TAB_INDEX : this.state.selected)
    try {
      Taro.onThemeChange?.((res: { theme?: string }) => {
        this.setState({ theme: resolveTheme(getThemePreference(), res?.theme) })
      })
    } catch {
      // 环境不支持时保持初始主题
    }
  }

  componentWillUnmount() {
    Taro.eventCenter.off(TABBAR_SELECT_EVENT, this.handleSelectEvent)
    Taro.eventCenter.off(THEME_CHANGE_EVENT, this.handleThemeEvent)
  }

  handleSelectEvent = (index: number) => {
    this.applyVisibility(index)
  }

  handleThemeEvent = () => {
    this.setState({ theme: resolveTheme(getThemePreference(), currentSystemTheme()) })
  }

  handleSwitch = (index: number) => {
    this.handleSelectEvent(index)
    Taro.switchTab({ url: TABS[index].path })
  }

  render() {
    const { selected, theme, hidden } = this.state
    const themeClass = theme === 'dark' ? 'tabbar tabbar--dark' : 'tabbar'
    return (
      <View className={hidden ? `${themeClass} tabbar--hidden` : themeClass}>
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
