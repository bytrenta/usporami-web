# DEPLOY — Skupina Úsporami
# Připravil: Claude (Cowork session s Ondrou)
# Aktualizace: 4.6.2026

## Obsah balíčku

### 4 weby + 1 partnerská stránka:
- usporami.cz/ — mateřský web (rozcestník skupiny) + partner-rk.html
- dotacemi.cz/ — dotační management (magenta brand)
- energetikou.cz/ — energetické posudky (chartreuse brand)
- projektem.cz/ — projektová dokumentace (cyan brand)

### Herbert AI chatbot:
- chatbot-server/ — Node.js backend s Claude API
- Knowledge base: NZÚ 2026+ pokyny, ceníky, produkty všech firem, pasporty, PENB, audity, otopné soustavy, stavební dozor, ukončení dotací
- Sbírá leady: jméno, telefon, kraj

## Deployment — krok po kroku

### 1. DNS záznamy
Nastavit A recordy pro všechny domény na IP serveru:
- usporami.cz, www.usporami.cz
- dotacemi.cz, www.dotacemi.cz
- energetikou.cz, www.energetikou.cz
- projektem.cz, www.projektem.cz
- api.usporami.cz (pro chatbot API)

### 2. Nahrát soubory
Každou složku (usporami.cz, dotacemi.cz, energetikou.cz, projektem.cz) nahrát do:
/var/www/{domain}/

### 3. DŮLEŽITÉ — změnit API URL v chatbot.js
V KAŽDÉM chatbot.js na VŠECH 5 stránkách (4 weby + partner-rk.html) změnit:
  const API_URL = 'http://localhost:3001/api/chat';
na:
  const API_URL = 'https://api.usporami.cz/api/chat';

### 4. Chatbot server
cd /var/www/chatbot-server
npm install

Vytvořit .env soubor:
  ANTHROPIC_API_KEY=sk-ant-api03-XXXXX (Ondra dodá klíč)
  PORT=3001

Spustit přes PM2:
  npm install -g pm2
  pm2 start server.js --name usporami-chatbot
  pm2 save
  pm2 startup

### 5. Nginx konfigurace

Pro KAŽDOU doménu (usporami.cz, dotacemi.cz, energetikou.cz, projektem.cz):

```nginx
server {
    listen 80;
    server_name {domain} www.{domain};
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name {domain} www.{domain};
    root /var/www/{domain};
    index index.html;

    ssl_certificate /etc/letsencrypt/live/{domain}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/{domain}/privkey.pem;

    location / {
        try_files $uri $uri/ =404;
    }

    # Cache static assets
    location ~* \.(css|js|png|jpg|jpeg|gif|svg|mp4|woff2)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Gzip
    gzip on;
    gzip_types text/css application/javascript text/html application/json;
}
```

Pro chatbot API:
```nginx
server {
    listen 443 ssl http2;
    server_name api.usporami.cz;

    ssl_certificate /etc/letsencrypt/live/api.usporami.cz/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.usporami.cz/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # CORS
        add_header Access-Control-Allow-Origin "*" always;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS" always;
        add_header Access-Control-Allow-Headers "Content-Type" always;
        if ($request_method = OPTIONS) { return 204; }
    }
}
```

### 6. SSL certifikáty
certbot --nginx -d usporami.cz -d www.usporami.cz
certbot --nginx -d dotacemi.cz -d www.dotacemi.cz
certbot --nginx -d energetikou.cz -d www.energetikou.cz
certbot --nginx -d projektem.cz -d www.projektem.cz
certbot --nginx -d api.usporami.cz

### 7. Ověření
- Otevřít všechny 4 weby v prohlížeči
- Otevřít usporami.cz/partner-rk.html
- Kliknout na chatbot bublinu na každém webu — Herbert musí odpovídat
- Ověřit že loga se zobrazují
- Ověřit mobilní zobrazení

## Poznámky
- API klíč NIKDY do gitu — je v .env
- Knowledge base: chatbot-server/knowledge-base.md — editovat a restartovat pro aktualizaci znalostí
- Herbert na partner-rk.html má vlastní chatbot inline v HTML (ne external chatbot.js)
- Fonty Google Fonts se načítají z CDN, není třeba je hostovat
- Obrázky (hero, karty) se načítají z Unsplash CDN
