import { useState, useCallback } from 'react';

export function useLocalStorage<T extends string>(
  key: string,
  defaultValue: T,
  validator: (value: unknown) => value is T,
): [T, (value: T) => void] {
  const [state, setState] = useState<T>(() => {
    const saved = localStorage.getItem(key);
    return validator(saved) ? saved : defaultValue;
  });

  const setValue = useCallback((value: T) => {
    setState(value);
    localStorage.setItem(key, value);
  }, [key]);

  return [state, setValue];
}
