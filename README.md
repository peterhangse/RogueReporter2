# The Scoop

**The Scoop** är ett journalistik-roguelike-spel byggt med [Phaser 3](https://phaser.io/) och [Vite](https://vitejs.dev/).

> *"Slay the Spire meets investigative journalism"*

## Om spelet

Du spelar som en undersökande journalist. Intervjua källor, bryt igenom deras fasad och avslöja sanningen över tre akter. Varje runda bygger du ett kortlek av presstekniker, väljer din väg på kartan och möter allt svårare motståndare.

### Spelets mekanik

- 🎙️ **Intervjuer** – Slå ut källors komposure med din kortlek
- 🃏 **Kort** – Fyra typer: Pressure (röd), Rapport (blå), Angle (guld), och negativa Spin/Lawsuit-kort
- ⚡ **Fokus** – Din resurs per runda; planera dina drag klokt
- ❤️ **Trovärdighet** – Ditt HP; nå 0 och karriären är över
- 🗺️ **Karta** – Välj din väg genom intervjuer, newsrooms, shops och bossar

## Teknisk stack

| Verktyg | Version |
|---------|---------|
| Phaser | ^3.80.1 |
| Vite | ^7.3.1 |
| Firebase Hosting | – |

## Komma igång

### Förutsättningar

- [Node.js](https://nodejs.org/) (LTS)

### Installation

```bash
npm install
```

### Kör lokalt

```bash
npm run dev
```

Öppnar automatiskt spelet i webbläsaren på `http://localhost:5173`.

### Bygg för produktion

```bash
npm run build
```

Bygget hamnar i mappen `docs/`.

### Driftsätt

```bash
npm run deploy
```

Bygger projektet och driftsätter till Firebase Hosting (`the-scoop-game`).

## Projektstruktur

```
src/
├── main.js           # Phaser-konfiguration och spel-bootstrap
├── constants.js      # Färger, storlekar, fonter och plattformsinställningar
├── engine/           # Spellogik (RunState, kortmotor, m.m.)
└── scenes/           # Alla Phaser-scener
    ├── BootScene.js
    ├── MenuScene.js
    ├── MapScene.js
    ├── InterviewScene.js
    ├── CardRewardScene.js
    ├── RestScene.js
    ├── ShopScene.js
    ├── EventScene.js
    ├── TreasureScene.js
    ├── BossRewardScene.js
    ├── VictoryScene.js
    └── GameOverScene.js
```

## Licens

Privat projekt – alla rättigheter förbehållna.
