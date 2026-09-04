import React, { useEffect } from 'react'
import { showShareMenu } from './services/shareMenu'
import { installGlobalErrorHandlers } from './services/monitor'
import './app.scss'

function App({ children }: { children?: React.ReactNode }) {
  // 进入小程序即开启右上角菜单的转发按钮（各页面再用 useShareAppMessage 定制标题）；
  // 同时注册全局错误捕获（脚本错误/未处理 Promise 拒绝/路由不存在 → 实时日志）
  useEffect(() => {
    showShareMenu()
    installGlobalErrorHandlers()
  }, [])
  return children
}

export default App
