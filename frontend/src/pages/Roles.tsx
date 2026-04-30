import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { Role } from '../types';
import Modal from '../components/Modal';

export default function Roles() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPerms, setAllPerms] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [form, setForm] = useState({ name: '', description: '', permissions: [] as string[] });

  const load = () => {
    api.getRoles().then((d: any) => setRoles(d)).catch(console.error);
    api.getAllPermissions().then((d: any) => setAllPerms(d)).catch(console.error);
  };
  useEffect(() => { load(); }, []);

  const togglePerm = (perm: string) => {
    setForm(p => ({
      ...p,
      permissions: p.permissions.includes(perm)
        ? p.permissions.filter(x => x !== perm)
        : [...p.permissions, perm],
    }));
  };

  const handleSubmit = async () => {
    if (editRole) await api.updateRole(editRole.id, form).catch(console.error);
    else await api.createRole(form).catch(console.error);
    setShowForm(false); setEditRole(null);
    setForm({ name: '', description: '', permissions: [] });
    load();
  };

  const handleEdit = (r: Role) => {
    setEditRole(r);
    setForm({ name: r.name, description: r.description, permissions: [...r.permissions] });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this role?')) return;
    await api.deleteRole(id).catch(console.error);
    load();
  };

  // Group permissions by module
  const grouped = allPerms.reduce((acc, p) => {
    const [module] = p.split(':');
    if (!acc[module]) acc[module] = [];
    acc[module].push(p);
    return acc;
  }, {} as Record<string, string[]>);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Roles & Access Control</h1>
          <p className="text-sm text-slate-500">Define roles and assign granular permissions</p>
        </div>
        <button onClick={() => { setEditRole(null); setShowForm(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
          <Plus size={16} /> Create Role
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map(role => (
          <div key={role.id} className="bg-white rounded-xl border border-slate-200 p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center">
                  <ShieldCheck size={18} className="text-purple-600" />
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{role.name}</p>
                  <p className="text-xs text-slate-400">{role.permissions.length} permissions</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(role)} className="p-1.5 rounded hover:bg-slate-100 text-slate-600"><Pencil size={14} /></button>
                <button onClick={() => handleDelete(role.id)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
              </div>
            </div>
            {role.description && <p className="text-sm text-slate-500 mb-3">{role.description}</p>}
            <div className="flex flex-wrap gap-1">
              {role.permissions.slice(0, 6).map(p => (
                <span key={p} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">{p}</span>
              ))}
              {role.permissions.length > 6 && (
                <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">+{role.permissions.length - 6} more</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <Modal title={editRole ? 'Edit Role' : 'Create Role'} onClose={() => { setShowForm(false); setEditRole(null); }} size="lg">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Role Name</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Technician"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Description</label>
              <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="What can this role do?"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">Permissions</label>
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {Object.entries(grouped).map(([module, perms]) => (
                  <div key={module}>
                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 capitalize">{module}</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      {perms.map(perm => (
                        <label key={perm} className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" checked={form.permissions.includes(perm)} onChange={() => togglePerm(perm)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                          <span className="text-xs text-slate-600">{perm.split(':')[1]}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={handleSubmit} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700">{editRole ? 'Save' : 'Create'}</button>
              <button onClick={() => { setShowForm(false); setEditRole(null); }} className="flex-1 border border-slate-200 py-2 rounded-lg text-sm hover:bg-slate-50">Cancel</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
