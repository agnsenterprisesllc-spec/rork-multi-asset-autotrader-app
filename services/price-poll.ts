import { useEffect, useState } from 'react';

interface PriceData {
  symbol: string;
  price: number;
  ts?: number;
  timestamp?: number;
}

// Simple REST poller for price when WS is not available
export async function pollPrice(restBase: string, symbol: string) {
  const base = restBase.replace(/\/+$/,"");
  const r = await fetch(`${base}/prices/${encodeURIComponent(symbol)}`);
  if (!r.ok) throw new Error("price poll failed");
  return await r.json();
}

export function usePricePolling(symbol: string, enabled: boolean, restUrl: string) {
  const [price, setPrice] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !symbol || !restUrl) return;

    let alive = true;
    let timeoutId: ReturnType<typeof setTimeout>;

    const fetchPrice = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(`${restUrl}/prices/${symbol}`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
          signal: controller.signal,
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data: PriceData = await response.json();
        
        if (alive && data?.price) {
          setPrice(data.price);
          setError(null);
        }
      } catch (err) {
        if (alive) {
          setError(err instanceof Error ? err.message : 'Unknown error');
          console.log(`Price polling error for ${symbol}:`, err);
        }
      }

      if (alive) {
        timeoutId = setTimeout(fetchPrice, 3000); // Poll every 3 seconds
      }
    };

    // Start polling
    fetchPrice();

    return () => {
      alive = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [symbol, enabled, restUrl]);

  return { price, error };
}