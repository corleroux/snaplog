# Eval set (FR-MOD-04 prerequisite)

Hand-labelled real captures used to benchmark every provider on the same
inputs (PRD §8). Data only — no product code.

## Layout

- `manifest.json` — one entry per capture: id, file, class, source,
  schema slug, ground truth mirroring the schema's payload shape,
  languages, failure tags. Video entries list expected distinct items.
- `captures/` — **gitignored, never committed, never published.** Read-only
  export from production storage plus fresh shoots. The public submission
  repo carries the manifest only (`scripts/build-submission.sh` excludes
  `eval/captures/*`).

## Classes

`composition_tag` | `swatch` | `garment` | `business_card` | `stall_front` | `rack_video`

## Sources

`existing` (production export) | `fresh` (trade-fair shoot) | `web`
(provisional web captures — replaced by the shoot; never used for PII).

## Labeling rules

- Null only where truly absent. Never invent composition, sizing, price or
  brand names. An empty hanger labels to all-nulls (never-guess check).
- Multi-item photos label the prominent item; add the `multi-item` tag.
- Tag capture conditions honestly: `glare` / `blur` / `mixed-language` /
  `clutter` / `low-light` / `back-view` / `worn` / `mannequin` / `people` /
  `text-signage` / `no-garment`.
- Vendor cards and stall fronts may contain PII: owner's explicit OK required
  before including them, and never in published material or the demo video
  without clearance.
- Web captures are stand-ins until the shoot lands; keep `source: "web"` so
  the benchmark can report provisional vs final numbers separately.

## Targets (~50)

≥15 composition tags in ≥3 languages; ~8 swatches; ~10 business cards;
~5 stall fronts; ~12–15 garment photos; 2–3 rack-walk videos (30–60 s).
Web captures currently cover garments only — everything else needs the
production export (read-only SQL) and the shoot.
