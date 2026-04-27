# Vue 2.7 Observer 模块设计思想分析

> 分析对象：`src/core/observer/`
> 分析日期：2026-04-27

## 一、模块全貌：6 个文件的职责分层

```
observer/
├── index.ts        ← Observer 类 + defineReactive：数据劫持核心
├── dep.ts          ← Dep 类：依赖收集容器（被观察者）
├── watcher.ts      ← Watcher 类：响应执行单元（观察者）
├── array.ts        ← 数组方法重写（弥补 defineProperty 的盲区）
├── scheduler.ts    ← 异步更新调度器（批量化执行）
└── traverse.ts     ← 深度遍历（实现 deep watch）
```

整个模块围绕一句话：**“数据变了，谁要更新？”** 三个角色协作回答这个问题：

| 角色 | 文件 | 类比 |
|---|---|---|
| **被观察对象（Subject）** | `Dep` | 出版社 |
| **观察者（Observer）** | `Watcher` | 订阅者 |
| **劫持者（Hijacker）** | `Observer` + `defineReactive` | 邮局（拦截读写动作触发订阅/通知） |

---

## 二、核心设计思想

### 1. 数据劫持 + 依赖收集 = 响应式

Vue 2 选择 `Object.defineProperty` 改写每个属性的 getter/setter（`index.ts:166-224`）。这个选择有得有失：

- **得**：兼容性好（IE9+），可以精准定位“某个属性”的变化。
- **失**：必须**一次性遍历对象的所有 key**（递归到所有嵌套层），无法检测**新增/删除属性**——这就是为什么必须有 `Vue.set` / `Vue.delete`（`index.ts:237-294`），也是 Vue 3 改用 Proxy 的根本动机。

### 2. 巧妙的全局变量传递：`Dep.target`

依赖收集最精彩的设计在 `dep.ts:99-110`：

```ts
Dep.target = null
const targetStack = []
export function pushTarget(target) { ... }
export function popTarget() { ... }
```

**问题**：getter 被触发时，怎么知道“是谁在读我”？
**解法**：用一个**全局唯一的指针** `Dep.target` 暂存当前正在求值的 Watcher。

流程见 `watcher.ts:135-158`：

```
Watcher.get()
  → pushTarget(this)        // 把自己挂到 Dep.target
  → this.getter.call(...)   // 求值过程中触发 getter
                            // → reactiveGetter 里 dep.depend()
                            // → Dep.target.addDep(dep)
                            // → 双向绑定建立
  → popTarget()
```

这是**控制反转**的精妙应用：getter 不需要知道是谁在读，读的人通过全局变量主动“自报家门”。**栈式管理**（`targetStack`）则解决了嵌套求值（比如 computed 里读 computed）的恢复问题。

### 3. 双向引用 + 增量 diff：精准依赖管理

`Watcher` 不只是被动接收通知，它**自己也持有 deps**（`watcher.ts:54-57`）：

```ts
deps: Array<Dep>          // 旧依赖
newDeps: Array<Dep>       // 本次求值收集的新依赖
depIds: SimpleSet
newDepIds: SimpleSet
```

每次重新求值后，`cleanupDeps()`（`watcher.ts:177-193`）会**对比新旧依赖集合**：旧的中不在新中的，从 dep 的订阅列表里把自己摘掉。

**为什么要这么做？** 考虑 `v-if` 切换分支的场景：原本依赖了 A，切换后依赖 B；如果不清理，A 变化时还会无意义地触发更新。这是性能优化的关键，也是 Vue 响应式系统**精准追踪**的体现。

### 4. 数组的“补丁”思想

`array.ts` 是整个模块最体现**工程妥协**的地方。

`Object.defineProperty` 无法监听 `arr[0] = x`、`arr.length = 0` 这类索引/长度修改。Vue 的解法是：

1. 创建一个继承自 `Array.prototype` 的新对象 `arrayMethods`（`array.ts:11-13`）
2. 重写 7 个会改变原数组的方法（`push/pop/shift/unshift/splice/sort/reverse`）
3. 把响应式数组的 `__proto__` 改指到 `arrayMethods`（`index.ts:65`）

调用 `arr.push(x)` 时，先执行原方法，再**手动调用 `ob.dep.notify()`** 通知更新，并对新插入的元素递归 observe（`array.ts:53`）。

> 这是典型的**“开放封闭原则”应用**：不修改原型，通过原型链拓展拦截。

但仍留下两个洞——`arr[i] = x` 和 `arr.length = 0` 不会触发更新，所以又出现了 `Vue.set` 中针对数组的 `splice` 兜底（`index.ts:252-260`）。**一层层补丁的痕迹清晰可见**，这也是 Vue 2 响应式被诟病的部分。

### 5. 异步批量更新：性能优化的关键

`scheduler.ts` 解决一个核心问题：**同一个 tick 内多次修改数据，不应该触发多次重渲染**。

```
data.a = 1   → watcher.update() → queueWatcher → 加入 queue
data.b = 2   → watcher.update() → queueWatcher → 已在 queue，跳过 (has[id])
data.c = 3   → ...
                                                ↓
                               nextTick(flushSchedulerQueue)
                                                ↓
                                  排序 → 依次执行 watcher.run()
```

排序（`scheduler.ts:63-70, 88`）有三条语义保证（注释写得很清楚）：

1. **父组件先于子组件更新**（id 单调递增 + 父先创建）
2. **user watcher 先于 render watcher**（同样基于 id 顺序）
3. **post watcher 排在最后**（用于副作用类响应）

这种“**push 时去重 + flush 时排序**”的模式，使 Vue 的更新既批量化又有序。

### 6. `__ob__` 的双重身份

每个被观察对象上挂载的 `__ob__` 属性（`index.ts:60`），承担两个职责：

- **缓存标记**：`observe()` 入口判断 `__ob__` 已存在则复用（`index.ts:117-119`），避免重复劫持
- **数组的 dep 持有者**：因为数组没有“属性级 dep”（`defineReactive` 只针对对象属性），数组整体的依赖收集和通知必须挂在 `__ob__.dep` 上（`index.ts:184, array.ts:57`）

这就是为什么数组的 `dependArray`（`index.ts:349-359`）要遍历每个元素，让元素的 `__ob__.dep` 也收集当前 watcher——**因为不能像对象那样依赖 getter 来收集**。

---

## 三、值得品味的设计权衡

| 设计选择 | 代价 | 收获 |
|---|---|---|
| `defineProperty` 而非 Proxy | 无法监听新增/删除属性、数组索引 | IE9+ 兼容、初始化时确定边界 |
| 递归一次性劫持 | 大对象初始化开销大 | 运行时访问无 Proxy 拦截开销 |
| 全局 `Dep.target` | 不可重入需要栈管理 | 极简的 API、零侵入的依赖收集 |
| 异步批量更新 | DOM 更新延后一个 tick | 大幅减少重渲染次数 |
| Watcher 持有 deps | 多一份引用 | 支持 watcher 销毁时反向解绑、依赖切换 |
| `__ob__` 直接挂在数据上 | 污染原对象、JSON 序列化需注意 | O(1) 查询是否已观察 |

---

## 四、一句话总结整个模块

> **“用 defineProperty 把对象的每个属性变成可订阅的发布点（Dep），用 Watcher 作为读取数据时的临时身份标识来登记订阅，用调度器把同步触发的多次通知合并成一次异步执行。”**

Vue 2 的 observer 模块是**“代理模式 + 观察者模式 + 命令模式”** 的经典组合，它的局限性也正是 Vue 3 用 Proxy + ref/reactive 重写响应式的动机。理解这个模块，相当于掌握了 Vue 设计哲学的根。

---

## 附录：核心数据流图

```
                       ┌──────────────────────────────┐
                       │   组件渲染 / computed / watch │
                       └──────────────┬───────────────┘
                                      │ new Watcher(fn)
                                      ▼
                              ┌───────────────┐
                              │   Watcher     │
                              │  pushTarget   │
                              └───────┬───────┘
                                      │ Dep.target = this
                                      ▼
                              执行 fn() 读取响应式数据
                                      │
                                      ▼
                       ┌──────────────────────────────┐
                       │ defineReactive 的 getter 触发│
                       │   dep.depend()               │
                       │   ├─ Dep.target.addDep(dep)  │
                       │   └─ dep.addSub(Dep.target)  │
                       └──────────────┬───────────────┘
                                      │
                                      ▼
                              建立双向引用
                                      │
                                      ▼
                              popTarget / cleanupDeps


                            ===  数据变更阶段  ===

                       ┌──────────────────────────────┐
                       │   data.x = newVal            │
                       └──────────────┬───────────────┘
                                      ▼
                       ┌──────────────────────────────┐
                       │ defineReactive 的 setter 触发│
                       │   dep.notify()               │
                       └──────────────┬───────────────┘
                                      │ for sub in subs:
                                      │   sub.update()
                                      ▼
                       ┌──────────────────────────────┐
                       │   queueWatcher(this)         │
                       │   nextTick(flushQueue)       │
                       └──────────────┬───────────────┘
                                      ▼
                       ┌──────────────────────────────┐
                       │  排序 → 执行 watcher.run()    │
                       │  → 重新求值 / 重新渲染         │
                       └──────────────────────────────┘
```
