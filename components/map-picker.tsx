'use client'
import { useEffect, useRef, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import { Navigation } from 'lucide-react'

interface Props {
  initialLat: number | null
  initialLng: number | null
  onChange: (lat: number, lng: number) => void
}

export default function MapPicker({ initialLat, initialLng, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const onChangeRef = useRef(onChange)
  const [finding, setFinding] = useState(false)

  onChangeRef.current = onChange

  useEffect(() => {
    if (!containerRef.current) return
    let mounted = true

    import('leaflet').then(({ default: L }) => {
      if (!mounted || mapRef.current) return

      // Webpack'in kırdığı ikonları düzelt
      const Icon = L.Icon.Default as any
      delete Icon.prototype._getIconUrl
      L.Icon.Default.mergeOptions({
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      })

      const center: [number, number] = initialLat && initialLng
        ? [initialLat, initialLng]
        : [39.9255, 32.8663]

      const map = L.map(containerRef.current!).setView(center, initialLat && initialLng ? 17 : 6)
      mapRef.current = map

      const geoapifyKey = process.env.NEXT_PUBLIC_GEOAPIFY_API_KEY
      L.tileLayer(
        geoapifyKey
          ? `https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey=${geoapifyKey}`
          : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { maxZoom: 20, attribution: '© OpenStreetMap' }
      ).addTo(map)

      function placeMarker(lat: number, lng: number) {
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng])
        } else {
          markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(map)
          markerRef.current.on('dragend', () => {
            const p = markerRef.current.getLatLng()
            onChangeRef.current(p.lat, p.lng)
          })
        }
        onChangeRef.current(lat, lng)
      }

      if (initialLat && initialLng) placeMarker(initialLat, initialLng)

      map.on('click', (e: any) => placeMarker(e.latlng.lat, e.latlng.lng))

      ;(mapRef.current as any).__place = placeMarker
    })

    return () => {
      mounted = false
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
        markerRef.current = null
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function findMyLocation() {
    if (!navigator.geolocation) return
    setFinding(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        setFinding(false)
        const { latitude, longitude } = pos.coords
        if (mapRef.current) {
          mapRef.current.setView([latitude, longitude], 18)
          ;(mapRef.current as any).__place?.(latitude, longitude)
        }
      },
      () => setFinding(false),
      { timeout: 10000 }
    )
  }

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="w-full h-full" />
      <button
        type="button"
        onClick={findMyLocation}
        disabled={finding}
        className="absolute top-3 right-3 z-[1000] bg-white rounded-xl shadow-md border border-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 flex items-center gap-1.5 hover:bg-blue-50 hover:text-blue-600 transition-colors disabled:opacity-60"
      >
        <Navigation className="h-4 w-4 text-blue-500" />
        {finding ? 'Aranıyor…' : 'Konumu Bul'}
      </button>
    </div>
  )
}
