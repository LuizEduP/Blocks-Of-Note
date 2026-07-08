# Configuração Railway

## 1. Push feito ✅
Commit `46dde13` já está no GitHub.

## 2. Conectar no Railway
- Vá em https://railway.app
- Crie um novo projeto a partir do repositório `LuizEduP/Commentarium`
- Escolha "Node.js" como template (ou deixe automático)

## 3. Variáveis de ambiente
No dashboard do Railway, em **Variables**, adicione:

| Variable | Value |
|----------|-------|
| `PORT` | `3000` |

(O `SUPABASE_URL` e `SUPABASE_ANON_KEY` já estão inline no `public/shared/supabase.js`)

## 4. Deploy
- O Railway detecta automaticamente o `package.json` com `"start": "node server.js"`
- O build roda `npm install` seguido de `npm start`

---

## ⚠️ Resolvendo erro "redirect_uri_mismatch" no login Google

### Causa
O **Google Cloud Console** precisa autorizar a URI de callback do Supabase.

### Fluxo do erro
1. Você clica "Entrar com Google" no app
2. O `auth-supabase.js` chama `sb.auth.signInWithOAuth({ provider: 'google' })`
3. O Supabase redireciona para a tela de login do Google com `redirect_uri = https://pnlucbugvswehculgziu.supabase.co/auth/v1/callback`
4. O Google verifica se essa URI está na lista de "URIs de redirecionamento autorizadas" do Client ID
5. Se **não estiver**, retorna erro **400: redirect_uri_mismatch**

### Solução

1. Acesse https://console.cloud.google.com/apis/credentials
2. Encontre o Client ID OAuth 2.0 usado no app:
   ```
   264095391579-ok60k94lad3ejjao85te2apg90o1tq73.apps.googleusercontent.com
   ```
3. Em **"URIs de redirecionamento autorizados"**, adicione:
   ```
   https://pnlucbugvswehculgziu.supabase.co/auth/v1/callback
   ```
4. Clique em **Salvar** (pode levar alguns minutos para propagar)

### Para testar localhost também
Em **"Origens autorizadas"** (JavaScript), adicione:
```
http://localhost:3000
```

### Como descobrir a URI de callback do seu Supabase
Pegue sua `SUPABASE_URL` (ex: `https://pnlucbugvswehculgziu.supabase.co`) e concatene:
```
{SUPABASE_URL}/auth/v1/callback
```

> A `SUPABASE_URL` está em `public/shared/supabase.js` (linha 5).
