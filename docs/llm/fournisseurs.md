# Fournisseurs de modèles gratuits

Quels fournisseurs l'agent peut appeler gratuitement, à quelles conditions, et ce qu'ils font des prompts. Ce que chaque classe de données a le droit de leur envoyer se décide dans [#29](https://github.com/evolutek/EvoluBot/issues/29) ; comment on compare leurs modèles, dans [banc-essai.md](banc-essai.md).

**Statut :** relevé du 2026-10-28, sur les pages publiques des fournisseurs, sans compte. Ces offres changent souvent : chaque ligne se revérifie avant de créer un compte.

## Critère d'entrée

Une offre gratuite qui **revient sur un calendrier fixe** (par minute, heure, jour ou mois), utilisable par une passerelle (OmniRoute) depuis la France. Les crédits uniques d'inscription, les essais limités dans le temps et les offres réservées à un client précis n'entrent pas.

## Retenus

| Fournisseur | Gratuit (remise à zéro) | Modèles gratuits | Entraînement sur les prompts | Rétention | Pays, droit | Usage par un bot d'association |
|---|---|---|---|---|---|---|
| [Groq](https://console.groq.com/docs/rate-limits) | par modèle, relevé dans la console du club le 2026-10-29 : gpt-oss-120b, gpt-oss-20b, qwen3.8-27b à 30 req/min, 1 000 req/jour, 8k tokens/min, 200k tokens/jour ; allam-2-7b 7 000 req/jour, 500k tokens/jour ; Whisper large v3 (turbo) 2 000 req/jour, 8 h d'audio/jour (glissant) | gpt-oss-120b, gpt-oss-20b, qwen3.8-27b ; 131k ; outils (pas en parallèle sur gpt-oss). Aussi : llama-prompt-guard-2 (22m, 86m) et gpt-oss-safeguard-20b, des classifieurs de sécurité | **non**, par contrat : « not permitted to use Inputs or Outputs for training » ([§4.2](https://console.groq.com/docs/legal/services-agreement)) | rien par défaut, journaux ≤ 30 jours, zéro rétention activable par tous ([your-data](https://console.groq.com/docs/your-data)) | États-Unis (stockage GCP US) ; contrat EMEA avec Groq UK Ltd | permis : « End Users » d'une « Customer Application » (§3.1) ; pas de revente ; titulaire majeur |
| [Cloudflare Workers AI](https://developers.cloudflare.com/workers-ai/platform/pricing/) | 10 000 neurons/jour (~300k tokens d'entrée sur gpt-oss-120b), 00:00 UTC ; 300 req/min | gpt-oss-120b, llama-3.3-70b, glm-4.7-flash (131k, outils), kimi-k2.5, mistral-small-3.1, qwen3-30b, qwen3.8-27b | **non** : « does not use Customer Content… to train » ([data-usage](https://developers.cloudflare.com/workers-ai/platform/data-usage/)) | aucun contenu gardé, métadonnées seulement | États-Unis, droit californien | pas de revente d'accès ([§2.2.1](https://www.cloudflare.com/terms/)) ; la clause « proxy » vise les VPN (notre lecture) |
| [Z.ai](https://docs.z.ai/guides/overview/pricing) (international de Zhipu) | gratuit permanent, débit limité ; chiffre exact dans la console | GLM-4.7-Flash (200k, sortie 128k), GLM-4.5-Flash, GLM-4.6V-Flash (images) | **non** par l'API sans accord explicite ([conditions API §3(b)](https://docs.z.ai/legal-agreement/terms-of-use.md)) ; oui pour un compte de chat | aucun contenu stocké ([DPA §4(b)](https://docs.z.ai/legal-agreement/privacy-policy)) | Singapour, droit de Singapour ; groupe chinois | permis : « for the benefit of end users » ; clé non partagée ; pas de revente |
| [Mistral](https://docs.mistral.ai/admin/billing-usage/usage-limits) (Free mode) | quota mensuel, chiffres dans la console ; « evaluation and prototyping » | non publiés sans compte | **oui par défaut**, désactivable : Admin > Privacy > *Anonymous improvement data* ([aide](https://help.mistral.ai/en/articles/455207)) | 30 jours anti-abus (non confirmé sur la page actuelle) ; zéro rétention payante | **France**, hébergement UE, droit français | « End Users » d'une offre client prévus (§1.4) ; accès de tiers sur autorisation (§2.2(i)) : à faire confirmer |
| [OpenRouter](https://openrouter.ai/docs/api-reference/limits) (modèles `:free`) | 20 req/min ; 50 req/jour, ou 1 000 après un achat unique de 10 crédits ; jour UTC | 16 modèles, un seul fournisseur chacun : Nemotron 3.5 (Nvidia, 1M, outils), Gemma 4 31B/26B (Google, 262k, outils), Laguna (Poolside), Inkling (Thinking Machines), Flint, north-mini-code… | OpenRouter non ; **au moins Nvidia, Poolside et Thinking Machines** loguent ou entraînent. Réglage « ne pas router vers ceux qui entraînent », qui retire environ la moitié des modèles gratuits ([logging](https://openrouter.ai/docs/guides/privacy/provider-logging)) | OpenRouter : rien par défaut ; fournisseurs : chacun sa règle | États-Unis, droit de New York | pas de revente (§7(4)) ; comptes d'organisation prévus |
| [Kilo Gateway](https://kilo.ai/docs/gateway/models-and-providers) | 200 req/heure par IP sans compte ; avec compte, non chiffré | `kilo-auto/free` (256k, outils), Beam, les `:free` d'OpenRouter | **oui possible**, sans opt-out : « may route your requests to providers that log prompts and outputs… Do not submit personal or confidential data » ; licence d'amélioration ([§7(A)](https://kilo.ai/terms)) | tant que le compte existe | États-Unis, droit du Delaware | utilisateurs finaux par l'API permis (§5(C)(i)) |

## Sous condition

| Fournisseur | Ce qui manque |
|---|---|
| [LLM7](https://docs.llm7.io/limits.md) : 60 req/min, 250 req/heure, 100k tokens par 24 h glissantes ; gpt-oss-20b, minimax-m2.7, nemotron-3-nano, codestral | Ses conditions interdisent « share, pool, proxy » sans accord écrit ([§3A](https://raw.githubusercontent.com/chigwell/llm7.io/main/TERMS.md)) : il faut demander une dérogation. Exploité par une personne seule au Royaume-Uni, fournisseurs amont non divulgués. |
| [OVHcloud AI Endpoints](https://docs.ovhcloud.com/en/guides/public-cloud/ai-machine-learning/ai-endpoints-capabilities) : 2 req/min par IP et par modèle, sans clé | Débit très faible ; conditions et entraînement à lire. Hébergé à Gravelines, droit européen : le profil le plus souverain. |
| ModelScope international : 2 000 req/jour, 500 par modèle, 00:00 UTC+8 (sources tierces) | Documentation officielle illisible sans navigateur ; identité exigée d'un étranger et confidentialité inconnues. |
| LongCat (Meituan, site international) : quota quotidien annoncé par des tiers | Absent de la documentation officielle actuelle ; confidentialité non lue. |
| SambaNova : la documentation décrit 20 req/jour et 200k tokens/jour sans moyen de paiement | La page des offres exige carte et crédits depuis août 2026 : sans doute retiré. |

## Écartés

| Fournisseur | Raison |
|---|---|
| Google Gemini (AI Studio) | Ses conditions : « You may use only Paid Services when making API Clients available to users in the European Economic Area » ([conditions](https://ai.google.dev/gemini-api/terms)). |
| Nous Portal | Licence d'entraînement sur toutes les données dans les conditions (§12.3), sans opt-out. |
| Cohere | Clé d'évaluation, entraînement sans opt-out pour les comptes d'essai, partage de compte interdit. |
| NVIDIA NIM | Essai, production interdite, contenu utilisé pour améliorer les modèles. |
| GitHub Models | Retiré le 2026-07-30. |
| Cerebras, Scaleway, Liquid AI, PublicAI, Inference.net, FreeModel, Tencent, Baichuan, SiliconFlow (international) | Crédit unique ou essai seulement. Scaleway reste le meilleur choix **payant** (Paris, zéro rétention, pas d'entraînement). |
| Hugging Face, Ollama Cloud, Chutes, Reka, Kimi, DeepSeek, StepFun (texte), Baidu Qianfan, SenseNova | Aucune offre gratuite récurrente aujourd'hui. |
| OpenCode Zen | Gratuit réservé au client OpenCode, temporaire, usage interne seulement. |
| Pollinations | Pas de quota ni de date de remise à zéro garantis. |
| Zhipu (Chine), iFlytek Spark, SiliconFlow (Chine), ModelScope (Chine) | Identité réelle chinoise exigée (Spark : pas d'appel d'outils non plus). |
| Morph | Récurrent mais 200 req/mois, modèles de code seulement. |
| Nara, xKiro, BazaarLink, api.airforce, Bluesminds, uncloseai, MonsterAPI | Opérateurs anonymes ou non vérifiables, relais opaques de quotas gratuits d'autres acteurs, contenu conservé ou service mort. |

## Constaté avec les comptes du club

Relevé du 2026-10-29, en branchant les comptes à OmniRoute ; complète ou corrige les lignes ci-dessus.

- **Z.ai** : la grille tarifaire confirme trois modèles gratuits, GLM-4.7-Flash, GLM-4.5-Flash et GLM-4.6V-Flash ; GLM-5.3-Flash, malgré son nom, est payant. Les clés de la plateforme API ne servent que l'API standard, jamais le Coding Plan. Environ 7 s pour une courte réponse de GLM-4.5-Flash.
- **Mistral** : l'offre gratuite donne des limites par modèle (*API → Limits*) et sert aussi des modèles tiers hébergés par Mistral (DeepSeek, GLM). `mistral-small-latest` répondait 429 à chaque essai ce jour-là, `ministral-8b-2512` répondait.
- **OpenRouter** : une fois l'entraînement refusé pour les modèles gratuits, 6 modèles `:free` sur 16 restent joignables : `recursive/flint-v1.0`, `dots-studio/dots-3-note-preview`, `cohere/north-mini-code`, `xingchen-agi/xing4.0-29b-a4b`, et les deux Gemma 4 (ces trois derniers souvent saturés en amont). Les Nemotron, Liquid et Poolside sont refusés par OpenRouter pour ce motif ; les deux Inkling sont réservés aux « agentic harnesses ». Une clé plafonnée à 0 $ appelle quand même les modèles gratuits.

## Classes de données

Quelle classe de données chaque fournisseur retenu peut recevoir : [ADR-0001](../decisions/0001-classes-de-donnees-llm.md). Ouvrir les comptes et les régler : [comptes.md](comptes.md).

## Encore à vérifier

- Mistral §2.2(i) : qu'un bot d'association relève bien des « End Users » d'une offre client.