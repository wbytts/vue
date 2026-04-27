// ============================================================
//  examples/wby 通用辅助函数
//  为各个响应式演示页面提供：日志输出 / 日志清空 等工具
// ============================================================

/**
 * 在页面上的 #log 容器追加一行带颜色的日志
 * @param {'track'|'trigger'|'update'|'info'} type  日志类别（决定颜色样式）
 * @param {string} msg                              日志内容
 */
function log(type, msg) {
  const el = document.getElementById('log')
  if (!el) return
  const line = document.createElement('div')
  line.className = 'log-' + type
  line.textContent = `[${String(type).padEnd(7)}] ${msg}`
  el.appendChild(line)
  el.scrollTop = el.scrollHeight
}

/** 清空页面上的 #log 容器 */
function clearLog() {
  const el = document.getElementById('log')
  if (el) el.innerHTML = ''
}
