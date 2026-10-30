#!/usr/bin/env python3
"""Generates the long-context archives of capability E6 (about 30k, 60k and 120k tokens).

Deterministic: rerunning rewrites the same files. Noise never contains the needles' key words
(padlock, burnt part, order numbers of the needles, validated CanSat expenses, supplier phones),
so each question has exactly one supported answer.
"""
import datetime as dt
import pathlib
import random

ICI = pathlib.Path(__file__).parent

MEMBRES = ["alix.m", "basile_d", "chloe.p", "dorian_l", "elsa.m", "farid.b", "gaelle_r", "hugo.t", "ines_k", "kenza.a", "lucas_b"]
SALONS = ["#general", "#rover", "#cansat", "#soudure", "#achats"]

PIECES = ["le châssis", "la carte moteur", "le capteur de ligne", "la roue gauche", "la roue droite", "le support de batterie",
          "la nappe des encodeurs", "le bras de la pince", "le pare-chocs avant", "le boîtier de la carte radio", "le mât de balise",
          "le connecteur d'alimentation", "la plaque de fixation", "le capot imprimé", "le régulateur 5 V"]
VERBES = ["revoir", "réimprimer", "recâbler", "tester", "mesurer", "démonter", "nettoyer", "recalibrer", "renforcer", "documenter"]
PARTICIPES = ["réimprimé", "recâblé", "testé", "mesuré", "démonté", "nettoyé", "recalibré", "renforcé", "documenté"]
LIEUX = ["sur l'établi 1", "sur l'établi 2", "dans le bac rouge", "dans le tiroir 3", "près de l'imprimante", "dans l'armoire du fond"]
OBJETS = ["vis M3", "entretoises", "gaines thermo", "colliers", "fils Dupont", "nappes", "embouts de tournevis", "roulements"]
FOURNISSEURS = ["Robo-Pièces", "Électro-Villebrune", "MicroComposants Pro", "Imprim3D Villebrune"]
ACHATS = [("lot de vis M3", 6.40), ("bobine de PLA", 19.90), ("rouleau d'étain", 14.50), ("jeu de forets", 11.20),
          ("paire de roues", 17.80), ("lot de résistances", 4.90), ("câble USB-C", 7.50), ("ventilateur 40 mm", 5.60),
          ("lot de LED", 3.80), ("pâte thermique", 6.90), ("courroie GT2", 8.30), ("lot de condensateurs", 5.20)]
PROJETS_ACHATS = ["Rover", "Mini-Rover", "atelier soudure", "local"]
CARTES = ["la carte capteurs", "la carte radio", "l'alimentation", "la carte mère"]
ELEMENTS_CANSAT = ["le boîtier", "la canette", "l'antenne", "le support de pile"]
SUJETS_GENERAL = ["la prochaine soirée jeux", "le ménage du local", "les badges du bâtiment B", "la photo de groupe",
                  "le planning des vacances", "les tee-shirts du club", "le rangement des câbles", "la machine à café",
                  "le chauffage du sous-sol", "le wifi du local"]


def fr_date(d):
    jours = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
    mois = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"]
    return f"{jours[d.weekday()]} {d.day} {mois[d.month - 1]}"


def euros(x):
    return f"{x:.2f}".replace(".", ",") + " €"


class Bruit:
    def __init__(self, graine):
        self.r = random.Random(graine)
        self.numero = 100

    def commande(self):
        self.numero += self.r.randint(1, 3)
        while self.numero in (219, 233, 398, 412):
            self.numero += 1
        return f"MCN-2026-{self.numero:04d}"

    def message(self, salon, jour):
        r = self.r
        qui = r.choice(MEMBRES)
        if salon == "#general":
            modeles = [
                f"quelqu'un a vu mes {r.choice(OBJETS)} ? je les ai laissés {r.choice(LIEUX)}",
                f"on aborde {r.choice(SUJETS_GENERAL)} à la prochaine réunion ?",
                f"rappel : on range {r.choice(LIEUX)} avant de partir, merci",
                f"je serai au local {fr_date(jour + dt.timedelta(days=r.randint(1, 4)))} vers {r.randint(14, 20)} h si quelqu'un veut bosser sur {r.choice(PIECES)}",
                f"petit sondage sur {r.choice(SUJETS_GENERAL)}, répondez avec un emoji",
                f"bravo à {r.choice(MEMBRES)} pour {r.choice(PIECES)}, ça rend super bien",
            ]
        elif salon == "#rover":
            modeles = [
                f"j'ai pu {r.choice(VERBES)} {r.choice(PIECES)}, ça tient",
                f"il faudrait {r.choice(VERBES)} {r.choice(PIECES)} avant le prochain essai",
                f"essai sur la table : {r.randint(3, 9)} trajets sur 10 sans erreur, on progresse",
                f"le code de l'odométrie est poussé sur la branche {r.choice(['dev', 'odom', 'pince', 'match'])}",
                f"quelqu'un peut relire ma PR sur {r.choice(PIECES)} ?",
                f"mesure du courant moteur : {r.randint(800, 1900)} mA en pointe",
            ]
        elif salon == "#cansat":
            modeles = [
                f"test radio du jour : {r.randint(80, 290)} m de portée sans perte",
                f"j'ai mis à jour le schéma de {r.choice(CARTES)}",
                f"le baromètre dérive de {r.randint(1, 9)} hPa sur une heure, à creuser",
                f"on refait le pliage du parachute {fr_date(jour + dt.timedelta(days=r.randint(2, 6)))}",
                f"j'ai {r.choice(PARTICIPES)} {r.choice(ELEMENTS_CANSAT)}",
            ]
        elif salon == "#soudure":
            modeles = [
                f"atelier de jeudi : {r.randint(4, 11)} participants, merci à tous",
                f"il reste du flux dans {r.choice(LIEUX)}",
                f"pensez à éteindre la station {r.randint(1, 3)} après usage",
                f"exercice de la semaine : souder des CMS {r.choice(['0805', '0603', '1206'])}",
                f"la panne fine de la station {r.randint(1, 3)} est usée, on la change bientôt",
            ]
        else:
            # Only the treasurer places orders in the noise, so the E6 cross-reference questions stay unambiguous.
            qui = "basile_d"
            nom, prix = r.choice(ACHATS)
            q = r.randint(1, 4)
            modeles = [
                f"commande {self.commande()} passée chez {r.choice(FOURNISSEURS)} pour le {r.choice(PROJETS_ACHATS)} : {q} × {nom}, {euros(q * prix)}",
                f"colis reçu : {nom}, rangé {r.choice(LIEUX)}",
                f"qui a besoin de {nom} ? je groupe les commandes vendredi",
                f"facture de {r.choice(FOURNISSEURS)} classée dans le dossier compta",
            ]
        return qui, r.choice(modeles)


def archive(nom, graine, cible_car, debut, aiguilles):
    """aiguilles: {day_index: [(salon, membre, texte)]}, texts may use the day's date."""
    b = Bruit(graine)
    lignes = [f"# Archives Discord de Mécanova — export brut à partir du {debut.isoformat()}", "",
              "Export automatique des salons #general, #rover, #cansat, #soudure et #achats, jour par jour.", ""]
    jour, i, taille = debut, 0, 0
    while taille < cible_car or i <= max(aiguilles):
        bloc = [f"## {jour.isoformat()} ({fr_date(jour)})", ""]
        messages = []
        for salon in b.r.sample(SALONS, k=b.r.randint(2, 4)):
            for _ in range(b.r.randint(1, 4)):
                qui, texte = b.message(salon, jour)
                messages.append((salon, qui, texte))
        for salon, qui, texte in aiguilles.get(i, []):
            messages.insert(b.r.randint(0, len(messages)), (salon, qui, texte(jour) if callable(texte) else texte))
        heure = 8 * 60
        for salon, qui, texte in messages:
            heure += b.r.randint(5, 70)
            bloc.append(f"- {min(heure // 60, 23):02d}:{heure % 60:02d} {salon} — {qui} : {texte}")
        bloc.append("")
        lignes += bloc
        taille += sum(len(l) + 1 for l in bloc)
        jour += dt.timedelta(days=1)
        i += 1
    (ICI / nom).write_text("\n".join(lignes), encoding="utf-8")
    return taille, i


def main():
    # About 3.5 characters per token for French text.
    debut = dt.date(2026, 1, 5)

    j = {}
    j.setdefault(14, []).append(("#general", "alix.m", "le code du cadenas de l'armoire à LiPo est 4719. Ne le notez nulle part ailleurs."))
    j.setdefault(31, []).append(("#cansat", "elsa.m", "pesée finale de la CanSat : 312 g, pile sous la limite de 350 g du règlement"))
    print("archive-30k.md", archive("archive-30k.md", 30, 105_000, debut, j))

    j = {}
    stage_debut = debut + dt.timedelta(days=40)
    stage_fin = debut + dt.timedelta(days=95)
    j.setdefault(12, []).append(("#general", "alix.m", "le code du cadenas de l'armoire à LiPo est 4719. Ne le notez nulle part ailleurs."))
    j.setdefault(30, []).append(("#rover", "dorian_l", f"je pars en stage du {stage_debut.isoformat()} au {stage_fin.isoformat()}. Pendant ce temps c'est kenza.a qui reprend la responsabilité du Rover, adressez-vous à elle."))
    j.setdefault(52, []).append(("#achats", "kenza.a", "commande MCN-2026-0398 passée chez Robo-Pièces pour le Mini-Rover : 2 × moteur N20, 15,80 €"))
    j.setdefault(58, []).append(("#general", "alix.m", "nouveau code du cadenas de l'armoire à LiPo : 8263. L'ancien a circulé, il ne marche plus."))
    j.setdefault(66, []).append(("#achats", "kenza.a", "commande MCN-2026-0412 passée chez Robo-Pièces pour le Rover : 4 × roue mecanum, 64,00 €"))
    j.setdefault(70, []).append(("#achats", "hugo.t", "commande MCN-2026-0415 passée chez Électro-Villebrune pour le Rover : 1 × driver moteur, 22,50 €"))
    j.setdefault(81, []).append(("#general", "farid.b", "le cadenas du casier à outils (pas celui des LiPo) passe sur le code 5502"))
    print("archive-60k.md", archive("archive-60k.md", 60, 210_000, debut, j))

    j = {}
    j.setdefault(20, []).append(("#general", "basile_d", "pour info, numéros des fournisseurs : Robo-Pièces 06 00 00 00 31, Capteurs-Express 06 00 00 00 42, Électro-Villebrune 06 00 00 00 47"))
    j.setdefault(38, []).append(("#achats", "basile_d", "commande MCN-2026-0219 passée chez Capteurs-Express pour le Rover : 2 × centrale inertielle BNO055, 39,80 €"))
    j.setdefault(41, []).append(("#achats", "basile_d", "commande MCN-2026-0233 passée chez Robo-Pièces pour le Rover : 4 × servomoteur MG996R, 31,60 €"))
    j.setdefault(47, []).append(("#cansat", "basile_d", "dépense CanSat validée : piles et support, 12,50 €"))
    j.setdefault(63, []).append(("#cansat", "elsa.m", "je propose une dépense CanSat de 19,00 € pour un deuxième baromètre, à valider"))
    j.setdefault(71, []).append(("#cansat", "basile_d", "dépense CanSat validée : tissu et suspentes du parachute, 48,00 €"))
    j.setdefault(88, []).append(("#rover", "hugo.t", lambda d: f"essai du {d.isoformat()} : la centrale inertielle a grillé, inversion de polarité. C'est une des deux de la commande MCN-2026-0219."))
    j.setdefault(95, []).append(("#rover", "dorian_l", "un servomoteur de la pince a grillé aussi, il venait de la commande MCN-2026-0233"))
    j.setdefault(104, []).append(("#achats", "basile_d", "dépense Mini-Rover validée : capteur de distance, 30,00 €"))
    j.setdefault(118, []).append(("#cansat", "basile_d", "dépense CanSat validée : antenne 433 MHz, 23,90 €"))
    j.setdefault(139, []).append(("#cansat", "basile_d", "la dépense CanSat de 48,00 € (parachute) est annulée : le fournisseur a remboursé, on réutilise l'ancien parachute"))
    j.setdefault(150, []).append(("#general", "basile_d", "changement de numéro chez Électro-Villebrune : appelez désormais le 06 00 00 00 48"))
    print("archive-120k.md", archive("archive-120k.md", 120, 405_000, debut, j))


if __name__ == "__main__":
    main()
