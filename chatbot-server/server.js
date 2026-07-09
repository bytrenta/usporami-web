require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();

// 2026-07-09 (Jakub — incident: neomezené CORS + žádná auth = otevřený proxy
// na Claude API, zneužitý zvenku, abnormální spotřeba kreditu). Fix:
//   1. CORS jen na naše vlastní domény (ne '*')
//   2. Per-IP rate limit (sliding window)
//   3. Denní token cap napříč celým serverem (kill switch při zneužití)
//   4. Limit délky zprávy (brání "burn tokens" jedním obřím promptem)
// Server běží za Coolify/Traefik reverse proxy — potřebujeme trust proxy,
// jinak req.ip vrací vždy IP proxy, ne klienta, a rate limit by byl k ničemu.
app.set('trust proxy', 1);

const ALLOWED_ORIGINS = [
  'https://usporami.cz',
  'https://www.usporami.cz',
  'https://dotacemi.cz',
  'https://www.dotacemi.cz',
  'https://energetikou.cz',
  'https://www.energetikou.cz',
  'https://projektem.cz',
  'https://www.projektem.cz',
];

app.use(
  cors({
    origin(origin, callback) {
      // Requesty bez Origin hlavičky (curl, health-check, server-to-server)
      // necháváme projít — nejsou to weboví útočníci z prohlížeče. Skutečnou
      // ochranu proti scriptům dělá rate limit + denní cap níž.
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      return callback(new Error('CORS: origin not allowed'));
    },
  }),
);
app.use(express.json({ limit: '20kb' }));

const API_KEY = process.env.ANTHROPIC_API_KEY;
const knowledgeBase = fs.readFileSync(path.join(__dirname, 'knowledge-base.md'), 'utf-8');

// ---------------------------------------------------------------------------
// Rate limiting — per IP, sliding window
// ---------------------------------------------------------------------------
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 min
const RATE_LIMIT_MAX_REQUESTS = 20; // běžný návštěvník napíše max pár zpráv
const ipHits = new Map(); // ip -> [timestamps]

function isRateLimited(ip) {
  const now = Date.now();
  const hits = (ipHits.get(ip) || []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  hits.push(now);
  ipHits.set(ip, hits);
  return hits.length > RATE_LIMIT_MAX_REQUESTS;
}

// ---------------------------------------------------------------------------
// Denní token cap — kill switch. Pokud i přes rate limit někdo pojede přes
// hodně IP adres (botnet), tenhle limit zastaví další volání Anthropic API
// úplně, dokud se nepřehoupne den. Práh nastaven výrazně nad běžný provoz
// (odhad: desítky konverzací/den × pár set tokenů). Uprav přes env
// CHATBOT_DAILY_TOKEN_CAP, pokud je potřeba.
// ---------------------------------------------------------------------------
const DAILY_TOKEN_CAP = Number(process.env.CHATBOT_DAILY_TOKEN_CAP) || 1_000_000;
let dailyUsage = { date: new Date().toISOString().slice(0, 10), tokens: 0 };

function checkAndTrackDailyUsage(tokens) {
  const today = new Date().toISOString().slice(0, 10);
  if (dailyUsage.date !== today) {
    dailyUsage = { date: today, tokens: 0 };
  }
  if (dailyUsage.tokens >= DAILY_TOKEN_CAP) return false;
  dailyUsage.tokens += tokens;
  return true;
}

const MAX_MESSAGE_LENGTH = 1500;

const SYSTEM_PROMPT = `Jsi přátelský a profesionální online poradce skupiny Úsporami. Pomáháš zákazníkům zorientovat se v dotačních programech NZÚ 2026+, energetických službách a projektové dokumentaci.

TVOJE IDENTITA:
- Představuješ se jako "online poradce skupiny Úsporami"
- NIKDY neříkej že jsi AI, robot nebo chatbot
- Mluv jako zkušený poradce který zná problematiku do detailu

STYL KOMUNIKACE — PŘÍSNÁ PRAVIDLA:
- MAXIMÁLNĚ 3-4 řádky textu na jednu odpověď. Nikdy víc!
- Po každé odpovědi VŽDY polož upřesňující otázku nebo nabídni možnosti
- NIKDY nevypisuj celý ceník nebo všechny informace najednou
- Odpovídej jako v konverzaci — krátce, jasně, jedna informace po druhé
- Používej **tučné** jen pro klíčové číslo nebo pojem (max 1-2 na zprávu)
- Emoji max 1 na zprávu, ideálně na začátku
- Formátuj odpovědi čistě — žádné dlouhé seznamy s pomlčkami

KONVERZAČNÍ VZOR (dodržuj vždy):
1. Klient klikne na téma → Herbert odpoví 1-2 větami co to je a ZEPTÁ SE co přesně zajímá
2. Klient upřesní → Herbert odpoví stručně na konkrétní dotaz (max 3 řádky)
3. Herbert se zeptá: "Pomohlo ti to? Chceš vědět víc, nebo řešíš něco jiného?"

PŘÍKLAD SPRÁVNÉ KONVERZACE:
Klient: "Bezúročný úvěr NZÚ"
Herbert: "💰 Bezúročný úvěr NZÚ 2026+ — stát za vás uhradí veškeré úroky. Co tě zajímá nejvíc?
• Kolik si můžu půjčit?
• Jaké jsou podmínky?
• Co všechno můžu renovovat?
• Chci rovnou nechat kontakt"

Klient: "Kolik si můžu půjčit?"
Herbert: "U rodinného domu až **2 000 000 Kč** na komplexní renovaci, nebo **750 000 Kč** na dílčí. Vlastníš rodinný dům nebo bytovku?"

PŘÍKLAD SPRÁVNÉ KONVERZACE PRO PASPORT:
Klient: "Pasport stavby"
Herbert: "📐 Pasport stavby — dokumentace skutečného stavu budovy. Co tě zajímá?
• Kolik to stojí?
• Co pasport obsahuje?
• Kdy ho potřebuji?
• Chci rovnou poptat"

Klient: "Kolik to stojí?"
Herbert: "Záleží na velikosti domu. Jaká je podlahová plocha tvé nemovitosti v m²? (všechna patra dohromady)"

Klient: "200 m2"
Herbert: "Pro RD 126–250 m² je orientační cena **20 990 Kč bez DPH**. Zahrnuje zaměření na místě + kompletní výkresy s razítkem. Chceš poptat konkrétní termín?"

PŘÍKLAD PRO PENB:
Klient: "PENB"
Herbert: "📋 Průkaz energetické náročnosti budov. Co řešíš?
• Prodávám nemovitost
• Pronajímám
• Rekonstruuji
• Potřebuji to pro dotaci
• Chci znát cenu"

FORMÁTOVÁNÍ MOŽNOSTÍ:
Když nabízíš možnosti (odrážky s •), VŽDY dej každou na NOVÝ ŘÁDEK. Použij znak nového řádku.
Správně:
"Co tě zajímá?
• Kolik si můžu půjčit?
• Jaké jsou podmínky?
• Chci nechat kontakt"

Špatně:
"Co tě zajímá? • Kolik si půjčit? • Jaké podmínky? • Kontakt"

ZAKÁZÁNO:
- Vypisovat celý ceník najednou
- Psát víc než 5 řádků
- Dávat víc než 4 odrážky
- Opakovat informace které už padly
- Psát "orientační cena bez DPH, přesnou kalkulaci připravíme na míru" — místo toho prostě napiš cenu a dodej "bez DPH"

KRITICKÉ PRAVIDLO — NABÍDKA KONTAKTU:
Pokud si nejsi 100% jistý, nebo je situace složitější, VŽDY nabídni:
"Pro přesnou odpověď vás rád spojím s naším specialistou. Stačí mi říct vaše jméno a telefon — poradce se vám ozve v nejbližší pracovní den."

SBĚR KONTAKTU:
1. Zeptej se na jméno
2. Zeptej se na telefonní číslo
3. Zeptej se na kraj (ve kterém kraji se nemovitost nachází)
4. Potvrď: "Děkuji! Poradce pro váš kraj se vám ozve na číslo [telefon] v nejbližší pracovní den."

ZNALOSTNÍ BÁZE:
${knowledgeBase}`;

const conversations = new Map();

// Try multiple model names
const MODELS = [
  'claude-haiku-4-5-20251001',
  'claude-sonnet-4-6',
  'claude-opus-4-6',
];

async function callClaude(messages, modelIndex = 0) {
  if (modelIndex >= MODELS.length) {
    throw new Error('No working model found');
  }
  
  const model = MODELS[modelIndex];
  console.log('Trying model:', model);
  
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model,
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: messages,
    }),
  });

  const data = await response.json();

  if (data.error) {
    console.log('Model', model, 'failed:', data.error.type, data.error.message);
    if (data.error.type === 'not_found_error' && modelIndex < MODELS.length - 1) {
      return callClaude(messages, modelIndex + 1);
    }
    throw new Error(data.error.message);
  }

  console.log('Success with model:', model);
  const usageTokens = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);
  return { text: data.content[0].text, usageTokens };
}

app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message || !sessionId) {
      return res.status(400).json({ error: 'Missing message or sessionId' });
    }
    if (typeof message !== 'string' || message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: 'Message too long' });
    }

    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    if (isRateLimited(clientIp)) {
      console.warn('[rate-limit] blocked IP:', clientIp);
      return res.status(429).json({
        reply: 'Momentálně zpracovávám hodně dotazů. Zkuste to prosím za chvíli, nebo zavolejte na **+420 777 222 199**.',
      });
    }
    if (dailyUsage.tokens >= DAILY_TOKEN_CAP) {
      console.error('[daily-cap] EXCEEDED — chat disabled until midnight. tokens:', dailyUsage.tokens);
      return res.status(503).json({
        reply: 'Omlouvám se, momentálně jsem nedostupný. Zavolejte nám prosím na **+420 777 222 199** — rádi vám poradíme osobně.',
      });
    }

    if (!conversations.has(sessionId)) {
      conversations.set(sessionId, { messages: [], lastAccess: Date.now() });
    }
    const conv = conversations.get(sessionId);
    conv.lastAccess = Date.now();
    conv.messages.push({ role: 'user', content: message });

    const recentMessages = conv.messages.slice(-20);
    const { text: reply, usageTokens } = await callClaude(recentMessages);
    conv.messages.push({ role: 'assistant', content: reply });
    checkAndTrackDailyUsage(usageTokens);

    // Cleanup old sessions
    const now = Date.now();
    for (const [key, val] of conversations) {
      if (now - val.lastAccess > 3600000) conversations.delete(key);
    }

    res.json({ reply });
  } catch (error) {
    console.error('Chat error:', error.message);
    res.status(500).json({
      reply: 'Omlouvám se, momentálně mám technické potíže. Zavolejte nám prosím na **+420 777 222 199** — rádi vám poradíme osobně.'
    });
  }
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    sessions: conversations.size,
    apiKeySet: !!API_KEY,
    dailyUsage: { date: dailyUsage.date, tokens: dailyUsage.tokens, cap: DAILY_TOKEN_CAP },
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log('');
  console.log('  Úsporami Chatbot API');
  console.log('  http://localhost:' + PORT);
  console.log('  API key:', API_KEY ? API_KEY.substring(0,15) + '...' : 'MISSING!');
  console.log('  Will try models:', MODELS.join(', '));
  console.log('');
});
