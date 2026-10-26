import { useEffect, useState } from "react";
import {
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { divIcon } from "leaflet";
import { Link } from "react-router-dom";
import { StatusBadge } from "./ui";
const pin = divIcon({
  className: "map-pin-wrap",
  html: '<span class="map-pin"><span></span></span>',
  iconSize: [30, 40],
  iconAnchor: [15, 38],
  popupAnchor: [0, -30],
});
function MapEvents({ onSelect, selected }) {
  const map = useMap();
  useMapEvents({
    click: (event) =>
      onSelect?.([
        Number(event.latlng.lat.toFixed(6)),
        Number(event.latlng.lng.toFixed(6)),
      ]),
  });
  useEffect(() => {
    if (selected)
      map.flyTo(selected, Math.max(map.getZoom(), 15), { duration: 0.7 });
  }, [selected?.[0], selected?.[1], map]);
  return null;
}
function MapBounds({ points, selected }) {
  const map = useMap();
  const coordinates = points.map((point) => [
    Number(point.latitude),
    Number(point.longitude),
  ]);
  const key = JSON.stringify(coordinates);
  useEffect(() => {
    if (!selected && coordinates.length)
      map.fitBounds(coordinates, {
        padding: [35, 35],
        maxZoom: 15,
        animate: false,
      });
  }, [key, Boolean(selected), map]);
  return null;
}
export default function LocationMap({
  points = [],
  selected,
  onSelect,
  height = 350,
}) {
  const [tileError, setTileError] = useState(false);
  const [tileRevision, setTileRevision] = useState(0);
  const validPoints = points.filter(
    (point) =>
      Number.isFinite(Number(point.latitude)) &&
      Number.isFinite(Number(point.longitude)) &&
      point.latitude !== null &&
      point.longitude !== null &&
      point.latitude !== undefined,
  );
  return (
    <div className="map-wrap" style={{ height }}>
      <MapContainer
        center={selected || [10.7769, 106.7009]}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          key={tileRevision}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          eventHandlers={{ tileerror: () => setTileError(true) }}
        />
        <MapEvents onSelect={onSelect} selected={selected} />
        <MapBounds points={validPoints} selected={selected} />
        {selected && <Marker position={selected} icon={pin} />}{" "}
        {validPoints.map((point) => (
          <Marker
            key={point.id}
            position={[Number(point.latitude), Number(point.longitude)]}
            icon={pin}
          >
            <Popup>
              <div className="map-popup">
                <StatusBadge status={point.status} />
                <strong>{point.title}</strong>
                <p>{point.address}</p>
                <Link to={`/reports/${point.id}`}>Xem chi tiết →</Link>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {tileError && (
        <div className="map-error" role="status">
          <span>Bản đồ chưa tải được. {onSelect ? "Bạn vẫn có thể nhập tọa độ hoặc thử lại." : "Bạn có thể thử tải lại bản đồ."}</span>
          <button type="button" onClick={() => { setTileError(false); setTileRevision(value => value + 1); }}>Thử lại</button>
        </div>
      )}
      {onSelect && (
        <div className="map-helper">Nhấn trên bản đồ để chọn vị trí sự cố</div>
      )}
    </div>
  );
}
