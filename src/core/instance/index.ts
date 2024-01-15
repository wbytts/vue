import {initMixin} from './init'
import {stateMixin} from './state'
import {renderMixin} from './render'
import {eventsMixin} from './events'
import {lifecycleMixin} from './lifecycle'
import {warn} from '../util/index'
import type {GlobalAPI} from 'types/global-api'

function Vue(options) {
  if (__DEV__ && !(this instanceof Vue)) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  this._init(options)
}

// 初始化混入
// this._init方法是在这里添加的
//@ts-expect-error Vue has function type
initMixin(Vue)

// 状态混入
// 在Vue原型上挂了 $data/$props/$set/$delete/$watch
//@ts-expect-error Vue has function type
stateMixin(Vue)

// 事件混入
// 在Vue原型上挂了 $on/$off/$once/$emit
//@ts-expect-error Vue has function type
eventsMixin(Vue)

// 生命周期混入
// 在Vue原型上挂了 _update/$forceUpdate/$destroy
//@ts-expect-error Vue has function type
lifecycleMixin(Vue)

// render混入
// 在Vue原型上挂了 $nextTick/_render
// 调用了 installRenderHelpers(Vue.prototype)
//  target._o = markOnce
//  target._n = toNumber
//  target._s = toString
//  target._l = renderList
//  target._t = renderSlot
//  target._q = looseEqual
//  target._i = looseIndexOf
//  target._m = renderStatic
//  target._f = resolveFilter
//  target._k = checkKeyCodes
//  target._b = bindObjectProps
//  target._v = createTextVNode
//  target._e = createEmptyVNode
//  target._u = resolveScopedSlots
//  target._g = bindObjectListeners
//  target._d = bindDynamicKeys
//  target._p = prependModifier
//@ts-expect-error Vue has function type
renderMixin(Vue)

export default Vue as unknown as GlobalAPI
