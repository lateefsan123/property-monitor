import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { useBuildingGeocoding } from "../useBuildingGeocoding";
import { formatPriceRange } from "../formatters";

const DUBAI_CENTER = [25.197, 55.274];
const DEFAULT_ZOOM = 11;

function buildMarkerIcon({ priceDropCount = 0, isWatched = false, newListingCount = 0 }) {
  let tone = "neutral";
  if (priceDropCount > 0) tone = "drop";
  else if (newListingCount > 0) tone = "new";
  else if (isWatched) tone = "watched";

  const badge = priceDropCount > 0
    ? `<span class="la-map-pin-badge drop">${priceDropCount}</span>`
    : newListingCount > 0
      ? `<span class="la-map-pin-badge new">${newListingCount}</span>`
      : "";

  return L.divIcon({
    className: "la-map-pin-wrap",
    html: `
      <span class="la-map-pin la-map-pin-${tone}" aria-hidden>
        <span class="la-map-pin-dot"></span>
        <span class="la-map-pin-ring"></span>
      </span>
      ${badge}
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -16],
  });
}

function FitToMarkers({ points }) {
  const map = useMap();
  const lastSignatureRef = useRef("");

  useEffect(() => {
    if (!points.length) return;
    const signature = points.map((p) => p.locationId).sort().join("|");
    if (signature === lastSignatureRef.current) return;
    lastSignatureRef.current = signature;

    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 14, { animate: true });
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14, animate: true });
  }, [map, points]);

  return null;
}

export default function ListingAlertsMap({ buildings, priceDropsByBuilding, onOpenBuilding, alerts }) {
  const { coords, pending } = useBuildingGeocoding(buildings);

  const points = useMemo(() => {
    const list = [];
    for (const building of buildings) {
      const entry = coords[building.locationId];
      if (!entry || entry.failed || entry.lat == null || entry.lng == null) continue;
      list.push({
        ...building,
        lat: entry.lat,
        lng: entry.lng,
      });
    }
    return list;
  }, [buildings, coords]);

  const missing = useMemo(
    () => buildings.filter((building) => {
      const entry = coords[building.locationId];
      return entry?.failed;
    }),
    [buildings, coords],
  );

  return (
    <div className="la-map-wrap">
      <div className="la-map-topstrip">
        <span className="la-map-count">
          {points.length} of {buildings.length} pinned
        </span>
        {pending > 0 ? (
          <span className="la-map-pending">
            <span className="la-map-pending-dot" />
            Locating {pending} {pending === 1 ? "building" : "buildings"}...
          </span>
        ) : null}
        {missing.length > 0 && pending === 0 ? (
          <span className="la-map-missing" title={missing.map((b) => b.buildingName).join(", ")}>
            {missing.length} could not be located
          </span>
        ) : null}
      </div>

      <MapContainer
        center={DUBAI_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        className="la-map"
        worldCopyJump={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
          subdomains="abcd"
          maxZoom={19}
        />
        <FitToMarkers points={points} />
        {points.map((building) => {
          const priceDropCount = priceDropsByBuilding?.get?.(building.locationId) || 0;
          const isWatched = Boolean(alerts?.watchedSet?.has?.(building.locationId));
          const newListingCount = building.changeSummary?.newListingCount || 0;
          return (
            <Marker
              key={building.locationId}
              position={[building.lat, building.lng]}
              icon={buildMarkerIcon({ priceDropCount, isWatched, newListingCount })}
              eventHandlers={{
                click: () => {
                  if (onOpenBuilding) onOpenBuilding(building);
                },
              }}
            >
              <Popup className="la-map-popup" maxWidth={260} closeButton={false}>
                <div className="la-map-popup-inner">
                  <div className="la-map-popup-title">{building.buildingName}</div>
                  {building.fullPath ? (
                    <div className="la-map-popup-sub">{building.fullPath}</div>
                  ) : null}
                  <div className="la-map-popup-stats">
                    <span>
                      {building.listings?.length || building.listingCount || 0} listings
                    </span>
                    {building.lowestPrice != null || building.highestPrice != null ? (
                      <span>{formatPriceRange(building.lowestPrice, building.highestPrice)}</span>
                    ) : null}
                  </div>
                  {priceDropCount > 0 ? (
                    <div className="la-map-popup-tag drop">
                      {priceDropCount} price {priceDropCount === 1 ? "drop" : "drops"}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className="la-map-popup-btn"
                    onClick={(event) => {
                      event.stopPropagation();
                      if (onOpenBuilding) onOpenBuilding(building);
                    }}
                  >
                    View listings
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
