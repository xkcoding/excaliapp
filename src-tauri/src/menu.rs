use serde::{Deserialize, Serialize};
use tauri::{
    menu::{
        AboutMetadataBuilder, Menu, MenuBuilder, MenuId, MenuItemBuilder, PredefinedMenuItem,
        Submenu, SubmenuBuilder,
    },
    AppHandle, Emitter, Manager, Runtime,
};
use tauri_plugin_store::StoreExt;

use crate::AppState;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MenuCommand {
    pub command: String,
    pub data: Option<serde_json::Value>,
}

// Simple menu translation function  
fn get_menu_text(key: &str, locale: &str) -> &'static str {
    match (locale, key) {
        ("zh-CN", "File") => "文件",
        ("zh-CN", "Edit") => "编辑",
        ("zh-CN", "Layout") => "布局",
        ("zh-CN", "View") => "视图",
        ("zh-CN", "Language") => "语言",
        ("zh-CN", "Preferences") => "偏好设置",
        ("zh-CN", "Window") => "窗口",
        ("zh-CN", "Help") => "帮助",
        ("zh-CN", "layout_mrtree") => "🔀 流程图对称布局",
        ("zh-CN", "layout_layered") => "📋 步骤序列布局",
        ("zh-CN", "layout_box") => "📦 紧凑架构布局",
        ("zh-CN", "layout_stress") => "🕸️ 关系网络布局",
        ("zh-CN", "layout_grid") => "⚏ 整齐网格布局",
        ("zh-CN", "auto_layout") => "🎯 智能选择布局...",
        ("zh-CN", "Open Directory") => "打开目录",
        ("zh-CN", "New File") => "新建文件",
        ("zh-CN", "Save") => "保存",
        ("zh-CN", "Save As...") => "另存为...",
        ("zh-CN", "Recent Directories") => "最近目录",
        ("zh-CN", "Clear Recent") => "清除最近",
        ("zh-CN", "Quit") => "退出",
        ("zh-CN", "Cut") => "剪切",
        ("zh-CN", "Copy") => "复制",
        ("zh-CN", "Paste") => "粘贴",
        ("zh-CN", "Select All") => "全选",
        ("zh-CN", "Toggle Sidebar") => "切换侧边栏",
        ("zh-CN", "Zoom In") => "放大",
        ("zh-CN", "Zoom Out") => "缩小",
        ("zh-CN", "Reset Zoom") => "重置缩放",
        ("zh-CN", "Toggle Fullscreen") => "切换全屏",
        ("zh-CN", "AI Settings") => "AI 设置",
        ("zh-CN", "Minimize") => "最小化",
        ("zh-CN", "Close Window") => "关闭窗口",
        ("zh-CN", "Keyboard Shortcuts") => "键盘快捷键",
        ("zh-CN", "About ExcaliApp") => "关于 ExcaliApp",
        ("en-US", "File") => "File",
        ("en-US", "Edit") => "Edit", 
        ("en-US", "Layout") => "Layout",
        ("en-US", "View") => "View",
        ("en-US", "Language") => "Language",
        ("en-US", "Preferences") => "Preferences",
        ("en-US", "Window") => "Window",
        ("en-US", "Help") => "Help",
        ("en-US", "layout_mrtree") => "🔀 Symmetric Flowchart",
        ("en-US", "layout_layered") => "📋 Sequential Steps",
        ("en-US", "layout_box") => "📦 Compact Architecture",
        ("en-US", "layout_stress") => "🕸️ Network Relations",
        ("en-US", "layout_grid") => "⚏ Clean Grid",
        ("en-US", "auto_layout") => "🎯 Smart Layout Selection...",
        ("en-US", "Open Directory") => "Open Directory",
        ("en-US", "New File") => "New File",
        ("en-US", "Save") => "Save",
        ("en-US", "Save As...") => "Save As...",
        ("en-US", "Recent Directories") => "Recent Directories",
        ("en-US", "Clear Recent") => "Clear Recent",
        ("en-US", "Quit") => "Quit",
        ("en-US", "Cut") => "Cut",
        ("en-US", "Copy") => "Copy",
        ("en-US", "Paste") => "Paste",
        ("en-US", "Select All") => "Select All",
        ("en-US", "Toggle Sidebar") => "Toggle Sidebar",
        ("en-US", "Zoom In") => "Zoom In",
        ("en-US", "Zoom Out") => "Zoom Out",
        ("en-US", "Reset Zoom") => "Reset Zoom",
        ("en-US", "Toggle Fullscreen") => "Toggle Fullscreen",
        ("en-US", "AI Settings") => "AI Settings",
        ("en-US", "Minimize") => "Minimize",
        ("en-US", "Close Window") => "Close Window",
        ("en-US", "Keyboard Shortcuts") => "Keyboard Shortcuts",
        ("en-US", "About ExcaliApp") => "About ExcaliApp",
        // Fallback to English for unknown keys
        (_, "File") => "File",
        (_, "Edit") => "Edit",
        (_, "Layout") => "Layout", 
        (_, "View") => "View",
        (_, "Language") => "Language",
        (_, "Preferences") => "Preferences",
        (_, "Window") => "Window",
        (_, "Help") => "Help",
        (_, "layout_mrtree") => "🔀 Symmetric Flowchart",
        (_, "layout_layered") => "📋 Sequential Steps",
        (_, "layout_box") => "📦 Compact Architecture",
        (_, "layout_stress") => "🕸️ Network Relations",
        (_, "layout_grid") => "⚏ Clean Grid",
        (_, "auto_layout") => "🎯 Smart Layout Selection...",
        _ => "Unknown"
    }
}

// Get current locale from app state or default to Chinese
fn get_current_locale<R: Runtime>(app: &AppHandle<R>) -> String {
    // Try to read from the i18n store, default to Chinese
    use tauri_plugin_store::StoreExt;
    
    if let Ok(store) = app.store("i18n-store.json") {
        if let Some(value) = store.get("state") {
            if let Ok(state) = serde_json::from_value::<serde_json::Value>(value.clone()) {
                if let Some(config) = state.get("config") {
                    if let Some(lang) = config.get("currentLanguage") {
                        if let Some(lang_str) = lang.as_str() {
                            return lang_str.to_string();
                        }
                    }
                }
            }
        }
    }
    
    "zh-CN".to_string()
}

fn create_language_menu<R: Runtime>(
    app: &AppHandle<R>,
) -> Result<Submenu<R>, Box<dyn std::error::Error>> {
    let locale = get_current_locale(app);
    
    let chinese = MenuItemBuilder::with_id("language_zh_CN", "🇨🇳 中文 (Chinese)")
        .build(app)?;
    
    let english = MenuItemBuilder::with_id("language_en_US", "🇺🇸 English")
        .build(app)?;

    let language_menu = SubmenuBuilder::new(app, get_menu_text("Language", &locale))
        .items(&[&chinese, &english])
        .build()?;

    Ok(language_menu)
}

pub fn create_menu<R: Runtime>(app: &AppHandle<R>) -> Result<Menu<R>, Box<dyn std::error::Error>> {
    let file_menu = create_file_menu(app)?;
    let edit_menu = create_edit_menu(app)?;
    let layout_menu = create_layout_menu(app)?;
    let view_menu = create_view_menu(app)?;
    let language_menu = create_language_menu(app)?;
    let preferences_menu = create_preferences_menu(app)?;
    let window_menu = create_window_menu(app)?;
    let help_menu = create_help_menu(app)?;

    let menu = MenuBuilder::new(app)
        .items(&[&file_menu, &edit_menu, &layout_menu, &view_menu, &language_menu, &preferences_menu, &window_menu, &help_menu])
        .build()?;

    Ok(menu)
}

fn create_file_menu<R: Runtime>(
    app: &AppHandle<R>,
) -> Result<Submenu<R>, Box<dyn std::error::Error>> {
    let locale = get_current_locale(app);
    let open_directory = MenuItemBuilder::with_id("open_directory", get_menu_text("Open Directory", &locale))
        .accelerator("CmdOrCtrl+O")
        .build(app)?;

    let new_file = MenuItemBuilder::with_id("new_file", get_menu_text("New File", &locale))
        .accelerator("CmdOrCtrl+N")
        .build(app)?;

    let save = MenuItemBuilder::with_id("save", get_menu_text("Save", &locale))
        .accelerator("CmdOrCtrl+S")
        .build(app)?;

    let save_as = MenuItemBuilder::with_id("save_as", get_menu_text("Save As...", &locale))
        .accelerator("CmdOrCtrl+Shift+S")
        .build(app)?;

    let separator = PredefinedMenuItem::separator(app)?;

    // Recent directories submenu
    let recent_menu = create_recent_directories_menu(app)?;

    let separator2 = PredefinedMenuItem::separator(app)?;

    #[cfg(not(target_os = "macos"))]
    let quit = MenuItemBuilder::with_id("quit", "Quit")
        .accelerator("CmdOrCtrl+Q")
        .build(app)?;

    #[cfg(target_os = "macos")]
    let quit = PredefinedMenuItem::quit(app, None)?;

    let file_menu = SubmenuBuilder::new(app, get_menu_text("File", &locale))
        .items(&[
            &open_directory,
            &new_file,
            &separator,
            &save,
            &save_as,
            &separator2,
            &recent_menu,
            &separator2,
            &quit,
        ])
        .build()?;

    Ok(file_menu)
}

fn create_recent_directories_menu<R: Runtime>(
    app: &AppHandle<R>,
) -> Result<Submenu<R>, Box<dyn std::error::Error>> {
    let locale = get_current_locale(app);
    let recent_menu = SubmenuBuilder::new(app, get_menu_text("Recent Directories", &locale))
        .id(MenuId::from("recent_directories"))
        .build()?;

    Ok(recent_menu)
}


fn create_edit_menu<R: Runtime>(
    app: &AppHandle<R>,
) -> Result<Submenu<R>, Box<dyn std::error::Error>> {
    let locale = get_current_locale(app);
    // Use predefined menu items for proper system clipboard integration
    let cut = PredefinedMenuItem::cut(app, None)?;
    let copy = PredefinedMenuItem::copy(app, None)?;
    let paste = PredefinedMenuItem::paste(app, None)?;
    let select_all = PredefinedMenuItem::select_all(app, None)?;

    let edit_menu = SubmenuBuilder::new(app, get_menu_text("Edit", &locale))
        .items(&[
            &cut,
            &copy,
            &paste,
            &PredefinedMenuItem::separator(app)?,
            &select_all,
        ])
        .build()?;

    Ok(edit_menu)
}

fn create_layout_menu<R: Runtime>(
    app: &AppHandle<R>,
) -> Result<Submenu<R>, Box<dyn std::error::Error>> {
    let locale = get_current_locale(app);
    
    let flowchart_layout = MenuItemBuilder::with_id("layout_mrtree", get_menu_text("layout_mrtree", &locale))
        .build(app)?;
    
    let sequence_layout = MenuItemBuilder::with_id("layout_layered", get_menu_text("layout_layered", &locale))
        .build(app)?;
    
    let architecture_layout = MenuItemBuilder::with_id("layout_box", get_menu_text("layout_box", &locale))
        .build(app)?;
    
    let network_layout = MenuItemBuilder::with_id("layout_stress", get_menu_text("layout_stress", &locale))
        .build(app)?;
    
    let grid_layout = MenuItemBuilder::with_id("layout_grid", get_menu_text("layout_grid", &locale))
        .build(app)?;

    let separator = PredefinedMenuItem::separator(app)?;
    
    let auto_layout = MenuItemBuilder::with_id("auto_layout", get_menu_text("auto_layout", &locale))
        .accelerator("Ctrl+Shift+L")
        .build(app)?;

    let layout_menu = SubmenuBuilder::new(app, get_menu_text("Layout", &locale))
        .items(&[
            &flowchart_layout,
            &sequence_layout,
            &architecture_layout,
            &network_layout,
            &grid_layout,
            &separator,
            &auto_layout,
        ])
        .build()?;

    Ok(layout_menu)
}

fn create_view_menu<R: Runtime>(
    app: &AppHandle<R>,
) -> Result<Submenu<R>, Box<dyn std::error::Error>> {
    let locale = get_current_locale(app);
    let toggle_sidebar = MenuItemBuilder::with_id("toggle_sidebar", get_menu_text("Toggle Sidebar", &locale))
        .accelerator("CmdOrCtrl+B")
        .build(app)?;

    let separator = PredefinedMenuItem::separator(app)?;

    let zoom_in = MenuItemBuilder::with_id("zoom_in", get_menu_text("Zoom In", &locale))
        .accelerator("CmdOrCtrl+Plus")
        .build(app)?;

    let zoom_out = MenuItemBuilder::with_id("zoom_out", get_menu_text("Zoom Out", &locale))
        .accelerator("CmdOrCtrl+-")
        .build(app)?;

    let reset_zoom = MenuItemBuilder::with_id("reset_zoom", get_menu_text("Reset Zoom", &locale))
        .accelerator("CmdOrCtrl+0")
        .build(app)?;

    let separator2 = PredefinedMenuItem::separator(app)?;

    #[cfg(target_os = "macos")]
    let fullscreen = MenuItemBuilder::with_id("fullscreen", get_menu_text("Toggle Fullscreen", &locale))
        .accelerator("Ctrl+Cmd+F")
        .build(app)?;

    #[cfg(not(target_os = "macos"))]
    let fullscreen = MenuItemBuilder::with_id("fullscreen", get_menu_text("Toggle Fullscreen", &locale))
        .accelerator("F11")
        .build(app)?;

    let view_menu = SubmenuBuilder::new(app, get_menu_text("View", &locale))
        .items(&[
            &toggle_sidebar,
            &separator,
            &zoom_in,
            &zoom_out,
            &reset_zoom,
            &separator2,
            &fullscreen,
        ])
        .build()?;

    Ok(view_menu)
}


fn create_preferences_menu<R: Runtime>(
    app: &AppHandle<R>,
) -> Result<Submenu<R>, Box<dyn std::error::Error>> {
    let locale = get_current_locale(app);
    let ai_settings = MenuItemBuilder::with_id("ai_settings", get_menu_text("AI Settings", &locale))
        .build(app)?;

    let preferences_menu = SubmenuBuilder::new(app, get_menu_text("Preferences", &locale))
        .items(&[&ai_settings])
        .build()?;

    Ok(preferences_menu)
}

fn create_window_menu<R: Runtime>(
    app: &AppHandle<R>,
) -> Result<Submenu<R>, Box<dyn std::error::Error>> {
    let locale = get_current_locale(app);
    #[cfg(target_os = "macos")]
    let minimize = PredefinedMenuItem::minimize(app, None)?;

    #[cfg(not(target_os = "macos"))]
    let minimize = MenuItemBuilder::with_id("minimize", get_menu_text("Minimize", &locale))
        .accelerator("CmdOrCtrl+M")
        .build(app)?;

    #[cfg(target_os = "macos")]
    let close_window = PredefinedMenuItem::close_window(app, None)?;

    #[cfg(not(target_os = "macos"))]
    let close_window = MenuItemBuilder::with_id("close_window", get_menu_text("Close Window", &locale))
        .accelerator("CmdOrCtrl+W")
        .build(app)?;

    let window_menu = SubmenuBuilder::new(app, get_menu_text("Window", &locale))
        .items(&[&minimize, &close_window])
        .build()?;

    Ok(window_menu)
}

fn create_help_menu<R: Runtime>(
    app: &AppHandle<R>,
) -> Result<Submenu<R>, Box<dyn std::error::Error>> {
    let locale = get_current_locale(app);
    let keyboard_shortcuts =
        MenuItemBuilder::with_id("keyboard_shortcuts", get_menu_text("Keyboard Shortcuts", &locale)).build(app)?;

    let separator = PredefinedMenuItem::separator(app)?;

    let about = PredefinedMenuItem::about(
        app,
        Some(get_menu_text("About ExcaliApp", &locale)),
        Some(
            AboutMetadataBuilder::new()
                .version(Some(env!("CARGO_PKG_VERSION").to_string()))
                .authors(Some(vec!["ExcaliApp Team".to_string()]))
                .comments(Some(
                    "A native Excalidraw desktop application built with Tauri".to_string(),
                ))
                .build(),
        ),
    )?;

    let help_menu = SubmenuBuilder::new(app, get_menu_text("Help", &locale))
        .items(&[&keyboard_shortcuts, &separator, &about])
        .build()?;

    Ok(help_menu)
}

pub fn update_recent_directories_menu<R: Runtime>(
    app: &AppHandle<R>,
    recent_dirs: Vec<String>,
) -> Result<(), Box<dyn std::error::Error>> {
    // Get the main window
    let window = app.get_webview_window("main").ok_or("No main window")?;

    // Get the menu
    if let Some(menu) = window.menu() {
        // Find the recent directories submenu
        if let Some(recent_menu) = menu.get("recent_directories") {
            if let Some(submenu) = recent_menu.as_submenu() {
                // Clear existing items
                let items = submenu.items()?;
                for item in items {
                    submenu.remove(&item)?;
                }

                // Add new items
                for (index, dir) in recent_dirs.iter().enumerate().take(10) {
                    let shortened_path = shorten_path(dir, 50);
                    let item =
                        MenuItemBuilder::with_id(format!("recent_dir_{}", index), shortened_path)
                            .build(app)?;
                    submenu.append(&item)?;
                }

                // Add separator and clear item if there are recent directories
                if !recent_dirs.is_empty() {
                    let separator = PredefinedMenuItem::separator(app)?;
                    submenu.append(&separator)?;

                    let clear_item =
                        MenuItemBuilder::with_id("clear_recent", "Clear Recent").build(app)?;
                    submenu.append(&clear_item)?;
                }
            }
        }
    }

    Ok(())
}

fn shorten_path(path: &str, max_len: usize) -> String {
    if path.len() <= max_len {
        return path.to_string();
    }

    let components: Vec<&str> = path.split(std::path::MAIN_SEPARATOR).collect();
    if components.len() <= 3 {
        return format!("...{}", &path[path.len() - max_len + 3..]);
    }

    let first = components[0];
    let last_two = &components[components.len() - 2..];
    let shortened = format!(
        "{}{}...{}{}",
        first,
        std::path::MAIN_SEPARATOR,
        std::path::MAIN_SEPARATOR,
        last_two.join(std::path::MAIN_SEPARATOR_STR)
    );

    if shortened.len() > max_len {
        format!("...{}", &path[path.len() - max_len + 3..])
    } else {
        shortened
    }
}

pub fn setup_menu_event_handler<R: Runtime>(app: &AppHandle<R>) {
    let app_handle = app.clone();

    app.on_menu_event(move |_app, event| {
        let menu_id = event.id.as_ref();

        // Emit menu command to frontend
        let command = MenuCommand {
            command: menu_id.to_string(),
            data: None,
        };

        if menu_id.starts_with("recent_dir_") {
            // Extract the index and get the directory path
            if let Some(_state) = app_handle.try_state::<AppState>() {
                // Get preferences to access recent directories
                let app_handle_clone = app_handle.clone();
                let menu_id_clone = menu_id.to_string();
                let command_clone = command.clone();

                tauri::async_runtime::spawn(async move {
                    // Get preferences from store directly
                    use tauri_plugin_store::StoreExt;
                    if let Ok(store) = app_handle_clone.store("preferences.json") {
                        if let Some(value) = store.get("preferences") {
                            if let Ok(prefs) =
                                serde_json::from_value::<crate::Preferences>(value.clone())
                            {
                                if let Some(index_str) = menu_id_clone.strip_prefix("recent_dir_") {
                                    if let Ok(index) = index_str.parse::<usize>() {
                                        if let Some(dir) = prefs.recent_directories.get(index) {
                                            let mut command = command_clone;
                                            command.data =
                                                Some(serde_json::json!({ "directory": dir }));
                                            let _ = app_handle_clone.emit("menu-command", command);
                                        }
                                    }
                                }
                            }
                        }
                    }
                });
            }
        } else {
            let _ = app_handle.emit("menu-command", command);
        }
    });
}

#[allow(dead_code)]
pub fn update_menu_item_state<R: Runtime>(
    app: &AppHandle<R>,
    item_id: &str,
    enabled: bool,
) -> Result<(), Box<dyn std::error::Error>> {
    let window = app.get_webview_window("main").ok_or("No main window")?;

    if let Some(menu) = window.menu() {
        if let Some(item) = menu.get(item_id) {
            if let Some(menu_item) = item.as_menuitem() {
                menu_item.set_enabled(enabled)?;
            }
        }
    }

    Ok(())
}
