import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fetchWeather, resolveLocation, weatherPlugin } from "./weather.ts";

describe("weather plugin", () => {
  it("declares Open-Meteo hosts and no secrets", () => {
    assert.deepEqual(weatherPlugin.needs.secrets, []);
    assert.equal(weatherPlugin.needs.approval, false);
    assert.ok(weatherPlugin.needs.network.some((h) => h.includes("open-meteo.com")));
  });

  it("parses lat,lon without network", async () => {
    const resolved = await resolveLocation("30.27,-97.74", async () => {
      throw new Error("should not fetch");
    });
    assert.ok(!("error" in resolved));
    if (!("error" in resolved)) {
      assert.equal(resolved.lat, 30.27);
      assert.equal(resolved.lon, -97.74);
    }
  });

  it("geocodes and formats with a stub fetch", async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input);
      if (url.includes("geocoding-api")) {
        return new Response(
          JSON.stringify({
            results: [
              {
                name: "Austin",
                admin1: "Texas",
                country: "United States",
                latitude: 30.27,
                longitude: -97.74,
              },
            ],
          }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          timezone: "America/Chicago",
          current: {
            time: "2026-09-28T10:00",
            temperature_2m: 72,
            relative_humidity_2m: 40,
            weather_code: 0,
            wind_speed_10m: 5,
          },
        }),
        { status: 200 },
      );
    };
    const resolved = await resolveLocation("Austin", fetchImpl);
    assert.ok(!("error" in resolved));
    if (!("error" in resolved)) {
      const body = await fetchWeather(resolved.lat, resolved.lon, fetchImpl);
      assert.match(body, /Clear/);
      assert.match(body, /72/);
    }
    // Plugin run uses real fetch for geocode — only assert empty location here.
    assert.match(await weatherPlugin.run({}), /Provide a location/);
  });
});
