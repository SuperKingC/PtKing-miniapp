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
import testIcon from '../assets/tabbar/icon-tab-test-v16s.png'
import testActiveIcon from '../assets/tabbar/icon-tab-test-active-v16s.png'
import tarotIcon from '../assets/tabbar/icon-tab-tarot-v16s.png'
import tarotActiveIcon from '../assets/tabbar/icon-tab-tarot-active-v16s.png'
import recordsIcon from '../assets/tabbar/icon-tab-records-v16s.png'
import recordsActiveIcon from '../assets/tabbar/icon-tab-records-active-v16s.png'
import meIcon from '../assets/tabbar/icon-tab-me-v16s.png'
import meActiveIcon from '../assets/tabbar/icon-tab-me-active-v16s.png'
import { TABBAR_SELECT_EVENT } from '../hooks/useTabBarSelected'
import { getWxGlobal } from '../services/wxGlobal'
import { TABBAR_SELECTED_KEY, TAROT_TAB_INDEX, TAROT_FLOW_VISIBILITY_EVENT, shouldHideCustomTabBar, tabIndexFromRoute, tabPathToRoute } from './tabBarVisibility'
import './index.scss'

// 自定义 tabBar：图标+文字整体垂直居中（原生 tabBar 布局不可调）；米白槽底+米色颗粒胶囊，高调奶油软陶插画图标。
// 选中态双保险：①点击时乐观置位（即时反馈）②各 tab 页 onShow 经 eventCenter 广播索引
// （经 getTabBar().setState 的官方路子在 Taro 4 实测静默失效，见 hooks/useTabBarSelected）

type PageLike = { route?: string }

function readStoredSelectedIndex(): number {
  try {
    const value = Taro.getStorageSync(TABBAR_SELECTED_KEY)
    const index = typeof value === 'number' ? value : Number(value)
    if (Number.isInteger(index) && index >= 0 && index < TABS.length) return index
  } catch {
    // storage 不可用时退回路由推断
  }
  return -1
}

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
  mountFixTimer = 0

  state = {
    selected: (() => {
      const byRoute = tabIndexFromRoute(this.ownRoute)
      if (this.ownRoute && byRoute >= 0) return byRoute
      const stored = readStoredSelectedIndex()
      return stored >= 0 ? stored : byRoute
    })(),
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
    // 选中态三级兜底：本页路由 > storage 乐观值 > 「测试」。
    // 路由解析不出（后台实例路由为空）时宁可信 storage——它是最近一次真实点击。
    const byRoute = tabIndexFromRoute(this.ownRoute)
    const stored = readStoredSelectedIndex()
    const initial = this.ownRoute && byRoute >= 0 ? byRoute : stored >= 0 ? stored : byRoute
    this.applyVisibility(initial)
    // 首挂竞态兜底：tabbar 上下文里路由常解析为空、页面 onShow 广播也可能早于本订阅，
    // 挂载后短延迟重解路由并按本页索引校准一次，否则错误选中态会一直挂到下一次广播
    this.mountFixTimer = setTimeout(() => {
      this.ownRoute = Taro.getCurrentInstance()?.page?.path || currentRoute() || this.ownRoute
      const byRoute = tabIndexFromRoute(this.ownRoute)
      if (this.ownRoute && byRoute >= 0) this.applyVisibility(byRoute)
    }, 120) as unknown as number
    try {
      Taro.onThemeChange?.((res: { theme?: string }) => {
        this.setState({ theme: resolveTheme(getThemePreference(), res?.theme) })
      })
    } catch {
      // 环境不支持时保持初始主题
    }
  }

  componentWillUnmount() {
    clearTimeout(this.mountFixTimer)
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
    // 乐观选中先落 storage：tab 页各自持独立 tabbar 实例，新实例挂载早于 onShow 广播，
    // 初始 selected 用 storage 兜底，避免新实例先渲染旧选中态再跳变
    try {
      Taro.setStorageSync(TABBAR_SELECTED_KEY, index)
    } catch {
      // storage 不可用时仍走事件广播路子
    }
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
