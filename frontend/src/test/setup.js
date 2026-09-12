import '@testing-library/jest-dom/vitest';

const storage = () => {
  let values = {};
  return {
    getItem: key => values[key] || null,
    setItem: (key, value) => { values[key] = String(value); },
    removeItem: key => { delete values[key]; },
    clear: () => { values = {}; }
  };
};

Object.defineProperty(window, 'localStorage', { value: storage() });
Object.defineProperty(window, 'sessionStorage', { value: storage() });
