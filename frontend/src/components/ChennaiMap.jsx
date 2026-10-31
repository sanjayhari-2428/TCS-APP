import React, { useState, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  CircleMarker,
  Popup,
  Marker,
  useMap
} from 'react-leaflet';
import L from 'leaflet';
import {
  Layers,
  MapPin,
  Waves,
  AlertTriangle,
  Building2,
  Wrench,
  Search,
  Filter,
  Eye,
  Info,
  CheckCircle,
  HelpCircle,
  X
} from 'lucide-react';
import StatusBadge from './StatusBadge';

// Fix default leaflet marker icon issues in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom DivIcons for crisp smart-city aesthetic
const createDivIcon = (color, symbol) => {
  return L.divIcon({
    className: 'custom-map-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 26px;
        height: 26px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #070B19;
        font-weight: bold;
        font-size: 11px;
        border: 2px solid #ffffff;
        box-shadow: 0 0 10px ${color}88;
      ">
        ${symbol}
      </div>
    `,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13]
  });
};

const icons = {
  householdNormal: createDivIcon('#10B981', 'H'),
  householdHigh: createDivIcon('#F59E0B', 'H'),
  householdVeryHigh: createDivIcon('#EF4444', 'H'),
  reservoirNormal: createDivIcon('#00F5D4', 'R'),
  reservoirModerate: createDivIcon('#F59E0B', 'R'),
  reservoirLow: createDivIcon('#EF4444', 'R'),
  distributionPoint: createDivIcon('#00A8E8', 'D'),
  taskMarker: createDivIcon('#A855F7', 'T')
};

// Component to handle map pan/zoom programmatically
function ChangeMapView({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom);
    }
  }, [center, zoom, map]);
  return null;
}

export default function ChennaiMap({
  households = [],
  reservoirs = [],
  riskAreas = [],
  distributionPoints = [],
  tasks = [],
  geojsonData = null,
  onSelectHousehold = null,
  onOpenAssignModal = null,
  isMini = false
}) {
  const defaultCenter = [13.0418, 80.2341]; // Chennai Center (T. Nagar / GCC)
  const defaultZoom = isMini ? 11 : 12;

  // Layer Visibility Controls (Section 2.E)
  const [layers, setLayers] = useState({
    households: true,
    heatmap: true,
    reservoirs: true,
    shortageRisk: true,
    distributionPoints: true,
    tasks: true
  });

  // Filters (Section 2.A & 2.B)
  const [searchId, setSearchId] = useState('');
  const [consumptionFilter, setConsumptionFilter] = useState('all');
  const [selectedAreaId, setSelectedAreaId] = useState('all');
  const [showLayerDrawer, setShowLayerDrawer] = useState(!isMini);
  const [selectedDetail, setSelectedDetail] = useState(null);

  // Filter households
  const filteredHouseholds = households.filter((h) => {
    if (!h.latitude || !h.longitude) return false; // Show only placed markers on map
    if (searchId && !h.household_id.toLowerCase().includes(searchId.toLowerCase())) return false;
    if (consumptionFilter !== 'all' && h.consumption_status !== consumptionFilter) return false;
    if (selectedAreaId !== 'all' && h.area_id !== selectedAreaId) return false;
    return true;
  });

  // Unassigned households count
  const unassignedCount = households.filter((h) => !h.has_verified_coordinates).length;

  const toggleLayer = (layerKey) => {
    setLayers((prev) => ({ ...prev, [layerKey]: !prev[layerKey] }));
  };

  // GeoJSON style handler
  const getGeoJsonStyle = (feature) => {
    const isDistrict = feature.properties?.type === 'district_boundary';
    if (isDistrict) {
      return {
        color: '#00F5D4',
        weight: 3,
        opacity: 0.8,
        dashArray: '6, 6',
        fillColor: '#00F5D4',
        fillOpacity: 0.03
      };
    }

    // Administrative zone styles based on risk or consumption
    const areaId = feature.properties?.area_id;
    const riskInfo = riskAreas.find((r) => r.area_id === areaId);

    let fillColor = '#3B82F6';
    let fillOpacity = 0.15;

    if (layers.shortageRisk && riskInfo) {
      if (riskInfo.ai_risk_level === 'High Risk') {
        fillColor = '#EF4444';
        fillOpacity = 0.35;
      } else if (riskInfo.ai_risk_level === 'Medium Risk') {
        fillColor = '#F59E0B';
        fillOpacity = 0.28;
      } else if (riskInfo.ai_risk_level === 'Low Risk') {
        fillColor = '#0EA5E9';
        fillOpacity = 0.2;
      } else {
        fillColor = '#10B981';
        fillOpacity = 0.15;
      }
    } else if (layers.heatmap) {
      // Heatmap styling based on average consumption of assigned households
      const assigned = households.filter((h) => h.area_id === areaId);
      const avg = assigned.length
        ? assigned.reduce((acc, h) => acc + (h.daily_consumption || 0), 0) / assigned.length
        : 250;
      if (avg > 400) fillColor = '#EF4444';
      else if (avg > 320) fillColor = '#F97316';
      else if (avg > 250) fillColor = '#EAB308';
      else fillColor = '#10B981';
      fillOpacity = 0.25;
    }

    return {
      color: fillColor,
      weight: 1.8,
      opacity: 0.7,
      fillColor: fillColor,
      fillOpacity: fillOpacity
    };
  };

  const onEachFeature = (feature, layer) => {
    const props = feature.properties || {};
    if (props.type === 'district_boundary') {
      layer.bindPopup(`
        <div style="font-family: sans-serif; font-size: 13px;">
          <strong style="color: #00F5D4;">${props.name}</strong><br/>
          <span style="color: #94A3B8;">Administrative Boundary of Chennai District, TN</span><br/>
          <span style="color: #94A3B8;">Official GCC Area: ~${props.area_sqkm} sq.km</span>
        </div>
      `);
      return;
    }

    const areaId = props.area_id;
    const riskInfo = riskAreas.find((r) => r.area_id === areaId);

    layer.on({
      click: () => {
        setSelectedDetail({
          type: 'area',
          data: {
            ...props,
            riskInfo
          }
        });
      }
    });

    layer.bindTooltip(
      `<strong>${props.name}</strong><br/>Risk: ${riskInfo?.ai_risk_level || 'Normal'}`,
      { sticky: true }
    );
  };

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-navy-700/60 shadow-2xl bg-navy-950">
      {/* Map Control Toolbar (Top Right / Top Left) */}
      {!isMini && (
        <div className="absolute top-4 left-4 z-[500] flex flex-wrap items-center gap-2 max-w-[calc(100%-2rem)]">
          {/* Search Household ID */}
          <div className="flex items-center bg-navy-900/90 backdrop-blur-md border border-navy-700 rounded-xl px-3 py-1.5 shadow-lg text-xs">
            <Search className="w-3.5 h-3.5 text-brand-teal mr-2" />
            <input
              type="text"
              placeholder="Search Household ID (e.g. HH001)..."
              value={searchId}
              onChange={(e) => setSearchId(e.target.value)}
              className="bg-transparent border-none text-white focus:outline-none w-44 placeholder-slate-400"
            />
            {searchId && (
              <button onClick={() => setSearchId('')} className="text-slate-400 hover:text-white">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Consumption Filter */}
          <div className="flex items-center bg-navy-900/90 backdrop-blur-md border border-navy-700 rounded-xl px-3 py-1.5 shadow-lg text-xs">
            <Filter className="w-3.5 h-3.5 text-brand-blue mr-2" />
            <select
              value={consumptionFilter}
              onChange={(e) => setConsumptionFilter(e.target.value)}
              className="bg-transparent border-none text-white focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-navy-900 text-white">All Consumption Levels</option>
              <option value="Normal" className="bg-navy-900 text-emerald-400">Normal (&lt;300 L)</option>
              <option value="High" className="bg-navy-900 text-amber-400">High (300-400 L)</option>
              <option value="Very High" className="bg-navy-900 text-rose-400">Very High (&gt;400 L)</option>
            </select>
          </div>

          {/* Toggle Layer Drawer Button */}
          <button
            onClick={() => setShowLayerDrawer(!showLayerDrawer)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border shadow-lg backdrop-blur-md transition-all ${
              showLayerDrawer
                ? 'bg-brand-teal text-navy-950 border-brand-teal font-semibold'
                : 'bg-navy-900/90 text-slate-300 border-navy-700 hover:border-brand-teal/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Map Layers</span>
          </button>

          {/* Unassigned demo warning pill */}
          {unassignedCount > 0 && onOpenAssignModal && (
            <button
              onClick={() => onOpenAssignModal()}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium shadow-lg backdrop-blur-md hover:bg-amber-500/25 transition-all"
            >
              <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>{unassignedCount} Households Unassigned (Assign GPS)</span>
            </button>
          )}
        </div>
      )}

      {/* Layer Control Drawer (Floating) */}
      {!isMini && showLayerDrawer && (
        <div className="absolute top-16 left-4 z-[500] w-64 bg-navy-900/95 backdrop-blur-md border border-navy-700/80 rounded-2xl p-4 shadow-2xl space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-navy-800">
            <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center">
              <Layers className="w-3.5 h-3.5 mr-1.5 text-brand-teal" /> Chennai Map Layers
            </span>
            <button onClick={() => setShowLayerDrawer(false)} className="text-slate-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2 text-xs">
            {/* Layer 1: Households */}
            <label className="flex items-center justify-between cursor-pointer py-1 px-1.5 rounded-lg hover:bg-navy-800 transition-colors">
              <span className="flex items-center text-slate-200">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 mr-2"></span>
                1. Household Locations
              </span>
              <input
                type="checkbox"
                checked={layers.households}
                onChange={() => toggleLayer('households')}
                className="rounded border-navy-600 text-brand-teal focus:ring-0 bg-navy-950 cursor-pointer"
              />
            </label>

            {/* Layer 2: Heatmap */}
            <label className="flex items-center justify-between cursor-pointer py-1 px-1.5 rounded-lg hover:bg-navy-800 transition-colors">
              <span className="flex items-center text-slate-200">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 mr-2"></span>
                2. Consumption Heatmap
              </span>
              <input
                type="checkbox"
                checked={layers.heatmap}
                onChange={() => toggleLayer('heatmap')}
                className="rounded border-navy-600 text-brand-teal focus:ring-0 bg-navy-950 cursor-pointer"
              />
            </label>

            {/* Layer 3: Reservoirs */}
            <label className="flex items-center justify-between cursor-pointer py-1 px-1.5 rounded-lg hover:bg-navy-800 transition-colors">
              <span className="flex items-center text-slate-200">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 mr-2"></span>
                3. Reservoirs and Tanks
              </span>
              <input
                type="checkbox"
                checked={layers.reservoirs}
                onChange={() => toggleLayer('reservoirs')}
                className="rounded border-navy-600 text-brand-teal focus:ring-0 bg-navy-950 cursor-pointer"
              />
            </label>

            {/* Layer 4: Shortage Risk */}
            <label className="flex items-center justify-between cursor-pointer py-1 px-1.5 rounded-lg hover:bg-navy-800 transition-colors">
              <span className="flex items-center text-slate-200">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400 mr-2"></span>
                4. Water Shortage Risk
              </span>
              <input
                type="checkbox"
                checked={layers.shortageRisk}
                onChange={() => toggleLayer('shortageRisk')}
                className="rounded border-navy-600 text-brand-teal focus:ring-0 bg-navy-950 cursor-pointer"
              />
            </label>

            {/* Layer 5: Distribution Points */}
            <label className="flex items-center justify-between cursor-pointer py-1 px-1.5 rounded-lg hover:bg-navy-800 transition-colors">
              <span className="flex items-center text-slate-200">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 mr-2"></span>
                5. Distribution Points
              </span>
              <input
                type="checkbox"
                checked={layers.distributionPoints}
                onChange={() => toggleLayer('distributionPoints')}
                className="rounded border-navy-600 text-brand-teal focus:ring-0 bg-navy-950 cursor-pointer"
              />
            </label>

            {/* Layer 6: Tasks */}
            <label className="flex items-center justify-between cursor-pointer py-1 px-1.5 rounded-lg hover:bg-navy-800 transition-colors">
              <span className="flex items-center text-slate-200">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400 mr-2"></span>
                6. Management Tasks
              </span>
              <input
                type="checkbox"
                checked={layers.tasks}
                onChange={() => toggleLayer('tasks')}
                className="rounded border-navy-600 text-brand-teal focus:ring-0 bg-navy-950 cursor-pointer"
              />
            </label>
          </div>

          {/* Color Legend */}
          <div className="pt-2 border-t border-navy-800 space-y-1 text-[11px] text-slate-400 font-mono">
            <span className="text-slate-300 font-bold block mb-1">Consumption / Risk Scale</span>
            <div className="flex items-center justify-between">
              <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-emerald-400 mr-1.5"></span>Green</span>
              <span>Low / Normal</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-yellow-400 mr-1.5"></span>Yellow</span>
              <span>Moderate</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-orange-400 mr-1.5"></span>Orange</span>
              <span>High</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center"><span className="w-2 h-2 rounded-full bg-rose-500 mr-1.5"></span>Red</span>
              <span>Very High / Critical</span>
            </div>
          </div>
        </div>
      )}

      {/* Selected Item Drawer (Bottom Right) */}
      {!isMini && selectedDetail && (
        <div className="absolute bottom-4 right-4 z-[500] w-80 bg-navy-900/95 backdrop-blur-md border border-brand-teal/40 rounded-2xl p-4 shadow-2xl text-xs space-y-2">
          <div className="flex items-start justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-mono text-brand-teal">
                {selectedDetail.type === 'household' ? 'Household Profile' : 'Chennai Zone Risk Profile'}
              </span>
              <h4 className="font-bold text-white text-sm">
                {selectedDetail.type === 'household'
                  ? selectedDetail.data.household_id
                  : selectedDetail.data.name}
              </h4>
            </div>
            <button onClick={() => setSelectedDetail(null)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>

          {selectedDetail.type === 'household' ? (
            <div className="space-y-2 pt-1 border-t border-navy-800">
              <div className="flex justify-between">
                <span className="text-slate-400">Area:</span>
                <span className="text-slate-200 font-medium">{selectedDetail.data.area_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Occupants:</span>
                <span className="text-slate-200 font-medium">{selectedDetail.data.occupants} persons</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Daily Consumption:</span>
                <span className="text-brand-teal font-bold">{selectedDetail.data.daily_consumption} L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">7-Day Moving Avg:</span>
                <span className="text-slate-200">{selectedDetail.data.seven_day_average} L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Predicted Future:</span>
                <span className="text-brand-blue font-semibold">{selectedDetail.data.predicted_future_consumption} L</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Estimated Water Bill:</span>
                <span className="text-emerald-400 font-mono">₹{selectedDetail.data.estimated_bill_inr}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-navy-800/80">
                <span className="text-slate-400">Status:</span>
                <StatusBadge status={selectedDetail.data.consumption_status} />
              </div>
              {onSelectHousehold && (
                <button
                  onClick={() => onSelectHousehold(selectedDetail.data.household_id)}
                  className="w-full mt-2 py-1.5 rounded-lg bg-brand-blue/20 hover:bg-brand-blue/30 text-brand-blue border border-brand-blue/40 font-medium text-center transition-colors"
                >
                  View Complete Historical Analytics →
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2 pt-1 border-t border-navy-800">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">AI Risk Level:</span>
                <StatusBadge status={selectedDetail.data.riskInfo?.ai_risk_level || 'Normal'} />
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Consumption:</span>
                <span className="text-slate-200 font-medium">
                  {selectedDetail.data.riskInfo?.current_consumption_liters?.toLocaleString() || '38,500'} L
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Predicted Demand:</span>
                <span className="text-brand-blue font-bold">
                  {selectedDetail.data.riskInfo?.predicted_demand_liters?.toLocaleString() || '41,200'} L
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Monsoon Rainfall Info:</span>
                <span className="text-slate-200 font-mono">
                  {selectedDetail.data.riskInfo?.rainfall_info?.status || 'Normal'} (
                  {selectedDetail.data.riskInfo?.rainfall_info?.annual_departure_pct || '0'}%)
                </span>
              </div>
              <div className="pt-2 border-t border-navy-800">
                <span className="text-slate-400 block mb-0.5 font-semibold">AI Risk Driver:</span>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  {selectedDetail.data.riskInfo?.explanation ||
                    'Seasonal demand dynamics within expected operational bounds.'}
                </p>
              </div>
              <div className="pt-1.5 border-t border-navy-800">
                <span className="text-brand-teal block mb-0.5 font-semibold">Recommended Action:</span>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  {selectedDetail.data.riskInfo?.recommended_action ||
                    'Maintain regular continuous feeder supply schedule.'}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main React Leaflet Container */}
      <MapContainer
        center={defaultCenter}
        zoom={defaultZoom}
        scrollWheelZoom={!isMini}
        zoomControl={!isMini}
        className="w-full h-full"
      >
        <ChangeMapView center={defaultCenter} zoom={defaultZoom} />

        {/* Base Map: OpenStreetMap */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Chennai GeoJSON Administrative Boundaries */}
        {geojsonData && (
          <GeoJSON
            key={JSON.stringify(layers)}
            data={geojsonData}
            style={getGeoJsonStyle}
            onEachFeature={onEachFeature}
          />
        )}

        {/* Layer 1: Registered Household Locations */}
        {layers.households &&
          filteredHouseholds.map((h) => {
            const icon =
              h.consumption_status === 'Very High'
                ? icons.householdVeryHigh
                : h.consumption_status === 'High'
                ? icons.householdHigh
                : icons.householdNormal;

            return (
              <Marker
                key={h.household_id}
                position={[h.latitude, h.longitude]}
                icon={icon}
                eventHandlers={{
                  click: () => {
                    setSelectedDetail({ type: 'household', data: h });
                  }
                }}
              >
                <Popup>
                  <div className="p-1 space-y-1.5 text-xs text-slate-100 min-w-[200px]">
                    <div className="flex justify-between items-center border-b border-navy-700 pb-1">
                      <strong className="text-brand-teal font-mono">{h.household_id}</strong>
                      <span className="text-[10px] text-slate-400 font-mono">{h.area_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Daily:</span>
                      <span className="font-bold text-white">{h.daily_consumption} L</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">7-Day Avg:</span>
                      <span className="text-slate-300">{h.seven_day_average} L</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Predicted:</span>
                      <span className="text-brand-blue font-semibold">{h.predicted_future_consumption} L</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Est. Bill:</span>
                      <span className="text-emerald-400 font-mono">₹{h.estimated_bill_inr}</span>
                    </div>
                    <div className="pt-1 border-t border-navy-700 flex justify-between items-center">
                      <span className="text-slate-400">Status:</span>
                      <StatusBadge status={h.consumption_status} />
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* Layer 3: Chennai Water Reservoirs and Tanks */}
        {layers.reservoirs &&
          reservoirs.map((res) => {
            const icon =
              res.status === 'Low'
                ? icons.reservoirLow
                : res.status === 'Moderate'
                ? icons.reservoirModerate
                : icons.reservoirNormal;

            return (
              <Marker
                key={res.reservoir_id}
                position={[res.latitude, res.longitude]}
                icon={icon}
              >
                <Popup>
                  <div className="p-1 space-y-1 text-xs text-slate-100 min-w-[220px]">
                    <strong className="text-cyan-400 block font-bold text-sm">{res.name}</strong>
                    <span className="text-slate-400 text-[10px] block">{res.location}</span>
                    <div className="pt-1 border-t border-navy-700 space-y-1">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Current Storage:</span>
                        <span className="font-bold text-white">{res.current_storage_mcft} Mcft</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Capacity:</span>
                        <span className="text-slate-300">{res.storage_capacity_mcft} Mcft</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Available:</span>
                        <span className="text-brand-teal font-mono font-bold">{res.available_volume_pct}%</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Inflow / Outflow:</span>
                        <span className="text-slate-300 font-mono">{res.inflow_cusecs} / {res.outflow_cusecs} cusecs</span>
                      </div>
                      <div className="pt-1 border-t border-navy-700 flex justify-between items-center">
                        <span className="text-slate-400">Status:</span>
                        <StatusBadge status={res.status} />
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

        {/* Layer 5: Water Distribution Points & Booster Stations */}
        {layers.distributionPoints &&
          distributionPoints.map((dp) => (
            <Marker
              key={dp.point_id}
              position={[dp.latitude, dp.longitude]}
              icon={icons.distributionPoint}
            >
              <Popup>
                <div className="p-1 space-y-1 text-xs text-slate-100 min-w-[200px]">
                  <strong className="text-sky-400 block font-bold">{dp.name}</strong>
                  <span className="text-slate-400 text-[10px] block">Zone: {dp.area_name}</span>
                  <div className="pt-1 border-t border-navy-700 space-y-1">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Type:</span>
                      <span className="capitalize font-mono text-slate-200">{dp.type?.replace('_', ' ')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Throughput Cap:</span>
                      <span className="text-white font-mono">{(dp.capacity_liters / 1000000).toFixed(1)} ML</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Status:</span>
                      <span className="text-emerald-400 font-semibold">{dp.status}</span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}

        {/* Layer 6: Field Management Tasks */}
        {layers.tasks &&
          tasks
            .filter((t) => t.latitude && t.longitude)
            .map((t) => (
              <Marker
                key={t.task_id}
                position={[t.latitude, t.longitude]}
                icon={icons.taskMarker}
              >
                <Popup>
                  <div className="p-1 space-y-1 text-xs text-slate-100 min-w-[210px]">
                    <span className="text-[10px] text-purple-400 font-mono uppercase block">{t.task_type}</span>
                    <strong className="text-white block font-bold">{t.title}</strong>
                    <p className="text-slate-300 text-[11px] leading-tight">{t.description}</p>
                    <div className="pt-1 border-t border-navy-700 flex justify-between items-center">
                      <span className="text-slate-400">Assigned:</span>
                      <span className="text-slate-200 font-medium">{t.assigned_to}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Status:</span>
                      <StatusBadge status={t.status} />
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
      </MapContainer>
    </div>
  );
}

