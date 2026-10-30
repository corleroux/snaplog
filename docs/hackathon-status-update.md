# Hackathon Status Update

Digested. Here's what I think and where we are — including two things in `Event Details.md` that change our plan more than the answers you logged.

## 1. Deadline Correction — We Have 12 More Hours Than You Thought

You told me 09:00 EST; the guide says Wed Nov 4 at 9:00 PM ET (stated three times: lines 75, 185, 401). That's 04:00 SAST Thursday Nov 5. Wednesday is now a full build day, Tuesday is the official troubleshooting day, and the runway is ~5.5 days with overnight agents — the compressed schedule fits with actual buffer.

## 2. Red Flag: The Repo as It Stands Is Not Submittable

You wrote "we should be fine, repo created after 26 October." The ruling you pasted says creation date is not the test. Our repo (`corleroux/snaplog`, remote verified) was created today, Oct 30, and its single initial commit is the entire pre-existing Trade Fair Fabric Catalogue (82 migrations, all features). That is exactly "a repo holding your pre-existing project… even up to a tagged baseline" — the structure CV explicitly rejected. Submitting it risks immediate disqualification under "judges must be able to tell what's new."

The fix is cheap because your original repo exists separately at <https://github.com/corleroux/tradefair> — precisely the "pre-existing code in its own repo, named in the README" structure the ruling prescribes. Plan written: `docs/plans/SUB-01-submission-repo.md` — public repo holding only event work (new files verbatim + patch files for modified pre-existing files + README with setup), synced after every task merge. Start it today: judges read commit history, and a repo born on Nov 3 with one dump commit looks terrible. Two decisions for you: the public repo name, and track (Indie vs Startup — Startup explicitly contemplates building on an existing product; pick one, the structure works for both).

**Feedback** :: If we're going to create a new repository for the hackathon code, we must use the code in the `corleroux/snaplog` repo as the pre-existing code. I don't want to use the  <https://github.com/corleroux/tradefair> repository at all during this hackathon. 
If we are to create a new public repo, call it `snaplog-meta-hackathon` and reference the `snaplog` repo as the "pre-existing" code base. We are entering the Startup track. 

## 3. "Every Model Your Project Calls at Runtime Must Be a Meta Model"

Line 393. This demotes Gemini to legacy baseline — fine in code, tests and the write-up, but the demo runtime must be Muse Spark end-to-end. FR-MOD-01 stays as planned (Gemini fixtures prove parity); FR-MOD-02a then flips the default provider. Benchmark headline becomes Muse Spark vs the open-weights model, with Gemini as pre-existing-baseline context. This also maximizes the 25% Meta-tooling score and keeps Stage One safe.

**Feedback** :: Do you need my input here, or is everything crystal clear regarding this item?

## 4. Muse Spark — Fully Verified (Closes My Item 4)

- **Models:** `muse-spark-1.3` (newest, same price), `1.2`, and `1.1` (what your opencode config already uses, proven working).
- **Pricing:** $1.25/M in, $4.25/M out, $0.15/M cached.
- **Limits:** 3,000 RPM / 4M TPM; 1M context.
- Reasoning is always-on and hidden CoT bills at the output rate — fine, extraction is still fractions of a cent per item.
- **Use Standard mode only:** Contributor mode is cheap because Meta trains on your prompts — vendor PII makes that a privacy-NFR violation.
- $150 credits comfortably cover demo + benchmark + SAM video (~$0.36/min).

**Feedback** :: **Use Standard mode only:** Contributor mode is cheap because Meta trains on your prompts — vendor PII makes that a privacy-NFR violation. -> We should use contributor mode during development because it's cheaper (not sure when we will need the credits, I don't want to fall short when we're using the heavy hitter models. Save tokens for when we are on final testing and demo and submission phase

## 5. Open-Weights Leg — I Recommend a Switch from Glimmer

Muse Spark Open (816B MoE, image+video input, structured outputs, open weights) is served on Modal Auto Endpoints — and the event's $100 Modal credits are *explicitly for running Meta open-weight models through Endpoints*. It's a stronger multimodal model with no GPU-hosting work, no Glimmer image-runtime caveat, and it qualifies for the **$10K "Best Build on Meta Open Weight Models"** bonus (partner inference counts).

Fallbacks: Baseten's `muse-spark-open-1026`, or self-hosted Glimmer if you want the own-hardware story. License requires displaying "Built with Muse Spark Open" — I've put that in SUB-01's README list.

**Feedback** :: Happy with the switch from Glimmer to Muse Spark Open

## 6. Still Blocking: Two Credit Confirmations

1. $150 Meta credits claimed **and card attached** — without the card, no Meta API call works at all. -> This has been approved and available
2. Modal $100 request submitted.

These are now the only open items on my list. (Your "what are you looking for specifically?" — that was it: `Event Details.md` plus your working Muse Spark config answered everything else.)

## 7. PII (Your Q6)

Your own captures = you hold the rights; fine on camera as normal product usage. Keep raw eval captures out of the public repo (already gitignored in the eval plan). Combined with §4: Standard mode, never Contributor.

## Where We Are

Day 5 of the event; nothing built yet; four plans queued and ready: FR-SCH-01 → FR-MOD-01 → FR-MOD-04-eval-set, plus SUB-01 (now, in parallel).

### Updated Sequence

Fri registry + eval start + submission repo + credit confirmations → Sat provider interface + garment shoot → Sun Muse Spark provider + default flip + garment schema (Modal drop-dead #1) → Mon video pipeline + category switch + benchmark runner (drop-dead #2) → Tue benchmark runs, write-up, record video → Wed polish, X post (free shot at the $20K viral bonus), submit by 9 PM ET.

### Rubric Mapping for the Video Script

- **Impact — 30%:** "Build for Your World" is literally our PRD.
- **Meta tooling — 25%:** Spark + SAM 3.1 + open weights on Modal + agentic build.
- **Tech depth — 20%:** schema-driven generalisation, one provider interface, async video.
- **Demo — 25%:** live footage only, 30-second hook, judges stop at 3:00.

Builder can start FR-SCH-01 immediately. Say go and I'll write FR-MOD-02a (Muse Spark provider + default flip) and FR-SCH-03 (garment schema) next.
