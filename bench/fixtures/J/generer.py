#!/usr/bin/env python3
"""Draws the fictitious images of theme J as SVG, then renders them to PNG (rsvg-convert)
and fakes a phone photo of an invoice (ImageMagick). Rerunning rewrites the same files."""
import pathlib
import subprocess
from xml.sax.saxutils import escape

ICI = pathlib.Path(__file__).parent
POLICE = "Noto Sans, DejaVu Sans, sans-serif"


def t(x, y, texte, taille=16, poids="normal", ancre="start", couleur="#111", famille=POLICE):
    return (f'<text x="{x}" y="{y}" font-family="{famille}" font-size="{taille}" font-weight="{poids}" '
            f'text-anchor="{ancre}" fill="{couleur}">{escape(texte)}</text>')


def svg(l, h, corps, fond="#fff"):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" width="{l}" height="{h}" viewBox="0 0 {l} {h}">'
            f'<rect width="{l}" height="{h}" fill="{fond}"/>{"".join(corps)}</svg>')


def rendre(nom, contenu):
    source = ICI / f".{nom}.svg"
    source.write_text(contenu, encoding="utf-8")
    subprocess.run(["rsvg-convert", "-o", str(ICI / f"{nom}.png"), str(source)], check=True)
    source.unlink()


def tableau(x, y, largeurs, lignes, hauteur=30):
    c = []
    total = sum(largeurs)
    for i, ligne in enumerate(lignes):
        yy = y + i * hauteur
        if i == 0:
            c.append(f'<rect x="{x}" y="{yy}" width="{total}" height="{hauteur}" fill="#e8eef5"/>')
        c.append(f'<line x1="{x}" y1="{yy + hauteur}" x2="{x + total}" y2="{yy + hauteur}" stroke="#999"/>')
        xx = x
        for j, cellule in enumerate(ligne):
            droite = j > 0
            c.append(t(xx + largeurs[j] - 8 if droite else xx + 8, yy + 20, cellule, 15, "bold" if i == 0 else "normal", "end" if droite else "start"))
            xx += largeurs[j]
    c.append(f'<rect x="{x}" y="{y}" width="{total}" height="{hauteur * len(lignes)}" fill="none" stroke="#555"/>')
    return c


def facture(numero, date, fournisseur, adresse, lignes, ht, tva, ttc, mention):
    c = [t(50, 70, fournisseur, 30, "bold", couleur="#1d4e89"), t(50, 96, adresse, 14, couleur="#444"),
         t(750, 70, "FACTURE", 30, "bold", "end"), t(750, 98, f"N° {numero}", 16, "bold", "end"), t(750, 120, f"Date : {date}", 15, ancre="end"),
         '<rect x="50" y="150" width="330" height="90" fill="none" stroke="#bbb"/>', t(62, 172, "Facturé à :", 13, couleur="#666"),
         t(62, 196, "Association Mécanova", 16, "bold"), t(62, 218, "Sous-sol bâtiment B, Villebrune", 14)]
    c += tableau(50, 280, [370, 70, 130, 130], [["Désignation", "Qté", "PU HT (€)", "Total HT (€)"]] + lignes)
    y = 280 + 30 * (len(lignes) + 1) + 40
    for libelle, valeur, gras in [("Total HT", ht, False), ("TVA 20 %", tva, False), ("Total TTC", ttc, True)]:
        c += [t(600, y, libelle, 17, "bold" if gras else "normal", "end"), t(750, y, f"{valeur} €", 17, "bold" if gras else "normal", "end")]
        y += 30
    c += [t(50, y + 40, mention, 13, couleur="#444"), t(50, 960, "Document fictif — données inventées pour le banc d'essai.", 11, couleur="#999")]
    return svg(800, 1000, c)


def bon_livraison():
    c = [t(50, 70, "Robo-Pièces", 30, "bold", couleur="#a33"), t(50, 96, "Zone des Ateliers, Villebrune", 14, couleur="#444"),
         t(750, 70, "BON DE LIVRAISON", 26, "bold", "end"), t(750, 98, "N° BL-77120", 16, "bold", "end"), t(750, 120, "Expédié le 2026-10-30", 15, ancre="end"),
         t(50, 170, "Commande : RP-48213", 16), t(50, 195, "Destinataire : Basile Durand — Mécanova, sous-sol bâtiment B", 16),
         t(50, 220, "Transporteur : Colissimo", 16, "bold"), t(330, 220, "N° de suivi : 6A23456789012", 16, "bold"),
         t(50, 245, "Colis : 1", 16), t(330, 245, "Poids : 0,9 kg", 16)]
    c += tableau(50, 290, [380, 110, 110, 100], [["Article", "Commandé", "Livré", "Reliquat"],
                                                  ["Servomoteur MG996R", "4", "4", "0"],
                                                  ["Palonnier métal 25T", "4", "2", "2"],
                                                  ["Lot de vis M3 (100 pièces)", "1", "1", "0"]])
    c += [t(50, 470, "Les articles en reliquat seront expédiés sous 10 jours sans frais supplémentaires.", 14, couleur="#444"),
          t(50, 520, "Signature du destinataire :", 14), '<rect x="250" y="500" width="250" height="60" fill="none" stroke="#bbb"/>',
          t(50, 760, "Document fictif — données inventées pour le banc d'essai.", 11, couleur="#999")]
    return svg(800, 800, c)


def resistance(x, y, vertical, nom, valeur):
    if vertical:
        return [f'<rect x="{x - 10}" y="{y}" width="20" height="60" fill="#fff" stroke="#000" stroke-width="2"/>', t(x + 20, y + 25, nom, 16, "bold"), t(x + 20, y + 45, valeur, 16)]
    return [f'<rect x="{x}" y="{y - 10}" width="60" height="20" fill="#fff" stroke="#000" stroke-width="2"/>', t(x + 30, y - 18, f"{nom}  {valeur}", 16, "bold", "middle")]


def masse(x, y):
    return [f'<line x1="{x - 18}" y1="{y}" x2="{x + 18}" y2="{y}" stroke="#000" stroke-width="2"/>',
            f'<line x1="{x - 11}" y1="{y + 6}" x2="{x + 11}" y2="{y + 6}" stroke="#000" stroke-width="2"/>',
            f'<line x1="{x - 4}" y1="{y + 12}" x2="{x + 4}" y2="{y + 12}" stroke="#000" stroke-width="2"/>', t(x + 26, y + 8, "GND", 14)]


def fil(*points):
    p = " ".join(f"{x},{y}" for x, y in points)
    return f'<polyline points="{p}" fill="none" stroke="#000" stroke-width="2"/>'


def schema_led():
    c = [t(20, 30, "Schéma S1 — LED témoin", 18, "bold"), t(100, 80, "+5 V", 16, "bold"), fil((120, 90), (120, 120))]
    c += resistance(120, 120, True, "R1", "220 Ω")
    c += [fil((120, 180), (120, 220)), '<polygon points="105,220 135,220 120,245" fill="#fff" stroke="#000" stroke-width="2"/>',
          '<line x1="105" y1="247" x2="135" y2="247" stroke="#000" stroke-width="2"/>', fil((140, 225), (152, 213)), fil((146, 235), (158, 223)),
          t(170, 232, "D1  LED rouge, Vf = 2,0 V", 16, "bold"), fil((120, 247), (120, 290))]
    c += masse(120, 290)
    return svg(480, 340, c)


def schema_diviseur():
    c = [t(20, 30, "Schéma S2 — mesure de la tension batterie", 18, "bold"), t(80, 80, "VBAT (pack LiPo 4S)", 16, "bold"), fil((120, 90), (120, 120))]
    c += resistance(120, 120, True, "R1", "10 kΩ")
    c += [fil((120, 180), (120, 230)), '<circle cx="120" cy="205" r="4" fill="#000"/>', fil((120, 205), (260, 205)),
          '<rect x="260" y="185" width="190" height="40" fill="#eef" stroke="#000" stroke-width="2"/>', t(355, 211, "STM32 PA0 (ADC, 3,3 V max)", 13, "bold", "middle")]
    c += resistance(120, 230, True, "R2", "3,3 kΩ")
    c += [fil((120, 290), (120, 320))]
    c += masse(120, 320)
    return svg(480, 370, c)


def mosfet(x, y, nom, commande=None):
    c = [f'<rect x="{x - 22}" y="{y - 25}" width="44" height="50" rx="6" fill="#fff" stroke="#000" stroke-width="2"/>', t(x, y + 6, nom, 16, "bold", "middle")]
    if commande:
        c += [fil((x - 22, y), (x - 60, y)), t(x - 64, y + 5, commande, 14, "bold", "end", "#a33")]
    return c


def schema_pont_h(commandes):
    c = [t(20, 30, "Schéma S3 — pont en H du moteur de la pince" + (" (commande)" if commandes else ""), 18, "bold"),
         t(300, 70, "+12 V", 16, "bold", "middle"), fil((150, 85), (450, 85)), fil((150, 85), (150, 125)), fil((450, 85), (450, 125))]
    noms = commandes or {}
    c += mosfet(150, 150, "Q1", noms.get("Q1")) + mosfet(450, 150, "Q2", noms.get("Q2"))
    c += [fil((150, 175), (150, 285)), fil((450, 175), (450, 285)), '<circle cx="150" cy="230" r="4" fill="#000"/>', '<circle cx="450" cy="230" r="4" fill="#000"/>',
          t(140, 225, "A", 14, "bold", "end"), t(460, 225, "B", 14, "bold"),
          fil((150, 230), (265, 230)), fil((335, 230), (450, 230)), '<circle cx="300" cy="230" r="35" fill="#fff" stroke="#000" stroke-width="2"/>', t(300, 237, "M1", 18, "bold", "middle")]
    c += mosfet(150, 310, "Q3", noms.get("Q3")) + mosfet(450, 310, "Q4", noms.get("Q4"))
    c += [fil((150, 335), (150, 370)), fil((450, 335), (450, 370)), fil((150, 370), (450, 370))]
    c += [fil((300, 370), (300, 390))] + masse(300, 390)
    if commandes:
        c.append(t(20, 430, "IN1 et IN2 : sorties PWM du STM32 (1 = transistor fermé)", 14, couleur="#444"))
    return svg(600, 450, c)


def schema_i2c():
    c = [t(20, 30, "Schéma S4 — bus I2C des centrales inertielles", 18, "bold"),
         '<rect x="40" y="90" width="150" height="160" fill="#eef" stroke="#000" stroke-width="2"/>', t(115, 120, "STM32", 18, "bold", "middle"),
         t(185, 180, "PB6 / SCL", 13, ancre="end"), t(185, 220, "PB7 / SDA", 13, ancre="end"),
         t(400, 60, "+3,3 V", 15, "bold", "middle"), fil((300, 70), (720, 70)), t(400, 400, "GND", 15, "bold", "middle"), fil((300, 380), (720, 380)),
         fil((190, 175), (720, 175)), fil((190, 215), (720, 215)), t(250, 168, "SCL", 14, "bold"), t(250, 208, "SDA", 14, "bold")]
    for x, n in [(380, 1), (600, 2)]:
        c += ['<rect x="%d" y="250" width="130" height="90" fill="#efe" stroke="#000" stroke-width="2"/>' % (x - 65),
              t(x, 280, f"MPU-6050 n°{n}", 14, "bold", "middle"), t(x, 302, "adresse 0x68", 14, ancre="middle"), t(x, 324, "AD0 → GND", 13, ancre="middle"),
              fil((x - 40, 175), (x - 40, 250)), fil((x - 15, 215), (x - 15, 250)), fil((x + 20, 70), (x + 20, 250)), fil((x + 45, 340), (x + 45, 380)),
              f'<circle cx="{x - 40}" cy="175" r="4"/>', f'<circle cx="{x - 15}" cy="215" r="4"/>']
    return svg(760, 430, c)


def affiche(jour, mention_haut):
    c = ['<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#14325c"/><stop offset="1" stop-color="#2d6cb5"/></linearGradient></defs>',
         '<rect width="700" height="1000" fill="url(#g)"/>', t(350, 110, "MÉCANOVA", 64, "bold", "middle", "#ffd166"),
         t(350, 160, "association de robotique étudiante", 22, ancre="middle", couleur="#fff"),
         t(350, 270, "PORTES OUVERTES", 54, "bold", "middle", "#fff"), t(350, 320, "du local", 30, ancre="middle", couleur="#fff"),
         '<rect x="90" y="370" width="520" height="130" rx="16" fill="#ffd166"/>', t(350, 425, jour, 34, "bold", "middle", "#14325c"),
         t(350, 470, "14 h – 18 h", 30, "bold", "middle", "#14325c"),
         t(350, 560, "Sous-sol du bâtiment B, Villebrune", 24, ancre="middle", couleur="#fff"),
         t(350, 640, "Démonstrations : Rover · Mini-Rover · CanSat", 22, ancre="middle", couleur="#fff"),
         t(350, 680, "Atelier soudure découverte (dès 12 ans)", 22, ancre="middle", couleur="#fff"),
         '<g transform="translate(270,720)"><rect x="0" y="20" width="160" height="70" rx="10" fill="#e63946"/><circle cx="35" cy="100" r="22" fill="#222"/>'
         '<circle cx="125" cy="100" r="22" fill="#222"/><rect x="70" y="-20" width="12" height="40" fill="#ddd"/><circle cx="76" cy="-24" r="10" fill="#ffd166"/></g>',
         t(350, 900, "Entrée libre", 30, "bold", "middle", "#ffd166"), t(350, 950, "mecanova.example", 18, ancre="middle", couleur="#cfe")]
    if mention_haut:
        c.append(t(350, 40, mention_haut, 20, "bold", "middle", "#ff8fa3"))
    return svg(700, 1000, c)


def photo_evenement():
    c = ['<rect width="1000" height="420" fill="#d9d4c7"/>', '<rect y="420" width="1000" height="280" fill="#8a6f4e"/>',
         '<rect x="120" y="40" width="760" height="80" fill="#1d4e89"/>', t(500, 92, "Coupe régionale de robotique — Villebrune 2026", 30, "bold", "middle", "#fff"),
         '<rect x="760" y="150" width="200" height="110" fill="#222" stroke="#555" stroke-width="6"/>', t(860, 185, "SCORE FINAL", 16, "bold", "middle", "#ffd166"),
         t(860, 215, "Mécanova  86", 20, "bold", "middle", "#7CFC00"), t(860, 245, "Robotix  54", 20, "bold", "middle", "#ddd"),
         '<rect x="250" y="380" width="500" height="40" fill="#5a4630"/>', '<rect x="270" y="420" width="20" height="200" fill="#5a4630"/>', '<rect x="710" y="420" width="20" height="200" fill="#5a4630"/>',
         '<g transform="translate(400,300)"><rect x="0" y="0" width="200" height="70" rx="8" fill="#e63946"/><circle cx="40" cy="78" r="20" fill="#222"/><circle cx="160" cy="78" r="20" fill="#222"/>'
         '<rect x="90" y="-60" width="14" height="60" fill="#bbb"/><rect x="60" y="-80" width="74" height="24" fill="#888"/><rect x="150" y="20" width="60" height="12" fill="#999"/></g>',
         '<rect x="430" y="330" width="140" height="22" fill="#fff"/>', t(500, 347, "ROVER", 16, "bold", "middle", "#e63946")]
    for x, couleur in [(140, "#3a86ff"), (840, "#8338ec"), (650, "#fb5607")]:
        c += [f'<circle cx="{x}" cy="300" r="34" fill="#e0b48a"/>', f'<rect x="{x - 45}" y="335" width="90" height="190" rx="30" fill="{couleur}"/>']
    c += [t(140, 470, "MÉCANOVA", 14, "bold", "middle", "#fff"), t(840, 470, "MÉCANOVA", 14, "bold", "middle", "#fff"),
          '<rect x="40" y="560" width="180" height="90" fill="#c0c0c0" stroke="#666" stroke-width="3"/>', t(130, 600, "Trophée", 18, "bold", "middle", "#333"),
          t(130, 628, "1re place", 18, "bold", "middle", "#333")]
    return svg(1000, 700, c)


def main():
    rendre("facture", facture("FV-2026-0583", "2026-10-14", "Électro-Villebrune", "12 rue des Résistances, Villebrune — 06 00 00 00 47",
                              [["Moteur CC 12 V avec encodeur", "4", "18,50", "74,00"], ["Roue 65 mm", "4", "3,20", "12,80"],
                               ["Driver moteur double pont en H", "2", "22,50", "45,00"]],
                              "131,80", "26,36", "158,16", "Réglée par virement le 2026-10-16. Merci de votre confiance."))
    rendre(".facture-micro", facture("FA-2026-1187", "2026-11-02", "MicroComposants Pro", "Zone Nord, Villebrune — commandes en ligne",
                                     [["Carte STM32 Nucleo-F446RE", "2", "15,00", "30,00"], ["Driver moteur double pont en H", "1", "22,50", "22,50"],
                                      ["Lot de connecteurs JST-XH", "5", "2,40", "12,00"], ["Frais de port", "1", "6,50", "6,50"]],
                                     "71,00", "14,20", "87,20", "Réglée par carte le 2026-11-02."))
    # Phone-photo look: slight rotation, perspective, warm uneven light, blur and noise.
    subprocess.run(["magick", str(ICI / ".facture-micro.png"), "-background", "#6b5a48", "-rotate", "-2.5",
                    "-distort", "Perspective", "0,0 14,8  860,0 845,0  0,1060 0,1060  860,1060 852,1050",
                    "(", "+clone", "-sparse-color", "Barycentric", "0,0 #fff8e0 %[fx:w],%[fx:h] #9a8f80", ")", "-compose", "Multiply", "-composite",
                    "-blur", "0x0.8", "-attenuate", "0.4", "+noise", "Gaussian", "-resize", "75%", "-quality", "70", str(ICI / "facture-photo.jpg")], check=True)
    (ICI / ".facture-micro.png").unlink()
    rendre("bon-livraison", bon_livraison())
    rendre("schema-led", schema_led())
    rendre("schema-diviseur", schema_diviseur())
    rendre("schema-pont-h", schema_pont_h(None))
    rendre("schema-pont-h-commande", schema_pont_h({"Q1": "IN1", "Q3": "IN1", "Q2": "IN2", "Q4": "IN2"}))
    rendre("schema-i2c", schema_i2c())
    rendre("affiche", affiche("Samedi 21 novembre 2026", None))
    rendre("affiche-erreur", affiche("Dimanche 21 novembre 2026", "Inscription obligatoire avant le 15/11"))
    rendre("photo-evenement", photo_evenement())


if __name__ == "__main__":
    main()
