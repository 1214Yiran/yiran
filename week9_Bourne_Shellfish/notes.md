# notes.md — Bourne Shellfish app (Week 9, Assignment 2)

Team: Yiran + Caitlin
Tool: Claude (AI assistant), with the Figma connector
Final design: https://www.figma.com/design/0c7xevsdlg0ijGucKJmcR7

This file keeps three things separate:
- **AI** = what the assistant produced.
- **Us** = what we observed and decided.
- **Person** = what a real person did when they tried the design.

---

## 1. Request log

### Request 1: hand-off, "don't design yet"
**Actual request (ours):** We attached the 3 sketches (`design/reference-*.png`), our brief and our rules (one English version, one Chinese version), and wrote:
> "notes.md: don't design yet check with us and explain what your plan and also we will give you design guidelines"

**First result (AI):**
- **Could inspect:** all 3 images and the text. Could not open: the course portal link (blank page).
- **Listed 7 unclear points:**
  1. Our two rule lists conflicted ("only status can change" vs. "regulations may be shortened").
  2. Was status for the whole town or for each spot?
  3. What triggers an anticipated closure?
  4. Which status wins when two apply?
  5. Where does the closure data come from?
  6. There was no "must never happen" rule.
  7. App or website?
- **Proposed one change:** a single **Status card with 4 states**. Each state answers the same five things: State / Why / When / Next step / Source.
- Waited for our answer before making anything.

**Us:** We observed that the AI found a real conflict between our two rule lists, so we merged them into one `rules.md`, because two rule sets would give two different results. We kept its Status card idea.

### Request 2: answers to the questions
**Actual request (ours):**
> "Yes to your suggestions. Anticipated closures need to include weather, water quality, and any other reason you can think of. This is an app. This is run by the town so they specify for all areas (spots - same thing)"

**Result (AI):**
- A browser preview (not Figma) showing:
  - the Status card in 4 states
  - an app Home screen
  - a list of 8 closure reasons
  - a priority order for when two states apply
- It filled in placeholder colors and fonts while waiting for our guidelines.
- It added a "never" rule: no directions for a closed spot.

**Us:** We observed that the structure matched our sketches, so we kept the layout. We changed the tool, because the assignment needed Figma with Variables.

### Request 3: move to Figma, Town colors, Variables
**Actual request (ours):**
> "So we actually need this designed in Figma. Can you use the Town of Bourne colors for the design. Also use more modern font styles that aren't as Claude and AI coded. We also need you to build this with Variables (type, color, grid size/base)"

then:
> "Use Figma for this"

**Result (AI):**
- Created the Figma file with:
  - 4 variable collections: Primitives, Color, Spacing & Grid, Typography
  - 7 text styles bound to the type variables
  - components: Status card, Spot row, Button, Stat tile, Section tile
  - the Home screen in the Closed state
- **Colors:** it only used the website's theme purple (#846496) plus the gold from the town seal. It added strong solid status colors.
- **Fonts:** it chose new fonts itself: Bricolage Grotesque + Public Sans.

**Us:** We observed that the colors were too bold and did not look like the Town of Bourne site, and that the fonts still felt "AI". So we changed the request and gave the actual Town website as a reference, because the words "Town of Bourne colors" alone were not enough context.

### Request 4: less bold, follow the real Town site
**Actual request (ours):**
> "I'd love the colors to be less bold. I asked you to follow town of Bourne's colors and use less AI type fonts. I dont see this. https://www.bourne-ma.gov/"

**Result (AI):**
- Admitted it had not followed the Town site.
- Opened bourne-ma.gov in a browser and read the page's actual colors and fonts:
  - purple #846496
  - mauve #8A525F
  - blush #E7DBDD
  - khaki gold #AC9762
  - deep purple #63368B
  - gray #F4F4F4
  - text #222222
  - fonts: Roboto and Roboto Condensed
- Changed the Figma variables to these values, so every screen updated automatically.
- Changed the status cards to soft tints with a thin border.

**Us:** We observed that the design now looked like it belonged to the Town, so we kept this visual style. Matching the real site makes it feel official and trustworthy.

### Request 5: navigation, order, copy, sign-up
**Actual request (ours):**
> "Can there also be a hamburger menu that links to the cards at the bottom like permits and regulations. My spot needs to below the alert. Util the town reopens it is bad copy - Can you say something more like "through xx date" Check back or sign up for alerts - then have a way to sign up for notifications."

**Result (AI):**
- Added a ☰ menu button and a Menu screen (Permits, Regulations, Maps, Education, Closure alerts, Contact).
- Moved "Your spot" below the status card.
- Changed the copy to "Closed through Fri, Nov 20" and added "Check back or sign up for alerts."
- Built an **Alert sign-up** screen: which spots, what to be told about, and how (app / text / email).
- Linked the bell, the card button and the menu to the sign-up screen in the prototype.
- **Limitation it reported:** our free Figma plan allows only one action per tap. So a menu row can scroll Home to the section, but the menu doesn't close by itself.

**Us:** We observed that a classmate could tell the status right away (see section 4), so we kept the status card at the top of Home, with "Your spot" below it, because "Can I go today?" is the first thing a person needs to know.

---

## 2. Checked comparison: one context change

**Rule we checked:** "Use the Town of Bourne's colors and less AI-looking fonts."

**The one thing we changed:**
- **Context A (Request 3):** the rule in words only.
- **Context B (Request 4):** the same rule plus the Town website URL.

Everything else stayed the same: the same sketches, brief, rules and Figma file.

**Prediction (ours, for Request 3):** We expected the AI to match the website colors, because we thought it already had the link.

**What actually happened:**
- The AI did have a Town link: the Shellfish page from earlier in the chat. It also searched the web.
- But it only read the page as text, which shows one theme color and no fonts. It did not open the site to look at the real design, and it filled the gaps with its own choices.
- When we sent the homepage URL and said it didn't match, it opened the site in a browser and read the actual colors and fonts.
- So the difference was not only the extra link. It was also that the AI checked the real source after we pushed back.

| | Context A: words only | Context B: words + URL |
|---|---|---|
| Colors | Only the theme purple, plus gold from the seal; bold solid status colors | The site's real palette (purple, mauve, blush, khaki, deep purple, grays); soft tints |
| Fonts | AI's own choice (Bricolage Grotesque + Public Sans) | The Town site's fonts (Roboto Condensed + Roboto) |
| Rule passed? | **No** | **Yes** |

**What we keep:** we will always give the source (a URL or a screenshot) for brand rules, not just a description.

---

## 3. Rule check on the final design (AI self-check; confirm in Figma)

| Rule | Result |
|---|---|
| Every section stays (Maps, Education, etc.) | Pass: all sections are on Home and in the menu |
| Status at top, "Your spot" below it | Pass |
| Each state shows the state, why, when, next step and source | Pass, in all 4 card states |
| No directions for a closed spot | Pass: built into the Spot row component |
| No vague end times | Pass for the Closed card ("Closed through Fri, Nov 20"). See question 6. |
| Sign-up is one tap away | Pass: bell, card button, menu |
| Built with Variables (color, type, grid/base) | Pass: 4 collections and 7 text styles |

---

## 4. Human test (what a person actually tried, kept separate from the AI)

- **Our prediction:** The status would be very obvious, because it sits at the top of the screen.
- **Who tried it:** a classmate. They were a stand-in for the real audience, not someone who goes shellfishing in Bourne.
- **What happened:** It was obvious to them what the status was. Our prediction held.
- **Where they hesitated:** none recorded.
- **Did they find the sign-up?** not recorded.
- **Our decision:** We observed that our classmate understood the status right away, so we kept the status card at the top of Home because the most important answer has to be seen first.
- **What else could explain the result?**
  - The classmate already knew the project from class.
  - They are not a real shellfisher.
  - We may have tested only one state (Closed).
- **Still uncertain:**
  - Will a real resident understand "May close soon" and "Not open to the public" just as quickly?
  - Will they find and use the alert sign-up?

---

## 5. Contribution and help

- **Together:**
  - designed the mind map of the current site
  - did everything else: the brief, rules, decisions on each AI result, the classmate test and these notes
- **Yiran:** made V1 (the first draft). Made her own user flow and wireframes.
- **Caitlin:** made her own user flow and wireframes.
- **AI help:**
  - asked the clarifying questions
  - drafted and built the Figma variables, components and screens
  - read the Town site's colors and fonts
  - wrote the first drafts of this file
- **Sources:**
  - Town of Bourne Shellfish page and homepage (bourne-ma.gov)
  - MA Division of Marine Fisheries closure notices (used for the sample data)

---

## 6. Remaining question

The state's real closure notices say an area is closed "until further notification", not until a set date. So where does the "Closed through [date]" date come from? Does the Town give an expected date, or should the card say "Closed. Next update [date]" when no end date is known?
