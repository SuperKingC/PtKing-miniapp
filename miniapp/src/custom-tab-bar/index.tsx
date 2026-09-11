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
import testIcon from '../assets/tabbar/test-v11s.png'
import testActiveIcon from '../assets/tabbar/test-active-v11s.png'
import tarotIcon from '../assets/tabbar/tarot-v11s.png'
import tarotActiveIcon from '../assets/tabbar/tarot-active-v11s.png'
import recordsIcon from '../assets/tabbar/records-v11s.png'
import recordsActiveIcon from '../assets/tabbar/records-active-v11s.png'
import meIcon from '../assets/tabbar/me-v11s.png'
import meActiveIcon from '../assets/tabbar/me-active-v11s.png'
import { TABBAR_SELECT_EVENT } from '../hooks/useTabBarSelected'
import { getWxGlobal } from '../services/wxGlobal'
import { TAROT_TAB_INDEX, TAROT_FLOW_VISIBILITY_EVENT, shouldHideCustomTabBar, tabIndexFromRoute, tabPathToRoute } from './tabBarVisibility'
import './index.scss'

// 自定义 tabBar：图标+文字整体垂直居中（原生 tabBar 布局不可调）；米白槽底+米色颗粒胶囊，高调奶油软陶插画图标。
// 选中态双保险：①点击时乐观置位（即时反馈）②各 tab 页 onShow 经 eventCenter 广播索引
// （经 getTabBar().setState 的官方路子在 Taro 4 实测静默失效，见 hooks/useTabBarSelected）

type PageLike = { route?: string }

function currentPage(): PageLike | undefined {
  const pages = Taro.getCurrentPages()
  return pages[pages.length - 1] as PageLike | undefined
}

function currentRoute(): string {
  try {
    return Taro.getCurrentInstance()?.page?.path || currentPage()?.route || ''
  } catch {
    return currentPage()?.route ?? ''
  }
}

const TABS = [
  { text: '测试', icon: testIcon, activeIcon: testActiveIcon, path: '/pages/test/index' },
  { text: '塔罗', icon: tarotIcon, activeIcon: tarotActiveIcon, path: '/pages/tarot/index' },
  { text: '记录', icon: recordsIcon, activeIcon: recordsActiveIcon, path: '/pages/records/index' },
  { text: '我的', icon: meIcon, activeIcon: meActiveIcon, path: '/pages/me/index' },
]

export default class CustomTabBar extends Component {
  ownRoute = currentRoute()
  tarotFlowOpen = false

  state = {
    selected: tabIndexFromRoute(this.ownRoute),
    theme: 'light' as ResolvedTheme,
    hidden: shouldHideCustomTabBar(
      this.ownRoute,
      this.ownRoute,
      tabIndexFromRoute(this.ownRoute),
    ),
  }

  applyVisibility(selected = this.state.selected) {
    // 用本实例挂载时的页面路由，不要改写成栈顶路由（自定义 tabBar 里 currentRoute 常为空，会把栏藏死）。
    const selectedRoute = tabPathToRoute(TABS[selected]?.path ?? '')
    this.setState({
      selected,
      hidden: shouldHideCustomTabBar(this.ownRoute, selectedRoute, selected, this.tarotFlowOpen),
    })
  }

  componentDidMount() {
    this.ownRoute = Taro.getCurrentInstance()?.page?.path || currentRoute() || this.ownRoute
    Taro.eventCenter.on(TABBAR_SELECT_EVENT, this.handleSelectEvent)
    Taro.eventCenter.on(TAROT_FLOW_VISIBILITY_EVENT, this.handleFlowVisibility)
    Taro.eventCenter.on(THEME_CHANGE_EVENT, this.handleThemeEvent)
    this.setState({
      theme: resolveTheme(getThemePreference(), currentSystemTheme()),
    })
    this.applyVisibility(tabIndexFromRoute(this.ownRoute))
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
    Taro.eventCenter.off(TAROT_FLOW_VISIBILITY_EVENT, this.handleFlowVisibility)
    Taro.eventCenter.off(THEME_CHANGE_EVENT, this.handleThemeEvent)
  }

  handleFlowVisibility = (open: boolean) => {
    this.tarotFlowOpen = open
    this.applyVisibility()
  }

  handleSelectEvent = (index: number) => {
    this.applyVisibility(index)
  }

  handleThemeEvent = () => {
    this.setState({ theme: resolveTheme(getThemePreference(), currentSystemTheme()) })
  }

  switchTo = (index: number) => {
    const url = TABS[index]?.path
    if (!url) return
    const wxApi = getWxGlobal()
    if (wxApi?.switchTab) {
      wxApi.switchTab({ url })
    } else {
      Taro.switchTab({ url })
    }
    this.setState({
      selected: index,
      hidden: index === TAROT_TAB_INDEX && this.tarotFlowOpen,
    })
  }

  render() {
    const { selected, theme, hidden } = this.state
    const themeClass = theme === 'dark' ? 'tabbar tabbar--dark' : 'tabbar'
    return (
      <View
        className={hidden ? `${themeClass} tabbar--hidden` : themeClass}
        style={{ width: '100%', height: '100%' }}
      >
        <View className="tabbar__dock">
          {TABS.map((tab, index) => (
            <View
              key={tab.path}
              className="tabbar__item"
              hoverClass="pressable--pressed"
              onClick={() => this.switchTo(index)}
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
      </View>
    )
  }
}
