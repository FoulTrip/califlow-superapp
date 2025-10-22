"use client"

import { useSocket } from "@/context/SocketContext"

function LocationStatus() {
    const { isConnected, isTracking, lastLocation } = useSocket()

    if (!isConnected && !isTracking) {
        return null // No mostrar nada si no está conectado
    }

    return (
        <div className="fixed bottom-4 left-4 z-40">
            <div className="bg-white rounded-lg shadow-lg p-4 border-2 border-gray-200 max-w-xs">
                {/* Estado de conexión */}
                <div className="flex items-center gap-2 mb-2">
                    <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                    <span className="text-sm font-semibold text-gray-700">
                        {isConnected ? 'Conectado' : 'Desconectado'}
                    </span>
                </div>

                {/* Estado de tracking */}
                {isTracking && (
                    <div className="flex items-center gap-2 mb-2">
                        <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        <span className="text-sm text-gray-600">
                            Tracking activo (cada 30s)
                        </span>
                    </div>
                )}

                {/* Última ubicación */}
                {lastLocation && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                        <div className="text-xs text-gray-500 space-y-1">
                            <div className="flex justify-between">
                                <span className="font-medium">Lat:</span>
                                <span className="font-mono">{lastLocation.latitude.toFixed(6)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="font-medium">Lng:</span>
                                <span className="font-mono">{lastLocation.longitude.toFixed(6)}</span>
                            </div>
                            {lastLocation.accuracy && (
                                <div className="flex justify-between">
                                    <span className="font-medium">Precisión:</span>
                                    <span>{lastLocation.accuracy.toFixed(0)}m</span>
                                </div>
                            )}
                            {lastLocation.activityType && (
                                <div className="flex justify-between">
                                    <span className="font-medium">Actividad:</span>
                                    <span className="capitalize">
                                        {lastLocation.activityType === 'walking' && '🚶 Caminando'}
                                        {lastLocation.activityType === 'driving' && '🚗 Conduciendo'}
                                        {lastLocation.activityType === 'stationary' && '🧍 Estacionario'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

export default LocationStatus
