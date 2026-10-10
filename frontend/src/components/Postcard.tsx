import { forwardRef } from 'react'
import { Checkin } from '@/lib/types'
import { format } from 'date-fns'
import { zhCN } from 'date-fns/locale'

export interface PostcardProps {
  checkins: Checkin[]
  ownerName?: string
  variant?: 'postcard' | 'yearbook'
}

// 把经纬度投影到卡片内的地图区域（等距圆柱投影），用于绘制足迹连线。
function project(
  points: { lat: number; lng: number }[],
  w: number,
  h: number,
  pad: number,
): { x: number; y: number }[] {
  if (points.length === 0) return []
  const lats = points.map((p) => p.lat)
  const lngs = points.map((p) => p.lng)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const spanLat = maxLat - minLat || 1
  const spanLng = maxLng - minLng || 1
  return points.map((p) => ({
    x: pad + ((p.lng - minLng) / spanLng) * (w - 2 * pad),
    y: pad + (1 - (p.lat - minLat) / spanLat) * (h - 2 * pad),
  }))
}

function visitedCoordPoints(checkins: Checkin[]) {
  return checkins
    .filter((c) => c.status === 'visited' && c.lat != null && c.lng != null)
    .sort((a, b) => String(a.visit_date).localeCompare(String(b.visit_date)))
    .map((c) => ({ lat: c.lat as number, lng: c.lng as number, c }))
}

function cityOf(c: Checkin): string {
  const addr = c.address || c.place_name || ''
  const p =
    addr.match(/^(北京|天津|上海|重庆|河北|山西|内蒙古|辽宁|吉林|黑龙江|江苏|浙江|安徽|福建|江西|山东|河南|湖北|湖南|广东|广西|海南|四川|贵州|云南|西藏|陕西|甘肃|青海|宁夏|新疆|香港|澳门|台湾)/)
  if (p) return p[1]
  return addr.split(/[市区县]/)[0] || c.place_name || '—'
}

function uniqueCities(checkins: Checkin[]): Set<string> {
  const s = new Set<string>()
  checkins.filter((c) => c.status === 'visited').forEach((c) => s.add(cityOf(c)))
  return s
}

function uniqueCountries(checkins: Checkin[]): Set<string> {
  const s = new Set<string>()
  checkins
    .filter((c) => c.status === 'visited')
    .forEach((c) => {
      if (c.nation) s.add(c.nation)
      else s.add('中国')
    })
  return s
}

const POSTCARD_W = 1000
const POSTCARD_H = 560
const YEARBOOK_W = 540
const YEARBOOK_H = 920

export default forwardRef<HTMLDivElement, PostcardProps>(function Postcard(
  { checkins, ownerName = '一位旅行者', variant = 'postcard' },
  ref,
) {
  const visited = checkins.filter((c) => c.status === 'visited')
  const cities = uniqueCities(checkins)
  const countries = uniqueCountries(checkins)
  const coords = visitedCoordPoints(checkins)
  const isPostcard = variant === 'postcard'

  const W = isPostcard ? POSTCARD_W : YEARBOOK_W
  const H = isPostcard ? POSTCARD_H : YEARBOOK_H

  // 地图区域
  const mapPad = 36
  const mapW = isPostcard ? W - mapPad * 2 : W - mapPad * 2
  const mapH = isPostcard ? 300 : 360
  const proj = project(
    coords.map((p) => ({ lat: p.lat, lng: p.lng })),
    mapW,
    mapH,
    mapPad,
  )

  const linePath =
    proj.length >= 2
      ? 'M' + proj.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L')
      : ''

  const wishPoints = checkins
    .filter((c) => c.status !== 'visited' && c.lat != null && c.lng != null)
    .map((c) => ({ lat: c.lat as number, lng: c.lng as number }))

  const shared = {
    position: 'relative' as const,
    width: W,
    height: H,
    overflow: 'hidden' as const,
    fontFamily:
      "'Playfair Display', 'Noto Serif SC', ui-serif, Georgia, serif",
    color: '#1f2d24',
    background:
      'linear-gradient(135deg, #f3f7f1 0%, #eaf3ea 48%, #f6efe6 100%)',
    boxShadow: '0 24px 60px -20px rgba(45,90,61,0.35)',
  }

  const wordmark = (
    <div
      style={{
        position: 'absolute',
        top: 22,
        right: 26,
        fontSize: 12,
        letterSpacing: 3,
        fontWeight: 700,
        color: '#2d5a3d',
        opacity: 0.7,
      }}
    >
      脚印地图 · FOOTPRINT
    </div>
  )

  const mapDecor = (
    <svg
      width={mapW}
      height={mapH}
      viewBox={`0 0 ${mapW} ${mapH}`}
      style={{ display: 'block' }}
    >
      <defs>
        <radialGradient id="pg-glow" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#d9ecd9" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#d9ecd9" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="pg-line" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2d5a3d" />
          <stop offset="100%" stopColor="#c98a3c" />
        </linearGradient>
      </defs>
      <rect width={mapW} height={mapH} fill="url(#pg-glow)" rx={18} />
      {/* 经纬网格 */}
      {Array.from({ length: 6 }).map((_, i) => (
        <line
          key={`h${i}`}
          x1={0}
          x2={mapW}
          y1={(mapH / 6) * (i + 1)}
          y2={(mapH / 6) * (i + 1)}
          stroke="#2d5a3d"
          strokeOpacity={0.08}
          strokeWidth={1}
        />
      ))}
      {Array.from({ length: 8 }).map((_, i) => (
        <line
          key={`v${i}`}
          y1={0}
          y2={mapH}
          x1={(mapW / 8) * (i + 1)}
          x2={(mapW / 8) * (i + 1)}
          stroke="#2d5a3d"
          strokeOpacity={0.08}
          strokeWidth={1}
        />
      ))}

      {/* 心愿点（空心橙圈） */}
      {project(wishPoints, mapW, mapH, mapPad).map((p, i) => (
        <circle
          key={`w${i}`}
          cx={p.x}
          cy={p.y}
          r={6}
          fill="none"
          stroke="#c98a3c"
          strokeWidth={1.6}
          strokeOpacity={0.8}
        />
      ))}

      {/* 旅程连线 */}
      {linePath && (
        <path
          d={linePath}
          fill="none"
          stroke="url(#pg-line)"
          strokeWidth={2.2}
          strokeOpacity={0.75}
          strokeDasharray="2 7"
          strokeLinecap="round"
        />
      )}

      {/* 已去点（实心绿点 + 光晕） */}
      {proj.map((p, i) => (
        <g key={`c${i}`}>
          <circle cx={p.x} cy={p.y} r={9} fill="#2d5a3d" fillOpacity={0.14} />
          <circle cx={p.x} cy={p.y} r={4.5} fill="#2d5a3d" />
          {i === proj.length - 1 && (
            <circle
              cx={p.x}
              cy={p.y}
              r={4.5}
              fill="none"
              stroke="#c98a3c"
              strokeWidth={2}
            />
          )}
        </g>
      ))}

      {/* 点位不足时，补几颗装饰星 */}
      {proj.length < 2 &&
        Array.from({ length: 14 }).map((_, i) => {
          const sx = ((i * 97) % (mapW - 40)) + 20
          const sy = ((i * 53) % (mapH - 40)) + 20
          return <circle key={`s${i}`} cx={sx} cy={sy} r={1.4} fill="#2d5a3d" fillOpacity={0.25} />
        })}
    </svg>
  )

  if (isPostcard) {
    const topPlaces = visited.slice(0, 4)
    return (
      <div ref={ref} style={shared}>
        {wordmark}
        <div style={{ padding: '40px 48px 0' }}>
          <p style={{ fontSize: 14, letterSpacing: 2, color: '#2d5a3d', fontWeight: 700 }}>
            TRAVEL POSTCARD
          </p>
          <h1
            style={{
              margin: '6px 0 0',
              fontSize: 46,
              lineHeight: 1.1,
              fontWeight: 700,
              color: '#1f2d24',
            }}
          >
            {ownerName} 的旅行明信片
          </h1>
          <p style={{ margin: '10px 0 0', fontSize: 15, color: '#5b6b60' }}>
            共 {visited.length} 段旅程 · 走过 {cities.size} 座城市 · 到访 {countries.size} 个国家
          </p>
        </div>

        <div style={{ padding: '18px 48px 0' }}>{mapDecor}</div>

        <div
          style={{
            position: 'absolute',
            left: 48,
            bottom: 30,
            right: 48,
            display: 'flex',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          {topPlaces.map((c) => (
            <div
              key={c.id}
              style={{
                flex: '1 1 0',
                minWidth: 150,
                background: 'rgba(255,255,255,0.7)',
                border: '1px solid rgba(45,90,61,0.15)',
                borderRadius: 12,
                padding: '10px 12px',
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1f2d24' }}>
                {c.place_name}
              </div>
              <div style={{ fontSize: 12, color: '#5b6b60', marginTop: 2 }}>
                {c.visit_date ? format(new Date(c.visit_date), 'yyyy.MM', { locale: zhCN }) : '—'} · {cityOf(c)}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // 年鉴（竖向）
  const stats = [
    { label: '打卡', value: String(visited.length) },
    { label: '城市', value: String(cities.size) },
    { label: '国家', value: String(countries.size) },
    { label: '心愿', value: String(checkins.length - visited.length) },
  ]
  const yearList = Array.from(
    new Set(visited.map((c) => (c.visit_date ? String(new Date(c.visit_date).getFullYear()) : ''))),
  )
    .filter(Boolean)
    .sort()
  const yearLabel = yearList.length ? `${yearList[0]}–${yearList[yearList.length - 1]}` : '旅行年鉴'
  const topPlaces = visited.slice(0, 6)

  return (
    <div ref={ref} style={shared}>
      {wordmark}
      <div style={{ padding: '44px 32px 0', textAlign: 'center' }}>
        <p style={{ fontSize: 13, letterSpacing: 3, color: '#2d5a3d', fontWeight: 700 }}>
          MY TRAVEL YEARBOOK
        </p>
        <h1 style={{ margin: '8px 0 0', fontSize: 36, fontWeight: 700 }}>
          {ownerName} 的{yearLabel}
        </h1>
      </div>

      <div style={{ padding: '22px 32px 0' }}>{mapDecor}</div>

      <div style={{ display: 'flex', gap: 10, padding: '20px 32px 0' }}>
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              flex: 1,
              background: 'rgba(255,255,255,0.7)',
              border: '1px solid rgba(45,90,61,0.15)',
              borderRadius: 14,
              padding: '12px 0',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 28, fontWeight: 700, color: '#2d5a3d' }}>
              {s.value}
            </div>
            <div style={{ fontSize: 12, color: '#5b6b60', marginTop: 2 }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div style={{ padding: '18px 32px 0' }}>
        <div style={{ fontSize: 13, letterSpacing: 2, color: '#2d5a3d', fontWeight: 700, marginBottom: 8 }}>
          高光足迹
        </div>
        {topPlaces.map((c, i) => (
          <div
            key={c.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 0',
              borderBottom:
                i === topPlaces.length - 1 ? 'none' : '1px solid rgba(45,90,61,0.1)',
            }}
          >
            <span style={{ fontSize: 13, color: '#2d5a3d', fontWeight: 700, width: 22 }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#1f2d24', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {c.place_name}
              </div>
              <div style={{ fontSize: 12, color: '#5b6b60' }}>
                {c.visit_date ? format(new Date(c.visit_date), 'yyyy.MM', { locale: zhCN }) : '—'} · {cityOf(c)}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 18,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: 11,
          color: '#8a988d',
        }}
      >
        用「脚印地图」记录每一次出发
      </div>
    </div>
  )
})
