# SOCIAL-01 — Social launch pack (X viral post, YouTube, platform suite, Back-a-Buddy, share pleas)

**Branch:** `task/social-launch-pack` · **Priority:** owner-directed submission-day task (runs after/parallel to the P0 demo flow — never displaces it) · **Effort:** ~2–3h builder copy + artwork specs
**Satisfies:** none of the PRD FRs — flagged explicitly as **owner marketing, kept OUT of the product submission claims**. (Closest context: SUB-02 X-post/viral-bonus line + Most Viral $20K rule, Event Details:300 — engagement counts to Nov 8 EOD.)
**Decision:** one directory for the whole pack — `docs/launch/` (markdown text + sized artwork binaries + alt text per image, DES-02B precedent). All copy uses `{{VIDEO_URL}}` / `{{BACKABUDDY_URL}}` placeholders until the owner supplies the final links. Builder writes copy; owner approves tone before anything posts.

## Files (create)
- `docs/launch/00-README.md` (index + placeholder swap list); `01-x-viral-post.md` (hook brief + 2–3 example posts, thread + single variants, Nov 5–8 reply plan); `02-youtube-pack.md` (3 titles, description, tags, chapters from the 129s cut, thumbnail concept + 1280×720 spec, transcript matching the ON-SCREEN captions of `docs/demo-video/renders/snaplog-demo.mp4`); `03-platform-suite.md` (FB/IG/X/TikTok/LinkedIn bios + launch posts, per-slot artwork specs, reuse-vs-new mapping); `04-backabuddy-pack.md` (title, hook, story, goal-framing guidance — owner sets the amount, none invented — rewards/updates, self-funded framing); `05-share-pleas.md` (WhatsApp/IM × 3 audiences + influencer terms); binaries under `docs/launch/art/` + `alt-text.txt`.
- REUSE (verify names first): `docs/brand/exports/` FB cover 851×315, LinkedIn cover 1512×256, IG post 1080×1080, IG story 1080×1920, sting 1920×1080 3.0s; `docs/brand/snaplog-avatar-512.png` as profile image. GAPS: X header 1500×500, TikTok profile 200×200 min + first-post cover 1080×1920, YouTube thumbnail 1280×720 (16:9, <2MB) — Paper/Ink/Stall, serif display, no gradients.

## Acceptance
- [ ] Migration sentence verbatim wherever the story is told long-form; Gemini never implied live; every benchmark number labelled DRY-RUN on recorded fixtures (or omitted); rack-walk = Mixkit stock B-roll + architecture, never filmed/processed footage; no invented traction, revenue, users, or prize amounts; "Built with Muse Spark Open" where the Meta stack is described; all-Meta runtime; two-category scope guard; visual search + R-01 future-tense only.
- [ ] Influencer terms state the condition plainly in every variant: no upfront money; IF the project wins a prize, a $500 pool from prize money is shared among influencers who sent proof of sharing (screenshot/link + ask followers to like+share) — goodwill framing, never an unconditional promise.
- [ ] `docs/launch/` builds with zero new product claims; owner inputs recorded: YouTube channel (tonight), Back-a-Buddy account + goal amount, final `{{VIDEO_URL}}` / `{{BACKABUDDY_URL}}` swap.

## Risks / verify first
Current cut is the 129s silent caption cut — transcript must match its on-screen captions, and note the VO slot if the owner dubs tonight. Verify exact export filenames + avatar master before referencing; confirm TikTok/X/YT current safe-area specs via web search before locking dimensions; Back-a-Buddy framing must not leak into `docs/WRITEUP.md` or the submission repo.
