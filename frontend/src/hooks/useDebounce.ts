import { useState, useEffect } from "react";

/**
 * Debounce hook — ritarda l'aggiornamento di un valore finché non smette
 * di cambiare per `delay` millisecondi. Usato per evitare fetch ad ogni
 * keystroke nelle search box.
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
