# Comprueba enlaces internos, anclas, páginas huérfanas y coherencia con el sitemap, leyendo los archivos.
import os, re, sys, json
from html.parser import HTMLParser
from urllib.parse import urlparse, urljoin, unquote
R = sys.argv[1]
def resolver(ruta):
    ruta = unquote(ruta.split('?')[0])
    fs = os.path.join(R, ruta.lstrip('/'))
    if os.path.isdir(fs): fs = os.path.join(fs, 'index.html')
    if os.path.isfile(fs): return fs
    if os.path.isfile(fs + '.html'): return fs + '.html'
    return None
class P(HTMLParser):
    def __init__(s): super().__init__(); s.links=[]; s.ids=set(); s.meta={}; s.title=''; s._t=False; s.h1=0; s.ext=[]
    def handle_starttag(s, t, a):
        a = dict(a)
        if 'id' in a: s.ids.add(a['id'])
        if t == 'a' and a.get('name'): s.ids.add(a['name'])
        for k in ('href','src'):
            if k in a and a[k] is not None and t in ('a','link','script','img','iframe','source','image'): s.links.append((t, a[k], a))
        if t == 'meta':
            n = a.get('name') or a.get('property')
            if n: s.meta[n] = a.get('content','')
            if a.get('http-equiv','').lower()=='refresh': s.meta['refresh']=a.get('content','')
        if t == 'link' and a.get('rel') == 'canonical': s.meta['canonical'] = a.get('href')
        if t == 'title': s._t = True
        if t == 'h1': s.h1 += 1
    def handle_endtag(s, t):
        if t == 'title': s._t = False
    def handle_data(s, d):
        if s._t: s.title += d
pags = {}
for d, _, fs in os.walk(R):
    if '/.git' in d or '/_workers' in d or '/scripts' in d or '/auditoria' in d: continue
    for f in fs:
        if f.endswith('.html'):
            p = P(); p.feed(open(os.path.join(d, f), encoding='utf-8').read()); pags[os.path.join(d, f)] = p
def url_de(fs):
    u = '/' + os.path.relpath(fs, R)
    if u.endswith('/index.html'): u = u[:-10]
    elif u.endswith('.html') and not u.startswith('/demo/'): u = u[:-5]
    return u
rotos = []; entrantes = {fs: set() for fs in pags}; externos = {}
for fs, p in pags.items():
    base = 'https://x' + url_de(fs)
    for t, h, a in p.links:
        if h.startswith(('mailto:','tel:','data:','javascript:','#')) and not h.startswith('#'): continue
        u = urlparse(urljoin(base, h))
        if u.netloc not in ('x', 'fnfanalytics.com'):
            externos.setdefault(h, set()).add(url_de(fs)); continue
        dest = resolver(u.path)
        if not dest: rotos.append((url_de(fs), h, 'no existe')); continue
        if dest in entrantes and dest != fs and t == 'a': entrantes[dest].add(fs)
        if u.fragment and dest in pags and u.fragment not in pags[dest].ids and not u.fragment.startswith('inteligencia-'):
            rotos.append((url_de(fs), h, 'ancla no existe'))
        if t == 'a' and u.netloc == 'x' and re.search(r'\.html$', u.path) and not u.path.startswith('/demo/'): rotos.append((url_de(fs), h, 'enlaza con .html (duplica URL)'))
sm = set(re.findall(r'<loc>https://fnfanalytics\.com([^<]*)</loc>', open(os.path.join(R,'sitemap.xml')).read()))
sm = {s or '/' for s in sm}
print('PÁGINAS', len(pags), 'SITEMAP', len(sm))
print('== ROTOS'); [print('  ', *r) for r in sorted(set(rotos))]
print('== HUÉRFANAS (sin enlaces entrantes)')
for fs, e in entrantes.items():
    if not e and url_de(fs) != '/' and 'refresh' not in pags[fs].meta: print('  ', url_de(fs), '| noindex' if 'noindex' in pags[fs].meta.get('robots','') else '')
print('== EN SITEMAP PERO NO EXISTE / REDIRIGE / NOINDEX')
for s in sorted(sm):
    d = resolver(s)
    if not d: print('  falta', s)
    elif 'refresh' in pags[d].meta: print('  redirige', s)
    elif 'noindex' in pags[d].meta.get('robots',''): print('  noindex', s)
print('== INDEXABLE PERO FUERA DEL SITEMAP')
for fs, p in pags.items():
    u = url_de(fs)
    if u not in sm and u.rstrip('/') not in sm and 'noindex' not in p.meta.get('robots','') and 'refresh' not in p.meta: print('  ', u)
print('== SEO POR PÁGINA (problemas)')
tit = {}; desc = {}
for fs, p in pags.items():
    u = url_de(fs)
    if 'refresh' in p.meta: continue
    pr = []
    t = p.title.strip(); d = p.meta.get('description','')
    if not t: pr.append('sin title')
    elif len(t) > 65: pr.append(f'title {len(t)} car.')
    if not d: pr.append('sin description')
    elif len(d) > 165: pr.append(f'description {len(d)} car.')
    elif len(d) < 70: pr.append(f'description corta {len(d)}')
    c = p.meta.get('canonical')
    if 'noindex' not in p.meta.get('robots',''):
        if not c: pr.append('sin canonical')
        elif c != 'https://fnfanalytics.com' + u: pr.append(f'canonical {c}')
        for k in ('og:title','og:description','og:image','og:url'):
            if k not in p.meta: pr.append('sin ' + k)
        if p.meta.get('og:url') and p.meta['og:url'] != 'https://fnfanalytics.com' + u: pr.append('og:url ' + p.meta['og:url'])
    if p.h1 != 1: pr.append(f'h1 x{p.h1}')
    tit.setdefault(t, []).append(u); desc.setdefault(d, []).append(u)
    if pr and not u.startswith('/usos/'): print('  ', u, '|', '; '.join(pr))
    elif pr: tit.setdefault('__usos_pr', []).append(u + ' ' + '; '.join(pr))
print('  usos con problemas:', len(tit.get('__usos_pr', [])), tit.get('__usos_pr', [])[:6])
print('== TÍTULOS/DESCRIPCIONES DUPLICADOS')
for k, v in list(tit.items()) + list(desc.items()):
    if len(v) > 1 and k != '__usos_pr': print('  ', repr(k[:70]), v[:5])
print('== EXTERNOS http:// o serida.org')
for h, o in externos.items():
    if h.startswith('http://') or 'serida.org' in h: print('  ', h[:110], sorted(o)[:3])
json.dump({h: sorted(o)[:3] for h, o in externos.items()}, open(sys.argv[2], 'w'), indent=0)
print('externos distintos:', len(externos))
