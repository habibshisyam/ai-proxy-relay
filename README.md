# AI Proxy Relay (Cloudflare Workers & Vercel Edge)

Multi-cloud stateless reverse proxy untuk pool proxy 9Router / VansRouter.

## Struktur Direktori
- `cloudflare/`: Deploy ke Cloudflare Workers
  - `index.js`: Worker script
  - `wrangler.toml`: Konfigurasi Wrangler
- `vercel/`: Deploy ke Vercel Edge
  - `api/relay.js`: Edge Function
  - `vercel.json`: URL rewrites

## Cara Deploy

### 1. Cloudflare Workers
```bash
cd cloudflare
npx wrangler deploy
```

### 2. Vercel Edge
```bash
cd vercel
npx vercel --prod
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
