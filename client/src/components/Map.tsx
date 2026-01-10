/// <reference types="@types/google.maps" />

import { useEffect, useRef, useState } from "react";
import { usePersistFn } from "@/hooks/usePersistFn";
import { cn } from "@/lib/utils";

declare global {
  interface Window {
    google?: typeof google;
  }
}

interface MapsConfig {
  apiKey: string;
}

function getMapsConfig(): MapsConfig {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  if (!apiKey) {
    console.warn(
      "[Maps] Warning: VITE_GOOGLE_MAPS_API_KEY is not configured. " +
      "Map functionality may not work. Please set this environment variable."
    );
  }

  return { apiKey };
}

function loadMapScript(config: MapsConfig): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.maps) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${config.apiKey}&v=weekly&libraries=marker,places,geocoding,geometry,routes`;
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
