/*
 * Zlegalizujeme — kopie konverzky 86661 (nabidka.usporami.cz/zlegalizujeme)
 * na usporami.cz/zlegalizujeme/. Run #738 (karta B0Q8AP0K2X53Z9KZ).
 *
 * - dotazník čte otázky z data-survey-config (stejné jako na Konverzkách),
 * - po poslední otázce s výběrem odbočka podle kalkulačky zlegalizujeme.cz:
 *   „řešit pravděpodobně nemusíte“ (nabídka nezávazného ověření) /
 *   „doporučujeme řešit“ → kontaktní údaje,
 * - poptávka jde do CRM (/api/poptavka/zlegalizujeme-landing) stejným jádrem
 *   jako webhook Konverzek; UTM z adresy stránky se předávají.
 * - Test: na localhost nebo s ?crm=int jde poptávka na INT a pixel se nenačte.
 * Bez knihoven (Konverzky běží na jQuery + Bootstrap JS, tady stačí pár funkcí).
 */
(function () {
  'use strict';

  var CRM_PROD = 'https://moje.usporami.cz/api/poptavka/zlegalizujeme-landing';
  var CRM_INT = 'https://int.usporami.cz/api/poptavka/zlegalizujeme-landing';
  var TEST = window.ZLEG_TEST === true;
  var ENDPOINT = TEST ? CRM_INT : CRM_PROD;
  var VARIANTA = 'nadpis B';
  var KONTAKT = 'info@zlegalizujeme.cz';

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function pixel() {
    if (TEST || typeof window.fbq !== 'function') return;
    try { window.fbq.apply(null, arguments); } catch (e) { /* měření nesmí rozbít formulář */ }
  }
  function uloz(k, v) { try { sessionStorage.setItem(k, v); } catch (e) { /* soukromé okno */ } }
  function nacti(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }

  // ---------------------------------------------------------------- UTM
  var UTM_KLICE = ['source', 'medium', 'campaign', 'term', 'content'];
  var utm = (function () {
    var q = new URLSearchParams(location.search);
    var out = {}, nejake = false;
    UTM_KLICE.forEach(function (k) {
      var v = (q.get('utm_' + k) || '').trim();
      if (v) { out[k] = v.slice(0, 200); nejake = true; }
    });
    if (nejake) { uloz('zleg_utm', JSON.stringify(out)); return out; }
    try { return JSON.parse(nacti('zleg_utm') || '{}') || {}; } catch (e) { return {}; }
  })();

  // ---------------------------------------------------------------- modal (Bootstrap 4 chování)
  var modal = $('#default-modal');
  var backdrop = null;
  function otevriModal() {
    if (!modal || modal.classList.contains('show')) return;
    modal.style.display = 'block';
    modal.removeAttribute('aria-hidden');
    modal.setAttribute('aria-modal', 'true');
    document.body.classList.add('modal-open');
    backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop fade';
    document.body.appendChild(backdrop);
    void modal.offsetWidth; // reflow kvůli přechodu
    modal.classList.add('show');
    backdrop.classList.add('show');
  }
  function zavriModal() {
    if (!modal || !modal.classList.contains('show')) return;
    modal.classList.remove('show');
    if (backdrop) backdrop.classList.remove('show');
    setTimeout(function () {
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
      modal.removeAttribute('aria-modal');
      document.body.classList.remove('modal-open');
      if (backdrop && backdrop.parentNode) backdrop.parentNode.removeChild(backdrop);
      backdrop = null;
    }, 150);
  }
  document.addEventListener('click', function (e) {
    var spoust = e.target.closest('[data-toggle="modal"]');
    if (spoust) { e.preventDefault(); otevriModal(); return; }
    if (e.target.closest('[data-dismiss="modal"]')) { e.preventDefault(); zavriModal(); return; }
    if (modal && e.target === modal) { zavriModal(); return; }

    // FAQ (accordion)
    var hlava = e.target.closest('[data-toggle="collapse"]');
    if (hlava) {
      e.preventDefault();
      var cil = $(hlava.getAttribute('data-target'));
      if (!cil) return;
      var otevrit = !cil.classList.contains('show');
      var rodic = cil.getAttribute('data-parent');
      if (rodic) {
        $$(rodic + ' .collapse.show').forEach(function (c) {
          c.classList.remove('show');
          var h = $('[data-target="#' + c.id + '"]');
          if (h) { h.classList.add('collapsed'); h.setAttribute('aria-expanded', 'false'); }
        });
      }
      cil.classList.toggle('show', otevrit);
      hlava.classList.toggle('collapsed', !otevrit);
      hlava.setAttribute('aria-expanded', otevrit ? 'true' : 'false');
      return;
    }

    // šipky dolů → kotva
    var kotva = e.target.closest('[data-action="anchor"]');
    if (kotva) {
      var obal = kotva.closest('[anchor-target]');
      var cilKotvy = obal && $('[anchor-link="' + obal.getAttribute('anchor-target') + '"]');
      if (cilKotvy) { e.preventDefault(); cilKotvy.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') zavriModal(); });

  // ---------------------------------------------------------------- zvýraznění slova (rough-notation „circle“)
  $$('.text-effect[text-effect="circle"]').forEach(function (el) {
    var barva = getComputedStyle(el).getPropertyValue('--effectColorPrimary').trim() || '#7dd856';
    el.classList.add('zleg-kruh');
    el.insertAdjacentHTML('beforeend',
      '<svg class="zleg-kruh-svg" viewBox="0 0 200 60" preserveAspectRatio="none" aria-hidden="true">' +
      '<path d="M104 4C150 3 197 12 196 31c-1 19-50 26-98 25C49 55 3 47 4 29 5 12 50 4 108 6c36 1 70 7 84 17" ' +
      'pathLength="1" fill="none" stroke="' + esc(barva) + '" stroke-width="3" stroke-linecap="round"/></svg>');
  });

  // ---------------------------------------------------------------- dotazník
  var komp = $('.survey-component');
  if (!komp) return;
  var cfg = JSON.parse(komp.getAttribute('data-survey-config'));
  var Q = cfg.questions;
  var S = cfg.settings;
  var tlDalsi = $('.button-component.survey-non-last');
  var tlKonec = $('.button-component.survey-last');
  var hp = $('input[name="website"]');

  // Poslední otázka s výběrem (za ní odbočka) a kódy odpovědí podle kalkulačky.
  var POSLEDNI_VOLBA = (function () { var i = -1; Q.forEach(function (q, k) { if (q.type === 'question') i = k; }); return i; })();
  var KODY = {
    0: ['dum', 'chata', 'drobna', 'jine'],      // O jakou stavbu jde?
    1: ['mala', 'velka', 'nevim'],              // Jak je stavba velká?
    2: ['stara', 'stredni', 'nova', 'nevim'],   // Kdy byla stavba postavena?
    4: ['prodej', 'dedictvi', 'urad', 'klid']   // Proč to teď řešíte?
  };

  /*
   * Pravidla kalkulačky zlegalizujeme.cz (calcResult, stav 13. 10. 2026) nad
   * odpověďmi konverzky. Větev „40–60 m²“ kalkulačky konverzka nemá (jen
   * „Je větší“), proto chybí.
   */
  function vyhodnot() {
    var a = { typ: kod(0), velikost: kod(1), stari: kod(2), duvod: kod(4) };
    var jeDrobna = a.typ === 'drobna' || a.velikost === 'mala';
    var v;
    if (jeDrobna && a.velikost !== 'velka') {
      v = {
        kod: 'nemusi', stitek: 'Dobrá zpráva',
        titul: 'Vaše stavba možná povolení vůbec nepotřebuje',
        text: 'Drobné stavby do 40 m² a 5 m výšky jsou podle stavebního zákona za určitých podmínek bez povolení — pak se řeší jen dokumentace a zápis do katastru. Výjimkou jsou dnes garáže, ty novela od roku 2027 mezi drobné stavby přidává. Jestli to platí i pro vás, ověříme při zaměření.'
      };
    } else if (a.stari === 'stara') {
      v = {
        kod: 'resit', stitek: 'Řešitelné',
        titul: 'U starších staveb bývá cesta jednodušší',
        text: 'U staveb z doby před rokem 1990 se často pracuje s pasportem — dokumentací skutečného stavu — a zápisem do katastru, bez plného povolovacího řízení. Přesný postup potvrdíme v hovoru a v cenové nabídce.'
      };
    } else if (a.typ === 'dum' || a.typ === 'chata') {
      v = {
        kod: 'resit', stitek: 'Chce to prohlídku',
        titul: 'Vypadá to na dodatečné povolení',
        text: 'U staveb tohoto typu a stáří obvykle vede cesta přes řízení o dodatečném povolení: zaměření, dokumentace, posudky a jednání s úřadem. Klíčové je, jestli je stavba v souladu s územním plánem — to ověříme jako první.'
      };
    } else {
      v = {
        kod: 'resit', stitek: 'Potřebujeme víc informací',
        titul: 'Váš případ chce individuální pohled',
        text: 'Z odpovědí se nedá jednoznačně určit postup. To není špatná zpráva — jen potřebujeme vidět detaily. První hovor je zdarma a hned v něm vám řekneme, jak to vidíme.'
      };
    }
    v.spech = a.duvod === 'prodej' ? 'Tlačí vás termín prodeje?' : a.duvod === 'urad' ? 'Ozval se úřad?' : null;
    return v;
  }

  var odpovedi = {};      // index otázky → { text, index odpovědi }
  var krok = 0;           // index otázky nebo 'odbocka' / 'konec' / 'odeslani'
  var historie = [];
  var verdikt = null;
  var chceOverit = null;  // u „nemusíte řešit“: true = pokračuje ke kontaktu
  var odbockaZmerena = false;

  function kod(i) {
    var o = odpovedi[i];
    return o && KODY[i] ? KODY[i][o.idx] || null : null;
  }

  function progressHtml(i) {
    var pct = Math.min(100, ((i + 1) / Q.length) * 100);
    return '<div class="progress-wrap pt-2 pb-2"><div><div class="progress" style="height: 20px; border-radius: ' +
      esc(S.progressBorderRadius) + 'px; background-color: ' + esc(S.progressBackgroundColor) + ';">' +
      '<div class="progress-bar" role="progressbar" style="width: ' + pct + '%; background-color: ' + esc(S.progressColor) +
      ';" aria-valuenow="' + Math.round(pct) + '" aria-valuemin="0" aria-valuemax="100"></div></div></div></div>';
  }
  function titulHtml(trida, title, subtitle) {
    return '<div class="' + trida + '">' +
      '<p class="title fs-lg-' + esc(S.questionTitleFontSizeLg) + ' fs-sm-' + esc(S.questionTitleFontSizeSm) +
      '" style="color: ' + esc(S.questionTitleColor) + '; text-align: ' + esc(S.questionTitleAlignment) + ';">' + esc(title) + '</p>' +
      (subtitle ? '<p class="subtitle fs-lg-' + esc(S.questionSubtitleFontSizeLg) + ' fs-sm-' + esc(S.questionSubtitleFontSizeSm) +
        '" style="color: ' + esc(S.questionSubtitleColor) + '; text-align: ' + esc(S.questionSubtitleAlignment) + ';">' + esc(subtitle) + '</p>' : '') +
      '</div>';
  }
  function odpovediHtml(jmeno, moznosti, vybrany) {
    return '<div class="answers fs-lg-' + esc(S.answerFontSizeLg) + ' fs-sm-' + esc(S.answerFontSizeSm) + '" style="color: ' +
      esc(S.answerColor) + '; --color-on-select: ' + esc(S.answerColorOnSelect) + '; --background-color-on-select: ' +
      esc(S.answerBackgroundColorOnSelect) + ';">' +
      moznosti.map(function (t, k) {
        var id = jmeno + '-' + k;
        return '<div class="answer' + (vybrany === k ? ' active' : '') + '" style="padding: 6px 5px 1px;"><label for="' + id + '">' +
          '<input type="radio" name="' + jmeno + '" id="' + id + '" value="' + esc(t) + '" data-idx="' + k + '" autocomplete="off"' +
          (vybrany === k ? ' checked' : '') + '><span class="answer-title">' + esc(t) + '</span></label></div>';
      }).join('') + '</div>';
  }
  function verdiktHtml(v, uvod) {
    return '<div class="zleg-verdikt zleg-verdikt-' + v.kod + '">' +
      '<span class="zleg-verdikt-stitek">' + esc(v.stitek) + '</span>' +
      '<p class="zleg-verdikt-titul">' + esc(uvod) + '</p>' +
      (v.kod === 'resit' ? '<p class="zleg-verdikt-podtitul">' + esc(v.titul) + '</p>' : '') +
      '<p class="zleg-verdikt-text">' + esc(v.text) + '</p>' +
      (v.spech && v.kod === 'resit' ? '<p class="zleg-verdikt-text"><b>' + esc(v.spech) + '</b> Takové případy bereme přednostně.</p>' : '') +
      '<p class="zleg-verdikt-pozn">Výsledek je orientační a nenahrazuje odborné posouzení. Rozhoduje stavební úřad.</p>' +
      '</div>';
  }

  function nastavTlacitka(rezim) {
    // rezim: 'dalsi' | 'konec' | 'zadne'
    if (tlDalsi) tlDalsi.style.display = rezim === 'dalsi' ? '' : 'none';
    if (tlKonec) tlKonec.style.display = rezim === 'konec' ? '' : 'none';
    var zpet = $('.button-component.survey-previous');
    if (zpet) zpet.parentNode.removeChild(zpet);
    if (historie.length && rezim !== 'zadne') {
      var vid = rezim === 'konec' ? tlKonec : tlDalsi;
      if (vid) {
        vid.insertAdjacentHTML('afterend',
          '<div class="button-component fs-sm-12 fs-lg-14 survey-previous" style="text-align: center; margin-top: 10px;">' +
          '<a href="#" data-action="previous-survey" alignment="center" style="color: ' + esc(S.previousQuestionColor) + ';">' +
          esc(S.previousQuestionText) + '</a></div>');
      }
    }
  }

  function vykresli() {
    var html;
    if (krok === 'odbocka') {
      html = '<div class="template-default zleg-odbocka">' + progressHtml(POSLEDNI_VOLBA) +
        verdiktHtml(verdikt, 'Vaši stavbu pravděpodobně řešit nemusíte') +
        titulHtml('question', 'Chcete si to přesto nechat nezávazně ověřit?',
          'Zdarma prověříme, jestli stavba opravdu splňuje podmínky, a poradíme se zápisem do katastru.') +
        odpovediHtml('survey_answer-odbocka', ['Ano, chci to ZDARMA a nezávazně ověřit', 'Ne, děkuji — to mi stačí'],
          chceOverit === true ? 0 : chceOverit === false ? 1 : null) +
        '</div>';
      komp.innerHTML = html;
      nastavTlacitka('dalsi');
      if (!odbockaZmerena) { odbockaZmerena = true; pixel('trackCustom', 'ZlegOdbockaNemusiResit'); }
      return;
    }
    if (krok === 'konec') {
      komp.innerHTML = '<div class="template-default zleg-odbocka">' + progressHtml(Q.length - 1) +
        verdiktHtml(verdikt, 'Vaši stavbu pravděpodobně řešit nemusíte') +
        titulHtml('question', 'Děkujeme za vyplnění dotazníku.',
          'Kdybyste si nebyli jistí nebo se situace změnila, napište nám na ' + KONTAKT + ' — rádi to s vámi projdeme.') +
        '</div>';
      nastavTlacitka('zadne');
      komp.insertAdjacentHTML('beforeend',
        '<div class="button-component fs-sm-12 fs-lg-14 survey-previous" style="text-align: center; margin-top: 10px;">' +
        '<a href="#" data-action="previous-survey" style="color: ' + esc(S.previousQuestionColor) + ';">' + esc(S.previousQuestionText) + '</a></div>');
      return;
    }
    var q = Q[krok];
    if (q.type === 'question') {
      var vyb = odpovedi[krok] ? odpovedi[krok].idx : null;
      html = '<div class="template-default">' + progressHtml(krok) + titulHtml('question', q.title, q.subtitle) +
        odpovediHtml('survey_answer-' + krok, q.answers.map(function (a) { return a.title; }), vyb) + '</div>';
    } else {
      var prvniKontakt = krok === POSLEDNI_VOLBA + 1;
      var hodnota = odpovedi[krok] ? odpovedi[krok].text : (q.inputDefaultValue || '');
      var typ = { email: 'email', phone: 'tel', 'postal-code': 'text' }[q.inputType] || 'text';
      var auto = { fname: 'given-name', lname: 'family-name', email: 'email', phone: 'tel', 'postal-code': 'postal-code', 'address-level2': 'address-level2' }[q.inputType] || 'on';
      var mode = { phone: 'tel', 'postal-code': 'numeric', email: 'email' }[q.inputType];
      html = '<div class="template-default">' + progressHtml(krok) +
        (prvniKontakt && verdikt && verdikt.kod === 'resit' ? verdiktHtml(verdikt, 'Doporučujeme stavbu řešit') : '') +
        (prvniKontakt && verdikt && verdikt.kod === 'nemusi' ? '<p class="zleg-verdikt-mini">Rádi vám to ověříme. Nechte nám prosím kontakt.</p>' : '') +
        titulHtml('input', q.title, q.subtitle) +
        '<div class="input-container"><input type="' + typ + '" input-type="' + esc(q.inputType) + '" name="' + esc(q.inputType) +
        '" placeholder="' + esc(q.placeholder) + '" class="form-control highlight input-w" autocomplete="' + auto + '"' +
        (mode ? ' inputmode="' + mode + '"' : '') + ' value="' + esc(hodnota) + '" maxlength="' + (q.inputType === 'email' ? 255 : 100) + '"></div>' +
        '</div>';
    }
    komp.innerHTML = html;
    nastavTlacitka(krok === Q.length - 1 ? 'konec' : 'dalsi');
    var vstup = $('.input-container input', komp);
    if (vstup && (krok > POSLEDNI_VOLBA + 1 || window.innerWidth >= 768)) { try { vstup.focus({ preventScroll: true }); } catch (e) { vstup.focus(); } }
  }

  function chyba(text) {
    var stara = $('.zleg-chyba', komp);
    if (stara) stara.parentNode.removeChild(stara);
    var cil = $('.answers', komp) || $('.input-container', komp);
    if (cil) cil.insertAdjacentHTML('afterend', '<div class="zleg-chyba" role="alert"><i class="fas fa-exclamation-triangle"></i> ' + esc(text) + '</div>');
    var vstup = $('.input-container input', komp);
    if (vstup) vstup.classList.add('is-invalid');
  }

  function overVstup(q, v) {
    if (q.required && !v) return 'Vyplňte prosím toto pole.';
    if (q.inputType === 'email' && v && !/^\S+@\S+\.\S+$/.test(v)) return 'Zadejte prosím platný e-mail.';
    if (q.inputType === 'phone' && v && v.replace(/\D/g, '').length < 9) return 'Zadejte prosím telefon (aspoň 9 číslic).';
    if (q.inputType === 'postal-code' && v && !/^\d{3}\s?\d{2}$/.test(v)) return 'Zadejte prosím PSČ (5 číslic).';
    return null;
  }

  function dalsi() {
    if (krok === 'odbocka') {
      var o = $('.answers input:checked', komp);
      if (!o) { chyba(S.questionErrorMessage || 'Zvolte jednu z možností'); return; }
      chceOverit = o.getAttribute('data-idx') === '0';
      historie.push(krok);
      krok = chceOverit ? POSLEDNI_VOLBA + 1 : 'konec';
      vykresli();
      posunNahoru();
      return;
    }
    var q = Q[krok];
    if (q.type === 'question') {
      var vybrana = $('.answers input:checked', komp);
      if (!vybrana) { chyba(S.questionErrorMessage || 'Zvolte jednu z možností'); return; }
      odpovedi[krok] = { text: vybrana.value, idx: Number(vybrana.getAttribute('data-idx')) };
    } else {
      var vstup = $('.input-container input', komp);
      var hodnota = (vstup ? vstup.value : '').trim();
      var problem = overVstup(q, hodnota);
      if (problem) { chyba(problem); return; }
      odpovedi[krok] = { text: hodnota, idx: null };
    }
    historie.push(krok);
    if (krok === POSLEDNI_VOLBA) {
      verdikt = vyhodnot();
      krok = verdikt.kod === 'nemusi' ? 'odbocka' : krok + 1;
    } else if (krok === Q.length - 1) {
      odesli();
      return;
    } else {
      krok = krok + 1;
    }
    vykresli();
    posunNahoru();
  }

  function zpet() {
    if (!historie.length) return;
    // u vstupu si zapamatuj rozepsanou hodnotu
    var vstup = $('.input-container input', komp);
    if (vstup && typeof krok === 'number') odpovedi[krok] = { text: vstup.value.trim(), idx: null };
    krok = historie.pop();
    vykresli();
  }

  function posunNahoru() {
    // jako Konverzky (scrollOnTop): začátek otázky zpátky do zorného pole; posouvá se celý modal
    if (!modal || !modal.classList.contains('show')) return;
    var r = komp.getBoundingClientRect();
    if (r.top < 0) modal.scrollTop += r.top - 20;
  }

  komp.addEventListener('click', function (e) {
    var odp = e.target.closest('.answers .answer');
    if (!odp) return;
    if (e.target.tagName.toLowerCase() !== 'input') e.preventDefault();
    $$('.answer', odp.parentNode).forEach(function (x) { x.classList.remove('active'); });
    odp.classList.add('active');
    var r = $('input', odp);
    if (r) r.checked = true;
    var ch = $('.zleg-chyba', komp);
    if (ch) ch.parentNode.removeChild(ch);
  });
  komp.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && e.target.tagName.toLowerCase() === 'input') { e.preventDefault(); dalsi(); }
  });
  komp.addEventListener('input', function (e) {
    if (e.target.classList.contains('is-invalid')) {
      e.target.classList.remove('is-invalid');
      var ch = $('.zleg-chyba', komp);
      if (ch) ch.parentNode.removeChild(ch);
    }
  });
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-action="continue-survey"]')) { e.preventDefault(); if (krok !== 'odeslani') dalsi(); return; }
    if (e.target.closest('[data-action="previous-survey"]')) { e.preventDefault(); if (krok !== 'odeslani') zpet(); }
  });
  var form = $('#zleg-form');
  if (form) form.addEventListener('submit', function (e) { e.preventDefault(); });

  // ---------------------------------------------------------------- odeslání
  function hodnota(typ) {
    for (var i = 0; i < Q.length; i++) if (Q[i].inputType === typ && odpovedi[i]) return odpovedi[i].text;
    return '';
  }

  function telo() {
    var radky = [];
    Q.forEach(function (q, i) { if (odpovedi[i]) radky.push({ otazka: q.title, odpoved: odpovedi[i].text }); });
    return {
      jmeno: hodnota('fname'),
      prijmeni: hodnota('lname'),
      email: hodnota('email'),
      telefon: hodnota('phone'),
      obec: hodnota('address-level2'),
      psc: hodnota('postal-code'),
      odpovedi: radky,
      vysledek: { kod: verdikt && verdikt.kod === 'nemusi' ? 'nemusi_overit' : 'resit', titulek: verdikt ? verdikt.titul : '' },
      utm: utm,
      stranka: location.href,
      varianta: VARIANTA,
      website: hp ? hp.value : ''
    };
  }

  function odesli() {
    krok = 'odeslani';
    nastavTlacitka('zadne');
    komp.innerHTML = '<div class="loading-template"><p class="title fs-lg-' + esc(S.outcomeLoadingTitleFontSizeLg) + ' fs-sm-' +
      esc(S.outcomeLoadingTitleFontSizeSm) + '" style="color: ' + esc(S.outcomeLoadingTitleColor) + '; text-align: ' +
      esc(S.outcomeLoadingTitleAlignment) + ';">' + esc(S.outcomeLoadingTitle) + '</p><p class="subtitle fs-lg-' +
      esc(S.outcomeLoadingSubtitleFontSizeLg) + ' fs-sm-' + esc(S.outcomeLoadingSubtitleFontSizeSm) + '" style="color: ' +
      esc(S.outcomeLoadingSubtitleColor) + '; text-align: ' + esc(S.outcomeLoadingSubtitleAlignment) + ';">' +
      esc(S.outcomeLoadingSubtitle) + '</p><div class="progress" style="height: 20px; border-radius: ' + esc(S.outcomeLoadingProgressBorderRadius) +
      'px;"><div class="progress-bar" role="progressbar" style="width: 0%; background-color: ' + esc(S.outcomeLoadingProgressColor) +
      ';"></div></div></div>';
    var bar = $('.loading-template .progress-bar', komp);
    var pct = 0;
    var animace = setInterval(function () { pct = Math.min(90, pct + 10); if (bar) bar.style.width = pct + '%'; }, 50);

    var data = telo();
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'omit',
      mode: 'cors'
    }).then(function (r) {
      return r.json().catch(function () { return null; }).then(function (j) { return { r: r, j: j }; });
    }).then(function (x) {
      clearInterval(animace);
      if (x.r.ok && x.j && x.j.ok) {
        if (bar) bar.style.width = '100%';
        uloz('zleg_lead', String(Date.now()));
        setTimeout(function () { location.href = 'dekujeme/' + (TEST && !/^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? '?crm=int' : ''); }, 250);
        return;
      }
      selhani(x.r.status === 400 ? 'validace' : 'server');
    }).catch(function () {
      clearInterval(animace);
      selhani('sit');
    });
  }

  function selhani(druh) {
    krok = 'chyba';
    var text = druh === 'validace'
      ? 'Některý údaj se nám nepodařilo přečíst. Zkontrolujte prosím kontaktní údaje.'
      : 'Odeslání se nepovedlo (výpadek spojení). Zkuste to prosím znovu za chvíli.';
    komp.innerHTML = '<div class="template-default">' + titulHtml('question', 'Omlouváme se, dotazník se neodeslal.', text) +
      '<p class="zleg-verdikt-mini">Případně nám napište na <a href="mailto:' + KONTAKT + '">' + KONTAKT + '</a>.</p>' +
      '<div class="zleg-akce"><a href="#" class="btn btn-primary zleg-znovu" data-zleg="' + (druh === 'validace' ? 'opravit' : 'znovu') + '">' +
      (druh === 'validace' ? 'Zkontrolovat údaje' : 'Odeslat znovu') + '</a></div></div>';
  }
  document.addEventListener('click', function (e) {
    var t = e.target.closest('.zleg-znovu');
    if (!t) return;
    e.preventDefault();
    if (t.getAttribute('data-zleg') === 'opravit') {
      // zpět na první kontaktní údaj, historie jako při běžném průchodu
      historie = [];
      for (var i = 0; i <= POSLEDNI_VOLBA; i++) historie.push(i);
      if (verdikt && verdikt.kod === 'nemusi') historie.push('odbocka');
      krok = POSLEDNI_VOLBA + 1;
      vykresli();
    } else odesli();
  });

  vykresli();
})();
