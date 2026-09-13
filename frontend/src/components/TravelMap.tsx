import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { loadTMapGL, createMap, LBSError } from '@/lib/tencent-lbs'
import type { Checkin } from '@/lib/types'
import { categoryMeta } from '@/lib/categories'

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
    <circle cx="24" cy="24" r="20" fill="rgba(37,99,235,0.20)">
      <animate attributeName="r" values="13;22;13" dur="2s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.45;0.10;0.45" dur="2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="24" cy="24" r="7" fill="#2563eb" stroke="#ffffff" stroke-width="3"/>
  </svg>`
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
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

export default function TravelMap({
  checkins,
  center,
  height = 420,
  linkPrefix = '/checkin/',
  showUserLocation = true,
  fill = false,
  className,
}: TravelMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any>(null)
  const userMarkerRef = useRef<any>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null)
  const [locState, setLocState] = useState<LocState>('idle')
  const navigate = useNavigate()

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
        mapRef.current = map
        setStatus('ready')
      } catch (e) {
        if (cancelled) return
        setStatus('error')
        setErrorMsg(e instanceof LBSError ? e.message : '地图加载失败，请检查网络')
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

  // 同步标记点
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

      const styles: Record<string, any> = {}
      const geometries: any[] = []

      checkins.forEach((c) => {
        const meta = categoryMeta(c.category)
        if (!styles[meta.key]) {
          styles[meta.key] = new (window as any).TMap.MarkerStyle({
            width: 32,
            height: 40,
            src: pinSvg(meta.hex),
            anchor: { x: 16, y: 40 },
          })
        }
        geometries.push({
          id: String(c.id),
          styleId: meta.key,
          position: new (window as any).TMap.LatLng(c.lat, c.lng),
          properties: { id: c.id },
        })
      })

      const markerLayer = new (window as any).TMap.MultiMarker({
        map,
        styles,
        geometries,
      })
      markerLayer.on('click', (evt: any) => {
        const id = evt?.geometry?.properties?.id
        if (id != null) navigate(`${linkPrefix}${id}`)
      })
      markersRef.current = markerLayer
    } catch (e) {
      // 标记渲染失败不应阻塞地图
      console.warn('marker render failed', e)
    }
  }, [checkins, status, navigate, linkPrefix])

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
      style={fill ? undefined : { height, border: '1px solid var(--border)', background: 'var(--secondary)' }}
    >
      <div ref={containerRef} className="h-full w-full" />

      {/* 定位按钮 */}
      {showUserLocation && status === 'ready' && (
        <div className="absolute right-3 top-3 z-10 flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={handleLocateClick}
            title="定位我的位置"
            aria-label="定位我的位置"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-black/5 bg-white/95 shadow-md backdrop-blur transition hover:scale-105 hover:bg-white"
          >
            {locState === 'locating' ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" fill="#2563eb" stroke="none" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
                <circle cx="12" cy="12" r="8" />
              </svg>
            )}
          </button>
          {locState === 'denied' && (
            <span className="rounded-md bg-black/70 px-2 py-1 text-[11px] text-white shadow">
              定位被拒绝，可重试
            </span>
          )}
          {locState === 'unsupported' && (
            <span className="rounded-md bg-black/70 px-2 py-1 text-[11px] text-white shadow">
              当前环境不支持定位
            </span>
          )}
        </div>
      )}

      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
          地图加载中…
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 8m0 9V8m0 0L9 7" />
          </svg>
          <span className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {errorMsg}
          </span>
          <button
            type="button"
            onClick={() => setInitNonce((n) => n + 1)}
            className="mt-1 rounded-full px-4 py-1.5 text-sm font-medium"
            style={{ background: 'var(--primary)', color: 'var(--primary-foreground)' }}
          >
            重新加载地图
          </button>
          <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
            打卡列表与新增打卡不受影响
          </span>
        </div>
      )}
    </div>
  )
}
