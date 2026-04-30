import { useEffect, useState } from 'react';
import { FileBarChart2, Download, FileText, Thermometer, Droplets } from 'lucide-react';
import { api } from '../services/api';
import { Device, SensorReading, HealthCenter, Fridge } from '../types';
import PageLoader from '../components/PageLoader';

export default function Reports() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [centers, setCenters] = useState<HealthCenter[]>([]);
  const [fridges, setFridges] = useState<Fridge[]>([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  const [hours, setHours] = useState(24);
  const [data, setData] = useState<SensorReading[]>([]);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getDevices().then((d: any) => { setDevices(d); if (d.length > 0) setSelectedDevice(d[0].id); }),
      api.getHealthCenters().then((d: any) => setCenters(d)),
      api.getFridges().then((d: any) => setFridges(d)),
    ]).catch(console.error).finally(() => setInitLoading(false));
  }, []);

  const generate = async () => {
    if (!selectedDevice) return;
    setLoading(true);
    const d: any = await api.getHistory(selectedDevice, hours).catch(console.error);
    if (d) setData(d);
    setLoading(false);
  };

  const exportCSV = () => {
    if (!data.length) return;
    const headers = ['Timestamp', 'Temperature (°C)', 'Humidity (%)'];
    const rows = data.map(r => [r.timestamp, r.temperature, r.humidity]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `coldchain-sentinel-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPDF = () => {
    if (!data.length) return;
    const dev = devices.find(d => d.id === selectedDevice);
    const fridge = fridges.find(f => f.id === dev?.fridgeId);
    const center = centers.find(c => c.id === dev?.healthCenterId);

    const avg = (arr: number[]) => (arr.reduce((a, b) => a + b, 0) / arr.length).toFixed(1);
    const avgTemp  = avg(data.map(r => r.temperature));
    const avgHumid = avg(data.map(r => r.humidity));
    const maxTemp  = Math.max(...data.map(r => r.temperature)).toFixed(1);
    const minTemp  = Math.min(...data.map(r => r.temperature)).toFixed(1);

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
    <title>ColdChain Sentinel Report</title>
    <style>
      body { font-family: Arial, sans-serif; margin: 40px; color: #1e293b; }
      h1 { color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 10px; }
      .meta { color: #64748b; font-size: 14px; margin-bottom: 24px; line-height: 1.8; }
      .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
      .card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; }
      .card .val { font-size: 22px; font-weight: bold; color: #1e293b; }
      .card .lbl { font-size: 12px; color: #94a3b8; margin-top: 4px; }
      table { width: 100%; border-collapse: collapse; font-size: 13px; }
      th { background: #1e40af; color: white; padding: 8px 12px; text-align: left; }
      td { padding: 7px 12px; border-bottom: 1px solid #f1f5f9; }
      tr:nth-child(even) td { background: #f8fafc; }
      .footer { margin-top: 32px; font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 16px; }
    </style></head><body>
    <h1>🌡️ ColdChain Sentinel — Cold Chain Report</h1>
    <div class="meta">
      <strong>Sensor:</strong> ${dev?.name ?? '—'} (${dev?.serialNumber ?? '—'})<br>
      <strong>Fridge:</strong> ${fridge?.name ?? '—'} · ${fridge?.type ?? '—'}<br>
      <strong>Health Center:</strong> ${center?.name ?? '—'} · ${center?.district ?? ''}<br>
      <strong>Period:</strong> Last ${hours} hour(s) &nbsp;|&nbsp;
      <strong>Records:</strong> ${data.length} &nbsp;|&nbsp;
      <strong>Generated:</strong> ${new Date().toLocaleString()}
    </div>
    <div class="summary">
      <div class="card"><div class="val">${avgTemp}°C</div><div class="lbl">Avg Temperature</div></div>
      <div class="card"><div class="val">${minTemp}°C / ${maxTemp}°C</div><div class="lbl">Min / Max Temp</div></div>
      <div class="card"><div class="val">${avgHumid}%</div><div class="lbl">Avg Humidity</div></div>
      <div class="card"><div class="val">${data.length}</div><div class="lbl">Total Readings</div></div>
    </div>
    <table>
      <thead><tr><th>Timestamp</th><th>Temperature (°C)</th><th>Humidity (%)</th></tr></thead>
      <tbody>${data.slice(0, 500).map(r =>
        `<tr><td>${new Date(r.timestamp).toLocaleString()}</td><td>${r.temperature}°C</td><td>${r.humidity}%</td></tr>`
      ).join('')}</tbody>
    </table>
    <div class="footer">ColdChain Sentinel · Generated ${new Date().toLocaleString()}</div>
    </body></html>`;

    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); win.print(); }
  };

  const dev    = devices.find(d => d.id === selectedDevice);
  const fridge = fridges.find(f => f.id === dev?.fridgeId);
  const center = centers.find(c => c.id === dev?.healthCenterId);

  const avgTemp  = data.length ? (data.reduce((s, r) => s + r.temperature, 0) / data.length).toFixed(1) : null;
  const maxTemp  = data.length ? Math.max(...data.map(r => r.temperature)).toFixed(1) : null;
  const avgHumid = data.length ? (data.reduce((s, r) => s + r.humidity, 0) / data.length).toFixed(1) : null;

  if (initLoading) return <PageLoader message="Loading report configuration..." />;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
          <FileBarChart2 size={20} className="text-green-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Reports</h1>
          <p className="text-sm text-slate-500">Generate and export cold chain data reports</p>
        </div>
      </div>

      {/* Config */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Report Configuration</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Sensor / Device</label>
            <select value={selectedDevice} onChange={e => setSelectedDevice(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
              {devices.map(d => (
                <option key={d.id} value={d.id}>{d.name} — {d.fridgeName || d.fridgeId}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Time Range</label>
            <select value={hours} onChange={e => setHours(Number(e.target.value))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
              <option value={1}>Last 1 hour</option>
              <option value={6}>Last 6 hours</option>
              <option value={12}>Last 12 hours</option>
              <option value={24}>Last 24 hours</option>
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={generate} disabled={loading || !selectedDevice}
              className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Generating...
                </span>
              ) : 'Generate Report'}
            </button>
          </div>
        </div>

        {/* Selected device info */}
        {dev && (
          <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-slate-500">
            <div><span className="text-slate-400">Sensor:</span> <span className="font-medium text-slate-700">{dev.name}</span></div>
            <div><span className="text-slate-400">Fridge:</span> <span className="font-medium text-slate-700">{fridge?.name ?? dev.fridgeId}</span></div>
            <div><span className="text-slate-400">Health Center:</span> <span className="font-medium text-slate-700">{center?.name ?? dev.healthCenterId}</span></div>
            <div><span className="text-slate-400">Status:</span>
              <span className={`ml-1 font-medium ${dev.status === 'online' ? 'text-green-600' : dev.status === 'warning' ? 'text-yellow-600' : 'text-red-600'}`}>
                {dev.status}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      {data.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-sm font-semibold text-slate-700">
              {dev?.name} · {fridge?.name} · Last {hours}h · {data.length} readings
            </h2>
            <div className="flex gap-2">
              <button onClick={exportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-sm hover:bg-slate-50 text-slate-700">
                <Download size={14} /> CSV
              </button>
              <button onClick={exportPDF}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700">
                <FileText size={14} /> PDF
              </button>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            {[
              { label: 'Avg Temperature', value: `${avgTemp}°C`, color: 'text-orange-600', icon: Thermometer },
              { label: 'Max Temperature', value: `${maxTemp}°C`, color: 'text-red-600', icon: Thermometer },
              { label: 'Avg Humidity', value: `${avgHumid}%`, color: 'text-blue-600', icon: Droplets },
              { label: 'Total Readings', value: data.length, color: 'text-slate-700', icon: FileBarChart2 },
            ].map(m => (
              <div key={m.label} className="bg-slate-50 rounded-lg p-3 flex items-center gap-3">
                <m.icon size={18} className={m.color} />
                <div>
                  <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
                  <p className="text-xs text-slate-500">{m.label}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Data table */}
          <div className="overflow-x-auto max-h-80 overflow-y-auto rounded-lg border border-slate-100">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 sticky top-0">
                <tr>
                  {['Timestamp', 'Temperature', 'Humidity'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.slice().reverse().map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-2 text-slate-500 text-xs">{new Date(r.timestamp).toLocaleString()}</td>
                    <td className="px-4 py-2 font-medium text-orange-600">{r.temperature}°C</td>
                    <td className="px-4 py-2 font-medium text-blue-600">{r.humidity}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
