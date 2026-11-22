// Application entry point.

import { Game } from './core/Game.js';

const game = new Game(document.getElementById('app'));
game.start().catch((err) => {
  console.error(err);
  const s = document.querySelector('#title .start');
  if (s) s.textContent = 'error: ' + err.message;
});

if (import.meta.env.DEV) {
  window.__game = game;
  // testing helpers: __game.state.hourGoal = 18.7; __tp(x, y, z)
  window.__tp = (x, y, z) => game.ctrl.place(x, y, z);
}
