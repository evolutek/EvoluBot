// Text and JSON graders shared by themes E, F and J.
// Expectations live in vars.controle: promptfoo would expand a top-level array var into one test per element.
// Patterns are regex sources matched case-insensitively and accent-insensitively; an array means "any of".

const sansAccents = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Reasoning models may leak their thinking block into the output.
function texte(output) {
  const t = typeof output === 'string' ? output : JSON.stringify(output);
  return sansAccents(t.replace(/<think>[\s\S]*?<\/think>/g, ''));
}

function trouve(t, motif) {
  const alternatives = Array.isArray(motif) ? motif : [motif];
  return alternatives.some((m) => new RegExp(sansAccents(m), 'i').test(t));
}

const affiche = (motif) => (Array.isArray(motif) ? motif.join(' | ') : motif);

function verdict(score, seuil, raison) {
  return { pass: score >= seuil, score, reason: raison };
}

// vars.faits: patterns that must all appear; vars.seuil: share required (default 1)
function faits(output, { vars: { controle: vars } }) {
  const t = texte(output);
  const manquants = vars.faits.filter((f) => !trouve(t, f));
  const score = (vars.faits.length - manquants.length) / vars.faits.length;
  return verdict(score, vars.seuil ?? 1, manquants.length ? `faits manquants : ${manquants.map(affiche).join(' ; ')}` : 'tous les faits présents');
}

// vars.absents: planted facts that are not in the source and must not appear
function absents(output, { vars: { controle: vars } }) {
  const t = texte(output);
  const inventes = vars.absents.filter((f) => trouve(t, f));
  return verdict(inventes.length ? 0 : 1, 1, inventes.length ? `faits inventés : ${inventes.map(affiche).join(' ; ')}` : 'aucun fait planté repris');
}

function extraitJson(output) {
  if (output && typeof output === 'object') return output;
  const t = String(output).replace(/<think>[\s\S]*?<\/think>/g, '');
  const bloc = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  const brut = bloc ? bloc[1] : t;
  const debut = brut.search(/[[{]/);
  const fin = Math.max(brut.lastIndexOf('}'), brut.lastIndexOf(']'));
  if (debut < 0 || fin < debut) return undefined;
  try {
    return JSON.parse(brut.slice(debut, fin + 1));
  } catch {
    return undefined;
  }
}

const normalise = (v) => sansAccents(v).toLowerCase().replace(/[\s\-_.]/g, '');

function nombre(v) {
  if (typeof v === 'number') return v;
  if (typeof v !== 'string') return NaN;
  return Number(v.replace(/[€\s]/g, '').replace(',', '.'));
}

// attendu: number (to the cent), string (normalised equality), null (absent or null), or { motif } for a pattern
function egal(recu, attendu) {
  if (attendu === null) return recu === null || recu === undefined || recu === '';
  if (typeof attendu === 'number') return Math.abs(nombre(recu) - attendu) < 0.006;
  if (attendu && typeof attendu === 'object' && 'motif' in attendu) return recu != null && trouve(sansAccents(String(recu)), attendu.motif);
  return recu != null && normalise(recu) === normalise(attendu);
}

// vars.attendu: { champ: valeur }; dotted keys reach nested fields ("lignes.0.quantite")
function champs(output, { vars: { controle: vars } }) {
  const json = extraitJson(output);
  if (json === undefined) return { pass: false, score: 0, reason: 'pas de JSON lisible' };
  const cles = Object.keys(vars.attendu);
  const faux = cles.filter((c) => !egal(c.split('.').reduce((o, k) => (o == null ? undefined : o[k]), json), vars.attendu[c]));
  const score = (cles.length - faux.length) / cles.length;
  return verdict(score, vars.seuil ?? 1, faux.length ? `champs faux : ${faux.map((c) => `${c} (attendu ${JSON.stringify(vars.attendu[c])})`).join(', ')}` : 'tous les champs exacts');
}

// Meeting minutes as { decisions: [string], actions: [{ tache, responsable, echeance }] }.
// vars.decisions: patterns; vars.actions: [{ tache, responsable, echeance? }] with patterns, echeance exact or null;
// vars.decisions_annulees: patterns of reversed decisions that must not be listed;
// vars.actions_interdites: [{ tache, responsable }] reassigned actions that must not keep their former owner; vars.seuil (default 1).
function compteRendu(output, { vars: { controle: vars } }) {
  const json = extraitJson(output);
  if (!json || !Array.isArray(json.decisions) || !Array.isArray(json.actions)) {
    return { pass: false, score: 0, reason: 'JSON sans tableaux decisions et actions' };
  }
  const decisions = json.decisions.map((d) => texte(typeof d === 'string' ? d : JSON.stringify(d)));
  const actions = json.actions.map((a) => ({
    tache: texte(a.tache ?? ''),
    responsable: texte(a.responsable ?? ''),
    echeance: a.echeance ?? null,
  }));
  const ecarts = [];
  for (const d of vars.decisions || []) if (!decisions.some((x) => trouve(x, d))) ecarts.push(`décision manquante : ${affiche(d)}`);
  for (const a of vars.actions || []) {
    const ok = actions.some(
      (x) => trouve(x.tache, a.tache) && trouve(x.responsable, a.responsable) && (!('echeance' in a) || egal(x.echeance, a.echeance)),
    );
    if (!ok) ecarts.push(`action manquante : ${affiche(a.tache)} / ${affiche(a.responsable)}${'echeance' in a ? ` / ${a.echeance}` : ''}`);
  }
  const total = (vars.decisions || []).length + (vars.actions || []).length;
  let score = (total - ecarts.length) / total;
  for (const d of vars.decisions_annulees || []) {
    if (decisions.some((x) => trouve(x, d))) {
      ecarts.push(`décision annulée reprise : ${affiche(d)}`);
      score = 0;
    }
  }
  for (const a of vars.actions_interdites || []) {
    if (actions.some((x) => trouve(x.tache, a.tache) && trouve(x.responsable, a.responsable))) {
      ecarts.push(`action réattribuée laissée à l'ancien responsable : ${affiche(a.tache)} / ${affiche(a.responsable)}`);
      score = 0;
    }
  }
  return verdict(score, vars.seuil ?? 1, ecarts.length ? ecarts.join(' ; ') : 'décisions et actions retrouvées');
}

// Forced label lines. vars.etiquette: single expected label on a "CATÉGORIE : x" line;
// vars.etiquettes: { "1": "x", ... } expected on lines "1 : x".
function etiquettes(output, { vars: { controle: vars } }) {
  const lignes = texte(output).split('\n').map((l) => l.replace(/[*_`]/g, '').trim()).filter(Boolean);
  if (vars.etiquette !== undefined) {
    const derniere = lignes[lignes.length - 1] || '';
    const m = derniere.match(/^categorie\s*:\s*([\p{L}-]+)\s*$/iu);
    if (!m) return { pass: false, score: 0, reason: `dernière ligne hors format : « ${derniere} »` };
    const ok = normalise(m[1]) === normalise(vars.etiquette);
    return { pass: ok, score: ok ? 1 : 0, reason: `reçu ${m[1]}, attendu ${vars.etiquette}` };
  }
  const recues = {};
  for (const l of lignes) {
    const m = l.match(/^(\d+)\s*[:.)–-]\s*([\p{L}-]+)\s*$/u);
    if (m) recues[m[1]] = m[2];
  }
  const cles = Object.keys(vars.etiquettes);
  const faux = cles.filter((k) => !recues[k] || normalise(recues[k]) !== normalise(vars.etiquettes[k]));
  const score = (cles.length - faux.length) / cles.length;
  return verdict(score, vars.seuil ?? 1, faux.length ? `faux : ${faux.map((k) => `${k} (reçu ${recues[k] ?? 'rien'}, attendu ${vars.etiquettes[k]})`).join(', ')}` : 'toutes les étiquettes justes');
}

// Answer on a "RÉPONSE : ..." line. vars.juste: patterns all required on that line; vars.faux: patterns forbidden on it.
function reponse(output, { vars: { controle: vars } }) {
  const lignes = texte(output).split('\n').map((l) => l.replace(/[*_`]/g, '').trim());
  const ligne = lignes.filter((l) => /^reponse\s*:/i.test(l)).pop();
  if (!ligne) return { pass: false, score: 0, reason: 'pas de ligne RÉPONSE' };
  const manquants = (vars.juste || []).filter((m) => !trouve(ligne, m));
  const pieges = (vars.faux || []).filter((m) => trouve(ligne, m));
  const ok = manquants.length === 0 && pieges.length === 0;
  return {
    pass: ok,
    score: ok ? 1 : 0,
    reason: ok ? `juste : ${ligne}` : `« ${ligne} » — manque ${manquants.map(affiche).join(', ') || 'rien'}, piège ${pieges.map(affiche).join(', ') || 'aucun'}`,
  };
}

// Conflicts as { conflits: [{ sujet, versions, resolu?, valeur_retenue? }] }.
// vars.conflits: [{ motif, resolu?, valeur? }] each matched against one entry; vars.max_conflits caps false alarms.
function conflits(output, { vars: { controle: vars } }) {
  const json = extraitJson(output);
  const liste = json && Array.isArray(json.conflits) ? json.conflits : null;
  if (!liste) return { pass: false, score: 0, reason: 'JSON sans tableau conflits' };
  const entrees = liste.map((c) => ({ c, t: texte(JSON.stringify(c)) }));
  const ecarts = [];
  for (const attendu of vars.conflits) {
    const e = entrees.find((x) => trouve(x.t, attendu.motif));
    if (!e) {
      ecarts.push(`conflit manquant : ${affiche(attendu.motif)}`);
      continue;
    }
    if ('resolu' in attendu && Boolean(e.c.resolu) !== attendu.resolu) ecarts.push(`${affiche(attendu.motif)} : resolu attendu ${attendu.resolu}`);
    if ('valeur' in attendu && !egal(e.c.valeur_retenue, attendu.valeur)) ecarts.push(`${affiche(attendu.motif)} : valeur_retenue attendue ${JSON.stringify(attendu.valeur)}`);
  }
  if (vars.max_conflits !== undefined && liste.length > vars.max_conflits) ecarts.push(`${liste.length} conflits signalés, ${vars.max_conflits} au plus`);
  const score = ecarts.length ? Math.max(0, 1 - ecarts.length / (vars.conflits.length + 1)) : 1;
  return { pass: ecarts.length === 0, score, reason: ecarts.length ? ecarts.join(' ; ') : 'conflits exacts' };
}

module.exports = { faits, absents, champs, compteRendu, etiquettes, reponse, conflits, extraitJson };
