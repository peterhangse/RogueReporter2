# AGENTS.md — RogueReporter2 ("The Scoop")

**Läs `CONTEXT.md` först.** Den beskriver deckbuilderns arkitektur, kortstrid,
datafiler och kända buggar.

## Kontrakt

- Ändrar du struktur, mekanik (kort/statusar/relics/balans), data eller deploy:
  **uppdatera `CONTEXT.md` i samma commit** som ändringen.
- **`docs/` är byggoutput (Vite outDir) — handredigera aldrig.** Ändra i `src/`
  och kör `npm run build`.
- Balans: startvärden + statusmultiplikatorer ligger i `src/constants.js`
  (`BALANCE`); kortinnehåll i `public/data/*.json`.
- Känd latent bugg: `BossRewardScene.js` använder `const M = isMobile()` innan
  deklarationen (temporal dead zone, rad ~20 vs ~41) — det finns ingen global
  felgräns. Åtgärda innan scenen börjar användas.
- Rapport-block återställs varje tur — medveten design, behåll.
- Det här är **uppföljaren** — RogueReporter (originalet) är ett annat spel
  (konspirationspussel). Kontrollera vilket repo frågan gäller.