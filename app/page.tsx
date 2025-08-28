'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type WeatherData = {
  name: string;
  dt: number;
  timezone: number; 
  sys: { country?: string; sunrise: number; sunset: number };
  weather: { main: string; description: string; icon: string }[];
  main: { temp: number; humidity: number; pressure: number; temp_min: number; temp_max: number };
  wind?: { speed?: number; deg?: number };
  clouds?: { all?: number };
};

type LoadState = 'idle' | 'locating' | 'loading' | 'done' | 'error';

export default function Page() {
  const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [data, setData] = useState<WeatherData | null>(null);
  const [state, setState] = useState<LoadState>('idle');
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  
  const isBusy = state === 'locating' || state === 'loading';

  const formatTime = useCallback((unix: number, tzOffsetSeconds: number) => {
   
    const d = new Date((unix + tzOffsetSeconds) * 1000);
    return d.toUTCString().slice(17, 22) + ' UTC'; 
  }, []);

  const iconUrl = useMemo(() => {
    const icon = data?.weather?.[0]?.icon;
    return icon ? `https://openweathermap.org/img/wn/${icon}@2x.png` : null;
  }, [data]);

 
  const getLocation = useCallback(() => {
    setError(null);
    setState('locating');
    setData(null);
    setCoords(null);

    if (!('geolocation' in navigator)) {
      setState('error');
      setError('Geolocation is not supported in this browser.');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos: GeolocationPosition) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lon: longitude });
      },
      (err: GeolocationPositionError) => {
        setState('error');
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('Permission denied. Please allow location access and try again.');
            break;
          case err.POSITION_UNAVAILABLE:
            setError('Location unavailable. Check your device settings and try again.');
            break;
          case err.TIMEOUT:
            setError('Location request timed out. Please try again.');
            break;
          default:
            setError('Failed to get your location.');
        }
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  }, []);

 
  const fetchWeather = useCallback(async (lat: number, lon: number) => {
    setState('loading');
    setError(null);
    setData(null);

    try {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      const url = `/api/weather?lat=${lat}&lon=${lon}`;
      const res = await fetch(url, { signal: ctrl.signal });

      if (!res.ok) {
      
        const body: unknown = await res.json().catch(() => null);
        let msg = `Network error (${res.status})`;
        if (body && typeof body === 'object' && 'error' in body) {
          const maybeErr = (body as { error?: unknown }).error;
          if (typeof maybeErr === 'string') msg = maybeErr;
        }
        throw new Error(msg);
      }

      const json: WeatherData = await res.json();
      setData(json);
      setState('done');
    } catch (e: unknown) {
      
      if (e instanceof DOMException && e.name === 'AbortError') return;
      setState('error');
      setError(e instanceof Error ? e.message : 'Failed to load weather.');
    }
  }, []);

 
  useEffect(() => {
    getLocation();
  }, [getLocation]);


  useEffect(() => {
    if (coords) fetchWeather(coords.lat, coords.lon);
  }, [coords, fetchWeather]);

  const onRefresh = useCallback(() => {
    getLocation();
  }, [getLocation]);

  return (
    <main>
      <header className="row" style={{ justifyContent: 'space-between', marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Weather at your location</h1>
        <button className="btn btn-outline" onClick={onRefresh} disabled={isBusy}>
          ⟳ Refresh
        </button>
      </header>

   
      {state === 'locating' && (
        <div className="card center">
          <div>
            <div className="spinner" />
            <div className="dim">Locating you…</div>
            <div className="small dim" style={{ marginTop: 6 }}>
              Tip: If prompted, allow location access.
            </div>
          </div>
        </div>
      )}

      {state === 'loading' && (
        <div className="card center">
          <div>
            <div className="spinner" />
            <div className="dim">Fetching weather…</div>
          </div>
        </div>
      )}

      {state === 'error' && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Something went wrong</h2>
          <p className="error">{error}</p>
          <div className="row">
            <button className="btn" onClick={onRefresh} disabled={isBusy}>
              Try again
            </button>
          </div>
          <p className="small dim" style={{ marginTop: 8 }}>
            Common fixes: enable location, check connection, try HTTPS, refresh page.
          </p>
        </div>
      )}

      {state === 'done' && data && (
        <section className="card">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <div>
              <div className="badge">Now</div>
              <h2 style={{ margin: '10px 0 0 0' }}>
                {data.name}{data.sys?.country ? `, ${data.sys.country}` : ''}
              </h2>
              <div className="dim small" aria-live="polite">
                Updated: {new Date(data.dt * 1000).toLocaleString()}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              {iconUrl && (
                <img
                  alt={data.weather?.[0]?.description || 'weather'}
                  src={iconUrl}
                  width={80}
                  height={80}
                />
              )}
              <div className="dim small" style={{ textTransform: 'capitalize' }}>
                {data.weather?.[0]?.description ?? data.weather?.[0]?.main}
              </div>
            </div>
          </div>

          <div className="row" style={{ marginTop: 18, alignItems: 'baseline' }}>
            <div className="big">{Math.round(data.main.temp)}°</div>
            <div className="dim">
              feels like ~ {Math.round((data.main.temp_min + data.main.temp_max) / 2)}°
            </div>
          </div>

          <div className="grid" style={{ marginTop: 16 }}>
            <div className="kv">
              <span>Min / Max</span>
              <span>{Math.round(data.main.temp_min)}° / {Math.round(data.main.temp_max)}°</span>
            </div>
            <div className="kv"><span>Humidity</span><span>{data.main.humidity}%</span></div>
            <div className="kv"><span>Pressure</span><span>{data.main.pressure} hPa</span></div>
            <div className="kv"><span>Wind</span><span>{data.wind?.speed ?? 0} m/s</span></div>
            <div className="kv"><span>Clouds</span><span>{data.clouds?.all ?? 0}%</span></div>
            <div className="kv"><span>Sunrise</span><span>{formatTime(data.sys.sunrise, data.timezone)}</span></div>
            <div className="kv"><span>Sunset</span><span>{formatTime(data.sys.sunset, data.timezone)}</span></div>
          </div>

          <div className="row" style={{ marginTop: 18 }}>
            <button className="btn" onClick={onRefresh} disabled={isBusy}>
              ⟳ Refresh
            </button>
          </div>
        </section>
      )}
    </main>
  );
}
