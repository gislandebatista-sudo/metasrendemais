import { createContext, useContext, useState, ReactNode } from 'react';

interface PercentageVisibilityContextType {
  hidePercentages: boolean;
  togglePercentages: () => void;
}

const PercentageVisibilityContext = createContext<PercentageVisibilityContextType>({
  hidePercentages: false,
  togglePercentages: () => {},
});

export function PercentageVisibilityProvider({ children }: { children: ReactNode }) {
  const [hidePercentages, setHidePercentages] = useState(false);
  const togglePercentages = () => setHidePercentages(prev => !prev);

  return (
    <PercentageVisibilityContext.Provider value={{ hidePercentages, togglePercentages }}>
      {children}
    </PercentageVisibilityContext.Provider>
  );
}

export function usePercentageVisibility() {
  return useContext(PercentageVisibilityContext);
}

/** Returns "•••" if percentages are hidden, otherwise the formatted value */
export function maskPercent(value: string | number, hide: boolean): string {
  if (hide) return '•••';
  return typeof value === 'number' ? `${value}` : value;
}
