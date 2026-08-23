import { databaseTarget } from '../db.js';

const WRITE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

const isLocalOrigin = (origin) => {
  if (!origin) return true;

  try {
    return LOCAL_HOSTS.has(new URL(origin).hostname);
  } catch {
    return false;
  }
};

export const productionWriteGuard = (req, res, next) => {
  if (databaseTarget !== 'production' || !WRITE_METHODS.has(req.method)) {
    return next();
  }

  const confirmation = process.env.PRODUCTION_WRITE_KEY;
  const receivedConfirmation = req.get('X-Production-Write-Confirmation');

  // Production-data mode is for a browser running on the developer's machine,
  // never for a remotely hosted client.
  if (!LOCAL_HOSTS.has(req.hostname) || !isLocalOrigin(req.get('origin'))) {
    return res.status(403).json({ error: 'Production writes are allowed only from localhost.' });
  }

  if (!confirmation || receivedConfirmation !== confirmation) {
    return res.status(428).json({
      error: 'Enable production edit mode and confirm the write before changing production data.'
    });
  }

  return next();
};
