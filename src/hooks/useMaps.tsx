import { getCurrentHeatmap, HeatmapResponse } from "@/services/heatmapService"
import { useSession } from "next-auth/react"
import { useEffect, useImperativeHandle, useRef, useState } from "react"
import { CALI_POIS_SEED, type PoiSeedData } from "@/data/caliPois"

function useMaps(ref: any) {
    const { data: session } = useSession()
    const mapRef = useRef<HTMLDivElement>(null)
    const mapInstanceRef = useRef<google.maps.Map | null>(null)
    const circlesRef = useRef<Map<string, google.maps.Circle>>(new Map())
    const userMarkerRef = useRef<google.maps.Marker | null>(null)
    const poiMarkersRef = useRef<google.maps.Marker[]>([])
    const infoWindowRef = useRef<google.maps.InfoWindow | null>(null)
    const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null)
    const [heatmapData, setHeatmapData] = useState<HeatmapResponse | null>(null)
    const [isLoadingHeatmap, setIsLoadingHeatmap] = useState(true)
    const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null)
    const [isRouteActive, setIsRouteActive] = useState(false)
    const [currentDestination, setCurrentDestination] = useState<{ lat: number, lng: number } | null>(null)

    // Cargar datos del heatmap
    useEffect(() => {
        const fetchHeatmap = async () => {
            try {
                setIsLoadingHeatmap(true)
                const accessToken = session?.accessToken
                console.log('🔄 Fetching heatmap data...')
                const data = await getCurrentHeatmap(accessToken)
                console.log("📊 Heatmap data loaded:", data)
                console.log("📍 Features count:", data.geoJson.features.length)
                setHeatmapData(data)
            } catch (error) {
                console.error('❌ Error loading heatmap:', error)
                // Si falla, mantener null y mostrar mensaje
                setHeatmapData(null)
            } finally {
                setIsLoadingHeatmap(false)
            }
        }

        fetchHeatmap()

        // Actualizar cada 5 minutos
        const interval = setInterval(fetchHeatmap, 5 * 60 * 1000)
        return () => clearInterval(interval)
    }, [session])

    // Exponer métodos
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
        },
        getUserLocation: () => userLocation,
        calculateRouteToDestination: (destination: { lat: number; lng: number }) => {
            calculateRouteToDestination(destination)
        },
        clearRoute: () => {
            clearRoute()
        }
    }), [heatmapData, userLocation])

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

    // Función para obtener el ícono según la categoría del POI
    const getPoiIcon = (category: string): string => {
        const iconMap: Record<string, string> = {
            'attraction': '🎯',
            'restaurant': '🍽️',
            'hotel': '🏨',
            'cultural': '🎭',
            'nightlife': '🎵',
            'nature': '🌳',
            'shopping': '🛍️',
        }
        return iconMap[category] || '📍'
    }

    // Función para calcular y mostrar ruta evitando zonas de alta densidad
    const calculateRouteToDestination = async (destination: { lat: number; lng: number }) => {
        if (!userLocation || !mapInstanceRef.current) {
            alert('No se pudo obtener tu ubicación actual')
            return
        }

        try {
            const directionsService = new google.maps.DirectionsService()

            // Identificar waypoints para evitar zonas de alta densidad (rojas)
            const highDensityZones = heatmapData?.geoJson.features
                .filter(f => f.properties.color === 'red' || f.properties.color === 'orange')
                .map(f => ({
                    lat: f.geometry.coordinates[1],
                    lng: f.geometry.coordinates[0],
                    density: f.properties.density
                })) || []

            console.log('🚗 Calculando ruta evitando', highDensityZones.length, 'zonas de alta densidad')

            // Calcular ruta con opciones para evitar zonas congestionadas
            const request: google.maps.DirectionsRequest = {
                origin: userLocation,
                destination: destination,
                travelMode: google.maps.TravelMode.DRIVING,
                provideRouteAlternatives: true, // Solicitar rutas alternativas
                avoidHighways: false,
                avoidTolls: false,
            }

            directionsService.route(request, (result, status) => {
                if (status === google.maps.DirectionsStatus.OK && result) {
                    // Limpiar ruta anterior si existe
                    if (directionsRendererRef.current) {
                        directionsRendererRef.current.setMap(null)
                    }

                    // Crear nuevo renderer
                    directionsRendererRef.current = new google.maps.DirectionsRenderer({
                        map: mapInstanceRef.current,
                        directions: result,
                        suppressMarkers: false,
                        polylineOptions: {
                            strokeColor: '#3b82f6',
                            strokeWeight: 5,
                            strokeOpacity: 0.8,
                        }
                    })

                    // Si hay múltiples rutas, seleccionar la que evite más zonas de alta densidad
                    if (result.routes.length > 1) {
                        let bestRouteIndex = 0
                        let minHeatmapIntersections = Infinity

                        result.routes.forEach((route, index) => {
                            let intersections = 0
                            const routePath = route.overview_path

                            // Contar intersecciones con zonas de alta densidad
                            highDensityZones.forEach(zone => {
                                const zonePoint = new google.maps.LatLng(zone.lat, zone.lng)
                                routePath.forEach(point => {
                                    const distance = google.maps.geometry.spherical.computeDistanceBetween(
                                        point,
                                        zonePoint
                                    )
                                    if (distance < 200) { // 200 metros de radio
                                        intersections += zone.density
                                    }
                                })
                            })

                            if (intersections < minHeatmapIntersections) {
                                minHeatmapIntersections = intersections
                                bestRouteIndex = index
                            }
                        })

                        console.log('✅ Mejor ruta encontrada: Ruta', bestRouteIndex + 1, 'con menor congestión')
                        directionsRendererRef.current?.setRouteIndex(bestRouteIndex)
                    }

                    // Mostrar información de la ruta
                    const route = result.routes[0]
                    const leg = route.legs[0]
                    console.log('📍 Ruta calculada:', leg.distance?.text, '-', leg.duration?.text)

                    // Activar notificaciones de ruta
                    setIsRouteActive(true)
                    setCurrentDestination(destination)

                    // Cerrar el InfoWindow actual
                    infoWindowRef.current?.close()
                } else {
                    console.error('❌ Error calculando ruta:', status)
                    alert('No se pudo calcular la ruta. Intenta nuevamente.')
                }
            })
        } catch (error) {
            console.error('❌ Error:', error)
            alert('Error al calcular la ruta')
        }
    }

    // Función para cancelar/limpiar la ruta activa
    const clearRoute = () => {
        if (directionsRendererRef.current) {
            directionsRendererRef.current.setMap(null)
            directionsRendererRef.current = null
        }
        setIsRouteActive(false)
        setCurrentDestination(null)
        console.log('🚫 Ruta cancelada')
    }

    // Función para crear el contenido del InfoWindow
    const createInfoWindowContent = (poi: PoiSeedData): HTMLDivElement => {
        const container = document.createElement('div')
        container.style.cssText = 'max-width: 320px; font-family: system-ui, -apple-system, sans-serif;'

        const rating = poi.rating ? `⭐ ${poi.rating}` : ''
        const reviews = poi.reviews ? `(${poi.reviews.toLocaleString()} reseñas)` : ''
        const phone = poi.phone ? `<p style="margin: 4px 0; font-size: 13px; color: #6b7280;"><strong>📞</strong> ${poi.phone}</p>` : ''
        const website = poi.website ? `<p style="margin: 4px 0;"><a href="${poi.website}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; text-decoration: underline; font-size: 13px;">Sitio web</a></p>` : ''

        container.innerHTML = `
            <div>
                <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: 600; color: #1f2937;">
                    ${getPoiIcon(poi.category)} ${poi.name}
                </h3>
                ${rating || reviews ? `<p style="margin: 4px 0; font-size: 14px; color: #6b7280;">${rating} ${reviews}</p>` : ''}
                <p style="margin: 8px 0; font-size: 14px; color: #4b5563; line-height: 1.4;">
                    ${poi.description}
                </p>
                <p style="margin: 8px 0; font-size: 13px; color: #6b7280;">
                    <strong>📍</strong> ${poi.address}
                </p>
                ${phone}
                ${website}
            </div>
        `

        // Crear botón "Visitar"
        const buttonContainer = document.createElement('div')
        buttonContainer.style.cssText = 'margin-top: 12px; padding-top: 12px; border-top: 1px solid #e5e7eb;'

        const visitButton = document.createElement('button')
        visitButton.textContent = '🚗 Visitar (Ruta sin Tráfico)'
        visitButton.style.cssText = `
            width: 100%;
            padding: 10px 16px;
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
            box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
        `

        visitButton.onmouseover = () => {
            visitButton.style.background = 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)'
            visitButton.style.transform = 'translateY(-1px)'
            visitButton.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.3)'
        }

        visitButton.onmouseout = () => {
            visitButton.style.background = 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
            visitButton.style.transform = 'translateY(0)'
            visitButton.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.2)'
        }

        visitButton.onclick = () => {
            console.log('🗺️ Iniciando navegación a:', poi.name)
            calculateRouteToDestination({
                lat: poi.latitude,
                lng: poi.longitude
            })
        }

        buttonContainer.appendChild(visitButton)
        container.appendChild(buttonContainer)

        return container
    }

    // Obtener ubicación del usuario
    useEffect(() => {
        const getUserLocation = () => {
            console.log('getUserLocation: Intentando obtener ubicación del usuario');
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        console.log('getUserLocation: Ubicación obtenida:', { latitude, longitude });
                        setUserLocation({ lat: latitude, lng: longitude });
                    },
                    (error) => {
                        console.error('getUserLocation: Error obteniendo ubicación:', error);
                        // Usar ubicación por defecto si falla
                        setUserLocation({ lat: 3.4516, lng: -76.5320 });
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 300000 // 5 minutos
                    }
                );
            } else {
                console.error('getUserLocation: Geolocation no soportada');
                setUserLocation({ lat: 3.4516, lng: -76.5320 });
            }
        };

        getUserLocation();
    }, []);

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
                script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY}&libraries=places,geometry&loading=async`;
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

            const location = userLocation || {
                lat: 3.4516,
                lng: -76.5320
            }
            console.log('initMap: Usando ubicación:', location);

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
                    console.log('initMap: Justo antes de crear mapa - typeof google.maps.Map:', typeof google.maps.Map);
                    console.log('initMap: google.maps object:', google.maps);
                    const map = new google.maps.Map(mapRef.current, {
                        center: location,
                        zoom: 13,
                        restriction: {
                            latLngBounds: caliBounds,
                            strictBounds: false
                        },
                        minZoom: 11,
                        maxZoom: 18,
                        disableDefaultUI: false,
                        zoomControl: true,
                        zoomControlOptions: {
                            position: google.maps.ControlPosition.TOP_RIGHT
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

                    // Guardar referencia del mapa
                    mapInstanceRef.current = map

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

                    // Agregar marcador del usuario si tenemos su ubicación
                    if (userLocation) {
                        console.log('initMap: Agregando marcador del usuario en:', userLocation);
                        const userMarker = new google.maps.Marker({
                            position: userLocation,
                            map: map,
                            title: 'Tu ubicación',
                            icon: {
                                path: google.maps.SymbolPath.CIRCLE,
                                scale: 8,
                                fillColor: '#4285F4',
                                fillOpacity: 1,
                                strokeColor: '#ffffff',
                                strokeWeight: 2,
                            }
                        });
                        userMarkerRef.current = userMarker;
                        console.log('initMap: Marcador del usuario agregado exitosamente');
                    } else {
                        console.log('initMap: No se pudo agregar marcador del usuario - ubicación no disponible');
                    }

                    // Limpiar marcadores de POIs anteriores
                    poiMarkersRef.current.forEach(marker => marker.setMap(null));
                    poiMarkersRef.current = [];

                    // Crear InfoWindow único para todos los POIs
                    if (!infoWindowRef.current) {
                        infoWindowRef.current = new google.maps.InfoWindow();
                    }

                    // Agregar marcadores de POIs
                    console.log('initMap: Agregando marcadores de POIs');
                    CALI_POIS_SEED.forEach((poi) => {
                        const marker = new google.maps.Marker({
                            position: { lat: poi.latitude, lng: poi.longitude },
                            map: map,
                            title: poi.name,
                            icon: {
                                url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                                    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32">
                                        <circle cx="16" cy="16" r="14" fill="#ffffff" stroke="#3b82f6" stroke-width="2"/>
                                        <text x="16" y="22" text-anchor="middle" font-size="16">${getPoiIcon(poi.category)}</text>
                                    </svg>
                                `)}`,
                                scaledSize: new google.maps.Size(32, 32),
                                anchor: new google.maps.Point(16, 16),
                            },
                            zIndex: 100,
                        });

                        // Agregar evento de clic para mostrar InfoWindow
                        marker.addListener('click', () => {
                            if (infoWindowRef.current) {
                                infoWindowRef.current.setContent(createInfoWindowContent(poi));
                                infoWindowRef.current.open(map, marker);
                            }
                        });

                        poiMarkersRef.current.push(marker);
                    });
                    console.log(`initMap: ${poiMarkersRef.current.length} marcadores de POIs agregados exitosamente`);

                } catch (error) {
                    console.error('initMap: Error al crear el mapa:', error);
                    throw error;
                }
            }
        }

        initMap()
    }, [heatmapData, isLoadingHeatmap, userLocation])

    return {
        mapRef,
        isRouteActive,
        userLocation,
        currentDestination,
        clearRoute
    }
}

export default useMaps