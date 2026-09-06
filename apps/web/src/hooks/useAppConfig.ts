import { useEffect, useState } from 'react';

export function useAppConfig() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null as any);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/v1/config');
        if (!mounted) return;
        if (res.ok) {
          const json = await res.json();
          setConfig(json);
        }
      } catch (err) {
        // ignore errors
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return { loading, config };
}
