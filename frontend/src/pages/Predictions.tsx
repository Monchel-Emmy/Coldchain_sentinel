import { useEffect, useState } from 'react';
import { api } from '../services/api';
import { Device, PredictionResult } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { BrainCircuit, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import PageLoader from '../components/PageLoader';

const trendIcon = (t: string) =>
  t === 'rising' ? <TrendingUp size={16} className="text-red-500" /> :
  t === 'falling' ? <TrendingDown size={16} className="text-green-500" /> :
  <Minus size={16} className="text-slate-400" />;

export default function Predictions() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);

  useEffect(() => {
    api.getDevices().then((d: any) => {
      setDevices(d);
      if (d.length > 0) setSelectedDevice(d[0].id);
    }).catch(console.error).finally(() => setInitLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedDevice) return;
    setLoading(true);
    api.getPredictions(selectedDevice).then((d: any) => setResult(d)).catch(console.error).finally(() => setLoading(false));
  }, [selectedDevice]);

  const chartData = result ? [
    ...result.historicalSample.map(r => ({
      time: new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      Temperature: r.temperature,
      Humidity: r.humidity,
      type: 'historical',
    })),
    ...result.predictions.map(p => ({
      time: new Date(p.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      'Predicted Temp': p.temperature,
      'Predicted Humidity': p.humidity,
      type: 'predicted',
    })),
  ] : [];

  const splitIndex = result?.historicalSample.length ?? 0;

  if (initLoading) return <PageLoader message="Loading prediction engine..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
            <BrainCircuit size={20} className="text-purple-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">AI Predictions</h1>
            <p className="text-sm text-slate-500">Linear trend forecasting from historical data</p>
          </div>
        </div>
        <select value={selectedDevice} onChange={e => setSelectedDevice(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
          {devices.map(d => <option key={d.id} value={d.id}>{d.name} — {d.fridgeName || d.fridgeId}</option>)}
        </select>
      </div>

      {loading && <PageLoader message="Analyzing sensor data..." />}

      {result && !loading && (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-400 mb-1">Avg Temperature</p>
              <p className="text-2xl font-bold text-slate-800">{result.summary.avgTemp}°C</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-400 mb-1">Avg Humidity</p>
              <p className="text-2xl font-bold text-slate-800">{result.summary.avgHumid}%</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-400 mb-1">Temp Trend</p>
              <div className="flex items-center gap-2 mt-1">
                {trendIcon(result.summary.tempTrend)}
                <span className="text-sm font-semibold capitalize text-slate-700">{result.summary.tempTrend}</span>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs text-slate-400 mb-1">Humidity Trend</p>
              <div className="flex items-center gap-2 mt-1">
                {trendIcon(result.summary.humidTrend)}
                <span className="text-sm font-semibold capitalize text-slate-700">{result.summary.humidTrend}</span>
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-700">Historical + 1-Hour Forecast</h2>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-orange-400 inline-block" /> Historical</span>
                <span className="flex items-center gap-1"><span className="w-3 h-0.5 bg-red-400 inline-block border-dashed" /> Predicted</span>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="time" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <ReferenceLine x={chartData[splitIndex - 1]?.time} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: 'Now', fontSize: 11, fill: '#94a3b8' }} />
                <Line type="monotone" dataKey="Temperature" stroke="#f97316" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="Humidity" stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls />
                <Line type="monotone" dataKey="Predicted Temp" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls />
                <Line type="monotone" dataKey="Predicted Humidity" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" dot={false} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Prediction table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700">Next 60 Minutes — Forecast</h2>
            </div>
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  {['Time', 'Predicted Temp', 'Predicted Humidity'].map(h => (
                    <th key={h} className="text-left px-4 py-2 text-xs font-semibold text-slate-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.predictions.map((p, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-600">{new Date(p.timestamp).toLocaleTimeString()}</td>
                    <td className="px-4 py-2 font-medium text-orange-600">{p.temperature}°C</td>
                    <td className="px-4 py-2 font-medium text-blue-600">{p.humidity}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
