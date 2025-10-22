"use client"

import { useEffect, useRef } from "react"
import toast, { Toaster } from "react-hot-toast"
import { useSocket } from "@/context/SocketContext"

interface AlertSystemProps {
    onAlert?: (zone: string) => void
}

function AlertSystem({ onAlert }: AlertSystemProps) {
    const { currentAlert } = useSocket()
    const audioContextRef = useRef<AudioContext | null>(null)
    const alertShownRef = useRef<Set<string>>(new Set())

    // Inicializar Web Audio API
    useEffect(() => {
        if (typeof window !== "undefined") {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
        }

        return () => {
            audioContextRef.current?.close()
        }
    }, [])

    // Función para generar alerta de voz con Web Audio API
    const playVoiceAlert = (message: string) => {
        if (!audioContextRef.current) return

        try {
            const audioContext = audioContextRef.current

            // Crear oscilador para sonido de alerta
            const oscillator = audioContext.createOscillator()
            const gainNode = audioContext.createGain()

            oscillator.connect(gainNode)
            gainNode.connect(audioContext.destination)

            // Configurar sonido de alerta (tono de advertencia)
            oscillator.type = "sine"
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime)

            // Envelope para el volumen
            gainNode.gain.setValueAtTime(0, audioContext.currentTime)
            gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1)
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5)

            oscillator.start(audioContext.currentTime)
            oscillator.stop(audioContext.currentTime + 0.5)

            // Segundo tono
            setTimeout(() => {
                const oscillator2 = audioContext.createOscillator()
                const gainNode2 = audioContext.createGain()

                oscillator2.connect(gainNode2)
                gainNode2.connect(audioContext.destination)

                oscillator2.type = "sine"
                oscillator2.frequency.setValueAtTime(1000, audioContext.currentTime)

                gainNode2.gain.setValueAtTime(0, audioContext.currentTime)
                gainNode2.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1)
                gainNode2.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.5)

                oscillator2.start(audioContext.currentTime)
                oscillator2.stop(audioContext.currentTime + 0.5)
            }, 600)

            // Usar Web Speech API para leer el mensaje (si está disponible)
            if ('speechSynthesis' in window) {
                setTimeout(() => {
                    const utterance = new SpeechSynthesisUtterance(message)
                    utterance.lang = 'es-ES'
                    utterance.rate = 1.1
                    utterance.pitch = 1
                    utterance.volume = 0.8
                    window.speechSynthesis.speak(utterance)
                }, 1200)
            }
        } catch (error) {
            console.error("Error reproduciendo alerta de voz:", error)
        }
    }

    // Escuchar alertas de congestión
    useEffect(() => {
        if (!currentAlert) return

        const alertKey = `${currentAlert.zone}-${currentAlert.timestamp}`

        // Evitar mostrar la misma alerta múltiples veces
        if (alertShownRef.current.has(alertKey)) return
        alertShownRef.current.add(alertKey)

        // Limpiar alertas antiguas del Set
        if (alertShownRef.current.size > 10) {
            const entries = Array.from(alertShownRef.current)
            alertShownRef.current = new Set(entries.slice(-5))
        }

        // Mostrar toast notification
        toast.custom(
            (t) => (
                <div
                    className={`${
                        t.visible ? 'animate-enter' : 'animate-leave'
                    } max-w-md w-full bg-red-600 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}
                >
                    <div className="flex-1 w-0 p-4">
                        <div className="flex items-start">
                            <div className="flex-shrink-0 pt-0.5">
                                <svg
                                    className="h-10 w-10 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                    />
                                </svg>
                            </div>
                            <div className="ml-3 flex-1">
                                <p className="text-sm font-bold text-white">
                                    🚨 Alerta de Congestión
                                </p>
                                <p className="mt-1 text-sm text-red-100">
                                    <strong>Zona:</strong> {currentAlert.zone}
                                </p>
                                <p className="mt-1 text-sm text-red-100">
                                    <strong>Nivel:</strong> {currentAlert.level}/10
                                </p>
                                <p className="mt-1 text-sm text-red-50">
                                    {currentAlert.message}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex border-l border-red-700">
                        <button
                            onClick={() => toast.dismiss(t.id)}
                            className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-white hover:bg-red-700 focus:outline-none"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            ),
            {
                duration: 8000,
                position: 'top-center',
            }
        )

        // Reproducir alerta de voz
        const voiceMessage = `Alerta de congestión en zona ${currentAlert.zone}. Nivel ${currentAlert.level}.`
        playVoiceAlert(voiceMessage)

        // Notificar al mapa para destacar la zona
        if (onAlert) {
            onAlert(currentAlert.zone)
        }
    }, [currentAlert, onAlert])

    return (
        <Toaster
            position="top-center"
            reverseOrder={false}
            gutter={8}
            toastOptions={{
                className: '',
                duration: 8000,
                style: {
                    background: 'transparent',
                    boxShadow: 'none',
                    padding: 0,
                },
            }}
        />
    )
}

export default AlertSystem
