"""Run #738 — sestaví statickou kopii konverzky Zlegalizujeme (nabidka.usporami.cz/zlegalizujeme,
projekt Konverzek 86661) do usporami.cz/zlegalizujeme/ s odbočkou podle kalkulačky zlegalizujeme.cz.

Kdy: když Petr změní texty / obrázky na Konverzkách a kopie má zůstat 1:1.
Postup (z kořene repa webů, stažené soubory do NOVÉ prázdné složky mimo repo, nic z nich nespouštět):
  1. stáhnout originál:  K=/tmp/konv_src; mkdir -p $K/css $K/img $K/fonts
     curl -sSL -o $K/index.html https://nabidka.usporami.cz/zlegalizujeme/
     curl -sSL -o $K/dekujeme.html https://nabidka.usporami.cz/zlegalizujeme/dekujeme
     CSS (3675…, themes…, frontend…, frontend-survey… z app-assets.konverzkyapp.cz/build/ podle <link>
     v index.html — při změně hashů upravit seznam v postav_css), obrázky z assets.konverzkyapp.cz → $K/img
     (nové obrázky doplnit do IMG / ROZMERY), fonty z app-assets…/build/fonts → $K/fonts
  2. obrázky:  uv run --with pillow python -I nastroje/zlegalizujeme-kopie/img.py $K/img <build>/out_img
     fonty:     pyftsubset (fonttools + brotli) → <build>/out_fonts/*.woff2 (Latin + Latin Extended)
  3. sestavení: python3 -I nastroje/zlegalizujeme-kopie/build.py $K usporami.cz/zlegalizujeme <build>
     (<build> = složka s src/zleg.js, src/zleg-doplnky.css, out_img/, out_fonts/)
Zdroj pravdy pro logiku dotazníku je src/zleg.js (do webu se kopíruje beze změny).
Popis: usporami-core/docs/zameruvaci-platforma/12_ZLEGALIZUJEME_VYROBNI_LINKA.md § 22.
"""
import html as html_mod
import os
import re
import shutil
import sys

SRC, OUT, BUILD = sys.argv[1], sys.argv[2], sys.argv[3]
BASE = "/zlegalizujeme/"
VER = "738"

IMG = {
    "3Hr8x6VqHAAL0iQSn5yLh0DldqwCiYixlFwMLJf0SAk-1786691914.png": "uvod-pozadi.jpg",
    "6EuFpvLzqhe_zAIHNBWBJ-y_YbA-utzQdnwxM38SrfA-1786693184.png": "uvod-pozadi-mobil.jpg",
    "J5x_Sn_RYZlwU6zYZlX1YHJQb6BBiRUvBNLGjIaFLEE-1770376160.png": "garaz-dopis.jpg",
    "frg94WQiW0ltQNyq6--TRNivpkGCxuAJSNy5LmV-O50-1786695099.png": "skener.jpg",
    "iHEQ3kXySkrpLeu1-n0I2PIF3DuydJ3cEfIxQXLp6jw-1786695131.png": "stavba.jpg",
    "ARH3uLwTlry9spzsuCmW8BQBC8HE8bQSAPne-4igkDI-1786698781.png": "dekujeme.jpg",
    "6NlBEqKPDFdaNXYXsmIl39lW_YgfEr3dtFObVsR5dLw-1786614439.png": "sipka-dolu.png",
    "UDmzz6QdUrrOMULDAy-nH8ebHj1uqlSlwOzFIn63XY4-1786613617.svg": "logo-zlegalizujeme.svg",
    "obGYk50nZl4T8epuzT2iMtFKKH7l5gczuCAbrPYT-OU-1786699192.png": "favicon.png",
}

PIXEL_ID = "1562542205610569"

ROZMERY = {
    "garaz-dopis.jpg": (1080, 1350),
    "skener.jpg": (1080, 1350),
    "stavba.jpg": (1080, 1194),
    "dekujeme.jpg": (700, 700),
    "sipka-dolu.png": (250, 250),
    "logo-zlegalizujeme.svg": (130, 130),
}


def head(title, description, og_url, extra_script=""):
    return f"""<!DOCTYPE html>
<html lang="cs-CZ">
<head>
    <meta charset="UTF-8">
    <title>{title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
    <meta name="description" content="{description}">
    <meta name="robots" content="index">
    <meta property="og:url" content="{og_url}">
    <link rel="icon" type="image/png" href="{BASE}img/favicon.png">
    <link rel="stylesheet" href="{BASE}zleg.css?v={VER}">
    <!-- Kopie konverzky Zlegalizujeme (nabidka.usporami.cz/zlegalizujeme) — run #738.
         Test: na localhost nebo s ?crm=int jde poptávka na INT a Meta pixel se nenačte. -->
    <script>
        window.ZLEG_TEST = /^(localhost|127\\.0\\.0\\.1)$/.test(location.hostname) || /[?&]crm=int(&|$)/.test(location.search);
    </script>
    <!-- Meta Pixel (stejné ID jako na Konverzkách) -->
    <script>
        if (!window.ZLEG_TEST) {{
            !function (f, b, e, v, n, t, s) {{
                if (f.fbq) return;
                n = f.fbq = function () {{
                    n.callMethod ?
                        n.callMethod.apply(n, arguments) : n.queue.push(arguments)
                }};
                if (!f._fbq) f._fbq = n;
                n.push = n;
                n.loaded = !0;
                n.version = '2.0';
                n.queue = [];
                t = b.createElement(e);
                t.async = !0;
                t.src = v;
                s = b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t, s)
            }}(window, document, 'script',
                'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '{PIXEL_ID}');
            fbq('track', 'PageView');{extra_script}
        }}
    </script>
    <!-- End Meta Pixel -->
</head>
"""


def vycisti_body(h):
    b = h[h.find("<body"): h.rfind("</body>")]
    b = re.sub(r"<body[^>]*>", '<body style="--sticky-top-height: 0px;">', b, count=1, flags=re.S)
    b = re.sub(r"<script\b.*?</script>", "", b, flags=re.S)
    b = re.sub(r"<template\b.*?</template>", "", b, flags=re.S)
    b = re.sub(r'<input type="hidden" name="spri"[^>]*>', "", b)
    b = re.sub(r'<input type="hidden" name="identification"[^>]*>\s*<spamprotector[^>]*></spamprotector>', "", b)
    b = re.sub(r'<input type="hidden" name="survey-results">', "", b)
    # Embed komponenty (Konverzky je vkládají JS z atributu embed-content) — vložit rovnou do HTML.
    def embed(m):
        obsah = html_mod.unescape(m.group(2))
        assert "<script" not in obsah.lower()
        return m.group(1) + m.group(3) + ">" + obsah + "</div>"
    b, pocet = re.subn(r"(<div class=\"embed-component[^\"]*\"[^>]*?)\s*embed-content='([^']*)'([^>]*)></div>", embed, b)
    print("embed komponent:", pocet)
    for orig, nove in IMG.items():
        b = re.sub(r"https://assets\.konverzkyapp\.cz/data/projects/\d+/minified/" + re.escape(orig), BASE + "img/" + nove, b)
    assert "konverzkyapp" not in b, re.findall(r".{80}konverzkyapp.{80}", b)[:3]
    # rozměry obrázků → prohlížeč drží místo, než se líně načtou (bez skákání stránky)
    for nove, (w, hgt) in ROZMERY.items():
        b = b.replace(f'src="{BASE}img/{nove}"', f'src="{BASE}img/{nove}" width="{w}" height="{hgt}"')
    b = re.sub(r"\n[ \t]*\n(\s*\n)+", "\n\n", b)
    return b


def odstran_div(b, zacatek):
    """Odstraní element <div …> začínající `zacatek` včetně vnořených divů."""
    i = b.find(zacatek)
    if i < 0:
        return b
    hloubka, j = 0, i
    for m in re.finditer(r"<div\b|</div>", b[i:]):
        hloubka += 1 if m.group(0) == "<div" else -1
        if hloubka == 0:
            j = i + m.end()
            break
    return b[:i] + b[j:]


def postav_index():
    h = open(os.path.join(SRC, "index.html"), encoding="utf-8").read()
    b = vycisti_body(h)
    form_open = '<form method="post" enctype="multipart/form-data">'
    assert b.count(form_open) == 1
    b = b.replace(
        form_open,
        '<form id="zleg-form" method="post" action="#" novalidate>\n'
        '    <div class="zleg-hp" aria-hidden="true"><label>Web <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>',
    )
    # ukázka první otázky zůstává (bez JS je vidět), zleg.js ji hned překreslí
    b = b.rstrip() + f'\n<script src="{BASE}zleg.js?v={VER}" defer></script>\n</body>\n</html>\n'
    desc = re.search(r'<meta name="description" content="([^"]*)"', h).group(1)
    title = re.search(r"<title>(.*?)</title>", h).group(1)
    return head(title, desc, "https://usporami.cz/zlegalizujeme/") + b


def postav_dekujeme():
    h = open(os.path.join(SRC, "dekujeme.html"), encoding="utf-8").read()
    b = vycisti_body(h)
    # prázdný modal a obalový <form> na děkovné stránce nejsou potřeba
    b = b.replace('<form method="post" enctype="multipart/form-data">', "", 1)
    b = odstran_div(b, '<div class="modal fade v2"')
    b = b.replace("</form>", "")
    assert "default-modal" not in b, "modal zůstal"
    b = b.rstrip() + "\n</body>\n</html>\n"
    title = re.search(r"<title>(.*?)</title>", h).group(1)
    desc_m = re.search(r'<meta name="description" content="([^"]*)"', h)
    desc = desc_m.group(1) if desc_m else ""
    # Lead jen po skutečném odeslání (příznak z zleg.js), ne při obnovení stránky.
    lead = """
            try {
                if (sessionStorage.getItem('zleg_lead')) {
                    sessionStorage.removeItem('zleg_lead');
                    fbq('track', 'Lead');
                }
            } catch (e) {}"""
    html = head(title, desc, "https://usporami.cz/zlegalizujeme/dekujeme/", lead) + b
    return html.replace('<meta name="robots" content="index">', '<meta name="robots" content="noindex">')


# ----------------------------------------------------------------------------- CSS purge
def parse(css, i=0):
    nodes = []
    n = len(css)
    while i < n:
        if css.startswith("/*", i):
            j = css.find("*/", i + 2)
            i = n if j < 0 else j + 2
            continue
        c = css[i]
        if c.isspace():
            i += 1
            continue
        if c == "}":
            return nodes, i + 1
        j, depth, inq = i, 0, None
        while j < n:
            ch = css[j]
            if inq:
                if ch == "\\":
                    j += 2
                    continue
                if ch == inq:
                    inq = None
            elif ch in "\"'":
                inq = ch
            elif ch == "(":
                depth += 1
            elif ch == ")":
                depth -= 1
            elif ch in "{;" and depth == 0:
                break
            j += 1
        prelude = css[i:j].strip()
        if j >= n:
            break
        if css[j] == ";":
            nodes.append(("stmt", prelude))
            i = j + 1
            continue
        if re.match(r"@(media|supports|document|layer|container)\b", prelude):
            children, i = parse(css, j + 1)
            nodes.append(("group", prelude, children))
            continue
        k, depth, inq = j + 1, 1, None
        while k < n:
            ch = css[k]
            if inq:
                if ch == "\\":
                    k += 2
                    continue
                if ch == inq:
                    inq = None
            elif ch in "\"'":
                inq = ch
            elif ch == "{":
                depth += 1
            elif ch == "}":
                depth -= 1
                if depth == 0:
                    break
            k += 1
        nodes.append(("rule", prelude, css[j + 1: k]))
        i = k + 1
    return nodes, i


def split_selectors(prelude):
    out, depth, cur = [], 0, ""
    for ch in prelude:
        if ch in "([":
            depth += 1
        elif ch in ")]":
            depth -= 1
        if ch == "," and depth == 0:
            out.append(cur)
            cur = ""
        else:
            cur += ch
    out.append(cur)
    return [s.strip() for s in out if s.strip()]


def make_keep(classes, ids, tags, attrs):
    def keep_sel(sel):
        s = re.sub(r":(not|has|is|where)\((?:[^()]|\([^()]*\))*\)", "", sel)
        s = re.sub(r"::?[a-zA-Z-]+(\((?:[^()]|\([^()]*\))*\))?", "", s)
        for a in re.findall(r"\[\s*([a-zA-Z_][\w:-]*)", s):
            if a.lower() not in attrs:
                return False
        s = re.sub(r"\[[^\]]*\]", "", s)
        for c in re.findall(r"\.((?:\\.|[\w-])+)", s):
            if c.replace("\\", "") not in classes:
                return False
        for i_ in re.findall(r"#((?:\\.|[\w-])+)", s):
            if i_ not in ids:
                return False
        for comp in re.split(r"[\s>+~]+", s):
            m = re.match(r"^([a-zA-Z][\w-]*)", comp)
            if m and m.group(1).lower() not in tags:
                return False
        return True

    return keep_sel


FONTY = {
    ("crimson text", "normal", "400"): "CrimsonText-Regular",
    ("crimson text", "italic", "400"): "CrimsonText-Italic",
    ("crimson text", "normal", "700"): "CrimsonText-Bold",
    ("crimson text", "italic", "700"): "CrimsonText-BoldItalic",
    ("inter", "normal", "400"): "Inter-Regular",
    ("inter", "normal", "500"): "Inter-Medium",
    ("inter", "normal", "700"): "Inter-Bold",
    ("open sans", "normal", "400"): "OpenSans-Regular",
    ("open sans", "normal", "500"): "OpenSans-SemiBold",
    ("open sans", "normal", "700"): "OpenSans-Bold",
    ("font awesome 5 free", "normal", "900"): "fa-solid-900",
}


def font_face(body):
    def prop(k):
        m = re.search(r"(?:^|;)\s*" + k + r"\s*:\s*([^;]+)", body)
        return m.group(1).strip() if m else ""

    fam = prop("font-family").replace("\\", "").strip("\"' ").lower()
    key = (fam, prop("font-style") or "normal", prop("font-weight") or "400")
    soubor = FONTY.get(key)
    if not soubor:
        return None
    fam_out = prop("font-family")
    return (f"@font-face{{font-display:{'block' if 'awesome' in fam else 'swap'};font-family:{fam_out};"
            f"font-style:{key[1]};font-weight:{key[2]};src:url({BASE}fonts/{soubor}.woff2) format(\"woff2\")}}")


def purge(nodes, keep_sel, used_fonts):
    out = []
    for nd in nodes:
        if nd[0] == "stmt":
            continue
        if nd[0] == "group":
            ch = purge(nd[2], keep_sel, used_fonts)
            if ch:
                out.append(("group", nd[1], ch))
            continue
        prelude, body = nd[1], nd[2]
        if prelude.startswith("@font-face"):
            ff = font_face(body)
            if ff and ff not in used_fonts:
                used_fonts.add(ff)
                out.append(("raw", ff))
            continue
        if prelude.startswith("@keyframes") or prelude.startswith("@-webkit-keyframes"):
            out.append(("kf", prelude, body))
            continue
        if prelude.startswith("@"):
            continue
        sels = [s for s in split_selectors(prelude) if keep_sel(s)]
        if sels:
            out.append(("rule", ",".join(sels), body))
    return out


def serialize(nodes):
    parts = []
    for nd in nodes:
        if nd[0] == "raw":
            parts.append(nd[1])
        elif nd[0] == "group":
            parts.append(nd[1] + "{" + serialize(nd[2]) + "}")
        else:
            parts.append(nd[1] + "{" + nd[2] + "}")
    return "".join(parts)


def drop_unused_keyframes(nodes, text):
    out = []
    for nd in nodes:
        if nd[0] == "kf":
            name = nd[1].split(None, 1)[1].strip() if len(nd[1].split(None, 1)) > 1 else ""
            if name and re.search(r"animation[^;{}]*\b" + re.escape(name) + r"\b", text):
                out.append(("rule", nd[1], nd[2]))
        elif nd[0] == "group":
            ch = drop_unused_keyframes(nd[2], text)
            if ch:
                out.append(("group", nd[1], ch))
        else:
            out.append(nd)
    return out


def postav_css(html_texts, js_text):
    alltext = "\n".join(html_texts)
    classes, ids, attrs = set(), set(), set()
    for m in re.finditer(r'\sclass="([^"]*)"', alltext):
        classes.update(m.group(1).split())
    ids.update(re.findall(r'\sid="([^"]+)"', alltext))
    attrs.update(a.lower() for a in re.findall(r'\s([a-zA-Z_][\w:.-]*)=["\']', alltext))
    tags = set(t.lower() for t in re.findall(r"<([a-zA-Z][\w-]*)", alltext))
    # vše, co může přidat zleg.js (slova v řetězcích)
    js_words = set(re.findall(r"[a-zA-Z_][\w-]*", js_text))
    classes |= js_words
    ids |= js_words
    attrs |= {w.lower() for w in js_words}
    tags |= {t.lower() for t in re.findall(r"<([a-zA-Z][\w-]*)", js_text)}
    tags |= {"html", "body", "svg", "path", "input", "label", "a", "p", "b", "div", "span", "i", "strong", "u", "font", "br"}
    keep_sel = make_keep(classes, ids, tags, attrs)

    css_all = ""
    for f in ["3675.064e0cdc.css", "themes.458104cc.css", "frontend.67b1502d.css", "frontend-survey.64692184.css"]:
        css_all += open(os.path.join(SRC, "css", f), encoding="utf-8").read() + "\n"
    nodes, _ = parse(css_all)
    used_fonts = set()
    kept = purge(nodes, keep_sel, used_fonts)
    text = serialize([n for n in kept if n[0] != "kf"])
    kept = drop_unused_keyframes(kept, text)
    # fonty nahoru
    fonts = [n for n in kept if n[0] == "raw"]
    rest = [n for n in kept if n[0] != "raw"]
    out = ("/* Kopie stylů konverzky Zlegalizujeme (Konverzky, Bootstrap 4, Font Awesome Free 5 — CC BY 4.0 / OFL / MIT),\n"
           "   jen pravidla, která stránka používá. Run #738. */\n" + serialize(fonts) + serialize(rest))
    out += open(os.path.join(BUILD, "src", "zleg-doplnky.css"), encoding="utf-8").read()
    return out, len(css_all)


def main():
    index = postav_index()
    dekujeme = postav_dekujeme()
    js = open(os.path.join(BUILD, "src", "zleg.js"), encoding="utf-8").read()
    css, puvodni = postav_css([index, dekujeme], js)

    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(os.path.join(OUT, "dekujeme"))
    open(os.path.join(OUT, "index.html"), "w", encoding="utf-8").write(index)
    open(os.path.join(OUT, "dekujeme", "index.html"), "w", encoding="utf-8").write(dekujeme)
    open(os.path.join(OUT, "zleg.js"), "w", encoding="utf-8").write(js)
    open(os.path.join(OUT, "zleg.css"), "w", encoding="utf-8").write(css)
    shutil.copytree(os.path.join(BUILD, "out_fonts"), os.path.join(OUT, "fonts"))
    os.makedirs(os.path.join(OUT, "img"))
    for f in os.listdir(os.path.join(BUILD, "out_img")):
        shutil.copy(os.path.join(BUILD, "out_img", f), os.path.join(OUT, "img", f))
    for orig, nove in IMG.items():
        if nove.endswith((".png", ".svg")):
            shutil.copy(os.path.join(SRC, "img", orig), os.path.join(OUT, "img", nove))
    print("css", puvodni, "->", len(css))
    for root, _, files in os.walk(OUT):
        for f in sorted(files):
            p = os.path.join(root, f)
            print(os.path.relpath(p, OUT), os.path.getsize(p))


main()
