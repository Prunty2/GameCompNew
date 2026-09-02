use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      let main_window = app
        .get_webview_window("main")
        .expect("the configured main window must exist");

      #[cfg(target_os = "macos")]
      main_window.set_simple_fullscreen(true)?;

      #[cfg(not(target_os = "macos"))]
      main_window.set_fullscreen(true)?;

      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
