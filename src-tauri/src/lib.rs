use notify::{Event, EventKind, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{AppHandle, Emitter, Manager, State};

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ExcalidrawFile {
    pub name: String,
    pub path: String,
    pub modified: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Preferences {
    pub last_directory: Option<String>,
    pub recent_directories: Vec<String>,
    pub theme: String,
    pub sidebar_visible: bool,
}

impl Default for Preferences {
    fn default() -> Self {
        Self {
            last_directory: None,
            recent_directories: Vec::new(),
            theme: "system".to_string(),
            sidebar_visible: true,
        }
    }
}

pub struct AppState {
    pub current_directory: Mutex<Option<PathBuf>>,
    pub modified_files: Mutex<Vec<String>>,
}

#[tauri::command]
async fn select_directory(app: AppHandle) -> Result<Option<String>, String> {
    use std::sync::mpsc;
    use tauri_plugin_dialog::DialogExt;

    let (tx, rx) = mpsc::channel();

    app.dialog().file().pick_folder(move |path| {
        let _ = tx.send(path);
    });

    match rx.recv() {
        Ok(Some(path)) => Ok(Some(path.to_string())),
        Ok(None) => Ok(None),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn list_excalidraw_files(directory: String) -> Result<Vec<ExcalidrawFile>, String> {
    let path = Path::new(&directory);

    if !path.exists() {
        return Err("Directory does not exist".to_string());
    }

    let mut files = Vec::new();

    match fs::read_dir(path) {
        Ok(entries) => {
            for entry in entries.flatten() {
                let path = entry.path();
                if path.is_file() {
                    if let Some(extension) = path.extension() {
                        if extension == "excalidraw" {
                            if let Some(file_name) = path.file_name() {
                                files.push(ExcalidrawFile {
                                    name: file_name.to_string_lossy().to_string(),
                                    path: path.to_string_lossy().to_string(),
                                    modified: false,
                                });
                            }
                        }
                    }
                }
            }
        }
        Err(e) => return Err(e.to_string()),
    }

    files.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(files)
}

#[tauri::command]
async fn read_file(file_path: String) -> Result<String, String> {
    match fs::read_to_string(&file_path) {
        Ok(content) => Ok(content),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn save_file(file_path: String, content: String) -> Result<(), String> {
    match fs::write(&file_path, content) {
        Ok(_) => Ok(()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn create_new_file(directory: String, file_name: String) -> Result<String, String> {
    let path = Path::new(&directory).join(&file_name);

    if path.exists() {
        return Err("File already exists".to_string());
    }

    let default_content = serde_json::json!({
        "type": "excalidraw",
        "version": 2,
        "source": "ExcaliApp",
        "elements": [],
        "appState": {
            "gridSize": null,
            "viewBackgroundColor": "#ffffff"
        },
        "files": {}
    })
    .to_string();

    match fs::write(&path, default_content) {
        Ok(_) => Ok(path.to_string_lossy().to_string()),
        Err(e) => Err(e.to_string()),
    }
}

#[tauri::command]
async fn get_preferences(app: AppHandle) -> Result<Preferences, String> {
    use tauri_plugin_store::StoreExt;

    let store = app.store("preferences.json").map_err(|e| e.to_string())?;

    let prefs = if let Some(value) = store.get("preferences") {
        serde_json::from_value(value.clone()).unwrap_or_default()
    } else {
        Preferences::default()
    };

    Ok(prefs)
}

#[tauri::command]
async fn save_preferences(app: AppHandle, preferences: Preferences) -> Result<(), String> {
    use tauri_plugin_store::StoreExt;

    let store = app.store("preferences.json").map_err(|e| e.to_string())?;

    store.set("preferences", serde_json::to_value(&preferences).unwrap());
    store.save().map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn watch_directory(
    app: AppHandle,
    directory: String,
    state: State<'_, AppState>,
) -> Result<(), String> {
    let path = PathBuf::from(&directory);

    {
        let mut current_dir = state.current_directory.lock().unwrap();
        *current_dir = Some(path.clone());
    }

    // Set up file watcher
    let app_handle = app.clone();
    let (tx, rx) = std::sync::mpsc::channel();

    let mut watcher = notify::recommended_watcher(tx).map_err(|e| e.to_string())?;

    watcher
        .watch(&path, RecursiveMode::NonRecursive)
        .map_err(|e| e.to_string())?;

    // Spawn a thread to handle file system events
    std::thread::spawn(move || loop {
        match rx.recv() {
            Ok(Ok(Event {
                kind: EventKind::Create(_) | EventKind::Remove(_) | EventKind::Modify(_),
                paths,
                ..
            })) => {
                for path in paths {
                    if let Some(extension) = path.extension() {
                        if extension == "excalidraw" {
                            let _ = app_handle.emit("file-system-change", &path);
                        }
                    }
                }
            }
            Ok(Err(e)) => eprintln!("Watch error: {:?}", e),
            Err(e) => {
                eprintln!("Watch channel error: {:?}", e);
                break;
            }
            _ => {}
        }
    });

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_store::Builder::new().build())
        .setup(|app| {
            app.manage(AppState {
                current_directory: Mutex::new(None),
                modified_files: Mutex::new(Vec::new()),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            select_directory,
            list_excalidraw_files,
            read_file,
            save_file,
            create_new_file,
            get_preferences,
            save_preferences,
            watch_directory,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
