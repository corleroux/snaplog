# 01 — Main viral X post

This is THE viral-bonus post. Judges/platforms count engagement to
**Nov 8 EOD**, so the job of this post is to travel beyond dev Twitter
into three rooms: (1) trade-fair / sourcing buyers, (2) fashion & textile
people, (3) the SA startup community. Lead with the human problem, not
the stack — the stack is the proof in post 2.

## Hook brief

- Open on pain everyone recognises: the camera roll after a trade fair.
- One line that a non-technical person can quote: **“Snap it. Catalogued.”**
- Show, don't claim: the 129s demo shows a real label becoming a real
  catalogue record. Attach the video natively to X if possible (native
  video outperforms links); keep `https://youtu.be/rgE5Kw5XFlo` as the pinned reply.
- Ask for ONE action explicitly: repost. Likes are nice; reposts travel.
- No numbers we can't stand behind. No prize amounts. No "revolutionary".

## Example A — single post (recommended main)

> Every trade fair ends the same: 400+ phone photos, business cards everywhere, and a spreadsheet built by hand.
>
> Snaplog lets a buyer point their phone at a label or garment and get a searchable catalogue back.
>
> Snap it. Catalogued. 🎥
>
> Repost to help a self-funded startup launch? 🇿🇦
> https://youtu.be/rgE5Kw5XFlo

## Example B — thread opener (use if threading)

> 1/ I spent this week at the intersection of trade fairs and AI.
>
> Buyers at fabric & garment fairs photograph everything — labels,
> samples, racks — then spend days matching photos to notes by hand.
>
> So I built the thing that does the matching. Meet Snaplog. 🧵

Thread body (posts 2–5, each stands alone if screenshotted):

> 2/ Photograph a fabric label. Snaplog's AI reads it against a schema —
> composition, weight, construction — and you review, correct and commit.
> Nothing is guessed: low-confidence fields are flagged, not filled.
> [attach fabric segment or still: art/youtube-thumbnail-1280x720.png crop]

> 3/ Here's the part I'm proudest of: a catalogue type is just a schema.
> extraction used to run on Gemini; this week we moved it behind a
> provider interface onto Muse Spark. Garments were then added as a
> schema definition — zero application code changes. Same pipeline, new
> category.

> 4/ Video too: walk a rack, and the job hands off asynchronously (Modal)
> while SAM 3.1 — via the Meta Model API — isolates each item. Every crop
> re-enters the same extract → review → commit path. (Rack footage in the
> demo is Mixkit stock B-roll; the isolation pipeline is the real thing behind it.)

> 5/ Built with Muse Spark, Muse Spark Open and SAM 3.1 on Meta's stack
> for the Meta × Cerebral Valley hackathon. Self-funded, from South
> Africa, building for the buyers I watched drown in camera rolls.
>
> If this deserves to exist, a repost is the cheapest way to make it real:
> https://youtu.be/rgE5Kw5XFlo
> Back the build: https://www.backabuddy.co.za/campaign/back-the-launch-of-snaplog-snap-it-catalogued

## Example C — SA-startup angle (quote-post / second push, Nov 5–6)

> Self-funded. No team of twenty. One builder, one week, one idea:
> the camera roll a trade-fair buyer already has *is* the catalogue —
> it just needs structure.
>
> Snaplog turns fair photos into searchable records for fabric &
> garment buyers. Demo's 2 minutes. A repost could change where this
> goes next. 🇿🇦 https://youtu.be/rgE5Kw5XFlo

## Posting mechanics

- Post natively with the video file (`docs/demo-video/renders/snaplog-demo.mp4`)
  attached where the platform supports it; `https://youtu.be/rgE5Kw5XFlo` goes in the
  first reply + bio link until the YouTube link exists.
- Pin the post. Add alt text (art/alt-text.txt) to any image attached.
- Hashtags (max 3, end of post only): #BuildForYourWorld #FashionTech
  #SouthAfrica — verify the official event hashtag before posting and
  swap it in if one exists.
- First-hour rule: reply to every comment; quote-post your own thread
  once with Example C after ~6 hours.

## Nov 5–8 reply plan (engagement window)

- Daily: one quote-post with a new angle (buyer pain → schema trick →
  video pipeline → "what I'd build next"), always linking the main post.
- Reply to judges/builders with substance: the schema-registry idea and
  the never-guess rule are the two technical hooks worth repeating.
- Thank every repost publicly (no copy-paste thanks — name what they do).
- Nov 8 morning: final push post ("last day engagement counts") +
  resend the WhatsApp pleas (05) once, friends-and-family variant only.
