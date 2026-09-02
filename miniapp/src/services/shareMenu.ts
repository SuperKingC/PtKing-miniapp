/**
 * 开启右上角菜单转发（M4 分享基础）：守卫式 wx 全局调用，
 * 失败静默（某些宿主环境可能拒绝，转发入口仍在页面内 openType="share" 按钮上）。
 */
export function showShareMenu(): void {
  try {
    const wxApi = (globalThis as {
      wx?: { showShareMenu?: (options?: { withShareTicket?: boolean; menus?: string[] }) => void }
    }).wx
    wxApi?.showShareMenu?.({ menus: ['shareAppMessage', 'shareTimeline'] })
  } catch {
    // 静默失败不影响主流程
  }
}
