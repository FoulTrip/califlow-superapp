# 📱 Especificación Técnica - Aplicación Móvil de Turista Cali Flow AI

## 🎯 Visión General

La aplicación móvil de turista para Cali Flow AI es una plataforma nativa que permite a los visitantes de Cali acceder a información turística inteligente, recibir recomendaciones personalizadas con IA, y contribuir con datos de ubicación para mejorar la experiencia colectiva.

**Backend desplegado:** [URL del backend en producción]
**Documentación API:** [URL]/api/docs (Swagger)

---

## 🔐 Arquitectura de Autenticación

### Registro de Usuario Turista

```typescript
// POST /auth/register
const registerData = {
  email: "tourist@example.com",
  password: "password123",
  name: "Juan Pérez",
  role: "TOURIST" // Siempre TOURIST para usuarios móviles
};

// Respuesta esperada
interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: "TOURIST";
  };
}
```

### Inicio de Sesión

```typescript
// POST /auth/login
const loginData = {
  email: "tourist@example.com",
  password: "password123"
};
```

### Gestión de Tokens

- **Access Token:** Expira en 15 minutos
- **Refresh Token:** Expira en 7 días
- Implementar refresh automático antes de expiración del access token

---

## 📱 Estructura de la Aplicación Next.js + Capacitor

### Stack Tecnológico Específico
- **Framework:** Next.js 14+ con App Router
- **Lenguaje:** TypeScript
- **Styling:** Tailwind CSS
- **Mobile:** Capacitor 5+
- **Maps:** Google Maps React
- **State Management:** Zustand
- **API Client:** Axios con interceptors
- **WebSocket:** Socket.io-client
- **GPS:** Capacitor Geolocation plugin

### Configuración del Proyecto

```bash
# Crear proyecto Next.js
npx create-next-app@latest cali-tourist-app --typescript --tailwind --app

# Instalar Capacitor
npm install @capacitor/core @capacitor/cli
npx cap init "Cali Tourist App" "ai.califlow.tourist"

# Plugins de Capacitor necesarios
npm install @capacitor/geolocation @capacitor/status-bar @capacitor/splash-screen

# Dependencias adicionales
npm install zustand axios socket.io-client jwt-decode @googlemaps/react-wrapper
npm install @capacitor/preferences @capacitor/local-notifications
```

### Estructura de Carpetas

```
cali-tourist-app/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Rutas de autenticación
│   │   ├── login/
│   │   ├── register/
│   │   └── layout.tsx
│   ├── (main)/                   # Rutas principales
│   │   ├── map/
│   │   ├── pois/
│   │   ├── profile/
│   │   └── notifications/
│   ├── api/                      # API routes (si es híbrido)
│   ├── globals.css
│   └── layout.tsx
├── components/                   # Componentes React
│   ├── ui/                       # Componentes base (shadcn/ui)
│   ├── map/
│   ├── pois/
│   ├── auth/
│   └── notifications/
├── hooks/                        # Custom hooks
├── stores/                       # Zustand stores
├── services/                     # API services
├── utils/                        # Utilidades
├── capacitor.config.ts
└── tailwind.config.js
```

### Pantallas Principales

#### 1. **Splash Screen & Onboarding**
```tsx
// app/splash/page.tsx
'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Geolocation } from '@capacitor/geolocation';

export default function SplashPage() {
  const router = useRouter();

  useEffect(() => {
    checkPermissionsAndNavigate();
  }, []);

  const checkPermissionsAndNavigate = async () => {
    try {
      // Verificar permisos GPS
      const permission = await Geolocation.checkPermissions();

      if (permission.location === 'denied') {
        await Geolocation.requestPermissions();
      }

      // Verificar si usuario ya está logueado
      const hasToken = localStorage.getItem('accessToken');

      setTimeout(() => {
        router.push(hasToken ? '/map' : '/onboarding');
      }, 2000);

    } catch (error) {
      console.error('Error in splash:', error);
      router.push('/onboarding');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-green-600 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mx-auto mb-4"></div>
        <h1 className="text-2xl font-bold">Cali Flow AI</h1>
        <p className="text-sm opacity-90">Tu guía turística inteligente</p>
      </div>
    </div>
  );
}
```

#### 2. **Mapa Interactivo (Pantalla Principal)**
```tsx
// app/map/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { GoogleMap, useLoadScript, Marker, Polygon } from '@react-google-maps/api';
import { useGPSTracking } from '@/hooks/useGPSTracking';
import { useHeatmapStore } from '@/stores/heatmapStore';

const mapContainerStyle = {
  width: '100%',
  height: '100vh'
};

const caliCenter = {
  lat: 3.437,
  lng: -76.532
};

export default function MapPage() {
  const { isLoaded } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  });

  const { userLocation, startTracking } = useGPSTracking();
  const { heatmapData, fetchHeatmap } = useHeatmapStore();

  useEffect(() => {
    startTracking();
    fetchHeatmap();
  }, []);

  if (!isLoaded) return <div>Loading maps...</div>;

  return (
    <div className="relative">
      <GoogleMap
        mapContainerStyle={mapContainerStyle}
        zoom={13}
        center={caliCenter}
        options={{
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
      >
        {/* User location marker */}
        {userLocation && (
          <Marker
            position={userLocation}
            icon={{
              url: '/user-location.svg',
              scaledSize: new google.maps.Size(30, 30)
            }}
          />
        )}

        {/* Heatmap polygons */}
        {heatmapData?.geoJson.features.map((feature, index) => (
          <Polygon
            key={index}
            paths={feature.geometry.coordinates[0].map(coord => ({
              lat: coord[1],
              lng: coord[0]
            }))}
            options={{
              fillColor: feature.properties.color,
              fillOpacity: 0.6,
              strokeColor: feature.properties.color,
              strokeOpacity: 1,
              strokeWeight: 1,
            }}
          />
        ))}
      </GoogleMap>

      {/* Floating action buttons */}
      <div className="absolute bottom-6 right-6 space-y-3">
        <button className="bg-blue-600 text-white p-4 rounded-full shadow-lg">
          📍
        </button>
        <button className="bg-green-600 text-white p-4 rounded-full shadow-lg">
          🔍
        </button>
      </div>
    </div>
  );
}
```

#### 3. **Lista de Puntos de Interés**
```tsx
// app/pois/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { usePOIStore } from '@/stores/poiStore';
import { POICard } from '@/components/pois/POICard';

export default function POIsPage() {
  const { pois, loading, fetchNearbyPOIs } = usePOIStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    fetchNearbyPOIs();
  }, []);

  const filteredPOIs = selectedCategory === 'all'
    ? pois
    : pois.filter(poi => poi.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm p-4">
        <h1 className="text-xl font-bold text-gray-900">Puntos de Interés</h1>

        {/* Category filters */}
        <div className="flex space-x-2 mt-3 overflow-x-auto">
          {['all', 'attraction', 'restaurant', 'hotel', 'event'].map(category => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700'
              }`}
            >
              {category === 'all' ? 'Todos' : category}
            </button>
          ))}
        </div>
      </div>

      {/* POI List */}
      <div className="p-4 space-y-4">
        {loading ? (
          <div className="text-center py-8">Cargando POIs...</div>
        ) : (
          filteredPOIs.map(poi => (
            <POICard key={poi.id} poi={poi} />
          ))
        )}
      </div>
    </div>
  );
}
```

#### 4. **Perfil de Usuario**
```tsx
// app/profile/page.tsx
'use client';
import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';

export default function ProfilePage() {
  const { user, logout } = useAuthStore();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm p-4">
        <h1 className="text-xl font-bold text-gray-900">Perfil</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* User Info */}
        <div className="bg-white rounded-lg p-4">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
              {user?.name?.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-semibold">{user?.name}</h2>
              <p className="text-gray-600">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="bg-white rounded-lg p-4 space-y-4">
          <h3 className="font-semibold text-gray-900">Configuración</h3>

          <div className="flex items-center justify-between">
            <span>Notificaciones</span>
            <button
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className={`w-12 h-6 rounded-full transition-colors ${
                notificationsEnabled ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <div className={`w-5 h-5 bg-white rounded-full transition-transform ${
                notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
              }`} />
            </button>
          </div>
        </div>

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full bg-red-600 text-white py-3 rounded-lg font-medium"
        >
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
```

#### 5. **Notificaciones**
```tsx
// app/notifications/page.tsx
'use client';
import { useEffect } from 'react';
import { useNotificationStore } from '@/stores/notificationStore';
import { NotificationItem } from '@/components/notifications/NotificationItem';

export default function NotificationsPage() {
  const { notifications, fetchNotifications } = useNotificationStore();

  useEffect(() => {
    fetchNotifications();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm p-4">
        <h1 className="text-xl font-bold text-gray-900">Notificaciones</h1>
      </div>

      <div className="p-4 space-y-3">
        {notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No tienes notificaciones
          </div>
        ) : (
          notifications.map(notification => (
            <NotificationItem key={notification.id} notification={notification} />
          ))
        )}
      </div>
    </div>
  );
}
```

---

## 🔄 Servicios en Background

### GPS Tracking Hook (React)

```tsx
// hooks/useGPSTracking.ts
import { useState, useEffect, useCallback } from 'react';
import { Geolocation, Position } from '@capacitor/geolocation';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/services/apiClient';

interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  bearing?: number;
}

export function useGPSTracking() {
  const [isTracking, setIsTracking] = useState(false);
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const { accessToken } = useAuthStore();

  // Verificar permisos GPS
  const checkPermissions = useCallback(async () => {
    try {
      const permission = await Geolocation.checkPermissions();

      if (permission.location === 'denied') {
        const requestResult = await Geolocation.requestPermissions();
        setPermissionGranted(requestResult.location === 'granted');
        return requestResult.location === 'granted';
      }

      setPermissionGranted(permission.location === 'granted');
      return permission.location === 'granted';
    } catch (error) {
      console.error('Error checking GPS permissions:', error);
      return false;
    }
  }, []);

  // Validar coordenadas en Cali
  const isValidCaliLocation = useCallback((location: LocationData): boolean => {
    const { latitude, longitude } = location;
    return latitude >= 3.4 && latitude <= 3.6 &&
           longitude >= -76.6 && longitude <= -76.4;
  }, []);

  // Enviar ubicación al servidor
  const sendLocationToServer = useCallback(async (location: LocationData) => {
    if (!accessToken) return;

    try {
      await apiClient.post('/gps/track', {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy,
        altitude: location.altitude,
        speed: location.speed,
        bearing: location.bearing,
      });
    } catch (error) {
      console.error('Error sending location:', error);
    }
  }, [accessToken]);

  // Obtener ubicación actual
  const getCurrentLocation = useCallback(async (): Promise<LocationData | null> => {
    try {
      const position: Position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      });

      const location: LocationData = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        speed: position.coords.speed,
        bearing: position.coords.heading,
      };

      setUserLocation(location);
      return location;
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }, []);

  // Iniciar tracking continuo
  const startTracking = useCallback(async () => {
    const hasPermission = await checkPermissions();
    if (!hasPermission) {
      throw new Error('GPS permission denied');
    }

    setIsTracking(true);

    // Obtener ubicación inicial
    await getCurrentLocation();

    // Configurar watch position
    const watchId = await Geolocation.watchPosition({
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 30000,
    }, (position, error) => {
      if (error) {
        console.error('GPS watch error:', error);
        return;
      }

      if (position) {
        const location: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          altitude: position.coords.altitude,
          speed: position.coords.speed,
          bearing: position.coords.heading,
        };

        setUserLocation(location);

        // Enviar al servidor si es ubicación válida
        if (isValidCaliLocation(location)) {
          sendLocationToServer(location);
        }
      }
    });

    // Guardar watchId para cleanup
    return () => {
      Geolocation.clearWatch({ id: watchId });
    };
  }, [checkPermissions, getCurrentLocation, isValidCaliLocation, sendLocationToServer]);

  // Detener tracking
  const stopTracking = useCallback(() => {
    setIsTracking(false);
  }, []);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      setIsTracking(false);
    };
  }, []);

  return {
    isTracking,
    userLocation,
    permissionGranted,
    startTracking,
    stopTracking,
    getCurrentLocation,
  };
}
```

### WebSocket Hook para Alertas

```tsx
// hooks/useWebSocket.ts
import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useNotificationStore } from '@/stores/notificationStore';
import { LocalNotifications } from '@capacitor/local-notifications';

interface CongestionAlert {
  zoneId: string;
  density: number;
  threshold: number;
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  timestamp: string;
  recommendation: string;
}

export function useWebSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { addNotification } = useNotificationStore();
  const currentZoneRef = useRef<string | null>(null);

  // Conectar al WebSocket
  const connect = useCallback(async () => {
    if (socketRef.current?.connected) return;

    socketRef.current = io(process.env.NEXT_PUBLIC_WS_URL!, {
      transports: ['websocket', 'polling'],
      timeout: 5000,
      forceNew: true,
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to WebSocket');
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from WebSocket');
    });

    socketRef.current.on('congestion_alert', handleCongestionAlert);
  }, []);

  // Unirse a zona
  const joinZone = useCallback((zoneId: string) => {
    if (socketRef.current && currentZoneRef.current !== zoneId) {
      // Salir de zona anterior
      if (currentZoneRef.current) {
        socketRef.current.emit('leave-zone', currentZoneRef.current);
      }

      // Unirse a nueva zona
      socketRef.current.emit('join-zone', zoneId);
      currentZoneRef.current = zoneId;
    }
  }, []);

  // Manejar alerta de congestión
  const handleCongestionAlert = useCallback(async (alert: CongestionAlert) => {
    console.log('Received congestion alert:', alert);

    // Agregar a store de notificaciones
    addNotification({
      id: `alert_${Date.now()}`,
      type: 'congestion',
      title: 'Alerta de Congestión Turística',
      message: alert.message,
      data: alert,
      timestamp: new Date(alert.timestamp),
      read: false,
    });

    // Mostrar notificación push local
    try {
      await LocalNotifications.schedule({
        notifications: [{
          id: Date.now(),
          title: 'Alerta de Congestión',
          body: alert.message,
          schedule: { at: new Date() },
          data: alert,
        }]
      });
    } catch (error) {
      console.error('Error showing local notification:', error);
    }
  }, [addNotification]);

  // Desconectar
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      currentZoneRef.current = null;
    }
  }, []);

  // Cleanup al desmontar
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    joinZone,
    currentZone: currentZoneRef.current,
  };
}
```

### API Client Service

```tsx
// services/apiClient.ts
import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { Preferences } from '@capacitor/preferences';

class ApiClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'https://api.califlow.ai';

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private async setupInterceptors() {
    // Request interceptor - agregar token
    this.client.interceptors.request.use(
      async (config) => {
        const { value: accessToken } = await Preferences.get({ key: 'accessToken' });

        if (accessToken) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor - manejar refresh token
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            // Intentar refresh token
            const { value: refreshToken } = await Preferences.get({ key: 'refreshToken' });

            if (refreshToken) {
              const response = await axios.post(`${this.baseURL}/auth/refresh`, {
                refreshToken,
              });

              const { accessToken: newAccessToken, refreshToken: newRefreshToken } = response.data;

              // Guardar nuevos tokens
              await Preferences.set({ key: 'accessToken', value: newAccessToken });
              await Preferences.set({ key: 'refreshToken', value: newRefreshToken });

              // Reintentar request original
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            // Refresh falló, logout
            await this.logout();
            throw refreshError;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Auth methods
  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password });
    const { accessToken, refreshToken, user } = response.data;

    await Preferences.set({ key: 'accessToken', value: accessToken });
    await Preferences.set({ key: 'refreshToken', value: refreshToken });

    return { accessToken, refreshToken, user };
  }

  async register(userData: any) {
    const response = await this.client.post('/auth/register', userData);
    const { accessToken, refreshToken, user } = response.data;

    await Preferences.set({ key: 'accessToken', value: accessToken });
    await Preferences.set({ key: 'refreshToken', value: refreshToken });

    return { accessToken, refreshToken, user };
  }

  async logout() {
    await Preferences.remove({ key: 'accessToken' });
    await Preferences.remove({ key: 'refreshToken' });
  }

  // GPS methods
  async trackLocation(locationData: any) {
    return this.client.post('/gps/track', locationData);
  }

  async trackBatch(locations: any[]) {
    return this.client.post('/gps/batch', { points: locations });
  }

  // Heatmap methods
  async getCurrentHeatmap() {
    return this.client.get('/heatmap/current');
  }

  async getHeatmapHistory(hours: number = 24) {
    return this.client.get(`/heatmap/history?hours=${hours}`);
  }

  // POI methods
  async getNearbyPOIs(lat: number, lon: number, radius: number = 1000) {
    return this.client.get(`/poi/nearby?lat=${lat}&lon=${lon}&radius=${radius}`);
  }

  async getPOIsWithRecommendations(lat: number, lon: number, radius: number = 1000) {
    return this.client.get(`/poi/nearby/recommended?lat=${lat}&lon=${lon}&radius=${radius}`);
  }

  async getPOIById(id: string) {
    return this.client.get(`/poi/${id}`);
  }

  // Analytics methods (public)
  async getActiveUsers() {
    return this.client.get('/analytics/public/active-users');
  }

  async getTopZones(limit: number = 10) {
    return this.client.get(`/analytics/public/zones?limit=${limit}`);
  }

  async getPeakHours() {
    return this.client.get('/analytics/public/peak-hours');
  }

  // Gemini AI methods
  async analyzeWithGemini(contextData: any) {
    return this.client.post('/gemini/analyze', { contextData });
  }

  async getGeminiRecommendations(zoneId: string, contextData: any) {
    return this.client.post(`/gemini/recommend?zone_id=${zoneId}`, { contextData });
  }

  // Generic request methods
  get(url: string, config?: any) {
    return this.client.get(url, config);
  }

  post(url: string, data?: any, config?: any) {
    return this.client.post(url, data, config);
  }

  put(url: string, data?: any, config?: any) {
    return this.client.put(url, data, config);
  }

  delete(url: string, config?: any) {
    return this.client.delete(url, config);
  }
}

export const apiClient = new ApiClient();
```

---

## 🌐 Integración con APIs del Backend

### Endpoints Principales

#### Autenticación
```typescript
// Registro
POST /auth/register
Content-Type: application/json

// Login
POST /auth/login
Content-Type: application/json

// Refresh token
POST /auth/refresh
Content-Type: application/json
```

#### GPS Tracking
```typescript
// Punto único
POST /gps/track
Authorization: Bearer {accessToken}
Content-Type: application/json

// Lote de puntos (sincronización offline)
POST /gps/batch
Authorization: Bearer {accessToken}
Content-Type: application/json
```

#### Mapas y Visualización
```typescript
// Heatmap actual
GET /heatmap/current
Authorization: Bearer {accessToken}

// Heatmap histórico
GET /heatmap/history?hours=24
Authorization: Bearer {accessToken}
```

#### Puntos de Interés
```typescript
// POIs cercanos (sin auth)
GET /poi/nearby?lat={lat}&lon={lon}&radius={radius}

// POIs con recomendaciones IA (sin auth)
GET /poi/nearby/recommended?lat={lat}&lon={lon}&radius={radius}

// Detalles de POI específico
GET /poi/{id}

// POIs por categoría
GET /poi/category/{category}?limit=20

// Búsqueda de POIs
GET /poi/search?q={query}&limit=20
```

#### Analytics Públicos
```typescript
// Usuarios activos (sin auth)
GET /analytics/public/active-users

// Zonas más concurridas (sin auth)
GET /analytics/public/zones?limit=10

// Horas pico (sin auth)
GET /analytics/public/peak-hours
```

#### IA y Recomendaciones
```typescript
// Análisis con Gemini
POST /gemini/analyze
Authorization: Bearer {accessToken}
Content-Type: application/json

// Recomendaciones por zona
POST /gemini/recommend?zone_id={zoneId}
Authorization: Bearer {accessToken}
Content-Type: application/json
```

---

## 📊 Modelos de Datos

### Usuario Turista
```typescript
interface TouristUser {
  id: string;
  email: string;
  name: string;
  role: 'TOURIST';
  profileImage?: string;
  createdAt: Date;
  lastLogin?: Date;
}
```

### Punto GPS
```typescript
interface GPSPoint {
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
  speed?: number;
  bearing?: number;
  timestamp: Date;
}
```

### POI (Punto de Interés)
```typescript
interface POI {
  id: string;
  name: string;
  category: 'attraction' | 'restaurant' | 'hotel' | 'event';
  latitude: number;
  longitude: number;
  address?: string;
  description?: string;
  images: string[];
  openingHours?: Record<string, string>;
  rating?: number;
  reviews: number;
  popularity: number;
  distance?: number; // en metros desde ubicación actual
}
```

### Heatmap Data
```typescript
interface HeatmapData {
  id: string;
  startTime: Date;
  endTime: Date;
  geoJson: GeoJSON.FeatureCollection;
  totalPoints: number;
  maxDensity: number;
  avgDensity: number;
  hotspots: HeatmapHotspot[];
  generatedAt: Date;
}

interface HeatmapHotspot {
  latitude: number;
  longitude: number;
  density: number;
  radius: number;
}
```

---

## 🎨 UI/UX Guidelines

### Tema de Color
- **Primario:** Azul Cali (#0033A0)
- **Secundario:** Verde turista (#4CAF50)
- **Advertencia:** Naranja congestión (#FF9800)
- **Error:** Rojo peligro (#F44336)

### Iconografía
- Usar Material Design Icons
- GPS: `location_on`
- POI: `place`
- Alerta: `warning`
- Recomendación: `lightbulb`

### Estados de Carga
- Skeleton screens para listas
- Spinner para mapas
- Progress bars para sincronización

---

## 🔧 Configuración Técnica

### Variables de Entorno (.env.local)
```env
# Backend API
NEXT_PUBLIC_API_URL=https://api.califlow.ai
NEXT_PUBLIC_WS_URL=wss://api.califlow.ai

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here

# App Configuration
GPS_UPDATE_INTERVAL=30000
OFFLINE_STORAGE_LIMIT=1000
GPS_ACCURACY_THRESHOLD=50
HEATMAP_CACHE_DURATION=300000
POI_CACHE_DURATION=1800000

# Capacitor
CAPACITOR_WEB_DIR=out
```

### Librerías Específicas para Next.js + Capacitor

#### package.json
```json
{
  "name": "cali-tourist-app",
  "version": "1.0.0",
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "cap:ios": "cap sync ios && cap open ios",
    "cap:android": "cap sync android && cap open android",
    "cap:sync": "cap sync"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "@capacitor/core": "^5.0.0",
    "@capacitor/cli": "^5.0.0",
    "@capacitor/geolocation": "^5.0.0",
    "@capacitor/preferences": "^5.0.0",
    "@capacitor/local-notifications": "^5.0.0",
    "@capacitor/status-bar": "^5.0.0",
    "@capacitor/splash-screen": "^5.0.0",
    "@googlemaps/react-wrapper": "^1.1.35",
    "zustand": "^4.4.0",
    "axios": "^1.6.0",
    "socket.io-client": "^4.7.0",
    "jwt-decode": "^4.0.0",
    "lucide-react": "^0.294.0",
    "tailwindcss": "^3.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0"
  },
  "devDependencies": {
    "eslint": "^8.0.0",
    "eslint-config-next": "^14.0.0"
  }
}
```

#### capacitor.config.ts
```typescript
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.califlow.tourist',
  appName: 'Cali Tourist App',
  webDir: 'out',
  bundledWebRuntime: false,
  plugins: {
    Geolocation: {
      enableBackgroundTracking: true,
    },
    LocalNotifications: {
      smallIcon: 'ic_stat_icon_config_sample',
      iconColor: '#488AFF',
    },
  },
  ios: {
    scheme: 'Cali Tourist App',
    path: 'ios',
  },
  android: {
    path: 'android',
  },
};

export default config;
```

#### tailwind.config.js
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'cali-blue': '#0033A0',
        'cali-green': '#4CAF50',
        'cali-orange': '#FF9800',
        'cali-red': '#F44336',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
```

#### next.config.js
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  },
}

module.exports = nextConfig
```

---

## 📱 Flujos de Usuario Detallados

### 1. Primer Uso (Onboarding)
1. Splash screen con logo Cali Flow
2. Solicitar permisos GPS
3. Tutorial: "¿Cómo usar la app?"
4. Registro opcional
5. Pantalla principal con mapa

### 2. Navegación Diaria
1. Abrir app → Verificar login
2. Iniciar GPS tracking
3. Conectar WebSocket
4. Cargar heatmap actual
5. Mostrar POIs cercanos

### 3. Exploración de POIs
1. Tocar marcador en mapa
2. Ver detalles del POI
3. Obtener recomendaciones IA
4. Navegar con Google Maps

### 4. Gestión de Alertas
1. Recibir notificación push
2. Tocar para ver detalles
3. Opción de "Evitar zona" o "Ver alternativas"
4. Historial de alertas

---

## 🔒 Seguridad y Privacidad

### Manejo de Datos Sensibles
- Tokens JWT almacenados en Keychain/Secure Storage
- Datos GPS anonimizados antes de envío
- No almacenar ubicación histórica localmente
- Clear data on logout

### Validaciones
- Coordenadas válidas de Cali únicamente
- Rate limiting del lado cliente
- Timeout en requests (10 segundos)
- Retry logic con exponential backoff

### Offline Support
- Queue de GPS points para sincronización
- Cache de POIs por 1 hora
- Modo offline limitado para mapas

---

## 📈 Métricas y Analytics

### Eventos a Trackear
- App installs, opens, sessions
- GPS tracking starts/stops
- POI views, searches, navigation
- Alert interactions
- Error rates por endpoint

### Performance Metrics
- GPS accuracy promedio
- API response times
- WebSocket connection stability
- Battery impact del GPS tracking

---

## 🚀 Deployment y CI/CD

### Build Configuration
```yaml
# fastlane/Fastfile (iOS/Android)
platform :ios do
  lane :beta do
    build_app(
      scheme: "CaliFlowTourist",
      export_method: "app-store"
    )
    upload_to_testflight
  end
end
```

### Environment Management
- **Development:** Backend local + Firebase emulator
- **Staging:** Backend staging + TestFlight/Internal testing
- **Production:** Backend prod + App Store/Play Store

---

## 🧪 Testing Strategy

### Unit Tests
- Servicios de GPS tracking
- Autenticación y token management
- Parsing de API responses
- Validaciones de datos

### Integration Tests
- Flujos completos de login → GPS → mapa
- Sincronización offline → online
- WebSocket connections y reconexiones

### E2E Tests
- Registro de usuario
- Navegación completa
- Recepción de alertas

---

## 📞 Soporte y Mantenimiento

### Error Handling
- Graceful degradation cuando GPS falla
- Mensajes de error user-friendly
- Logging detallado para debugging
- Crash reporting (Sentry/Crashlytics)

### Actualizaciones
- Force update para versiones críticas
- Soft update para features nuevas
- Backward compatibility con APIs

---

### Zustand Stores (State Management)

```tsx
// stores/authStore.ts
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '@/services/apiClient';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'TOURIST';
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (userData: any) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await apiClient.login(email, password);
          set({
            user: response.user,
            accessToken: response.accessToken,
            isAuthenticated: true,
          });
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (userData: any) => {
        set({ isLoading: true });
        try {
          const response = await apiClient.register(userData);
          set({
            user: response.user,
            accessToken: response.accessToken,
            isAuthenticated: true,
          });
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        await apiClient.logout();
        set({
          user: null,
          accessToken: null,
          isAuthenticated: false,
        });
      },

      refreshToken: async () => {
        // Implementar refresh token logic
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
```

```tsx
// stores/heatmapStore.ts
import { create } from 'zustand';

interface HeatmapData {
  id: string;
  startTime: Date;
  endTime: Date;
  geoJson: any;
  totalPoints: number;
  maxDensity: number;
  avgDensity: number;
  hotspots: any[];
  generatedAt: Date;
}

interface HeatmapState {
  heatmapData: HeatmapData | null;
  isLoading: boolean;
  error: string | null;

  fetchHeatmap: () => Promise<void>;
  fetchHeatmapHistory: (hours: number) => Promise<void>;
}

export const useHeatmapStore = create<HeatmapState>((set) => ({
  heatmapData: null,
  isLoading: false,
  error: null,

  fetchHeatmap: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.getCurrentHeatmap();
      set({ heatmapData: response.data });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchHeatmapHistory: async (hours: number) => {
    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.getHeatmapHistory(hours);
      set({ heatmapData: response.data });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },
}));
```

```tsx
// stores/poiStore.ts
import { create } from 'zustand';

interface POI {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  address?: string;
  description?: string;
  images: string[];
  rating?: number;
  reviews: number;
  popularity: number;
  distance?: number;
}

interface POIState {
  pois: POI[];
  selectedPOI: POI | null;
  isLoading: boolean;
  error: string | null;

  fetchNearbyPOIs: (lat?: number, lon?: number, radius?: number) => Promise<void>;
  fetchPOIsWithRecommendations: (lat?: number, lon?: number, radius?: number) => Promise<void>;
  selectPOI: (poi: POI | null) => void;
}

export const usePOIStore = create<POIState>((set, get) => ({
  pois: [],
  selectedPOI: null,
  isLoading: false,
  error: null,

  fetchNearbyPOIs: async (lat?: number, lon?: number, radius = 1000) => {
    if (!lat || !lon) return;

    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.getNearbyPOIs(lat, lon, radius);
      set({ pois: response.data.pois || [] });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  fetchPOIsWithRecommendations: async (lat?: number, lon?: number, radius = 1000) => {
    if (!lat || !lon) return;

    set({ isLoading: true, error: null });
    try {
      const response = await apiClient.getPOIsWithRecommendations(lat, lon, radius);
      set({ pois: response.data.pois || [] });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },

  selectPOI: (poi: POI | null) => {
    set({ selectedPOI: poi });
  },
}));
```

```tsx
// stores/notificationStore.ts
import { create } from 'zustand';

interface Notification {
  id: string;
  type: 'congestion' | 'recommendation' | 'info';
  title: string;
  message: string;
  data?: any;
  timestamp: Date;
  read: boolean;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;

  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  fetchNotifications: () => Promise<void>;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,

  addNotification: (notification: Notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },

  markAsRead: (id: string) => {
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
      unreadCount: Math.max(0, state.unreadCount - 1),
    }));
  },

  markAllAsRead: () => {
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
    }));
  },

  clearNotifications: () => {
    set({ notifications: [], unreadCount: 0 });
  },

  fetchNotifications: async () => {
    // Aquí podrías cargar notificaciones del servidor si es necesario
    // Por ahora solo mantenemos las locales
  },
}));
```

## 🎯 KPIs de Éxito

### Métricas de Usuario
- Daily Active Users (DAU)
- Session duration promedio
- GPS tracking adoption rate (>70%)
- POI discovery rate (>5 POIs por sesión)
- Notification engagement rate

### Métricas Técnicas
- API success rate (>99%)
- GPS accuracy (>80% con accuracy <10m)
- App crash rate (<1%)
- WebSocket connection uptime (>95%)
- Heatmap load time (<2s)
- POI search response time (<1s)

---

*Documento creado para el desarrollo de la aplicación móvil de turista Cali Flow AI. Backend ya desplegado y documentado en Swagger.*