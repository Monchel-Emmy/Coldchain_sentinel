import { Settings as SettingsIcon, Bell, Smartphone, Globe, Shield } from 'lucide-react';
import { useState } from 'react';

export default function Settings() {
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifSMS, setNotifSMS] = useState(false);
  const [notifWhatsapp, setNotifWhatsapp] = useState(false);
  const [phone, setPhone] = useState('');
  const [refreshInterval, setRefreshInterval] = useState('5');
  const [saved, setSaved] = useState(false);

  const save = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const Toggle = ({ value, onChange }: { value: boolean; onChange: () => void }) => (
    <button onClick={onChange} className={`w-11 h-6 rounded-full transition-colors ${value ? 'bg-blue-600' : 'bg-slate-300'}`}>
      <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform mx-0.5 ${value ? 'translate-x-5' : 'translate-x-0'}`} />
    </button>
  );

  return (
    <div className="space-y-5 max-w-2xl">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
          <SettingsIcon size={20} className="text-slate-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Settings</h1>
          <p className="text-sm text-slate-500">System preferences and notification configuration</p>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={16} className="text-slate-600" />
          <h2 className="text-sm font-semibold text-slate-700">Notifications</h2>
        </div>
        <div className="space-y-4">
          {[
            { label: 'Email Notifications', sub: 'Receive alerts via email', value: notifEmail, onChange: () => setNotifEmail(p => !p) },
            { label: 'SMS Notifications', sub: 'Receive alerts via SMS (coming soon)', value: notifSMS, onChange: () => setNotifSMS(p => !p) },
            { label: 'WhatsApp Notifications', sub: 'Receive alerts via WhatsApp (coming soon)', value: notifWhatsapp, onChange: () => setNotifWhatsapp(p => !p) },
          ].map(item => (
            <div key={item.label} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-700">{item.label}</p>
                <p className="text-xs text-slate-400">{item.sub}</p>
              </div>
              <Toggle value={item.value} onChange={item.onChange} />
            </div>
          ))}
        </div>
      </div>

      {/* Contact */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Smartphone size={16} className="text-slate-600" />
          <h2 className="text-sm font-semibold text-slate-700">Alert Contact Number</h2>
        </div>
        <p className="text-xs text-slate-400 mb-3">Phone number to receive SMS/WhatsApp alerts when thresholds are breached</p>
        <input
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="+1 234 567 8900"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Data */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Globe size={16} className="text-slate-600" />
          <h2 className="text-sm font-semibold text-slate-700">Data Settings</h2>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Live Data Refresh Interval</label>
          <select value={refreshInterval} onChange={e => setRefreshInterval(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm">
            <option value="5">Every 5 seconds</option>
            <option value="10">Every 10 seconds</option>
            <option value="30">Every 30 seconds</option>
            <option value="60">Every 60 seconds</option>
          </select>
        </div>
      </div>

      {/* Security */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={16} className="text-slate-600" />
          <h2 className="text-sm font-semibold text-slate-700">Security</h2>
        </div>
        <p className="text-sm text-slate-500 mb-3">Authentication and session management will be available in the next release.</p>
        <div className="bg-blue-50 rounded-lg p-3 text-xs text-blue-700">
          JWT-based authentication, session timeouts, and 2FA are planned for v1.1.0
        </div>
      </div>

      <button onClick={save} className={`px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${saved ? 'bg-green-600 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'}`}>
        {saved ? '✓ Saved' : 'Save Settings'}
      </button>
    </div>
  );
}
