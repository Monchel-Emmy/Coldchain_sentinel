import { useEffect } from 'react';
import { useLoading } from '../context/LoadingContext';
import { registerLoadingCallbacks } from '../services/api';

// Thin shimmer bar at the very top of the viewport
export default function GlobalLoader() {
  const { startLoading, stopLoading, isLoading } = useLoading();

  useEffect(() => {
    registerLoadingCallbacks(startLoading, stopLoading);
  }, [startLoading, stopLoading]);

  return (
    <>
      <style>{`
        @keyframes shimmer-bar {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
      {/* Top progress bar */}
      <div className={`fixed top-0 left-0 right-0 z-[100] h-0.5 bg-slate-200 overflow-hidden transition-opacity duration-300 ${isLoading ? 'opacity-100' : 'opacity-0'}`}>
        <div
          className="h-full w-1/3 bg-blue-500 rounded-full"
          style={{ animation: isLoading ? 'shimmer-bar 1s infinite ease-in-out' : 'none' }}
        />
      </div>
    </>
  );
}
