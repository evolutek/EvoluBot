// promptfoo provider for OmniRoute. It makes one attempt and reports failure at once: promptfoo's own
// provider sleeps for minutes on a 429, which would hold back the whole batch.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const DOSSIER = process.env.BENCH_REPONSES || path.join(__dirname, '..', 'resultats', 'reponses');
const DELAI_MS = Number(process.env.BENCH_DELAI_MS || 300000);
const limiteAtteinte = { modele: null, juge: null };

// promptfoo sleeps for minutes on any error that reads like a rate limit, so the status and the
// upstream text travel to lancer.py in letters only (hex with its digits mapped to g-p).
function masque(status, texte) {
  return Buffer.from(`${status} ${texte}`).toString('hex').replace(/[0-9]/g, (d) => 'ghijklmnop'[d]);
}

function messages(prompt) {
  try {
    const m = JSON.parse(prompt);
    if (Array.isArray(m)) return m;
  } catch {
    // a plain string: the judge's prompt can be either
  }
  return [{ role: 'user', content: prompt }];
}

function sortie(message) {
  if (message.tool_calls && message.tool_calls.length) {
    return { content: message.content || '', tool_calls: message.tool_calls };
  }
  return message.content || '';
}

class OmniRoute {
  constructor({ id, config = {} }) {
    this.config = config;
    this.ident = id || 'omniroute';
  }

  id() {
    return this.ident;
  }

  async callApi(prompt, context) {
    const juge = Boolean(this.config.juge);
    const role = juge ? 'juge' : 'modele';
    const model = juge ? process.env.BENCH_JUGE : this.config.model;
    if (limiteAtteinte[role]) return { error: `BENCH_SKIP ${role} ${limiteAtteinte[role]}` };

    const reglages = (context && context.prompt && context.prompt.config) || {};
    // Mistral refuses temperature 0 unless top_p is explicitly 1.
    const corps = { model, messages: messages(prompt), temperature: 0, top_p: 1, max_tokens: 4096 };
    if (reglages.tools) {
      // promptfoo leaves the file reference unresolved for a custom provider.
      corps.tools = JSON.parse(fs.readFileSync(path.resolve(this.config.basePath, reglages.tools.replace('file://', '')), 'utf8'));
      corps.tool_choice = reglages.tool_choice || 'auto';
    }

    // Answers are kept so that a case replayed after a judge failure spends no model quota.
    const repetition = juge ? 'juge' : process.env.BENCH_REP || '0';
    const cle = crypto.createHash('sha256').update(repetition + JSON.stringify(corps)).digest('hex');
    const fichier = path.join(DOSSIER, cle.slice(0, 2), `${cle}.json`);
    if (fs.existsSync(fichier)) return { ...JSON.parse(fs.readFileSync(fichier, 'utf8')), cached: true };

    const debut = Date.now();
    let reponse;
    let texte;
    try {
      reponse = await fetch(`${process.env.OMNIROUTE_URL}/chat/completions`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${process.env.OMNIROUTE_BENCH_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(corps),
        signal: AbortSignal.timeout(DELAI_MS),
      });
      texte = await reponse.text();
    } catch (e) {
      return { error: `BENCH_RESEAU ${role} ${e.message}` };
    }
    if (!reponse.ok) {
      if ([401, 402, 403, 404, 429].includes(reponse.status) || reponse.status >= 500) {
        limiteAtteinte[role] = masque(reponse.status, texte.slice(0, 300));
      }
      return { error: `BENCH_HTTP ${role} ${masque(reponse.status, texte.slice(0, 500))}` };
    }

    let message;
    let usage;
    try {
      const donnees = JSON.parse(texte);
      message = donnees.choices[0].message;
      usage = donnees.usage || {};
    } catch {
      return { error: `BENCH_HTTP ${role} ${masque(502, `réponse illisible : ${texte.slice(0, 200)}`)}` };
    }
    const resultat = {
      output: sortie(message),
      latencyMs: Date.now() - debut,
      tokenUsage: { prompt: usage.prompt_tokens, completion: usage.completion_tokens, total: usage.total_tokens },
    };
    fs.mkdirSync(path.dirname(fichier), { recursive: true });
    const provisoire = `${fichier}.${process.pid}`;
    fs.writeFileSync(provisoire, JSON.stringify(resultat));
    fs.renameSync(provisoire, fichier);
    return resultat;
  }
}

module.exports = OmniRoute;
