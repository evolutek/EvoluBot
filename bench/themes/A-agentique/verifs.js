// Theme A graders that bench/lib/outils.js does not cover: JSON-schema validation, regex on arguments,
// exact counts, forbidden argument sets, alternatives.
const fs = require('fs');
const path = require('path');

// js-yaml and ajv ship with promptfoo; resolve them from the running promptfoo, since bench/ has no node_modules.
function dependance(nom) {
  const bases = [process.argv[1], require.main && require.main.filename, __dirname].filter(Boolean);
  for (const base of bases) {
    try {
      return require(require.resolve(nom, { paths: [path.dirname(fs.realpathSync(base))] }));
    } catch {}
  }
  throw new Error(`${nom} introuvable : lancer le banc avec promptfoo`);
}

function appels(output) {
  if (Array.isArray(output)) return output;
  if (output && Array.isArray(output.tool_calls)) return output.tool_calls;
  if (typeof output === 'string') {
    try {
      return appels(JSON.parse(output));
    } catch {
      return [];
    }
  }
  return [];
}

function lus(output) {
  return appels(output).map((appel) => {
    const f = appel.function || appel;
    let args = f.arguments;
    if (typeof args === 'string') {
      try {
        args = JSON.parse(args);
      } catch {
        args = undefined;
      }
    }
    return { nom: f.name, args };
  });
}

function contient(args, attendu) {
  return Object.entries(attendu || {}).every(
    ([cle, valeur]) => args && JSON.stringify(args[cle]) === JSON.stringify(valeur),
  );
}

function verdict(pass, raison) {
  return { pass, score: pass ? 1 : 0, reason: raison };
}

let validateurs;
function schemas() {
  if (validateurs) return validateurs;
  const yaml = dependance('js-yaml');
  const Ajv = dependance('ajv');
  const ajv = new (Ajv.default || Ajv)({ strict: false, allErrors: true });
  ajv.addFormat('date', /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/);
  const outils = yaml.load(fs.readFileSync(path.join(__dirname, 'outils.yaml'), 'utf8'));
  validateurs = {};
  for (const { function: f } of outils) {
    validateurs[f.name] = ajv.compile({ ...f.parameters, additionalProperties: false });
  }
  return validateurs;
}

// Every call validates against its tool schema. vars.appel_facultatif: true lets "no call" pass.
function argumentsConformes(output, { vars }) {
  const calls = lus(output);
  if (calls.length === 0) {
    return verdict(Boolean(vars.appel_facultatif), 'aucun appel d’outil');
  }
  const v = schemas();
  const erreurs = [];
  for (const c of calls) {
    if (c.args === undefined) erreurs.push(`${c.nom} : arguments non JSON`);
    else if (!v[c.nom]) erreurs.push(`${c.nom} : outil inconnu`);
    else if (!v[c.nom](c.args)) {
      erreurs.push(`${c.nom} : ${v[c.nom].errors.map((e) => `${e.instancePath || '/'} ${e.message}`).join(', ')}`);
    }
  }
  return verdict(erreurs.length === 0, erreurs.length ? erreurs.join(' ; ') : 'arguments conformes au schéma');
}

// vars.motifs = { nom, champs: { cle: "regex" } }: one call to nom whose fields match (case-insensitive).
function champsMotifs(output, { vars }) {
  const { nom, champs } = vars.motifs;
  const ok = lus(output).some(
    (c) => c.nom === nom && c.args && Object.entries(champs).every(([k, re]) => new RegExp(re, 'i').test(String(c.args[k] ?? ''))),
  );
  return verdict(ok, ok ? `${nom} conforme aux motifs` : `aucun appel ${nom} conforme à ${JSON.stringify(champs)} : ${JSON.stringify(lus(output))}`);
}

// vars.compte = { outil: n, ... }: exactly n calls to each listed tool.
function compteOutils(output, { vars }) {
  const calls = lus(output);
  const ecarts = Object.entries(vars.compte)
    .map(([nom, n]) => [nom, n, calls.filter((c) => c.nom === nom).length])
    .filter(([, n, recu]) => n !== recu);
  return verdict(ecarts.length === 0, ecarts.length ? ecarts.map(([nom, n, recu]) => `${nom} : ${recu} au lieu de ${n}`).join(', ') : 'nombre d’appels exact');
}

// vars.exclus = [{ nom, arguments }]: none of these calls may appear (e.g. repeating a failed call).
function appelsExclus(output, { vars }) {
  const fautifs = lus(output).filter((c) => vars.exclus.some((e) => c.nom === e.nom && contient(c.args, e.arguments)));
  return verdict(fautifs.length === 0, fautifs.length ? `appel à éviter : ${JSON.stringify(fautifs)}` : 'aucun appel à éviter');
}

// vars.alternatives = [{ nom, arguments }]: at least one of them is called.
function unParmi(output, { vars }) {
  const calls = lus(output);
  const ok = vars.alternatives.some((a) => calls.some((c) => c.nom === a.nom && contient(c.args, a.arguments)));
  return verdict(ok, ok ? 'une des actions attendues' : `aucune de ${JSON.stringify(vars.alternatives)} : ${JSON.stringify(calls)}`);
}

// Plain-text answer (no tool call) matching vars.texte_motif (case-insensitive regex).
function texte(output, { vars }) {
  if (lus(output).length) return verdict(false, 'appel d’outil au lieu d’une réponse');
  const s = typeof output === 'string' ? output : (output && output.content) || '';
  const ok = s.trim().length > 0 && (!vars.texte_motif || new RegExp(vars.texte_motif, 'i').test(s));
  return verdict(ok, ok ? 'réponse texte attendue' : `réponse sans le motif ${vars.texte_motif || '(non vide)'}`);
}

module.exports = { argumentsConformes, champsMotifs, compteOutils, appelsExclus, unParmi, texte };
