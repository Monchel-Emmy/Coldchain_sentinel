import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Thermometer, ShieldCheck, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { Vaccine, HealthCenter, Fridge, VaccineStats } from '../types';
import Modal from '../components/Modal';
import StatCard from '../components/StatCard';
import { usePermissions, useHealthCenterScope } from '../hooks/useRBAC';
import PageLoader from '../components/PageLoader';

const statusBadge: Record<string, string> = {
  compliant: 'bg-green-100 text-green-700',
  at_risk: 'bg-red-100 text-red-700',
  expired: 'bg-slate-200 text-slate-500',
  recalled: 'bg-yellow-100 text-yellow-700',
};

const statusLabel: Record<string, string> = {
  compliant: '✓ Compliant',
  at_risk: '⚠ At Risk',
  expired: 'Expired',
  recalled: 'Recalled',
};

const emptyForm = {
  name: '', type: '', manufacturer: '', batchNumber: '',
  quantity: '', unit: 'doses',
  fridgeId: '', healthCenterId: '',
  expiryDate: '',
  storageRequirements: { tempMin: '2', tempMax: '8', humidityMin: '40', humidityMax: '70' },
};

export default function Vaccines() {
  const [vaccines, setVaccines] = useState<Vaccine[]>([]);
  const [stats, setStats] = useState<VaccineStats | null>(null);
  const [centers, setCenters] = useState<HealthCenter[]>([]);
  const [fridges, setFridges] = useState<Fridge[]>([]);
  const [availableFridges, setAvailableFridges] = useState<Fridge[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<Vaccine | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [filterHC, setFilterHC] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const hcScope = useHealthCenterScope();
  const perms = usePermissions(['vaccines:create', 'vaccines:edit', 'vaccines:delete']);

  const load = () => {
    const effectiveHC = hcScope || filterHC || undefined;
    setLoading(true);
    Promise.all([
      api.getVaccines({ healthCenterId: effectiveHC, status: filterStatus || undefined }).then((d: any) => setVaccines(d)),
      api.getVaccineStats(effectiveHC).then((d: any) => setStats(d)),
      api.getHealthCenters().then((d: any) => setCenters(d)),
      api.getFridges(effectiveHC).then((d: any) => setFridges(d)),
    ]).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [filterHC, filterStatus, hcScope]);

  // Filter fridges by selected health center in form
  useEffect(() => {
    setAvailableFridges(form.healthCenterId ? fridges.filter(f => f.healthCenterId === form.healthCenterId) : fridges);
  }, [form.healthCenterId, fridges]);

  const openCreate = () => { setEditItem(null); setForm({ ...emptyForm }); setShowForm(true); };
  const openEdit = (v: Vaccine) => {
    setEditItem(v);
    setForm({
      name: v.name, type: v.type, manufacturer: v.manufacturer, batchNumber: v.batchNumber,
      quantity: String(v.quantity), unit: v.unit,
      fridgeId: v.fridgeId, healthCenterId: v.healthCenterId,
      expiryDate: v.expiryDate,
      storageRequirements: { tempMin: String(v.storageRequirements.tempMin), tempMax: String(v.storageRequirements.tempMax), humidityMin: String(v.storageRequirements.humidityMin), humidityMax: String(v.storageRequirements.humidityMax) },
    });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.fridgeId || !form.healthCenterId) return;
    const payload = {
      name: form.name, type: form.type, manufacturer: form.manufacturer, batchNumber: form.batchNumber,
      quantity: Number(form.quantity), unit: form.unit,
      fridgeId: form.fridgeId, healthCenterId: form.healthCenterId,
      expiryDate: form.expiryDate,
      storageRequirements: {
        tempMin: Number(form.storageRequirements.tempMin),
        tempMax: Number(form.storageRequirements.tempMax),
        humidityMin: Number(form.storageRequirements.humidityMin),
        humidityMax: Number(form.storageRequirements.humidityMax),
      },
    };
    if (editItem) await api.updateVaccine(editItem.id, payload).catch(console.error);
    else await api.createVaccine(payload).catch(console.error);
    setShowForm(false);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this vaccine?')) return;
    await api.deleteVaccine(id).catch(console.error);
    load();
  };

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const fs = (k: string, v: string) => setForm(p => ({ ...p, storageRequirements: { ...p.storageRequirements, [k]: v } }));

  if (loading) return <PageLoader message="Loading vaccines..." />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Vaccines</h1>
          <p className="text-sm text-slate-500">{vaccines.length} vaccine(s) registered</p>
        </div>
        {perms['vaccines:create'] && (
          <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            <Plus size={16} /> Register Vaccine
          </button>
        )}
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Total" value={stats.total} icon={ShieldCheck} color="blue" />
          <StatCard label="At Risk" value={stats.atRisk} icon={AlertTriangle} color={stats.atRisk > 0 ? 'red' : 'green'} />
          <StatCard label="Expiring Soon" value={stats.expiringSoon} icon={Clock} color={stats.expiringSoon > 0 ? 'yellow' : 'green'} />
          <StatCard label="Compliant" value={stats.compliant} icon={CheckCircle2} color="green" />
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {/* Only Super Admin sees the health center filter */}
        {!hcScope && (
          <select value={filterHC} onChange={e => setFilterHC(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
            <option value="">All Health Centers</option>
            {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">All Statuses</option>
          <option value="compliant">Compliant</option>
          <option value="at_risk">At Risk</option>
          <option value="expired">Expired</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Vaccine', 'Type', 'Fridge', 'Batch / Manufacturer', 'Qty', 'Storage Req.', 'Current Temp', 'Status', 'Expiry', 'Actions'].map(h => (
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
                  <tr key={v.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-800">{v.name}</p>
                      <p className="text-xs text-slate-400">ID: {v.id}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{v.type}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">{v.fridgeName || v.fridgeId}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-700">{v.batchNumber}</p>
                      <p className="text-xs text-slate-400">{v.manufacturer}</p>
                    </td>
                    <td className="px-4 py-3 font-medium">{v.quantity} {v.unit}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      <div className="flex items-center gap-1"><Thermometer size={11} /> {v.storageRequirements.tempMin}–{v.storageRequirements.tempMax}°C</div>
                    </td>
                    <td className="px-4 py-3">
                      {v.currentTemp !== null && v.currentTemp !== undefined ? (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${tempOk ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          <Thermometer size={11} /> {v.currentTemp}°C
                        </span>
                      ) : <span className="text-slate-400 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${statusBadge[v.status]}`}>
                        {statusLabel[v.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className={`text-xs font-medium ${daysLeft < 0 ? 'text-slate-400' : daysLeft <= 30 ? 'text-orange-600' : 'text-green-600'}`}>
                        {daysLeft < 0 ? 'Expired' : `${daysLeft}d`}
                      </p>
                      <p className="text-xs text-slate-400">{new Date(v.expiryDate).toLocaleDateString()}</p>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {perms['vaccines:edit'] && (
                          <button onClick={() => openEdit(v)} className="p-1.5 rounded hover:bg-slate-100 text-slate-600"><Pencil size={14} /></button>
                        )}
                        {perms['vaccines:delete'] && (
                          <button onClick={() => handleDelete(v.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {vaccines.length === 0 && <p className="text-center text-slate-400 py-10">No vaccines found.</p>}
        </div>
      </div>

      {showForm && (
        <Modal title={editItem ? 'Edit Vaccine' : 'Register Vaccine'} onClose={() => setShowForm(false)} size="lg">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Vaccine Name *</label>
              <input value={form.name} onChange={e => f('name', e.target.value)} placeholder="BCG"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Type</label>
              <input value={form.type} onChange={e => f('type', e.target.value)} placeholder="BCG, Polio, Pentavalent..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Manufacturer</label>
              <input value={form.manufacturer} onChange={e => f('manufacturer', e.target.value)} placeholder="Serum Institute..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Batch Number</label>
              <input value={form.batchNumber} onChange={e => f('batchNumber', e.target.value)} placeholder="BCG-2024-001"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Quantity</label>
              <input type="number" value={form.quantity} onChange={e => f('quantity', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Unit</label>
              <select value={form.unit} onChange={e => f('unit', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="doses">Doses</option>
                <option value="vials">Vials</option>
                <option value="ampoules">Ampoules</option>
              </select>
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
              <label className="block text-xs font-medium text-slate-600 mb-1">Fridge *</label>
              <select value={form.fridgeId} onChange={e => f('fridgeId', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm">
                <option value="">Select...</option>
                {availableFridges.map(fr => <option key={fr.id} value={fr.id}>{fr.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Expiry Date</label>
              <input type="date" value={form.expiryDate} onChange={e => f('expiryDate', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Storage Requirements</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Min Temp (°C)', key: 'tempMin' },
                  { label: 'Max Temp (°C)', key: 'tempMax' },
                  { label: 'Min Humidity (%)', key: 'humidityMin' },
                  { label: 'Max Humidity (%)', key: 'humidityMax' },
                ].map(field => (
                  <div key={field.key}>
                    <label className="block text-xs text-slate-500 mb-1">{field.label}</label>
                    <input type="number" value={(form.storageRequirements as any)[field.key]} onChange={e => fs(field.key, e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSubmit} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700">{editItem ? 'Save' : 'Create'}</button>
            <button onClick={() => setShowForm(false)} className="flex-1 border border-slate-200 py-2 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
