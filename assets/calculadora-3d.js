// Escena 3D de la calculadora de caldo: la parcela con las medidas del usuario, el atomizador
// por la calle y la cuba vaciándose. La carga calculadora.js, después de three.js (r128).
window.FnfEscena = {montar() {
  const $ = id => document.getElementById(id);
  const nf = (v, d = 0) => Number.isFinite(v) ? v.toLocaleString('es-ES', {minimumFractionDigits:d, maximumFractionDigits:d}) : '—';
  const stage = $('stage');
  if (!window.THREE) return null;
  let R;
  try { R = new THREE.WebGLRenderer({antialias:true}); } catch (e) { return null; }
  if (!R.getContext()) return null;
  const tok = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
  const C = n => new THREE.Color(tok(n));
  R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  R.shadowMap.enabled = true; R.shadowMap.type = THREE.PCFSoftShadowMap;
  stage.prepend(R.domElement);

  const S = new THREE.Scene();
  S.background = C('--cc-sky'); S.fog = new THREE.Fog(C('--cc-sky'), 38, 80);
  const cam = new THREE.PerspectiveCamera(36, 2, .1, 200);
  S.add(new THREE.HemisphereLight(0xffffff, 0x9a8a68, .85));
  const sun = new THREE.DirectionalLight(0xfff4e2, .8);
  sun.position.set(-10, 24, 14); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, {left:-26, right:26, top:26, bottom:-26, near:1, far:70});
  S.add(sun);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.MeshLambertMaterial({color:C('--cc-soil')}));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; S.add(ground);

  // copa: icosaedro con relieve (mismo desplazamiento en vértices repetidos para no abrir grietas)
  function blob(seed) {
    const g = new THREE.IcosahedronGeometry(1, 1), p = g.attributes.position, m = new Map();
    let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < p.count; i++) {
      const k = p.getX(i).toFixed(3) + ',' + p.getY(i).toFixed(3) + ',' + p.getZ(i).toFixed(3);
      if (!m.has(k)) m.set(k, .8 + rnd() * .32);
      const f = m.get(k); p.setXYZ(i, p.getX(i) * f, p.getY(i) * f, p.getZ(i) * f);
    }
    g.computeVertexNormals(); return g;
  }
  const canopyGeo = blob(11);
  const trunkGeo = new THREE.CylinderGeometry(.12, .2, 1, 6); trunkGeo.translate(0, .5, 0);
  const mat = {
    olivo: new THREE.MeshStandardMaterial({color:C('--cc-leaf-olive'), flatShading:true, roughness:.95}),
    vid: new THREE.MeshStandardMaterial({color:C('--cc-leaf-vine'), flatShading:true, roughness:.95}),
    arbol: new THREE.MeshStandardMaterial({color:C('--cc-leaf-tree'), flatShading:true, roughness:.95}),
    trunk: new THREE.MeshLambertMaterial({color:C('--cc-trunk')}),
    strip: new THREE.MeshLambertMaterial({color:C('--cc-soil-row')}),
    cereal: new THREE.MeshLambertMaterial({color:C('--cc-cereal'), flatShading:true}),
    cereal2: new THREE.MeshLambertMaterial({color:C('--cc-cereal-2')}),
    huerta: new THREE.MeshStandardMaterial({color:C('--cc-leaf-vine'), flatShading:true, roughness:.9}),
    acolchado: new THREE.MeshStandardMaterial({color:C('--cc-mulch'), roughness:.35})
  };
  const tallo = new THREE.ConeGeometry(.16, 1, 5); tallo.translate(0, .5, 0);

  const W = {key:'', cycKey:'', st:null, items:[], L:70, sp:5, trunkH:1, vine:false, can:null, tr:null};
  const rows = new THREE.Group(); S.add(rows);
  function buildRows(st) {
    rows.children.forEach(o => { if (o.isInstancedMesh) o.dispose(); });
    rows.clear();
    W.modo = modoDe(st);
    W.barra = W.modo === 'barra'; W.inv = W.modo === 'vertical' || W.modo === 'pistola';
    trv.visible = W.modo === 'atom'; techo.visible = W.inv;
    if (W.barra) return buildCampo(st);
    // invernadero: setos de plantas entutoradas de unos 2 m, con la separación entre líneas del usuario
    W.g = W.inv ? {alto:2.1, ancho:.5, calle:st.anchoT} : {alto:st.alto, ancho:st.ancho, calle:st.calle};
    const vine = st.cult === 'vid' || W.inv;
    // árboles a la distancia del marco, sin que las copas se monten
    const sp = W.inv ? .55 : vine ? 1.1 : Math.max(st.entre || st.ancho * 1.5, st.ancho * 1.05);
    const n = Math.ceil(70 / sp), zs = [-2.5, -1.5, -.5, .5, 1.5, 2.5].slice(W.inv ? 0 : 1, W.inv ? 6 : 5).map(k => k * W.g.calle);
    let s = 3; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    W.items = [];
    zs.forEach(z => { for (let i = 0; i < n; i++) W.items.push({bx:i * sp + rnd() * sp * .12, z:z + (rnd() - .5) * .15, ry:vine ? (rnd() - .5) * .5 : rnd() * 6.28, s:.88 + rnd() * .24}); });
    W.can = new THREE.InstancedMesh(canopyGeo, W.inv ? mat.huerta : (mat[st.cult] || mat.arbol), W.items.length);
    W.tr = new THREE.InstancedMesh(trunkGeo, mat.trunk, W.items.length);
    W.can.castShadow = W.tr.castShadow = true; W.can.receiveShadow = true;
    rows.add(W.can, W.tr);
    zs.forEach(z => { const m = new THREE.Mesh(new THREE.PlaneGeometry(240, W.g.ancho * 1.3), mat.strip); m.rotation.x = -Math.PI / 2; m.position.set(0, .01, z); m.receiveShadow = true; rows.add(m); });
    Object.assign(W, {vine, sp, L:n * sp, trunkH:W.inv ? .05 : vine ? .7 : 1.0});
    buildTRV(st);
  }

  // herbáceo: cereal en cinta sin fin, con rodadas cada ancho de barra
  function buildCampo(st) {
    if (st.cult === 'horticola') return buildHuerta(st);
    W.huerta = false;
    const half = Math.max(st.anchoT * 1.25, 16), sx = .9, sz = .55, L = 63, n = Math.round(L / sx);
    let s = 5; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const rodadas = [];
    for (let k = -2; k <= 2; k++) rodadas.push(k * st.anchoT - .9, k * st.anchoT + .9);
    W.items = [];
    for (let z = -half; z <= half; z += sz) {
      if (rodadas.some(r => Math.abs(z - r) < .3)) continue;
      for (let i = 0; i < n; i++) W.items.push({bx:i * sx + rnd() * .5, z:z + (rnd() - .5) * .2, ry:rnd() * 6.28, s:.35 + rnd() * .25});
    }
    W.can = new THREE.InstancedMesh(tallo, mat.cereal, W.items.length);
    W.can.receiveShadow = true; W.tr = null;
    rows.add(W.can);
    const base = new THREE.Mesh(new THREE.PlaneGeometry(240, half * 2 + 6), mat.cereal2);
    base.rotation.x = -Math.PI / 2; base.position.y = .005; base.receiveShadow = true; rows.add(base);
    rodadas.forEach(z => { const m = new THREE.Mesh(new THREE.PlaneGeometry(240, .45), mat.strip); m.rotation.x = -Math.PI / 2; m.position.set(0, .012, z); m.receiveShadow = true; rows.add(m); });
    Object.assign(W, {vine:false, L:n * sx, trunkH:0});
  }

  // hortícola: caballones con acolchado y dos líneas de plantas bajas por caballón
  function buildHuerta(st) {
    const half = Math.max(st.anchoT * .75, 12), paso = 1.5, sx = .5, L = 63, n = Math.round(L / sx);
    let s = 9; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    W.items = [];
    const camas = [];
    for (let z = -half; z <= half; z += paso) {
      camas.push(z);
      [-.25, .25].forEach(dz => { for (let i = 0; i < n; i++) W.items.push({bx:i * sx + rnd() * .08, z:z + dz, ry:rnd() * 6.28, s:.24 + rnd() * .08}); });
    }
    W.can = new THREE.InstancedMesh(canopyGeo, mat.huerta, W.items.length);
    W.can.castShadow = true; W.can.receiveShadow = true; W.tr = null;
    rows.add(W.can);
    camas.forEach(z => { const m = new THREE.Mesh(new THREE.BoxGeometry(240, .14, .95), mat.acolchado); m.position.set(0, .07, z); m.receiveShadow = true; rows.add(m); });
    Object.assign(W, {vine:false, L:n * sx, trunkH:0, huerta:true});
  }

  // caja del volumen de copa, fija delante del tractor en la fila del fondo
  const trv = new THREE.Group(); S.add(trv);
  const copaAnchor = new THREE.Vector3(), calleAnchor = new THREE.Vector3();
  function buildTRV(st) {
    trv.clear();
    const len = 12, h = st.alto, w = st.ancho, y = W.trunkH + h / 2 - .1, z = -st.calle / 2, x = 10;
    const g = new THREE.BoxGeometry(len, h, w);
    const fill = new THREE.Mesh(g, new THREE.MeshBasicMaterial({color:C('--cc-spray'), transparent:true, opacity:.1, depthWrite:false}));
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(g), new THREE.LineBasicMaterial({color:C('--brand-deep')}));
    fill.position.set(x, y, z); edges.position.copy(fill.position);
    const cg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x - 3, .06, -st.calle / 2), new THREE.Vector3(x - 3, .06, st.calle / 2)]);
    const line = new THREE.Line(cg, new THREE.LineBasicMaterial({color:C('--brand-deep')}));
    trv.add(fill, edges, line);
    copaAnchor.set(x, y + h / 2 + .2, z); calleAnchor.set(x - 3, .1, 0);
  }

  // tractor y atomizador (el frente mira a +x; el mundo se mueve hacia -x)
  const rig = new THREE.Group(); S.add(rig);
  const M = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({color:C(c), roughness:.55, metalness:.1}, o));
  const add = (geo, m, x, y, z) => { const k = new THREE.Mesh(geo, m); k.position.set(x, y, z); k.castShadow = true; rig.add(k); return k; };
  const body = M('--cc-tractor'), accent = M('--brand'), dark = M('--carbon'), glass = M('--cc-glass', {transparent:true, opacity:.55});
  add(new THREE.BoxGeometry(2.0, .9, 1.15), body, 3.0, 1.15, 0);
  add(new THREE.BoxGeometry(1.3, .7, 1.4), body, 1.6, 1.0, 0);
  add(new THREE.BoxGeometry(1.2, 1.1, 1.35), glass, 1.6, 1.95, 0);
  add(new THREE.BoxGeometry(1.35, .08, 1.5), dark, 1.6, 2.54, 0);
  add(new THREE.BoxGeometry(.05, .25, 1.16), accent, 4.0, 1.2, 0);
  add(new THREE.BoxGeometry(1.1, .1, .1), dark, .45, .7, 0);
  add(new THREE.BoxGeometry(2.6, .15, 1.2), dark, -1.3, .55, 0);
  const wheels = [];
  const wheel = (r, w, x, z) => { const g = new THREE.CylinderGeometry(r, r, w, 18); g.rotateX(Math.PI / 2); const k = add(g, dark, x, r, z); k.userData.r = r; wheels.push(k); };
  wheel(.78, .45, 1.5, .9); wheel(.78, .45, 1.5, -.9); wheel(.46, .3, 3.5, .72); wheel(.46, .3, 3.5, -.72);
  wheel(.45, .25, -1.1, .78); wheel(.45, .25, -1.1, -.78);
  const shellG = new THREE.CylinderGeometry(.72, .72, 2.4, 24); shellG.rotateZ(Math.PI / 2);
  const shell = add(shellG, M('--cc-tank', {transparent:true, opacity:.32, depthWrite:false}), -1.3, 1.35, 0); shell.castShadow = false;
  const liquid = add(new THREE.BoxGeometry(2.3, 1, 1.0), M('--cc-spray', {transparent:true, opacity:.85}), -1.3, 1, 0);
  const fanG = new THREE.CylinderGeometry(.8, .8, .35, 24); fanG.rotateZ(Math.PI / 2);
  const ringG = new THREE.TorusGeometry(.82, .06, 6, 28); ringG.rotateY(Math.PI / 2);
  const atomizador = [add(fanG, dark, -2.7, 1.35, 0), add(ringG, accent, -2.9, 1.35, 0)];

  const tractor = [...rig.children]; // tractor, cuba y atomizador: fuera en invernadero

  // qué se dibuja: atomizador (leñosos), barra (extensivos y hortícolas al aire libre),
  // carretilla de barras verticales o pistola (hortícolas entutorados)
  function modoDe(st) {
    if (st.cult === 'extensivo') return 'barra';
    if (st.cult === 'horticola') return st.sistema === 'vertical' ? 'vertical' : st.sistema === 'pistola' ? 'pistola' : 'barra';
    return 'atom';
  }

  // techo del invernadero: plástico translúcido
  const techo = new THREE.Group(); S.add(techo);
  const plastico = new THREE.Mesh(new THREE.PlaneGeometry(240, 40), new THREE.MeshBasicMaterial({color:0xffffff, transparent:true, opacity:.18, depthWrite:false, side:THREE.DoubleSide}));
  plastico.rotation.x = -Math.PI / 2; plastico.position.y = 3.4; techo.add(plastico);
  techo.visible = false;

  // carretilla de barras verticales: depósito, dos barras con boquillas a cada lado
  const carro = new THREE.Group(); rig.add(carro); carro.visible = false;
  const pieza = (geo, m, x, y, z, g = carro) => { const k = new THREE.Mesh(geo, m); k.position.set(x, y, z); k.castShadow = true; g.add(k); return k; };
  pieza(new THREE.BoxGeometry(.75, .5, .5), M('--cc-tank', {transparent:true, opacity:.8}), 0, .55, 0);
  pieza(new THREE.BoxGeometry(.8, .06, .55), dark, 0, .3, 0);
  [-.28, .28].forEach(z => { const g = new THREE.CylinderGeometry(.16, .16, .08, 14); g.rotateX(Math.PI / 2); pieza(g, dark, .1, .16, z); });
  pieza(new THREE.BoxGeometry(.6, .04, .04), dark, -.6, .8, 0).rotation.z = -.5;
  [-.32, .32].forEach(z => {
    pieza(new THREE.BoxGeometry(.05, 1.9, .05), dark, -.25, 1.2, z);
    for (let j = 0; j < 7; j++) pieza(new THREE.BoxGeometry(.06, .06, .08), accent, -.25, .4 + j * .27, z + Math.sign(z) * .04);
  });

  // operario: empuja la carretilla o lleva la lanza
  const operario = new THREE.Group(); rig.add(operario); operario.visible = false;
  const ropa = M('--cc-tractor'), piel = M('--cc-trunk');
  const piernas = [-.1, .1].map(z => { const g = new THREE.BoxGeometry(.14, .8, .14); g.translate(0, -.4, 0); return pieza(g, dark, 0, .82, z, operario); });
  pieza(new THREE.BoxGeometry(.28, .6, .4), ropa, 0, 1.12, 0, operario);
  pieza(new THREE.SphereGeometry(.13, 12, 10), piel, 0, 1.56, 0, operario);
  pieza(new THREE.BoxGeometry(.3, .08, .44), M('--brand'), 0, 1.68, 0, operario);
  // la lanza gira sobre el hombro hacia el lado que trata
  const lanza = new THREE.Group(); lanza.position.set(.15, 1.25, 0); operario.add(lanza);
  const tubo = new THREE.Mesh(new THREE.CylinderGeometry(.02, .02, .9, 6), dark); tubo.position.set(0, .45, 0); lanza.add(tubo);
  const punta = new THREE.Vector3(.35, 1.15, 0);
  const manguera = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(.15, 1, 0), new THREE.Vector3(-.4, .05, .2), new THREE.Vector3(-8, .03, .2)]),
    new THREE.LineBasicMaterial({color:C('--carbon')}));
  operario.add(manguera);
  const equipoAnchor = new THREE.Vector3(0, 2.3, 0), pasilloAnchor = new THREE.Vector3(3, .1, 0);

  // barra de pulverización: tantas boquillas como diga el usuario (hasta 60 a la vista)
  const boom = new THREE.Group(); rig.add(boom);
  const BX = -2.9, BY = 1.0;
  let boquillas = [];
  function buildBoom(st) {
    boom.clear();
    const w = st.anchoT, nv = Math.min(60, Math.max(2, Math.round(st.nb)));
    const brazo = new THREE.Mesh(new THREE.BoxGeometry(.12, .12, w), dark); brazo.position.set(BX, BY, 0); brazo.castShadow = true;
    const refuerzo = new THREE.Mesh(new THREE.BoxGeometry(.06, .06, w * .96), body); refuerzo.position.set(BX + .05, BY + .35, 0);
    const mastil = new THREE.Mesh(new THREE.BoxGeometry(.2, .9, .9), dark); mastil.position.set(BX + .25, BY + .2, 0);
    boom.add(brazo, refuerzo, mastil);
    [-1, 1].forEach(sg => { const p = new THREE.Mesh(new THREE.BoxGeometry(.16, .2, .4), accent); p.position.set(BX, BY, sg * w / 2); boom.add(p); });
    const g = new THREE.BoxGeometry(.07, .12, .07);
    boquillas = [];
    for (let j = 0; j < nv; j++) {
      const z = -w / 2 + (j + .5) * w / nv;
      const k = new THREE.Mesh(g, accent); k.position.set(BX, BY - .1, z); boom.add(k); boquillas.push(z);
    }
    W.sep = w / nv;
  }

  // gotas
  const N = 1800, pos = new Float32Array(N * 3), col = new Float32Array(N * 3), vel = new Float32Array(N * 3), age = new Float32Array(N).fill(99), life = new Float32Array(N).fill(.75);
  for (let i = 0; i < N; i++) pos[i * 3 + 1] = -50;
  const pg = new THREE.BufferGeometry();
  pg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); pg.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const pts = new THREE.Points(pg, new THREE.PointsMaterial({size:.24, vertexColors:true, transparent:true, opacity:.9, depthWrite:false}));
  pts.frustumCulled = false; S.add(pts);
  const sprayC = C('--cc-spray'), skyC = C('--cc-sky'), tmpC = new THREE.Color();
  let head = 0, acc = 0;
  const LIFE = .75;
  function spawn(k, speed) {
    const st = W.st;
    if (W.barra) {
      for (; k > 0; k--) {
        const i = head, z = boquillas[(Math.random() * boquillas.length) | 0];
        head = (head + 1) % N;
        const t = .32 + Math.random() * .1;
        pos[i * 3] = BX; pos[i * 3 + 1] = BY - .15; pos[i * 3 + 2] = z;
        vel[i * 3] = -speed * .35 + (Math.random() - .5) * .5;
        vel[i * 3 + 1] = -(BY - .35) / t;
        vel[i * 3 + 2] = (Math.random() - .5) * W.sep * 1.25 / t;
        age[i] = 0; life[i] = t;
      }
      return;
    }
    if (W.inv) {
      for (; k > 0; k--) {
        const i = head; head = (head + 1) % N;
        const t = .3 + Math.random() * .12, a = Math.random();
        let side, x0, y0, z0;
        if (W.modo === 'vertical') { side = Math.random() < .5 ? -1 : 1; x0 = -.25; y0 = .35 + a * 1.65; z0 = side * .36; }
        else { side = W.lado; x0 = punta.x; y0 = punta.y + (Math.random() - .5) * .2; z0 = side * .95; }
        pos[i * 3] = x0; pos[i * 3 + 1] = y0; pos[i * 3 + 2] = z0;
        vel[i * 3] = -speed * .5 + (Math.random() - .5) * .6;
        vel[i * 3 + 1] = (W.modo === 'pistola' ? (Math.random() - .5) * 2.4 : (Math.random() - .5) * .8) + .6;
        vel[i * 3 + 2] = side * Math.max(.3, W.g.calle / 2 - Math.abs(z0) - .1) / t * (.8 + Math.random() * .4);
        age[i] = 0; life[i] = t;
      }
      return;
    }
    for (; k > 0; k--) {
      const i = head; head = (head + 1) % N; life[i] = LIFE; const side = Math.random() < .5 ? -1 : 1, a = Math.random();
      pos[i * 3] = -2.9; pos[i * 3 + 1] = .6 + a * 1.5; pos[i * 3 + 2] = side * .7;
      vel[i * 3] = -speed * .6 + (Math.random() - .5) * 1.2;
      vel[i * 3 + 1] = ((W.trunkH + W.g.alto * (a * 1.1)) - (.6 + a * 1.5)) / LIFE + Math.random() * .8;
      vel[i * 3 + 2] = side * (W.g.calle / 2 - .5) / LIFE * (.75 + Math.random() * .45);
      age[i] = 0;
    }
  }
  function stepDrops(dt) {
    for (let i = 0; i < N; i++) {
      if (age[i] > life[i]) continue;
      age[i] += dt;
      if (age[i] > life[i]) { pos[i * 3 + 1] = -50; continue; }
      pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      vel[i * 3 + 1] -= 3 * dt;
      tmpC.copy(sprayC).lerp(skyC, Math.pow(age[i] / life[i], 1.6));
      col[i * 3] = tmpC.r; col[i * 3 + 1] = tmpC.g; col[i * 3 + 2] = tmpC.b;
    }
    pg.attributes.position.needsUpdate = true; pg.attributes.color.needsUpdate = true;
  }

  // filas en cinta sin fin
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), eu = new THREE.Euler(), pv = new THREE.Vector3(), sv = new THREE.Vector3();
  let offset = 0;
  function placeRows() {
    const st = W.st, L = W.L;
    if (W.barra) {
      W.items.forEach((it, i) => {
        const x = (((it.bx - offset) % L) + L) % L - L / 2;
        eu.set(0, it.ry, 0); q.setFromEuler(eu);
        if (W.huerta) { pv.set(x, .14 + it.s * .8, it.z); sv.set(it.s, it.s * 1.1, it.s); }
        else { pv.set(x, 0, it.z); sv.set(1, it.s, 1); }
        m4.compose(pv, q, sv); W.can.setMatrixAt(i, m4);
      });
      W.can.instanceMatrix.needsUpdate = true;
      return;
    }
    W.items.forEach((it, i) => {
      const x = (((it.bx - offset) % L) + L) % L - L / 2;
      eu.set(0, it.ry, 0); q.setFromEuler(eu);
      const hy = W.g.alto / 2;
      pv.set(x, W.trunkH + hy * .9, it.z); sv.set((W.inv ? .4 : W.vine ? .75 : W.g.ancho / 2) * it.s, hy * it.s, W.g.ancho / 2 * it.s);
      m4.compose(pv, q, sv); W.can.setMatrixAt(i, m4);
      pv.set(x, 0, it.z); sv.set(1, W.trunkH + .25, 1); m4.compose(pv, q, sv); W.tr.setMatrixAt(i, m4);
    });
    W.can.instanceMatrix.needsUpdate = W.tr.instanceMatrix.needsUpdate = true;
  }

  // ciclo de cubas: cada cuba llena dura TC segundos; la última va con lo que sobra
  const TC = 6, TR = .9;
  let cyc = {i:0, level:1, refill:0};
  const startLevel = i => (W.st && i === W.st.nT - 1 && W.st.rest > 1) ? W.st.rest / W.st.cuba : 1;
  function setLiquid(l) { const h = Math.max(.02, 1.25 * l); liquid.scale.y = h; liquid.position.y = 1.35 - .64 + h / 2; }

  const lab = {copa:$('lCopa'), calle:$('lCalle')}, pj = new THREE.Vector3(), boomAnchor = new THREE.Vector3();
  function project(el, p) {
    pj.copy(p).project(cam);
    const w = stage.clientWidth, h = stage.clientHeight;
    el.hidden = pj.z > 1 || Math.abs(pj.x) > 1.05 || Math.abs(pj.y) > 1.05;
    // la etiqueta nunca se sale por los lados de la escena
    const mitad = el.offsetWidth / 2 + 6, x = Math.min(w - mitad, Math.max(mitad, (pj.x * .5 + .5) * w));
    el.style.transform = `translate(${x}px,${(-pj.y * .5 + .5) * h}px) translate(-50%,-100%)`;
  }
  function hud() {
    const st = W.st, used = (cyc.i * st.cuba + (startLevel(cyc.i) - cyc.level) * st.cuba);
    const haDone = Math.min(st.ha, used / st.caldo);
    const liters = cyc.level * st.cuba;
    $('hCubaN').textContent = cyc.refill > 0 ? `Llenando la cuba ${cyc.i + 1} de ${st.nT}` : `Cuba ${cyc.i + 1} de ${st.nT}`;
    $('hCubaL').textContent = `${nf(liters)} L`;
    $('hCubaM').style.width = `${cyc.level * 100}%`;
    $('hCubaP').textContent = `${nf(st.perTank * startLevel(cyc.i), 2)} ${st.unitP} de producto`;
    $('hHa').textContent = `${nf(haDone, 1)} de ${nf(st.ha, 1)} ha`;
    $('hHaM').style.width = `${st.ha > 0 ? haDone / st.ha * 100 : 0}%`;
  }

  let yaw = -1.12, pitch = .6;
  function placeCam() {
    const d = W.barra ? 9 + W.st.anchoT * .95 : W.inv ? 6 + W.g.calle * 2.2 : 10 + W.g.calle * 1.9 + W.g.alto * 1.6;
    const cx = W.inv ? .5 : 2, pit = W.inv ? Math.max(pitch, .85) : pitch; // en invernadero, mirando al pasillo
    cam.position.set(Math.sin(yaw) * Math.cos(pit) * d + cx, Math.sin(pit) * d + 1.2, Math.cos(yaw) * Math.cos(pit) * d);
    cam.lookAt(cx, W.inv ? 1 : 1.3, 0);
  }

  function step(dt) {
    const st = W.st;
    let speed = W.modo === 'pistola' ? (st.avance || 10) / 60 * 1.6 : st.vel / 3.6 * 1.6;
    // el operario mueve la lanza arriba y abajo y cambia de lado cada poco
    W.reloj = (W.reloj || 0) + dt;
    if (W.modo === 'pistola') {
      W.lado = Math.floor(W.reloj / 1.8) % 2 ? -1 : 1;
      lanza.rotation.x = W.lado * -1.2; punta.set(.35, 1.15 + Math.sin(W.reloj * 2.4) * .55, 0);
      lanza.rotation.z = Math.sin(W.reloj * 2.4) * .45;
    }
    if (W.inv) piernas.forEach((pi, j) => { pi.rotation.z = cyc.refill > 0 ? 0 : Math.sin(W.reloj * 6 + j * Math.PI) * .35; });
    if (cyc.refill > 0) {
      cyc.refill -= dt; speed = 0;
      cyc.level = startLevel(cyc.i) * (1 - Math.max(0, cyc.refill) / TR);
      if (cyc.refill <= 0) cyc.level = startLevel(cyc.i);
    } else {
      cyc.level = Math.min(startLevel(cyc.i), cyc.level - dt / TC);
      acc += dt * (W.barra ? Math.min(1400, Math.max(300, st.qt * 18)) : W.inv ? Math.min(500, Math.max(160, st.qt * 22)) : Math.min(650, Math.max(90, st.qt * 7)));
      const k = Math.floor(acc); acc -= k; spawn(k, speed);
      if (cyc.level <= 0) { cyc.i = (cyc.i + 1) % st.nT; cyc.level = 0; cyc.refill = TR; }
    }
    offset += speed * dt;
    wheels.forEach(w => { w.rotation.z -= speed * dt / w.userData.r; });
    stepDrops(dt);
  }
  function draw() {
    placeRows(); setLiquid(cyc.level); placeCam(); hud();
    R.render(S, cam);
    project(lab.copa, W.barra ? boomAnchor : W.inv ? equipoAnchor : copaAnchor);
    if (W.barra) lab.calle.hidden = true; else project(lab.calle, W.inv ? pasilloAnchor : calleAnchor);
  }

  // bucle: solo corre si se ve y no está en pausa
  let running = false, visible = true, last = 0;
  let paused = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const btn = $('play');
  function frame(t) { if (!running) return; const dt = Math.max(0, Math.min(.05, (t - last) / 1000)); last = t; step(dt); draw(); requestAnimationFrame(frame); }
  function sync() {
    btn.textContent = paused ? 'Reanudar' : 'Pausar';
    const want = visible && !paused && !document.hidden && W.st;
    if (want && !running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
    else if (!want) running = false;
  }
  btn.addEventListener('click', () => { paused = !paused; sync(); });
  document.addEventListener('visibilitychange', sync);
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { visible = es[0].isIntersecting; sync(); }).observe(stage);

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
    R.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); if (W.st && !running) draw();
  }
  if ('ResizeObserver' in window) new ResizeObserver(resize).observe(stage); else addEventListener('resize', resize);

  let drag = null;
  stage.addEventListener('pointerdown', e => { if (e.target === btn || e.target.classList.contains('is-link')) return; drag = {x:e.clientX, y:e.clientY, yaw, pitch}; stage.setPointerCapture(e.pointerId); });
  stage.addEventListener('pointermove', e => {
    if (!drag) return;
    yaw = Math.max(-1.6, Math.min(.3, drag.yaw - (e.clientX - drag.x) * .006));
    if (e.pointerType === 'mouse') pitch = Math.max(.12, Math.min(1.0, drag.pitch + (e.clientY - drag.y) * .004));
    if (!running) draw();
  });
  stage.addEventListener('pointerup', () => { drag = null; });
  stage.addEventListener('pointercancel', () => { drag = null; });

  function update(st) {
    const modo = modoDe(st), barra = modo === 'barra', inv = modo === 'vertical' || modo === 'pistola';
    const gk = barra ? [st.cult, modo, st.anchoT].join() : inv ? [modo, st.anchoT].join() : [st.cult, st.alto, st.ancho, st.calle, st.entre].join();
    W.st = st;
    if (gk !== W.key) { W.key = gk; buildRows(st); }
    const bk = [st.anchoT, Math.round(st.nb)].join();
    if (barra && bk !== W.boomKey) { W.boomKey = bk; buildBoom(st); }
    tractor.forEach(m => { m.visible = !inv; });
    boom.visible = barra; atomizador.forEach(m => { m.visible = modo === 'atom'; });
    carro.visible = modo === 'vertical'; operario.visible = inv; lanza.visible = modo === 'pistola';
    operario.position.x = modo === 'vertical' ? -1 : 0;
    boomAnchor.set(BX, BY + .6, -st.anchoT * .3);
    const ck = [st.nT, st.cuba, st.rest].join();
    if (ck !== W.cycKey) { W.cycKey = ck; cyc = {i:0, level:startLevel(0), refill:0}; }
    if (cyc.i >= st.nT) cyc = {i:0, level:startLevel(0), refill:0};
    sprayC.set(st.bad ? tok('--bad') : tok('--cc-spray'));
    liquid.material.color.copy(sprayC);
    $('hBad').hidden = !st.bad;
    lab.copa.classList.toggle('is-link', barra);
    if (barra) { lab.copa.setAttribute('role', 'button'); lab.copa.tabIndex = 0; lab.copa.title = 'Cambiar el ancho de la barra'; }
    else { lab.copa.removeAttribute('role'); lab.copa.removeAttribute('tabindex'); lab.copa.removeAttribute('title'); }
    lab.copa.textContent = barra ? `Barra ${nf(st.anchoT, 1)} m · ${Math.round(st.nb)} boquillas · cambiar`
      : modo === 'vertical' ? `Carretilla · ${Math.round(st.nb)} boquillas`
      : modo === 'pistola' ? `Pistola ${nf(st.Q, 1)} L/min · 10 m cada ${nf(600 / (st.avance || 10))} s`
      : `Copa ${nf(st.ancho, 1)} × ${nf(st.alto, 1)} m`;
    lab.calle.textContent = inv ? `Líneas a ${nf(st.anchoT, 1)} m` : `Calle ${nf(st.calle, 1)} m`;
    resize(); sync();
    if (!running) draw();
  }
  return {update};
}};

