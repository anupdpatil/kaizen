const TOAST_EVENT = 'kaizen:toast';

export const showToast = (message, type = 'success', duration = 2500) => {
  const event = new CustomEvent(TOAST_EVENT, {
    detail: { message, type, duration }
  });
  window.dispatchEvent(event);
};

export default showToast;
