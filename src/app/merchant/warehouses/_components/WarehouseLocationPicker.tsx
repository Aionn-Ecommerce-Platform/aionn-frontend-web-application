"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";
import { useTranslation } from "@/hooks";

type PickerStatus =
  | "idle"
  | "searching"
  | "found"
  | "approximate"
  | "not-found";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org";
const DEFAULT_CENTER: [number, number] = [10.7769, 106.7009];
const RED_PIN_HTML =
  '<div style="width:18px;height:18px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#dc2626;border:2px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.45)"></div>';

export function WarehouseLocationPicker({
  address,
  onAddressChange,
}: {
  address: string;
  onAddressChange: (address: string) => void;
}) {
  const { t, locale } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<PickerStatus>("idle");
  const language = locale === "vi" ? "vi" : "en";

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const leaflet = await import("leaflet");
      if (cancelled || !containerRef.current || mapRef.current) return;
      const L = leaflet.default ?? leaflet;
      const map = L.map(containerRef.current, {
        center: DEFAULT_CENTER,
        zoom: 12,
        scrollWheelZoom: false,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);
      const pinIcon = L.divIcon({
        html: RED_PIN_HTML,
        className: "",
        iconSize: [18, 18],
        iconAnchor: [9, 18],
      });

      map.on("click", async (event) => {
        const { lat, lng } = event.latlng;
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          markerRef.current = L.marker([lat, lng], { icon: pinIcon }).addTo(
            map,
          );
        }
        setStatus("searching");
        try {
          const response = await fetch(
            `${NOMINATIM_URL}/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
            { headers: { "Accept-Language": language } },
          );
          if (!response.ok) throw new Error("reverse geocode failed");
          const data = (await response.json()) as { display_name?: string };
          if (data.display_name) {
            onAddressChange(data.display_name);
            setStatus("found");
          } else {
            setStatus("not-found");
          }
        } catch {
          setStatus("not-found");
        }
      });

      mapRef.current = map;
      leafletRef.current = L;
      setReady(true);
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
      markerRef.current = null;
      leafletRef.current = null;
      setReady(false);
    };
  }, [language, onAddressChange]);

  useEffect(() => {
    let cancelled = false;
    const term = address.trim();

    const timer = window.setTimeout(async () => {
      if (term.length < 5) {
        markerRef.current?.remove();
        markerRef.current = null;
        setStatus("idle");
        return;
      }
      const L = leafletRef.current;
      const map = mapRef.current;
      if (!L || !map) return;

      setStatus("searching");

      const fetchPlaces = async (query: string) => {
        const response = await fetch(
          `${NOMINATIM_URL}/search?format=jsonv2&limit=3&addressdetails=1&countrycodes=vn&q=${encodeURIComponent(query)}`,
          { headers: { "Accept-Language": language } },
        );
        if (!response.ok) throw new Error("geocode failed");
        return (await response.json()) as Array<{
          lat?: string;
          lon?: string;
          display_name?: string;
        }>;
      };

      const applyPlace = (
        place: { lat?: string; lon?: string } | undefined,
        approximate: boolean,
      ) => {
        const lat = Number(place?.lat);
        const lng = Number(place?.lon);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng]);
        } else {
          markerRef.current = L.marker([lat, lng], {
            icon: L.divIcon({
              html: RED_PIN_HTML,
              className: "",
              iconSize: [18, 18],
              iconAnchor: [9, 18],
            }),
          }).addTo(map);
        }
        map.setView([lat, lng], Math.max(map.getZoom(), 15));
        setStatus(approximate ? "approximate" : "found");
        return true;
      };

      try {
        const parts = term
          .split(",")
          .map((part) => part.trim())
          .filter(Boolean);
        let places = await fetchPlaces(term);
        if (cancelled) return;

        if (places.length > 0) {
          applyPlace(places[0], false);
          return;
        }

        if (parts.length >= 2) {
          // Street-level data is sparse in many Vietnamese provinces. Fall back
          // to the ward/district so the map still opens near the right area.
          await new Promise((resolve) => window.setTimeout(resolve, 1100));
          if (cancelled) return;
          const locality = parts.slice(-2).join(", ");
          places = await fetchPlaces(locality);
          if (cancelled) return;
          if (places.length > 0) {
            const target = parts[parts.length - 2]?.toLowerCase();
            const preferred = target
              ? places.find((place) => {
                  const display = (place.display_name ?? "").toLowerCase();
                  return (
                    display.includes(`xã ${target}`) ||
                    display.includes(`phường ${target}`) ||
                    display.includes(`thị trấn ${target}`)
                  );
                })
              : undefined;
            if (applyPlace(preferred ?? places[0], true)) return;
          }
        }

        markerRef.current?.remove();
        markerRef.current = null;
        setStatus("not-found");
      } catch {
        if (!cancelled) setStatus("not-found");
      }
    }, 1200);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [address, ready, language]);

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-lg border border-gray-300">
        <div
          ref={containerRef}
          aria-label={t("merchant.warehouses.mapTitle")}
          className="h-64 w-full"
        />
        {status === "searching" && (
          <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-gray-700 shadow">
              <Loader2 size={12} className="animate-spin" />
              {t("merchant.warehouses.mapSearching")}
            </span>
          </div>
        )}
      </div>
      <div className="text-xs">
        <p
          className={
            status === "not-found" || status === "approximate"
              ? "font-medium text-amber-700"
              : "text-gray-500"
          }
        >
          {status === "not-found"
            ? t("merchant.warehouses.mapNotFound")
            : status === "approximate"
              ? t("merchant.warehouses.mapApproximate")
              : t("merchant.warehouses.mapHint")}
        </p>
      </div>
    </div>
  );
}
