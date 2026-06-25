# Deploy — OdontoSystem Web

## Variáveis de ambiente

Crie um arquivo `.env` na raiz (baseado no `.env.example`):

```
VITE_API_URL=https://api.suaclinica.com.br
```

## Build de produção

```bash
bun install
bun run build
```

A pasta `dist/` contém o build estático pronto.

## Opções de hospedagem

### Vercel / Netlify (recomendado — mais simples)
1. Importe o repositório
2. Configure `VITE_API_URL` nas variáveis de ambiente do painel
3. Build command: `bun run build`
4. Output directory: `dist`

### VPS / servidor próprio com Nginx
```nginx
server {
    listen 80;
    server_name suaclinica.com.br;

    root /var/www/odonto-web/dist;
    index index.html;

    # SPA — redireciona tudo para index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache de assets
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # CORS proxy opcional para a API (evita problemas de CORS em produção)
    location /api/ {
        proxy_pass http://localhost:8080/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### Docker (frontend + backend juntos)
Use o `docker-compose.yml` do backend e aponte `VITE_API_URL` para o container da API.

## CORS no backend

Certifique-se que `SecurityConfig.java` permite a origem do frontend:

```java
config.setAllowedOrigins(List.of(
    "http://localhost:5173",
    "https://suaclinica.com.br"  // ← adicione o domínio de produção
));
```
