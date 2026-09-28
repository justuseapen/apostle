import type { ApostlePlugin } from "./types";

/**
 * Weather via Open-Meteo (free, no API key).
 * Network: geocoding-api.open-meteo.com + api.open-meteo.com only.
 */

const GEO_HOST = "geocoding-api.open-meteo.com";
const FORECAST_HOST = "api.open-meteo.com";

/** WMO weather interpretation codes (subset). */
const WMO: Record<number, string> = {
  0: "Clear",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Fog",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Snow",
  75: "Heavy snow",
  80: "Rain showers",
  81: "Rain showers",
  82: "Violent rain showers",
  95: "Thunderstorm",
  96: "Thunderstorm with hail",
  99: "Thunderstorm with hail",
};

function parseLatLon(location: string): { lat: number; lon: number } | null {
  const m = location
    .trim()
    .match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lon = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null;
  return { lat, lon };
}

export async function resolveLocation(
  location: string,
  fetchImpl: typeof fetch = fetch,
): Promise<{ lat: number; lon: number; label: string } | { error: string }> {
  const coords = parseLatLon(location);
  if (coords) {
    return { ...coords, label: `${coords.lat},${coords.lon}` };
  }
  const q = location.trim();
  if (q.length < 2) return { error: "Provide a city name or lat,lon." };
  if (q.length > 80) return { error: "Location is too long." };

  const url = new URL(`https://${GEO_HOST}/v1/search`);
  url.searchParams.set("name", q);
  url.searchParams.set("count", "1");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetchImpl(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Apostle/0.1" },
    });
    if (!res.ok) return { error: `Geocoding HTTP ${res.status}` };
    const data = (await res.json()) as {
      results?: { name: string; country?: string; latitude: number; longitude: number; admin1?: string }[];
    };
    const hit = data.results?.[0];
    if (!hit) return { error: `No place found for "${q}".` };
    const parts = [hit.name, hit.admin1, hit.country].filter(Boolean);
    return { lat: hit.latitude, lon: hit.longitude, label: parts.join(", ") };
  } catch {
    return { error: "Could not look up that location." };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchWeather(
  lat: number,
  lon: number,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const url = new URL(`https://${FORECAST_HOST}/v1/forecast`);
  url.searchParams.set("latitude", String(lat));
  url.searchParams.set("longitude", String(lon));
  url.searchParams.set(
    "current",
    "temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m",
  );
  url.searchParams.set("temperature_unit", "fahrenheit");
  url.searchParams.set("wind_speed_unit", "mph");
  url.searchParams.set("timezone", "auto");

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetchImpl(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": "Apostle/0.1" },
    });
    if (!res.ok) return `Weather HTTP ${res.status}`;
    const data = (await res.json()) as {
      timezone?: string;
      current?: {
        time?: string;
        temperature_2m?: number;
        relative_humidity_2m?: number;
        weather_code?: number;
        wind_speed_10m?: number;
      };
      current_units?: Record<string, string>;
    };
    const c = data.current;
    if (!c) return "No current weather in response.";
    const code = typeof c.weather_code === "number" ? c.weather_code : -1;
    const condition = WMO[code] || `code ${code}`;
    return [
      `condition: ${condition}`,
      `temp: ${c.temperature_2m} °F`,
      `humidity: ${c.relative_humidity_2m}%`,
      `wind: ${c.wind_speed_10m} mph`,
      `observed: ${c.time ?? "?"} (${data.timezone ?? "local"})`,
    ].join("\n");
  } catch {
    return "Could not fetch weather.";
  } finally {
    clearTimeout(timer);
  }
}

export const weatherPlugin: ApostlePlugin = {
  id: "weather",
  name: "Weather",
  blurb: "Current weather for a place via Open-Meteo (no API key).",
  needs: {
    network: [`https://${GEO_HOST}`, `https://${FORECAST_HOST}`],
    secrets: [],
    approval: false,
  },
  tool: {
    type: "function",
    function: {
      name: "weather",
      description:
        "Return current weather for a city name or lat,lon using the free Open-Meteo API (no API key). Prefers Fahrenheit. Use when the user asks about weather or temperature outside.",
      parameters: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: 'City name (e.g. "Austin") or "lat,lon" (e.g. "30.27,-97.74").',
          },
        },
        required: ["location"],
      },
    },
  },
  async run(args) {
    const location = (args.location || "").trim();
    if (!location) return "Provide a location (city or lat,lon).";
    const resolved = await resolveLocation(location);
    if ("error" in resolved) return resolved.error;
    const body = await fetchWeather(resolved.lat, resolved.lon);
    if (body.startsWith("Could not") || body.startsWith("Weather HTTP") || body.startsWith("No current")) {
      return body;
    }
    return `location: ${resolved.label}\n${body}`;
  },
};
