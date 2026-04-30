import { useState, useEffect, useRef, createContext, useContext } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { io, Socket } from 'socket.io-client';
import { SensorReading, RoomReading } from '../types';

export interface LiveData {
  readings: Map<string, SensorReading>;      // keyed by deviceId
  roomReadings: Map<string, RoomReading>;    // keyed by roomId
  connected: boolean;
  alertCount: number;
}

export const LiveContext = createContext<LiveData>({
  readings: new Map(),
  roomReadings: new Map(),
  connected: false,
  alertCount: 0,
});
export const useLive = () => useContext(LiveContext);

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [connected, setConnected] = useState(false);
  const [alertCount, setAlertCount] = useState(0);
  const [readings, setReadings] = useState<Map<string, SensorReading>>(new Map());
  const [roomReadings, setRoomReadings] = useState<Map<string, RoomReading>>(new Map());
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(import.meta.env.VITE_WS_URL || 'http://localhost:5000', { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    socket.on('initial', (data: SensorReading[]) => {
      const map = new Map<string, SensorReading>();
      data.forEach(r => map.set(r.deviceId, r));
      setReadings(map);
    });

    socket.on('initialRooms', (data: RoomReading[]) => {
      const map = new Map<string, RoomReading>();
      data.forEach(r => map.set(r.roomId, r));
      setRoomReadings(map);
    });

    socket.on('reading', (r: SensorReading) => {
      setReadings(prev => { const n = new Map(prev); n.set(r.deviceId, r); return n; });
    });

    socket.on('roomReading', (r: RoomReading) => {
      setRoomReadings(prev => { const n = new Map(prev); n.set(r.roomId, r); return n; });
    });

    socket.on('stats', (s: { activeAlerts: number }) => setAlertCount(s.activeAlerts));

    return () => { socket.disconnect(); };
  }, []);

  return (
    <LiveContext.Provider value={{ readings, roomReadings, connected, alertCount }}>
      <div className="flex h-screen bg-slate-50 overflow-hidden">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <Header onMenuClick={() => setSidebarOpen(true)} alertCount={alertCount} connected={connected} />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </LiveContext.Provider>
  );
}
