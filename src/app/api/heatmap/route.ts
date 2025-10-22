import { NextRequest, NextResponse } from 'next/server'

const API_URL = process.env.NEXT_PUBLIC_URL_GATEWAY

export async function GET(request: NextRequest) {
    try {
        // Obtener el token JWT del header Authorization
        const authHeader = request.headers.get('authorization')
        const token = authHeader?.replace('Bearer ', '')

        if (!token) {
            return NextResponse.json(
                { error: 'Token de autorización requerido' },
                { status: 401 }
            )
        }

        // Hacer petición al gateway
        const response = await fetch(`${API_URL}/heatmap/current`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        })

        console.log(await response.json())

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }))
            return NextResponse.json(
                { error: errorData.message || 'Error al obtener heatmap' },
                { status: response.status }
            )
        }

        const data = await response.json()
        return NextResponse.json(data)

    } catch (error) {
        console.error('Error en endpoint heatmap:', error)
        return NextResponse.json(
            { error: 'Error interno del servidor' },
            { status: 500 }
        )
    }
}