export default defineAppConfig({
  pages: [
    'pages/test/index',
    'pages/tarot/index',
    'pages/records/index',
    'pages/me/index',
    'pages/test-detail/index',
    'pages/test-play/index',
    'pages/test-report/index',
    'pages/privacy/index',
  ],
  tabBar: {
    color: '@tabColor',
    selectedColor: '@tabSelectedColor',
    backgroundColor: '@tabBgColor',
    borderStyle: 'black',
    custom: true,
    list: [
      {
        pagePath: 'pages/test/index',
        text: '测试',
        iconPath: 'assets/tabbar/icon-tab-test-v17s.png',
        selectedIconPath: 'assets/tabbar/icon-tab-test-active-v17s.png',
      },
      {
        pagePath: 'pages/tarot/index',
        text: '塔罗',
        iconPath: 'assets/tabbar/icon-tab-tarot-v18s.png',
        selectedIconPath: 'assets/tabbar/icon-tab-tarot-active-v18s.png',
      },
      {
        pagePath: 'pages/records/index',
        text: '记录',
        iconPath: 'assets/tabbar/icon-tab-records-v17s.png',
        selectedIconPath: 'assets/tabbar/icon-tab-records-active-v17s.png',
      },
      {
        pagePath: 'pages/me/index',
        text: '我的',
        iconPath: 'assets/tabbar/icon-tab-me-v18s.png',
        selectedIconPath: 'assets/tabbar/icon-tab-me-active-v18s.png',
      },
    ],
  },
  window: {
    navigationBarTitleText: '测测子',
    // 全局沉浸式：去掉系统标题栏，页面自行留出状态栏+胶囊安全距离（ui-4 参考稿无标题栏）
    navigationStyle: 'custom',
    navigationBarBackgroundColor: '@navBgColor',
    navigationBarTextStyle: '@navTxtStyle',
    backgroundColor: '@bgColor',
  },
  // 暗色模式：导航栏/tabBar 颜色走 theme.json 双主题；页面配色走 app.scss 的 prefers-color-scheme 变量
  darkmode: true,
  themeLocation: 'theme.json',
  lazyCodeLoading: 'requiredComponents',
})
