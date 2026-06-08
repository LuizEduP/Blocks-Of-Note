# Configuração Railway

## 1. Push feito ✅
O commit `7097b8a` já está no GitHub.

## 2. Conectar no Railway
- Vá em https://railway.app
- Crie um novo projeto a partir do repositório `LuizEduP/Blocks-Of-Note`
- Escolha "Node.js" como template (ou deixe automático)

## 3. Variáveis de ambiente
No dashboard do Railway, em **Variables**, adicione:

| Variable | Value |
|----------|-------|
| `PORT` | `3000` |
| `SUPABASE_URL` | `https://pnlucbugvswehculgziu.supabase.co` |
| `SUPABASE_ANON_KEY` | `sb_publishable_Wu4AnwQFfGa5tf5Hh4I2LQ_gPhWosuf` |

(O SUPABASE_URL e SUPABASE_ANON_KEY são usados pelo frontend via JS, não pelo server.js, mas é bom registrar)

## 4. Deploy
- O Railway detecta automaticamente o `package.json` com `"start": "node server.js"`
- O build roda `npm install` seguido de `npm start`
- Pronto! 🚀
