"use client"

import { useEffect, useState } from "react"
import { Line } from "react-chartjs-2"
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from "chart.js"
import useMovementDetection, { type MovementType } from "@/hooks/useMovementDetection"
import useSpeech from "@/hooks/useSpeech"

// Registrar componentes de Chart.js
ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
)

interface AnalyticsSummary {
    activeTourists: number
    busiestZone: string
    peakHour: string
    trend: number[]
}

interface AnalyticsSidebarProps {
    isCollapsed: boolean
    onToggle: () => void
    userLocation: { lat: number; lng: number } | null
    isRouteActive?: boolean
    onCancelRoute?: () => void
    voiceEnabled?: boolean
    onToggleVoice?: () => void
}

function AnalyticsSidebar({
    isCollapsed,
    onToggle,
    userLocation,
    isRouteActive = false,
    onCancelRoute,
    voiceEnabled = true,
    onToggleVoice
}: AnalyticsSidebarProps) {
    const [data, setData] = useState<AnalyticsSummary>({
        activeTourists: 0,
        busiestZone: "-",
        peakHour: "-",
        trend: []
    })
    const [isLoading, setIsLoading] = useState(true)

    // Detectar tipo de movimiento
    const movementData = useMovementDetection(userLocation)

    // Hook de speech
    const { isSupported } = useSpeech()

    // Función para obtener icono según tipo de movimiento
    const getMovementIcon = (type: MovementType) => {
        switch (type) {
            case 'stationary': return '🧍'
            case 'walking': return '🚶'
            case 'running': return '🏃'
            case 'driving': return '🚗'
            default: return '❓'
        }
    }

    // Función para obtener texto según tipo de movimiento
    const getMovementText = (type: MovementType) => {
        switch (type) {
            case 'stationary': return 'Estacionario'
            case 'walking': return 'Caminando'
            case 'running': return 'Corriendo'
            case 'driving': return 'En Vehículo'
            default: return 'Detectando...'
        }
    }

    // Función para obtener color según tipo de movimiento
    const getMovementColor = (type: MovementType) => {
        switch (type) {
            case 'stationary': return 'bg-gray-100 text-gray-700 border-gray-200'
            case 'walking': return 'bg-green-100 text-green-700 border-green-200'
            case 'running': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
            case 'driving': return 'bg-blue-100 text-blue-700 border-blue-200'
            default: return 'bg-gray-100 text-gray-500 border-gray-200'
        }
    }

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const mockData: AnalyticsSummary = {
                    activeTourists: Math.floor(Math.random() * 500) + 100,
                    busiestZone: ["Centro", "Granada", "San Fernando", "Ciudad Jardín"][Math.floor(Math.random() * 4)],
                    peakHour: `${Math.floor(Math.random() * 12) + 1}:00 ${Math.random() > 0.5 ? 'PM' : 'AM'}`,
                    trend: Array.from({ length: 12 }, () => Math.floor(Math.random() * 400) + 50)
                }

                setData(mockData)
                setIsLoading(false)
            } catch (error) {
                console.error('Error fetching analytics:', error)
                setIsLoading(false)
            }
        }

        fetchAnalytics()
        const interval = setInterval(fetchAnalytics, 30000)
        return () => clearInterval(interval)
    }, [])

    const chartData = {
        labels: Array.from({ length: 12 }, (_, i) => `-${60 - i * 5}m`),
        datasets: [
            {
                label: 'Turistas',
                data: data.trend,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.05)',
                tension: 0.4,
                fill: true,
                pointRadius: 0,
                borderWidth: 1.5
            }
        ]
    }

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false },
            tooltip: {
                enabled: true,
                backgroundColor: '#1f2937',
                padding: 8,
                titleColor: '#f9fafb',
                bodyColor: '#f9fafb',
                displayColors: false,
                cornerRadius: 6
            }
        },
        scales: {
            x: { display: false },
            y: { display: false }
        }
    }

    return (
        <>
            {isCollapsed && (
                <button
                    onClick={onToggle}
                    className="fixed top-20 right-6 z-50 bg-white hover:bg-gray-50 text-gray-700 p-3 rounded-lg shadow-sm border border-gray-200 transition-all duration-200 grow"
                    aria-label="Abrir panel"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                </button>
            )}

            {/* Sidebar */}
            <div
                className={`fixed top-16 right-0 h-[calc(100vh-4rem)] bg-white shadow-lg transition-all duration-300 z-40 overflow-y-auto border-l border-gray-100 ${isCollapsed ? 'w-0' : 'w-full sm:w-80'
                    }`}
            >
                <div className={`p-6 ${isCollapsed ? 'hidden' : 'block'}`}>
                    {/* Header */}
                    <div className="flex justify-between items-center mb-8">
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">Analytics</h2>
                            <p className="text-xs text-gray-500 mt-0.5">Datos en tiempo real</p>
                        </div>
                        <button
                            onClick={onToggle}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            aria-label="Cerrar panel"
                        >
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="flex justify-center items-center h-64">
                            <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-200 border-t-blue-600"></div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Detector de Movimiento */}
                            <div className={`rounded-lg p-5 border-2 ${getMovementColor(movementData.type)}`}>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="text-4xl">
                                            {getMovementIcon(movementData.type)}
                                        </div>
                                        <div>
                                            <span className="text-sm font-semibold block">
                                                {getMovementText(movementData.type)}
                                            </span>
                                            <span className="text-xs opacity-75">
                                                {movementData.speed.toFixed(1)} km/h
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-xs opacity-75 mb-1">Confianza</div>
                                        <div className="text-lg font-bold">{movementData.confidence}%</div>
                                    </div>
                                </div>
                                {movementData.distance > 0 && (
                                    <div className="mt-3 pt-3 border-t border-current border-opacity-20">
                                        <div className="flex justify-between text-xs opacity-75">
                                            <span>Distancia recorrida</span>
                                            <span className="font-semibold">{movementData.distance.toFixed(0)}m</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Controles: Botón de Voz y Cancelar Ruta */}
                            <div className="space-y-2">
                                {/* Botón de control de voz */}
                                {isSupported && onToggleVoice && (
                                    <button
                                        onClick={onToggleVoice}
                                        className={`
                                            w-full px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                                            flex items-center justify-center gap-2 shadow-sm
                                            ${voiceEnabled
                                                ? 'bg-blue-500 text-white hover:bg-blue-600'
                                                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                                            }
                                        `}
                                        title={voiceEnabled ? 'Desactivar voz' : 'Activar voz'}
                                    >
                                        {voiceEnabled ? (
                                            <>
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0A9.972 9.972 0 0119 10a9.972 9.972 0 01-2.929 7.071 1 1 0 01-1.414-1.414A7.971 7.971 0 0017 10c0-2.21-.894-4.208-2.343-5.657a1 1 0 010-1.414zm-2.829 2.828a1 1 0 011.415 0A5.983 5.983 0 0115 10a5.984 5.984 0 01-1.757 4.243 1 1 0 01-1.415-1.415A3.984 3.984 0 0013 10a3.983 3.983 0 00-1.172-2.828 1 1 0 010-1.415z" clipRule="evenodd" />
                                                </svg>
                                                <span>Voz Activada</span>
                                            </>
                                        ) : (
                                            <>
                                                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                                </svg>
                                                <span>Voz Desactivada</span>
                                            </>
                                        )}
                                    </button>
                                )}

                                {/* Botón de cancelar ruta */}
                                {isRouteActive && onCancelRoute && (
                                    <button
                                        onClick={onCancelRoute}
                                        className="w-full px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200
                                            flex items-center justify-center gap-2 shadow-sm
                                            bg-red-500 text-white hover:bg-red-600"
                                        title="Cancelar ruta activa"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        <span>Cancelar Ruta</span>
                                    </button>
                                )}
                            </div>

                            {/* Turistas Activos */}
                            <div className="bg-gray-50 rounded-lg p-5 border border-gray-100">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-medium text-gray-700">Turistas Activos</span>
                                    </div>
                                </div>
                                <p className="text-3xl font-semibold text-gray-900 mb-1">{data.activeTourists.toLocaleString()}</p>
                                <p className="text-xs text-gray-500">Actualizado hace 30s</p>
                            </div>

                            {/* Zona Más Concurrida */}
                            <div className="bg-gray-50 rounded-lg p-5 border border-gray-100">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                                            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-medium text-gray-700">Zona Más Concurrida</span>
                                    </div>
                                </div>
                                <p className="text-2xl font-semibold text-gray-900 mb-1">{data.busiestZone}</p>
                                <p className="text-xs text-gray-500">En este momento</p>
                            </div>

                            {/* Peak Hour */}
                            <div className="bg-gray-50 rounded-lg p-5 border border-gray-100">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                                            <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <span className="text-sm font-medium text-gray-700">Hora Pico</span>
                                    </div>
                                </div>
                                <p className="text-2xl font-semibold text-gray-900 mb-1">{data.peakHour}</p>
                                <p className="text-xs text-gray-500">Mayor afluencia hoy</p>
                            </div>

                            {/* Gráfico de Tendencia */}
                            <div className="bg-white rounded-lg p-5 border border-gray-200">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-sm font-medium text-gray-700">Tendencia (60 min)</span>
                                    <span className="text-xs text-gray-400">Actualización: 5 min</span>
                                </div>
                                <div className="h-32">
                                    <Line data={chartData} options={chartOptions} />
                                </div>
                            </div>

                            {/* Info adicional */}
                            <div className="pt-2 pb-1">
                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                    <span>Sistema operativo</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Overlay móvil */}
            {!isCollapsed && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-20 z-30 sm:hidden backdrop-blur-sm"
                    onClick={onToggle}
                ></div>
            )}
        </>
    )
}

export default AnalyticsSidebar