import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

interface LoadingContextType {
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
}

const LoadingContext = createContext<LoadingContextType>({
  isLoading: false,
  startLoading: () => {},
  stopLoading: () => {},
});

export function LoadingProvider({ children }: { children: ReactNode }) {
  // Use a counter so concurrent requests don't cancel each other
  const [count, setCount] = useState(0);

  const startLoading = useCallback(() => setCount(c => c + 1), []);
  const stopLoading  = useCallback(() => setCount(c => Math.max(0, c - 1)), []);

  return (
    <LoadingContext.Provider value={{ isLoading: count > 0, startLoading, stopLoading }}>
      {children}
    </LoadingContext.Provider>
  );
}

export const useLoading = () => useContext(LoadingContext);
