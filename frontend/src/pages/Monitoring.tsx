import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Device, SensorReading } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useLive } from '../components/Layout';
import PageLoader from '../components/PageLoader';

export default function Monitoring() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [history, setHistory] = useState<SensorReading[]>([]);
  const [hours, setHours] = useState(6);
  const [initLoading, setInitLoading] = useState(true);
  const { readings } = useLive();

  useEffect(() => {
    api.getDevices().then((d: any) => {
      setDevices(d);
      if (d.length > 0) setSelectedDevice(d[0].id);
    }).catch(console.error).finally(() => setInitLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedDevice) return;
    api.getHistory(selectedDevice, hours).then((d: any) => setHistory(d)).catch(console.error);
  }, [selectedDevice, hours]);

  // Append live WebSocket reading to chart
  useEffect(() => {
    if (!selectedDevice) return;
    const live = readings.get(selectedDevice);
    if (!live) return;
    setHistory(prev => {
      const last = prev[prev.length - 1];
      if (last?.timestamp === live.timestamp) return prev;
      return [...prev.slice(-287), live];
    });
  }, [readings, selectedDevice]);

  const chartData = history.map(r => ({
    time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    Temperature: r.temperature,
    Humidity: r.humidity,
  }));

  const live = selectedDevice ? readings.get(selectedDevice) : null;
  const selectedDev = devices.find(d => d.id === selectedDevice);

  if (initLoading) return <PageLoader message="Loading monitoring data..." />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Live Monitoring</h1>
          <p className="text-sm text-slate-500">Real-time fridge sensor data with historical charts</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <select value={selectedDevice} onChange={e => setSelectedDevice(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
            {devices.map(d => (
              <option key={d.id} value={d.id}>{d.name} — {d.fridgeName || d.fridgeId}</option>
            ))}
          </select>
          <select value={hours} onChange={e => setHours(Number(e.target.value))}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
            <option value={1}>Last 1h</option>
            <option value={6}>Last 6h</option>
            <option value={12}>Last 12h</option>
            <option value={24}>Last 24h</option>
          </select>
        </div>
      </div>

      {/* Live metrics */}
      {live && (
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'Temperature', value: `${live.temperature}°C`, color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'Humidity', value: `${live.humidity}%`, color: 'text-blue-600', bg: 'bg-blue-50' },
          ].map(m => (
            <div key={m.label} className={`rounded-xl p-4 ${m.bg}`}>
              <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
              <p className="text-sm text-slate-600 mt-1">{m.label}</p>
              <p className="text-xs text-slate-400 mt-0.5">Live · {new Date(live.timestamp).toLocaleTimeString()}</p>
            </div>
          ))}
        </div>
      )}

      {/* Temperature & Humidity chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Temperature & Humidity — Historical</h2>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="time" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="Temperature" stroke="#f97316" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="Humidity" stroke="#3b82f6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Device info */}
      {selectedDev && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-700 mb-3">Sensor Info</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div><p className="text-slate-400 text-xs">Serial</p><p className="font-medium">{selectedDev.serialNumber}</p></div>
            <div><p className="text-slate-400 text-xs">Fridge</p><p className="font-medium">{selectedDev.fridgeName || selectedDev.fridgeId}</p></div>
            <div><p className="text-slate-400 text-xs">IP Address</p><p className="font-medium font-mono">{selectedDev.ipAddress}</p></div>
            <div><p className="text-slate-400 text-xs">Status</p>
              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${selectedDev.status === 'online' ? 'bg-green-100 text-green-700' : selectedDev.status === 'warning' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                {selectedDev.status}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
