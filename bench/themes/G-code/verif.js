// Graders for theme G. Model code only ever runs in a bubblewrap sandbox that sees /usr read-only and
// a fresh directory under os.tmpdir(), with a timeout, a minimal environment, resource limits and no network.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

function texte(output) {
  if (typeof output === 'string') return output;
  if (output && typeof output.content === 'string') return output.content;
  return '';
}

// Last fenced block whose tag is in langs, else the last block, else the raw text.
// The last one wins because reasoning models may prepend drafts to the answer.
function blocs(output) {
  const t = texte(output);
  const res = [];
  const re = /```([^\n`]*)\n([\s\S]*?)```/g;
  let m;
  while ((m = re.exec(t))) res.push({ lang: m[1].trim().toLowerCase(), code: m[2] });
  return res;
}

function extraire(output, langs) {
  const b = blocs(output);
  const bons = b.filter((x) => langs.includes(x.lang));
  if (bons.length) return bons[bons.length - 1].code;
  if (b.length) return b[b.length - 1].code;
  return texte(output);
}

function verdict(ok, total, raison) {
  const score = total ? ok / total : 0;
  return { pass: total > 0 && ok === total, score, reason: `${ok}/${total} — ${raison}` };
}

function echec(raison) {
  return { pass: false, score: 0, reason: raison };
}

// Model output is untrusted: without this it could read or delete the operator's files.
// Refusing to run is deliberate, a missing bwrap must not silently weaken the sandbox.
function prefixe(dir) {
  if (spawnSync('bwrap', ['--version']).status !== 0) throw new Error('bwrap introuvable : code du modèle non exécuté');
  return [
    'bwrap', '--unshare-all', '--die-with-parent', '--new-session',
    '--ro-bind', '/usr', '/usr',
    '--symlink', 'usr/bin', '/bin',
    '--symlink', 'usr/lib', '/lib',
    '--symlink', 'usr/lib', '/lib64',
    '--proc', '/proc',
    '--dev', '/dev',
    '--bind', dir, dir,
    '--chdir', dir,
  ];
}

function lancer(dir, cmd, args, { timeout = 10000, limites = true } = {}) {
  const lim = limites && fs.existsSync('/usr/bin/prlimit') ? ['prlimit', '--as=1073741824', '--cpu=10', '--fsize=10485760', '--'] : [];
  const tout = [...prefixe(dir), ...lim, cmd, ...args];
  return spawnSync(tout[0], tout.slice(1), {
    cwd: dir,
    timeout,
    input: '',
    encoding: 'utf8',
    maxBuffer: 1 << 20,
    env: { PATH: '/usr/bin:/bin', HOME: dir, TMPDIR: dir, LANG: 'C.UTF-8', ASAN_OPTIONS: 'detect_leaks=0' },
  });
}

function bac(fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-g-'));
  try {
    return fn(dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

const INTERDITS_PY = /\b(import\s+(os|sys|subprocess|socket|shutil|ctypes|urllib|http|requests|pathlib|multiprocessing|threading|signal)\b|from\s+(os|sys|subprocess|socket|shutil|ctypes|urllib|http|pathlib)\b|__import__|\bopen\s*\(|\beval\s*\(|\bexec\s*\()/;
const INTERDITS_C = /(\bsystem\s*\(|\bpopen\s*\(|\bfork\s*\(|\bexec[lv]p?e?\s*\(|\bfopen\s*\(|\bunlink\s*\(|\bremove\s*\(|\bsocket\s*\(|<unistd\.h>|<sys\/|\basm\b|__asm__)/;
const INTERDITS_JS = /\b(require|import)\s*\(|\bprocess\.|\bchild_process\b|\beval\s*\(|\bFunction\s*\(/;

function resultat(r, marque) {
  if (r.error && r.error.code === 'ETIMEDOUT') return { erreur: 'délai dépassé' };
  const ligne = (r.stdout || '').split('\n').reverse().find((l) => l.startsWith(marque));
  if (!ligne) {
    const sortie = r.stderr || r.stdout || '';
    const cause = sortie.split('\n').find((l) => /Error|error:/.test(l)) || sortie.slice(-400);
    return { erreur: `pas de résultat (code ${r.status}) ${cause.trim().slice(0, 400)}` };
  }
  return JSON.parse(ligne.slice(marque.length));
}

const MARQUE = '@@RESULTAT@@';

function harnaisPython(tests, prelude) {
  return `import json, os, resource, sys
sys.path.insert(0, os.getcwd())
resource.setrlimit(resource.RLIMIT_AS, (1 << 30, 1 << 30))
ok, echecs = 0, []
tests = json.loads(${JSON.stringify(JSON.stringify(tests))})
try:
    import solution as _s
    globals().update({k: v for k, v in vars(_s).items() if not k.startswith('__')})
    exec(${JSON.stringify(prelude || '')}, globals())
except BaseException as e:
    print(${JSON.stringify(MARQUE)} + json.dumps({"ok": 0, "total": len(tests), "echecs": ["import : " + repr(e)[:300]]}))
    raise SystemExit(0)
for t in tests:
    try:
        exec(t, globals())
        ok += 1
    except BaseException as e:
        echecs.append(t[:100] + " -> " + repr(e)[:200])
print(${JSON.stringify(MARQUE)} + json.dumps({"ok": ok, "total": len(tests), "echecs": echecs}))
`;
}

// vars.tests_py: list of Python statements (assert ...), vars.prelude_py: optional setup, not scored.
function testerPython(output, { vars }) {
  const code = extraire(output, ['python', 'py', 'python3']);
  const motif = code.match(INTERDITS_PY);
  if (motif) return echec(`code refusé avant exécution (motif « ${motif[0]} »)`);
  return bac((dir) => {
    fs.writeFileSync(path.join(dir, 'solution.py'), code);
    fs.writeFileSync(path.join(dir, 'harnais.py'), harnaisPython(vars.tests_py, vars.prelude_py));
    const res = resultat(lancer(dir, 'python3', ['-I', '-B', 'harnais.py']), MARQUE);
    if (res.erreur) return echec(res.erreur);
    return verdict(res.ok, res.total, res.echecs.join(' | ') || 'tous les tests passent');
  });
}

// vars.entete_c: types the function relies on; vars.tests_c: body of main() using CHECK(expr).
function testerC(output, { vars }) {
  const code = extraire(output, ['c', 'h', 'cpp', 'c++']);
  const motif = code.match(INTERDITS_C);
  if (motif) return echec(`code refusé avant exécution (motif « ${motif[0]} »)`);
  if (spawnSync('cc', ['--version']).status !== 0) return echec('compilateur cc introuvable');
  const asan = Boolean(vars.asan);
  return bac((dir) => {
    const source = `#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>
#include <string.h>
#include <stdlib.h>
#include <stdio.h>
${vars.entete_c || ''}
#define main main_du_modele
${code}
#undef main
static int ok_ = 0, total_ = 0;
#define CHECK(c) do { total_++; if (c) ok_++; else printf("echec : %s\\n", #c); } while (0)
int main(void) {
${vars.tests_c}
  printf("${MARQUE}{\\"ok\\": %d, \\"total\\": %d, \\"echecs\\": []}\\n", ok_, total_);
  return 0;
}
`;
    fs.writeFileSync(path.join(dir, 'sol.c'), source);
    const drapeaux = ['-std=gnu11', '-O1', '-w', '-o', 'prog', 'sol.c', '-lm'];
    if (asan) drapeaux.unshift('-fsanitize=address,undefined', '-fno-omit-frame-pointer', '-g');
    const comp = lancer(dir, 'cc', drapeaux, { timeout: 30000, limites: false });
    if (comp.status !== 0) return echec(`compilation : ${(comp.stderr || '').slice(0, 600)}`);
    const exec = lancer(dir, './prog', [], { timeout: 5000, limites: !asan });
    if (asan && /ERROR: (AddressSanitizer|UndefinedBehaviorSanitizer)|runtime error:/.test(exec.stderr || '')) {
      return echec(`sanitizer : ${(exec.stderr || '').split('\n').find((l) => /ERROR|runtime error/.test(l))}`);
    }
    const res = resultat(exec, MARQUE);
    if (res.erreur) return echec(res.erreur);
    const echecs = (exec.stdout || '').split('\n').filter((l) => l.startsWith('echec')).join(' | ');
    return verdict(res.ok, res.total, echecs || 'tous les tests passent');
  });
}

// vars.tests_js: list of JS expressions that must be truthy. Runs under Node's permission model.
function testerJs(output, { vars }) {
  const code = extraire(output, ['javascript', 'js', 'node']).replace(/^\s*export\s+(default\s+)?/gm, '');
  const motif = code.match(INTERDITS_JS);
  if (motif) return echec(`code refusé avant exécution (motif « ${motif[0]} »)`);
  return bac((dir) => {
    const harnais = `${code}
;(() => {
  const tests = ${JSON.stringify(vars.tests_js)};
  let ok = 0; const echecs = [];
  for (const t of tests) {
    try { if (eval(t)) ok++; else echecs.push(t + ' -> faux'); }
    catch (e) { echecs.push(t + ' -> ' + String(e).slice(0, 150)); }
  }
  console.log(${JSON.stringify(MARQUE)} + JSON.stringify({ ok, total: tests.length, echecs }));
})();
`;
    fs.writeFileSync(path.join(dir, 'harnais.js'), harnais);
    const res = resultat(lancer(dir, process.execPath, ['--permission', `--allow-fs-read=${dir}`, 'harnais.js'], { limites: false }), MARQUE);
    if (res.erreur) return echec(res.erreur);
    return verdict(res.ok, res.total, res.echecs.join(' | ') || 'tous les tests passent');
  });
}

// bash -n parses without executing anything.
function syntaxeBash(output) {
  const code = extraire(output, ['bash', 'sh', 'shell']);
  return bac((dir) => {
    fs.writeFileSync(path.join(dir, 'script.sh'), code);
    const r = lancer(dir, 'bash', ['-n', 'script.sh'], { timeout: 5000 });
    return r.status === 0 ? { pass: true, score: 1, reason: 'bash -n : syntaxe valide' } : echec(`bash -n : ${(r.stderr || '').slice(0, 300)}`);
  });
}

// Parses the YAML with PyYAML (safe_load), then runs vars.verif_py statements against `doc`.
function testerYaml(output, { vars }) {
  const code = extraire(output, ['yaml', 'yml']);
  return bac((dir) => {
    fs.writeFileSync(path.join(dir, 'fichier.yaml'), code);
    const harnais = `import json, yaml
ok, echecs = 0, []
tests = json.loads(${JSON.stringify(JSON.stringify(vars.verif_py || []))})
try:
    doc = yaml.safe_load(open("fichier.yaml", encoding="utf-8"))
except Exception as e:
    print(${JSON.stringify(MARQUE)} + json.dumps({"ok": 0, "total": len(tests) + 1, "echecs": ["YAML invalide : " + str(e)[:300]]}))
    raise SystemExit(0)
on = doc.get("on", doc.get(True)) if isinstance(doc, dict) else None
for t in tests:
    try:
        exec(t, globals())
        ok += 1
    except BaseException as e:
        echecs.append(t[:100] + " -> " + repr(e)[:200])
print(${JSON.stringify(MARQUE)} + json.dumps({"ok": ok + 1, "total": len(tests) + 1, "echecs": echecs}))
`;
    fs.writeFileSync(path.join(dir, 'harnais.py'), harnais);
    const res = resultat(lancer(dir, 'python3', ['-I', '-B', 'harnais.py']), MARQUE);
    if (res.erreur) return echec(res.erreur);
    return verdict(res.ok, res.total, res.echecs.join(' | ') || 'YAML valide, toutes les vérifications passent');
  });
}

// Brackets balanced outside strings and comments: the closest syntax check without nix-instantiate.
function nixEquilibre(output) {
  const code = extraire(output, ['nix']);
  const paires = { '}': '{', ']': '[', ')': '(' };
  const pile = [];
  let i = 0;
  while (i < code.length) {
    const c = code[i];
    if (c === '#') { while (i < code.length && code[i] !== '\n') i++; continue; }
    if (c === '/' && code[i + 1] === '*') { const f = code.indexOf('*/', i + 2); i = f < 0 ? code.length : f + 2; continue; }
    if (c === "'" && code[i + 1] === "'") { const f = code.indexOf("''", i + 2); if (f < 0) return echec('chaîne indentée non fermée'); i = f + 2; continue; }
    if (c === '"') { i++; while (i < code.length && code[i] !== '"') i += code[i] === '\\' ? 2 : 1; i++; continue; }
    if ('{[('.includes(c)) pile.push(c);
    else if (paires[c]) { if (pile.pop() !== paires[c]) return echec(`« ${c} » mal appairé vers le caractère ${i}`); }
    i++;
  }
  if (pile.length) return echec(`${pile.length} délimiteur(s) non fermé(s)`);
  if (!code.trim()) return echec('aucun code Nix');
  return { pass: true, score: 1, reason: 'délimiteurs équilibrés' };
}

function liens(md) {
  return [...md.matchAll(/\[\[([^\]|#]+)(?:[#|][^\]]*)?\]\]/g)].map((m) => m[1].trim());
}

function titres(md) {
  return md.split('\n').filter((l) => /^#{1,6}\s/.test(l)).map((l) => l.trim());
}

// Checks an edited note against vars.doc: kept links and headings, plus vars.doit_contenir / vars.ne_doit_pas_contenir.
function noteMarkdown(output, { vars }) {
  const note = extraire(output, ['markdown', 'md']);
  const controles = [];
  const retires = vars.liens_retires || [];
  for (const l of new Set(liens(vars.doc || ''))) {
    if (!retires.includes(l)) controles.push([`lien [[${l}]] conservé`, liens(note).includes(l)]);
  }
  const modifies = vars.titres_modifies || [];
  for (const t of titres(vars.doc || '')) {
    if (!modifies.includes(t)) controles.push([`titre « ${t} » conservé`, note.split('\n').some((l) => l.trim() === t)]);
  }
  for (const s of vars.doit_contenir || []) controles.push([`contient « ${s} »`, note.includes(s)]);
  for (const s of vars.ne_doit_pas_contenir || []) controles.push([`ne contient pas « ${s} »`, !note.includes(s)]);
  for (const r of vars.doit_correspondre || []) controles.push([`correspond à /${r}/`, new RegExp(r, 'm').test(note)]);
  // Strict diff: once the allowed added lines and the Statut line are set aside, the note must equal the original.
  if (vars.ajouts_seuls) {
    const ajouts = vars.ajouts_seuls.map((r) => new RegExp(r));
    const lignes = (md) => md.split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('**Statut :**'));
    const retraits = (vars.retraits_seuls || []).map((r) => new RegExp(r));
    const reste = lignes(note).filter((l) => !ajouts.some((r) => r.test(l)));
    const avant = lignes(vars.doc || '').filter((l) => !retraits.some((r) => r.test(l)));
    controles.push(['aucune autre modification', JSON.stringify(reste) === JSON.stringify(avant)]);
  }
  const rates = controles.filter(([, ok]) => !ok).map(([n]) => n);
  return verdict(controles.length - rates.length, controles.length, rates.length ? `raté : ${rates.join(' ; ')}` : 'note conforme');
}

// SKILL.md: YAML frontmatter with name (kebab-case) and description, then the sections in vars.sections.
function skillHermes(output, { vars }) {
  const skill = extraire(output, ['markdown', 'md']).replace(/^\s+/, '');
  const fm = skill.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fm) return echec('pas de frontmatter YAML en tête');
  return bac((dir) => {
    fs.writeFileSync(path.join(dir, 'fm.yaml'), fm[1]);
    const r = lancer(dir, 'python3', ['-I', '-B', '-c', `import json, yaml; print(${JSON.stringify(MARQUE)} + json.dumps(yaml.safe_load(open("fm.yaml", encoding="utf-8")), default=str))`]);
    let meta;
    try {
      meta = resultat(r, MARQUE);
    } catch {
      meta = null;
    }
    if (!meta || meta.erreur || typeof meta !== 'object') return echec(`frontmatter illisible : ${(r.stderr || '').slice(-300)}`);
    const corps = skill.slice(fm[0].length).replace(/’/g, "'");
    const controles = [
      ['name en kebab-case', typeof meta.name === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(meta.name) && meta.name.length <= 64],
      ['description de 20 à 1024 caractères', typeof meta.description === 'string' && meta.description.length >= 20 && meta.description.length <= 1024],
    ];
    if (vars.nom_attendu) controles.push([`name = ${vars.nom_attendu}`, meta.name === vars.nom_attendu]);
    for (const s of vars.sections || []) controles.push([`section « ## ${s} »`, new RegExp(`^##\\s+${s}\\s*$`, 'mi').test(corps)]);
    for (const s of vars.doit_contenir || []) controles.push([`mentionne « ${s} »`, corps.toLowerCase().includes(s.toLowerCase())]);
    for (const re of vars.doit_correspondre || []) controles.push([`correspond à /${re}/`, new RegExp(re, 'mi').test(corps)]);
    for (const re of vars.ne_doit_pas_correspondre || []) controles.push([`pas de /${re}/`, !new RegExp(re, 'mi').test(corps)]);
    const rates = controles.filter(([, ok]) => !ok).map(([n]) => n);
    return verdict(controles.length - rates.length, controles.length, rates.length ? `raté : ${rates.join(' ; ')}` : 'skill conforme');
  });
}

module.exports = { testerPython, testerC, testerJs, syntaxeBash, testerYaml, nixEquilibre, noteMarkdown, skillHermes, extraire, blocs };
