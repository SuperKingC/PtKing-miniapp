import Taro, { useDidShow } from '@tarojs/taro'

type TabBarLike = { setState?: (state: { selected: number }) => void }

/**
 * 自定义 tabBar 选中态同步：tab 页每次 onShow 把自身索引写入 tabbar 组件实例。
 * 注意：page 实例必须在 hook 初始化时捕获——useDidShow 回调内再取 getCurrentInstance
 * 拿到的是 App 级上下文（page 为空），同步会静默失效，高亮永远停在首项。
 */
export function useTabBarSelected(index: number) {
  const { page } = Taro.getCurrentInstance()
  useDidShow(() => {
    const tabbar = (page as { getTabBar?: () => TabBarLike } | undefined)?.getTabBar?.()
      ?? Taro.getCurrentInstance()?.page?.getTabBar?.()
    tabbar?.setState?.({ selected: index })
  })
}
