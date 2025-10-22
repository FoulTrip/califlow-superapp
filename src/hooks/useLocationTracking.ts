import { useEffect, useRef, useCallback } from 'react'
import { useSocket } from '@/context/SocketContext'

interface LocationTrackingOptions {
    enabled: boolean
    interval?: number // Intervalo en milisegundos (default: 30000 = 30 segundos)
    highAccuracy?: boolean
    maxAge?: number
    timeout?: number
}

interface LocationData {
    latitude: number
    longitude: number
    accuracy?: number
    altitude?: number | null
    activityType?: 'walking' | 'driving' | 'stationary'
}

export function useLocationTracking(options: LocationTrackingOptions) {
    const { socket, isConnected } = useSocket()
    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const lastPositionRef = useRef<GeolocationPosition | null>(null)

    const {
        enabled = false,
        interval = 30000, // 30 segundos por defecto
        highAccuracy = true,
        maxAge = 5000,
        timeout = 10000,
    } = options

    // Detectar tipo de actividad basado en velocidad y cambio de posición
    const detectActivityType = useCallback((position: GeolocationPosition): 'walking' | 'driving' | 'stationary' => {
        if (!lastPositionRef.current) {
            return 'stationary'
        }

        const speed = position.coords.speed || 0 // metros por segundo

        if (speed < 0.5) return 'stationary'
        if (speed < 5) return 'walking' // menos de 18 km/h
        return 'driving' // más de 18 km/h
    }, [])

    // Enviar ubicación al servidor
    const sendLocation = useCallback((position: GeolocationPosition) => {
        if (!socket || !isConnected) {
            console.warn('Socket not connected, skipping location update')
            return
        }

        const activityType = detectActivityType(position)

        const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            activityType,
        }

        // Enviar ubicación vía WebSocket
        socket.emit('track-location', locationData)

        console.log('📍 Location sent:', locationData)

        // Guardar última posición para detectar actividad
        lastPositionRef.current = position
    }, [socket, isConnected, detectActivityType])

    // Obtener ubicación actual
    const trackCurrentLocation = useCallback(() => {
        if (!navigator.geolocation) {
            console.error('Geolocation is not supported by this browser')
            return
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                sendLocation(position)
            },
            (error) => {
                console.error('Error getting location:', error.message)
            },
            {
                enableHighAccuracy: highAccuracy,
                maximumAge: maxAge,
                timeout: timeout,
            }
        )
    }, [sendLocation, highAccuracy, maxAge, timeout])

    // Efecto principal: iniciar/detener tracking
    useEffect(() => {
        if (!enabled || !socket || !isConnected) {
            // Limpiar intervalo si está activo
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
            return
        }

        // Enviar ubicación inmediatamente
        trackCurrentLocation()

        // Configurar intervalo para enviar ubicación periódicamente
        intervalRef.current = setInterval(() => {
            trackCurrentLocation()
        }, interval)

        // Escuchar respuestas del servidor
        socket.on('track-location-success', (data) => {
            console.log('✅ Location tracked successfully:', data)
        })

        socket.on('track-location-error', (error) => {
            console.error('❌ Location tracking error:', error)
        })

        // Cleanup
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
            socket.off('track-location-success')
            socket.off('track-location-error')
        }
    }, [enabled, socket, isConnected, interval, trackCurrentLocation])

    return {
        trackNow: trackCurrentLocation,
        isTracking: enabled && isConnected,
    }
}
