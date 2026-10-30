---
adr: 0001
title: Quatre classes de données, et les fournisseurs de modèles autorisés pour chacune
status: proposed
date: 2026-10-30
scope: framing
supersedes: []
superseded-by: []
---

# ADR-0001 — Quatre classes de données, et les fournisseurs de modèles autorisés pour chacune

**À valider par le bureau** ([#29](https://github.com/evolutek/EvoluBot/issues/29)). Tant que cet ADR est `proposed`, aucune donnée réelle n'est envoyée à un fournisseur.

## Context and Problem Statement
L'agent du club envoie du texte à des modèles hébergés par des tiers, sur leurs offres gratuites ([fournisseurs.md](../llm/fournisseurs.md)). Ces offres n'ont pas toutes les mêmes règles : certaines entraînent leurs modèles sur les prompts, d'autres ne gardent rien, et toutes traitent les données hors de la machine du club, souvent hors de l'UE. Les missions de l'agent ([spec](../spec-agent-hermes.md#missions)) manipulent aussi bien des annonces publiques que des fiches de membres. Il faut fixer ce qui peut partir où, avant de brancher le moindre fournisseur.

## Considered Options
- **Un seul niveau, tous les fournisseurs gratuits** : le plus simple et le plus de quota, mais les données des membres finiraient chez des fournisseurs qui entraînent dessus.
- **Un seul niveau, seulement les fournisseurs qui n'entraînent pas** : simple et prudent, mais il prive l'agent de la moitié du quota pour des textes déjà publics.
- **Des classes de données, chacune avec sa liste de fournisseurs** : chaque mission utilise le quota auquel ses données ont droit.
- **Un modèle hébergé par le club pour tout** : rien ne sort, mais il faut un cluster GPU, envisagé à terme et encore absent ([#9](https://github.com/evolutek/EvoluBot/issues/9)).

## Decision Outcome
Chosen option: **des classes de données, chacune avec sa liste de fournisseurs**, because c'est la seule qui protège les données des membres sans gaspiller les offres gratuites sur des textes publics.

### Les classes

| Classe | Contenu | Exemples |
|---|---|---|
| **Publique** | Déjà publié par le club, ou destiné à l'être tel quel | annonces publiées, dépôts publics, pages publiques du vault, règlement de la Coupe |
| **Interne** | Contenu du club non public, sans donnée qui identifie une personne | discussions techniques, comptes rendus anonymisés, budget global, notes privées du vault |
| **Personnelle** | Toute information sur une personne identifiable, pseudo Discord compris | nom, pseudo associé à un message, mail, téléphone, statut de cotisation, transcription d'une réunion |
| **Interdite** | N'est jamais envoyée à un modèle hébergé par un tiers | données sensibles (santé, opinions…), coordonnées bancaires, pièces d'identité, mots de passe et secrets |

Une mission prend la classe la plus haute de ce qu'elle envoie. Remplacer les noms et pseudos par des marqueurs avant l'envoi, puis les remettre au retour, fait passer une donnée de *personnelle* à *interne*. Cette pseudonymisation n'est admise que si elle est faite par du code, pas demandée au modèle.

### Fournisseurs autorisés

| Fournisseur | Publique | Interne | Personnelle | Condition |
|---|---|---|---|---|
| Groq | oui | oui | oui | zéro rétention activée sur le compte |
| Cloudflare Workers AI | oui | oui | oui | — |
| Z.ai | oui | oui | non | point d'accès international (`api.z.ai`) uniquement |
| Mistral | oui | oui | non | entraînement désactivé sur le compte avant le premier appel |
| OpenRouter `:free` | oui | non | non | entraînement interdit dans les réglages du compte |
| Kilo Gateway | oui | non | non | — |

Un fournisseur ajouté plus tard entre dans ce tableau par une PR qui cite ses conditions, sinon il n'a droit à rien. Le cluster GPU aussi, avec une condition de plus : il ne vaut comme hébergement par le club que si le club le contrôle ; s'il est chez un membre, les données sortent quand même du club.

### Application
- **Une clé OmniRoute par classe**, limitée aux connexions de son niveau (`allowedConnections`). **Le bot public ne reçoit que la clé publique ; les clés interne et personnelle vont au bot d'administration** ([#26](https://github.com/evolutek/EvoluBot/issues/26)). L'agent choisit la clé selon la mission ; il ne peut pas en changer à la volée. Le contournement de cette limite signalé dans [#9](https://github.com/evolutek/EvoluBot/issues/9) est corrigé dans OmniRoute 3.8.52, la version déployée.
- **Minimisation** : l'agent n'envoie que ce dont la tâche a besoin ([spec](../spec-agent-hermes.md#règles-de-comportement)) ; une donnée *interdite* repérée dans une entrée est retirée avant l'envoi.
- **Comptes** au nom de l'association, tenus par un membre majeur du bureau, réglages de confidentialité faits avant le premier appel.
- **Révision** dès qu'un fournisseur change ses conditions, et à chaque rentrée.

### Consequences
- Good, because les données des membres ne vont que chez des fournisseurs qui ne s'entraînent pas dessus et ne les gardent pas.
- Good, because la règle se vérifie dans la configuration d'OmniRoute, pas seulement dans les consignes de l'agent.
- Bad, because les missions *personnelles* (accueil, adhésion, comptes rendus) n'ont que deux fournisseurs, donc le plus petit quota.
- Bad, because « ne garde rien » reste une promesse contractuelle d'entreprises américaines ou singapouriennes : seul un modèle hébergé sous le contrôle du club garantit qu'aucune donnée ne sort.
- Neutral: la classe de chaque mission se fixe dans son issue ; le banc d'essai ([banc-essai.md](../llm/banc-essai.md)) choisit ensuite le modèle parmi les fournisseurs autorisés.
