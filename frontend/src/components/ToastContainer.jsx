import { useEffect, useState } from 'react';

function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToast = (event) => {
      const { message, type = 'success', duration = 2500 } = event.detail || {};

      const id = Date.now() + Math.random();
      const nextToast = { id, message, type };
      setToasts((prev) => [...prev, nextToast]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, duration);
    };

    window.addEventListener('kaizen:toast', handleToast);
    return () => window.removeEventListener('kaizen:toast', handleToast);
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        pointerEvents: 'none'
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{
            minWidth: '260px',
            maxWidth: '360px',
            padding: '0.9rem 1rem',
            borderRadius: '10px',
            color: '#fff',
            background:
              toast.type === 'error'
                ? '#d93025'
                : toast.type === 'warning'
                  ? '#f29900'
                  : toast.type === 'info'
                    ? '#1a73e8'
                    : '#188038',
            boxShadow: '0 10px 30px rgba(0,0,0,0.18)',
            pointerEvents: 'auto'
          }}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}

export default ToastContainer;
