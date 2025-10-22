import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_URL_GATEWAY

interface HeatmapFeature {
    type: 'Feature'
    geometry: {
        type: 'Point'
        coordinates: [number, number] // [longitude, latitude]
    }
    properties: {
        pointCount: number
        centroid: [number, number]
        density: number
        densityPerSqKm: number
        color: string
    }
}

interface HeatmapGeoJson {
    type: 'FeatureCollection'
    features: HeatmapFeature[]
}

interface Hotspot {
    latitude: number
    longitude: number
    density: number
    radius: number
}

export interface HeatmapResponse {
    id: string
    startTime: string
    endTime: string
    geoJson: HeatmapGeoJson
    totalPoints: number
    maxDensity: number
    avgDensity: number
    hotspots: Hotspot[]
    generatedAt: string
}

/**
 * Obtiene el heatmap actual (más reciente)
 */
export async function getCurrentHeatmap(accessToken?: string): Promise<HeatmapResponse> {
    try {
        const response = await axios.get(`${API_URL}/heatmap/current`, {
            headers: accessToken ? {
                'Authorization': `Bearer ${accessToken}`
            } : {}
        })
        console.log(response.data)
        return response.data
    } catch (error) {
        console.error('Error fetching current heatmap:', error)
        throw error
        
    }
}

/**
 * Obtiene el heatmap histórico basado en las horas especificadas
 * @param hours - Número de horas hacia atrás (máximo 168 = 1 semana)
 */
export async function getHistoricalHeatmap(hours: number = 24, accessToken?: string): Promise<HeatmapResponse> {
    try {
        const response = await axios.get(`${API_URL}/api/heatmap/history`, {
            params: { hours },
            headers: accessToken ? {
                'Authorization': `Bearer ${accessToken}`
            } : {}
        })
        return response.data
    } catch (error) {
        console.error('Error fetching historical heatmap:', error)
        throw error
    }
}

/**
 * Genera un nuevo heatmap con los datos más recientes
 */
export async function generateNewHeatmap(accessToken?: string): Promise<HeatmapResponse> {
    try {
        const response = await axios.post(`${API_URL}/api/heatmap/generate`, {}, {
            headers: accessToken ? {
                'Authorization': `Bearer ${accessToken}`
            } : {}
        })
        return response.data
    } catch (error) {
        console.error('Error generating new heatmap:', error)
        throw error
    }
}