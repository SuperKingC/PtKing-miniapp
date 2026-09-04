import Taro, { useDidShow } from '@tarojs/taro'

type TabBarLike = { setState?: (state: { selected: number }) => void }

/** tabbar 选中态广播事件名；custom-tab-bar 组件订阅同一常量 */
export const TABBAR_SELECT_EVENT = 'ptking:tabbar-select'

/**
 * 自定义 tabBar 选中态同步：tab 页每次 onShow 广播自身索引。
 * 主路走 eventCenter（与实例时机无关，真机同样可靠）；
 * getTabBar().setState 官方路子在 Taro 4 实测两种取实例时机都静默失效，仅留作兜底。
 * 注意：page 实例必须在 hook 初始化时捕获——useDidShow 回调内再取 getCurrentInstance
 * 拿到的是 App 级上下文（page 为空）。
 */
export function useTabBarSelected(index: number) {
  const { page } = Taro.getCurrentInstance()
  useDidShow(() => {
    Taro.eventCenter.trigger(TABBAR_SELECT_EVENT, index)
    const tabbar = (page as { getTabBar?: () => TabBarLike } | undefined)?.getTabBar?.()
      ?? Taro.getCurrentInstance()?.page?.getTabBar?.()
    tabbar?.setState?.({ selected: index })
  })
}
