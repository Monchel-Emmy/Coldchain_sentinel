import { useEffect, useState } from 'react';
import { Bell, CheckCheck, AlertTriangle, AlertCircle, Info } from 'lucide-react';
import { api } from '../services/api';
import { Alert } from '../types';
import PageLoader from '../components/PageLoader';

const severityIcon: Record<string, any> = {
  critical: <AlertCircle size={16} className="text-red-500" />,
  high: <AlertTriangle size={16} className="text-orange-500" />,
  medium: <AlertTriangle size={16} className="text-yellow-500" />,
  low: <Info size={16} className="text-blue-500" />,
};

const severityBadge: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-yellow-100 text-yellow-700',
  low: 'bg-blue-100 text-blue-700',
};

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'acknowledged'>('active');
  const [loading, setLoading] = useState(true);

  const load = () => {
    const params = filter === 'active' ? { acknowledged: false } : filter === 'acknowledged' ? { acknowledged: true } : {};
    setLoading(true);
    api.getAlerts(params).then((d: any) => setAlerts(d)).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  const acknowledge = async (id: string) => {
    await api.acknowledgeAlert(id).catch(console.error);
    load();
  };

  const acknowledgeAll = async () => {
    await api.acknowledgeAll().catch(console.error);
    load();
  };

  const activeCount = alerts.filter(a => !a.acknowledged).length;

  if (loading) return <PageLoader message="Loading alerts..." />;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Alerts</h1>
          <p className="text-sm text-slate-500">{activeCount} active alert{activeCount !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          {(['all', 'active', 'acknowledged'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize ${filter === f ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
              {f}
            </button>
          ))}
          {filter !== 'acknowledged' && activeCount > 0 && (
            <button onClick={acknowledgeAll} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700">
              <CheckCheck size={15} /> Acknowledge All
            </button>
          )}
        </div>
      </div>

      <div className="space-y-3">
        {alerts.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-10 text-center">
            <Bell size={32} className="mx-auto mb-2 text-slate-300" />
            <p className="text-slate-400">No alerts found</p>
          </div>
        )}
        {alerts.map(alert => (
          <div key={alert.id} className={`bg-white rounded-xl border p-4 flex items-start gap-4 ${alert.acknowledged ? 'border-slate-100 opacity-60' : 'border-slate-200'}`}>
            <div className="mt-0.5">{severityIcon[alert.severity]}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${severityBadge[alert.severity]}`}>{alert.severity.toUpperCase()}</span>
                <span className="text-xs text-slate-400 capitalize">{alert.type.replace('_', ' ')}</span>
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-500">{alert.fridgeId}</span>
              </div>
              <p className="text-sm font-medium text-slate-800 mt-1">{alert.message}</p>
              <p className="text-xs text-slate-400 mt-0.5">{new Date(alert.createdAt).toLocaleString()}</p>
            </div>
            {!alert.acknowledged && (
              <button onClick={() => acknowledge(alert.id)} className="flex-shrink-0 text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600">
                Acknowledge
              </button>
            )}
            {alert.acknowledged && <span className="text-xs text-green-600 font-medium flex-shrink-0">✓ Resolved</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
