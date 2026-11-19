// Tool-call graders shared by the themes that declare tools.
// promptfoo hands tool calls back as an array, an object with tool_calls, or a JSON string depending on the provider.
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

function normalise(appel) {
  const f = appel.function || appel;
  let args = f.arguments;
  if (typeof args === 'string') {
    try {
      args = JSON.parse(args);
    } catch {
      args = null;
    }
  }
  return { nom: f.name, args };
}

function lus(output) {
  return appels(output).map(normalise);
}

// Expected arguments are a subset: only the listed keys are compared.
function contient(args, attendu) {
  return Object.entries(attendu || {}).every(
    ([cle, valeur]) => args && JSON.stringify(args[cle]) === JSON.stringify(valeur),
  );
}

function verdict(pass, raison) {
  return { pass, score: pass ? 1 : 0, reason: raison };
}

// vars.attendu = { nom, arguments }
function outilAttendu(output, { vars }) {
  const calls = lus(output);
  const { nom, arguments: args } = vars.attendu;
  const ok = calls.some((c) => c.nom === nom && contient(c.args, args));
  return verdict(ok, ok ? `${nom} appelé correctement` : `attendu ${nom} ${JSON.stringify(args || {})}, reçu ${JSON.stringify(calls)}`);
}

// vars.attendus = [{ nom, arguments }, ...], all of them in the same turn
function ensembleOutils(output, { vars }) {
  const calls = lus(output);
  const manquants = vars.attendus.filter((a) => !calls.some((c) => c.nom === a.nom && contient(c.args, a.arguments)));
  return verdict(manquants.length === 0, manquants.length ? `manquants : ${JSON.stringify(manquants)}` : 'tous les appels attendus');
}

function aucunOutil(output) {
  const calls = lus(output);
  return verdict(calls.length === 0, calls.length ? `appels injustifiés : ${JSON.stringify(calls)}` : 'aucun appel');
}

// vars.interdits = ['kick_membre', ...]
function outilsInterdits(output, { vars }) {
  const fautifs = lus(output).filter((c) => vars.interdits.includes(c.nom));
  return verdict(fautifs.length === 0, fautifs.length ? `appel interdit : ${JSON.stringify(fautifs)}` : 'aucun appel interdit');
}

// vars.max_appels: no more calls than this in the turn
function auPlus(output, { vars }) {
  const n = lus(output).length;
  return verdict(n <= vars.max_appels, `${n} appel(s), maximum ${vars.max_appels}`);
}

module.exports = { outilAttendu, ensembleOutils, aucunOutil, outilsInterdits, auPlus };
