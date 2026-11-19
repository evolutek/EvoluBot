// Graders for theme D. Parameters come from the assertion's `config`.

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

const mots = (t) => String(t).split(/\s+/).filter((m) => /[\p{L}\p{N}]/u.test(m)).length;

// The source text is the `doc` var; the answer must keep at most `ratio` of its words.
function concision(output, context) {
  const c = context.config || {};
  const source = mots(context.vars.doc || '');
  const n = mots(output);
  const echecs = [];
  if (c.ratio != null && n > source * c.ratio) echecs.push(`${n} mots pour ${source} dans la source (max ${Math.floor(source * c.ratio)})`);
  if (c.maxCaracteres != null && String(output).trim().length > c.maxCaracteres) echecs.push(`${String(output).trim().length} caractères > ${c.maxCaracteres}`);
  if (n < 5) echecs.push('réponse vide');
  return { pass: echecs.length === 0, score: echecs.length ? 0 : 1, reason: echecs.join(' ; ') || `${n} mots pour ${source}` };
}

module.exports = { francais, concision };
