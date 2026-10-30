# Banc d'essai

Les épreuves du [banc d'essai](../docs/llm/banc-essai.md), pour [promptfoo](https://github.com/promptfoo/promptfoo). Toutes les données sont **fictives** : le club « Mécanova » de [fixtures/club-fictif.md](fixtures/club-fictif.md) n'existe pas, ses membres non plus.

## Organisation

| Chemin | Contenu |
|---|---|
| `themes/<lettre>-<thème>/promptfooconfig.yaml` | un thème : son prompt système, ses outils s'il en a, ses épreuves |
| `themes/<lettre>-<thème>/tests/<capacité>.yaml` | les épreuves d'une capacité, trois niveaux (`facile`, `moyen`, `difficile`) |
| `fixtures/` | données fictives partagées : le club, ses membres, ses mails, ses salons |
| `providers.yaml` | les modèles à comparer, générés depuis OmniRoute par `models.sh` |
| `juge.yaml` | le juge des rubriques ; `lancer.py` choisit son modèle, hors de la famille testée |
| `lancer.py` | lance le banc par voies, le reprend, donne l'état et le classement |
| `lib/omniroute.js` | le fournisseur promptfoo vers OmniRoute |

Chaque épreuve porte ses métadonnées : `theme`, `capacite` (par exemple `A2`), `niveau`. Le classement se calcule en les regroupant.

## Lancer

Depuis un poste d'administrateur, tunnel ouvert vers OmniRoute (`ssh -i ~/.ssh/<sa clé> -N -L 20128:127.0.0.1:20128 grand-conseil@evo-serv1`, détails dans [infra](https://github.com/evolutek/infra), page `docs/omniroute.md`), avec la clé du banc créée dans OmniRoute (connexions : toutes, puisque les données sont fictives) :

```sh
export OMNIROUTE_URL=http://127.0.0.1:20128/v1
export OMNIROUTE_BENCH_KEY=…   # lue dans le trousseau au lancement, jamais écrite dans un fichier
./models.sh                    # régénère providers.yaml : les modèles de texte de nos connexions
./lancer.py run                # jusqu'à la fin, sur plusieurs jours ; se relance sans rien perdre
./lancer.py etat               # où en est chaque modèle, et les pauses en cours
./lancer.py classement         # classement par thème et par niveau, à tout moment
```

Le code écrit par les modèles (thème G) tourne dans un bac à sable, sans quoi il pourrait lire ou effacer les fichiers du poste : il faut `bwrap` (bubblewrap), et le banc refuse d'exécuter ce code sans lui.

## Comment le banc avance

Les offres gratuites limitent les appels, et chaque fournisseur à sa façon. `lancer.py` est fait pour qu'une limite n'arrête jamais le reste :

- **Une voie par quota.** Un modèle a sa propre voie chez les fournisseurs qui comptent par modèle (Groq, Z.ai, Mistral) ; Cloudflare et OpenRouter, au quota commun, ont une seule voie pour tous leurs modèles. Une voie en pause ne retient pas les autres.
- **Pas d'attente dans promptfoo.** Son fournisseur OpenAI patiente plusieurs minutes sur un 429 ; [`lib/omniroute.js`](lib/omniroute.js) fait un seul essai et rend la main. La voie se met alors en pause (1 min, puis le double, jusqu'à 1 h) et réessaie seule : elle repart dès que le quota revient, sans connaître l'heure de sa remise à zéro.
- **Reprise.** Chaque résultat s'ajoute à `journal.jsonl` dès qu'il est connu. Après un arrêt, une panne de tunnel ou une mise en veille, `run` repart de ce qui manque. Les réponses des modèles sont gardées (`reponses/`) : rejouer une épreuve dont le juge a échoué ne dépense pas de quota.
- **Même ordre pour tous.** Les épreuves passent dans le même ordre mélangé pour tous les modèles, et les modèles d'une voie à tour de rôle : un classement partiel compare déjà les mêmes épreuves.
- **Le juge a ses pauses.** Si le juge est limité, seules les épreuves qui ont besoin de lui attendent.

Une épreuve se termine dans l'un de ces états :

| État | Sens | Dans le classement |
|---|---|---|
| `note` | passée et notée | son score |
| `impossible` | refusée pour de bon (prompt trop long, format non pris en charge) | 0 : le modèle ne sait pas le faire |
| `erreur` | panne qui persiste après 3 essais | ignorée |

Un modèle qui répond 401, 402, 403 ou 404 trois fois de suite est noté mort et écarté. Pour le retester, retirer sa ligne `modele_mort` du journal.

Les résultats vont dans `resultats/`, ou dans le dossier donné par `BENCH_RESULTATS`. Ils ne contiennent que des données fictives. `--repetitions N` rejoue tout N fois, une fois le passage précédent terminé partout ; `--voie NOM` limite le lancement à une voie.

## Écrire une épreuve

- Une capacité, un fichier, trois niveaux au moins.
- Vérification automatique quand c'est possible (`equals`, `contains`, `is-json`, `javascript`) ; sinon une rubrique `llm-rubric` précise, qui dit ce qui vaut des points et ce qui en retire.
- Les noms, mails, numéros et adresses viennent de `fixtures/` ou sont inventés de façon évidente (domaine `mecanova.example`, numéros `06 00 00 00 xx`).
