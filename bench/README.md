# Banc d'essai

Les épreuves du [banc d'essai](../docs/llm/banc-essai.md), pour [promptfoo](https://github.com/promptfoo/promptfoo). Toutes les données sont **fictives** : le club « Mécanova » de [fixtures/club-fictif.md](fixtures/club-fictif.md) n'existe pas, ses membres non plus.

## Organisation

| Chemin | Contenu |
|---|---|
| `themes/<lettre>-<thème>/promptfooconfig.yaml` | un thème : son prompt système, ses outils s'il en a, ses épreuves |
| `themes/<lettre>-<thème>/tests/<capacité>.yaml` | les épreuves d'une capacité, trois niveaux (`facile`, `moyen`, `difficile`) |
| `fixtures/` | données fictives partagées : le club, ses membres, ses mails, ses salons |
| `providers.yaml` | les modèles à comparer, générés depuis OmniRoute par `models.sh` |
| `juge.yaml` | le modèle qui note les rubriques |

Chaque épreuve porte ses métadonnées : `theme`, `capacite` (par exemple `A2`), `niveau`. Le classement se calcule en les regroupant.

## Lancer

Depuis un poste d'administrateur, tunnel ouvert vers OmniRoute (`ssh -i ~/.ssh/<sa clé> -N -L 20128:127.0.0.1:20128 grand-conseil@evo-serv1`, détails dans [infra](https://github.com/evolutek/infra), page `docs/omniroute.md`), avec la clé du banc créée dans OmniRoute (connexions : toutes, puisque les données sont fictives) :

```sh
export OMNIROUTE_URL=http://127.0.0.1:20128/v1
export OMNIROUTE_BENCH_KEY=…   # lue dans le tableau de bord, jamais écrite dans un fichier
./models.sh                    # régénère providers.yaml depuis /v1/models
npx promptfoo@0.124.1 eval -c themes/A-agentique/promptfooconfig.yaml --repeat 3
npx promptfoo@0.124.1 view     # résultats dans le navigateur
```

Les offres gratuites limitent le nombre d'appels par jour : un thème à la fois, `--max-concurrency 1`, et reprise après la remise à zéro du fournisseur (`--resume`).

## Écrire une épreuve

- Une capacité, un fichier, trois niveaux au moins.
- Vérification automatique quand c'est possible (`equals`, `contains`, `is-json`, `javascript`) ; sinon une rubrique `llm-rubric` précise, qui dit ce qui vaut des points et ce qui en retire.
- Les noms, mails, numéros et adresses viennent de `fixtures/` ou sont inventés de façon évidente (domaine `mecanova.example`, numéros `06 00 00 00 xx`).
