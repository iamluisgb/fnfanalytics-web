import json,sys,glob,os
print(f"{'página':24}{'rend':>5}{'acc':>5}{'bp':>5}{'seo':>5}{'FCP':>7}{'LCP':>7}{'TBT':>7}{'CLS':>7}{'SI':>7}{'peso KB':>9}")
for f in sorted(glob.glob(sys.argv[1]+'/lh/*.json')):
    d=json.load(open(f)); c=d['categories']; a=d['audits']
    g=lambda k:a[k].get('numericValue') or 0
    s=lambda k:('%5.0f'%(c[k]['score']*100)) if c[k]['score'] is not None else '   ??'
    print(f"{os.path.basename(f)[:-5]:24}{s('performance')}{s('accessibility')}{s('best-practices')}{s('seo')}{g('first-contentful-paint')/1000:7.1f}{g('largest-contentful-paint')/1000:7.1f}{g('total-blocking-time'):7.0f}{g('cumulative-layout-shift'):7.3f}{g('speed-index')/1000:7.1f}{g('total-byte-weight')/1024:9.0f}")
    if d.get('runtimeError'): print('   ', d['runtimeError'])
