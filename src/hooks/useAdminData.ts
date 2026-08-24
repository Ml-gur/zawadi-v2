import { useCallback, useEffect, useRef, useState } from 'react';
import { AdminOverview, Timeseries, callAdminApi } from '../lib/admin-api';

const POLL_MS = 15_000;

export function useAdminData() {
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [timeseries, setTimeseries] = useState<Timeseries | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    try {
      const [ov, ts] = await Promise.all([
        callAdminApi<AdminOverview>('overview'),
        callAdminApi<Timeseries>('timeseries'),
      ]);
      if (!mountedRef.current) return;
      setOverview(ov);
      setTimeseries(ts);
      setUpdatedAt(new Date());
      setError(null);
    } catch (e) {
      if (!mountedRef.current) return;
      setError((e as Error).message);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    load();
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') load();
    }, POLL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') load();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      mountedRef.current = false;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  return { overview, timeseries, loading, error, updatedAt, refresh: load };
}
