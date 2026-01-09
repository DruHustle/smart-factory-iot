/**
 * Google Maps Integration Component
 * 
 * This component provides a reusable map interface with proper error handling
 * and configuration validation. It follows the Single Responsibility Principle
 * by focusing solely on map rendering and initialization.
 *
 * USAGE FROM PARENT COMPONENT:
 * ======
 *
 * const mapRef = useRef<google.maps.Map | null>(null);
 *
 * <MapView
 *   initialCenter={{ lat: 40.7128, lng: -74.0060 }}
 *   initialZoom={15}
 *   onMapReady={(map) => {
 *     mapRef.current = map;
 * </MapView>
 *
 * ======
 * Available Libraries and Core Features:
 * 
 * 📍 MARKER (from `marker` library)
 * - Attaches to map using { map, position }
 * new google.maps.marker.AdvancedMarkerElement({
 *   map,
 *   position: { lat: 37.7749, lng: -122.4194 },
 *   title: "San Francisco",
 * });
 *
 * 🏢 PLACES (from `places` library)
 * - Does not attach directly to map; use data with your map manually.
 * const place = new google.maps.places.Place({ id: PLACE_ID });
 * await place.fetchFields({ fields: ["displayName", "location"] });
 * map.setCenter(place.location);
 *
 * 🧭 GEOCODER (from `geocoding` library)
 * - Standalone service; manually apply results to map.
 * const geocoder = new google.maps.Geocoder();
 * geocoder.geocode({ address: "New York" }, (results, status) => {
 *   if (status === "OK" && results[0]) {
 *     map.setCenter(results[0].geometry.location);
 *   }
 * });
 *
 * 📐 GEOMETRY (from `geometry` library)
 * - Pure utility functions; not attached to map.
 * const dist = google.maps.geometry.spherical.computeDistanceBetween(p1, p2);
 *
 * 🛣️ ROUTES (from `routes` library)
 * - Combines DirectionsService (standalone) + DirectionsRenderer (map-attached)
 * const directionsService = new google.maps.DirectionsService();
 * const directionsRenderer = new google.maps.DirectionsRenderer({ map });
 * directionsService.route(
 *   { origin, destination, travelMode: "DRIVING" },
 *   (res, status) => status === "OK" && directionsRenderer.setDirections(res)
 * );
 *
 * 🌦️ MAP LAYERS (attach directly to map)
 * - new google.maps.TrafficLayer().setMap(map);
 * - new google.maps.TransitLayer().setMap(map);
 * - new google.maps.BicyclingLayer().setMap(map);
 */

/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState } from "react";
import { usePersistFn } from "@/hooks/usePersistFn";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: typeof google;
  }
}

/**
 * Maps Configuration Service
 * 
 * Handles environment variable validation and configuration.
 * Follows the Dependency Injection principle for testability.
 */
interface MapsConfig {
  apiKey: string;
  baseUrl: string;
}

function getMapsConfig(): MapsConfig {
  const apiKey = import.meta.env.VITE_FRONTEND_FORGE_API_KEY;
  const baseUrl =
    import.meta.env.VITE_FRONTEND_FORGE_API_URL ||
    "https://forge.butterfly-effect.dev";

  if (!apiKey) {
    console.warn(
      "[Maps] Warning: VITE_FRONTEND_FORGE_API_KEY is not configured. " +
      "Map functionality may not work. Please set this environment variable."
    );
  }

  return { apiKey, baseUrl };
}

/**
 * Script Loader Service
 * 
 * Handles loading the Google Maps script with proper error handling.
 * Separated for testability and reusability.
 */
function loadMapScript(config: MapsConfig): Promise<void> {
  return new Promise((resolve, reject) => {
    // Check if script is already loaded
    if (window.google?.maps) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    const mapsProxyUrl = `${config.baseUrl}/v1/maps/proxy`;
    script.src = `${mapsProxyUrl}/maps/api/js?key=${config.apiKey}&v=weekly&libraries=marker,places,geocoding,geometry,routes`;
    script.async = true;
    script.crossOrigin = "anonymous";

    script.onload = () => {
      resolve();
      script.remove();
    };

    script.onerror = () => {
      const error = new Error(
        "[Maps] Failed to load Google Maps script. " +
        "Please verify your API key and network connection."
      );
      console.error(error);
      reject(error);
      script.remove();
    };

    document.head.appendChild(script);
  });
}

interface MapViewProps {
  className?: string;
  initialCenter?: google.maps.LatLngLiteral;
  initialZoom?: number;
  onMapReady?: (map: google.maps.Map) => void;
}

/**
 * MapView Component
 * 
 * Renders a Google Maps instance with proper initialization and error handling.
 * Follows the Single Responsibility Principle by focusing only on map rendering.
 */
export function MapView({
  className,
  initialCenter = { lat: 37.7749, lng: -122.4194 },
  initialZoom = 12,
  onMapReady,
}: MapViewProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<google.maps.Map | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const init = usePersistFn(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const config = getMapsConfig();
      await loadMapScript(config);

      if (!mapContainer.current) {
        throw new Error("Map container element not found in DOM");
      }

      if (!window.google?.maps) {
        throw new Error("Google Maps library failed to load properly");
      }

      map.current = new window.google.maps.Map(mapContainer.current, {
        zoom: initialZoom,
        center: initialCenter,
        mapTypeControl: true,
        fullscreenControl: true,
        zoomControl: true,
        streetViewControl: true,
        mapId: "DEMO_MAP_ID",
      });

      if (onMapReady && map.current) {
        onMapReady(map.current);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
      console.error("[MapView] Initialization error:", errorMessage);
    } finally {
      setIsLoading(false);
    }
  });

  useEffect(() => {
    init();
  }, [init]);

  if (error) {
    return (
      <div className={cn("w-full h-[500px] bg-red-50 rounded-lg p-4", className)}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <p className="text-red-600 font-semibold mb-2">Map Loading Error</p>
            <p className="text-red-500 text-sm">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={mapContainer}
      className={cn(
        "w-full h-[500px] rounded-lg overflow-hidden",
        isLoading && "bg-gray-100",
        className
      )}
    />
  );
}
