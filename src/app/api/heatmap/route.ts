import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_URL_GATEWAY

// Datos mock de turistas distribuidos en diferentes zonas de Cali
const MOCK_HEATMAP_DATA = {
    id: 'mock-heatmap-001',
    startTime: new Date(Date.now() - 3600000).toISOString(), // 1 hora atrás
    endTime: new Date().toISOString(),
    geoJson: {
        type: 'FeatureCollection',
        features: [
            // Zona Cristo Rey - Alta concentración
            {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [-76.5319, 3.4516]
                },
                properties: {
                    pointCount: 45,
                    centroid: [-76.5319, 3.4516],
                    density: 45,
                    densityPerSqKm: 900,
                    color: 'red'
                }
            },
            // Gato de Tejada - Alta concentración
            {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [-76.5321, 3.4514]
                },
                properties: {
                    pointCount: 38,
                    centroid: [-76.5321, 3.4514],
                    density: 38,
                    densityPerSqKm: 760,
                    color: 'red'
                }
            },
            // Barrio San Antonio - Media-Alta concentración
            {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [-76.5233, 3.4372]
                },
                properties: {
                    pointCount: 32,
                    centroid: [-76.5233, 3.4372],
                    density: 32,
                    densityPerSqKm: 640,
                    color: 'orange'
                }
            },
            // Zoológico de Cali - Alta concentración
            {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [-76.4994, 3.4447]
                },
                properties: {
                    pointCount: 42,
                    centroid: [-76.4994, 3.4447],
                    density: 42,
                    densityPerSqKm: 840,
                    color: 'red'
                }
            },
            // Parque del Perro - Media-Alta concentración
            {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [-76.5225, 3.4372]
                },
                properties: {
                    pointCount: 28,
                    centroid: [-76.5225, 3.4372],
                    density: 28,
                    densityPerSqKm: 560,
                    color: 'orange'
                }
            },
            // Plaza de Cayzedo - Media concentración
            {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [-76.5322, 3.4516]
                },
                properties: {
                    pointCount: 25,
                    centroid: [-76.5322, 3.4516],
                    density: 25,
                    densityPerSqKm: 500,
                    color: 'orange'
                }
            },
            // Iglesia La Ermita - Media concentración
            {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [-76.5350, 3.4510]
                },
                properties: {
                    pointCount: 22,
                    centroid: [-76.5350, 3.4510],
                    density: 22,
                    densityPerSqKm: 440,
                    color: 'yellow'
                }
            },
            // Boulevard del Río - Media concentración
            {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [-76.5350, 3.4450]
                },
                properties: {
                    pointCount: 20,
                    centroid: [-76.5350, 3.4450],
                    density: 20,
                    densityPerSqKm: 400,
                    color: 'yellow'
                }
            },
            // Unicentro - Media concentración
            {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [-76.5327, 3.3761]
                },
                properties: {
                    pointCount: 30,
                    centroid: [-76.5327, 3.3761],
                    density: 30,
                    densityPerSqKm: 600,
                    color: 'orange'
                }
            },
            // Chipichape - Media concentración
            {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [-76.5330, 3.4650]
                },
                properties: {
                    pointCount: 26,
                    centroid: [-76.5330, 3.4650],
                    density: 26,
                    densityPerSqKm: 520,
                    color: 'orange'
                }
            },
            // Museo La Tertulia - Baja-Media concentración
            {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [-76.5416, 3.4314]
                },
                properties: {
                    pointCount: 15,
                    centroid: [-76.5416, 3.4314],
                    density: 15,
                    densityPerSqKm: 300,
                    color: 'yellow'
                }
            },
            // Estadio Pascual Guerrero - Baja concentración (sin evento)
            {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [-76.5420, 3.4361]
                },
                properties: {
                    pointCount: 8,
                    centroid: [-76.5420, 3.4361],
                    density: 8,
                    densityPerSqKm: 160,
                    color: 'green'
                }
            },
            // Jardín Botánico - Baja-Media concentración
            {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [-76.4980, 3.4520]
                },
                properties: {
                    pointCount: 18,
                    centroid: [-76.4980, 3.4520],
                    density: 18,
                    densityPerSqKm: 360,
                    color: 'yellow'
                }
            },
            // Museo del Oro - Baja-Media concentración
            {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [-76.5341, 3.4505]
                },
                properties: {
                    pointCount: 16,
                    centroid: [-76.5341, 3.4505],
                    density: 16,
                    densityPerSqKm: 320,
                    color: 'yellow'
                }
            },
            // Tin Tin Deo (Vida nocturna) - Media concentración
            {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [-76.5228, 3.4380]
                },
                properties: {
                    pointCount: 24,
                    centroid: [-76.5228, 3.4380],
                    density: 24,
                    densityPerSqKm: 480,
                    color: 'yellow'
                }
            },
            // Cerro de las Tres Cruces - Baja-Media concentración
            {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [-76.5225, 3.4372]
                },
                properties: {
                    pointCount: 19,
                    centroid: [-76.5225, 3.4372],
                    density: 19,
                    densityPerSqKm: 380,
                    color: 'yellow'
                }
            },
            // Cosmocentro - Baja-Media concentración
            {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [-76.5550, 3.3950]
                },
                properties: {
                    pointCount: 21,
                    centroid: [-76.5550, 3.3950],
                    density: 21,
                    densityPerSqKm: 420,
                    color: 'yellow'
                }
            },
            // Galería Alameda - Baja concentración
            {
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: [-76.5360, 3.4480]
                },
                properties: {
                    pointCount: 12,
                    centroid: [-76.5360, 3.4480],
                    density: 12,
                    densityPerSqKm: 240,
                    color: 'green'
                }
            }
        ]
    },
    totalPoints: 441,
    maxDensity: 45,
    avgDensity: 24.5,
    hotspots: [
        {
            latitude: 3.4516,
            longitude: -76.5319,
            density: 45,
            radius: 200
        },
        {
            latitude: 3.4447,
            longitude: -76.4994,
            density: 42,
            radius: 195
        },
        {
            latitude: 3.4514,
            longitude: -76.5321,
            density: 38,
            radius: 185
        },
        {
            latitude: 3.4372,
            longitude: -76.5233,
            density: 32,
            radius: 170
        },
        {
            latitude: 3.3761,
            longitude: -76.5327,
            density: 30,
            radius: 165
        }
    ],
    generatedAt: new Date().toISOString()
}

export async function GET(_request: NextRequest) {
    try {
        console.log('🗺️ Devolviendo datos mock del heatmap con', MOCK_HEATMAP_DATA.totalPoints, 'turistas')
        return NextResponse.json(MOCK_HEATMAP_DATA)
    } catch (error) {
        console.error('Error en endpoint heatmap:', error)
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}