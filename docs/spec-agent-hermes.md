# Spec : l'agent Hermes du club

Ce que l'agent du club fait, à quoi il a accès et ce qu'il n'a pas le droit de faire. Le suivi est dans l'epic [#7](https://github.com/evolutek/cellacom/issues/7).

**Statut :** spec initiale du 2026-10-23, rien n'est encore en place. Les points marqués *proposé* sont à valider ; le reste est décidé.

## Socle

| Sujet | Choix | Issue |
|---|---|---|
| Agent | [Hermes Agent](https://github.com/NousResearch/hermes-agent) (Nous Research), décidé le 2026-10-14. Il remplace l'ancien bot n8n, [archivé](../archive/n8n/). | [#7](https://github.com/evolutek/cellacom/issues/7) |
| Machine | Mini PC du club, H24 : [matériel](materiel-mini-pc.md), système dans l'[ADR-0001](decisions/0001-nixos-sur-le-mini-pc.md). | [#8](https://github.com/evolutek/cellacom/issues/8) |
| LLM | OmniRoute sur des offres gratuites, dans une instance dédiée au bot ; cluster GPU seulement si ces offres ne suffisent pas. | [#9](https://github.com/evolutek/cellacom/issues/9) |

Briques de Hermes utilisées :

- **Passerelle de messagerie** (`hermes gateway`) pour Discord, la première surface de l'agent.
- **Planificateur cron** intégré pour tout ce qui est périodique.
- **Serveurs MCP** pour les connecteurs.
- *Proposé :* les secrets (token du bot, clé OmniRoute, comptes de service) restent dans un fichier d'environnement hors du dépôt.

## Accès

L'agent est en **lecture seule par défaut**. Chaque droit d'écriture est listé ici, avec sa raison.

| Plateforme | Accès | Pourquoi |
|---|---|---|
| Discord | Lire les membres et les messages, écrire, `MANAGE_ROLES`, `KICK_MEMBERS` | Accueil, rôles, kick, récap, relances, réponses |
| Mail du club | **Lecture seule** | Colis, mails admin importants ([#6](https://github.com/evolutek/cellacom/issues/6)) |
| Google Drive / Sheets | Écriture sur le **fichier des membres uniquement** (*proposé :* partagé avec le compte de service du bot) | Fichier des membres |
| GitHub | Ouvrir des PR sur le vault, jamais de merge | Tenue du vault |
| HackMD | À définir | Sources du récap #info |
| Canva | À définir | — |

Sur Discord, le rôle du bot est placé **au-dessus** des rôles qu'il attribue et **sous** les rôles d'administration, pour qu'il ne puisse jamais s'en donner un.

## Missions

Chaque mission est détaillée dans son issue ; ce tableau ne garde que son déclencheur.

| Mission | Déclencheur | Issue |
|---|---|---|
| Accueil des nouveaux (ancienne spec : [workflow n8n](../archive/n8n/docs/workflows/gestion-hebdomadaire/)) | Arrivée sur le serveur, cron hebdo | [#10](https://github.com/evolutek/cellacom/issues/10) |
| Adhésion : de futur membre à membre (fiche, paiement, relances, retrait) | Passage au rôle Futur-membre, cron hebdo | [#21](https://github.com/evolutek/cellacom/issues/21) |
| Rôles Discord d'après le formulaire | Réponse au formulaire | [#20](https://github.com/evolutek/cellacom/issues/20) |
| Fichier des membres et fiches d'inscription | Réponse au formulaire, départ, cotisation | [#19](https://github.com/evolutek/cellacom/issues/19) |
| Récap hebdomadaire dans #info | Cron hebdo | [#11](https://github.com/evolutek/cellacom/issues/11) |
| Événements depuis Google Agenda et annonces | Nouvel événement dans un calendrier du club | [#22](https://github.com/evolutek/cellacom/issues/22) |
| Newsletter automatique | Cron | [#25](https://github.com/evolutek/cellacom/issues/25) |
| Relance des conseils | Cron, rythme selon la deadline | [#12](https://github.com/evolutek/cellacom/issues/12) |
| Réponses aux questions | Mention de l'agent | [#13](https://github.com/evolutek/cellacom/issues/13) |
| Suivi des colis | Mail de commande ou de livraison | [#14](https://github.com/evolutek/cellacom/issues/14) |
| Compta | Suit les colis | [#15](https://github.com/evolutek/cellacom/issues/15) |
| Comptes rendus vocaux | Fin d'une réunion enregistrée | [#16](https://github.com/evolutek/cellacom/issues/16) |
| Tenue du vault | Nouveau compte rendu, nouvelle information | [#17](https://github.com/evolutek/cellacom/issues/17) |
| Pokédex du club | À définir | [#23](https://github.com/evolutek/cellacom/issues/23) |

Une nouvelle mission devient une sous-issue de [#7](https://github.com/evolutek/cellacom/issues/7), puis une ligne de ce tableau.

## Règles de comportement

La protection de la machine elle-même (conteneur, rootless, correctifs de l'hôte) est dans [securite-agent.md](securite-agent.md).

- **Actions irréversibles.** Un kick, un retrait de rôle ou une modification du fichier des membres est tracé dans un salon de logs réservé aux admins. *Proposé :* un dernier avertissement avant tout kick, et une rétention avant toute suppression de ligne.
- **Validation humaine.** Ce que l'agent publie au nom du club hors de Discord (vault, mails) est validé par un humain. *Proposé :* le récap #info aussi, le temps de valider le format.
- **Comportement versionné.** Hermes crée et améliore ses propres skills. La version de référence des consignes et des skills vit dans ce dépôt ; une évolution proposée par l'agent passe par une PR.
- **Données personnelles.** L'agent n'envoie au LLM que le strict nécessaire à la mission ; la rétention des données des membres et des enregistrements est fixée avant la mise en service.
- **Hors périmètre.** L'agent n'envoie pas de mail au nom du club en dehors des fiches d'inscription, ne paie rien et ne merge rien.
