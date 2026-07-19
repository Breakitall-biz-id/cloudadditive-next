"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SimulationBatchResult } from "@/lib/printer-matching/simulation";

export function MatchingDistributionMap({ data }: { data: SimulationBatchResult }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded] = useState(() => typeof google !== "undefined" && Boolean(google.maps));
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const matched = useMemo(() => data.results.filter((result) => result.success), [data]);

  useEffect(() => {
    if (!loaded || !containerRef.current || !window.google?.maps || matched.length === 0) return;
    const map = new google.maps.Map(containerRef.current, {
      center: matched[0].selected.coordinates,
      zoom: 10,
      mapTypeControl: false,
      streetViewControl: false,
    });
    const bounds = new google.maps.LatLngBounds();
    const grouped = new Map<string, typeof matched>();

    for (const result of matched) {
      const customer = result.customerCoordinates;
      const provider = result.selected.coordinates;
      bounds.extend(customer);
      bounds.extend(provider);
      new google.maps.Marker({
        map,
        position: customer,
        title: result.label,
        icon: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
      });
      new google.maps.Polyline({
        map,
        path: [customer, provider],
        strokeColor: "#0f766e",
        strokeOpacity: 0.55,
        strokeWeight: 2,
      });
      const key = `${provider.lat.toFixed(6)},${provider.lng.toFixed(6)}`;
      grouped.set(key, [...(grouped.get(key) ?? []), result]);
    }

    for (const group of grouped.values()) {
      const printerCounts = new Map<string, { name: string; provider: string; count: number; queue: number }>();
      for (const result of group) {
        const current = printerCounts.get(result.selected.printerId);
        printerCounts.set(result.selected.printerId, {
          name: result.selected.printerName,
          provider: result.selected.providerName,
          count: (current?.count ?? 0) + 1,
          queue: result.queueAfterMinutes,
        });
      }
      const first = group[0];
      const marker = new google.maps.Marker({
        map,
        position: first.selected.coordinates,
        title: `${first.selected.providerName}: ${group.length} allocations`,
        label: { text: String(group.length), color: "white", fontWeight: "700" },
        icon: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
      });
      const rows = [...printerCounts.values()].map((printer) => `<li><strong>${escapeHtml(printer.name)}</strong>: ${printer.count} orders, queue ${printer.queue} min</li>`).join("");
      const info = new google.maps.InfoWindow({ content: `<div style="min-width:220px"><strong>${escapeHtml(first.selected.providerName)}</strong><ul>${rows}</ul></div>` });
      marker.addListener("click", () => info.open({ map, anchor: marker }));
    }
    map.fitBounds(bounds, 60);
  }, [loaded, matched]);

  if (!apiKey) {
    return <div className="rounded-[0.75rem] border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">Google Maps key is not configured. Allocation table remains available.</div>;
  }

  return (
    <section className="overflow-hidden rounded-[0.75rem] border border-[var(--admin-line)] bg-white shadow-[var(--admin-shadow-card)]">
      <div className="border-b border-slate-100 px-5 py-4"><h3 className="text-sm font-semibold uppercase tracking-widest text-slate-700">Allocation distribution</h3><p className="mt-1 text-xs text-slate-500">Blue: scenarios. Green: grouped provider location. Click a provider marker to inspect each printer.</p></div>
      <div ref={containerRef} className="h-[480px] w-full bg-slate-100" />
    </section>
  );
}

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[character] ?? character);
}
