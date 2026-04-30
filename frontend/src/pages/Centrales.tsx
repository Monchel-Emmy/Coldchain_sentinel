import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Building2, Phone, MapPin, Thermometer, Cpu, RefreshCw, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { HealthCenter } from '../types';
import Modal from '../components/Modal';
import { usePermissions } from '../hooks/useRBAC';
import PageLoader from '../components/PageLoader';

// ─── Demo fallback ────────────────────────────────────────────────────────────
const DEMO: HealthCenter[] = [
  { id: 'hc1', name: 'City Health Center', type: 'health_center', region: 'Western Region', district: 'Central District', address: '12 Health Avenue, Central District', contactName: 'Dr. James Ouedraogo', contactPhone: '+226 70 11 22 33', status: 'active', createdAt: '2024-01-10T08:00:00Z', fridgesCount: 2, devicesCount: 2, vaccinesCount: 4 },
  { id: 'hc2', name: 'North Dispensary', type: 'dispensary', region: 'Western Region', district: 'North District', address: '45 Main Street, North District', contactName: 'Nurse Marie Sawadogo', contactPhone: '+226 76 44 55 66', status: 'active', createdAt: '2024-02-01T08:00:00Z', fridgesCount: 2, devicesCount: 2, vaccinesCount: 2 },
  { id: 'hc3', name: 'East CSPS', type: 'csps', region: 'Eastern Region', district: 'East District', address: 'Central Quarter, East District', contactName: 'Nurse Jean Compaore', contactPhone: '+226 65 77 88 99', status: 'active', createdAt: '2024-03-05T08:00:00Z', fridgesCount: 2, devicesCount: 1, vaccinesCount: 1 },
];

const typeConfig: Record<string, { label: string; color: string }> = {
  health_center: { label: 'Health Center', color: 'bg-blue-100 text-blue-700' },
  dispensary:    { label: 'Dispensary',    color: 'bg-purple-100 text-purple-700' },
  hospital:      { label: 'Hospital',      color: 'bg-red-100 text-red-700' },
  csps:          { label: 'CSPS',          color: 'bg-green-100 text-green-700' },
};

const empty = {
  name: '', type: 'health_center', region: '', district: '',
  address: '', contactName: '', contactPhone: '', status: 'active',
};

export default function HealthCenters() {
  const [centers, setCenters] = useState<HealthCenter[]>(DEMO);
  const [loading, setLoading] = useState(true);
  const [backendOnline, setBackendOnline] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState<HealthCenter | null>(null);
  const [form, setForm] = useState({ ...empty });
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const perms = usePermissions(['health_centers:create', 'health_centers:edit', 'health_centers:delete']);

  const load = async () => {
    setLoading(true);
    try {
      const data: any = await api.getHealthCenters();
      setCenters(data);
      setBackendOnline(true);
    } catch {
      setBackendOnline(false);
      // keep demo data
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = centers.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.district ?? '').toLowerCase().includes(search.toLowerCase()) ||
    (c.region ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const openCreate = () => {
    setEditItem(null);
    setForm({ ...empty });
    setError('');
    setShowForm(true);
  };

  const openEdit = (c: HealthCenter) => {
    setEditItem(c);
    setForm({ name: c.name, type: c.type, region: c.region, district: c.district, address: c.address, contactName: c.contactName, contactPhone: c.contactPhone, status: c.status });
    setError('');
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Facility name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      if (backendOnline) {
        if (editItem) {
          const updated: any = await api.updateHealthCenter(editItem.id, form);
          setCenters(prev => prev.map(c => c.id === editItem.id ? { ...updated, fridgesCount: c.fridgesCount, devicesCount: c.devicesCount, vaccinesCount: c.vaccinesCount } : c));
        } else {
          const created: any = await api.createHealthCenter(form);
          setCenters(prev => [...prev, { ...created, fridgesCount: 0, devicesCount: 0, vaccinesCount: 0 }]);
        }
      } else {
        // Offline: update local state only
        if (editItem) {
          setCenters(prev => prev.map(c => c.id === editItem.id ? { 
            ...c, 
            ...form, 
            type: form.type as 'health_center' | 'dispensary' | 'hospital' | 'csps',
            status: form.status as 'active' | 'inactive'
          } : c));
        } else {
          const newItem: HealthCenter = { 
            id: `hc-local-${Date.now()}`, 
            ...form, 
            type: form.type as 'health_center' | 'dispensary' | 'hospital' | 'csps',
            status: form.status as 'active' | 'inactive',
            createdAt: new Date().toISOString(), 
            fridgesCount: 0, 
            devicesCount: 0, 
            vaccinesCount: 0 
          };
          setCenters(prev => [...prev, newItem]);
        }
      }
      setShowForm(false);
    } catch (e: any) {
      setError(e.message || 'Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const center = centers.find(c => c.id === id);
    const msg = `Delete "${center?.name}"?\n\nThis will permanently delete:\n• All fridges & freezers\n• All IoT sensors\n• All vaccines stored there\n• All alerts\n• Storage rooms\n\nThis cannot be undone.`;
    if (!confirm(msg)) return;
    try {
      if (backendOnline) await api.deleteHealthCenter(id);
      setCenters(prev => prev.filter(c => c.id !== id));
    } catch (e: any) {
      alert(e.message || 'Failed to delete.');
    }
  };

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Health Centers & Dispensaries</h1>
          <p className="text-sm text-slate-500">{centers.length} facility(ies) registered</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} title="Refresh" className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500">
            <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          </button>
          {perms['health_centers:create'] && (
            <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
              <Plus size={16} /> Add Facility
            </button>
          )}
        </div>
      </div>

      {/* Backend status banner */}
      {!backendOnline && !loading && (
        <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg px-4 py-2.5 text-sm">
          <AlertCircle size={15} className="flex-shrink-0" />
          Backend offline — showing demo data. Changes will be saved locally until the server is available.
        </div>
      )}

      {/* Search */}
      <input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Search by name, district or region..."
        className="w-full max-w-sm border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {/* Cards */}
      {loading ? (
        <PageLoader message="Loading health centers..." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(c => {
            const t = typeConfig[c.type] || { label: c.type, color: 'bg-slate-100 text-slate-600' };
            return (
              <div key={c.id} className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow">
                {/* Top row */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Building2 size={20} className="text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 leading-tight truncate">{c.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${t.color}`}>{t.label}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0 ml-2">
                    {perms['health_centers:edit'] && (
                      <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-slate-100 text-slate-500" title="Edit">
                        <Pencil size={14} />
                      </button>
                    )}
                    {perms['health_centers:delete'] && (
                      <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500" title="Delete">
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="space-y-1.5 text-sm">
                  {(c.district || c.region) && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <MapPin size={13} className="flex-shrink-0 text-slate-400" />
                      <span>{[c.district, c.region].filter(Boolean).join(' · ')}</span>
                    </div>
                  )}
                  {c.address && (
                    <p className="text-xs text-slate-400 pl-5 truncate">{c.address}</p>
                  )}
                  {c.contactName && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Phone size={13} className="flex-shrink-0 text-slate-400" />
                      <span className="truncate">{c.contactName}{c.contactPhone ? ` · ${c.contactPhone}` : ''}</span>
                    </div>
                  )}
                </div>

                {/* Footer stats */}
                <div className="flex items-center gap-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Thermometer size={13} className="text-blue-400" />
                    <span>{c.fridgesCount ?? 0} fridge(s)</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Cpu size={13} className="text-green-400" />
                    <span>{c.devicesCount ?? 0} sensor(s)</span>
                  </div>
                  <div className="ml-auto">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {c.status === 'active' ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 && (
            <div className="col-span-3 text-center py-14 text-slate-400">
              <Building2 size={36} className="mx-auto mb-3 opacity-20" />
              <p className="font-medium">No facilities found</p>
              {search && <p className="text-sm mt-1">Try a different search term</p>}
            </div>
          )}
        </div>
      )}

      {/* Add / Edit modal */}
      {showForm && (
        <Modal
          title={editItem ? `Edit — ${editItem.name}` : 'Add New Facility'}
          onClose={() => setShowForm(false)}
          size="lg"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Facility Name *</label>
              <input
                value={form.name}
                onChange={e => f('name', e.target.value)}
                placeholder="e.g. City Health Center"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Type *</label>
              <select value={form.type} onChange={e => f('type', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
                <option value="health_center">Health Center</option>
                <option value="dispensary">Dispensary</option>
                <option value="hospital">Hospital</option>
                <option value="csps">CSPS</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select value={form.status} onChange={e => f('status', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Region</label>
              <input value={form.region} onChange={e => f('region', e.target.value)} placeholder="Western Region"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">District</label>
              <input value={form.district} onChange={e => f('district', e.target.value)} placeholder="Central District"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-600 mb-1">Address</label>
              <input value={form.address} onChange={e => f('address', e.target.value)} placeholder="12 Health Avenue..."
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Contact Person</label>
              <input value={form.contactName} onChange={e => f('contactName', e.target.value)} placeholder="Dr. Name"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Phone</label>
              <input value={form.contactPhone} onChange={e => f('contactPhone', e.target.value)} placeholder="+226 70 00 00 00"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {error && (
            <div className="mt-3 flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle size={14} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : editItem ? 'Save Changes' : 'Create Facility'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 border border-slate-200 py-2 rounded-lg text-sm hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
