import Taro, { useDidShow } from '@tarojs/taro'

type TabBarLike = { setState?: (state: { selected: number }) => void }

/** 自定义 tabBar 选中态同步：tab 页每次 onShow 把自身索引写入 tabbar 组件实例 */
export function useTabBarSelected(index: number) {
  useDidShow(() => {
    const { page } = Taro.getCurrentInstance()
    const tabbar = (page as { getTabBar?: () => TabBarLike } | undefined)?.getTabBar?.()
    tabbar?.setState?.({ selected: index })
  })
}
