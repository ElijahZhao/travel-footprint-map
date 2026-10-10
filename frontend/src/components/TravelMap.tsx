import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadTMapGL, createMap, LBSError } from '@/lib/tencent-lbs'
import type { Checkin } from '@/lib/types'
import { useTranslation } from 'react-i18next'
import { Route, ChevronRight, X, Navigation, Play } from 'lucide-react'

/** 生成带分类配色的地图大头针（SVG data URI） */
function pinSvg(hex: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
    <path d="M16 0C7.16 0 0 7.16 0 16c0 11.5 16 24 16 24s16-12.5 16-24C32 7.16 24.84 0 16 0z" fill="${hex}"/>
    <circle cx="16" cy="16" r="6" fill="#ffffff"/>
  </svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/** 生成「我的位置」蓝色脉冲圆点（SVG data URI，带呼吸动画） */
function userDotSvg(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
    <circle cx="24" cy="24" r="20" fill="rgba(47,111,237,0.22)">
      <animate attributeName="r" values="13;22;13" dur="2s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.45;0.10;0.45" dur="2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="24" cy="24" r="7" fill="#2F6FED" stroke="#ffffff" stroke-width="3"/>
  </svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/** 在 A、B 之间生成一条轻轻拱起的弧线（二次贝塞尔），返回 LatLng 稠密点列 */
function curvedSegment(TMap: any, a: { lat: number; lng: number }, b: { lat: number; lng: number }, steps = 36): any[] {
  const dLat = b.lat - a.lat
  const dLng = b.lng - a.lng
  const dist = Math.hypot(dLat, dLng)
  const bow = dist * 0.16
  const nLat = -dLng / (dist || 1)
  const nLng = dLat / (dist || 1)
  const ctrl = { lat: (a.lat + b.lat) / 2 + nLat * bow, lng: (a.lng + b.lng) / 2 + nLng * bow }
  const pts: any[] = []
  for (let s = 0; s <= steps; s++) {
    const t = s / steps
    const lat = (1 - t) * (1 - t) * a.lat + 2 * (1 - t) * t * ctrl.lat + t * t * b.lat
    const lng = (1 - t) * (1 - t) * a.lng + 2 * (1 - t) * t * ctrl.lng + t * t * b.lng
    pts.push(new TMap.LatLng(lat, lng))
  }
  return pts
}

/** 段中点的航向角（屏幕顺时针角度，0 = 正北），用于箭头贴纸旋转 */
function segmentAngleDeg(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dx = (b.lng - a.lng) * Math.cos((((a.lat + b.lat) / 2) * Math.PI) / 180)
  const dy = b.lat - a.lat
  return (Math.atan2(dx, dy) * 180) / Math.PI
}

/** 指向正北的小纸飞机箭头（角度直接烘进 SVG，保证看得见） */
function arrowSvg(angle: number): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
    <g transform="rotate(${angle.toFixed(1)} 12 12)">
      <path d="M12 3.5L19 21l-7-4.2L5 21z" fill="#3E6B52" stroke="#ffffff" stroke-width="1.6" stroke-linejoin="round"/>
    </g>
  </svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/** 礼花粒子（新打卡点绽放一次的金色星屑） */
function burstSvg(): string {
  const colors = ['#D9A441', '#C46A3D', '#4E7D61', '#E0A3A3']
  const parts: string[] = []
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    const x = 24 + Math.cos(a) * 16
    const y = 24 + Math.sin(a) * 16
    parts.push(
      `<circle cx="24" cy="24" r="2.6" fill="${colors[i % colors.length]}">
        <animate attributeName="cx" from="24" to="${x.toFixed(1)}" dur="0.6s" fill="freeze" begin="0.05s"/>
        <animate attributeName="cy" from="24" to="${y.toFixed(1)}" dur="0.6s" fill="freeze" begin="0.05s"/>
        <animate attributeName="opacity" from="1" to="0" dur="1s" fill="freeze"/>
      </circle>`,
    )
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">${parts.join('')}</svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/** 生成聚合气泡（带数量文字） */
function clusterSvg(count: number, color: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
    <circle cx="22" cy="22" r="20" fill="${color}" stroke="#ffffff" stroke-width="3"/>
    <text x="22" y="23" font-size="16" font-weight="700" fill="#ffffff" text-anchor="middle" dominant-baseline="central" font-family="Inter, system-ui, sans-serif">${count}</text>
  </svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/** 纸飞机图标（路线生长动画里沿轨迹飞行的角色） */
function planeSvg(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24">
    <path d="M2 21l21-9L2 3v7l15 2-15 2z" fill="#2D5A3D" stroke="#ffffff" stroke-width="1.4" stroke-linejoin="round"/>
  </svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/** 金色涟漪（纸飞机途经打卡点时绽放一圈） */
function pulseSvg(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56">
    <circle cx="28" cy="28" r="6" fill="none" stroke="#D9A441" stroke-width="3">
      <animate attributeName="r" from="6" to="26" dur="0.8s" fill="freeze"/>
      <animate attributeName="opacity" from="0.9" to="0" dur="0.8s" fill="freeze"/>
    </circle>
  </svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/** 按网格把相近的打卡聚成一簇，缩放越大格子越小（点越分散） */
function clusterCheckins(list: Checkin[], zoom: number): Array<{ cluster: boolean; items: Checkin[]; lat: number; lng: number }> {
  const cell = zoom >= 11 ? 0.05 : zoom >= 9 ? 0.15 : zoom >= 7 ? 0.5 : 1.5
  const map = new Map<string, Checkin[]>()
  for (const c of list) {
    const key = `${Math.floor(c.lat / cell)}_${Math.floor(c.lng / cell)}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(c)
  }
  return Array.from(map.values()).map((items) => {
    const lat = items.reduce((a, c) => a + c.lat, 0) / items.length
    const lng = items.reduce((a, c) => a + c.lng, 0) / items.length
    return { cluster: items.length > 1, items, lat, lng }
  })
}

interface TravelMapProps {
  checkins: Checkin[]
  /** 未传则默认中国中心 */
  center?: { lat: number; lng: number }
  height?: number
  /** 点击标记跳转的链接前缀，默认 /checkin/ */
  linkPrefix?: string
  /** 是否显示用户当前位置（定位按钮 + 蓝色圆点），默认 true */
  showUserLocation?: boolean
  /** 铺满父容器（绝对定位 inset-0），用于移动端全屏地图 */
  fill?: boolean
  /** 附加 className（覆盖默认布局样式） */
  className?: string
}

type LocState = 'idle' | 'locating' | 'ready' | 'denied' | 'unsupported' | 'error'

/** 判断当前环境是否支持 WebGL —— 腾讯地图 GL 渲染的硬性前提。 */
function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

/** 把底层异常翻译成用户能看懂、且指向真实原因的提示。 */
function describeMapError(e: unknown): string {
  if (e instanceof LBSError) return e.message
  const msg = e instanceof Error ? e.message : String(e ?? '')
  if (/isWebGL2|webgl|createContext/i.test(msg) || !hasWebGL()) {
    return '当前浏览器未启用 WebGL，无法渲染地图。请更换浏览器或开启硬件加速后重试'
  }
  if (/timeout|network|fetch/i.test(msg)) {
    return '地图服务连接超时，请检查网络后重试'
  }
  return '地图加载失败，请重试'
}

export default function TravelMap({
  checkins,
  center,
  height = 420,
  linkPrefix = '/checkin/',
  showUserLocation = true,
  fill = false,
  className,
}: TravelMapProps) {
  const { t } = useTranslation()
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any>(null)
  const userMarkerRef = useRef<any>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null)
  const [locState, setLocState] = useState<LocState>('idle')
  const navigate = useNavigate()
  /** 已框进视野的足迹数量，仅在新增时重新缩放到全部标记，避免浏览时镜头乱跳 */
  const fittedCountRef = useRef(0)
  /** 路线连线开关、箭头开关与当前缩放（用于聚合重算） */
  const [showRoute, setShowRoute] = useState(true)
  const [routeArrow, setRouteArrow] = useState(true)
  const [zoom, setZoom] = useState(4)
  const routeRef = useRef<any>(null)
  /** 箭头贴纸层（每个弧段中点一枚旋转对准航向的小纸飞机） */
  const arrowsRef = useRef<any>(null)
  /** 涟漪层（动画途经打卡点时绽放） */
  const pulseRef = useRef<any>(null)
  /** 路线生长动画相关（纸飞机沿时间顺序飞行，可反复播放） */
  const [playing, setPlaying] = useState(false)
  /** 静态路线是否已就绪（>=2 个已去点），用于控制箭头/动画按钮显隐 */
  const [routeReady, setRouteReady] = useState(false)
  const routePathRef = useRef<any[]>([])
  /** 每个打卡点在稠密路径中的下标（动画涟漪用） */
  const stopDenseRef = useRef<number[]>([])
  const animRafRef = useRef(0)
  const animLineRef = useRef<any>(null)
  const planeRef = useRef<any>(null)
  /** 各聚合簇包含的打卡（供点击数字圈时弹出清单） */
  const groupsRef = useRef<Record<number, Checkin[]>>({})
  /** 已知打卡 id（用于检测新增并放礼花） */
  const knownIdsRef = useRef<Set<number>>(new Set())
  /** 当前展开的聚合清单（同地点多个打卡时使用） */
  const [clusterItems, setClusterItems] = useState<Checkin[] | null>(null)
  /** 左上角控制面板收起/展开（记住用户选择） */
  const [panelOpen, setPanelOpen] = useState(() => {
    try {
      return localStorage.getItem('map-panel-open') === '1'
    } catch {
      return false
    }
  })
  const togglePanel = () =>
    setPanelOpen((v) => {
      try {
        localStorage.setItem('map-panel-open', v ? '0' : '1')
      } catch {}
      return !v
    })

  /** 把所有足迹缩放进视野；只有单点时给个合适缩放 */
  const fitToCheckins = useCallback((list: Checkin[]) => {
    const map = mapRef.current
    if (!map || list.length === 0) return
    const TMap = (window as any).TMap
    try {
      if (list.length === 1) {
        const c = list[0]
        map.setCenter(new TMap.LatLng(c.lat, c.lng))
        map.setZoom(12)
        return
      }
      let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180
      list.forEach((c) => {
        minLat = Math.min(minLat, c.lat)
        maxLat = Math.max(maxLat, c.lat)
        minLng = Math.min(minLng, c.lng)
        maxLng = Math.max(maxLng, c.lng)
      })
      const sw = new TMap.LatLng(minLat, minLng)
      const ne = new TMap.LatLng(maxLat, maxLng)
      if (TMap.LatLngBounds) {
        map.fitBounds(new TMap.LatLngBounds(sw, ne), { padding: 80 })
      } else {
        throw new Error('no LatLngBounds')
      }
    } catch {
      // 兜底：居中到所有点的几何中心
      if (list.length) {
        const c = list[Math.floor(list.length / 2)]
        map.setCenter(new TMap.LatLng(c.lat, c.lng))
      }
    }
  }, [])

  const recenterToUser = useCallback((lat?: number, lng?: number) => {
    const map = mapRef.current
    if (!map) return
    const la = lat ?? userPos?.lat
    const lo = lng ?? userPos?.lng
    if (la == null || lo == null) return
    const TMap = (window as any).TMap
    map.setCenter(new TMap.LatLng(la, lo))
    if ((map.getZoom?.() ?? 0) < 8) map.setZoom(12)
  }, [userPos])

  // 仅获取定位并落点，不主动改变地图视野（用于自动定位）
  const locateOnly = useCallback((onGot?: (lat: number, lng: number) => void) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setLocState('unsupported')
      return
    }
    setLocState('locating')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setUserPos({ lat, lng })
        setLocState('ready')
        onGot?.(lat, lng)
      },
      (err) => {
        setLocState(err.code === err.PERMISSION_DENIED ? 'denied' : 'error')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }, [])

  // 初始化地图（可重试）
  const [initNonce, setInitNonce] = useState(0)
  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setErrorMsg('')
    ;(async () => {
      try {
        await loadTMapGL()
        if (cancelled || !containerRef.current) return
        const center_ =
          center ??
          (checkins[0]
            ? { lat: checkins[0].lat, lng: checkins[0].lng }
            : { lat: 35.0, lng: 105.0 })
        const map = createMap(containerRef.current, {
          center: center_,
          zoom: checkins.length ? 5 : 4,
        })
        // 收起 SDK 默认的方向罗盘与缩放按钮：手机端捏合缩放、双指旋转即可完成，
        // 同时避免它们与页面右上/右侧浮层互相遮挡（root cause of control overlap）。
        try {
          const ids = (window as any).TMap?.constants?.DEFAULT_CONTROL_ID
          if (ids) {
            map.removeControl?.(ids.ROTATION)
            map.removeControl?.(ids.ZOOM)
          }
        } catch {}
        mapRef.current = map
        // 聚合重算用防抖的缩放值：捏合缩放期间标记层保持稳定，点击不会落在重建中的层上
        try {
          let zoomTimer: ReturnType<typeof setTimeout> | null = null
          map.on('zoom_change', () => {
            if (zoomTimer) clearTimeout(zoomTimer)
            zoomTimer = setTimeout(() => setZoom(map.getZoom()), 250)
          })
        } catch {}
        setStatus('ready')
      } catch (e) {
        if (cancelled) return
        setStatus('error')
        setErrorMsg(describeMapError(e))
      }
    })()
    return () => {
      cancelled = true
      cancelAnimationFrame(animRafRef.current)
      try {
        animLineRef.current?.setMap?.(null)
      } catch {}
      animLineRef.current = null
      try {
        planeRef.current?.setMap?.(null)
      } catch {}
      planeRef.current = null
      try {
        arrowsRef.current?.setMap?.(null)
      } catch {}
      arrowsRef.current = null
      try {
        pulseRef.current?.setMap?.(null)
      } catch {}
      pulseRef.current = null
      try {
        userMarkerRef.current?.setMap?.(null)
      } catch {}
      userMarkerRef.current = null
      try {
        markersRef.current?.setMap?.(null)
      } catch {}
      markersRef.current = null
      try {
        routeRef.current?.setMap?.(null)
      } catch {}
      routeRef.current = null
      try {
        mapRef.current?.destroy()
      } catch {}
      mapRef.current = null
    }
  }, [initNonce]) // eslint-disable-line react-hooks/exhaustive-deps

  // 地图就绪后自动尝试定位一次（仅落点，不改变视野）
  useEffect(() => {
    if (status === 'ready' && showUserLocation && locState === 'idle') {
      locateOnly()
    }
  }, [status, showUserLocation, locState, locateOnly])

  // 同步标记点（含聚合）
  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== 'ready') return
    try {
      // 销毁旧标记层，重新创建（简单可靠）
      if (markersRef.current) {
        try {
          markersRef.current.setMap(null)
        } catch {}
        markersRef.current = null
      }

      const TMap = (window as any).TMap
      const groups = clusterCheckins(checkins, zoom)
      groupsRef.current = {}
      const styles: Record<string, any> = {}
      const geometries: any[] = []

      groups.forEach((g, idx) => {
        if (!g.cluster) {
          const c = g.items[0]
          const isWish = c.status === 'wish'
          const styleKey = isWish ? 'wish' : 'visited'
          if (!styles[styleKey]) {
            styles[styleKey] = new TMap.MarkerStyle({
              width: 32,
              height: 40,
              src: pinSvg(isWish ? '#C46A3D' : '#2D5A3D'),
              anchor: { x: 16, y: 40 },
            })
          }
          geometries.push({
            id: String(c.id),
            styleId: styleKey,
            position: new TMap.LatLng(c.lat, c.lng),
            properties: { id: c.id, cluster: false },
          })
        } else {
          const allWish = g.items.every((c) => c.status === 'wish')
          const allVisited = g.items.every((c) => c.status === 'visited')
          const color = allWish ? '#C46A3D' : allVisited ? '#2D5A3D' : '#7A6F63'
          const styleKey = `cluster-${idx}`
          styles[styleKey] = new TMap.MarkerStyle({
            width: 44,
            height: 44,
            src: clusterSvg(g.items.length, color),
            anchor: { x: 22, y: 22 },
          })
          groupsRef.current[idx] = g.items
          geometries.push({
            id: `__cluster__${idx}`,
            styleId: styleKey,
            position: new TMap.LatLng(g.lat, g.lng),
            properties: { cluster: true, idx, lat: g.lat, lng: g.lng },
          })
        }
      })

      const markerLayer = new TMap.MultiMarker({ map, styles, geometries })
      markerLayer.on('click', (evt: any) => {
        // 双保险：properties 取不到时从几何 id 反解簇序号
        let p = evt?.geometry?.properties
        const gid: string = evt?.geometry?.id ?? ''
        if (!p && gid.startsWith('__cluster__')) {
          p = { cluster: true, idx: Number(gid.slice('__cluster__'.length)) }
        }
        if (!p) return
        if (p.cluster) {
          const items = groupsRef.current[p.idx]
          // 同一地点的多个打卡（坐标几乎相同）放大也拆不开，直接弹出清单；
          // 已经放大到较深层级仍是一簇的，同样弹清单，避免「点不动」。
          const sameSpot = items?.every(
            (c) => Math.abs(c.lat - items[0].lat) < 0.002 && Math.abs(c.lng - items[0].lng) < 0.002,
          )
          if (items && (sameSpot || (map.getZoom?.() ?? 0) >= 13)) {
            setClusterItems(items)
            return
          }
          map.setCenter(new TMap.LatLng(p.lat, p.lng))
          try {
            map.setZoom(Math.min((map.getZoom?.() ?? 4) + 2, 18))
          } catch {}
        } else if (p.id != null) {
          navigate(`${linkPrefix}${p.id}`)
        }
      })
      markersRef.current = markerLayer

      // 新增打卡时自动缩放到包含所有足迹；并给新点放一朵礼花
      const known = knownIdsRef.current
      const newOnes = known.size ? checkins.filter((c) => !known.has(c.id)) : []
      if (checkins.length > fittedCountRef.current) {
        fitToCheckins(checkins)
      }
      fittedCountRef.current = checkins.length
      knownIdsRef.current = new Set(checkins.map((c) => c.id))
      if (newOnes.length && checkins.length > newOnes.length) {
        try {
          const burstLayer = new TMap.MultiMarker({
            map,
            styles: {
              burst: new TMap.MarkerStyle({ width: 48, height: 48, src: burstSvg(), anchor: { x: 24, y: 24 } }),
            },
            geometries: newOnes.map((c) => ({
              id: `__burst_${c.id}`,
              styleId: 'burst',
              position: new TMap.LatLng(c.lat, c.lng),
            })),
          })
          setTimeout(() => {
            try {
              burstLayer.setMap(null)
            } catch {}
          }, 1600)
        } catch {}
      }
    } catch (e) {
      // 标记渲染失败不应阻塞地图
      console.warn('marker render failed', e)
    }
  }, [checkins, status, navigate, linkPrefix, zoom])

  // 已去点按打卡时间顺序连成弧形航线（可开关；箭头贴纸可选；供生长动画复用）
  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== 'ready') return
    try {
      routeRef.current?.setMap?.(null)
    } catch {}
    try {
      arrowsRef.current?.setMap?.(null)
    } catch {}
    routeRef.current = null
    arrowsRef.current = null
    routePathRef.current = []
    setRouteReady(false)
    if (!showRoute) return
    try {
      const visitedSorted = [...checkins]
        .filter((c) => c.status === 'visited' && c.visit_date)
        .sort((a, b) => (a.visit_date || '').localeCompare(b.visit_date || ''))
      if (visitedSorted.length < 2) return
      const TMap = (window as any).TMap
      const stops = visitedSorted.map((c) => ({ lat: c.lat, lng: c.lng }))
      // 弧形稠密路径：相邻点之间轻轻拱起，像航空航线图
      const dense: any[] = []
      const stopDense: number[] = [0]
      for (let i = 1; i < stops.length; i++) {
        const seg = curvedSegment(TMap, stops[i - 1], stops[i])
        if (i > 1) seg.shift()
        dense.push(...seg)
        stopDense.push(dense.length - 1)
      }
      routePathRef.current = dense
      stopDenseRef.current = stopDense
      routeRef.current = new TMap.MultiPolyline({
        map,
        // 双层：柔光晕 + 带白衬边的实心弧线，动画与静态共用同一观感
        geometries: [
          { id: 'route-halo', paths: dense, styleId: 'route-halo' },
          { id: 'route-core', paths: dense, styleId: 'route-core' },
        ],
        styles: {
          'route-halo': new TMap.PolylineStyle({
            color: 'rgba(78,125,97,0.16)',
            width: 10,
            lineCap: 'round',
          }),
          'route-core': new TMap.PolylineStyle({
            color: '#3E6B52',
            width: 3.5,
            borderColor: '#ffffff',
            borderWidth: 1,
            lineCap: 'round',
          }),
        },
      })
      // 箭头贴纸：每个弧段中点一枚旋转对准航向的小纸飞机（大小固定，一定看得见）
      try {
        const styles: Record<string, any> = {}
        const geoms: any[] = []
        for (let i = 0; i < stops.length - 1; i++) {
          const k = `arrow-${i}`
          styles[k] = new TMap.MarkerStyle({
            width: 24,
            height: 24,
            src: arrowSvg(segmentAngleDeg(stops[i], stops[i + 1])),
            anchor: { x: 12, y: 12 },
          })
          geoms.push({
            id: `__arrow_${i}`,
            styleId: k,
            position: new TMap.LatLng((stops[i].lat + stops[i + 1].lat) / 2, (stops[i].lng + stops[i + 1].lng) / 2),
          })
        }
        arrowsRef.current = new TMap.MultiMarker({ map, styles, geometries: geoms })
      } catch (e) {
        console.warn('arrow render failed', e)
      }
      setRouteReady(true)
    } catch (e) {
      console.warn('route render failed', e)
    }
  }, [checkins, status, showRoute, routeArrow])

  /** 路线生长动画：纸飞机从第一个打卡点沿弧形航线飞到最后一个点，可反复播放 */
  const playRouteAnim = useCallback(() => {
    const map = mapRef.current
    const TMap = (window as any).TMap
    const dense = routePathRef.current
    const stopDense = stopDenseRef.current
    if (!map || !TMap || dense.length < 2 || stopDense.length < 2) return
    cancelAnimationFrame(animRafRef.current)
    try { animLineRef.current?.setMap?.(null) } catch {}
    try { planeRef.current?.setMap?.(null) } catch {}
    try { pulseRef.current?.setMap?.(null) } catch {}
    animLineRef.current = null
    planeRef.current = null
    pulseRef.current = null
    // 藏起静态线与箭头，让「生长」不被剧透
    try { routeRef.current?.setMap?.(null) } catch {}
    try { arrowsRef.current?.setMap?.(null) } catch {}
    setPlaying(true)
    const animLine = new TMap.MultiPolyline({
      map,
      geometries: [
        { id: 'anim-halo', paths: [dense[0]], styleId: 'anim-halo' },
        { id: 'anim-core', paths: [dense[0]], styleId: 'anim-core' },
      ],
      styles: {
        'anim-halo': new TMap.PolylineStyle({ color: 'rgba(78,125,97,0.16)', width: 10, lineCap: 'round' }),
        'anim-core': new TMap.PolylineStyle({
          color: '#3E6B52',
          width: 3.5,
          borderColor: '#ffffff',
          borderWidth: 1,
          lineCap: 'round',
        }),
      },
    })
    animLineRef.current = animLine
    const planeLayer = new TMap.MultiMarker({
      map,
      styles: {
        plane: new TMap.MarkerStyle({ width: 30, height: 30, src: planeSvg(), anchor: { x: 15, y: 15 } }),
      },
      geometries: [{ id: 'plane', styleId: 'plane', position: dense[0] }],
    })
    planeRef.current = planeLayer
    // 纸飞机途经打卡点时绽放一圈金色涟漪
    const pulses: any[] = []
    let crossed = 0
    const pulseLayer = new TMap.MultiMarker({
      map,
      styles: {
        pulse: new TMap.MarkerStyle({ width: 56, height: 56, src: pulseSvg(), anchor: { x: 28, y: 28 } }),
      },
      geometries: [],
    })
    pulseRef.current = pulseLayer
    const duration = Math.min(9000, 2500 + dense.length * 10)
    const start = performance.now()
    const cleanup = () => {
      try { animLine.setMap(null) } catch {}
      try { planeLayer.setMap(null) } catch {}
      try { pulseLayer.setMap(null) } catch {}
      if (animLineRef.current === animLine) animLineRef.current = null
      if (planeRef.current === planeLayer) planeRef.current = null
      if (pulseRef.current === pulseLayer) pulseRef.current = null
      // 恢复静态航线与箭头
      try { routeRef.current?.setMap?.(map) } catch {}
      try { arrowsRef.current?.setMap?.(map) } catch {}
    }
    const tick = (now: number) => {
      const frac = Math.min(1, (now - start) / duration)
      const eased = frac < 0.5 ? 2 * frac * frac : 1 - Math.pow(-2 * frac + 2, 2) / 2
      const idx = Math.max(1, Math.round(eased * (dense.length - 1)))
      try {
        animLine.updateGeometries([
          { id: 'anim-halo', paths: dense.slice(0, idx + 1), styleId: 'anim-halo' },
          { id: 'anim-core', paths: dense.slice(0, idx + 1), styleId: 'anim-core' },
        ])
        planeLayer.updateGeometries([{ id: 'plane', styleId: 'plane', position: dense[idx] }])
        while (crossed < stopDense.length && stopDense[crossed] <= idx) {
          pulses.push({ id: `__pulse_${crossed}`, styleId: 'pulse', position: dense[stopDense[crossed]] })
          crossed++
        }
        if (pulses.length) pulseLayer.updateGeometries([...pulses])
      } catch {}
      if (frac < 1) {
        animRafRef.current = requestAnimationFrame(tick)
      } else {
        // 停在终点一瞬再收场
        setTimeout(() => {
          setPlaying(false)
          cleanup()
        }, 500)
      }
    }
    animRafRef.current = requestAnimationFrame(tick)
  }, [showRoute])

  // 同步「我的位置」标记
  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== 'ready' || !userPos) return
    try {
      if (userMarkerRef.current) {
        try {
          userMarkerRef.current.setMap(null)
        } catch {}
        userMarkerRef.current = null
      }
      const TMap = (window as any).TMap
      const style = new TMap.MarkerStyle({
        width: 48,
        height: 48,
        src: userDotSvg(),
        anchor: { x: 24, y: 24 },
      })
      const layer = new TMap.MultiMarker({
        map,
        styles: { user: style },
        geometries: [
          {
            id: '__user__',
            styleId: 'user',
            position: new TMap.LatLng(userPos.lat, userPos.lng),
          },
        ],
      })
      userMarkerRef.current = layer
    } catch (e) {
      console.warn('user marker render failed', e)
    }
  }, [userPos, status])

  const handleLocateClick = () => {
    if (userPos) recenterToUser()
    else locateOnly((lat, lng) => recenterToUser(lat, lng))
  }

  return (
    <div
      className={
        fill
          ? `absolute inset-0 overflow-hidden ${className ?? ''}`
          : `relative w-full overflow-hidden rounded-2xl ${className ?? ''}`
      }
      // isolation:isolate 建立独立层叠上下文，把腾讯地图 SDK 内部注入的高 z-index 图层
      // （它自带 z-index:1000 的全屏空壳 div）关在本容器内，避免它拦截外层界面按钮的点击。
      style={
        fill
          ? { isolation: 'isolate', zIndex: 0 }
          : { height, border: '1px solid var(--border)', background: 'var(--secondary)', isolation: 'isolate' }
      }
    >
      <div ref={containerRef} className="h-full w-full" />

      {/* 图例 + 路线控制（左上，可收起展开） */}
      {status === 'ready' && !panelOpen && (
        <div className="absolute left-3 top-3 z-[1010]">
          <button
            type="button"
            onClick={togglePanel}
            aria-label={t('打开路线面板')}
            className="glass flex h-10 w-10 items-center justify-center rounded-full transition active:scale-95"
            style={{ color: 'var(--primary)' }}
          >
            <Route className="h-5 w-5" />
          </button>
        </div>
      )}
      {status === 'ready' && panelOpen && (
        <div className="absolute left-3 top-3 z-[1010] flex max-w-[64%] flex-col items-start gap-2">
          <div className="glass w-full space-y-2 rounded-2xl p-3">
            {/* 面板头：标题 + 收起 */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold" style={{ color: 'var(--foreground)' }}>
                {t('路线与图例')}
              </span>
              <button
                type="button"
                onClick={togglePanel}
                aria-label={t('收起面板')}
                className="flex h-6 w-6 items-center justify-center rounded-full"
                style={{ color: 'var(--muted-foreground)' }}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowRoute((v) => !v)}
              className="flex w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{ background: showRoute ? 'color-mix(in oklab, var(--primary) 12%, transparent)' : 'transparent', color: showRoute ? 'var(--primary)' : 'var(--muted-foreground)' }}
            >
              <Route className="h-3.5 w-3.5" />
              {showRoute ? t('隐藏路线') : t('打开路线')}
            </button>
            {showRoute && routeReady && (
              <>
                <button
                  type="button"
                  onClick={() => setRouteArrow((v) => !v)}
                  className="flex w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
                  style={{ background: routeArrow ? 'color-mix(in oklab, var(--primary) 12%, transparent)' : 'transparent', color: routeArrow ? 'var(--primary)' : 'var(--muted-foreground)' }}
                >
                  <Navigation className="h-3.5 w-3.5" />
                  {routeArrow ? t('隐藏箭头') : t('显示箭头')}
                </button>
                <button
                  type="button"
                  onClick={playRouteAnim}
                  disabled={playing}
                  className="flex w-full items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-60"
                  style={{ background: 'color-mix(in oklab, var(--primary) 12%, transparent)', color: 'var(--primary)' }}
                >
                  <Play className="h-3.5 w-3.5" />
                  {playing ? t('动画播放中…') : t('播放路线动画')}
                </button>
              </>
            )}
            <div className="space-y-1 border-t pt-2 text-[11px]" style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#2D5A3D' }} /> {t('已去过')}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#C46A3D' }} /> {t('想去')}
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#2F6FED', boxShadow: '0 0 0 3px rgba(47,111,237,0.22)' }} /> {t('我的位置')}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 聚合清单：点击数字圈弹出，可进入单条详情 */}
      {clusterItems && (
        <div className="absolute inset-x-3 bottom-3 z-[1010]">
          <div
            className="max-h-72 overflow-hidden rounded-2xl border bg-white/95 shadow-lg backdrop-blur"
            style={{ borderColor: 'var(--border)' }}
          >
            <div className="flex items-center justify-between border-b px-4 py-2.5" style={{ borderColor: 'var(--border)' }}>
              <span className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>
                {t('{{n}} 条足迹', { n: clusterItems.length })}
              </span>
              <button
                type="button"
                onClick={() => setClusterItems(null)}
                aria-label={t('关闭')}
                className="flex h-6 w-6 items-center justify-center rounded-full"
                style={{ color: 'var(--muted-foreground)' }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-56 overflow-auto">
              {clusterItems.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => navigate(`${linkPrefix}${c.id}`)}
                  className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left hover:bg-[var(--secondary)]"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: c.status === 'wish' ? '#C46A3D' : '#2D5A3D' }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                      {c.place_name}
                    </span>
                    {c.visit_date && (
                      <span className="block text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
                        {c.visit_date}
                      </span>
                    )}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0" style={{ color: 'var(--muted-foreground)' }} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 定位按钮：置于右下（底部入口卡之上），避开顶部浮层区 */}
      {showUserLocation && status === 'ready' && (
        <div className="absolute bottom-[96px] right-3 z-[1010] flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={handleLocateClick}
            title={t('定位我的位置')}
            aria-label={t('定位我的位置')}
            className="glass flex h-10 w-10 items-center justify-center rounded-full transition active:scale-95"
            style={{ color: 'var(--primary)' }}
          >
            {locState === 'locating' ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" fill="var(--primary)" stroke="none" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                <circle cx="12" cy="12" r="8" />
              </svg>
            )}
          </button>
          {locState === 'denied' && (
            <span className="rounded-md bg-black/70 px-2 py-1 text-[11px] text-white shadow">
              {t('定位被拒绝，可重试')}
            </span>
          )}
          {locState === 'unsupported' && (
            <span className="rounded-md bg-black/70 px-2 py-1 text-[11px] text-white shadow">
              {t('当前环境不支持定位')}
            </span>
          )}
        </div>
      )}

      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
          {t('地图加载中…')}
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 8m0 9V8m0 0L9 7" />
          </svg>
          <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {t(errorMsg)}
          </span>
          <button
            type="button"
            onClick={() => setInitNonce((n) => n + 1)}
            className="mt-1 rounded-full px-4 py-1.5 text-sm font-medium"
            style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
          >
            {t('重新加载地图')}
          </button>
          <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            {t('打卡列表与新增打卡不受影响')}
          </span>
        </div>
      )}
    </div>
  )
}
