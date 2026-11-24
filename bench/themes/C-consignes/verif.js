// Graders for theme C. Each takes its parameters from the assertion's `config`.

const FR = new Set(
  'le la les un une des du de et est sont pour pas que qui dans sur avec au aux ce cette ces tu te ton ta tes vous votre nous il elle ils je mais ou donc car ne plus très bien oui non merci salut bonjour à été être avoir fait peux peut faut club local jeudi'.split(' '),
);
const EN = new Set(
  'the an and is are to of in for with you your it this that be have has not but or we they can will what when where yes thanks hello hi please do does would should my our from'.split(' '),
);

function mots(texte) {
  return texte.split(/\s+/).filter((m) => /[\p{L}\p{N}]/u.test(m));
}

function langue(texte) {
  const jetons = texte.toLowerCase().match(/[a-zàâäçéèêëîïôöùûüÿœ]+/g) || [];
  let fr = 0;
  let en = 0;
  for (const j of jetons) {
    if (FR.has(j)) fr++;
    if (EN.has(j)) en++;
  }
  if (fr >= 3 && fr > 2 * en) return { code: 'fr', fr, en };
  if (en >= 3 && en > 2 * fr) return { code: 'en', fr, en };
  return { code: '?', fr, en };
}

function francais(output) {
  const l = langue(String(output));
  return { pass: l.code === 'fr', score: l.code === 'fr' ? 1 : 0, reason: `mots outils fr=${l.fr} en=${l.en}` };
}

const PUCE = /^\s*(?:[-*•+]|\d+[.)])\s+/;
const PUCE_NUM = /^\s*\d+[.)]\s+/;

function mot(m) {
  return new RegExp(`(^|[^\\p{L}])${m.replace(/[.*+?^$()|[\]\\]/g, '\\$&')}($|[^\\p{L}])`, 'iu');
}

function bilan(echecs, total) {
  return {
    pass: echecs.length === 0,
    score: total ? (total - echecs.length) / total : 1,
    reason: echecs.length ? echecs.join(' ; ') : 'toutes les contraintes tenues',
  };
}

function contraintes(output, context) {
  const c = context.config || {};
  const texte = String(output).trim();
  const lignes = texte.split('\n').filter((l) => l.trim());
  const puces = lignes.filter((l) => PUCE.test(l));
  const n = mots(texte).length;
  const echecs = [];
  let total = 0;
  const verifie = (ok, msg) => {
    total++;
    if (!ok) echecs.push(msg);
  };

  if (c.motsMin != null) verifie(n >= c.motsMin, `${n} mots < ${c.motsMin}`);
  if (c.motsMax != null) verifie(n <= c.motsMax, `${n} mots > ${c.motsMax}`);
  if (c.puces != null) verifie(puces.length === c.puces, `${puces.length} puces au lieu de ${c.puces}`);
  if (c.pucesNumerotees) verifie(puces.every((l) => PUCE_NUM.test(l)), 'puces non numérotées');
  if (c.seulementPuces) verifie(lignes.length === puces.length, `${lignes.length - puces.length} ligne(s) hors liste`);
  if (c.motsParPuceMax != null) {
    const longues = puces.filter((l) => mots(l.replace(PUCE, '')).length > c.motsParPuceMax);
    verifie(longues.length === 0, `${longues.length} puce(s) de plus de ${c.motsParPuceMax} mots`);
  }
  if (c.pucesCommencentPar) {
    const lettre = c.pucesCommencentPar.toLowerCase();
    const mauvaises = puces.filter((l) => !l.replace(PUCE, '').replace(/^[*_`]+/, '').toLowerCase().startsWith(lettre));
    verifie(mauvaises.length === 0, `${mauvaises.length} puce(s) ne commencent pas par ${c.pucesCommencentPar}`);
  }
  for (const m of c.interdits || []) verifie(!mot(m).test(texte), `mot interdit « ${m} »`);
  for (const s of c.interditsSousChaine || []) verifie(!texte.toLowerCase().includes(s.toLowerCase()), `contient « ${s} »`);
  for (const s of c.caracteresInterdits || []) verifie(!texte.includes(s), `caractère interdit « ${s} »`);
  for (const s of c.obligatoires || []) verifie(texte.toLowerCase().includes(s.toLowerCase()), `manque « ${s} »`);
  if (c.minuscules) verifie(!/\p{Lu}/u.test(texte), 'contient des majuscules');
  if (c.commencePar) verifie(texte.startsWith(c.commencePar), `ne commence pas par « ${c.commencePar} »`);
  if (c.finitPar) verifie(texte.endsWith(c.finitPar), `ne finit pas par « ${c.finitPar} »`);
  const paragraphes = texte.split(/\n\s*\n/).filter((p) => p.trim());
  if (c.paragraphes != null) verifie(paragraphes.length === c.paragraphes, `${paragraphes.length} paragraphes au lieu de ${c.paragraphes}`);
  (c.paragraphesCommencentPar || []).forEach((debut, i) => {
    verifie((paragraphes[i] || '').trim().startsWith(debut), `paragraphe ${i + 1} ne commence pas par « ${debut} »`);
  });
  if (c.phrasesMax != null) {
    const phrases = texte.split(/[.!?…]+(?:\s|$)/).filter((p) => /\p{L}/u.test(p)).length;
    verifie(phrases <= c.phrasesMax, `${phrases} phrases > ${c.phrasesMax}`);
  }
  if (c.langue) verifie(langue(texte).code === c.langue, `langue détectée ${langue(texte).code} au lieu de ${c.langue}`);
  return bilan(echecs, total);
}

function discord(output, context) {
  const c = context.config || {};
  const texte = String(output);
  const echecs = [];
  let total = 0;
  const verifie = (ok, msg) => {
    total++;
    if (!ok) echecs.push(msg);
  };
  const horsCode = texte.replace(/```[\s\S]*?```/g, '');

  verifie(texte.length <= (c.maxCaracteres || 2000), `${texte.length} caractères > ${c.maxCaracteres || 2000}`);
  verifie(!/^\s*\|.*\|\s*$/m.test(horsCode) && !/^\s*\|?\s*:?-{3,}:?\s*\|/m.test(horsCode), 'tableau Markdown');
  verifie(!/^#{4,}\s/m.test(horsCode), 'titre de niveau 4 ou plus');
  verifie(!/<\/?(a|b|i|u|br|table|tr|td|div|p|span|h\d|ul|li)\b[^>]*>/i.test(horsCode), 'balise HTML');
  verifie(!/!\[[^\]]*\]\([^)]*\)/.test(horsCode), "syntaxe d'image");
  verifie(!/^\s*(-{3,}|\*{3,}|_{3,})\s*$/m.test(horsCode), 'ligne horizontale');
  verifie(!/^\s*\[[^\]]+\]:\s*\S+/m.test(horsCode), 'lien par référence');
  verifie((texte.match(/```/g) || []).length % 2 === 0, 'bloc de code non fermé');
  for (const s of c.obligatoires || []) verifie(texte.toLowerCase().includes(s.toLowerCase()), `manque « ${s} »`);
  for (const l of c.liensMasques || []) {
    const motif = new RegExp(`\\[${l.texte}\\]\\(<?${l.url.replace(/[.?]/g, '\\$&')}>?\\)`, 'i');
    verifie(motif.test(horsCode), `lien masqué [${l.texte}](${l.url}) absent`);
  }
  for (const url of c.liens || []) {
    const sansCodeEnLigne = horsCode.replace(/`[^`\n]*`/g, '');
    verifie(sansCodeEnLigne.includes(url), `lien ${url} absent ou dans du code`);
  }
  if (c.blocCode) verifie(new RegExp('```' + c.blocCode + '\\s*\\n').test(texte), `pas de bloc \`\`\`${c.blocCode}`);
  if (c.citation) verifie(/^>\s+\S/m.test(horsCode), 'pas de citation « > »');
  return bilan(echecs, total);
}

const lignesDe = (t) => t.split('\n').map((l) => l.trim()).filter(Boolean);

function annonce(output, context) {
  const c = context.config || {};
  const texte = String(output).trim();
  const echecs = [];
  let total = 0;
  const verifie = (ok, msg) => {
    total++;
    if (!ok) echecs.push(msg);
  };
  const blocs = texte.split(/(?=^📣)/m).filter((b) => b.trim());
  verifie(texte.startsWith('📣'), 'du texte précède la première annonce');
  verifie(blocs.length === (c.nombre || 1), `${blocs.length} annonce(s) au lieu de ${c.nombre || 1}`);
  blocs.forEach((b, i) => {
    const l = lignesDe(b);
    const n = `annonce ${i + 1}`;
    verifie(l.length === 5, `${n} : ${l.length} lignes au lieu de 5`);
    verifie(/^📣 \*\*[^*]+\*\*$/.test(l[0] || ''), `${n} : ligne titre`);
    verifie(/^🗓️? \S+ \d{1,2}\/\d{2} à \d{1,2} h( \d{2})?$/u.test(l[1] || ''), `${n} : ligne date « 🗓️ <Jour> JJ/MM à HH h »`);
    verifie(/^📍 \S/u.test(l[2] || ''), `${n} : ligne lieu`);
    const desc = l[3] || '';
    verifie(!/^\p{Extended_Pictographic}/u.test(desc) && desc.split(/[.!?…]+(?:\s|$)/).filter((p) => /\p{L}/u.test(p)).length <= 2, `${n} : description absente ou de plus de deux phrases`);
    verifie(/^✅ Inscription : \S/u.test(l[4] || ''), `${n} : ligne inscription`);
  });
  for (const s of c.obligatoires || []) verifie(texte.toLowerCase().includes(s.toLowerCase()), `manque « ${s} »`);
  for (const s of c.interdits || []) verifie(!texte.toLowerCase().includes(s.toLowerCase()), `contient « ${s} »`);
  return bilan(echecs, total);
}

const PROJETS = ['Rover', 'Mini-Rover', 'CanSat', 'Atelier soudure'];

function recap(output, context) {
  const c = context.config || {};
  const l = lignesDe(String(output));
  const echecs = [];
  let total = 0;
  const verifie = (ok, msg) => {
    total++;
    if (!ok) echecs.push(msg);
  };
  verifie(/^📌 \*\*Récap de la semaine du .+\*\*$/u.test(l[0] || ''), 'ligne titre du récap');
  verifie(l[l.length - 1] === 'Questions → #general', 'dernière ligne « Questions → #general »');
  const iAVenir = l.findIndex((x) => /^📅 \*\*À venir\*\*$/u.test(x));
  verifie(iAVenir > 0, 'section « 📅 **À venir** » absente');
  const corps = l.slice(1, iAVenir > 0 ? iAVenir : l.length - 1);
  const titres = [];
  corps.forEach((x, i) => {
    const m = x.match(/^\*\*(.+)\*\*$/);
    if (m) {
      titres.push(m[1]);
      verifie(PUCE.test(corps[i + 1] || ''), `bloc ${m[1]} sans puce`);
    } else {
      verifie(PUCE.test(x), `ligne hors gabarit : « ${x.slice(0, 40)} »`);
    }
  });
  verifie(titres.every((t) => PROJETS.includes(t)), `titre de bloc inconnu : ${titres.join(', ')}`);
  const ordre = titres.map((t) => PROJETS.indexOf(t));
  verifie(ordre.every((v, i) => i === 0 || v > ordre[i - 1]), `ordre des projets : ${titres.join(', ')}`);
  if (c.projets) verifie(JSON.stringify(titres) === JSON.stringify(c.projets), `projets ${titres.join(', ')} au lieu de ${c.projets.join(', ')}`);
  const aVenir = iAVenir > 0 ? l.slice(iAVenir + 1, l.length - 1) : [];
  verifie(aVenir.length > 0 && aVenir.every((x) => /^\s*[-*•]\s+\d{1,2}\/\d{2} — \S/u.test(x)), 'puces « JJ/MM — événement » dans À venir');
  const av = aVenir.join('\n').toLowerCase();
  for (const s of c.aVenir || []) verifie(av.includes(s.toLowerCase()), `À venir : manque « ${s} »`);
  for (const s of c.aVenirInterdits || []) verifie(!av.includes(s.toLowerCase()), `À venir : contient « ${s} »`);
  return bilan(echecs, total);
}

function fiche(output, context) {
  const c = context.config || {};
  const l = lignesDe(String(output));
  const attendu = [
    `**Fiche membre — ${c.nom}**`,
    `Pseudo : \`${c.pseudo}\``,
    `École : ${c.ecole}`,
    `Statut : ${c.statut}`,
    `Projet : ${c.projet}`,
  ];
  const echecs = attendu.filter((a, i) => (l[i] || '').toLowerCase() !== a.toLowerCase()).map((a) => `attendu « ${a} »`);
  if (l.length !== attendu.length) echecs.push(`${l.length} lignes au lieu de ${attendu.length}`);
  return bilan(echecs, attendu.length + 1);
}

module.exports = { francais, contraintes, discord, annonce, recap, fiche };
