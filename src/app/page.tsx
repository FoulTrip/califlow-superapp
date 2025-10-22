"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import MapSection, { MapSectionRef } from "@/components/maps/Map"
import AnalyticsSidebar from "@/components/sidebar/AnalyticsSidebar"
import AlertSystem from "@/components/alerts/AlertSystem"
import LocationStatus from "@/components/tracking/LocationStatus"
import { CALI_POIS_SEED } from "@/data/caliPois"

export default function Home() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [isRouteActive, setIsRouteActive] = useState(false)
  const mapRef = useRef<MapSectionRef>(null)
  const searchParams = useSearchParams()

  // Actualizar ubicación del usuario periódicamente
  useEffect(() => {
    const updateLocation = () => {
      const location = mapRef.current?.getUserLocation()
      if (location) {
        setUserLocation(location)
      }
    }

    updateLocation()
    const interval = setInterval(updateLocation, 5000) // Actualizar cada 5 segundos
    return () => clearInterval(interval)
  }, [])

  // Manejar parámetros de query para iniciar rutas automáticamente
  useEffect(() => {
    const placeParam = searchParams.get('place')
    console.log('🔍 Verificando parámetros de URL. placeParam:', placeParam, 'mapRef.current existe:', !!mapRef.current)

    if (placeParam && mapRef.current) {
      console.log('🔍 Detectado parámetro place en URL:', placeParam)

      // Buscar el POI correspondiente
      const poi = CALI_POIS_SEED.find(p => p.externalId === placeParam)
      console.log('🔍 Buscando POI con externalId:', placeParam)
      console.log('🔍 Total POIs disponibles:', CALI_POIS_SEED.length)
      console.log('🔍 Primeros 5 externalIds:', CALI_POIS_SEED.slice(0, 5).map(p => p.externalId))

      if (poi) {
        console.log('✅ POI encontrado:', poi.name, 'en', poi.latitude, poi.longitude, 'externalId:', poi.externalId)

        // Esperar a que el mapa esté listo y luego iniciar la ruta
        const startRoute = () => {
          console.log('⏰ Ejecutando startRoute después del delay')
          if (mapRef.current) {
            console.log('🚗 Iniciando ruta automática a:', poi.name)
            // Usar el método expuesto del hook para calcular ruta
            const mapComponent = mapRef.current as any
            console.log('🔧 mapComponent métodos disponibles:', Object.getOwnPropertyNames(mapComponent.__proto__ || {}))
            if (mapComponent.calculateRouteToDestination) {
              console.log('✅ Llamando calculateRouteToDestination con destino:', { lat: poi.latitude, lng: poi.longitude })
              mapComponent.calculateRouteToDestination({
                lat: poi.latitude,
                lng: poi.longitude
              })
            } else {
              console.warn('❌ Método calculateRouteToDestination no disponible en mapComponent')
              console.log('❌ mapComponent:', mapComponent)
            }
          } else {
            console.warn('❌ mapRef.current no disponible en startRoute')
          }
        }

        console.log('⏰ Programando startRoute en 3 segundos...')
        // Intentar iniciar la ruta después de un pequeño delay para asegurar que el mapa esté listo
        setTimeout(startRoute, 3000)
      } else {
        console.warn('❌ POI no encontrado para externalId:', placeParam)
        console.warn('❌ POIs disponibles con externalId similar:', CALI_POIS_SEED.filter(p => p.externalId.includes('cristo')).map(p => p.externalId))
      }
    } else if (placeParam && !mapRef.current) {
      console.warn('❌ placeParam existe pero mapRef.current no está disponible aún')
    }
  }, [searchParams])

  // Callback para cuando llega una alerta
  const handleAlert = useCallback((zone: string) => {
    // Destacar la zona en el mapa
    mapRef.current?.highlightZone(zone)
  }, [])

  // Callback para cuando cambia el estado de la ruta
  const handleRouteChange = useCallback((isActive: boolean) => {
    setIsRouteActive(isActive)
  }, [])

  // Callback para cancelar la ruta
  const handleCancelRoute = useCallback(() => {
    mapRef.current?.clearRoute()
  }, [])

  // Callback para toggle de voz
  const handleToggleVoice = useCallback(() => {
    setVoiceEnabled(prev => !prev)
  }, [])

  return (
    <main className="relative h-screen overflow-hidden pt-16">
      {/* Sistema de Alertas (Toast notifications + Audio) */}
      <AlertSystem onAlert={handleAlert} />

      {/* Estado de Location Tracking */}
      <LocationStatus />

      {/* Mapa - ajusta su ancho según el estado del sidebar */}
      <div
        className={`transition-all duration-300 h-full grow ${
          isSidebarCollapsed ? 'mr-0' : 'mr-0'
        }`}
      >
        <MapSection
          ref={mapRef}
          voiceEnabled={voiceEnabled}
          onRouteChange={handleRouteChange}
        />
      </div>

      {/* Sidebar de Analytics */}
      <AnalyticsSidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        userLocation={userLocation}
        isRouteActive={isRouteActive}
        onCancelRoute={handleCancelRoute}
        voiceEnabled={voiceEnabled}
        onToggleVoice={handleToggleVoice}
      />
    </main>
  )
}
