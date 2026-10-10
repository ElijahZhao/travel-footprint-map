/**
 * 全站氛围动态背景（非地图页）。
 * 两个缓慢漂移的柔光球，主题绿 + 暖橙，低透明度，固定铺在页面最底层。
 * 尊重系统「减少动效」设置；不参与交互、不影响可读性。
 */
export default function AmbientBackground() {
  return (
    <div className="ambient-bg" aria-hidden="true">
      <span className="ambient-blob ambient-blob--1" />
      <span className="ambient-blob ambient-blob--2" />
    </div>
  )
}
