require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

const API_KEY = process.env.ANTHROPIC_API_KEY;
const knowledgeBase = fs.readFileSync(path.join(__dirname, 'knowledge-base.md'), 'utf-8');

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
  return data.content[0].text;
}

app.post('/api/chat', async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message || !sessionId) {
      return res.status(400).json({ error: 'Missing message or sessionId' });
    }

    if (!conversations.has(sessionId)) {
      conversations.set(sessionId, { messages: [], lastAccess: Date.now() });
    }
    const conv = conversations.get(sessionId);
    conv.lastAccess = Date.now();
    conv.messages.push({ role: 'user', content: message });

    const recentMessages = conv.messages.slice(-20);
    const reply = await callClaude(recentMessages);
    conv.messages.push({ role: 'assistant', content: reply });

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
  res.json({ status: 'ok', sessions: conversations.size, apiKeySet: !!API_KEY });
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
