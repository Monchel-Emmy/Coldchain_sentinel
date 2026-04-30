import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Power, Fan, Cpu, SlidersHorizontal } from 'lucide-react';
import { api } from '../services/api';
import { Device, DeviceControl, HealthCenter, Fridge } from '../types';
import Modal from '../components/Modal';
import PageLoader from '../components/PageLoader';

const statusBadge: Record<string, string> = {
  online: 'bg-green-100 text-green-700',
  offline: 'bg-red-100 text-red-700',
  warning: 'bg-yellow-100 text-yellow-700',
};

const emptyForm = { name: '', serialNumber: '', fridgeId: '', healthCenterId: '', ipAddress: '', firmware: 'v2.1.4' };

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [centers, setCenters] = useState<HealthCenter[]>([]);
  const [fridges, setFridges] = useState<Fridge[]>([]);
  const [availableFridges, setAvailableFridges] = useState<Fridge[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [showControl, setShowControl] = useState<Device | null>(null);
  const [editDevice, setEditDevice] = useState<Device | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [controls, setControls] = useState<Record<string, DeviceControl>>({});
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.getDevices().then((d: any) => setDevices(d)),
      api.getHealthCenters().then((d: any) => setCenters(d)),
      api.getFridges().then((d: any) => setFridges(d)),
    ]).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  useEffect(() => {
    setAvailableFridges(form.healthCenterId ? fridges.filter(f => f.healthCenterId === form.healthCenterId) : fridges);
  }, [form.healthCenterId, fridges]);

  const openControl = async (dev: Device) => {
    setShowControl(dev);
    if (!controls[dev.id]) {
      const c: any = await api.getDeviceControl(dev.id).catch(() => null);
      if (c) setControls(prev => ({ ...prev, [dev.id]: c }));
    }
  };

  const toggleControl = async (devId: string, field: string, value: any) => {
    const updated: any = await api.updateDeviceControl(devId, { [field]: value }).catch(console.error);
    if (updated) setControls(prev => ({ ...prev, [devId]: updated }));
  };

  const handleSubmit = async () => {
    if (!form.name || !form.serialNumber || !form.fridgeId || !form.healthCenterId) return;
    if (editDevice) await api.updateDevice(editDevice.id, form).catch(console.error);
    else await api.createDevice(form).catch(console.error);
    setShowForm(false); setEditDevice(null);
    setForm({ ...emptyForm });
    load();
  };

  const handleEdit = (dev: Device) => {
    setEditDevice(dev);
    setForm({ name: dev.name, serialNumber: dev.serialNumber, fridgeId: dev.fridgeId, healthCenterId: dev.healthCenterId, ipAddress: dev.ipAddress, firmware: dev.firmware });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this sensor?')) return;
    await api.deleteDevice(id).catch(console.error);
    load();
  };

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const ctrl = showControl ? controls[showControl.id] : null;

  if (loading) return <PageLoader message="Loading IoT sensors..." />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">IoT Sensors</h1>
          <p className="text-sm text-slate-500">Manage sensors assigned to fridges</p>
        </div>
        <button onClick={() => { setEditDevice(null); setForm({ ...emptyForm }); setShowForm(true); }}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus size={16} /> Register Sensor
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['Sensor', 'Fridge', 'Health Center', 'IP Address', 'Firmware', 'Status', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {devices.map(dev => (
              <tr key={dev.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Cpu size={16} className="text-slate-400" />
                    <div>
                      <p className="font-medium text-slate-800">{dev.name}</p>
                      <p className="text-xs text-slate-400">{dev.serialNumber}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600 text-xs">{dev.fridgeName || dev.fridgeId}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{dev.healthCenterName || dev.healthCenterId}</td>
                <td className="px-4 py-3 text-slate-500 font-mono text-xs">{dev.ipAddress}</td>
                <td className="px-4 py-3 text-slate-500 text-xs">{dev.firmware}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[dev.status]}`}>{dev.status}</span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <button onClick={() => openControl(dev)} title="Controls" className="p-1.5 rounded hover:bg-blue-50 text-blue-600"><Power size={14} /></button>
                    <button onClick={() => handleEdit(dev)} className="p-1.5 rounded hover:bg-slate-100 text-slate-600"><Pencil size={14} /></button>
                    <button onClick={() => handleDelete(dev.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {devices.length === 0 && <p className="text-center text-slate-400 py-10">No sensors registered.</p>}
      </div>

      {showForm && (
        <Modal title={editDevice ? 'Edit Sensor' : 'Register Sensor'} onClose={() => { setShowForm(false); setEditDevice(null); }}>
          <div className="space-y-3">
            {[
              { label: 'Sensor Name *', key: 'name', placeholder: 'Sensor — Main Fridge' },
              { label: 'Serial Number *', key: 'serialNumber', placeholder: 'SN-001-HC1' },
              { label: 'IP Address', key: 'ipAddress', placeholder: '192.168.1.10' },
              { label: 'Firmware', key: 'firmware', placeholder: 'v2.1.4' },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-xs font-medium text-slate-600 mb-1">{field.label}</label>
                <input value={(form as any)[field.key]} onChange={e => f(field.key, e.target.value)} placeholder={field.placeholder}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Health Center</label>
              <select value={form.healthCenterId} onChange={e => f('healthCenterId', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="">Select...</option>
                {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Fridge *</label>
              <select value={form.fridgeId} onChange={e => f('fridgeId', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="">Select...</option>
                {availableFridges.map(fr => <option key={fr.id} value={fr.id}>{fr.name}</option>)}
              </select>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleSubmit} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700">{editDevice ? 'Save' : 'Create'}</button>
              <button onClick={() => { setShowForm(false); setEditDevice(null); }} className="flex-1 border border-slate-200 py-2 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </Modal>
      )}

      {showControl && ctrl && (
        <Modal title={`Controls — ${showControl.name}`} onClose={() => setShowControl(null)}>
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
                <button onClick={() => toggleControl(showControl.id, item.field, !(ctrl as any)[item.field])}
                  className={`w-12 h-6 rounded-full transition-colors ${(ctrl as any)[item.field] ? item.color : 'bg-slate-300'}`}>
                  <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${(ctrl as any)[item.field] ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            ))}
            {ctrl.fanEnabled && (
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="flex justify-between mb-2">
                  <p className="font-medium text-sm">Fan Speed</p>
                  <span className="text-sm font-bold text-blue-600">{ctrl.fanSpeed}%</span>
                </div>
                <input type="range" min={0} max={100} value={ctrl.fanSpeed}
                  onChange={e => toggleControl(showControl.id, 'fanSpeed', Number(e.target.value))}
                  className="w-full accent-blue-600" />
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
}
