// Graders for theme I. Parameters come from the assertion's `config`.

const FR = new Set(
  'le la les un une des du de et est sont pour pas que qui dans sur avec au aux ce cette ces tu te ton ta tes vous votre nous il elle ils je mais ou donc car ne plus très bien oui non merci salut bonjour à été être avoir fait peux peut faut'.split(' '),
);
const EN = new Set(
  'the an and is are to of in for with you your it this that be have has not but or we they can will what when where yes thanks hello hi please do does would should my our from'.split(' '),
);

function francais(output) {
  const jetons = String(output).toLowerCase().match(/[a-zàâäçéèêëîïôöùûüÿœ]+/g) || [];
  const fr = jetons.filter((j) => FR.has(j)).length;
  const en = jetons.filter((j) => EN.has(j)).length;
  const ok = fr >= 3 && fr > 2 * en;
  return { pass: ok, score: ok ? 1 : 0, reason: `mots outils fr=${fr} en=${en}` };
}

const sansAccents = (t) => t.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

// Exactly one "Catégorie : <label>" line, matching config.attendu (accents and markdown bold ignored).
function categorie(output, context) {
  const lignes = String(output).match(/^[\s*_]*Cat[ée]gorie[\s*_]*:[\s*_]*([\p{L}-]+)/gimu) || [];
  if (lignes.length !== 1) return { pass: false, score: 0, reason: `${lignes.length} ligne(s) « Catégorie : »` };
  const label = sansAccents(lignes[0].replace(/^[\s\S]*:[\s*_]*/, ''));
  const ok = label === sansAccents(context.config.attendu);
  return { pass: ok, score: ok ? 1 : 0, reason: `catégorie « ${label} », attendu « ${context.config.attendu} »` };
}

// One short question, ending with "?" (a trailing emoji is tolerated).
function question(output, context) {
  const max = (context.config && context.config.motsMax) || 50;
  const texte = String(output).trim().replace(/[\s\p{Extended_Pictographic}️]+$/u, '');
  const n = texte.split(/\s+/).length;
  const questions = (texte.match(/\?/g) || []).length;
  const echecs = [];
  if (!texte.endsWith('?')) echecs.push('ne finit pas par « ? »');
  if (questions > 2) echecs.push(`${questions} questions au lieu d'une`);
  if (n > max) echecs.push(`${n} mots > ${max}`);
  return { pass: echecs.length === 0, score: echecs.length ? 0 : 1, reason: echecs.join(' ; ') || 'une question courte' };
}

function vouvoie(output) {
  const t = String(output);
  const tu = t.match(/(^|[^\p{L}])(tu|toi|ton|ta|tes|t[’'])(?=$|[^\p{L}])/giu) || [];
  const vous = /(^|[^\p{L}])(vous|votre|vos)($|[^\p{L}])/iu.test(t);
  const ok = vous && tu.length === 0;
  return { pass: ok, score: ok ? 1 : 0, reason: ok ? 'vouvoiement tenu' : `tutoiement relevé : ${tu.map((x) => x.trim()).join(', ') || 'aucun « vous »'}` };
}

module.exports = { francais, categorie, question, vouvoie };
