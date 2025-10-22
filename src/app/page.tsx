"use client"

import { useState, useRef, useCallback } from "react"
import MapSection, { MapSectionRef } from "@/components/maps/Map"
import AnalyticsSidebar from "@/components/sidebar/AnalyticsSidebar"
import AlertSystem from "@/components/alerts/AlertSystem"
import LocationStatus from "@/components/tracking/LocationStatus"

export default function Home() {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const mapRef = useRef<MapSectionRef>(null)

  // Callback para cuando llega una alerta
  const handleAlert = useCallback((zone: string) => {
    // Destacar la zona en el mapa
    mapRef.current?.highlightZone(zone)
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
        <MapSection ref={mapRef} />
      </div>

      {/* Sidebar de Analytics */}
      <AnalyticsSidebar
        isCollapsed={isSidebarCollapsed}
        onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
    </main>
  )
}
