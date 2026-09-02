import { getWxGlobal } from './wxGlobal'

/**
 * 开启右上角菜单转发（M4 分享基础）：wx 访问走 getWxGlobal（真机闭包注入兼容），
 * 失败静默（某些宿主环境可能拒绝，转发入口仍在页面内 openType="share" 按钮上）。
 */
export function showShareMenu(): void {
  try {
    getWxGlobal()?.showShareMenu?.({ menus: ['shareAppMessage', 'shareTimeline'] })
  } catch {
    // 静默失败不影响主流程
  }
}
