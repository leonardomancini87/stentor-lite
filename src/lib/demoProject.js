export const demoProject = {
  id: 'demo-opera',
  title: 'Opera demo',
  languages: ['it', 'en'],
  activeLanguage: 'it',
  primaryLanguage: 'it',
  languageNames: {
    it: 'Italiano',
    en: 'Inglese'
  },
  settings: {
    activeScreenId: 'schermo-1',
    screens: [
      {
        id: 'schermo-1',
        name: 'Schermo 1',
        publicFontSize: '72px',
        publicFontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        publicTextColor: '#F3E7B3',
        publicBackground: '#000000',
        publicMaxWidth: '90%',
        publicVerticalAlign: 'top',
        publicPaddingTop: '6vh',
        publicLanguage: 'active'
      }
    ],
    publicFontSize: '72px',
    publicFontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    publicTextColor: '#F3E7B3',
    publicBackground: '#000000',
    publicMaxWidth: '90%',
    publicVerticalAlign: 'top',
    publicPaddingTop: '6vh'
  },
  cues: [
    {
      id: 1,
      speaker: 'CORO',
      original: 'O Fortuna, velut luna, statu variabilis.',
      translations: {
        it: 'O Fortuna, mutevole come la luna.',
        en: 'O Fortune, like the moon, ever changing.'
      },
      note: 'Ingresso luci fredde',
      renderStyle: 'italic'
    },
    {
      id: 2,
      speaker: 'TENORE',
      original: 'In questa notte senza stelle cerco ancora il tuo nome.',
      translations: {
        it: 'In questa notte senza stelle cerco ancora il tuo nome.',
        en: 'In this starless night I still search for your name.'
      },
      note: 'Attendere respiro del tenore',
      renderStyle: 'normal'
    },
    {
      id: 3,
      speaker: 'SOPRANO',
      original: 'Non temere: la voce troverà la strada.',
      translations: {
        it: 'Non temere: la voce troverà la strada.',
        en: 'Do not fear: the voice will find its way.'
      },
      note: 'Sopratitolo subito dopo gesto mano',
      renderStyle: 'normal'
    },
    {
      id: 4,
      speaker: 'NARRATORE',
      original: 'La città ascolta, sospesa tra memoria e desiderio.',
      translations: {
        it: 'La città ascolta, sospesa tra memoria e desiderio.',
        en: 'The city listens, suspended between memory and desire.'
      },
      note: 'Rallentare',
      renderStyle: 'normal'
    }
  ]
};
