/**
 * 全站氛围动态背景。
 * 三层视觉：缓慢漂移的柔光球（底层）+ 声呐扩散环 + 上升光点与闪烁星屑（跳动层）。
 * 挂在手机框内、内容滚动层之下，所有页面共享。
 * 尊重系统「减少动效」设置；不参与交互、不抢内容可读性。
 */
const DOTS = [
  { left: '12%', size: 7, dur: '13s', delay: '0s', sway: '5vw', peak: 0.55, color: undefined },
  { left: '78%', size: 9, dur: '17s', delay: '3s', sway: '-6vw', peak: 0.5, color: 'color-mix(in oklab, var(--accent) 55%, transparent)' },
  { left: '34%', size: 5, dur: '11s', delay: '6s', sway: '7vw', peak: 0.45, color: 'color-mix(in oklab, var(--theme-gold, #d9b25f) 60%, transparent)' },
  { left: '58%', size: 6, dur: '15s', delay: '9s', sway: '-4vw', peak: 0.5, color: undefined },
  { left: '90%', size: 5, dur: '12s', delay: '12s', sway: '5vw', peak: 0.4, color: 'color-mix(in oklab, var(--theme-rose, #e0a3a3) 55%, transparent)' },
  { left: '22%', size: 8, dur: '19s', delay: '15s', sway: '-5vw', peak: 0.45, color: undefined },
]

const SPARKS = [
  { left: '18%', top: '22%', dur: '4.5s', delay: '1s' },
  { left: '68%', top: '14%', dur: '6s', delay: '2.5s' },
  { left: '45%', top: '58%', dur: '5s', delay: '4s' },
  { left: '84%', top: '66%', dur: '5.5s', delay: '0.5s' },
  { left: '8%', top: '74%', dur: '6.5s', delay: '3s' },
]

const RINGS = [
  { left: '70%', top: '20%', size: 180, delay: '0s' },
  { left: '16%', top: '62%', size: 240, delay: '3s' },
]

export default function AmbientBackground() {
  return (
    <div className="ambient-bg" aria-hidden="true">
      <span className="ambient-blob ambient-blob--1" />
      <span className="ambient-blob ambient-blob--2" />
      <span className="ambient-blob ambient-blob--3" />
      <span className="ambient-blob ambient-blob--4" />
      {RINGS.map((r, i) => (
        <span
          key={`ring-${i}`}
          className="ambient-ring"
          style={{ left: r.left, top: r.top, width: r.size, height: r.size, ['--delay' as string]: r.delay }}
        />
      ))}
      {DOTS.map((d, i) => (
        <span
          key={`dot-${i}`}
          className="ambient-dot"
          style={{
            left: d.left,
            top: '100%',
            width: d.size,
            height: d.size,
            ['--dur' as string]: d.dur,
            ['--delay' as string]: d.delay,
            ['--sway' as string]: d.sway,
            ['--peak' as string]: d.peak,
            ...(d.color ? { ['--dot-color' as string]: d.color } : {}),
          }}
        />
      ))}
      {SPARKS.map((s, i) => (
        <span
          key={`spark-${i}`}
          className="ambient-spark"
          style={{ left: s.left, top: s.top, ['--dur' as string]: s.dur, ['--delay' as string]: s.delay }}
        />
      ))}
    </div>
  )
}
