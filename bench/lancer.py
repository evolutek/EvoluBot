#!/usr/bin/env python3
"""Runs the benchmark in parallel lanes, one per quota, and resumes from the journal after any stop.

  lancer.py run [--repetitions N] [--voie NOM] [--max-processus N]
  lancer.py etat
  lancer.py classement
"""
import argparse
import hashlib
import json
import os
import re
import statistics
import subprocess
import sys
import tempfile
import threading
import time
from collections import Counter, defaultdict
from pathlib import Path

RACINE = Path(__file__).resolve().parent
RESULTATS = Path(os.environ.get("BENCH_RESULTATS", RACINE / "resultats"))
JOURNAL = RESULTATS / "journal.jsonl"
PAUSES = RESULTATS / "pauses.json"
PROMPTFOO = ["npx", "--yes", "promptfoo@0.124.1", "eval"]

# These connections share one quota across their models; the others limit each model separately.
QUOTA_COMMUN = {"cloudflare-ai", "openrouter"}
# The judge never grades its own family (docs/llm/banc-essai.md).
JUGE = "mistral/mistral-large-4"
JUGE_DE_MISTRAL = "groq/openai/gpt-oss-120b"

TAILLE_LOT = 5
PAUSE_MIN_S = 60
PAUSE_MAX_S = 3600
MAX_LIMITES_PAR_EPREUVE = 5
MAX_ERREURS_PAR_EPREUVE = 3
MAX_REFUS_MODELE = 3

TROP_GROS = re.compile(r"too large|too long|context.?length|maximum context|reduce the length|exceeds? .*tokens", re.I)
LIMITE = re.compile(r"rate.?limit|quota|cooldown|too many requests|all accounts", re.I)

verrou = threading.Lock()


def epreuves():
    liste = []
    for fichier in sorted(RACINE.glob("themes/*/tests/*.yaml")):
        dossier = fichier.parents[1]
        for bloc in re.split(r"(?m)^(?=- description:)", fichier.read_text()):
            m = re.match(r"- description: *(.+)", bloc)
            if not m:
                continue
            brut = m.group(1).strip()
            if brut[0] == '"':
                description = json.loads(brut)
            elif brut[0] == "'":
                description = brut[1:-1].replace("''", "'")
            else:
                description = brut
            meta = re.search(r"capacite: *(\w+), *niveau: *(\w+)", bloc)
            liste.append({
                "description": description,
                "dossier": dossier,
                "theme": dossier.name,
                "capacite": meta.group(1),
                "niveau": meta.group(2),
                "juge": "llm-rubric" in bloc,
                # Same order for every model, so partial results compare the same cases.
                "ordre": hashlib.sha256(description.encode()).hexdigest(),
            })
    return liste


def modeles():
    return re.findall(r"(?m)^  label: (.+)$", (RACINE / "providers.yaml").read_text())


def demasquer(masque):
    """Reads the status and upstream text encoded by lib/omniroute.js."""
    brut = bytes.fromhex(masque.translate(str.maketrans("ghijklmnop", "0123456789"))).decode(errors="replace")
    code, _, texte = brut.partition(" ")
    return int(code), texte


def voie_de(modele):
    fournisseur = modele.split("/")[0]
    return fournisseur if fournisseur in QUOTA_COMMUN else modele


def juge_de(modele):
    return JUGE_DE_MISTRAL if modele.startswith("mistral/") else JUGE


def lire_journal():
    if not JOURNAL.exists():
        return []
    lignes = []
    for ligne in JOURNAL.read_text().splitlines():
        try:
            lignes.append(json.loads(ligne))
        except json.JSONDecodeError:
            pass  # a line cut short by a crash; the case simply runs again
    return lignes


def noter(ligne):
    ligne["date"] = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    with verrou, JOURNAL.open("a") as f:
        f.write(json.dumps(ligne, ensure_ascii=False) + "\n")


class Juges:
    """Pauses for the judges, shared by every lane: cases needing a paused judge wait, the others go on."""

    def __init__(self):
        self.jusqua = defaultdict(float)
        self.suite = Counter()

    def libre(self, juge):
        return time.time() >= self.jusqua[juge]

    def limite(self, juge):
        with verrou:
            self.jusqua[juge] = time.time() + min(PAUSE_MIN_S * 2 ** self.suite[juge], PAUSE_MAX_S)
            self.suite[juge] += 1

    def reussite(self, juge):
        with verrou:
            self.suite[juge] = 0


class Voie(threading.Thread):
    def __init__(self, nom, modeles_voie, cas, faits, morts, juges, places, repetitions, etat_pauses):
        super().__init__(name=nom, daemon=True)
        self.nom = nom
        self.modeles = modeles_voie
        self.cas = cas
        self.faits = faits
        self.morts = morts
        self.juges = juges
        self.places = places
        self.repetitions = repetitions
        self.etat_pauses = etat_pauses
        self.limites = Counter()
        self.erreurs = Counter()
        self.refus = Counter()
        self.repos = {}
        self.repos_suite = Counter()
        self.pause_suite = 0
        self.reussi_depuis_pause = True

    def restant(self):
        for rep in range(self.repetitions):
            vus = False
            for modele in self.modeles:
                if modele in self.morts:
                    continue
                for c in self.cas:
                    if (modele, c["description"], rep) not in self.faits:
                        vus = True
                        yield rep, modele, c
            if vus:
                return  # a repetition starts only once the previous one is finished everywhere

    def lot_suivant(self):
        restants = list(self.restant())
        if not restants:
            return None, None, []
        rep = restants[0][0]
        fait = Counter(m for (m, _, r) in self.faits if r == rep)
        par_theme = Counter((m, theme) for (m, _, r), theme in self.faits.items() if r == rep)
        maintenant = time.time()
        possibles = [
            t for t in restants
            if self.repos.get(t[1], 0) <= maintenant and (not t[2]["juge"] or self.juges.libre(juge_de(t[1])))
        ]
        if not possibles:
            return rep, None, []
        # Least-served model and theme first, so that a shared quota spreads evenly over its models.
        modele = min({t[1] for t in possibles}, key=lambda m: (fait[m], m))
        du_modele = [t[2] for t in possibles if t[1] == modele]
        theme = min({c["theme"] for c in du_modele}, key=lambda n: (par_theme[(modele, n)], n))
        lot = sorted(
            (c for c in du_modele if c["theme"] == theme),
            key=lambda c: (self.limites[(modele, c["description"], rep)], c["ordre"]),
        )
        return rep, modele, lot[:TAILLE_LOT]

    def lancer_lot(self, rep, modele, lot):
        motif = "^(" + "|".join(re.escape(c["description"]) for c in lot) + ")$"
        slug = re.sub(r"\W+", "-", self.nom)
        env = dict(
            os.environ,
            BENCH_REP=str(rep),
            BENCH_JUGE=juge_de(modele),
            BENCH_REPONSES=str(RESULTATS / "reponses"),
            PROMPTFOO_CONFIG_DIR=str(RESULTATS / "promptfoo" / slug),
            PROMPTFOO_DISABLE_TELEMETRY="1",
            PROMPTFOO_DISABLE_UPDATE="1",
        )
        with tempfile.TemporaryDirectory(prefix="banc-") as tmp:
            sortie = Path(tmp) / "sortie.json"
            cmd = PROMPTFOO + [
                "-c", str(lot[0]["dossier"] / "promptfooconfig.yaml"),
                "--filter-pattern", motif,
                "--filter-providers", "^" + re.escape(modele) + "$",
                "-j", "1", "--no-write", "--no-table", "--no-progress-bar", "--no-cache",
                "-o", str(sortie),
            ]
            try:
                p = subprocess.run(cmd, env=env, cwd=RACINE, capture_output=True, text=True,
                                   timeout=900 * len(lot))
            except subprocess.TimeoutExpired:
                return None, "promptfoo hors délai"
            if not sortie.exists():
                return None, (p.stderr or p.stdout)[-400:]
            return json.loads(sortie.read_text())["results"]["results"], None

    def pause(self, secondes, raison):
        with verrou:
            self.etat_pauses[self.nom] = {"jusqua": time.time() + secondes, "raison": raison[:200]}
            PAUSES.write_text(json.dumps(self.etat_pauses, ensure_ascii=False, indent=1))
        fin = time.time() + secondes
        while time.time() < fin:
            time.sleep(min(5, max(0, fin - time.time())))
        with verrou:
            self.etat_pauses.pop(self.nom, None)

    def enregistrer(self, rep, modele, c, statut, **extra):
        cle = (modele, c["description"], rep)
        self.faits[cle] = c["theme"]
        noter({
            "modele": modele, "description": c["description"], "rep": rep, "statut": statut,
            "theme": c["theme"], "capacite": c["capacite"], "niveau": c["niveau"], **extra,
        })

    def juge_limite(self, modele, raison):
        self.juges.limite(juge_de(modele))
        print(f"[juge {juge_de(modele)}] pause : {raison}", flush=True)

    def reposer(self, modele, code, texte):
        # Only this model rests, so a lane with a shared quota keeps serving the others.
        # When the quota itself is exhausted they all come to rest in turn, which pauses the lane.
        n = self.repos_suite[modele]
        attente = min(PAUSE_MIN_S * 2 ** n, PAUSE_MAX_S)
        self.repos[modele] = time.time() + attente
        self.repos_suite[modele] = n + 1
        self.reussi_depuis_pause = False
        with verrou:
            self.etat_pauses[modele] = {"jusqua": self.repos[modele], "raison": f"{code} {texte[:150]}"}
            PAUSES.write_text(json.dumps(self.etat_pauses, ensure_ascii=False, indent=1))
        print(f"[{self.nom}] {modele} au repos {attente} s : {code} {texte[:120]}", flush=True)

    def reagir(self, rep, modele, c, code, texte):
        cle = (modele, c["description"], rep)
        if TROP_GROS.search(texte) or code == 413:
            self.enregistrer(rep, modele, c, "impossible", raison=texte[:200])
        elif code == 429 or LIMITE.search(texte):
            # Counted only if the lane worked since its last rest: an exhausted quota blames no case.
            if self.reussi_depuis_pause:
                self.limites[cle] += 1
                if self.limites[cle] >= MAX_LIMITES_PAR_EPREUVE:
                    self.enregistrer(rep, modele, c, "impossible", raison="limite à chaque essai : " + texte[:150])
            self.reposer(modele, code, texte)
        elif (code in (401, 402, 403, 404) or code >= 500) and re.search(r"retry_after|reset after", texte):
            self.reposer(modele, code, texte)  # OmniRoute's upstream cooldown, not a refusal
        elif code in (401, 402, 403, 404):
            self.refus[modele] += 1
            self.reposer(modele, code, texte)
            if self.refus[modele] >= MAX_REFUS_MODELE:
                self.morts.add(modele)
                noter({"modele_mort": modele, "raison": f"{code} {texte[:200]}"})
        elif code >= 500:
            self.erreurs[cle] += 1
            if self.erreurs[cle] >= MAX_ERREURS_PAR_EPREUVE:
                self.enregistrer(rep, modele, c, "erreur", raison=f"{code} {texte[:200]}")
        else:
            self.enregistrer(rep, modele, c, "impossible", raison=f"{code} {texte[:200]}")

    def traiter(self, rep, modele, lot, resultats):
        """Returns the reason to pause this lane, if any."""
        par_description = {c["description"]: c for c in lot}
        arret = None
        sauts = {}
        vus = set()
        rendues = {(r.get("testCase") or {}).get("description") for r in resultats}
        for c in lot:
            # A case promptfoo never returns would otherwise be picked again forever.
            if c["description"] not in rendues:
                cle = (modele, c["description"], rep)
                self.erreurs[cle] += 1
                if self.erreurs[cle] >= MAX_ERREURS_PAR_EPREUVE:
                    self.enregistrer(rep, modele, c, "erreur", raison="épreuve non renvoyée par promptfoo")
        for r in resultats:
            c = par_description.get((r.get("testCase") or {}).get("description"))
            if c is None:
                continue
            cle = (modele, c["description"], rep)
            erreur = r.get("error") or ""
            notation = json.dumps(r.get("gradingResult") or {}, ensure_ascii=False)

            saut = re.search(r"BENCH_SKIP (modele|juge) ([a-p]+)", erreur + " " + notation)
            if saut:
                sauts.setdefault(saut.group(1), demasquer(saut.group(2)))
                continue
            if "BENCH_RESEAU" in erreur or "BENCH_RESEAU" in notation:
                arret = "réseau : " + (erreur or notation)[:150]
                continue
            m = re.search(r"BENCH_HTTP juge ([a-p]+)", erreur + " " + notation)
            if m:
                vus.add("juge")
                self.juge_limite(modele, "%d %s" % demasquer(m.group(1)))
                continue

            m = re.search(r"BENCH_HTTP modele ([a-p]+)", erreur)
            if m:
                vus.add("modele")
                self.reagir(rep, modele, c, *demasquer(m.group(1)))
                continue

            if erreur and r.get("failureReason") == 2:
                self.erreurs[cle] += 1
                if self.erreurs[cle] >= MAX_ERREURS_PAR_EPREUVE:
                    self.enregistrer(rep, modele, c, "erreur", raison=erreur[:200])
                continue

            usage = r.get("tokenUsage") or {}
            self.enregistrer(
                rep, modele, c, "note", reussi=bool(r.get("success")), score=r.get("score"),
                latence_ms=r.get("latencyMs"), jetons=usage.get("total"), raison=(r.get("gradingResult") or {}).get("reason", "")[:300],
            )
            self.refus[modele] = 0
            self.repos_suite[modele] = 0
            self.reussi_depuis_pause = True
            if c["juge"]:
                self.juges.reussite(juge_de(modele))
        if "juge" in sauts and "juge" not in vus:
            self.juge_limite(modele, f"{sauts['juge'][0]} {sauts['juge'][1][:280]}")
        if "modele" in sauts and "modele" not in vus:
            self.reagir(rep, modele, lot[0], *sauts["modele"])
        return arret

    def run(self):
        while True:
            rep, modele, lot = self.lot_suivant()
            if rep is None:
                print(f"[{self.nom}] terminé", flush=True)
                return
            if not lot:
                self.pause(PAUSE_MIN_S, "en attente du juge ou d'un modèle au repos")
                continue
            with self.places:
                resultats, panne = self.lancer_lot(rep, modele, lot)
            if panne is not None:
                print(f"[{self.nom}] panne : {panne}", flush=True)
                self.pause(PAUSE_MIN_S, panne)
                continue
            arret = self.traiter(rep, modele, lot, resultats)
            print(f"[{self.nom}] {modele} {lot[0]['theme']} : {len(lot)} épreuves" + (f", pause : {arret}" if arret else ""), flush=True)
            if arret:
                attente = min(PAUSE_MIN_S * 2 ** self.pause_suite, PAUSE_MAX_S)
                self.pause_suite += 1
                self.reussi_depuis_pause = False
                self.pause(attente, arret)
            else:
                self.pause_suite = 0


def run(args):
    for variable in ("OMNIROUTE_URL", "OMNIROUTE_BENCH_KEY"):
        if variable not in os.environ:
            sys.exit(f"{variable} manquant")
    RESULTATS.mkdir(exist_ok=True)
    cas = sorted(epreuves(), key=lambda c: c["ordre"])
    faits = {}
    morts = set()
    for ligne in lire_journal():
        if "modele_mort" in ligne:
            morts.add(ligne["modele_mort"])
        else:
            faits[(ligne["modele"], ligne["description"], ligne["rep"])] = ligne["theme"]
    voies = defaultdict(list)
    for modele in modeles():
        voies[voie_de(modele)].append(modele)
    if args.voie:
        voies = {n: m for n, m in voies.items() if n in args.voie}
    print(f"{len(cas)} épreuves, {sum(map(len, voies.values()))} modèles, {len(voies)} voies, {len(faits)} résultats déjà acquis", flush=True)
    juges = Juges()
    places = threading.Semaphore(args.max_processus)
    etat_pauses = {}
    fils = [
        Voie(n, m, cas, {cle: t for cle, t in faits.items() if cle[0] in m}, morts, juges, places, args.repetitions, etat_pauses)
        for n, m in voies.items()
    ]
    for f in fils:
        f.start()
    for f in fils:
        f.join()


def etat(_):
    lignes = lire_journal()
    total = len(epreuves())
    par_modele = defaultdict(Counter)
    morts = {}
    for l in lignes:
        if "modele_mort" in l:
            morts[l["modele_mort"]] = l["raison"]
        else:
            par_modele[l["modele"]][l["statut"]] += 1
    pauses = json.loads(PAUSES.read_text()) if PAUSES.exists() else {}
    print(f"{'modèle':50} {'fait':>9}  notés impossibles erreurs")
    for modele in modeles():
        c = par_modele[modele]
        fin = f"  MORT : {morts[modele][:60]}" if modele in morts else ""
        p = next((x for x in (pauses.get(modele), pauses.get(voie_de(modele))) if x and x["jusqua"] > time.time()), None)
        if p:
            fin = f"  pause {int(p['jusqua'] - time.time())} s : {p['raison'][:60]}"
        print(f"{modele:50} {sum(c.values()):4}/{total:<4}  {c['note']:5} {c['impossible']:11} {c['erreur']:7}{fin}")


def classement(_):
    notes = defaultdict(list)
    latences = defaultdict(list)
    for l in lire_journal():
        if "modele_mort" in l or l["statut"] == "erreur":
            continue
        score = (l.get("score") or 0) if l["statut"] == "note" else 0
        notes[(l["theme"], l["niveau"], l["modele"])].append(score)
        notes[(l["theme"], "tous", l["modele"])].append(score)
        if l.get("latence_ms"):
            latences[l["modele"]].append(l["latence_ms"])
    total = Counter((c["theme"], c["niveau"]) for c in epreuves())
    for (theme, niveau), n in list(total.items()):
        total[(theme, "tous")] += n
    sortie = ["# Classement du banc d'essai", "", "Généré par `lancer.py classement`. Une épreuve impossible (modèle incapable de la traiter) compte 0 ; la couverture dit combien d'épreuves sont déjà passées.", ""]
    for theme, niveau in sorted(total):
        rangs = sorted(
            ((sum(s) / len(s), m, len(s)) for (t, n, m), s in notes.items() if (t, n) == (theme, niveau)),
            key=lambda r: -r[0],
        )
        if not rangs:
            continue
        sortie += [f"## {theme}, {niveau}", "", "| Rang | Modèle | Score /100 | Couverture | Latence médiane |", "|---|---|---|---|---|"]
        for i, (score, m, n) in enumerate(rangs, 1):
            lat = f"{statistics.median(latences[m]) / 1000:.1f} s" if latences[m] else "—"
            sortie.append(f"| {i} | {m} | {score * 100:.0f} | {n}/{total[(theme, niveau)]} | {lat} |")
        sortie.append("")
    RESULTATS.mkdir(exist_ok=True)
    (RESULTATS / "classement.md").write_text("\n".join(sortie))
    print("\n".join(sortie))


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sous = parser.add_subparsers(dest="commande", required=True)
    r = sous.add_parser("run")
    r.add_argument("--repetitions", type=int, default=1)
    r.add_argument("--voie", action="append")
    r.add_argument("--max-processus", type=int, default=8)
    r.set_defaults(fn=run)
    sous.add_parser("etat").set_defaults(fn=etat)
    sous.add_parser("classement").set_defaults(fn=classement)
    args = parser.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
