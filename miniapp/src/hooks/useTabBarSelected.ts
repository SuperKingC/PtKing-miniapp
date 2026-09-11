import Taro, { useDidShow } from '@tarojs/taro'
import { TABBAR_SELECTED_KEY } from '../custom-tab-bar/tabBarVisibility'

type TabBarLike = { setState?: (state: { selected: number }) => void }

/** tabbar 选中态广播事件名；custom-tab-bar 组件订阅同一常量 */
export const TABBAR_SELECT_EVENT = 'ptking:tabbar-select'

/**
 * 自定义 tabBar 选中态同步：tab 页每次 onShow 广播自身索引并落乐观 storage。
 * 主路走 eventCenter（与实例时机无关，真机同样可靠）；
 * getTabBar().setState 官方路子在 Taro 4 实测两种取实例时机都静默失效，仅留作兜底。
 * 注意：page 实例必须在 hook 初始化时捕获——useDidShow 回调内再取 getCurrentInstance
 * 拿到的是 App 级上下文（page 为空）。
 * 竞态双保险：tabbar 实例可能晚于页面 onShow 才完成订阅（首次进 tab 偶发选中态
 * 不切换），广播后短延迟补发一次，且仅当本页仍是栈顶页时才补发，避免串到别的 tab。
 */
export function useTabBarSelected(index: number) {
  const { page } = Taro.getCurrentInstance()
  useDidShow(() => {
    Taro.eventCenter.trigger(TABBAR_SELECT_EVENT, index)
    // 乐观值同时落 storage：实例晚于广播挂载时读 storage 兜底，不再依赖时序
    try {
      Taro.setStorageSync(TABBAR_SELECTED_KEY, index)
    } catch {
      // storage 不可用时只走广播路子
    }
    const tabbar = (page as { getTabBar?: () => TabBarLike } | undefined)?.getTabBar?.()
      ?? (Taro.getCurrentInstance()?.page?.getTabBar?.() as unknown as TabBarLike | undefined)
    tabbar?.setState?.({ selected: index })
    setTimeout(() => {
      const pages = Taro.getCurrentPages()
      const top = pages[pages.length - 1] as { route?: string } | undefined
      const own = page as { route?: string } | undefined
      if (top && own && top.route === own.route) {
        Taro.eventCenter.trigger(TABBAR_SELECT_EVENT, index)
      }
    }, 160)
  })
}
