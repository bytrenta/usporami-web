# Deploy webů skupiny Úsporami — Coolify runbook

> Adaptace `README-DEPLOY.md` na NAŠI reálnou infrastrukturu.
> Originál README počítá s raw nginx + PM2 + certbot přes SSH.
> **My máme Coolify** (Hetzner) a **SSH na server je aktuálně zamítnutý**
> (memory `feedback_ssh_keys_denied_usporami_core`, 15. 6. 2026) → deploy
> jde přes Coolify (Git zdroj + API + Web Terminal), ne přes ruční nginx.
> Připraveno v Cowork session 16. 6. 2026.

---

## Co je už hotové (Cowork)

- ✅ `chatbot.js` na 4 webech + inline v `partner-rk.html` → `API_URL = https://api.usporami.cz/api/chat`
- ✅ `partner-rk.html` formulář napojen na `POST https://moje.usporami.cz/api/poptavka/partner-rk-webhook` (dřív atrapa). Selecty mají enum value (`pasport/penb/pasport_penb/projekt/jine`, `rd/bd/komercni/jiny`) shodné s `BodySchema`. Doplněn PSČ + povinná adresa.
- ✅ Herbert chatbot lokálně ověřen (klíč v `.env` platný, model `claude-haiku-4-5`, odpověď on-brand).
- ✅ Webhook ověřen živě: OPTIONS 204 + CORS pro `usporami.cz`, validace povinných polí sedí.

## Co potřebuje Jakub (nemohu sám)

1. **DNS (Wedos)** — viz tabulka níže. Přesměrovat `usporami.cz` z Netlify na server.
2. **Registrace domén** `dotacemi.cz`, `energetikou.cz`, `projektem.cz` (pokud ještě nejsou).
3. **Vypnutí Netlify** (až po ověření, že nový web na serveru jede).
4. **Potvrzení ANTHROPIC_API_KEY** pro chatbot (v `.env` je platný klíč; do Coolify env jako secret).

---

## Architektura na Coolify

5 nových Coolify resources na serveru `usporami` (Floating IP `5.75.210.57`):

| Resource | Typ | FQDN | Zdroj |
|---|---|---|---|
| `web-usporami` | Static | `usporami.cz`, `www.usporami.cz` | adresář `usporami.cz/` |
| `web-dotacemi` | Static | `dotacemi.cz`, `www.dotacemi.cz` | adresář `dotacemi.cz/` |
| `web-energetikou` | Static | `energetikou.cz`, `www.energetikou.cz` | adresář `energetikou.cz/` |
| `web-projektem` | Static | `projektem.cz`, `www.projektem.cz` | adresář `projektem.cz/` |
| `usporami-chatbot` | Node app | `api.usporami.cz` | adresář `chatbot-server/` |

Coolify řeší SSL (Let's Encrypt) automaticky po nasměrování DNS — žádný ruční certbot.

### DNS záznamy (Wedos) — typ A

```
usporami.cz.            A   5.75.210.57
www.usporami.cz.        A   5.75.210.57
dotacemi.cz.            A   5.75.210.57
www.dotacemi.cz.        A   5.75.210.57
energetikou.cz.         A   5.75.210.57
www.energetikou.cz.     A   5.75.210.57
projektem.cz.           A   5.75.210.57
www.projektem.cz.       A   5.75.210.57
api.usporami.cz.        A   5.75.210.57
```

> ⚠️ DNSSEC lag (z run #86): po přidání záznamu validující resolvery vracejí
> ověřené NXDOMAIN ~hodinu (negativní cache SOA 3600 s). Počkat, neopakovat zbytečně.
> `moje.usporami.cz` (usporami-core) zůstává beze změny.

### Chatbot — Coolify env (secret)

```
ANTHROPIC_API_KEY = <klíč z chatbot-server/.env>
PORT = 3001
```

Build/start: `npm install` → `node server.js` (Nixpacks detekuje automaticky; start command `npm start`).
Health check: `GET /api/health` → `{"status":"ok","apiKeySet":true}`.

---

## Postup nasazení (Coolify)

1. **Git repo** — nahrát `web-skupina/` do Git (GitHub privátní, např. `usporami-web`), aby Coolify měl zdroj. (Coolify umí i upload, ale Git = auto-deploy.)
2. Pro každý web vytvořit **Static** resource → directory base = příslušná složka → FQDN dle tabulky.
3. Vytvořit **Node** resource `usporami-chatbot` → base `chatbot-server/` → FQDN `api.usporami.cz` → env nahoře.
4. Jakub přidá DNS A záznamy → Coolify vydá Let's Encrypt certy.
5. **Ověření** (krok 7 originálního README):
   - Otevřít 4 weby + `usporami.cz/partner-rk.html`
   - Na každém webu kliknout na chatbot bublinu → Herbert odpovídá (`api.usporami.cz`)
   - Odeslat testovací poptávku z `partner-rk.html` → ověřit lead v usporami-core (`/admin/leady` nebo pasport zakázka). **Testovací lead pak smazat.**
6. **Cutover Netlify** — až vše funguje na serveru, přepnout `usporami.cz` DNS (pokud běží přes Netlify DNS) a v Netlify zastavit/odpojit doménu. Starý web archivovat.

## Poznámky

- API klíč NIKDY do gitu — `.gitignore` už `.env` + `node_modules/` ignoruje.
- Aktualizace znalostí Herberta: edit `chatbot-server/knowledge-base.md` → redeploy chatbot resource.
- Fonty z Google Fonts CDN, obrázky karet z Unsplash CDN — není třeba hostovat.
- `partner-rk.html` má vlastní inline Herbert (ne externí `chatbot.js`).
- Webhook `partner-rk-webhook` má whitelist Origin: `usporami.cz`, `www.usporami.cz`, `staging.usporami.cz`. Po cutoveru je `usporami.cz` živý z nového serveru — Origin sedí.
