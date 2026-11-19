// Theme B graders: they read the final « Réponse : … » line the prompt asks for.

function texte(output) {
  if (typeof output === 'string') return output;
  if (output && typeof output.content === 'string') return output.content;
  return JSON.stringify(output ?? '');
}

function sansAccents(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

// Everything after the last « Réponse : », markdown emphasis removed.
function finale(output, multiligne = false) {
  const s = texte(output);
  const re = /r[ée]ponse(?:\s+finale)?\s*\**\s*:\s*\**/gi;
  let m;
  let pos = -1;
  while ((m = re.exec(s))) pos = m.index + m[0].length;
  if (pos < 0) return null;
  let r = s.slice(pos);
  if (!multiligne) r = r.split('\n')[0];
  return r.replace(/[*`«»  ]/g, ' ').trim().replace(/\.$/, '').trim();
}

function verdict(pass, raison) {
  return { pass, score: pass ? 1 : 0, reason: raison };
}

function nombreFrancais(s) {
  const compact = s.replace(/(\d)[\s  ](?=\d{3}(\D|$))/g, '$1');
  const m = compact.match(/-?\d+(?:[.,]\d+)?/);
  return m ? Number(m[0].replace(',', '.')) : NaN;
}

// vars.nombre (+ vars.tolerance), vars.reponse_motif (regex) or vars.motifs_reponse (all regexes must match).
function reponse(output, { vars }) {
  const r = finale(output);
  if (r === null) return verdict(false, 'pas de ligne « Réponse : »');
  if (vars.nombre !== undefined) {
    const n = nombreFrancais(r);
    const tol = vars.tolerance ?? 0.005;
    const ok = Math.abs(n - vars.nombre) <= tol;
    return verdict(ok, `${ok ? 'exact' : 'faux'} : lu ${n}, attendu ${vars.nombre}`);
  }
  const motifs = vars.motifs_reponse || [vars.reponse_motif];
  const manquants = motifs.filter((m) => !new RegExp(m, 'i').test(r));
  return verdict(manquants.length === 0, manquants.length ? `« ${r} » ne correspond pas à ${manquants.join(' ; ')}` : `« ${r} » correct`);
}

// vars.noms_possibles: names to look for in the answer; vars.noms_attendus: exactly those must appear.
function ensembleNoms(output, { vars }) {
  const r = finale(output);
  if (r === null) return verdict(false, 'pas de ligne « Réponse : »');
  const n = sansAccents(r);
  const trouves = vars.noms_possibles.filter((x) => new RegExp(`\\b${sansAccents(x)}\\b`).test(n));
  const attendus = [...vars.noms_attendus].sort();
  const ok = JSON.stringify([...trouves].sort()) === JSON.stringify(attendus);
  return verdict(ok, `trouvés ${trouves.join(', ') || 'aucun'} ; attendus ${attendus.join(', ')}`);
}

// vars.ordre: labels in the expected order; their first appearance in the answer must follow it.
function ordre(output, { vars }) {
  const r = finale(output);
  if (r === null) return verdict(false, 'pas de ligne « Réponse : »');
  const positions = vars.ordre.map((l) => {
    const m = new RegExp(`(^|[^\\p{L}\\p{N}])${l.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^\\p{L}\\p{N}])`, 'u').exec(r);
    return [l, m ? m.index : -1];
  });
  const absents = positions.filter(([, p]) => p < 0).map(([l]) => l);
  if (absents.length) return verdict(false, `absents de « ${r} » : ${absents.join(', ')}`);
  const lu = [...positions].sort((a, b) => a[1] - b[1]).map(([l]) => l);
  const ok = JSON.stringify(lu) === JSON.stringify(vars.ordre);
  return verdict(ok, `lu ${lu.join(' > ')}, attendu ${vars.ordre.join(' > ')}`);
}

function jsonFinal(output) {
  const r = finale(output, true);
  if (r === null) return null;
  const debut = r.indexOf('{');
  const fin = r.lastIndexOf('}');
  if (debut < 0 || fin < debut) return null;
  try {
    return JSON.parse(r.slice(debut, fin + 1));
  } catch {
    return null;
  }
}

function valeur(obj, cle) {
  return cle.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function jours(a, b) {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000);
}

function jourIso(date) {
  const j = new Date(`${date}T00:00:00Z`).getUTCDay();
  return j === 0 ? 7 : j;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// vars.contraintes: rules checked on the JSON object that follows « Réponse : ».
// { cle, egal } | { cle, dans: [] } | { cle, pas_dans: [] } | { cle, min, max } | { cle, jours_semaine: [1..7] }
// | { ecart_min: [a, b, n] } (b at least n days after a) | { distincts: [cles] }
function contraintes(output, { vars }) {
  const obj = jsonFinal(output);
  if (!obj) return verdict(false, 'pas d’objet JSON lisible après « Réponse : »');
  const erreurs = [];
  for (const c of vars.contraintes) {
    if (c.ecart_min) {
      const [a, b, n] = c.ecart_min;
      const [va, vb] = [valeur(obj, a), valeur(obj, b)];
      if (!DATE.test(va) || !DATE.test(vb) || jours(va, vb) < n) erreurs.push(`${b} doit suivre ${a} d'au moins ${n} j (${va} → ${vb})`);
      continue;
    }
    if (c.distincts) {
      const vs = c.distincts.map((k) => JSON.stringify(valeur(obj, k)));
      if (new Set(vs).size !== vs.length) erreurs.push(`${c.distincts.join(', ')} doivent être distincts`);
      continue;
    }
    const v = valeur(obj, c.cle);
    const norm = (x) => (typeof x === 'string' ? sansAccents(x.trim()) : JSON.stringify(x));
    if ('egal' in c && norm(v) !== norm(c.egal)) erreurs.push(`${c.cle} = ${JSON.stringify(v)}, attendu ${JSON.stringify(c.egal)}`);
    if (c.dans && !c.dans.map(norm).includes(norm(v))) erreurs.push(`${c.cle} = ${JSON.stringify(v)} hors de ${JSON.stringify(c.dans)}`);
    if (c.pas_dans && c.pas_dans.map(norm).includes(norm(v))) erreurs.push(`${c.cle} = ${JSON.stringify(v)} interdit`);
    if (c.min !== undefined && !(v >= c.min)) erreurs.push(`${c.cle} = ${JSON.stringify(v)} < ${c.min}`);
    if (c.max !== undefined && !(v <= c.max)) erreurs.push(`${c.cle} = ${JSON.stringify(v)} > ${c.max}`);
    if (c.jours_semaine && !(DATE.test(v) && c.jours_semaine.includes(jourIso(v)))) {
      erreurs.push(`${c.cle} = ${JSON.stringify(v)} hors des jours ${c.jours_semaine.join(',')}`);
    }
  }
  return verdict(erreurs.length === 0, erreurs.length ? erreurs.join(' ; ') : 'toutes les contraintes respectées');
}

module.exports = { reponse, ensembleNoms, ordre, contraintes };
