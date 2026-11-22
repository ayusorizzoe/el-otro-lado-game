# el otro lado

A short game about a stray black cat on one narrow tianguis street in a border neighbourhood inspired by Tijuana. It's built with three.js and Vite.

You are the cat, a stray. The street makes you a collar, piece by piece: you follow smells, sit and listen to three people at their stalls, and win a game for each. With the collar complete, you choose who writes a name on its tag and takes you home.

## Run

```sh
npm install
npm run dev       # http://localhost:5173
npm run build     # production build → dist/
npm run preview   # serve the build → http://localhost:4173
```

You need Node.js 20 or newer. On this machine it is installed in `~/.local/node`, and `~/.zshrc` adds it to the PATH.

## Controls

| key | action |
|---|---|
| WASD / arrows | walk, relative to the camera |
| Shift | run |
| Space | jump (about 1.3 m); with the rats, hold to crouch and release to pounce |
| E | do the thing shown |
| Q | sniff: a trail to the next place |
| F | roll over |
| L | notebook: what you've heard |
| drag mouse / wheel | orbit / zoom the camera |
| R | restart after the ending |

## The game

**The neighbourhood** is one compact network of connected places:
- the tianguis street, widening into a small plaza with the taquero's taco stand, a tree and a bench;
- a narrow residential stretch to the east;
- an alley to a quiet back courtyard (laundry, a sheltered lean-to);
- a short street rising west to a viewpoint over the sea;
- stairs up to a mirador facing the border wall, also reachable by hopping from a neighbour's stair landing;
- the north row's roofs, which connect.

**The world keeps moving on its own:**
- one shared wind moves the tarps, the cables (utility poles, wires across the street, service drops to the houses), the laundry, the trees and loose paper;
- clouds drift, and dust catches the sunlight;
- dusk comes on gradually, warm windows contrast with the border's cold floodlights at night, and the sun glares over the sea at sunset.

**People:**
- vendors work their stalls, lean on them and sit when it's slow, turn toward customers and recognise the cat later on;
- shoppers have destinations: they browse, check their phones in doorways, sit on the curb or the bench, meet someone to chat, and look at the sea;
- they glance down at the cat now and then and step aside if it runs between their feet.

**Things to do:**
- chase mice, which bolt for their holes and come back later;
- run at pigeon flocks, which lift together and drift home;
- knock cans and cups off ledges (a clink that scatters birds and makes people look);
- climb.

**The collar.** Three pieces, in any order. At each stall you hear the conversation first (sit still nearby; it waits if you leave), then play. Every game says what it takes to win before it starts, can be lost and retried at once, and ends on a panel that says whether you won, why, and what comes next. Once won, it is done.

| game | where | win | you get |
|---|---|---|---|
| Rats | taco stand | 8 and the fat one in 60 s; six thefts lose | ribbon |
| Napkins | bread stall | all 5 in 75 s, by hot and cold | bell |
| Phones | phone stall | four rounds (4–7 long), three mistakes lose | tag |
| Race (hidden) | hero house stair to the top roof | beat the tomcat, 11 s | jump higher |
| Sleeping dog (hidden) | alley | carry the bone to the street without waking it | dogs stop chasing you |
| Cans (hidden) | back courtyard | knock down 10 in 18 s | pounce farther |

- Q lays a trail to the next game; Q again switches to another. Hidden games join the list once you pass near them.
- The next step is always on screen (`src/systems/Story.js`). The hour moves as you win, so it ends at sunset.
- Each of the three people gives a different name (Carbón, Canela, Kevin) and ending. The epilogue also shows the two you didn't choose.
- Three more conversations ("La aplicación", "Veinte años", "Una puerta") are there for anyone who sits by them. Listening gives no points.

**Dangers** come after you win a piece and now and then in the street, always with a warning and a countdown: a dog, a hand truck, a rival tomcat. Get up high (not from the tomcat) or next to someone minding a stall. Being caught leaves you dizzy and slow for a few seconds.

**Sound** is all synthesised in the browser: wind (stronger on roofs), market murmur, distant traffic, the sea to the west, sizzling at the cart, birds, a far-off dog, and one-off sounds.

## Structure

```text
src/
  main.js
  core/       Game.js (loop + coordination), GameState.js (hour, what's been heard), Config.js, Time.js
  rendering/  Renderer.js (bloom), CameraController.js (follow cam), Lighting.js (day/night), Materials.js, Paint.js (painted strokes), Wind.js, Bake.js (merges figures into one mesh)
  entities/   Entity.js, Cat.js, Human.js       low-poly figures (~props polycount)
  systems/    InputSystem.js, CollisionSystem.js (boxes + ramps), CatController.js, ScentSystem.js, AudioSystem.js, Challenges.js (the six games), Story.js (the collar, the choice)
  world/      Street.js (layout + anchors), House.js, Architecture.js (wall/window/stair parts), Props.js, Market.js, Critters.js, Dangers.js, Goods.js (stall goods and signs), Atmosphere.js, Distant.js
  narrative/  Content.js (all text), Conversations.js (schedules, listening), Residents.js (the three people), Actor.js
  ui/         UI.js, styles.css
tests/bot.js   plays with keys only, at a fixed time step
public/assets/models/props_GLBFiles/   hand-painted props
```

## Testing helpers (dev console)

```js
__game.story.secrets.forEach((q) => { q.found = true })   // reveal the hidden games
__tp(x, y, z)               // move the cat
```

## Research behind the dialogue

- CBP One switched off on 20 Jan 2025 and its appointments were cancelled: [inewsource](https://inewsource.org/2025/01/21/trump-cancels-cbp-one-migrants-on-cusp-of-reaching-the-u-s-turned-away/), [El Imparcial](https://www.elimparcial.com/tij/tijuana/2025/01/20/migrantes-se-quedan-varados-en-tijuana-por-desaparicion-del-cbp-one).
- 1% US tax on cash remittances from 2026; the Finabien refund: [BBVA Research](https://www.bbvaresearch.com/en/publicaciones/mexico-2026-begins-with-new-remittance-tax/), [Expansión](https://expansion.mx/finanzas-personales/2026/01/28/impuesto-remesas-no-afecte-finabien-tarjeta-reembolsa-dinero).
- Deported after about 20 years in the US: [El Imparcial](https://www.elimparcial.com/tij/tijuana/2025/02/05/mexicano-iba-a-cumplir-20-anos-de-vivir-en-estados-unidos-pero-fue-deportado-a-mexico/), [NPR via KERA](https://www.keranews.org/2026-04-25/many-mexicans-deported-from-the-u-s-stay-in-tijuana-figuring-out-whats-next).
- Night deportations through the port: [N+](https://www.nmas.com.mx/tijuana/comienzan-deportaciones-nocturnas-en-tijuana-mas-de-100-migrantes-no-pudieron-cruzar), [Zeta Tijuana](https://zetatijuana.com/2025/01/a-discrecion-primeras-30-deportaciones-de-trump-en-tijuana/).

The epilogue outcomes are invented. The two newer conversations draw on reporting about Friendship Park closures and about deported bilingual call-centre workers; their source links are not listed yet.

## Known issues

- `props_Bottle.glb` exports only a plane, so it isn't used. The sword is removed.
- People walk straight to their spots and can pass through stalls and each other.
