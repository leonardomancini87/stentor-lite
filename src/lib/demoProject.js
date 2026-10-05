// Progetto dimostrativo: alcune scene dall'Antigone di Sofocle (vv. 1–280, scelta di versi).
// Traduzione italiana, inglese e francese fatta apposta per Sténtor Lite dal testo greco
// (di pubblico dominio) e distribuita con la stessa licenza del codice: non deriva da
// traduzioni pubblicate. I tempi registrati servono a provare la card Tempi.
export const demoProject = {
  id: 'demo-antigone',
  // Da aumentare quando la demo cambia: all'avvio la copia salvata viene sostituita (vedi refreshBuiltInDemo).
  demoVersion: 2,
  title: 'Antigone (demo)',
  author: 'da Sofocle',
  languages: ['it', 'en', 'fr'],
  activeLanguage: 'it',
  primaryLanguage: 'it',
  languageNames: {
    it: 'Italiano',
    en: 'English',
    fr: 'Français'
  },
  settings: {
    activeScreenId: 'schermo-1',
    screens: [
      {
        id: 'schermo-1',
        name: 'Schermo 1',
        publicFontSize: '72px',
        publicFontFamily: '"Atkinson Hyperlegible", Arial, sans-serif',
        publicTextColor: '#F3E7B3',
        publicBackground: '#000000',
        publicMaxWidth: '90%',
        publicVerticalAlign: 'top',
        publicPaddingTop: '6vh',
        publicLanguage: 'active'
      }
    ],
    publicFontSize: '72px',
    publicFontFamily: '"Atkinson Hyperlegible", Arial, sans-serif',
    publicTextColor: '#F3E7B3',
    publicBackground: '#000000',
    publicMaxWidth: '90%',
    publicVerticalAlign: 'top',
    publicPaddingTop: '6vh'
  },
  cues: [
    {
      "id": 1,
      "type": "marker",
      "markerType": "act",
      "title": "Prologo",
      "speaker": "MARCATORE",
      "original": "",
      "translations": {},
      "note": "",
      "startTime": null,
      "endTime": null,
      "textStyle": { "bold": false },
      "renderStyle": "normal"
    },
    {
      "id": 2,
      "speaker": "ANTIGONE",
      "original": "Ismene, sorella, sangue del mio sangue:\nc'è un male di Edipo che Zeus ci risparmi?",
      "translations": {
        "it": "Ismene, sorella, sangue del mio sangue:\nc'è un male di Edipo che Zeus ci risparmi?",
        "en": "Ismene, my sister, my own blood:\nwhat sorrow of Oedipus has Zeus spared us?",
        "fr": "Ismène, ma sœur, sang de mon sang :\nquel mal d'Œdipe Zeus nous épargne-t-il ?"
      },
      "note": "Alba. Antigone ha portato Ismene fuori dal palazzo",
      "startTime": 3.0,
      "endTime": null,
      "textStyle": { "bold": false },
      "renderStyle": "normal"
    },
    {
      "id": 3,
      "speaker": "ANTIGONE",
      "original": "E che cos'è l'editto che, dicono, il capo\nha appena proclamato a tutta la città?",
      "translations": {
        "it": "E che cos'è l'editto che, dicono, il capo\nha appena proclamato a tutta la città?",
        "en": "And this edict, they say, the general\nhas just proclaimed to the whole city?",
        "fr": "Et quel est cet édit que, dit-on, le chef\nvient de proclamer à toute la ville ?"
      },
      "note": "",
      "startTime": 10.6,
      "endTime": null,
      "textStyle": { "bold": false },
      "renderStyle": "normal"
    },
    {
      "id": 4,
      "speaker": "ISMENE",
      "original": "Nessuna notizia, Antigone, da quando\nin un giorno abbiamo perso i due fratelli.",
      "translations": {
        "it": "Nessuna notizia, Antigone, da quando\nin un giorno abbiamo perso i due fratelli.",
        "en": "No word has reached me, Antigone, since\nwe lost our two brothers in one day.",
        "fr": "Aucune nouvelle, Antigone, depuis\nque nos deux frères sont tombés ensemble."
      },
      "note": "",
      "startTime": 18.1,
      "endTime": null,
      "textStyle": { "bold": false },
      "renderStyle": "normal"
    },
    {
      "id": 5,
      "speaker": "ANTIGONE",
      "original": "Creonte ha dato all'uno una tomba onorata,\ne all'altro l'ha negata.",
      "translations": {
        "it": "Creonte ha dato all'uno una tomba onorata,\ne all'altro l'ha negata.",
        "en": "Creon has given one an honoured grave,\nand denied it to the other.",
        "fr": "Créon a donné à l'un une tombe honorée,\net l'a refusée à l'autre."
      },
      "note": "",
      "startTime": 25.5,
      "endTime": null,
      "textStyle": { "bold": false },
      "renderStyle": "normal"
    },
    {
      "id": 6,
      "speaker": "ANTIGONE",
      "original": "Polinice resterà senza pianto né tomba:\nun dolce bottino per gli uccelli.",
      "translations": {
        "it": "Polinice resterà senza pianto né tomba:\nun dolce bottino per gli uccelli.",
        "en": "Polynices is to lie unmourned, unburied:\na sweet prize for the birds.",
        "fr": "Polynice restera sans larmes ni tombe :\nun doux butin pour les oiseaux."
      },
      "note": "",
      "startTime": 32.3,
      "endTime": null,
      "textStyle": { "bold": false },
      "renderStyle": "normal"
    },
    {
      "id": 7,
      "speaker": "ANTIGONE",
      "original": "Ora mostrerai chi sei: nobile di nascita,\no indegna del tuo sangue.",
      "translations": {
        "it": "Ora mostrerai chi sei: nobile di nascita,\no indegna del tuo sangue.",
        "en": "Now you will show who you are:\nnobly born, or unworthy of your blood.",
        "fr": "Tu vas montrer qui tu es :\nde noble race, ou indigne de ton sang."
      },
      "note": "",
      "startTime": 39.4,
      "endTime": null,
      "textStyle": { "bold": false },
      "renderStyle": "normal"
    },
    {
      "id": 8,
      "speaker": "ANTIGONE",
      "original": "Mi aiuterai a sollevare il suo corpo?",
      "translations": {
        "it": "Mi aiuterai a sollevare il suo corpo?",
        "en": "Will you help me lift his body?",
        "fr": "M'aideras-tu à soulever son corps ?"
      },
      "note": "",
      "startTime": 46.2,
      "endTime": null,
      "textStyle": { "bold": false },
      "renderStyle": "normal"
    },
    {
      "id": 9,
      "speaker": "ISMENE",
      "original": "Vuoi seppellirlo, se la città lo vieta?",
      "translations": {
        "it": "Vuoi seppellirlo, se la città lo vieta?",
        "en": "You'd bury him? The city forbids it!",
        "fr": "Tu veux l'ensevelir ? Malgré l'interdit ?"
      },
      "note": "",
      "startTime": 51.3,
      "endTime": null,
      "textStyle": { "bold": false },
      "renderStyle": "normal"
    },
    {
      "id": 10,
      "speaker": "ANTIGONE",
      "original": "È mio fratello. E tuo, anche se non vuoi.\nNessuno mi coglierà a tradirlo.",
      "translations": {
        "it": "È mio fratello. E tuo, anche se non vuoi.\nNessuno mi coglierà a tradirlo.",
        "en": "He's my brother. And yours, if you refuse.\nNo one will catch me betraying him.",
        "fr": "C'est mon frère. Et le tien, malgré toi.\nOn ne me prendra pas à le trahir."
      },
      "note": "",
      "startTime": 56.5,
      "endTime": null,
      "textStyle": { "bold": false },
      "renderStyle": "normal"
    },
    {
      "id": 11,
      "speaker": "ISMENE",
      "original": "Siamo donne, Antigone. Non siamo nate\nper combattere contro gli uomini.",
      "translations": {
        "it": "Siamo donne, Antigone. Non siamo nate\nper combattere contro gli uomini.",
        "en": "We are women, Antigone. We were not born\nto fight against men.",
        "fr": "Nous sommes des femmes, Antigone.\nNous ne sommes pas nées pour lutter."
      },
      "note": "Pausa. Ismene si allontana di un passo",
      "startTime": 63.6,
      "endTime": null,
      "textStyle": { "bold": false },
      "renderStyle": "normal"
    },
    {
      "id": 12,
      "speaker": "ANTIGONE",
      "original": "Io lo seppellirò.\nSarà bello morire per questo.",
      "translations": {
        "it": "Io lo seppellirò.\nSarà bello morire per questo.",
        "en": "I will bury him.\nIt will be beautiful to die for this.",
        "fr": "Moi, je l'ensevelirai.\nIl sera beau de mourir pour cela."
      },
      "note": "",
      "startTime": 70.6,
      "endTime": null,
      "textStyle": { "bold": false },
      "renderStyle": "normal"
    },
    {
      "id": 13,
      "speaker": "ISMENE",
      "original": "Va', dunque. Vai senza senno,\nma davvero cara a chi ti è caro.",
      "translations": {
        "it": "Va', dunque. Vai senza senno,\nma davvero cara a chi ti è caro.",
        "en": "Go, then. You go without reason,\nbut truly dear to those who love you.",
        "fr": "Va donc. Tu pars sans raison,\nmais vraiment chère à ceux qui t'aiment."
      },
      "note": "Antigone esce. Ismene rientra nel palazzo",
      "startTime": 76.3,
      "endTime": null,
      "textStyle": { "bold": false },
      "renderStyle": "normal"
    },
    {
      "id": 14,
      "type": "marker",
      "markerType": "act",
      "title": "Parodo",
      "speaker": "MARCATORE",
      "original": "",
      "translations": {},
      "note": "",
      "startTime": null,
      "endTime": null,
      "textStyle": { "bold": false },
      "renderStyle": "normal"
    },
    {
      "id": 15,
      "speaker": "CORO",
      "original": "Raggio di sole, la luce più bella\nmai sorta su Tebe dalle sette porte,",
      "translations": {
        "it": "Raggio di sole, la luce più bella\nmai sorta su Tebe dalle sette porte,",
        "en": "Ray of the sun, the fairest light\never risen over seven-gated Thebes,",
        "fr": "Rayon du soleil, la plus belle lumière\nlevée sur Thèbes aux sept portes,"
      },
      "note": "Ingresso del Coro, luce piena",
      "startTime": 85.8,
      "endTime": null,
      "textStyle": { "bold": false },
      "renderStyle": "normal"
    },
    {
      "id": 16,
      "speaker": "CORO",
      "original": "occhio del giorno d'oro, ti sei levato\nsulle acque di Dirce.",
      "translations": {
        "it": "occhio del giorno d'oro, ti sei levato\nsulle acque di Dirce.",
        "en": "eye of the golden day, you have risen\nover the waters of Dirce.",
        "fr": "œil du jour d'or, tu t'es levé\nsur les eaux de Dircé."
      },
      "note": "",
      "startTime": 92.7,
      "endTime": null,
      "textStyle": { "bold": false },
      "renderStyle": "normal"
    },
    {
      "id": 17,
      "type": "marker",
      "markerType": "act",
      "title": "Primo episodio",
      "speaker": "MARCATORE",
      "original": "",
      "translations": {},
      "note": "",
      "startTime": null,
      "endTime": null,
      "textStyle": { "bold": false },
      "renderStyle": "normal"
    },
    {
      "id": 18,
      "speaker": "CREONTE",
      "original": "Cittadini: dopo una grande tempesta,\ngli dei hanno raddrizzato la città.",
      "translations": {
        "it": "Cittadini: dopo una grande tempesta,\ngli dei hanno raddrizzato la città.",
        "en": "Citizens: after a great storm,\nthe gods have set the city upright.",
        "fr": "Citoyens : après une grande tempête,\nles dieux ont redressé la cité."
      },
      "note": "Entra Creonte con le guardie",
      "startTime": 102.1,
      "endTime": null,
      "textStyle": { "bold": false },
      "renderStyle": "normal"
    },
    {
      "id": 19,
      "speaker": "CREONTE",
      "original": "Chi mette un amico sopra la patria,\nper me non conta nulla.",
      "translations": {
        "it": "Chi mette un amico sopra la patria,\nper me non conta nulla.",
        "en": "Whoever puts a friend above his country\ncounts for nothing in my eyes.",
        "fr": "Qui place un ami au-dessus de sa patrie\nne compte pour rien à mes yeux."
      },
      "note": "",
      "startTime": 109.2,
      "endTime": null,
      "textStyle": { "bold": false },
      "renderStyle": "normal"
    },
    {
      "id": 20,
      "speaker": "CREONTE",
      "original": "Polinice: nessuno lo seppellisca o pianga.\nLo mangino i cani e gli uccelli.",
      "translations": {
        "it": "Polinice: nessuno lo seppellisca o pianga.\nLo mangino i cani e gli uccelli.",
        "en": "Polynices: let no one bury or mourn him.\nLet the dogs and the birds have him.",
        "fr": "Que nul n'enterre ni ne pleure Polynice.\nQue chiens et oiseaux le dévorent."
      },
      "note": "",
      "startTime": 115.5,
      "endTime": null,
      "textStyle": { "bold": false },
      "renderStyle": "normal"
    },
    {
      "id": 21,
      "speaker": "GUARDIA",
      "original": "Signore, non dirò di essere arrivato\ncorrendo a perdifiato…",
      "translations": {
        "it": "Signore, non dirò di essere arrivato\ncorrendo a perdifiato…",
        "en": "My lord, I won't claim I came here\nrunning myself out of breath…",
        "fr": "Seigneur, je ne dirai pas que j'arrive\nhors d'haleine à force de courir…"
      },
      "note": "Entra la Guardia, esitante",
      "startTime": 122.7,
      "endTime": null,
      "textStyle": { "bold": false },
      "renderStyle": "normal"
    },
    {
      "id": 22,
      "speaker": "GUARDIA",
      "original": "Qualcuno ha sepolto il morto, ed è andato:\nha sparso polvere arida e fatto i riti.",
      "translations": {
        "it": "Qualcuno ha sepolto il morto, ed è andato:\nha sparso polvere arida e fatto i riti.",
        "en": "Someone has buried the corpse and gone:\nsprinkled thirsty dust, done the rites.",
        "fr": "Quelqu'un a enseveli le mort, puis a fui :\npoussière sèche jetée, rites accomplis."
      },
      "note": "",
      "startTime": 129.0,
      "endTime": null,
      "textStyle": { "bold": false },
      "renderStyle": "normal"
    },
    {
      "id": 23,
      "speaker": "CREONTE",
      "original": "Che cosa dici? Chi ha osato tanto?",
      "translations": {
        "it": "Che cosa dici? Chi ha osato tanto?",
        "en": "What are you saying? Who dared do this?",
        "fr": "Que dis-tu ? Qui a osé cela ?"
      },
      "note": "",
      "startTime": 136.6,
      "endTime": null,
      "textStyle": { "bold": false },
      "renderStyle": "normal"
    },
    {
      "id": 24,
      "speaker": "CORIFEO",
      "original": "Signore, da tempo mi chiedo\nse non sia opera degli dei.",
      "translations": {
        "it": "Signore, da tempo mi chiedo\nse non sia opera degli dei.",
        "en": "My lord, I have long been wondering\nwhether this is the work of the gods.",
        "fr": "Seigneur, je me demande depuis un moment\nsi ce n'est pas l'œuvre des dieux."
      },
      "note": "",
      "startTime": 141.6,
      "endTime": null,
      "textStyle": { "bold": false },
      "renderStyle": "normal"
    },
    {
      "id": 25,
      "speaker": "CREONTE",
      "original": "Taci, prima di riempirmi d'ira.",
      "translations": {
        "it": "Taci, prima di riempirmi d'ira.",
        "en": "Be silent, before you fill me with rage.",
        "fr": "Tais-toi, avant de m'emplir de colère."
      },
      "note": "",
      "startTime": 147.7,
      "endTime": null,
      "textStyle": { "bold": false },
      "renderStyle": "normal"
    }
  ]
};
