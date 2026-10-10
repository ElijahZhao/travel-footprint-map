/**
 * 全站氛围动态背景。
 * 三个缓慢漂移的柔光球（主题绿 + 暖橙 + 暖金），以 fixed 方式铺满整个视口，
 * 由 App 在全局挂载一次，所有页面共享。低透明度、multiply 混色，不抢内容可读性。
 * 尊重系统「减少动效」设置；不参与交互。
 */
export default function AmbientBackground() {
  return (
    <div className="ambient-bg" aria-hidden="true">
      <span className="ambient-blob ambient-blob--1" />
      <span className="ambient-blob ambient-blob--2" />
      <span className="ambient-blob ambient-blob--3" />
    </div>
  )
}
