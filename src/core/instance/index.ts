import { initMixin } from './init'
import { stateMixin } from './state'
import { renderMixin } from './render'
import { eventsMixin } from './events'
import { lifecycleMixin } from './lifecycle'
import { warn } from '../util/index'
import type { GlobalAPI } from 'types/global-api'

function Vue(options) {
  if (__DEV__ && !(this instanceof Vue)) {
    warn('Vue is a constructor and should be called with the `new` keyword')
  }
  this._init(options)
}

// 初始化混入
//@ts-expect-error Vue has function type
initMixin(Vue)

// 状态混入
//@ts-expect-error Vue has function type
stateMixin(Vue)

// 事件混入
//@ts-expect-error Vue has function type
eventsMixin(Vue)

// 生命周期混入
//@ts-expect-error Vue has function type
lifecycleMixin(Vue)

// render混入
//@ts-expect-error Vue has function type
renderMixin(Vue)

export default Vue as unknown as GlobalAPI
