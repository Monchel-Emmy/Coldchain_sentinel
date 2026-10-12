import { useEffect, useState } from 'react';
import { Thermometer, Droplets, Bell, ShieldCheck, AlertTriangle, Clock, CheckCircle2, Building2, Wind, Wifi, WifiOff, Cpu, Sparkles, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { DashboardStats, StorageRoom, Vaccine } from '../types';
import StatCard from '../components/StatCard';
import { useLive } from '../components/Layout';
import PageLoader from '../components/PageLoader';
import { useHealthCenterScope } from '../hooks/useRBAC';
import AIChatBubble from '../components/AIChatBubble';

// MQ135 raw ADC (0-4095) quality interpretation (matches device alert threshold at 2500)
function mqInfo(raw: number | null) {
  if (raw === null) return { label: '—', color: 'text-slate-400' };
  if (raw <= 800)  return { label: 'Good',      color: 'text-green-400' };
  if (raw <= 1600) return { label: 'Moderate',  color: 'text-yellow-400' };
  if (raw <= 2500) return { label: 'Poor',      color: 'text-orange-400' };
  return           { label: 'Hazardous',         color: 'text-red-400' };
}

const deviceDot: Record<string, string> = {
  online: 'bg-green-400', offline: 'bg-red-400', warning: 'bg-yellow-400',
};

const fridgeTypeLabel: Record<string, string> = {
  refrigerator: 'Refrigerator', freezer: 'Freezer', cold_room: 'Cold Room',
};

function FridgeCard({ fridge, liveTemp, liveHumidity, liveTimestamp, isSingleRoom }: {
  fridge: NonNullable<StorageRoom['fridges']>[number];
  liveTemp: number | null;
  liveHumidity: number | null;
  liveTimestamp: string | null;
  isSingleRoom?: boolean;
}) {
  const temp   = liveTemp ?? fridge.currentTemp;
  const hum    = liveHumidity ?? fridge.currentHumidity;
  const ts     = liveTimestamp ?? fridge.lastUpdated;
  const tempOk = temp !== null ? temp >= fridge.targetTempMin && temp <= fridge.targetTempMax : null;

  const [advisory, setAdvisory] = useState<string | null>(null);
  const [loadingAdvisory, setLoadingAdvisory] = useState(false);
  const [advisoryError, setAdvisoryError] = useState(false);

  useEffect(() => {
    if (tempOk === false) {
      setLoadingAdvisory(true);
      setAdvisoryError(false);
      api.getAIRecommendation(fridge.id)
        .then(res => {
          setAdvisory(res.recommendation);
        })
        .catch(err => {
          console.error('Failed to fetch AI recommendation:', err);
          setAdvisoryError(true);
        })
        .finally(() => {
          setLoadingAdvisory(false);
        });
    } else {
      setAdvisory(null);
    }
  }, [tempOk, fridge.id]);

  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, i) => {
      let content = line.trim();
      if (!content) return <div key={i} className="h-1" />;

      const isBullet = content.startsWith('* ') || content.startsWith('- ');
      if (isBullet) {
        content = content.substring(2);
      }

      const parts = [];
      let lastIdx = 0;
      const boldRegex = /\*\*(.*?)\*\*/g;
      let match;
      while ((match = boldRegex.exec(content)) !== null) {
        if (match.index > lastIdx) {
          parts.push(content.substring(lastIdx, match.index));
        }
        parts.push(<strong key={match.index} className="font-semibold text-blue-400">{match[1]}</strong>);
        lastIdx = boldRegex.lastIndex;
      }
      if (lastIdx < content.length) {
        parts.push(content.substring(lastIdx));
      }

      const displayContent = parts.length > 0 ? parts : content;

      if (isBullet) {
        return (
          <li key={i} className="ml-3 list-disc list-outside text-[11px] text-slate-300">
            {displayContent}
          </li>
        );
      }
      return (
        <p key={i} className="text-[11px] text-slate-350 leading-relaxed mb-0.5">
          {displayContent}
        </p>
      );
    });
  };

  return (
    <div className={`bg-slate-700/60 rounded-xl p-4 flex flex-col gap-3 border ${tempOk === false ? 'border-red-500/70' : 'border-slate-600/30'} ${isSingleRoom ? 'p-6 gap-4 rounded-2xl' : ''}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className={`font-bold text-white ${isSingleRoom ? 'text-lg' : 'text-sm'}`}>{fridge.name}</p>
          <span className={`text-slate-400 ${isSingleRoom ? 'text-xs' : 'text-[10px]'}`}>{fridgeTypeLabel[fridge.type] ?? fridge.type}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {fridge.ipAddress && <span className={`text-slate-500 font-mono ${isSingleRoom ? 'text-sm' : 'text-xs'}`}>{fridge.ipAddress}</span>}
          <span className={`rounded-full ${isSingleRoom ? 'w-3 h-3' : 'w-2.5 h-2.5'} ${deviceDot[fridge.deviceStatus] ?? 'bg-slate-500'}`} />
        </div>
      </div>
      <div className={`grid grid-cols-2 ${isSingleRoom ? 'gap-4' : 'gap-2'}`}>
        <div className={`bg-slate-800/70 rounded-lg ${isSingleRoom ? 'p-4' : 'p-3'}`}>
          <div className={`flex items-center gap-1.5 text-slate-400 mb-1.5 ${isSingleRoom ? 'text-sm' : 'text-xs'}`}><Thermometer size={isSingleRoom ? 14 : 11} /> Temperature</div>
          <p className={`font-bold ${tempOk === false ? 'text-red-400' : 'text-white'} ${isSingleRoom ? 'text-4xl' : 'text-2xl'}`}>{temp !== null ? `${temp}°C` : '—'}</p>
          <p className={`text-slate-500 mt-1 ${isSingleRoom ? 'text-xs' : 'text-[10px]'}`}>Target: {fridge.targetTempMin}–{fridge.targetTempMax}°C</p>
        </div>
        <div className={`bg-slate-800/70 rounded-lg ${isSingleRoom ? 'p-4' : 'p-3'}`}>
          <div className={`flex items-center gap-1.5 text-slate-400 mb-1.5 ${isSingleRoom ? 'text-sm' : 'text-xs'}`}><Droplets size={isSingleRoom ? 14 : 11} /> Humidity</div>
          <p className={`font-bold text-white ${isSingleRoom ? 'text-4xl' : 'text-2xl'}`}>{hum !== null ? `${hum}%` : '—'}</p>
          <p className={`text-slate-500 mt-1 capitalize ${isSingleRoom ? 'text-xs' : 'text-[10px]'}`}>{fridge.status === 'operational' ? 'Operational' : fridge.status === 'maintenance' ? 'Maintenance' : 'Defective'}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        {tempOk === false && <span className={`bg-red-500/80 text-white px-2.5 py-0.5 rounded-full font-semibold ${isSingleRoom ? 'text-xs' : 'text-[10px]'}`}>⚠ Out of range</span>}
        <p className={`text-slate-500 ml-auto ${isSingleRoom ? 'text-xs' : 'text-[10px]'}`}>{ts ? new Date(ts).toLocaleTimeString() : '—'}</p>
      </div>

      {tempOk === false && (
        <div className="mt-2 pt-3 border-t border-slate-600/40 text-left bg-slate-800/55 p-3 rounded-lg border border-slate-700/60 shadow-inner">
          <p className="text-[10px] font-bold text-blue-400 flex items-center gap-1.5 uppercase tracking-wider mb-2">
            <Sparkles size={11} className="text-blue-400 animate-pulse" /> Sentinel AI Clinical Advisory
          </p>
          {loadingAdvisory ? (
            <div className="flex items-center gap-2 text-slate-400 text-[11px] py-1">
              <Loader2 className="animate-spin text-blue-500" size={12} />
              Generating clinical advisory...
            </div>
          ) : advisoryError ? (
            <p className="text-[11px] text-red-300">Failed to load clinical advisory.</p>
          ) : advisory ? (
            <div className="text-[11px] space-y-1.5 text-slate-200 leading-relaxed overflow-y-auto max-h-[165px] pr-1 scrollbar-thin">
              {renderMarkdown(advisory)}
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function RoomSection({ room, fridgeLiveData, liveRoom, isSingleRoom }: {
  room: StorageRoom;
  fridgeLiveData: Map<string, { temp: number | null; humidity: number | null; timestamp: string | null }>;
  liveRoom: { airQuality: number; temperature: number; humidity: number } | null;
  isSingleRoom?: boolean;
}) {
  const raw     = liveRoom?.airQuality  ?? room.airQuality  ?? null;
  const ambTemp = liveRoom?.temperature ?? room.ambientTemp ?? null;
  const ambHum  = liveRoom?.humidity    ?? room.ambientHumidity ?? null;
  const mqMeta  = mqInfo(raw);
  const hasData = raw !== null;

  const fridges = room.fridges ?? [];
  const fridgeCount = fridges.length;

  let gridClass = 'grid-cols-1 sm:grid-cols-2';
  let containerClass = 'w-full';

  if (isSingleRoom) {
    if (fridgeCount === 1) {
      gridClass = 'grid-cols-1';
      containerClass = 'max-w-xl mx-auto';
    } else if (fridgeCount === 2) {
      gridClass = 'grid-cols-1 md:grid-cols-2';
      containerClass = 'max-w-5xl mx-auto';
    } else {
      gridClass = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
      containerClass = 'w-full';
    }
  }

  return (
    <div className={`bg-slate-800 rounded-2xl p-5 flex flex-col gap-4 border border-slate-700 ${isSingleRoom ? 'p-6 gap-5' : ''}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
            <Building2 size={16} className="text-blue-400" />
          </div>
          <div>
            <p className={`font-bold text-white ${isSingleRoom ? 'text-base' : 'text-sm'}`}>{room.name}</p>
            <p className="text-xs text-slate-400">{room.healthCenterName}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-400 font-mono">{room.ipAddress}</span>
          <span className={`w-2.5 h-2.5 rounded-full ${deviceDot[room.status] ?? 'bg-slate-500'}`} />
        </div>
      </div>

      {/* MQ135 Air Quality Sensor */}
      <div className="bg-slate-700/50 rounded-xl p-3 border border-slate-600/30">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
          <Wind size={12} /> MQ135 Air Quality Sensor
        </p>
        {hasData ? (
          <div className="grid grid-cols-4 gap-2 text-center">
            <div>
              <p className={`font-bold ${mqMeta.color} ${isSingleRoom ? 'text-2xl' : 'text-xl'}`}>{raw}</p>
              <p className="text-xs text-slate-500 mt-0.5">Raw ADC</p>
              <span className={`text-xs font-medium ${mqMeta.color}`}>{mqMeta.label}</span>
            </div>
            <div>
              <p className={`font-bold ${mqMeta.color} ${isSingleRoom ? 'text-2xl' : 'text-xl'}`}>{mqMeta.label}</p>
              <p className="text-xs text-slate-500 mt-0.5">Air Quality</p>
            </div>
            <div>
              <p className={`font-bold text-orange-300 ${isSingleRoom ? 'text-2xl' : 'text-xl'}`}>{ambTemp !== null ? `${ambTemp}°C` : '—'}</p>
              <p className="text-xs text-slate-500 mt-0.5">Ambient</p>
            </div>
            <div>
              <p className={`font-bold text-blue-300 ${isSingleRoom ? 'text-2xl' : 'text-xl'}`}>{ambHum !== null ? `${ambHum}%` : '—'}</p>
              <p className="text-xs text-slate-500 mt-0.5">Humidity</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-500 text-center py-2">No sensor data — device not connected</p>
        )}
      </div>

      <div className={`grid ${gridClass} gap-4 ${containerClass}`}>
        {fridges.map(fridge => {
          const live = fridgeLiveData.get(fridge.device?.id ?? '');
          return <FridgeCard key={fridge.id} fridge={fridge} liveTemp={live?.temp ?? null} liveHumidity={live?.humidity ?? null} liveTimestamp={live?.timestamp ?? null} isSingleRoom={isSingleRoom} />;
        })}
        {fridges.length === 0 && (
          <p className="text-xs text-slate-500 col-span-2 text-center py-4">No fridges assigned to this room.</p>
        )}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats]       = useState<DashboardStats | null>(null);
  const [rooms, setRooms]       = useState<StorageRoom[]>([]);
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [loading, setLoading]   = useState(true);
  const { readings, roomReadings, connected } = useLive();

  const hcScope = useHealthCenterScope();

  useEffect(() => {
    setLoading(true);
    const effectiveHC = hcScope || undefined;
    Promise.all([
      api.getDashboardStats().then((d: any) => setStats(d)),
      api.getRooms(effectiveHC).then((d: any) => setRooms(d ?? [])),
      api.getVaccines({ healthCenterId: effectiveHC }).then((d: any) => setVaccines(d ?? [])),
    ]).catch(console.error).finally(() => setLoading(false));
  }, [hcScope]);

  if (loading) return <PageLoader message="Fetching cold chain data..." />;

  const fridgeLiveData = new Map<string, { temp: number | null; humidity: number | null; timestamp: string | null }>();
  readings.forEach((r, deviceId) => fridgeLiveData.set(deviceId, { temp: r.temperature, humidity: r.humidity, timestamp: r.timestamp }));

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="bg-gradient-to-r from-slate-800 to-blue-900 rounded-xl p-6 text-white flex items-center gap-4">
        <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
          <Thermometer size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold">ColdChain Sentinel — Vaccine Cold Chain Monitoring</h1>
          <p className="text-blue-200 text-sm mt-0.5">Real-time monitoring · Vaccine storage compliance · IoT control</p>
        </div>
        <div className="ml-auto hidden sm:flex items-center gap-2">
          {connected
            ? <><Wifi size={14} className="text-green-400" /><span className="text-sm text-green-300">Live</span></>
            : <><WifiOff size={14} className="text-slate-400" /><span className="text-sm text-slate-400">Offline</span></>
          }
        </div>
      </div>

      {/* Storage Rooms — always from DB */}
      {rooms.length > 0 ? (
        <div>
          <h2 className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-2">
            <Building2 size={15} className="text-blue-500" /> Storage Rooms — Live Status
          </h2>
          <div className={`grid grid-cols-1 ${rooms.length > 1 ? 'xl:grid-cols-2' : ''} gap-5`}>
            {rooms.map(room => {
              const liveRoom = roomReadings.get(room.id);
              return (
                <RoomSection
                  key={room.id}
                  room={room}
                  fridgeLiveData={fridgeLiveData}
                  liveRoom={liveRoom ? { airQuality: liveRoom.airQuality, temperature: liveRoom.temperature, humidity: liveRoom.humidity } : null}
                  isSingleRoom={rooms.length === 1}
                />
              );
            })}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400">
          <Building2 size={32} className="mx-auto mb-2 opacity-30" />
          <p className="font-medium">No storage rooms found</p>
          <p className="text-sm mt-1">Add a health center and assign fridges to see live data here.</p>
        </div>
      )}

      {/* Vaccine stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total Vaccines"  value={stats.totalVaccines} icon={ShieldCheck}   color="blue" />
          <StatCard label="At Risk"          value={stats.atRisk}        icon={AlertTriangle} color={stats.atRisk > 0 ? 'red' : 'green'} />
          <StatCard label="Expiring Soon"    value={stats.expiringSoon}  icon={Clock}         color={stats.expiringSoon > 0 ? 'yellow' : 'green'} sub="within 30 days" />
          <StatCard label="Compliant"        value={stats.compliant}     icon={CheckCircle2}  color="green" />
        </div>
      )}

      {/* Infrastructure stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <Building2 size={20} className="text-purple-500 flex-shrink-0" />
            <div><p className="text-xl font-bold text-slate-800">{stats.totalHealthCenters}</p><p className="text-xs text-slate-500">Health Centers</p></div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <Thermometer size={20} className="text-blue-500 flex-shrink-0" />
            <div><p className="text-xl font-bold text-slate-800">{stats.totalFridges}</p><p className="text-xs text-slate-500">Fridges / Freezers</p></div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <Cpu size={20} className="text-green-500 flex-shrink-0" />
            <div>
              <p className="text-xl font-bold text-slate-800">{stats.onlineDevices}<span className="text-sm font-normal text-slate-400">/{stats.totalDevices}</span></p>
              <p className="text-xs text-slate-500">Sensors Online</p>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
            <Bell size={20} className={stats.activeAlerts > 0 ? 'text-red-500 flex-shrink-0' : 'text-slate-400 flex-shrink-0'} />
            <div>
              <p className={`text-xl font-bold ${stats.activeAlerts > 0 ? 'text-red-600' : 'text-slate-800'}`}>{stats.activeAlerts}</p>
              <p className="text-xs text-slate-500">Active Alerts</p>
            </div>
          </div>
        </div>
      )}

      {/* Vaccine inventory table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
          <ShieldCheck size={18} className="text-blue-500" />
          <h2 className="text-sm font-semibold text-slate-700">Vaccine Inventory & Storage Compliance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50">
              <tr>
                {['Vaccine','Type','Fridge','Batch / Manufacturer','Quantity','Storage Req.','Current Temp','Status','Expiry'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {vaccines.map(v => {
                const daysLeft = v.daysToExpiry ?? Math.ceil((new Date(v.expiryDate).getTime() - Date.now()) / 86400000);
                const tempOk = v.currentTemp !== null && v.currentTemp !== undefined
                  ? v.currentTemp >= v.storageRequirements.tempMin && v.currentTemp <= v.storageRequirements.tempMax
                  : null;
                return (
                  <tr key={String(v.id)} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{v.name}</p>
                      <p className="text-xs text-slate-400">#{String(v.id).slice(-6)}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{v.type}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">{v.fridgeName || String(v.fridgeId).slice(-6)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700">{v.batchNumber}</p>
                      <p className="text-xs text-slate-400">{v.manufacturer}</p>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">{v.quantity} {v.unit}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      <div className="flex items-center gap-1"><Thermometer size={11} /> {v.storageRequirements.tempMin}–{v.storageRequirements.tempMax}°C</div>
                      <div className="flex items-center gap-1 mt-0.5"><Droplets size={11} /> {v.storageRequirements.humidityMin}–{v.storageRequirements.humidityMax}%</div>
                    </td>
                    <td className="px-4 py-3">
                      {v.currentTemp !== null && v.currentTemp !== undefined ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${tempOk ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          <Thermometer size={11} /> {v.currentTemp}°C
                        </span>
                      ) : <span className="text-slate-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${v.status === 'compliant' ? 'bg-green-100 text-green-700' : v.status === 'at_risk' ? 'bg-red-100 text-red-700' : v.status === 'expired' ? 'bg-slate-200 text-slate-500' : 'bg-yellow-100 text-yellow-700'}`}>
                        {v.status === 'compliant' ? '✓ Compliant' : v.status === 'at_risk' ? '⚠ At Risk' : v.status === 'expired' ? 'Expired' : 'Recalled'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className={`text-xs font-medium ${daysLeft < 0 ? 'text-slate-400' : daysLeft <= 30 ? 'text-orange-600' : 'text-green-600'}`}>
                        {daysLeft < 0 ? 'Expired' : `${daysLeft} days`}
                      </p>
                      <p className="text-xs text-slate-400">{new Date(v.expiryDate).toLocaleDateString()}</p>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {vaccines.length === 0 && (
            <div className="text-center py-10 text-slate-400">
              <ShieldCheck size={28} className="mx-auto mb-2 opacity-30" />
              <p>No vaccines registered yet.</p>
            </div>
          )}
        </div>
        <div className="px-5 py-2 border-t border-slate-100 text-xs text-slate-400 text-right">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>
      <AIChatBubble />
    </div>
  );
}
