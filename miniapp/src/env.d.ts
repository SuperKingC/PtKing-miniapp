declare const TARO_API_BASE_URL: string
declare const TARO_ASSET_BASE_URL: string
declare const TARO_ASSET_DEV_BASE_URL: string

declare const TARO_AD_UNIT_ID: string
// 复用 Taro 的参数/回调定义，原生 wx 的异步接口不返回 Taro Promise。
type NativeWxApi<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => R extends Promise<unknown> ? void : R
    : T[K]
}
declare const wx: NativeWxApi<typeof import('@tarojs/taro').default>

declare module '*.png'
declare module '*.jpg'
declare module '*.jpeg'
