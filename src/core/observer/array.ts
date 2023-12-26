/*
 * 这个文件不进行类型检查，因为 Flow 在动态访问数组原型上的方法时表现不佳。
 * not type checking this file because flow doesn't play well with
 * dynamically accessing methods on Array prototype
 */

import { TriggerOpTypes } from '../../v3'
import { def } from '../util/index'

// 备份数组原型
const arrayProto = Array.prototype
// 创建数组原型的拷贝
export const arrayMethods = Object.create(arrayProto)

// 需要被拦截的数组方法名称
const methodsToPatch = [
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse'
]

/**
 * 描述了拦截变异方法并触发事件的过程
 * Intercept mutating methods and emit events
 */
methodsToPatch.forEach(function (method) {
  // cache original method 缓存原方法
  const original = arrayProto[method]

  def(arrayMethods, method, function mutator(...args) {
    // 原方法的调用，并获取结果
    const result = original.apply(this, args)
    const ob = this.__ob__

    // 存放后面要被插入的元素
    let inserted

    switch (method) {
      case 'push':
      case 'unshift':
        inserted = args
        break
      case 'splice':
        inserted = args.slice(2)
        break
    }

    // 如果 inserted 存在, 则将这个数组变成响应式
    if (inserted) ob.observeArray(inserted)

    // 通知变化 notify change
    if (__DEV__) {
      ob.dep.notify({
        type: TriggerOpTypes.ARRAY_MUTATION,
        target: this,
        key: method
      })
    } else {
      ob.dep.notify()
    }
    return result
  })

})
