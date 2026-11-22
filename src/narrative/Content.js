// All dialogue and narrative text. Edit freely: gameplay only reads this structure.
//
// Based on reporting from 2025–2026 (sources in README): CBP One switched off on
// 20 Jan 2025 with appointments cancelled; the 1% US tax on cash remittances from
// Jan 2026 (bank/card transfers exempt; Finabien offered refunds); deportees returned
// after decades in the US, often without Mexican ID; night deportations through the port,
// belongings in a plastic bag, phones dead.
//
// from/to: hours. spot: anchor in Street.js.


export const CONVERSATIONS = [
  {
    id: 'citas', title: 'La aplicación', spot: 'citas', from: 8, to: 24, poses: [{ lean: true }, { lean: true }],
    speakers: [
      { name: 'Yuleidy', look: { top: 0xc78fa0, bottom: 0x34404f, hair: 0x14100e, skin: 0x8a5a3e, female: true } },
      { name: 'Rosa', look: { top: 0x7f9a6a, bottom: 0x4a3c34, hair: 0x241a14, skin: 0xa5734f, female: true } },
    ],
    lines: [
      [1, '¿Todavía la tienes en el teléfono?'],
      [0, 'La captura, sí. Mira: veintiocho de enero, siete de la mañana, garita.'],
      [1, 'La mía era para el treinta. Ya tenía la ropa lavada y todo.'],
      [0, 'Abrí la aplicación y nomás decía que ya no existía. Ocho meses esperando y ya no existía.'],
      [1, 'Mi hermano dice que a lo mejor la vuelven a abrir.'],
      [0, 'Tu hermano dice muchas cosas.'],
      [1, 'Pues algo hay que creer, ¿no?'],
      [0, 'La señora del albergue dice que podemos pedir refugio aquí. En México.'],
      [1, '¿Y quedarnos?'],
      [0, 'Ya estamos, mana. Llevamos un año quedándonos.'],
      [1, 'Pedí trabajo en la maquila. Me dijeron que el lunes. Turno de noche.'],
      [0, 'Pues ahí está. Eso sí es una cita.'],
    ],
    epilogue: 'Rosa entró al turno de noche en la maquila. Yuleidy obtuvo refugio en México y vende café afuera del albergue.',
  },
  {
    id: 'veinte', title: 'Veinte años', spot: 'veinte', from: 9.5, to: 24, poses: [{ sit: true }, { sit: true }],
    speakers: [
      { name: 'Efrén', look: { top: 0x3f4b5c, bottom: 0x2b2b30, hair: 0x1b1714, skin: 0xa47452, cap: 0x8a1f24 } },
      { name: 'Don Chuy', look: { top: 0xd8d0bc, bottom: 0x5a4a3a, hair: 0xcfcac0, skin: 0x8f6448, old: true, shortSleeve: true } },
    ],
    lines: [
      [1, '¿Y usted de dónde es, joven? Lo veo aquí todos los días.'],
      [0, 'De Nayarit. Bueno, allá nací. Me fui a los diecinueve.'],
      [1, '¿Y se regresó?'],
      [0, 'Me regresaron. Me agarraron saliendo del trabajo, en el parking. Iba por un Gatorade.'],
      [1, '¿Y la familia?'],
      [0, 'Allá en Pomona. El chiquito casi no habla español. Le marco por FaceTime y me contesta en inglés.'],
      [0, 'Veinte años pagando taxes, ¿eh? Y aquí no tengo ni acta. Ando tramitándola para sacar la INE.'],
      [1, 'Aquí te piden papeles para todo.'],
      [0, 'Allá también. Nomás que allá ya los tenía todos menos uno.'],
      [1, '¿Y qué va a hacer?'],
      [0, 'Esperar. Mi esposa dice que hay un abogado. Siempre hay un abogado.'],
    ],
    epilogue: 'Efrén consiguió su acta en abril y entró a un call center. Su hijo menor cumplió once años por videollamada.',
  },
  {
    id: 'remesas', title: 'El uno por ciento', spot: 'stand', from: 8, to: 21.8, host: 'taquero', poses: [{}, { lean: true }],
    speakers: [
      { name: 'El taquero', host: true },
      { name: 'Lalo', look: { top: 0x5c6b4a, bottom: 0x30343c, hair: 0x2a2018, skin: 0xa06d4b, cap: 0xb9a37a } },
    ],
    lines: [
      [1, '¿Y su muchacho, jefe? ¿Sigue en Los Ángeles?'],
      [0, 'Ahí sigue. En una cocina en Santa Mónica. Haciendo lo mismo que yo, pero en dólares.'],
      [1, 'Pues ya le mandará.'],
      [0, 'Manda. Cada quince días. Pero ahora le cobran más.'],
      [1, '¿El impuesto ese?'],
      [0, 'El uno por ciento. Porque lo manda en efectivo. ¿Con qué papeles abre una cuenta?'],
      [1, 'Uno por ciento no es tanto.'],
      [0, 'Súmale la comisión. Súmale el cambio de la ventanilla. Al que tiene cuenta no le cobran el uno.'],
      [0, 'Mi sobrina dice que aquí el gobierno te lo regresa con una tarjeta. Quién sabe.'],
      [0, 'Le digo que ya no mande. Y me dice: "Apá, it\'s fine." Y manda.'],
      [1, 'Le salió igual de terco.'],
      [0, '¿Le pongo otra de asada?'],
    ],
    epilogue: 'El hijo del taquero abrió una cuenta digital en junio. Sigue mandando cada quince días; él lo guarda en una lata de chiles.',
  },
  {
    id: 'madrugada', title: 'Una puerta', spot: 'madrugada', from: 15, to: 25.5, poses: [{ curb: true }, {}],
    speakers: [
      { name: 'Julio', look: { top: 0x7c7f86, bottom: 0x3a3e46, hair: 0x1a1512, skin: 0x986846 } },
      { name: 'Doña Mago', look: { top: 0x5a3a4a, bottom: 0x2e2a2e, hair: 0xd4d0c8, skin: 0xa07050, female: true, old: true } },
    ],
    lines: [
      [1, 'Tómeselo, está caliente.'],
      [0, 'Gracias. Nos sacaron a las dos de la mañana. Ayer. O antier, ya no sé.'],
      [1, '¿Por la garita?'],
      [0, 'Por una puerta. Abrieron una puerta y ya: caminen. Éramos como cuarenta.'],
      [1, '¿Y sus cosas?'],
      [0, 'Me dieron una bolsa de plástico. El cinto, las agujetas, el teléfono sin pila.'],
      [1, '¿Tiene a quién marcarle?'],
      [0, 'El número de mi esposa está en el teléfono. No me lo sé. ¿Usted se sabe alguno de memoria?'],
      [1, 'El de mi hermana. Nomás ese.'],
      [0, 'Yo ni ese.'],
      [1, 'Mañana a las siete abre el comedor; ahí hay dónde cargar.'],
    ],
    epilogue: 'Julio cargó su teléfono en el comedor a la mañana siguiente. Su esposa contestó al segundo timbre.',
  },
  {
    id: 'malla', title: 'Por los hoyitos', spot: 'host', from: 8, to: 21.8, host: 'pan', poses: [{}, { lean: true }],
    speakers: [
      { name: 'La señora del pan', host: true },
      { name: 'Socorro', look: { top: 0xcf9a6a, bottom: 0x504038, hair: 0x2a1e18, skin: 0xa77755, female: true } },
    ],
    lines: [
      [1, '¿Y su hija? ¿La ha visto?'],
      [0, 'Antes la veía los domingos. Ella del lado de allá, yo de este.'],
      [1, '¿Y ya no?'],
      [0, 'Lo cerraron otra vez. Que por la construcción. Siempre hay una construcción.'],
      [1, '¿Y por la malla se veían bien?'],
      [0, 'A cuadritos. Nos dábamos besos con el dedito, por los hoyitos.'],
      [1, '¿Y por qué no viene ella?'],
      [0, 'Si sale, no la dejan regresar. Está esperando un papel.'],
      [0, 'Mi nieto ya mide como uno cuarenta. Lo vi por la pantalla.'],
    ],
    epilogue: 'El parque abrió dos domingos en la primavera. La señora del pan fue los dos.',
  },
  {
    id: 'turno', title: 'Después del turno', spot: 'host', from: 8, to: 21.8, host: 'celulares', poses: [{}, { lean: true }],
    speakers: [
      { name: 'El muchacho', host: true },
      { name: 'Dani', look: { top: 0x8a3d4f, bottom: 0x25262c, hair: 0x3a2318, skin: 0xb78462, female: true } },
    ],
    lines: [
      [1, '¿Y por qué ya no fuiste al call center?'],
      [0, 'Because, bro, me gritó un señor de Ohio cuarenta minutos. Por el cable.'],
      [1, '¿Y qué le dijiste?'],
      [0, 'Que soy Kevin from Texas. Ni conozco Texas.'],
      [1, 'Pagan bien, ¿no?'],
      [0, 'Allá eso lo sacaba en dos días. Allá también estaba mi mamá.'],
      [1, '¿Y ella no puede venir?'],
      [0, 'She has papers. Dice que la fila de regreso está muy larga.'],
      [0, 'Aquí por lo menos nadie me pregunta de dónde soy.'],
    ],
    epilogue: 'En Navidad la mamá del muchacho vino a verlo. Hizo cinco horas de fila de regreso.',
  },
];

// The three people at their stalls.
export const RESIDENTS = [
  {
    key: 'taquero', name: 'el taquero', short: 'taquero',
    look: { top: 0xf2eee4, bottom: 0x30343c, hair: 0x2a2420, skin: 0x8f6242, apron: 0xd8352a, paperHat: 0xf6f2e6, scarf: 0xd8352a, mustache: 0x2a2420, key: true },
    call: ['Pss, pss… ven, michi.', '¿Tienes hambre? Ven pa\'cá.', 'Michi, michi… ¿dónde andas?'],
    lines: { pest: '¡Otra vez las ratas! Ayúdame, ándale.' },
    won: { pest: '¡Eso! Mira nomás qué cazador.' },
    lost: 'Ni modo. ¿Otra?',
    shoo: '¡Órale, fuera de aquí!',
    route: [[0.8, 10.9], [6.0, 8.2], [14.0, 8.0], [17.05, 9.4], [17.05, 10.0]],
    naming: ['Ven. A ver esa placa.', 'Negro, negro… como lo que queda en el asador.', 'Carbón. Te vas a llamar Carbón.'], catName: 'Carbón',
    invite: 'Vámonos, pues. Hace frío.', ending: 'Vámonos, pues. Hace frío.', left: 'El taquero siguió dejando un plato junto al carrito.',
  },
  {
    key: 'pan', name: 'la señora del pan', short: 'pan',
    stall: 5,
    look: { top: 0xc2185b, bottom: 0x6a1b4d, hair: 0xd8d2ca, skin: 0x9a6a48, female: true, old: true, apron: 0xfff3d0, shawl: 0xe0359a, bun: true, key: true },
    call: ['Bichito, bichito…', 'Ven, que no te hago nada.', '¿Quieres migajita?'],
    lines: { hunt: '¡Se me volaron las servilletas! Las bordó mi mamá.' },
    won: { hunt: '¡Todas! Dios te lo pague, bichito.' },
    lost: 'No te apures. ¿Otra vez?',
    shoo: '¡Sáquese!',
    route: [[6.65, 5.0], [13.0, 5.0], [13.2, 4.75]],
    naming: ['Acércate, bichito. Déjame ver tu placa.', 'Mi hija siempre quiso un gato. Ya tenía el nombre.', 'Canela. Te vas a llamar Canela.'], catName: 'Canela',
    invite: 'Pásale. Aquí siempre sobra lugar.', ending: 'Pásale. Aquí siempre sobra lugar.', left: 'La señora del pan todavía guarda migajas en una servilleta.',
  },
  {
    key: 'celulares', name: 'el muchacho de los celulares', short: 'celulares',
    stall: 2,
    look: { top: 0xffc400, bottom: 0x1b4fd8, hair: 0x15110e, skin: 0xa77753, shortSleeve: true, headphones: 0x18c0ff, key: true },
    call: ['Hey, little guy.', 'Ven, no hago nada.', 'C\'mere, gatito.'],
    lines: { pattern: 'A ver si tienes ritmo, gatito. Follow me.' },
    won: { pattern: 'No way. You\'re hired, en serio.' },
    lost: 'It\'s cool. One more?',
    shoo: '¡Órale, get out!',
    route: [[-4.15, 5.0], [-17.6, 5.0], [-18.2, 4.75]],
    naming: ['Hey. Let me see that tag.', 'En el call center me pusieron uno. Ya no lo uso.', 'Te lo paso. Kevin. You\'re Kevin now.'], catName: 'Kevin',
    invite: 'It\'s not much, pero es casa.', ending: 'It\'s not much, pero es casa.', left: 'El muchacho de los celulares tiene una foto borrosa de un gato en la pantalla.',
  },
];

// where the wind can leave a napkin (x, y, z)
export const NAPKIN_SPOTS = [
  [-11.35, 0, 1.5], [-16.8, 0, 7.6], [14.8, 0, 7.6], [6.2, 0.12, 13.2], [-4.4, 0.12, 12.9], [10.0, 0, 8.6], [-8.6, 0, 8.4], [0.9, 0, 8.8], [18.2, 0, 8.0],
  [3.2, 2.92, -0.2], [2.4, 2.92, 2.6],
];

// the three stalls: what they smell of, what you overhear, and the game for their piece
export const CHAPTERS = [
  { who: 'taquero', kind: 'meat', conv: 'remesas', game: 'pest', verb: 'espantar a las ratas', go: 'Sigue el olor a tacos', ask: 'Ayuda al taquero con las ratas (E)' },
  { who: 'pan', kind: 'bread', conv: 'malla', game: 'hunt', verb: 'buscar las servilletas', go: 'Sigue el olor a pan', ask: 'Ayuda a la señora del pan (E)' },
  { who: 'celulares', kind: 'phone', conv: 'turno', game: 'pattern', verb: 'seguir el ritmo', go: 'Sigue el olor a plástico caliente', ask: 'Juega con el muchacho de los celulares (E)' },
];
export const PIECES = {
  pest: { part: 'ribbon', title: 'El listón', text: 'te lo amarró el taquero' },
  hunt: { part: 'bell', title: 'El cascabel', text: 'te lo dio la señora del pan' },
  pattern: { part: 'tag', title: 'La placa', text: 'todavía no dice nada' },
};
// three hidden games. at: where it starts. reveal: how near before the cat notices it.
export const SECRETS = [
  { game: 'race', at: [3.65, 0.12, 5.35], reveal: 4.2, label: 'carrera', verb: 'correrle al gato bravo', hint: 'Un gato te reta desde la escalera…', go: 'El gato bravo te reta: ve a la escalera', reward: 'Patas de azotea', rewardText: 'ahora saltas más alto' },
  { game: 'dog', at: [-11.7, 0, 4.3], reveal: 4.6, label: 'perro dormido', verb: 'robarle el hueso al perro', hint: 'Alguien ronca en el callejón…', go: 'Hay un perro dormido en el callejón', reward: 'Respeto', rewardText: 'los perros ya no te persiguen' },
  { game: 'cans', at: [-14.6, 0, -5.6], reveal: 8, label: 'latas', verb: 'tirar las latas', hint: 'Cuántas latas en ese patio…', go: 'Hay latas que tirar en el patio de atrás', reward: 'Zarpazo', rewardText: 'ahora saltas más lejos al cazar', via: [[-11.6, 0.2, 4.0], [-11.6, 0.2, -5.4]] },
];
export const RACE = {
  secs: 11,
  // flags to touch in order, and the line the rival takes
  flags: [[3.7, 1.6, 2.2], [2.6, 2.92, 1.0], [2.3, 3.9, -1.6], [2.25, 4.88, -3.3], [-0.4, 5.6, -1.2]],
};
export const CANS = [[-18.0, 0.5], [-16.8, 0.9], [-15.6, 0.4], [-14.4, 1.05], [-13.2, 0.6], [-9.8, 0.8]].flatMap(([x, y]) => [[x - 0.28, y, -7.7], [x + 0.28, y, -7.7]]);

export const STORY = {
  first: 'Algo huele bien. Presiona Q para olfatear',
  won: '¡Ganaste!', lost: 'Perdiste', next: 'Ahora:', allDone: 'Ya tienes el collar completo. Elige quién te ponga nombre.',
  listen: 'Siéntate cerca, quieto, y escucha', wait: 'Siéntate cerca: ya viene alguien a platicar',
  choose: 'Tu placa está en blanco. Elige quién te ponga nombre (E)', home: 'Síguele a su casa', named: 'así te llamas',
};

// win: what it takes, said before it starts
export const CHALLENGE = {
  time: 'Se acabó el tiempo', left: 'Te fuiste: juego cancelado',
  pest: { title: '¡Ratas!', win: 'Atrapa 8 y a la gorda en 60 segundos. Si roban 6, pierdes', how: 'Que no lleguen a la carne: corre hacia las ratas, o mantén Espacio y suelta para saltarles', meat: 'protege la carne', robbed: 'Se llevaron la carne', lost: 'Se llevaron la carne' },
  hunt: { title: '¡Las servilletas!', win: 'Encuentra las 5 en 75 segundos', how: 'Caliente es cerca, frío es lejos', heat: ['helado', 'frío', 'tibio', 'caliente', '¡te quemas!'], lost: 'El viento ganó: se acabó el tiempo' },
  pattern: { title: 'Sigue el ritmo', win: 'Cuatro rondas, tres errores y pierdes', how: 'Mira qué celulares prenden y repítelos con W A S D', lost: 'Tres errores: se apagaron' },
  race: { title: '¡Carrera!', win: 'Llega a la azotea antes que el gato bravo', how: 'Toca las banderas en orden. Espacio para saltar', lost: 'El gato bravo llegó primero' },
  cans: { title: '¡Latas!', win: 'Tira 10 en 18 segundos', how: 'Corre contra ellas, o súbete y empújalas', lost: 'Se acabó el tiempo' },
  dog: { title: 'Shhh…', win: 'Llévate el hueso a la calle sin despertarlo', how: 'Camina despacio: correr, saltar y pisar basura hacen ruido. Quieto baja el ruido', lost: '¡Se despertó!' },
};
export const DANGER = {
  dog: { warn: '¡Un perro! Sube a algo alto o ponte junto a quien atiende un puesto', go: '¡Ahí viene!', caught: '¡Te alcanzó el perro!' },
  cart: { warn: '¡Golpe, golpe! Viene un diablito: súbete a algo o quítate de en medio', go: '¡Cuidado!', caught: '¡Te atropelló el diablito!' },
  tomcat: { warn: '¡Un gato bravo! Ese sí trepa: ponte junto a quien atiende un puesto', go: '¡Ahí viene!', caught: '¡Te arañó el gato bravo!' },
  safe: '¡A salvo!',
};

export const TEXT = {
  title: 'el otro lado',
  controls: [
    'WASD — caminar · Shift — correr · Espacio — saltar',
    'arrastrar el ratón — girar la cámara · rueda — acercar',
    'E — acercarse · Q — olfatear · F — rodar · L — libreta',
    'gana tu collar, pieza por pieza',
  ],
  start: 'presiona cualquier tecla',
  wins: 'lo que has ganado', remembered: 'quien te esperaba',
  notebook: 'lo que has escuchado',
  notebookNone: 'Nada todavía. Siéntate cerca de quien platica (· · ·).',
  epilogueTitle: 'lo que escuchaste',
  heardOne: 'escuchaste todo',
  restart: 'presiona R para empezar de nuevo',
};
