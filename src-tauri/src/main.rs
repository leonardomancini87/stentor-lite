use serde_json::{json, Value};
use tauri::menu::{Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::{Emitter, Manager};

const WEBSITE_URL: &str = "https://www.stentor.live";

#[tauri::command]
fn stentor_save_project_file(payload: Value, suggested_name: String, path: Option<String>, force_save_as: bool) -> Result<Option<String>, String> {
    let target_path = if force_save_as || path.as_ref().map(|p| p.trim().is_empty()).unwrap_or(true) {
        rfd::FileDialog::new()
            .add_filter("Progetto Sténtor", &["json"])
            .set_file_name(&suggested_name)
            .save_file()
            .map(|p| p.to_string_lossy().to_string())
    } else {
        path
    };

    let Some(target_path) = target_path else {
        return Ok(None);
    };

    let body = serde_json::to_string_pretty(&payload).map_err(|error| error.to_string())?;
    std::fs::write(&target_path, body).map_err(|error| error.to_string())?;
    Ok(Some(target_path))
}

#[tauri::command]
fn stentor_open_project_file() -> Result<Option<Value>, String> {
    let Some(path) = rfd::FileDialog::new()
        .add_filter("Progetto Sténtor", &["json", "stn"])
        .pick_file() else {
        return Ok(None);
    };

    let body = std::fs::read_to_string(&path).map_err(|error| error.to_string())?;
    let project: Value = serde_json::from_str(&body).map_err(|error| error.to_string())?;

    Ok(Some(json!({
        "path": path.to_string_lossy().to_string(),
        "project": project,
    })))
}

// Apre il sito nel browser predefinito del sistema.
fn open_website() {
    #[cfg(target_os = "macos")]
    let _ = std::process::Command::new("open").arg(WEBSITE_URL).status();

    #[cfg(target_os = "windows")]
    let _ = std::process::Command::new("cmd")
        .args(["/C", "start", "", WEBSITE_URL])
        .status();

    #[cfg(all(unix, not(target_os = "macos")))]
    let _ = std::process::Command::new("xdg-open").arg(WEBSITE_URL).status();
}

fn build_macos_menu(app: &tauri::App) -> tauri::Result<Menu<tauri::Wry>> {
    // Menu nativo volutamente minimale: i comandi di progetto e di conduzione
    // restano nell'interfaccia dell'app, dove sono visibili e testabili.
    let app_menu = Submenu::with_items(app, "Sténtor Lite", true, &[
        &MenuItem::with_id(app, "app.about", "Informazioni su Sténtor Lite", true, None::<&str>)?,
        &PredefinedMenuItem::separator(app)?,
        &MenuItem::with_id(app, "app.settings", "Impostazioni…", true, Some("CmdOrCtrl+,"))?,
        &MenuItem::with_id(app, "app.website", "Sito Sténtor", true, None::<&str>)?,
        &PredefinedMenuItem::separator(app)?,
        &MenuItem::with_id(app, "app.hide", "Nascondi Sténtor Lite", true, Some("CmdOrCtrl+H"))?,
        &PredefinedMenuItem::separator(app)?,
        &MenuItem::with_id(app, "app.quit", "Esci da Sténtor Lite", true, Some("CmdOrCtrl+Q"))?,
    ])?;

    let file_menu = Submenu::with_items(app, "File", true, &[
        &MenuItem::with_id(app, "window.close", "Chiudi finestra", true, Some("CmdOrCtrl+W"))?,
    ])?;

    let edit_menu = Submenu::with_items(app, "Modifica", true, &[
        &MenuItem::with_id(app, "edit.undo", "Annulla", true, Some("CmdOrCtrl+Z"))?,
        &MenuItem::with_id(app, "edit.redo", "Ripeti", true, Some("CmdOrCtrl+Shift+Z"))?,
        &PredefinedMenuItem::separator(app)?,
        &MenuItem::with_id(app, "edit.cut", "Taglia", true, Some("CmdOrCtrl+X"))?,
        &MenuItem::with_id(app, "edit.copy", "Copia", true, Some("CmdOrCtrl+C"))?,
        &MenuItem::with_id(app, "edit.paste", "Incolla", true, Some("CmdOrCtrl+V"))?,
        &MenuItem::with_id(app, "edit.selectAll", "Seleziona tutto", true, Some("CmdOrCtrl+A"))?,
    ])?;

    let view_menu = Submenu::with_items(app, "Vista", true, &[
        &MenuItem::with_id(app, "view.fullscreen", "Schermo intero", true, Some("CmdOrCtrl+Shift+F"))?,
    ])?;

    let window_menu = Submenu::with_items(app, "Finestra", true, &[
        &MenuItem::with_id(app, "window.minimize", "Riduci a icona", true, Some("CmdOrCtrl+M"))?,
        &MenuItem::with_id(app, "window.zoom", "Zoom", true, None::<&str>)?,
    ])?;

    let help_menu = Submenu::with_items(app, "Aiuto", true, &[
        &MenuItem::with_id(app, "help.shortcuts", "Scorciatoie da tastiera", true, None::<&str>)?,
        &MenuItem::with_id(app, "help.website", "Sito Sténtor", true, None::<&str>)?,
        &MenuItem::with_id(app, "help.feedback", "Segnala un problema", true, None::<&str>)?,
    ])?;

    Menu::with_items(app, &[
        &app_menu,
        &file_menu,
        &edit_menu,
        &view_menu,
        &window_menu,
        &help_menu,
    ])
}
fn emit_menu_action(app: &tauri::AppHandle, id: &str) {
    let _ = app.emit("stentor-menu-action", json!({ "id": id }));
}

// Porta la finestra a occupare l'area libera dello schermo (senza barra dei menu, Dock o
// barra delle applicazioni), tenendo conto dell'altezza della barra del titolo.
#[cfg_attr(target_os = "windows", allow(dead_code))]
fn fill_work_area(window: &tauri::WebviewWindow) {
    let monitor = window
        .current_monitor()
        .ok()
        .flatten()
        .or_else(|| window.primary_monitor().ok().flatten());
    let Some(monitor) = monitor else { return };
    let area = monitor.work_area();
    let area_position = area.position;
    let area_size = area.size;

    let (extra_width, extra_height) = match (window.outer_size(), window.inner_size()) {
        (Ok(outer), Ok(inner)) => (
            outer.width.saturating_sub(inner.width),
            outer.height.saturating_sub(inner.height),
        ),
        _ => (0, 0),
    };
    let size = tauri::PhysicalSize::new(
        area_size.width.saturating_sub(extra_width),
        area_size.height.saturating_sub(extra_height),
    );

    let _ = window.set_position(area_position);
    let _ = window.set_size(size);
}

// La finestra principale nasce nascosta e si mostra quando l'interfaccia ha finito di disegnarsi
// (comando chiamato da src/main.jsx): così all'avvio non si vede il lampo della pagina vuota.
fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("regia") {
        if !window.is_visible().unwrap_or(false) {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

#[tauri::command]
fn stentor_window_ready(app: tauri::AppHandle) {
    show_main_window(&app);
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            if let Some(window) = app.get_webview_window("regia") {
                let _ = window.set_title("Sténtor Lite");
                // La finestra nasce nascosta ("visible": false in tauri.conf.json): le si dà
                // subito la dimensione finale e la si mostra solo quando l'interfaccia è pronta
                // (vedi show_main_window). Su macOS e Linux niente "ingrandisci" di sistema, che
                // su macOS è un interruttore animato: si occupa tutta l'area libera dello schermo.
                // Su Windows invece si ingrandisce davvero, altrimenti restano margini ai bordi.
                #[cfg(target_os = "windows")]
                {
                    let _ = window.maximize();
                }
                #[cfg(not(target_os = "windows"))]
                fill_work_area(&window);
            }
            // Riserva: se l'interfaccia non avvisa (per esempio per un errore), la finestra
            // compare comunque dopo poco.
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                std::thread::sleep(std::time::Duration::from_millis(2500));
                show_main_window(&handle);
            });
            if let Ok(menu) = build_macos_menu(app) {
                let _ = app.set_menu(menu);
            }
            Ok(())
        })
        .on_menu_event(|app, event| {
            let id = event.id().as_ref().to_string();
            match id.as_str() {
                "app.quit" => app.exit(0),
                "help.website" | "app.website" => open_website(),
                "window.close" => {
                    if let Some(window) = app.get_webview_window("regia") {
                        let _ = window.close();
                    }
                }
                "window.minimize" => {
                    if let Some(window) = app.get_webview_window("regia") {
                        let _ = window.minimize();
                    }
                }
                "window.zoom" => {
                    if let Some(window) = app.get_webview_window("regia") {
                        let _ = window.maximize();
                    }
                }
                _ => emit_menu_action(app, &id),
            }
        })
        .invoke_handler(tauri::generate_handler![stentor_save_project_file, stentor_open_project_file, stentor_window_ready])
        .run(tauri::generate_context!())
        .expect("error while running Sténtor Lite");
}
