// Intestazione comune delle pagine (Progetti, Sopratitoli, Schermi, Impostazioni):
// titolo, una riga grigia che spiega la pagina e, a destra, i comandi.
export default function PageHeader({ title, subtitle, actions = null, actionsClassName = '', className = '' }) {
  return (
    <header className={`litePageHeader ${className}`.trim()}>
      <div className="litePageHeaderText">
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {actions ? <div className={`litePageHeaderActions ${actionsClassName}`.trim()}>{actions}</div> : null}
    </header>
  );
}
