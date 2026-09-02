import React, { useEffect } from 'react'
import { showShareMenu } from './services/shareMenu'
import './app.scss'

function App({ children }: { children?: React.ReactNode }) {
  // 进入小程序即开启右上角菜单的转发按钮（各页面再用 useShareAppMessage 定制标题）
  useEffect(() => {
    showShareMenu()
  }, [])
  return children
}

export default App
