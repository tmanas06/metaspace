# API Reference

VirtualVerse's API is defined by the NestJS server's OpenAPI spec.

## Live Swagger UI

When the server is running locally on Ubuntu:

- **Swagger UI:** `http://localhost:3001/api`
- **Colyseus Monitor:** `http://localhost:3001/colyseus`

Via Cloudflare Tunnel (current tunnel URL — changes on restart):

- **HTTPS Base:** `https://nursery-directive-gray-jennifer.trycloudflare.com`

## Key Endpoints Used by the Frontend

| Method | Path | Used By | Description |
|--------|------|---------|-------------|
| `POST` | `/livekit/token` | `src/lib/livekit.ts` | Returns a signed JWT to join a LiveKit room. Body: `{ targetSessionId: string }` |
| `POST` | `/auth/login` | _(future)_ | Authenticates a user |
| `POST` | `/chat` | `src/components/ui/ChatPanel.tsx` | Send a chat message _(endpoint TBD — see TODO in ChatPanel)_ |

## Source of Truth

**Do not hand-edit this file with endpoint details** — all endpoints are declared in `openapi.json` in `virtualverse-server`. To keep them in sync:

1. **If you have openapi.json from the server:**
   ```bash
   # Generate TypeScript client types from openapi.json
   npx openapi-typescript ./openapi.json -o src/types/api.d.ts
   ```
   Then import types from `@/types/api` instead of declaring them manually.

2. **Otherwise**, check the Swagger UI at `${NEXT_PUBLIC_API_URL}/api` to see all live endpoints.

## Adding a New Endpoint

1. Define it in NestJS with `@ApiOperation` / `@ApiResponse` decorators
2. Regenerate `openapi.json` from the server
3. Run `openapi-typescript` to update client types
4. **Never manually duplicate** interface shapes between client and server
