import { useEffect, useRef, useState } from 'react'

interface SpeechOptions {
    lang?: string
    rate?: number // 0.1 - 10 (velocidad)
    pitch?: number // 0 - 2 (tono)
    volume?: number // 0 - 1 (volumen)
}

export const useSpeech = () => {
    const [isSupported, setIsSupported] = useState(false)
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [isEnabled, setIsEnabled] = useState(true)
    const synthRef = useRef<SpeechSynthesis | null>(null)

    useEffect(() => {
        // Verificar si el navegador soporta Speech Synthesis
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            synthRef.current = window.speechSynthesis
            setIsSupported(true)
            console.log('🔊 Text-to-Speech disponible')

            // Limpiar cualquier discurso pendiente al cargar
            synthRef.current.cancel()
        } else {
            console.warn('⚠️ Text-to-Speech no soportado en este navegador')
        }

        // Cleanup al desmontar
        return () => {
            if (synthRef.current) {
                synthRef.current.cancel()
            }
        }
    }, [])

    /**
     * Habla un texto usando Text-to-Speech
     */
    const speak = (text: string, options: SpeechOptions = {}) => {
        if (!isSupported || !synthRef.current || !isEnabled) {
            console.log('🔇 Speech deshabilitado o no soportado')
            return
        }

        // Cancelar cualquier discurso en curso
        synthRef.current.cancel()

        // Crear utterance (pronunciación)
        const utterance = new SpeechSynthesisUtterance(text)

        // Configurar opciones
        utterance.lang = options.lang || 'es-ES' // Español de España
        utterance.rate = options.rate || 1.0 // Velocidad normal
        utterance.pitch = options.pitch || 1.0 // Tono normal
        utterance.volume = options.volume || 0.8 // 80% volumen

        // Eventos
        utterance.onstart = () => {
            setIsSpeaking(true)
            console.log('🗣️ Hablando:', text)
        }

        utterance.onend = () => {
            setIsSpeaking(false)
            console.log('✅ Discurso completado')
        }

        utterance.onerror = (event) => {
            setIsSpeaking(false)
            console.error('❌ Error en speech:', event.error)
        }

        // Hablar
        synthRef.current.speak(utterance)
    }

    /**
     * Detiene el discurso actual
     */
    const stop = () => {
        if (synthRef.current) {
            synthRef.current.cancel()
            setIsSpeaking(false)
            console.log('⏹️ Discurso detenido')
        }
    }

    /**
     * Pausa el discurso
     */
    const pause = () => {
        if (synthRef.current && isSpeaking) {
            synthRef.current.pause()
            console.log('⏸️ Discurso pausado')
        }
    }

    /**
     * Reanuda el discurso
     */
    const resume = () => {
        if (synthRef.current) {
            synthRef.current.resume()
            console.log('▶️ Discurso reanudado')
        }
    }

    /**
     * Habilita o deshabilita el speech
     */
    const toggleEnabled = () => {
        setIsEnabled(prev => !prev)
        if (isSpeaking) {
            stop()
        }
    }

    /**
     * Obtener voces disponibles
     */
    const getVoices = () => {
        if (synthRef.current) {
            return synthRef.current.getVoices()
        }
        return []
    }

    /**
     * Obtener voz en español si está disponible
     */
    const getSpanishVoice = () => {
        const voices = getVoices()
        // Preferir voces de español latinoamericano o español
        return voices.find(voice =>
            voice.lang.includes('es-CO') || // Español Colombia
            voice.lang.includes('es-MX') || // Español México
            voice.lang.includes('es-ES') || // Español España
            voice.lang.includes('es')
        )
    }

    return {
        speak,
        stop,
        pause,
        resume,
        isSupported,
        isSpeaking,
        isEnabled,
        toggleEnabled,
        getVoices,
        getSpanishVoice
    }
}

export default useSpeech
