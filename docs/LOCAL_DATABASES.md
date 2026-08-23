# Local database modes

Use `npm run dev` for ordinary development. It starts the local API on port 4000 and uses the `kaizen_dev` database.

Use `npm run dev:production-data` only when production maintenance is necessary. It starts a separate local API on port 4001 and a Vite app on port 5174. This mode never changes the deployed server; it connects directly to the production database from your local machine.

Production data is protected by four checks:

1. The dedicated production-data command must be used.
2. `backend/.env.production-data.local` must contain the explicit confirmation and a non-development database name.
3. The API accepts writes only from a localhost browser with the matching write key.
4. In the admin UI, type `ENABLE PRODUCTION WRITES`; the permission lasts only for the current browser tab.

Close the tab or click `Production Writes: ON` to disable production editing again. Keep the two ignored `.env.production-data.local` files on your machine and never commit or share their write key.

## Copy production data to development

To replace the development database with a current production copy, stop the local backend first and run this from `backend/`:

```powershell
npm run copy-production-to-dev -- --confirm-copy-production-to-development
```

The command copies every application collection, first writes a timestamped backup of the existing development database to `backend/data/development-backups/`, and then clears admin and jury session locks in the copied data. Production is read-only during this operation; only `kaizen_dev` is overwritten.
