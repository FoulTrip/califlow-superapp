"use client"

import useMaps from "@/hooks/useMaps"
import { forwardRef, useImperativeHandle, useEffect } from "react"
import RouteNotifications from "@/components/notifications/RouteNotifications"

export interface MapSectionRef {
    highlightZone: (zoneName: string) => void
    getUserLocation: () => { lat: number; lng: number } | null
    clearRoute: () => void
    getIsRouteActive: () => boolean
}

interface MapSectionProps {
    voiceEnabled?: boolean
    onRouteChange?: (isActive: boolean) => void
}

const MapSection = forwardRef<MapSectionRef, MapSectionProps>(({ voiceEnabled = true, onRouteChange }, ref) => {
    const { mapRef, isRouteActive, userLocation, currentDestination, clearRoute } = useMaps(ref)

    // Exponer métodos adicionales
    useImperativeHandle(ref, () => ({
        highlightZone: (zoneName: string) => {
            // Este método ya está implementado en useMaps
            console.log('highlightZone llamado desde Map.tsx')
        },
        getUserLocation: () => userLocation,
        clearRoute,
        getIsRouteActive: () => isRouteActive
    }), [userLocation, clearRoute, isRouteActive])

    // Notificar al padre cuando cambia el estado de la ruta
    useEffect(() => {
        if (onRouteChange) {
            onRouteChange(isRouteActive)
        }
    }, [isRouteActive, onRouteChange])

    return (
        <>
            <div ref={mapRef} className="w-full h-full" />
            <RouteNotifications
                isRouteActive={isRouteActive}
                userLocation={userLocation}
                destination={currentDestination}
                voiceEnabled={voiceEnabled}
            />
        </>
    )
})

MapSection.displayName = 'MapSection'

export default MapSection