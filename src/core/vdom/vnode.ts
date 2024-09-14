import type { Component } from 'types/component'
import type { ComponentOptions } from 'types/options'
import type { VNodeComponentOptions, VNodeData } from 'types/vnode'

/**
 * @internal
 */
export default class VNode {
  // 标签名
  tag?: string
  // 数据data
  data: VNodeData | undefined
  // 子节点VNode
  children?: Array<VNode> | null
  // 文本
  text?: string
  // VNode 对应的 DOM节点
  elm: Node | undefined

  // 名称空间 namespace
  ns?: string

  // rendered in this component's scope
  // 渲染上下文（即在哪个组件内渲染的）
  context?: Component

  // 懂得都懂
  key: string | number | undefined

  // 组件选项
  componentOptions?: VNodeComponentOptions
  // component instance 组件实例
  componentInstance?: Component
  // 父 VNode (component placeholder node)
  parent: VNode | undefined | null

  // strictly internal
  // contains raw HTML? (server only)
  raw: boolean
  // hoisted static node
  isStatic: boolean
  // necessary for enter transition check
  isRootInsert: boolean
  // empty comment placeholder?
  isComment: boolean

  // 是否是一个克隆的节点
  isCloned: boolean

  // 是否被 v-once 标注
  isOnce: boolean

  // async component factory function
  // 异步工厂函数（用来支持异步组件）
  asyncFactory?: Function
  asyncMeta: Object | void
  isAsyncPlaceholder: boolean
  ssrContext?: Object | void
  // real context vm for functional nodes
  fnContext: Component | void
  // for SSR caching
  fnOptions?: ComponentOptions | null
  // used to store functional render context for devtools
  devtoolsMeta?: Object | null
  // functional scope id support
  fnScopeId?: string | null
  // for SSR directives
  isComponentRootElement?: boolean | null

  constructor(
    tag?: string,
    data?: VNodeData,
    children?: Array<VNode> | null,
    text?: string,
    elm?: Node,
    context?: Component,
    componentOptions?: VNodeComponentOptions,
    asyncFactory?: Function
  ) {
    this.tag = tag
    this.data = data
    this.children = children
    this.text = text
    this.elm = elm
    this.ns = undefined
    this.context = context
    this.fnContext = undefined
    this.fnOptions = undefined
    this.fnScopeId = undefined
    this.key = data && data.key
    this.componentOptions = componentOptions
    this.componentInstance = undefined
    this.parent = undefined
    this.raw = false
    this.isStatic = false
    this.isRootInsert = true
    this.isComment = false
    this.isCloned = false
    this.isOnce = false
    this.asyncFactory = asyncFactory
    this.asyncMeta = undefined
    this.isAsyncPlaceholder = false
  }

  // componentInstance 属性的只读别名
  // DEPRECATED: alias for componentInstance for backwards compat.
  /* istanbul ignore next */
  get child(): Component | void {
    return this.componentInstance
  }
}

export const createEmptyVNode = (text: string = '') => {
  const node = new VNode()
  node.text = text
  node.isComment = true
  return node
}

export function createTextVNode(val: string | number) {
  return new VNode(undefined, undefined, undefined, String(val))
}

// optimized shallow clone
// used for static nodes and slot nodes because they may be reused across
// multiple renders, cloning them avoids errors when DOM manipulations rely
// on their elm reference.
export function cloneVNode(vnode: VNode): VNode {
  const cloned = new VNode(
    vnode.tag,
    vnode.data,
    // #7975
    // clone children array to avoid mutating original in case of cloning
    // a child.
    vnode.children && vnode.children.slice(),
    vnode.text,
    vnode.elm,
    vnode.context,
    vnode.componentOptions,
    vnode.asyncFactory
  )
  cloned.ns = vnode.ns
  cloned.isStatic = vnode.isStatic
  cloned.key = vnode.key
  cloned.isComment = vnode.isComment
  cloned.fnContext = vnode.fnContext
  cloned.fnOptions = vnode.fnOptions
  cloned.fnScopeId = vnode.fnScopeId
  cloned.asyncMeta = vnode.asyncMeta
  cloned.isCloned = true
  return cloned
}
