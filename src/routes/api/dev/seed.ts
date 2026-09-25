import { createFileRoute } from "@tanstack/react-router";
import { getSql, dbSource } from "@/lib/db";
import {
  seedLocalDevDefaults,
  shouldSeedLocal,
  LOCAL_SEED_EMAIL,
  LOCAL_SEED_PASSWORD,
  LOCAL_SEED_MODEL,
  LOCAL_SEED_MODEL_MAP,
  LOCAL_SEED_GATEWAY_BASE,
} from "@/lib/apostle/local-seed";

/**
 * POST /api/dev/seed — idempotent local Ollama + test user.
 * Allowed only when shouldSeedLocal() (PGLite or APOSTLE_SEED_LOCAL=1).
 */
export const Route = createFileRoute("/api/dev/seed")({
  server: {
    handlers: {
      GET: async () =>
        Response.json({
          ok: true,
          allowed: shouldSeedLocal(),
          dbSource,
          defaults: {
            email: LOCAL_SEED_EMAIL,
            password: LOCAL_SEED_PASSWORD,
            gatewayBaseUrl: LOCAL_SEED_GATEWAY_BASE,
            model: LOCAL_SEED_MODEL,
            modelMap: LOCAL_SEED_MODEL_MAP,
          },
        }),
      POST: async () => {
        if (!shouldSeedLocal()) {
          return Response.json(
            {
              ok: false,
              error:
                "Local seed disabled. Unset DATABASE_URL (PGLite) or set APOSTLE_SEED_LOCAL=1. Set APOSTLE_SEED_LOCAL=0 to silence.",
            },
            { status: 403 },
          );
        }
        try {
          const sql = await getSql();
          const result = await seedLocalDevDefaults(sql);
          return Response.json(result);
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          return Response.json({ ok: false, error: message }, { status: 500 });
        }
      },
    },
  },
});
