"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Crosshair, MapPin, Search } from "lucide-react";
import { AdminButton, AdminField, AdminInput } from "@/components/admin/AdminControls";
import { Input } from "@/components/ui/input";

type ScenarioLocation = {
  latitude: number;
  longitude: number;
  address: string;
};

type Props = {
  value: ScenarioLocation;
  mapsLoaded: boolean;
  onChange(value: ScenarioLocation): void;
};

export function ScenarioLocationPicker({ value, mapsLoaded, onChange }: Props) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const valueRef = useRef(value);
  const onChangeRef = useRef(onChange);
  const [isResolving, setIsResolving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    valueRef.current = value;
    onChangeRef.current = onChange;
  }, [onChange, value]);

  const setLocation = useCallback((next: ScenarioLocation) => {
    valueRef.current = next;
    onChangeRef.current(next);
    if (searchInputRef.current) {
      searchInputRef.current.value = next.address;
    }
  }, []);

  const moveMapTo = useCallback((latitude: number, longitude: number, zoom = 16) => {
    if (!mapRef.current || !markerRef.current) return;
    const position = new google.maps.LatLng(latitude, longitude);
    mapRef.current.setCenter(position);
    mapRef.current.setZoom(zoom);
    markerRef.current.setPosition(position);
  }, []);

  const reverseGeocode = useCallback(async (latitude: number, longitude: number) => {
    setIsResolving(true);
    setMessage(null);
    try {
      const geocoder = new google.maps.Geocoder();
      const response = await geocoder.geocode({ location: { lat: latitude, lng: longitude } });
      const address = response.results[0]?.formatted_address || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
      setLocation({ latitude, longitude, address });
    } catch {
      setMessage("Alamat tidak bisa dibaca otomatis. Koordinat tetap dipakai.");
      setLocation({ latitude, longitude, address: `${latitude.toFixed(6)}, ${longitude.toFixed(6)}` });
    } finally {
      setIsResolving(false);
    }
  }, [setLocation]);

  useEffect(() => {
    if (!mapsLoaded || !mapContainerRef.current || typeof google === "undefined" || !google.maps) return;
    if (mapRef.current && mapContainerRef.current.querySelector(".gm-style")) return;

    if (markerRef.current) markerRef.current.setMap(null);
    mapRef.current = null;
    markerRef.current = null;
    autocompleteRef.current = null;

    let cancelled = false;
    async function initializeMap() {
      if (cancelled || !mapContainerRef.current) return;

      if (typeof google.maps.importLibrary === "function") {
        await Promise.all([
          google.maps.importLibrary("maps"),
          google.maps.importLibrary("marker"),
          google.maps.importLibrary("places"),
          google.maps.importLibrary("geocoding"),
        ]);
      }

      if (typeof google.maps.Map !== "function") {
        throw new Error("Google Maps belum siap. Coba reload halaman.");
      }

      const currentValue = valueRef.current;
      const initialPosition = { lat: currentValue.latitude, lng: currentValue.longitude };
      const map = new google.maps.Map(mapContainerRef.current, {
        center: initialPosition,
        zoom: 15,
        mapId: "cloudadditive-map",
        disableDefaultUI: true,
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
      });
      const marker = new google.maps.Marker({
        position: initialPosition,
        map,
        draggable: true,
        title: "Scenario delivery location",
      });

      mapRef.current = map;
      markerRef.current = marker;

      marker.addListener("dragend", () => {
        const position = marker.getPosition();
        if (position) void reverseGeocode(position.lat(), position.lng());
      });
      map.addListener("click", (event: google.maps.MapMouseEvent) => {
        if (!event.latLng) return;
        marker.setPosition(event.latLng);
        void reverseGeocode(event.latLng.lat(), event.latLng.lng());
      });

      if (searchInputRef.current) {
        const autocomplete = new google.maps.places.Autocomplete(searchInputRef.current, {
          componentRestrictions: { country: "id" },
          fields: ["formatted_address", "geometry", "name"],
        });
        autocomplete.bindTo("bounds", map);
        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          const location = place.geometry?.location;
          if (!location) {
            setMessage("Lokasi dari pencarian belum punya koordinat.");
            return;
          }
          const latitude = location.lat();
          const longitude = location.lng();
          moveMapTo(latitude, longitude, 17);
          setLocation({
            latitude,
            longitude,
            address: place.formatted_address || place.name || `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          });
        });
        autocompleteRef.current = autocomplete;
      }
    }

    void initializeMap().catch(() => setMessage("Google Maps belum siap. Coba reload halaman jika peta tidak muncul."));

    return () => {
      cancelled = true;
      if (markerRef.current) markerRef.current.setMap(null);
      mapRef.current = null;
      markerRef.current = null;
      autocompleteRef.current = null;
    };
  }, [mapsLoaded, moveMapTo, reverseGeocode, setLocation]);

  useEffect(() => {
    if (searchInputRef.current && searchInputRef.current.value !== value.address) {
      searchInputRef.current.value = value.address;
    }
    moveMapTo(value.latitude, value.longitude, mapRef.current?.getZoom() ?? 15);
  }, [moveMapTo, value.address, value.latitude, value.longitude]);

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      setMessage("Browser tidak mendukung geolocation.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        moveMapTo(latitude, longitude, 17);
        void reverseGeocode(latitude, longitude);
      },
      () => setMessage("Lokasi browser tidak bisa diakses.")
    );
  }

  return (
    <div className="grid gap-3 xl:grid-cols-[minmax(320px,0.9fr)_1fr]">
      <div className="space-y-3">
        <AdminField label="Delivery location">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#98a39e]" strokeWidth={1.7} />
              <Input
                ref={searchInputRef}
                placeholder="Cari alamat atau klik pada peta..."
                className="h-9 rounded-md border-[var(--admin-line)] bg-white pl-9 text-sm font-medium shadow-[var(--admin-shadow-control)] focus-visible:border-[#d8dbe1] focus-visible:ring-[#11111a]/5"
                defaultValue={value.address}
                disabled={!mapsLoaded}
              />
            </div>
            <AdminButton type="button" variant="outline" size="icon" onClick={useCurrentLocation} disabled={!mapsLoaded} className="border-[var(--admin-line)] bg-white" aria-label="Use current location">
              <Crosshair className="h-4 w-4" />
            </AdminButton>
          </div>
        </AdminField>

        <div className="grid gap-3 sm:grid-cols-2">
          <AdminField label="Latitude">
            <AdminInput
              type="number"
              step="0.000001"
              value={value.latitude}
              onChange={(event) => onChange({ ...value, latitude: Number(event.target.value) })}
            />
          </AdminField>
          <AdminField label="Longitude">
            <AdminInput
              type="number"
              step="0.000001"
              value={value.longitude}
              onChange={(event) => onChange({ ...value, longitude: Number(event.target.value) })}
            />
          </AdminField>
        </div>
        <AdminField label="Address">
          <AdminInput value={value.address} onChange={(event) => onChange({ ...value, address: event.target.value })} />
        </AdminField>
      </div>

      <div className="overflow-hidden rounded-[0.75rem] border border-[var(--admin-line)] bg-[#eef1ee]">
        <div ref={mapContainerRef} className="h-[300px] w-full bg-[#eef1ee]">
          {!mapsLoaded && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-xs font-semibold text-[#73817a]">
              <MapPin className="h-5 w-5" />
              Google Maps belum siap.
            </div>
          )}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--admin-line)] bg-white px-3 py-2 text-[11px] text-[#6f7b75]">
          <span>{isResolving ? "Membaca alamat..." : "Klik peta atau geser pin untuk mengisi lokasi."}</span>
          {message && <span className="font-semibold text-amber-700">{message}</span>}
        </div>
      </div>
    </div>
  );
}
