fn main() {
    // I permessi degli aggiornamenti (capabilities/self-update) valgono solo se l'app contiene
    // l'aggiornamento dall'app; la copia per il Mac App Store usa soltanto capabilities/base.
    let pattern = if std::env::var_os("CARGO_FEATURE_SELF_UPDATE").is_some() {
        "./capabilities/**/*.json"
    } else {
        "./capabilities/base/*.json"
    };
    tauri_build::try_build(tauri_build::Attributes::new().capabilities_path_pattern(pattern))
        .expect("errore nella preparazione di Tauri");
}
