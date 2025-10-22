"use client"

import { useEffect, useState } from 'react'
import useSpeech from '@/hooks/useSpeech'

export interface Notification {
    id: string
    type: 'ai-suggestion' | 'event-alert' | 'route-update' | 'traffic-warning'
    title: string
    message: string
    icon: string
    timestamp: Date
    isVisible: boolean
    isExiting: boolean
}

interface RouteNotificationsProps {
    isRouteActive: boolean
    userLocation: { lat: number; lng: number } | null
    destination: { lat: number; lng: number } | null
    onClose?: (id: string) => void
    voiceEnabled?: boolean
}

const RouteNotifications = ({
    isRouteActive,
    userLocation,
    onClose,
    voiceEnabled = true
}: RouteNotificationsProps) => {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const { speak } = useSpeech()

    // Sugerencias de IA simuladas
    const aiSuggestions = [
        {
            title: "💡 Sugerencia de Gemini",
            message: "Hay un restaurante típico caleño a 200m de tu ruta con excelentes reseñas. ¿Te gustaría hacer una parada?",
            icon: "🍽️"
        },
        {
            title: "💡 Recomendación Gemini",
            message: "Detecté una tienda de artesanías local cerca. Perfecto para souvenirs auténticos.",
            icon: "🎨"
        },
        {
            title: "💡 Gemini Sugiere",
            message: "Hay un mirador con vista panorámica a 5 minutos. Vale la pena el desvío.",
            icon: "📸"
        },
        {
            title: "💡 Consejo Gemini",
            message: "Cafetería premium a tu izquierda con el mejor café de Cali según 500+ reseñas.",
            icon: "☕"
        },
        {
            title: "💡 Gemini Recomienda",
            message: "Zona segura para estacionar detectada 50m adelante. Tarifa económica.",
            icon: "🅿️"
        },
        {
            title: "💡 Sugerencia Inteligente",
            message: "Galería de arte contemporáneo abierta hasta las 8pm. Entrada gratuita hoy.",
            icon: "🖼️"
        }
    ]

    // Alertas de eventos cercanos
    const eventAlerts = [
        {
            title: "🎉 Evento Cercano",
            message: "Festival de Salsa en el Parque del Perro. Comienza en 30 minutos.",
            icon: "💃"
        },
        {
            title: "🎭 Evento Cultural",
            message: "Presentación de teatro al aire libre en San Antonio a las 7pm. Entrada libre.",
            icon: "🎭"
        },
        {
            title: "🎵 Música en Vivo",
            message: "Concierto de música del Pacífico en la Plaza de Cayzedo. Gratis.",
            icon: "🎸"
        },
        {
            title: "🍔 Festival Gastronómico",
            message: "Feria de comida típica cerca de tu ubicación. Hasta las 10pm.",
            icon: "🍴"
        },
        {
            title: "🎨 Exposición de Arte",
            message: "Inauguración de exposición en el Museo La Tertulia. Cóctel de bienvenida.",
            icon: "🖼️"
        },
        {
            title: "⚽ Partido de Fútbol",
            message: "Deportivo Cali vs América en el Pascual Guerrero. Comienza en 1 hora.",
            icon: "⚽"
        },
        {
            title: "🎪 Feria Artesanal",
            message: "Mercado de artesanías y productos locales en el Boulevard del Río.",
            icon: "🛍️"
        }
    ]

    // Advertencias de tráfico
    const trafficWarnings = [
        {
            title: "⚠️ Alerta de Tráfico",
            message: "Congestión moderada detectada 500m adelante. Tiempo estimado +5 min.",
            icon: "🚦"
        },
        {
            title: "🚧 Obra en la Vía",
            message: "Construcción vial reportada. Considera ruta alternativa para ahorrar tiempo.",
            icon: "🚧"
        },
        {
            title: "⚠️ Zona de Alto Flujo",
            message: "Área turística muy concurrida. Recomendamos estacionar y caminar.",
            icon: "🚶"
        }
    ]

    // Agregar notificación
    const addNotification = (notif: Omit<Notification, 'id' | 'timestamp' | 'isVisible' | 'isExiting'>) => {
        const newNotification: Notification = {
            ...notif,
            id: `notif-${Date.now()}-${Math.random()}`,
            timestamp: new Date(),
            isVisible: false,
            isExiting: false
        }

        setNotifications(prev => {
            const updated = [newNotification, ...prev].slice(0, 3) // Máximo 3 notificaciones
            return updated
        })

        // Hacer visible después de un frame
        setTimeout(() => {
            setNotifications(prev =>
                prev.map(n => n.id === newNotification.id ? { ...n, isVisible: true } : n)
            )
        }, 10)

        // Leer la notificación en voz alta
        if (voiceEnabled) {
            const textToSpeak = `${notif.title}. ${notif.message}`
            speak(textToSpeak, {
                rate: 1.1, // Un poco más rápido
                volume: 0.7, // Volumen moderado
                lang: 'es-ES'
            })
        }

        // Auto-remover después de 8 segundos
        setTimeout(() => {
            removeNotification(newNotification.id)
        }, 8000)
    }

    // Remover notificación
    const removeNotification = (id: string) => {
        // Iniciar animación de salida
        setNotifications(prev =>
            prev.map(n => n.id === id ? { ...n, isExiting: true } : n)
        )

        // Eliminar después de la animación
        setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== id))
            onClose?.(id)
        }, 300)
    }

    // Sistema de notificaciones durante la ruta
    useEffect(() => {
        if (!isRouteActive || !userLocation) return

        console.log('🔔 Sistema de notificaciones activado')

        // Primera sugerencia después de 3 segundos
        const firstSuggestion = setTimeout(() => {
            const randomSuggestion = aiSuggestions[Math.floor(Math.random() * aiSuggestions.length)]
            addNotification({
                type: 'ai-suggestion',
                ...randomSuggestion
            })
        }, 3000)

        // Sugerencias de IA cada 15-25 segundos (aleatorio)
        const suggestionInterval = setInterval(() => {
            const randomSuggestion = aiSuggestions[Math.floor(Math.random() * aiSuggestions.length)]
            addNotification({
                type: 'ai-suggestion',
                ...randomSuggestion
            })
        }, Math.random() * 10000 + 15000) // 15-25 segundos

        // Alertas de tráfico ocasionales cada 30-45 segundos
        const trafficInterval = setInterval(() => {
            if (Math.random() > 0.6) { // 40% de probabilidad
                const randomWarning = trafficWarnings[Math.floor(Math.random() * trafficWarnings.length)]
                addNotification({
                    type: 'traffic-warning',
                    ...randomWarning
                })
            }
        }, Math.random() * 15000 + 30000) // 30-45 segundos

        return () => {
            clearTimeout(firstSuggestion)
            clearInterval(suggestionInterval)
            clearInterval(trafficInterval)
        }
    }, [isRouteActive, userLocation])

    // Sistema de alertas de eventos cercanos (sin ruta activa)
    useEffect(() => {
        if (isRouteActive || !userLocation) return

        console.log('📢 Sistema de alertas de eventos activado')

        // Primera alerta después de 5 segundos
        const firstAlert = setTimeout(() => {
            const randomEvent = eventAlerts[Math.floor(Math.random() * eventAlerts.length)]
            addNotification({
                type: 'event-alert',
                ...randomEvent
            })
        }, 5000)

        // Alertas de eventos cada 20-40 segundos
        const eventInterval = setInterval(() => {
            const randomEvent = eventAlerts[Math.floor(Math.random() * eventAlerts.length)]
            addNotification({
                type: 'event-alert',
                ...randomEvent
            })
        }, Math.random() * 20000 + 20000) // 20-40 segundos

        return () => {
            clearTimeout(firstAlert)
            clearInterval(eventInterval)
        }
    }, [isRouteActive, userLocation])

    return (
        <>
            <style jsx>{`
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-50px) scale(0.9);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                }

                @keyframes slideOut {
                    from {
                        opacity: 1;
                        transform: translateY(0) scale(1);
                    }
                    to {
                        opacity: 0;
                        transform: translateY(-30px) scale(0.9);
                    }
                }

                @keyframes progressBar {
                    from {
                        width: 100%;
                    }
                    to {
                        width: 0%;
                    }
                }

                .notification-enter {
                    animation: slideIn 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
                }

                .notification-exit {
                    animation: slideOut 0.3s ease-in-out;
                }

                .progress-bar {
                    animation: progressBar 8s linear;
                }
            `}</style>

            <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4 pointer-events-none">
                {/* Notificaciones */}
                <div className="space-y-3">
                {notifications.map((notification) => (
                    <div
                        key={notification.id}
                        className={`
                            pointer-events-auto
                            ${notification.isVisible && !notification.isExiting ? 'notification-enter' : ''}
                            ${notification.isExiting ? 'notification-exit' : ''}
                        `}
                    >
                        <div className={`
                            bg-white rounded-xl shadow-2xl border-l-4 p-4
                            ${notification.type === 'ai-suggestion' ? 'border-l-blue-500' : ''}
                            ${notification.type === 'event-alert' ? 'border-l-purple-500' : ''}
                            ${notification.type === 'traffic-warning' ? 'border-l-orange-500' : ''}
                            ${notification.type === 'route-update' ? 'border-l-green-500' : ''}
                        `}>
                            <div className="flex items-start gap-3">
                                <div className="text-3xl shrink-0">
                                    {notification.icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-semibold text-gray-900 text-sm mb-1">
                                        {notification.title}
                                    </h4>
                                    <p className="text-gray-600 text-xs leading-relaxed">
                                        {notification.message}
                                    </p>
                                </div>
                                <button
                                    onClick={() => removeNotification(notification.id)}
                                    className="text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                                    aria-label="Cerrar notificación"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>

                            {/* Barra de progreso */}
                            <div className={`
                                h-1 mt-3 rounded-full overflow-hidden
                                ${notification.type === 'ai-suggestion' ? 'bg-blue-200' : ''}
                                ${notification.type === 'event-alert' ? 'bg-purple-200' : ''}
                                ${notification.type === 'traffic-warning' ? 'bg-orange-200' : ''}
                                ${notification.type === 'route-update' ? 'bg-green-200' : ''}
                            `}>
                                <div
                                    className={`
                                        h-full progress-bar
                                        ${notification.type === 'ai-suggestion' ? 'bg-blue-500' : ''}
                                        ${notification.type === 'event-alert' ? 'bg-purple-500' : ''}
                                        ${notification.type === 'traffic-warning' ? 'bg-orange-500' : ''}
                                        ${notification.type === 'route-update' ? 'bg-green-500' : ''}
                                    `}
                                />
                            </div>
                        </div>
                    </div>
                ))}
                </div>
            </div>
        </>
    )
}

export default RouteNotifications
