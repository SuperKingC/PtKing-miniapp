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
    selectedColor: '#6c5ce7',
    backgroundColor: '#ffffff',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/test/index',
        text: '测试',
        iconPath: 'assets/tabbar/test.png',
        selectedIconPath: 'assets/tabbar/test-active.png',
      },
      {
        pagePath: 'pages/tarot/index',
        text: '塔罗',
        iconPath: 'assets/tabbar/tarot.png',
        selectedIconPath: 'assets/tabbar/tarot-active.png',
      },
      {
        pagePath: 'pages/records/index',
        text: '记录',
        iconPath: 'assets/tabbar/records.png',
        selectedIconPath: 'assets/tabbar/records-active.png',
      },
      {
        pagePath: 'pages/me/index',
        text: '我的',
        iconPath: 'assets/tabbar/me.png',
        selectedIconPath: 'assets/tabbar/me-active.png',
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
