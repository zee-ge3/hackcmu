# Probability question bank

`probability_bank.json` is built by `build_probability_bank.py` from everything under `raw/`.
Schema is documented at the top of the build script.

| source              | count | answers | solutions | notes |
|---------------------|------:|--------:|----------:|-------|
| MATH (counting&prob)|   501 |     501 |       501 | AMC 8/10/12 + AIME derived, levels 1-5 |
| AIME 1983-2024      |   102 |     102 |         0 | probability-keyword filtered |
| AoPS wiki           |    68 |      57 |        68 | Introductory + Intermediate Probability categories, AMC/AHSME/AIME/iTest tagged |
| quantprof.org       |    60 |       0 |        60 | the free tier; problems 61+ are paid Premium. 3 hints + official written solution per problem |
| quantprof YouTube   |    37 |       0 |        37 | videos with no matching site problem; transcript holds statement + solution |
| AIMO AMC / AIME     |    19 |      19 |         9 | 2022-2024 validation sets |

Raw inputs
- `raw/youtube/quantprof_youtube.json`  67 videos: title, description, transcript. `raw/youtube/thumbs/` has thumbnails (visual reference for the visualizer), `raw/youtube/meta/` has info.json + vtt.
- `raw/quantprof_problems_full.json`  60 free problems: statement, level, firms, topic, hints, solution.
- `raw/quantprof_catalog.json`  all 1,018 site problems: title, topic, difficulty, firms (no statements; 958 are Premium-only).
- `raw/instagram/quantprof_instagram_public.json`  12 public posts (alt text only; account needs login for more).
- `raw/aops_probability.json`  AoPS wiki pages with Problem/Solution sections.
- `raw/amc/*.json`  MATH, AIME 1983-2024, AIMO validation, NuminaMath amc_aime sample.

Rebuild: `python3 data/build_probability_bank.py`
