# Comptes des fournisseurs

Ouvrir un compte chez chaque fournisseur retenu ([fournisseurs.md](fournisseurs.md)), le régler pour qu'il ne garde ni n'entraîne rien quand c'est possible, et le brancher à OmniRoute avec une clé par classe de données ([ADR-0001](../decisions/0001-classes-de-donnees-llm.md)).

**État au 2026-10-29 :** Groq, Cloudflare, Z.ai, Mistral et OpenRouter branchés à OmniRoute, protection de débit active ; les quatre clés créées et vérifiées (étape 3) ; réglages de confidentialité en place (ci-dessous). Reste à passer les clés des agents dans les secrets de l'infra.

## Avant de commencer

- **Le compte est celui de l'association**, pas d'un membre : on se connecte avec le compte Google du club partout où c'est proposé, ce qui évite un mot de passe de plus. Sinon, l'adresse mail du club, et le mot de passe va dans le gestionnaire de mots de passe du club dès qu'il existe.
- **Le titulaire est un membre majeur du bureau** (Groq et d'autres exigent 18 ans).
- **Les réglages de confidentialité se font avant le premier appel.** Un appel fait avant est déjà parti sous les anciennes règles.
- **Une clé de fournisseur ne quitte pas la console du fournisseur ni le tableau de bord d'OmniRoute** : on la colle directement dans OmniRoute, jamais dans un message, un fichier ou un dépôt.

## Ouvrir et régler chaque compte

| Fournisseur | Inscription | Réglage à faire tout de suite | Clé |
|---|---|---|---|
| Groq | [console.groq.com](https://console.groq.com) | Activer la **zéro rétention** globale ([Settings → Data Controls](https://console.groq.com/settings/data-controls)) ; relever les quotas (*Settings → Limits*) | *API Keys → Create API Key* |
| Cloudflare Workers AI | [dash.cloudflare.com](https://dash.cloudflare.com), plan Free, sans carte | Rien à désactiver ; ne pas toucher à AI Gateway | *Build → AI → Workers AI → Use REST API* : **Create a Workers AI API Token** (modèle proposé : Workers AI *Read* et *Edit*, sur le seul compte du club) et l'**Account ID** |
| Z.ai | [z.ai](https://z.ai), plateforme API (lien *API*, pas l'application de chat ni *Coding Plan*) ; aucun crédit | Ne rien accepter qui autorise l'usage du contenu pour améliorer les services | *API Keys → Add API Key* (depuis le 2026-10-16, ces clés ne servent que l'API standard, jamais le Coding Plan) ; supprimer la clé créée d'office à l'inscription |
| Mistral | [console.mistral.ai](https://console.mistral.ai), *Free mode* | Désactiver **Anonymous improvement data** dans *API → Privacy* (la page *Privacy* de la section *Vibe* ne concerne pas l'API) ; quotas par modèle dans *API → Limits* | *API Keys* |
| OpenRouter | [openrouter.ai](https://openrouter.ai) ; aucun crédit | Dans *Settings → Privacy*, refuser l'entraînement **pour les modèles gratuits** (réglage distinct de celui des payants) : la plupart des modèles `:free` deviennent injoignables, c'est voulu | *Keys*, *Credit limit* à 0 (les modèles gratuits passent quand même) |
| Kilo Gateway | sans compte (200 requêtes/heure par IP) | — | aucune |

Pour chaque compte, relever dans [fournisseurs.md](fournisseurs.md) les quotas réellement affichés par la console, avec la date, s'ils diffèrent de ceux qui y sont écrits.

### Réglages de confidentialité en place

Ce qui conditionne la classe de données qu'un fournisseur peut recevoir ([ADR-0001](../decisions/0001-classes-de-donnees-llm.md)). Relevé le 2026-10-29 par l'intendant, à refaire après tout changement de conditions ou de compte.

| Fournisseur | Réglage | Comment c'est établi | Classes permises |
|---|---|---|---|
| Groq | Zéro rétention activée (*Settings → Data Controls*) | constaté dans la console | publique, interne, personnelle |
| Cloudflare Workers AI | Rien à régler : pas d'entraînement ni de conservation des prompts par Workers AI ; AI Gateway, qui journaliserait, n'est pas utilisé | conditions publiques | publique, interne, personnelle |
| Z.ai | Aucun accord donné pour l'usage du contenu (l'API ne l'utilise pas sans accord explicite) ; aucun crédit, clé limitée à l'API standard | conditions publiques ; rien d'accepté à l'inscription | publique, interne |
| Mistral | *Anonymous improvement data* désactivé dans *API → Privacy* (la page *Privacy* de *Vibe* est distincte) | constaté dans la console | publique, interne |
| OpenRouter | Entraînement refusé pour les modèles gratuits (*Settings → Privacy*) ; plafond de crédit à 0 $ | constaté dans la console **et** à l'usage : OpenRouter refuse 8 modèles `:free` sur 16 avec le motif `free-model-training-violation-by-account` | publique |

Côté OmniRoute, la clé `agent-personnelle` a `noLog` activé : OmniRoute ne garde pas non plus le contenu de ses requêtes.

## Brancher les fournisseurs à OmniRoute

Le tableau de bord n'écoute que sur la machine : on y passe par un tunnel SSH (procédure dans le dépôt [infra](https://github.com/evolutek/infra), page `docs/omniroute.md`).

1. **Une connexion par fournisseur** : *Providers*, choisir le fournisseur, *Add API Key*, puis *Check* et *Save*. Toujours : nom `<fournisseur>-evolutek` (c'est lui qu'on choisit dans les listes de connexions des clés), *Import only free models* activé (un modèle payant n'est jamais importé, même si une carte est ajoutée un jour), puis le bouclier de **protection de débit** passé à *Protected* sur la ligne de la connexion. *Bulk Add* (plusieurs comptes du même fournisseur en rotation) n'est pas utilisé : les conditions des fournisseurs l'interdisent.

| Fournisseur | *Per-Model Quota* | *Validation Model* (le moins coûteux en quota) | Autre |
|---|---|---|---|
| Groq | activé (limites par modèle) | `openai/gpt-oss-20b` | *Excluded Models* : `canopylabs/orpheus-arabic-saudi, canopylabs/orpheus-v1-english` (synthèse vocale, inutile) |
| Cloudflare | désactivé (quota de neurons commun) | `@cf/meta/llama-3.2-3b-instruct` | *Account ID* du compte |
| Z.ai | activé (limites par modèle) | `glm-4.7-flash` | Pas la carte *Z.ai* ni *GLM* (elles visent le Coding Plan) : *Providers → Add OpenAI Compatible*, préfixe `zai-api`, *Base URL* `https://api.z.ai/api/paas/v4`, puis *Add Connection* sur ce nœud. *Import only free models* n'existe pas ici : exclure tout ce qui n'est pas `glm-4.7-flash`, `glm-4.5-flash` ou `glm-4.6v-flash` (seuls gratuits ; `glm-5.3-flash` est payant), et ajouter les deux derniers en modèles personnalisés |
| Mistral | activé (limites par modèle) | `ministral-8b-2512` (`mistral-small-latest` renvoie des 429 en offre gratuite) | — |
| OpenRouter | désactivé (limites communes au compte) | `recursive/flint-v1.0:free` | *Excluded Models* : les modèles `:free` refusés par le réglage de confidentialité ou réservés aux « agentic harnesses » ; sans *Per-Model Quota*, une erreur sur l'un d'eux mettrait toute la connexion en pause |

2. **Quatre clés d'API** (*API Keys*), une par classe plus celle du [banc d'essai](banc-essai.md), sans portée de gestion :

| Clé | Connexions autorisées (`allowedConnections`) | Autres réglages |
|---|---|---|
| `bench` | toutes | — (le banc ne manipule que des données fictives) |
| `agent-publique` | toutes celles du tableau de l'ADR | — |
| `agent-interne` | Groq, Cloudflare, Z.ai, Mistral | `allowAutoCombos` désactivé |
| `agent-personnelle` | Groq, Cloudflare | `allowAutoCombos` désactivé, `noLog` activé |

Une liste de connexions non vide suffit à restreindre la clé. `noLog` empêche OmniRoute de garder le contenu des requêtes dans ses propres journaux. Les combos automatiques peuvent choisir un modèle hors de la liste attendue : on les coupe pour les clés qui portent des données non publiques.

3. **Vérifier chaque clé** depuis la machine, avec un modèle qu'elle ne doit **pas** pouvoir joindre : la requête doit être refusée. Fait le 2026-10-29 :

| Clé | Modèle demandé | Attendu | Obtenu |
|---|---|---|---|
| `agent-personnelle` | `groq/openai/gpt-oss-20b` | servi | servi |
| `agent-personnelle` | `mistral/mistral-small-latest` | refusé | refusé (« excluded by the API key's connection allowlist ») |
| `agent-interne` | `openrouter/recursive/flint-v1.0:free` | refusé | refusé (même motif) |
| `agent-interne` | `zai-api/glm-4.7-flash` | servi | servi |
| `agent-interne` | `mistral/ministral-8b-2512` | servi | servi |
| `agent-publique` | `zai-api/glm-5.3-flash` (payant, exclu) | refusé | refusé |
| `agent-publique` | `openrouter/recursive/flint-v1.0:free` | servi | servi |

4. **Les clés d'OmniRoute vont à l'agent** par les secrets chiffrés du dépôt infra (`hermes/env`), une variable par classe. En attendant, leurs valeurs sont dans le trousseau de l'administrateur qui les a créées : OmniRoute ne les montre qu'à la création.

## Quand une condition change

Un fournisseur qui modifie ses conditions de confidentialité ou de gratuité repasse par [fournisseurs.md](fournisseurs.md) et l'ADR avant que sa connexion soit réactivée ; en attendant, on la désactive dans OmniRoute.
