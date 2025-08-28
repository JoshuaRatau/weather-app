import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const lat = searchParams.get('lat');
    const lon = searchParams.get('lon');

    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing OPENWEATHER_API_KEY' }, { status: 500 });
    }

    if (!lat || !lon) {
      return NextResponse.json({ error: 'lat and lon query params are required' }, { status: 400 });
    }

    const url = new URL('https://api.openweathermap.org/data/2.5/weather');
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lon));
    url.searchParams.set('appid', apiKey);
    url.searchParams.set('units', 'metric'); 

    const res = await fetch(url.toString(), { cache: 'no-store' });

    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json(
        { error: 'OpenWeather request failed', detail },
        { status: res.status }
      );
    }

    const data = await res.json();
    return NextResponse.json(data, { status: 200 });
  } catch (e: unknown) {
    const detail = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: 'Unexpected server error', detail }, { status: 500 });
  }
}
