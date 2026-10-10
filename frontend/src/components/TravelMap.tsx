import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadTMapGL, createMap, LBSError } from '@/lib/tencent-lbs'
import type { Checkin } from '@/lib/types'
import { useTranslation } from 'react-i18next'
import { Route } from 'lucide-react'

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
    <circle cx="24" cy="24" r="20" fill="oklch(0.45 0.10 155 / 0.20)">
      <animate attributeName="r" values="13;22;13" dur="2s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.45;0.10;0.45" dur="2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="24" cy="24" r="7" fill="oklch(0.45 0.10 155)" stroke="#ffffff" stroke-width="3"/>
  </svg>`
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
  /** 路线连线开关与当前缩放（用于聚合重算） */
  const [showRoute, setShowRoute] = useState(true)
  const [zoom, setZoom] = useState(4)
  const routeRef = useRef<any>(null)

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
        try {
          map.on('zoom_change', () => setZoom(map.getZoom()))
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
          geometries.push({
            id: `__cluster__${idx}`,
            styleId: styleKey,
            position: new TMap.LatLng(g.lat, g.lng),
            properties: { cluster: true, lat: g.lat, lng: g.lng },
          })
        }
      })

      const markerLayer = new TMap.MultiMarker({ map, styles, geometries })
      markerLayer.on('click', (evt: any) => {
        const p = evt?.geometry?.properties
        if (!p) return
        if (p.cluster) {
          map.setCenter(new TMap.LatLng(p.lat, p.lng))
          try {
            map.setZoom(Math.min((map.getZoom?.() ?? 4) + 2, 18))
          } catch {}
        } else if (p.id != null) {
          navigate(`${linkPrefix}${p.id}`)
        }
      })
      markersRef.current = markerLayer

      // 新增打卡时自动缩放到包含所有足迹
      if (checkins.length > fittedCountRef.current) {
        fitToCheckins(checkins)
      }
      fittedCountRef.current = checkins.length
    } catch (e) {
      // 标记渲染失败不应阻塞地图
      console.warn('marker render failed', e)
    }
  }, [checkins, status, navigate, linkPrefix, zoom])

  // 已去点按时间顺序连成路线（可开关）
  useEffect(() => {
    const map = mapRef.current
    if (!map || status !== 'ready') return
    try {
      routeRef.current?.setMap?.(null)
    } catch {}
    routeRef.current = null
    if (!showRoute) return
    try {
      const visitedSorted = [...checkins]
        .filter((c) => c.status === 'visited' && c.visit_date)
        .sort((a, b) => (a.visit_date || '').localeCompare(b.visit_date || ''))
      if (visitedSorted.length < 2) return
      const TMap = (window as any).TMap
      const path = visitedSorted.map((c) => new TMap.LatLng(c.lat, c.lng))
      const polyline = new TMap.MultiPolyline({
        map,
        geometries: [{ id: 'route', paths: path, styleId: 'route' }],
        styles: {
          route: new TMap.PolylineStyle({
            color: '#2D5A3D',
            width: 4,
            borderColor: '#ffffff',
            borderWidth: 1,
            showArrow: true,
          }),
        },
      })
      routeRef.current = polyline
    } catch (e) {
      console.warn('route render failed', e)
    }
  }, [checkins, status, showRoute])

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

      {/* 图例 + 路线开关（左上） */}
      {status === 'ready' && (
        <div className="absolute left-3 top-3 z-[1010] flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setShowRoute((v) => !v)}
            className="glass flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{ color: showRoute ? 'var(--primary)' : 'var(--muted-foreground)' }}
          >
            <Route className="h-3.5 w-3.5" />
            {t('路线')} {showRoute ? t('开') : t('关')}
          </button>
          <div className="glass space-y-1 rounded-xl px-3 py-2 text-[11px]" style={{ color: 'var(--foreground)' }}>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#2D5A3D' }} /> {t('已去过')}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#C46A3D' }} /> {t('想去')}
            </div>
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#2D5A3D', boxShadow: '0 0 0 3px color-mix(in oklab, var(--primary) 25%, transparent)' }} /> {t('我的位置')}
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
