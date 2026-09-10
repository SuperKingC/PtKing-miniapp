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
        iconPath: 'assets/tabbar/test-v9.png',
        selectedIconPath: 'assets/tabbar/test-active-v9.png',
      },
      {
        pagePath: 'pages/tarot/index',
        text: '塔罗',
        iconPath: 'assets/tabbar/tarot-active-v7.png',
        selectedIconPath: 'assets/tabbar/tarot-active-v7.png',
      },
      {
        pagePath: 'pages/records/index',
        text: '记录',
        iconPath: 'assets/tabbar/records-v7.png',
        selectedIconPath: 'assets/tabbar/records-active-v9.png',
      },
      {
        pagePath: 'pages/me/index',
        text: '我的',
        iconPath: 'assets/tabbar/me-v7.png',
        selectedIconPath: 'assets/tabbar/me-active-v7.png',
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
