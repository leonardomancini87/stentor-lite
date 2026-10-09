// Nomi del menu nativo (app desktop) nella lingua dell'interfaccia.
// I titoli dei menu hanno come id la chiave stessa («menu.file»); le voci hanno l'id
// che usa src-tauri/src/main.rs, cioè la chiave senza «menu.» («menu.edit.undo» → «edit.undo»).
export const MENU_TITLE_KEYS = ['menu.file', 'menu.edit', 'menu.view', 'menu.window', 'menu.help'];
export const MENU_ITEM_KEYS = [
  'menu.app.about', 'menu.app.settings', 'menu.app.website', 'menu.app.hide', 'menu.app.quit',
  'menu.window.close',
  'menu.edit.undo', 'menu.edit.redo', 'menu.edit.cut', 'menu.edit.copy', 'menu.edit.paste', 'menu.edit.selectAll',
  'menu.view.fullscreen',
  'menu.window.minimize', 'menu.window.zoom',
  'menu.help.shortcuts', 'menu.help.website', 'menu.help.feedback',
];

export function buildMenuLabels(ui) {
  const labels = {};
  MENU_TITLE_KEYS.forEach((key) => { labels[key] = ui(key); });
  MENU_ITEM_KEYS.forEach((key) => { labels[key.replace(/^menu\./, '')] = ui(key); });
  return labels;
}
