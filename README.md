# AI Proxy Relay (Cloudflare Workers & Vercel Edge)

Multi-cloud stateless reverse proxy untuk pool proxy 9Router / VansRouter.

## Struktur Direktori
- `api/relay.js`: Vercel Edge Function (root-level agar Vercel auto-detect)
- `vercel.json`: Vercel rewrites config
- `cloudflare/`: Cloudflare Workers
  - `index.js`: Worker script
  - `wrangler.toml`: Konfigurasi Wrangler

## Cara Deploy

### 1. Vercel (Auto-deploy via GitHub)
Repo di-import ke Vercel dengan **Root Directory default (`.`)**.
Setiap push ke `main` otomatis deploy.

Manual CLI:
```bash
npx vercel --prod
```

### 2. Cloudflare Workers
```bash
cd cloudflare
npx wrangler deploy
```

## Format URL di 9Router / VansRouter
Origin-only:
- `https://<worker-subdomain>.workers.dev`
- `https://<project-name>.vercel.app`

## Pengujian

### Health Check Shim (200 OK)
```bash
curl -i -X GET "https://<endpoint>/" \
  -H "x-relay-target: https://httpbin.org" \
  -H "x-relay-path: /get"
```

### AI Relay Test (401 Unauthorized = Sukses Terhubung)
```bash
curl -i -X GET "https://<endpoint>/" \
  -H "x-relay-target: https://api.deepseek.com" \
  -H "x-relay-path: /v1/models"
```
