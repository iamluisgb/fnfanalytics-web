# Servidor local que imita GitHub Pages: /ruta -> ruta.html, 404.html, y gzip como en producción.
import http.server, os, sys, gzip, socketserver
RAIZ = sys.argv[1]; PUERTO = int(sys.argv[2])
class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=RAIZ, **k)
    def log_message(self, *a): pass
    def do_GET(self):
        ruta = self.path.split('?')[0].split('#')[0]
        fs = os.path.join(RAIZ, ruta.lstrip('/'))
        if os.path.isdir(fs):
            if not ruta.endswith('/'):
                self.send_response(301); self.send_header('Location', ruta + '/'); self.end_headers(); return
            fs = os.path.join(fs, 'index.html')
        if not os.path.isfile(fs) and os.path.isfile(fs + '.html'): fs += '.html'
        estado = 200
        if not os.path.isfile(fs): fs = os.path.join(RAIZ, '404.html'); estado = 404
        datos = open(fs, 'rb').read()
        tipo = self.guess_type(fs)
        self.send_response(estado); self.send_header('Content-Type', tipo)
        if tipo.split('/')[0] == 'text' or 'javascript' in tipo or 'json' in tipo or 'xml' in tipo:
            if 'gzip' in self.headers.get('Accept-Encoding', ''):
                datos = gzip.compress(datos, 6); self.send_header('Content-Encoding', 'gzip')
        self.send_header('Content-Length', str(len(datos))); self.send_header('Cache-Control', 'max-age=600'); self.end_headers()
        if self.command != 'HEAD': self.wfile.write(datos)
    do_HEAD = do_GET
class S(socketserver.ThreadingMixIn, http.server.HTTPServer): daemon_threads = True
S(('127.0.0.1', PUERTO), H).serve_forever()
