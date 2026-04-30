import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Thermometer, Droplets, Cpu, Power, Fan, SlidersHorizontal } from 'lucide-react';
import { api } from '../services/api';
import { Fridge, HealthCenter, Device, DeviceControl } from '../types';
import Modal from '../components/Modal';
import { useLive } from '../components/Layout';
import PageLoader from '../components/PageLoader';

const typeLabel: Record<string, string> = {
  refrigerator: 'Refrigerator',
  freezer: 'Freezer',
  cold_room: 'Cold Room',
};

const statusBadge: Record<string, string> = {
  operational: 'bg-green-100 text-green-700',
  maintenance: 'bg-yellow-100 text-yellow-700',
  defective: 'bg-red-100 text-red-700',
};

const deviceDot: Record<string, string> = {
  online: 'bg-green-500',
  offline: 'bg-red-500',
  warning: 'bg-yellow-500',
};

const emptyForm = { name: '', healthCenterId: '', roomId: '', modelName: '', serialNumber: '', type: 'refrigerator', targetTempMin: '2', targetTempMax: '8', targetHumidityMin: '40', targetHumidityMax: '70', status: 'operational' };
const emptyDeviceForm = { name: '', serialNumber: '', fridgeId: '', healthCenterId: '', ipAddress: '', firmware: 'v2.1.4' };

export default function Fridges() {
  const [fridges, setFridges] = useState<Fridge[]>([]);
  const [centers, setCenters] = useState<HealthCenter[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [availableRooms, setAvailableRooms] = useState<any[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showDeviceForm, setShowDeviceForm] = useState<Fridge | null>(null);
  const [showControl, setShowControl] = useState<{ fridge: Fridge; device: Device } | null>(null);
  const [editItem, setEditItem] = useState<Fridge | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [deviceForm, setDeviceForm] = useState({ ...emptyDeviceForm });
  const [control, setControl] = useState<DeviceControl | null>(null);
  const [filterHC, setFilterHC] = useState('');
  const [loading, setLoading] = useState(true);
  const { readings } = useLive();

  const load = () => {
    setLoading(true);
    Promise.all([
      api.getFridges(filterHC || undefined).then((d: any) => setFridges(d)),
      api.getHealthCenters().then((d: any) => setCenters(d)),
      api.getRooms().then((d: any) => setRooms(d ?? [])),
    ]).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [filterHC]);

  // Filter rooms by selected health center in form
  useEffect(() => {
    setAvailableRooms(form.healthCenterId ? rooms.filter((r: any) => r.healthCenterId === form.healthCenterId) : rooms);
  }, [form.healthCenterId, rooms]);

  const openCreate = () => { setEditItem(null); setForm({ ...emptyForm }); setShowForm(true); };
  const openEdit = (fr: Fridge) => {
    setEditItem(fr);
    setForm({ name: fr.name, healthCenterId: fr.healthCenterId, roomId: (fr as any).roomId || '', modelName: fr.modelName, serialNumber: fr.serialNumber, type: fr.type, targetTempMin: String(fr.targetTempMin), targetTempMax: String(fr.targetTempMax), targetHumidityMin: String(fr.targetHumidityMin), targetHumidityMax: String(fr.targetHumidityMax), status: fr.status });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.healthCenterId) return;
    const payload = { ...form, targetTempMin: Number(form.targetTempMin), targetTempMax: Number(form.targetTempMax), targetHumidityMin: Number(form.targetHumidityMin), targetHumidityMax: Number(form.targetHumidityMax), model: form.modelName };
    if (editItem) await api.updateFridge(editItem.id, payload).catch(console.error);
    else await api.createFridge(payload).catch(console.error);
    setShowForm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    const fridge = fridges.find(f => f.id === id);
    const msg = `Delete "${fridge?.name}"?\n\nThis will permanently delete:\n• The assigned IoT sensor\n• All vaccines stored in this fridge\n• All related alerts\n\nThis cannot be undone.`;
    if (!confirm(msg)) return;
    await api.deleteFridge(id).catch(console.error);
    load();
  };

  const openDeviceForm = (fridge: Fridge) => {
    setDeviceForm({ ...emptyDeviceForm, fridgeId: fridge.id, healthCenterId: fridge.healthCenterId });
    setShowDeviceForm(fridge);
  };

  const handleDeviceSubmit = async () => {
    await api.createDevice(deviceForm).catch(console.error);
    setShowDeviceForm(null);
    load();
  };

  const openControl = async (fridge: Fridge, device: Device) => {
    setShowControl({ fridge, device });
    const c: any = await api.getDeviceControl(device.id).catch(() => null);
    if (c) setControl(c);
  };

  const toggleControl = async (field: string, value: any) => {
    if (!showControl) return;
    const updated: any = await api.updateDeviceControl(showControl.device.id, { [field]: value }).catch(console.error);
    if (updated) setControl(updated);
  };

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const df = (k: string, v: string) => setDeviceForm(p => ({ ...p, [k]: v }));

  // Merge live readings
  const liveFridges = fridges.map(fridge => {
    const dev = fridge.device as Device | null;
    if (!dev) return fridge;
    const live = readings.get(dev.id);
    if (!live) return fridge;
    return { ...fridge, currentTemp: live.temperature, currentHumidity: live.humidity, lastUpdated: live.timestamp };
  });

  if (loading) return <PageLoader message="Loading fridges & freezers..." />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Fridges & Freezers</h1>
          <p className="text-sm text-slate-500">{fridges.length} cold storage unit(s) — each health center can have multiple fridges</p>
        </div>
        <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus size={16} /> Add Fridge
        </button>
      </div>

      <select value={filterHC} onChange={e => setFilterHC(e.target.value)}
        className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
        <option value="">All Health Centers</option>
        {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['Fridge', 'Health Center', 'Type', 'Target Temp', 'Current Temp', 'Sensor', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {liveFridges.map(fridge => {
              const dev = fridge.device as Device | null;
              const tempOk = fridge.currentTemp !== null && fridge.currentTemp !== undefined
                ? fridge.currentTemp >= fridge.targetTempMin && fridge.currentTemp <= fridge.targetTempMax
                : null;
              return (
                <tr key={fridge.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-800">{fridge.name}</p>
                    <p className="text-xs text-slate-400">{fridge.serialNumber || fridge.model}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{fridge.healthCenterName || fridge.healthCenterId}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{typeLabel[fridge.type]}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-xs">{fridge.targetTempMin}–{fridge.targetTempMax}°C</td>
                  <td className="px-4 py-3">
                    {fridge.currentTemp !== null && fridge.currentTemp !== undefined ? (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${tempOk ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        <Thermometer size={11} /> {fridge.currentTemp}°C
                      </span>
                    ) : <span className="text-slate-400 text-xs">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    {dev ? (
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${deviceDot[dev.status]}`} />
                        <span className="text-xs text-slate-600">{dev.name}</span>
                      </div>
                    ) : (
                      <button onClick={() => openDeviceForm(fridge)} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                        <Plus size={12} /> Assign sensor
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[fridge.status]}`}>
                      {fridge.status === 'operational' ? 'Operational' : fridge.status === 'maintenance' ? 'Maintenance' : 'Defective'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {dev && (
                        <button onClick={() => openControl(fridge, dev)} title="Controls" className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><Power size={14} /></button>
                      )}
                      <button onClick={() => openEdit(fridge)} className="p-1.5 rounded hover:bg-slate-100 text-slate-600"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(fridge.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {liveFridges.length === 0 && <p className="text-center text-slate-400 py-10">No fridges registered.</p>}
      </div>

      {/* Fridge form */}
      {showForm && (
        <Modal title={editItem ? 'Edit Fridge' : 'Add Fridge'} onClose={() => setShowForm(false)} size="lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Name *</label>
              <input value={form.name} onChange={e => f('name', e.target.value)} placeholder="Main Refrigerator"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Health Center *</label>
              <select value={form.healthCenterId} onChange={e => f('healthCenterId', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="">Select...</option>
                {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Storage Room <span className="text-slate-400">(optional)</span></label>
              <select value={form.roomId} onChange={e => f('roomId', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="">No room assigned</option>
                {availableRooms.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Type *</label>
              <select value={form.type} onChange={e => f('type', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="refrigerator">Refrigerator</option>
                <option value="freezer">Freezer</option>
                <option value="cold_room">Cold Room</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Model</label>
              <input value={form.modelName} onChange={e => f('modelName', e.target.value)} placeholder="Vestfrost MK 144"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Serial Number</label>
              <input value={form.serialNumber} onChange={e => f('serialNumber', e.target.value)} placeholder="VF-MK144-001"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Min Temp (°C)</label>
              <input type="number" value={form.targetTempMin} onChange={e => f('targetTempMin', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Max Temp (°C)</label>
              <input type="number" value={form.targetTempMax} onChange={e => f('targetTempMax', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Min Humidity (%)</label>
              <input type="number" value={form.targetHumidityMin} onChange={e => f('targetHumidityMin', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Max Humidity (%)</label>
              <input type="number" value={form.targetHumidityMax} onChange={e => f('targetHumidityMax', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select value={form.status} onChange={e => f('status', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="operational">Operational</option>
                <option value="maintenance">Maintenance</option>
                <option value="defective">Defective</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSubmit} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700">{editItem ? 'Save' : 'Create'}</button>
            <button onClick={() => setShowForm(false)} className="flex-1 border border-slate-200 py-2 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
          </div>
        </Modal>
      )}

      {/* Assign sensor modal */}
      {showDeviceForm && (
        <Modal title={`Assign Sensor — ${showDeviceForm.name}`} onClose={() => setShowDeviceForm(null)}>
          <div className="space-y-3">
            {[
              { label: 'Sensor Name *', key: 'name', placeholder: 'Sensor — Main Fridge' },
              { label: 'Serial Number *', key: 'serialNumber', placeholder: 'SN-001-HC1' },
              { label: 'IP Address', key: 'ipAddress', placeholder: '192.168.1.10' },
              { label: 'Firmware', key: 'firmware', placeholder: 'v2.1.4' },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-xs font-medium text-slate-600 mb-1">{field.label}</label>
                <input value={(deviceForm as any)[field.key]} onChange={e => df(field.key, e.target.value)} placeholder={field.placeholder}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <button onClick={handleDeviceSubmit} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Assign</button>
              <button onClick={() => setShowDeviceForm(null)} className="flex-1 border border-slate-200 py-2 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {/* IoT Controls modal */}
      {showControl && control && (
        <Modal title={`Controls — ${showControl.fridge.name}`} onClose={() => setShowControl(null)}>
          <div className="space-y-3">
            {[
              { label: 'System Power', sub: 'Turn device on/off', field: 'systemEnabled', icon: Power, color: 'bg-green-500' },
              { label: 'Fan', sub: 'Enable/disable fan', field: 'fanEnabled', icon: Fan, color: 'bg-blue-500' },
              { label: 'Compressor', sub: 'Enable/disable compressor', field: 'compressorEnabled', icon: SlidersHorizontal, color: 'bg-purple-500' },
            ].map(item => (
              <div key={item.field} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-2">
                  <item.icon size={18} className="text-slate-600" />
                  <div>
                    <p className="font-medium text-sm">{item.label}</p>
                    <p className="text-xs text-slate-400">{item.sub}</p>
                  </div>
                </div>
                <button onClick={() => toggleControl(item.field, !(control as any)[item.field])}
                  className={`w-12 h-6 rounded-full transition-colors ${(control as any)[item.field] ? item.color : 'bg-slate-300'}`}>
                  <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${(control as any)[item.field] ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            ))}
            {control.fanEnabled && (
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex justify-between mb-2">
                  <p className="font-medium text-sm">Fan Speed</p>
                  <span className="text-sm font-bold text-blue-600">{control.fanSpeed}%</span>
                </div>
                <input type="range" min={0} max={100} value={control.fanSpeed}
                  onChange={e => toggleControl('fanSpeed', Number(e.target.value))}
                  className="w-full accent-blue-600" />
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
