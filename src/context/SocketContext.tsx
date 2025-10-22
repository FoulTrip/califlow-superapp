"use client"

import { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from "react"
import { io, Socket } from "socket.io-client"
import { useSession } from "next-auth/react"

interface CongestionAlert {
    zone: string
    level: number
    timestamp: string
    message: string
}

interface LocationData {
    latitude: number
    longitude: number
    accuracy?: number
    altitude?: number | null
    activityType?: 'walking' | 'driving' | 'stationary'
    userId?: string
}

interface SocketContextType {
    socket: Socket | null
    isConnected: boolean
    currentAlert: CongestionAlert | null
    isTracking: boolean
    lastLocation: LocationData | null
}

const SocketContext = createContext<SocketContextType>({
    socket: null,
    isConnected: false,
    currentAlert: null,
    isTracking: false,
    lastLocation: null
})

export const useSocket = () => useContext(SocketContext)

interface SocketProviderProps {
    children: ReactNode
}

export function SocketProvider({ children }: SocketProviderProps) {
    const { data: session } = useSession()
    const [socket, setSocket] = useState<Socket | null>(null)
    const [isConnected, setIsConnected] = useState(false)
    const [currentAlert, setCurrentAlert] = useState<CongestionAlert | null>(null)
    const [isTracking, setIsTracking] = useState(false)
    const [lastLocation, setLastLocation] = useState<LocationData | null>(null)

    const intervalRef = useRef<NodeJS.Timeout | null>(null)
    const lastPositionRef = useRef<GeolocationPosition | null>(null)

    // Obtener userId de la sesión
    const userId = session?.user?.id || null

    // Detectar tipo de actividad basado en velocidad
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
            return
        }

        if (!userId) {
            console.warn('⚠️ No userId available, skipping location update')
            return
        }

        const activityType = detectActivityType(position)

        const locationData: LocationData = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude,
            activityType,
            userId,
        }

        // Enviar ubicación vía WebSocket
        socket.emit('track-location', locationData)

        console.log('📍 Location sent:', locationData)

        // Guardar última ubicación y posición
        setLastLocation(locationData)
        lastPositionRef.current = position
    }, [socket, isConnected, detectActivityType, userId])

    // Obtener ubicación actual
    const trackCurrentLocation = useCallback(() => {
        if (!navigator.geolocation) {
            console.error('Geolocation is not supported by this browser')
            setIsTracking(false)
            return
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                sendLocation(position)
            },
            (error) => {
                console.error('Error getting location:', error.message)
                setIsTracking(false)
                // Intentar nuevamente después de un breve retraso si es timeout
                if (error.code === error.TIMEOUT) {
                    setTimeout(() => {
                        if (isTracking) {
                            trackCurrentLocation()
                        }
                    }, 5000) // Reintentar en 5 segundos
                }
            },
            {
                enableHighAccuracy: true,
                maximumAge: 5000,
                timeout: 15000, // Aumentar timeout a 15 segundos
            }
        )
    }, [sendLocation, isTracking])

    // Efecto para manejar la conexión Socket.IO
    useEffect(() => {
        // Verificar si Socket.IO está habilitado
        const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL

        if (!socketUrl) {
            console.log('ℹ️ Socket.IO no configurado (NEXT_PUBLIC_SOCKET_URL no definido)')
            return
        }

        // Solo conectar si hay userId disponible
        if (!userId) {
            console.log('⏳ Esperando userId de la sesión...')
            return
        }

        // Conectar a Socket.IO server con userId en auth
        const socketInstance = io(socketUrl, {
            transports: ["websocket", "polling"],
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 3, // Reducir intentos de reconexión
            timeout: 5000, // Timeout de 5 segundos
            auth: {
                userId: userId
            }
        })

        console.log('🔌 Conectando Socket.IO con userId:', userId)

        socketInstance.on("connect", () => {
            console.log("✅ Socket.IO conectado:", socketInstance.id)
            setIsConnected(true)
        })

        socketInstance.on("disconnect", () => {
            console.log("❌ Socket.IO desconectado")
            setIsConnected(false)
            setIsTracking(false)
        })

        socketInstance.on("connect_error", (error) => {
            console.warn("⚠️ Socket.IO no disponible:", error.message)
            setIsConnected(false)
        })

        // Escuchar eventos de congestion_alert
        socketInstance.on("congestion_alert", (alert: CongestionAlert) => {
            console.log("🚨 Alerta de congestión recibida:", alert)
            setCurrentAlert(alert)
        })

        // Escuchar respuestas de location tracking
        socketInstance.on('track-location-success', (data) => {
            console.log('✅ Location tracked successfully:', data)
        })

        socketInstance.on('track-location-error', (error) => {
            console.error('❌ Location tracking error:', error)
        })

        setSocket(socketInstance)

        // Cleanup
        return () => {
            socketInstance.disconnect()
        }
    }, [userId])

    // Efecto para iniciar location tracking automático
    useEffect(() => {
        if (!socket || !isConnected) {
            // Limpiar intervalo si está activo
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
            setIsTracking(false)
            return
        }

        // Iniciar tracking automáticamente cuando se conecta
        setIsTracking(true)

        // Enviar ubicación inmediatamente
        trackCurrentLocation()

        // Configurar intervalo para enviar ubicación cada 30 segundos
        intervalRef.current = setInterval(() => {
            trackCurrentLocation()
        }, 30000) // 30 segundos

        console.log('🌍 Location tracking iniciado (cada 30 segundos)')

        // Cleanup
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current)
                intervalRef.current = null
            }
            setIsTracking(false)
        }
    }, [socket, isConnected, trackCurrentLocation])

    return (
        <SocketContext.Provider value={{ socket, isConnected, currentAlert, isTracking, lastLocation }}>
            {children}
        </SocketContext.Provider>
    )
}
