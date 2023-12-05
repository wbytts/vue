import type { GlobalAPI } from 'types/global-api'
import { toArray, isFunction } from '../util/index'

export function initUse(Vue: GlobalAPI) {
  Vue.use = function (plugin: Function | any) {
    // 初始化 installedPlugins，存放已安装的插件
    const installedPlugins = this._installedPlugins || (this._installedPlugins = [])

    // 如果当前传入的 plugin 已安装，则返回它自身，不做处理
    if (installedPlugins.indexOf(plugin) > -1) {
      return this
    }

    // additional parameters
    const args = toArray(arguments, 1)
    args.unshift(this)

    if (isFunction(plugin.install)) {
      // 如果是一个对象，包含 install 函数
      plugin.install.apply(plugin, args)
    } else if (isFunction(plugin)) {
      // 如果 plugin 直接是一个函数，则直接执行它
      plugin.apply(null, args)
    }

    installedPlugins.push(plugin)
    return this
  }
}
