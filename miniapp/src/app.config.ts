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
    custom: true,
    list: [
      {
        pagePath: 'pages/test/index',
        text: '测试',
        iconPath: 'assets/tabbar/test-v2.png',
        selectedIconPath: 'assets/tabbar/test-active-v2.png',
      },
      {
        pagePath: 'pages/tarot/index',
        text: '塔罗',
        iconPath: 'assets/tabbar/tarot-v2.png',
        selectedIconPath: 'assets/tabbar/tarot-active-v2.png',
      },
      {
        pagePath: 'pages/records/index',
        text: '记录',
        iconPath: 'assets/tabbar/records-v2.png',
        selectedIconPath: 'assets/tabbar/records-active-v2.png',
      },
      {
        pagePath: 'pages/me/index',
        text: '我的',
        iconPath: 'assets/tabbar/me-v2.png',
        selectedIconPath: 'assets/tabbar/me-active-v2.png',
      },
    ],
  },
  window: {
    navigationBarTitleText: 'PtKing',
    navigationBarBackgroundColor: '#f7f4ee',
    navigationBarTextStyle: 'black',
    backgroundColor: '#f7f4ee',
  },
  lazyCodeLoading: 'requiredComponents',
})
