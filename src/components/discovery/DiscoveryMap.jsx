import React, { useState, useRef, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Search, Loader2 } from 'lucide-react';

// Fix for default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function LocationMarker({ onLocationSelect, position }) {
    useMapEvents({
        click(e) {
            onLocationSelect(e.latlng);
        },
    });
    return position ? <Marker position={position} /> : null;
}

function FlyToLocation({ target }) {
    const map = useMap();
    useEffect(() => {
        if (target) {
            map.flyTo([target.lat, target.lng], 14, { duration: 1.2 });
        }
    }, [target]);
    return null;
}

function MapSearch({ onLocationSelect }) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [flyTarget, setFlyTarget] = useState(null);
    const debounceRef = useRef(null);

    async function search(q) {
        if (!q.trim()) { setResults([]); return; }
        setLoading(true);
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=5`);
        const data = await res.json();
        setResults(data);
        setLoading(false);
    }

    function handleChange(e) {
        const val = e.target.value;
        setQuery(val);
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => search(val), 400);
    }

    function selectResult(result) {
        const latlng = { lat: parseFloat(result.lat), lng: parseFloat(result.lon) };
        setFlyTarget(latlng);
        if (onLocationSelect) onLocationSelect(latlng);
        setQuery(result.display_name.split(',')[0]);
        setResults([]);
    }

    return (
        <>
            <FlyToLocation target={flyTarget} />
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] w-72 max-w-[calc(100%-2rem)]">
                <div className="relative bg-white rounded-xl shadow-lg border border-slate-200 flex items-center gap-2 px-3 py-2">
                    {loading ? <Loader2 className="w-4 h-4 text-[#b66c34] animate-spin flex-shrink-0" /> : <Search className="w-4 h-4 text-[#b66c34] flex-shrink-0" />}
                    <input
                        value={query}
                        onChange={handleChange}
                        placeholder="Zoek een locatie..."
                        className="flex-1 text-sm outline-none bg-transparent text-[#6b5344] placeholder:text-slate-400"
                    />
                </div>
                {results.length > 0 && (
                    <div className="mt-1 bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
                        {results.map((r) => (
                            <button
                                key={r.place_id}
                                onClick={() => selectResult(r)}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-[#f4d0a8] transition-colors border-b border-slate-100 last:border-0 text-[#6b5344]"
                            >
                                <span className="font-medium">{r.display_name.split(',')[0]}</span>
                                <span className="text-xs text-slate-400 ml-1">{r.display_name.split(',').slice(1, 3).join(',')}</span>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

export default function DiscoveryMap({ 
    discoveries = [], 
    onLocationSelect, 
    selectedPosition, 
    center = [52.0, 5.0],
    zoom = 7,
    height = "400px",
    interactive = true
}) {
    return (
        <div style={{ height }} className="rounded-2xl overflow-hidden border border-slate-200 relative">
            <MapContainer 
                center={center} 
                zoom={zoom} 
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={interactive}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {interactive && onLocationSelect && (
                    <>
                        <LocationMarker onLocationSelect={onLocationSelect} position={selectedPosition} />
                        <MapSearch onLocationSelect={onLocationSelect} />
                    </>
                )}
                
                {discoveries.map((discovery) => (
                    discovery.latitude && discovery.longitude && (
                        <Marker 
                            key={discovery.id} 
                            position={[discovery.latitude, discovery.longitude]}
                        >
                            <Popup>
                                <div className="p-2">
                                    {discovery.image_url && (
                                        <img 
                                            src={discovery.image_url} 
                                            alt="Discovery" 
                                            className="w-full h-24 object-cover rounded-lg mb-2"
                                        />
                                    )}
                                    <p className="font-semibold text-sm">
                                        {discovery.ai_identification?.name || 'Unknown Object'}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {discovery.location_name || 'Location not specified'}
                                    </p>
                                </div>
                            </Popup>
                        </Marker>
                    )
                ))}
            </MapContainer>
        </div>
    );
}