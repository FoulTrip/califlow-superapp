"use client"

import { useEffect, useRef, useState, useImperativeHandle, forwardRef } from "react"
import { useSession } from "next-auth/react"
import { getCurrentHeatmap, type HeatmapResponse } from "@/services/heatmapService"

export interface MapSectionRef {
    highlightZone: (zoneName: string) => void
}

const MapSection = forwardRef<MapSectionRef>((_props, ref) => {
    const { data: session } = useSession()
    const mapRef = useRef<HTMLDivElement>(null)
    const circlesRef = useRef<Map<string, google.maps.Circle>>(new Map())
    const [heatmapData, setHeatmapData] = useState<HeatmapResponse | null>(null)
    const [isLoadingHeatmap, setIsLoadingHeatmap] = useState(true)

    // Cargar datos del heatmap
    useEffect(() => {
        const fetchHeatmap = async () => {
            try {
                setIsLoadingHeatmap(true)
                const accessToken = session?.accessToken
                const data = await getCurrentHeatmap(accessToken)
                console.log("heat: ", data)
                setHeatmapData(data)
            } catch (error) {
                console.error('Error loading heatmap:', error)
                // Si falla, mantener null y mostrar mensaje
            } finally {
                setIsLoadingHeatmap(false)
            }
        }

        fetchHeatmap()

        // Actualizar cada 5 minutos
        const interval = setInterval(fetchHeatmap, 5 * 60 * 1000)
        return () => clearInterval(interval)
    }, [session])

    // Exponer método para destacar zonas
    useImperativeHandle(ref, () => ({
        highlightZone: (zoneName: string) => {
            const circle = circlesRef.current.get(zoneName)
            if (circle) {
                // Cambiar a rojo brillante con mayor opacidad
                circle.setOptions({
                    fillColor: '#DC2626',
                    fillOpacity: 0.8,
                    strokeColor: '#DC2626',
                    strokeWeight: 4,
                    strokeOpacity: 1
                })

                // Animar la zona
                let pulse = 0
                const pulseInterval = setInterval(() => {
                    pulse++
                    const opacity = 0.6 + Math.sin(pulse * 0.2) * 0.2
                    circle.setOptions({
                        fillOpacity: opacity
                    })

                    if (pulse > 30) { // ~6 segundos de animación
                        clearInterval(pulseInterval)
                        // Volver al color original después de la alerta
                        const feature = heatmapData?.geoJson.features.find(
                            f => `hotspot_${f.geometry.coordinates[1]}_${f.geometry.coordinates[0]}` === zoneName
                        )
                        if (feature) {
                            const normalizedDensity = feature.properties.density / (heatmapData?.maxDensity || 1)
                            circle.setOptions({
                                fillColor: getColorForDensity(feature.properties.color),
                                fillOpacity: normalizedDensity * 0.6,
                                strokeColor: getColorForDensity(feature.properties.color),
                                strokeWeight: 2,
                                strokeOpacity: 0.8
                            })
                        }
                    }
                }, 200)
            }
        }
    }), [heatmapData])

    // Función auxiliar para convertir color string a hex
    const getColorForDensity = (color: string): string => {
        const colorMap: Record<string, string> = {
            'green': '#10B981',
            'yellow': '#F59E0B',
            'orange': '#F97316',
            'red': '#EF4444',
        }
        return colorMap[color] || '#EF4444'
    }

    useEffect(() => {
        const initMap = async () => {
            console.log('initMap: Iniciando carga del mapa');
            console.log('initMap: window.google existe?', !!window.google);
            console.log('initMap: window.google.maps existe?', !!window.google?.maps);
            console.log('initMap: window.google.maps.Map existe?', !!window.google?.maps?.Map);

            // Cargar el script de Google Maps si no está cargado
            if (!window.google || !window.google.maps) {
                console.log('initMap: Cargando script de Google Maps');
                const script = document.createElement('script');
                script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&libraries=places&loading=async`;
                script.async = true;
                script.defer = true;
                document.head.appendChild(script);

                await new Promise((resolve) => {
                    script.onload = resolve;
                });
                console.log('initMap: Script cargado, verificando inicialización de Google Maps');

                // Esperar a que Google Maps esté completamente inicializado
                await new Promise((resolve) => {
                    const checkGoogle = setInterval(() => {
                        console.log('initMap: Verificando window.google.maps.ControlPosition:', !!window.google?.maps?.ControlPosition);
                        console.log('initMap: Verificando window.google.maps.Map:', !!window.google?.maps?.Map);
                        if (window.google?.maps?.Map) {
                            clearInterval(checkGoogle);
                            resolve(true);
                        }
                    }, 100);
                });
                console.log('initMap: Google Maps inicializado completamente');
            } else {
                console.log('initMap: Google Maps ya estaba cargado');
            }

            const location = {
                lat: 3.4516,
                lng: -76.5320
            }

            // Restricción de bounds para el área de Cali
            const caliBounds = {
                north: 3.5500,
                south: 3.3000,
                west: -76.6000,
                east: -76.4500
            }

            if (mapRef.current) {
                console.log('initMap: Creando instancia de mapa');
                console.log('initMap: mapRef.current existe?', !!mapRef.current);
                console.log('initMap: google.maps.Map constructor disponible?', typeof google.maps.Map);

                try {
                    const map = new google.maps.Map(mapRef.current, {
                        center: location,
                        zoom: 13,
                        restriction: {
                            latLngBounds: caliBounds,
                            strictBounds: false
                        },
                        minZoom: 11,
                        maxZoom: 18,
                        disableDefaultUI: true,
                        zoomControl: true,
                        zoomControlOptions: {
                            position: 11 // TOP_RIGHT
                        },
                        gestureHandling: 'greedy',
                        styles: [
                            {
                                featureType: "all",
                                elementType: "geometry",
                                stylers: [{ color: "#f5f5f5" }]
                            },
                            {
                                featureType: "all",
                                elementType: "labels.text.fill",
                                stylers: [{ color: "#616161" }]
                            },
                            {
                                featureType: "all",
                                elementType: "labels.text.stroke",
                                stylers: [{ color: "#f5f5f5" }]
                            },
                            {
                                featureType: "administrative",
                                elementType: "geometry",
                                stylers: [{ visibility: "off" }]
                            },
                            {
                                featureType: "administrative.land_parcel",
                                elementType: "labels",
                                stylers: [{ visibility: "off" }]
                            },
                            {
                                featureType: "poi",
                                stylers: [{ visibility: "off" }]
                            },
                            {
                                featureType: "road",
                                elementType: "geometry",
                                stylers: [{ color: "#ffffff" }]
                            },
                            {
                                featureType: "road",
                                elementType: "labels.icon",
                                stylers: [{ visibility: "off" }]
                            },
                            {
                                featureType: "road.arterial",
                                elementType: "geometry",
                                stylers: [{ color: "#fafafa" }]
                            },
                            {
                                featureType: "road.highway",
                                elementType: "geometry",
                                stylers: [{ color: "#dadada" }]
                            },
                            {
                                featureType: "road.highway",
                                elementType: "labels",
                                stylers: [{ visibility: "off" }]
                            },
                            {
                                featureType: "road.local",
                                stylers: [{ visibility: "off" }]
                            },
                            {
                                featureType: "transit",
                                stylers: [{ visibility: "off" }]
                            },
                            {
                                featureType: "water",
                                elementType: "geometry",
                                stylers: [{ color: "#c9e6f2" }]
                            },
                            {
                                featureType: "water",
                                elementType: "labels.text.fill",
                                stylers: [{ color: "#9ca5b3" }]
                            }
                        ]
                    });
                    console.log('initMap: Mapa creado exitosamente');

                    // Limpiar círculos anteriores
                    circlesRef.current.forEach(circle => circle.setMap(null));
                    circlesRef.current.clear();
                    console.log('initMap: Círculos anteriores limpiados');

                    // Renderizar heatmap si hay datos disponibles
                    if (heatmapData && heatmapData.geoJson.features.length > 0) {
                        console.log('initMap: Renderizando heatmap con', heatmapData.geoJson.features.length, 'features');
                        heatmapData.geoJson.features.forEach((feature, index) => {
                            const [lng, lat] = feature.geometry.coordinates
                            const density = feature.properties.density
                            const normalizedDensity = density / (heatmapData.maxDensity || 1)
                            const color = getColorForDensity(feature.properties.color)

                            console.log(`initMap: Feature ${index}: lat=${lat}, lng=${lng}, density=${density}, color=${color}`);

                            // Calcular radio basado en la densidad (entre 50m y 200m)
                            const radius = 50 + (normalizedDensity * 150)

                            const circle = new google.maps.Circle({
                                map: map,
                                center: { lat, lng },
                                radius: radius,
                                fillColor: color,
                                fillOpacity: normalizedDensity * 0.6,
                                strokeColor: color,
                                strokeWeight: 2,
                                strokeOpacity: 0.8,
                                clickable: true
                            })

                            // Identificador único para el círculo
                            const circleId = `hotspot_${lat}_${lng}`
                            circlesRef.current.set(circleId, circle)

                            // Agregar evento hover
                            circle.addListener('mouseover', () => {
                                circle.setOptions({
                                    strokeWeight: 4,
                                    fillOpacity: normalizedDensity * 0.7
                                })
                            })

                            circle.addListener('mouseout', () => {
                                circle.setOptions({
                                    strokeWeight: 2,
                                    fillOpacity: normalizedDensity * 0.6
                                })
                            })
                        })
                        console.log('initMap: Heatmap renderizado exitosamente');
                    } else {
                        console.log('initMap: No hay datos de heatmap para renderizar');
                    }

                } catch (error) {
                    console.error('initMap: Error al crear el mapa:', error);
                    throw error;
                }
            }
        }

        initMap()
    }, [heatmapData, isLoadingHeatmap])

    return (
        <div ref={mapRef} className="w-full h-full" />
    )
})

MapSection.displayName = 'MapSection'

export default MapSection