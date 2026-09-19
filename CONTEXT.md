# CONTEXT.md — RogueReporter2 ("The Scoop") — uppföljaren, helt annat spel

**"Rogue Reporter 2 / THE SCOOP"** — deckbuilding-roguelike (Slay-the-Spire-stil)
om undersökande journalistik. **Inte samma genre som RogueReporter** (som är ett
konspirationspussel): här är striden "intervjuer" i turordning, med kortlek, karta
och relics. Byggd med Phaser 3 + Vite + **JavaScript**. Live:
https://the-scoop-game.web.app — UI-språk: **svenska**.

## Teknik (verifierat)

- Phaser 3.80 + Vite 7 (JS). Zero bild-/ljudfiler — allt är Phaser-primitiver +
  emoji + Google Fonts. Boot väntar på `document.fonts.ready`.
- `vite.config.js`: `outDir: 'docs'`, `emptyOutDir: true`. **`docs/` = byggoutput,
  handredigera aldrig.** Firebase publicerar från `docs/` (SPA-rewrite).
- `firebase.json` site = `the-scoop-game`; `.firebaserc` projekt =
  `roguereporter-game` (delat Firebase-projekt med originalet — bara siten skiljer;
  deploy av det ena rör inte det andra).
- Dubbelplattform: desktop 960×600 / mobil 540×960 (väljare i början, sparas som
  `scoop-platform`).

## Struktur

| Sökväg | Roll |
|---|---|
| `src/main.js` | Phaser-config + 13 scener; `window.__GAME__` för debug |
| `src/constants.js` | Design-tokens + BALANCE (startvärden, statusmultiplikatorer) |
| `src/scenes/InterviewScene.js` (1166 r) | Kärnan — tur-baserad kortstrid ("intervju") |
| `src/scenes/MapScene.js` | Procerudell StS-karta (7×15, vandrande stigar) |
| `src/scenes/` övriga | Menu, Platform, CardReward, Rest (Newsroom), Shop (The Fixer), Event, Treasure, BossReward, Victory, GameOver, Boot |
| `src/engine/RunState.js` | Runs state, save/load `the-scoop-save` |
| `src/engine/CombatState.js` | En-fights state-maskin, win/lose, act-skalning |
| `src/engine/CardEffects.js` | Effektupplösning (pressure→Guarded→Sympathy→Composure) |
| `src/engine/DeckManager.js`, `IntentAI.js`, `MapGenerator.js`, `RelicManager.js`, `StatusManager.js` | Deck, fiend-AI, karta, relics-hooks, statusar |
| `public/data/` | 7 JSON (kopieras till `docs/data/`) |
| `src/scenes/BossRewardScene.js` | **Innehåller en latent TDZ-bugg** (`const M = isMobile()` används innan deklarationen, rad ~20 vs ~41) — kraschar om scenen körs. Ingen global felgräns finns (till skillnad från originalet). |

## Mekanik (journalistik = kortstrid)

- **Motståndare = Subject** (HP = Composure). Spelarens HP = Credibility (80/80),
  block = **Rapport (återställs varje tur!)** , energi = Focus (3/tur), guld =
  Press Passes (start 99).
- **Kort** (`cards-veteran.json`, 40): typer `pressure` (attack), `rapport` (block),
  `angle` (power, exhaust), `spin`/`lawsuit` (clutter = ospelbara). Keywords:
  exhaust/ethereal/retain/innate/x-cost. Kortnivå upgraderas via JSON `upgrade`.
- **Intent-AI** (`IntentAI.js`): rotation/weighted-beteenden, boss/elite-fasgrindar
  på composure-trösklar, `specialMoves` på fasta turer, anti-upprepning.
- **Karta:** 3 akter (Lokalpressen/Regionalnytt/Riksmedia), 7×15 rutor, knotyper
  INTERVIEW/ELITE/BOSS/REST/SHOP/TREASURE/UNKNOWN (event).
- **Relics** (`relics.json`, 17) med hook-engine (`onTurnStart`, `onPressureCardPlayed`…);
  **konsumtabl** (`consumables.json`, 8); **event** (`events.json`, 8 moralval);
  statusar: flustered (+50% pressure), rattled, cornered, contradicted, guarded, pr-spin m.fl.
- Progressionsmeta: korthantering (cap 40), uppgraderingar (REFINE), relics,
  Press Passes € shop, full heal mellan akter.

## Regler och gotchas

- **Rapport reser sig inte mellan turer** (medveten design, står i HUR MAN SPELAR).
- `MapGenerator` COLS/ROWS fångas vid import från desktop-SIZES — `setPlatform()`
  byter bara layout, inte kartans dimensioner.
- Räknetips: map rader 0–14 + bossrad 15; HUD visar "Floor X/15".
- save-keys: `the-scoop-save` (run) + `scoop-platform`; rensa inte bara den ena.
- Inga tester/linter/CI.

## Köra / deploya

- `npm install && npm run dev`; `npm run build` → docs/; `npm run deploy`.
- .fabrik-rad: `(test -d node_modules || npm install) && npm run build && git add -A && git commit -m 'uppdatering' && git push origin main && firebase deploy`.

## Notis

- **RogueReporter (originalet) är ett annat spel** — konspirationspussel med
  swipe-åtgärder. Blanda inte ihop; båda ligger i `projekt/`.