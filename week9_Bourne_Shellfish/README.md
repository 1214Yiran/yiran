# Bourne Shellfish App — Status Card

<p align="center">
  <img src="images/home.png" width="240" alt="Home screen, spot closed">
  &nbsp;&nbsp;
  <img src="images/alerts.png" width="240" alt="Closure alert sign-up">
  &nbsp;&nbsp;
  <img src="images/menu.png" width="240" alt="Menu overlay">
</p>

<p align="center">
  <img src="images/components.png" width="760" alt="Status card in four states">
</p>

**Figma file:** [Bourne Shellfish App — Status Card](https://www.figma.com/design/0c7xevsdlg0ijGucKJmcR7/Bourne-Shellfish-App-%E2%80%94-Status-Card?node-id=0-1)

Logic of Interaction · Week 9 · Assignment 2
By Yiran and Caitlin

---

## The problem

The Town of Bourne, Massachusetts, publishes its shellfish rules on the town website
([bourne-ma.gov/1578/Shellfish](https://www.bourne-ma.gov/1578/Shellfish)).
The information is there, but it is hard to answer the two questions a harvester actually has:

1. **Can I go out for oysters today, at my spot?**
2. **If a spot closes suddenly, how will I find out in time?**

## Our idea

We reorganized the page into a small mobile app. The answer to question 1 sits at the very top,
as one **status card**. Question 2 is answered by **closure alerts** you can sign up for.

## Screens

### Home
- **Status card** for your spot, with a spot picker under it (e.g. *Your spot: Phinney's Harbor*).
- **All spots**: a list of every harvesting area and its status, set by the Town.
- **Dates open to the public**: oyster season, open days and the weekly limit.
- **Conditions**: four live readings in tiles (sample values in this prototype).
- **Sections**: shortcuts to the rest of the original website.

### Closure alerts
- Choose **which spots** to follow.
- Choose **when** to be told.
- Choose **how**, including a text message to your phone number.
- One button: **Turn on alerts**.

### Menu
- Permits, Regulations, Maps, Education.
- More: Closure alerts, Contact Natural Resources.

## Status card states

The same card changes for four situations, so a harvester can read it at a glance:

| State | Meaning |
|---|---|
| **Open** | You can harvest here today. |
| **Closed** | The spot is closed. |
| **Not public** | This area is not open for public harvesting. |
| **May close** | Open for now, but a closure may come soon. |

The spot rows in the list use the same four states.

## Components

Built as reusable Figma components: Status card (4 states), Spot row (4 states), Button (on dark / on light),
Stat tile, Section tile, Checkbox row (on / off) and Menu item.

## Process

- We made the mind map together.
- Yiran made V1.
- Each of us made our own user flows and wireframes.
- We designed the rest together.
