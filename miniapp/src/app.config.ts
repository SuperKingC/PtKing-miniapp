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
        iconPath: 'assets/tabbar/test-v6.png',
        selectedIconPath: 'assets/tabbar/test-active-v4.png',
      },
      {
        pagePath: 'pages/tarot/index',
        text: '塔罗',
        iconPath: 'assets/tabbar/tarot-v5.png',
        selectedIconPath: 'assets/tabbar/tarot-active-v5.png',
      },
      {
        pagePath: 'pages/records/index',
        text: '记录',
        iconPath: 'assets/tabbar/records-v5.png',
        selectedIconPath: 'assets/tabbar/records-active-v5.png',
      },
      {
        pagePath: 'pages/me/index',
        text: '我的',
        iconPath: 'assets/tabbar/me-v4.png',
        selectedIconPath: 'assets/tabbar/me-active-v4.png',
      },
    ],
  },
  window: {
    navigationBarTitleText: '测测子',
    navigationBarBackgroundColor: '@navBgColor',
    navigationBarTextStyle: '@navTxtStyle',
    backgroundColor: '@bgColor',
  },
  // 暗色模式：导航栏/tabBar 颜色走 theme.json 双主题；页面配色走 app.scss 的 prefers-color-scheme 变量
  darkmode: true,
  themeLocation: 'theme.json',
  lazyCodeLoading: 'requiredComponents',
})
