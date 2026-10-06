import { cloneElement, useEffect, useRef, useState } from 'react';

// Anteprima del passaggio tra battute (Schermi): quando cambia `transitionKey`, la battuta che
// esce resta per un momento accanto a quella che entra, con lo stesso effetto dello schermo in sala
// (public/public-stage.html). Il figlio è uno StageSubtitle; le classi stageFx* stanno in app.css.
export default function StageTransition({ transitionKey, effect = 'fade', ms = 120, children }) {
  const [state, setState] = useState({ key: transitionKey, leaving: null, delayed: false, serial: 0 });
  const shownRef = useRef(children);

  if (state.key !== transitionKey) {
    const leaving = effect === 'none' ? null : shownRef.current || null;
    setState({ key: transitionKey, leaving, delayed: Boolean(leaving), serial: state.serial + 1 });
  }

  // Dopo ogni disegno: l'ultima battuta mostrata, pronta a diventare quella che esce.
  useEffect(() => { shownRef.current = children; });

  const { leaving, serial } = state;
  useEffect(() => {
    if (!leaving) return undefined;
    const timer = window.setTimeout(() => {
      setState((current) => (current.serial === serial ? { ...current, leaving: null } : current));
    }, ms + 60);
    return () => window.clearTimeout(timer);
  }, [leaving, serial, ms]);

  const fx = `stageFx-${effect}`;
  return (
    <>
      {leaving ? cloneElement(leaving, { key: `out-${serial}`, className: `stageFxLeave ${fx}`, transitionMs: ms }) : null}
      {children ? cloneElement(children, {
        key: `in-${serial}`,
        className: `stageFxEnter ${fx}${state.delayed ? ' afterOutgoing' : ''}`,
        transitionMs: ms,
      }) : null}
    </>
  );
}
