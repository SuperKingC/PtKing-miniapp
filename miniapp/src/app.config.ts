export default defineAppConfig({
  pages: [
    'pages/test/index',
    'pages/tarot/index',
    'pages/records/index',
    'pages/me/index',
    'pages/test-detail/index',
    'pages/test-play/index',
    'pages/test-report/index',
  ],
  tabBar: {
    color: '#9a8f86',
    selectedColor: '#c05f35',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/test/index',
        text: '测试',
        iconPath: 'assets/tabbar/test-alpha.png',
        selectedIconPath: 'assets/tabbar/test-active-alpha.png',
      },
      {
        pagePath: 'pages/tarot/index',
        text: '塔罗',
        iconPath: 'assets/tabbar/tarot-alpha.png',
        selectedIconPath: 'assets/tabbar/tarot-active-alpha.png',
      },
      {
        pagePath: 'pages/records/index',
        text: '记录',
        iconPath: 'assets/tabbar/records-alpha.png',
        selectedIconPath: 'assets/tabbar/records-active-alpha.png',
      },
      {
        pagePath: 'pages/me/index',
        text: '我的',
        iconPath: 'assets/tabbar/me-alpha.png',
        selectedIconPath: 'assets/tabbar/me-active-alpha.png',
      },
    ],
  },
  window: {
    navigationBarTitleText: 'PtKing',
    navigationBarBackgroundColor: '#f6f4ff',
    navigationBarTextStyle: 'black',
    backgroundColor: '#f6f4ff',
  },
  lazyCodeLoading: 'requiredComponents',
})
