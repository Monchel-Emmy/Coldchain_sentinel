import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Building2, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { User, Role, HealthCenter } from '../types';
import Modal from '../components/Modal';
import PageLoader from '../components/PageLoader';
import { usePermissions } from '../hooks/useRBAC';

const statusBadge: Record<string, string> = {
  active:   'bg-green-100 text-green-700',
  inactive: 'bg-slate-100 text-slate-500',
};

const emptyForm = { name: '', email: '', password: '', roleId: '', healthCenterId: '', status: 'active' };

export default function Users() {
  const [users, setUsers]     = useState<User[]>([]);
  const [roles, setRoles]     = useState<Role[]>([]);
  const [centers, setCenters] = useState<HealthCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [editUser, setEditUser]   = useState<User | null>(null);
  const [form, setForm]           = useState({ ...emptyForm });
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');

  const perms = usePermissions(['users:create', 'users:edit', 'users:delete']);

  const load = () => {
    setLoading(true);
    Promise.all([
      api.getUsers().then((d: any) => setUsers(d)),
      api.getRoles().then((d: any) => setRoles(d)),
      api.getHealthCenters().then((d: any) => setCenters(d)),
    ]).catch(console.error).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditUser(null);
    setForm({ ...emptyForm });
    setError('');
    setShowForm(true);
  };

  const openEdit = (u: User) => {
    setEditUser(u);
    setForm({ name: u.name, email: u.email, password: '', roleId: u.roleId, healthCenterId: u.healthCenterId || '', status: u.status });
    setError('');
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.roleId) { setError('Name, email and role are required.'); return; }
    if (!editUser && !form.password) { setError('Password is required for new users.'); return; }
    setSaving(true);
    setError('');
    try {
      const payload: any = { name: form.name, email: form.email, roleId: form.roleId, healthCenterId: form.healthCenterId || null, status: form.status };
      if (!editUser) payload.password = form.password;
      if (editUser) await api.updateUser(editUser.id, payload);
      else await api.createUser(payload);
      setShowForm(false);
      load();
    } catch (e: any) {
      setError(e.message || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete user "${name}"? This cannot be undone.`)) return;
    await api.deleteUser(id).catch(console.error);
    load();
  };

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

  // Determine if selected role needs a health center
  const selectedRole = roles.find(r => r.id === form.roleId);
  const needsHC = selectedRole && selectedRole.name !== 'Super Admin';

  if (loading) return <PageLoader message="Loading users..." />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Users</h1>
          <p className="text-sm text-slate-500">{users.length} user(s) registered</p>
        </div>
        {perms['users:create'] && (
          <button onClick={openCreate} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
            <Plus size={16} /> Add User
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {['User', 'Email', 'Role', 'Health Center', 'Status', 'Last Login', 'Actions'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-xs flex-shrink-0">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-medium text-slate-800">{u.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-500">{u.email}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium flex items-center gap-1 w-fit">
                    <ShieldCheck size={11} /> {u.roleName}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {(u as any).healthCenterName ? (
                    <span className="flex items-center gap-1 text-xs text-slate-600">
                      <Building2 size={12} className="text-blue-400" />
                      {(u as any).healthCenterName}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">All centers</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusBadge[u.status]}`}>{u.status}</span>
                </td>
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {u.lastLogin ? new Date(u.lastLogin).toLocaleString() : '—'}
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {perms['users:edit'] && (
                      <button onClick={() => openEdit(u)} className="p-1.5 rounded hover:bg-slate-100 text-slate-600"><Pencil size={14} /></button>
                    )}
                    {perms['users:delete'] && (
                      <button onClick={() => handleDelete(u.id, u.name)} className="p-1.5 rounded hover:bg-red-50 text-red-500"><Trash2 size={14} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <p className="text-center text-slate-400 py-10">No users found.</p>}
      </div>

      {showForm && (
        <Modal title={editUser ? `Edit — ${editUser.name}` : 'Add New User'} onClose={() => { setShowForm(false); setEditUser(null); }}>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Full Name *</label>
              <input value={form.name} onChange={e => f('name', e.target.value)} placeholder="Dr. John Smith"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email *</label>
              <input type="email" value={form.email} onChange={e => f('email', e.target.value)} placeholder="john@example.com"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            {/* Password only shown for new users */}
            {!editUser && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Password *</label>
                <input type="password" value={form.password} onChange={e => f('password', e.target.value)} placeholder="Min. 8 characters"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Role *</label>
              <select value={form.roleId} onChange={e => f('roleId', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
                <option value="">Select role...</option>
                {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>

            {/* Health Center — shown for all roles, required for non-Super Admin */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Health Center
                {needsHC
                  ? <span className="text-red-500 ml-1">* (required for this role)</span>
                  : <span className="text-slate-400 ml-1">(leave empty for all centers)</span>
                }
              </label>
              <select value={form.healthCenterId} onChange={e => f('healthCenterId', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
                <option value="">— All health centers —</option>
                {centers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {needsHC && !form.healthCenterId && (
                <p className="text-xs text-amber-600 mt-1">⚠ This user will not see any data until a health center is assigned.</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Status</label>
              <select value={form.status} onChange={e => f('status', e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={handleSubmit} disabled={saving}
                className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
                {saving ? 'Saving...' : editUser ? 'Save Changes' : 'Create User'}
              </button>
              <button onClick={() => { setShowForm(false); setEditUser(null); }}
                className="flex-1 border border-slate-200 py-2 rounded-lg text-sm hover:bg-slate-50">
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
