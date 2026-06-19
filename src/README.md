# Agent(cy)

> *"The first AI-native recruitment service that finds engineers where they actually work — and the only one built for EU AI Act compliance from day one."*

---

## What is Agent(cy)?

**Agent(cy)** is an AI-native recruitment service for engineering roles. It discovers high-signal candidates from public work — GitHub, HuggingFace, Discord — matches that evidence to role requirements, runs candidate intake conversations, and prepares recruiter-ready match packets.

**Humans make every hiring decision. The AI does the sourcing and admin.**

This isn't another ATS. It's a recruitment service layer built for the way engineers actually work — and for the legal reality of EU AI Act enforcement starting August 2026.

---

## The Problem

Hiring is too manual, too slow, and too dependent on weak signals.

- €65.4B European recruitment market
- €21,000 average agency fee per hire
- 38 days average time-to-hire
- Technical roles are the hardest and slowest to fill

CV-based tools miss the engineers who are actually building things — because those engineers don't update their LinkedIn. Their real output lives on GitHub, HuggingFace, and in Discord servers. No EU recruitment tool sources from all three. Until now.

---

## The Sourcing Moat

| Platform | Who it reaches | Why others miss them |
|---|---|---|
| **GitHub** | Backend and ML engineers by real code output | They don't update LinkedIn. Their work speaks through commits, stars, and OSS contributions. |
| **HuggingFace** | AI/ML practitioners by published models and datasets | This community publishes to HuggingFace first. Most have never posted a CV anywhere. |
| **Discord** | Builders active in technical communities right now | The most signal-rich engineers are heads-down in Discord, not on job boards. |

**Agent(cy) reaches a pool of high-signal developers that CV-based tools and talent databases will never find — because those tools only see people who are actively looking. We find people who aren't looking but are exactly right.**

---

## The Compliance Moat

Under the EU AI Act (Annex III, applicable August 2026), AI systems used in recruitment are classified as **high-risk**. Systems that filter, rank, or evaluate candidates require human oversight, transparency, traceability, and explainability.

**Agent(cy) is built around this from day one — not retrofitted.**

### What the AI does (assistive only):
- Discovers candidates from publicly available work evidence
- Extracts GitHub repos, HuggingFace models, contribution signals
- Generates recruiter-facing match packets — observations, not verdicts
- Drafts personalised outreach (recruiter approves before it sends)
- Runs candidate intake by voice or chat
- Summarises intake transcripts into structured match packets
- Handles scheduling after human approval

### What the AI never does:
- ❌ Automatically rank or score candidates
- ❌ Automatically filter or reject anyone
- ❌ Advance any candidate without explicit recruiter approval
- ❌ Make black-box suitability judgments
- ❌ Replace recruiter review at any decision point

> *"The AI surfaces evidence. The recruiter decides. Every advancement is logged."*

---

## The Product Pipeline

```
Discovered → Pending Review → Outreach Approved → Intake Done → Match Packet Ready → Interview Scheduled
```

| Stage | Who acts | What happens |
|---|---|---|
| **Discovered** | AI | Evidence card created from public sources |
| **Pending Review** | Recruiter | Recruiter reviews match packet, approves or dismisses |
| **Outreach Approved** | Recruiter → AI | Recruiter approves, AI sends personalised message |
| **Intake Done** | AI + Candidate | Voice or chat intake complete, transcript summarised |
| **Match Packet Ready** | AI → Recruiter | Full packet ready for recruiter decision |
| **Interview Scheduled** | Recruiter → AI | Recruiter advances, AI handles scheduling |
| **Opted Out** | Candidate | Data deleted within 30 days, logged |

No candidate moves forward without an explicit recruiter decision at every gate.

---

## The 9-Step Workflow

1. **Role Brief Intake** — Recruiter defines the role, skills, and constraints
2. **Public Evidence Discovery** — AI sources from GitHub, HuggingFace, Discord
3. **Match Packet Generation** — AI presents raw evidence vs. role brief (no score, no rank)
4. **Recruiter Review & Outreach Approval** — Human decides who to contact
5. **Candidate Intake** — Voice (Vapi) or chat; AI-disclosure upfront, consent required
6. **Match Packet Completion** — Evidence + intake summary combined for recruiter review
7. **Human Decision Point** — Reject / Request info / Advance — logged with timestamp
8. **Interview Scheduling** — Automation only after human approval
9. **Hiring Proceeds Normally** — Final decision always human

---

## GDPR Compliance

Agent(cy) processes personal data of EU residents discovered from public sources. Our legal position:

- **Lawful basis:** Legitimate Interests (Art. 6(1)(f)) for sourcing; Consent (Art. 6(1)(a)) for voice intake
- **Transparency:** Every outreach includes a GDPR footer with source, data held, contact for erasure
- **Right to erasure:** "Reply REMOVE" in every message; "Remove my data" on landing page
- **Retention limits:** 90 days for non-responders, 30 days on opt-out, enforced via automated cleanup
- **Data minimisation:** Only public professional data; no message content stored from Discord
- **Opted Out stage:** Permanent flag prevents re-discovery of the same profile

---

## Tech Stack

This application is built on **Base44** — a full-stack React platform with built-in database, auth, backend functions, and AI integrations.

| Layer | Technology |
|---|---|
| Frontend | React + Tailwind CSS |
| Backend | Base44 entities + backend functions (Deno) |
| Auth | Base44 Auth (email/password + Google OAuth) |
| Database | Base44 entity store |
| AI | Base44 InvokeLLM integration |
| Voice intake | Vapi (planned) |
| Payments | Mollie (planned) |

### Core Entities

| Entity | Purpose |
|---|---|
| `Candidate` | Full profile with evidence card, pipeline stage, GDPR fields |
| `Job` | Role brief with required stack and role type |
| `Application` | Links candidate to job with status tracking |
| `Company` | Hiring company with contact info |
| `Report` | Match packet reference per application |

### Pipeline Stages (Candidate entity)
`Discovered` → `Pending Review` → `Outreach Approved` → `Intake Done` → `Match Packet Ready` → `Interview Scheduled` → `Opted Out`

### Key Features Built
- Dark-theme public landing page with GDPR Art. 13/14 footer and data removal link
- Protected recruiter dashboard with Kanban pipeline view
- Google OAuth + email/password login aligned to dark theme
- GDPR fields on Candidate: `opted_out`, `opted_out_date`, `gdpr_deletion_due`
- No numerical score anywhere in the data model — raw evidence cards only
- Favicon and branding from the Agent(cy) wordmark (cream + gold)

---

## Revenue Model

| Tier | Price |
|---|---|
| Early access (demo) | €500 per role |
| Placement fee | €2,500–€10,500 per successful hire |
| Retainer | Monthly for ongoing pipelines |

---

## Target Customers

- Staffing agencies
- Internal talent acquisition teams
- Founder-led hiring teams
- SMEs hiring for technical roles

**Best-fit roles:** Software engineers, AI/ML engineers, data roles, product designers — anywhere public work evidence is strong.

---

## Standing Development Rule

**Every feature must pass this test before implementation:**

> *"Does this feature make a decision that affects a candidate's access to employment without explicit human approval?"*

- **Yes** → redesign so the human approves first
- **No** → proceed

Key checks per sprint:
- Does any automated process advance or reject a candidate? → Add human approval gate
- Does any score or ranking exist in the system? → Remove it. Raw facts only.
- Is the candidate informed they are talking to an AI? → Yes, always, upfront
- Are recruiter decisions logged with timestamps? → Yes, every time

---

## Local Development

1. Clone the repository (via Base44 GitHub sync)
2. Run `npm install`
3. Create `.env.local` with `VITE_BASE44_APP_ID` and `VITE_BASE44_APP_BASE_URL`
4. Run `npm run dev`

---

*Agent(cy) — Real work evidence. Human decisions. Built for EU AI Act compliance.*