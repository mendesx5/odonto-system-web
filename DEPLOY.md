# Deploy — OdontoSystem Web (Vercel)

## Variáveis de ambiente

Configure `VITE_API_URL` no painel do Vercel apontando para o seu backend no Railway:

```
VITE_API_URL=https://seu-backend.up.railway.app
```

## Deploy no Vercel (recomendado)

1. Faça push do projeto para o GitHub/GitLab
2. Importe o repositório no [Vercel](https://vercel.com/new)
3. Configure a variável de ambiente `VITE_API_URL`
4. As configurações de build já estão corretas:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. Clique em Deploy

> O arquivo `vercel.json` já configura o fallback de roteamento SPA automaticamente.

## Desenvolvimento local

```bash
npm install
cp .env.example .env   # edite VITE_API_URL
npm run dev
```

## CORS no backend (Railway)

Certifique-se que `SecurityConfig.java` permite a origem do Vercel:

```java
config.setAllowedOrigins(List.of(
    "http://localhost:5173",
    "https://seu-projeto.vercel.app"  // ← domínio gerado pelo Vercel
));
```
