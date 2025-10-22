import { useState, useEffect, useRef } from 'react'

export type MovementType = 'stationary' | 'walking' | 'running' | 'driving' | 'unknown'

interface MovementData {
    type: MovementType
    speed: number // km/h
    distance: number // metros desde última posición
    confidence: number // 0-100
}

interface Position {
    lat: number
    lng: number
    timestamp: number
}

/**
 * Hook para detectar el tipo de movimiento del usuario
 * Basado en velocidad, aceleración y distancia recorrida
 */
export const useMovementDetection = (userLocation: { lat: number; lng: number } | null) => {
    const [movementData, setMovementData] = useState<MovementData>({
        type: 'unknown',
        speed: 0,
        distance: 0,
        confidence: 0
    })

    const positionHistoryRef = useRef<Position[]>([])
    const lastUpdateRef = useRef<number>(Date.now())

    // Calcular distancia entre dos puntos usando fórmula de Haversine
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371e3 // Radio de la Tierra en metros
        const φ1 = lat1 * Math.PI / 180
        const φ2 = lat2 * Math.PI / 180
        const Δφ = (lat2 - lat1) * Math.PI / 180
        const Δλ = (lon2 - lon1) * Math.PI / 180

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

        return R * c // Distancia en metros
    }

    // Calcular velocidad en km/h
    const calculateSpeed = (distance: number, timeSeconds: number): number => {
        if (timeSeconds === 0) return 0
        const metersPerSecond = distance / timeSeconds
        return metersPerSecond * 3.6 // Convertir a km/h
    }

    // Determinar tipo de movimiento basado en velocidad y distancia
    const determineMovementType = (speed: number, acceleration: number, totalDistance: number, historyLength: number): MovementType => {
        // Si la distancia total en las últimas mediciones es muy pequeña, está quieto
        // Considerando que GPS tiene precisión de ~5-10 metros
        const avgDistancePerReading = historyLength > 1 ? totalDistance / (historyLength - 1) : totalDistance

        console.log('📊 Análisis de movimiento:', {
            speed: speed.toFixed(2) + ' km/h',
            avgDistancePerReading: avgDistancePerReading.toFixed(2) + 'm',
            totalDistance: totalDistance.toFixed(2) + 'm',
            historyLength
        })

        // Velocidad en km/h
        // Criterios más estrictos para detectar estado estacionario
        if (speed < 0.8 && avgDistancePerReading < 5) {
            // Menos de 0.8 km/h Y movimiento menor a 5 metros = estacionario
            console.log('✅ Detectado: ESTACIONARIO (quieto)')
            return 'stationary'
        } else if (speed < 1.5 && totalDistance < 10) {
            // Velocidad muy baja y distancia total pequeña = probablemente quieto
            console.log('✅ Detectado: ESTACIONARIO (movimiento mínimo)')
            return 'stationary'
        } else if (speed >= 0.8 && speed < 6) {
            console.log('✅ Detectado: CAMINANDO')
            return 'walking'
        } else if (speed >= 6 && speed < 15) {
            // Verificar aceleración para distinguir entre correr y bicicleta
            if (acceleration > 2) {
                console.log('✅ Detectado: CORRIENDO (alta aceleración)')
                return 'running'
            }
            console.log('✅ Detectado: CORRIENDO')
            return 'running'
        } else if (speed >= 15) {
            console.log('✅ Detectado: EN VEHÍCULO')
            return 'driving'
        }
        console.log('⚠️ Estado desconocido')
        return 'unknown'
    }

    // Calcular confianza basada en cantidad de datos
    const calculateConfidence = (historyLength: number): number => {
        // Más puntos de datos = mayor confianza
        if (historyLength < 3) return 30
        if (historyLength < 5) return 50
        if (historyLength < 10) return 70
        return 90
    }

    useEffect(() => {
        if (!userLocation) return

        const now = Date.now()
        const newPosition: Position = {
            lat: userLocation.lat,
            lng: userLocation.lng,
            timestamp: now
        }

        // Agregar nueva posición al historial
        positionHistoryRef.current.push(newPosition)

        // Mantener solo las últimas 20 posiciones (aproximadamente 10 minutos a 30s por posición)
        if (positionHistoryRef.current.length > 20) {
            positionHistoryRef.current.shift()
        }

        // Necesitamos al menos 2 posiciones para calcular movimiento
        if (positionHistoryRef.current.length < 2) {
            setMovementData({
                type: 'unknown',
                speed: 0,
                distance: 0,
                confidence: 0
            })
            return
        }

        // Calcular movimiento usando las últimas 3 posiciones para mayor precisión
        const positions = positionHistoryRef.current.slice(-3)
        let totalDistance = 0
        let totalTime = 0
        const speeds: number[] = []

        for (let i = 1; i < positions.length; i++) {
            const prev = positions[i - 1]
            const curr = positions[i]

            const distance = calculateDistance(
                prev.lat,
                prev.lng,
                curr.lat,
                curr.lng
            )

            const timeSeconds = (curr.timestamp - prev.timestamp) / 1000

            totalDistance += distance
            totalTime += timeSeconds

            if (timeSeconds > 0) {
                speeds.push(calculateSpeed(distance, timeSeconds))
            }
        }

        // Calcular velocidad promedio
        const avgSpeed = speeds.length > 0
            ? speeds.reduce((a, b) => a + b, 0) / speeds.length
            : 0

        // Calcular aceleración (cambio de velocidad)
        const acceleration = speeds.length >= 2
            ? Math.abs(speeds[speeds.length - 1] - speeds[speeds.length - 2])
            : 0

        // Determinar tipo de movimiento
        const movementType = determineMovementType(avgSpeed, acceleration, totalDistance, positions.length)
        const confidence = calculateConfidence(positionHistoryRef.current.length)

        console.log('🚶 Movimiento detectado:', {
            type: movementType,
            speed: avgSpeed.toFixed(2) + ' km/h',
            distance: totalDistance.toFixed(2) + 'm',
            confidence: confidence + '%',
            positions: positionHistoryRef.current.length
        })

        setMovementData({
            type: movementType,
            speed: avgSpeed,
            distance: totalDistance,
            confidence
        })

        lastUpdateRef.current = now
    }, [userLocation])

    return movementData
}

export default useMovementDetection
