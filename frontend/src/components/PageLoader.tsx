// Drop this inside any page while data is loading.
// It fills the content area with a centered animated logo.

export default function PageLoader({ message = 'Loading data...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-5 select-none">
      {/* Animated logo mark */}
      <div className="relative w-16 h-16">
        {/* Outer ring — slow spin */}
        <div className="absolute inset-0 rounded-full border-4 border-blue-100" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-blue-500 animate-spin" style={{ animationDuration: '1s' }} />

        {/* Inner ring — faster counter-spin */}
        <div className="absolute inset-2 rounded-full border-4 border-transparent border-t-blue-300 animate-spin" style={{ animationDuration: '0.6s', animationDirection: 'reverse' }} />

        {/* Thermometer icon in the center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 24 24" className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z" />
          </svg>
        </div>
      </div>

      {/* Brand name */}
      <div className="text-center">
        <p className="text-base font-semibold text-slate-700">ColdChain Sentinel</p>
        <p className="text-sm text-slate-400 mt-0.5">{message}</p>
      </div>

      {/* Animated dots */}
      <div className="flex gap-1.5">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }}
          />
        ))}
      </div>
    </div>
  );
}
