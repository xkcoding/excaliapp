use std::path::{Path, PathBuf};

/// Validates that a path is safe to access (no path traversal attacks)
pub fn validate_path(path: &Path, allowed_base: Option<&Path>) -> Result<PathBuf, String> {
    // First check the original path for suspicious patterns before canonicalization
    let path_str = path.to_string_lossy();
    
    // Check for path traversal attempts in the original path
    if path_str.contains("..") || path_str.contains("~") {
        // Allow these patterns only if they're part of a valid canonicalized path
        // We'll check after canonicalization if this is actually a traversal attempt
    }
    
    // Canonicalize the path to resolve symlinks and relative components
    let canonical_path = match path.canonicalize() {
        Ok(canonical) => canonical,
        Err(_) => {
            // If canonicalization fails, check if it's a relative path that might be valid
            if path.is_relative() {
                // For relative paths, check if they contain suspicious patterns
                if path_str.contains("..") || path_str.contains("~") {
                    return Err("Path contains suspicious patterns".to_string());
                }
                // Return the path as-is for relative paths
                return Ok(path.to_path_buf());
            } else {
                return Err("Failed to canonicalize path".to_string());
            }
        }
    };
    
    // If an allowed base directory is specified, ensure the path is within it
    if let Some(base) = allowed_base {
        let canonical_base = match base.canonicalize() {
            Ok(canonical) => canonical,
            Err(_) => return Err("Failed to canonicalize base path".to_string()),
        };
        
        if !canonical_path.starts_with(&canonical_base) {
            return Err("Path traversal detected: path is outside allowed directory".to_string());
        }
    }
    
    // For absolute paths, additional security checks
    if canonical_path.is_absolute() {
        // Check if the canonicalized path contains suspicious patterns that might indicate traversal
        let canonical_str = canonical_path.to_string_lossy();
        
        // More sophisticated check: look for patterns that could indicate path traversal
        // Allow legitimate paths that happen to contain these characters in their names
        let components: Vec<String> = canonical_path.components()
            .map(|c| c.as_os_str().to_string_lossy().to_string())
            .collect();
        
        // Check if any component is suspicious
        for component in components {
            if component == ".." || component == "~" {
                return Err("Path contains suspicious patterns".to_string());
            }
        }
    }
    
    Ok(canonical_path)
}

/// Validates that a file has the expected .excalidraw extension
pub fn validate_excalidraw_file(path: &Path) -> Result<(), String> {
    match path.extension() {
        Some(ext) if ext == "excalidraw" => Ok(()),
        Some(ext) => Err(format!("Invalid file extension: expected .excalidraw, got .{}", ext.to_string_lossy())),
        None => Err("File has no extension".to_string()),
    }
}

/// Validates JSON content to ensure it's a valid Excalidraw file
pub fn validate_excalidraw_content(content: &str) -> Result<(), String> {
    let json: serde_json::Value = serde_json::from_str(content)
        .map_err(|e| format!("Invalid JSON: {}", e))?;
    
    // Check for required Excalidraw fields
    let obj = json.as_object()
        .ok_or("Content is not a JSON object")?;
    
    // Validate type field
    match obj.get("type") {
        Some(t) if t == "excalidraw" => {},
        Some(t) => return Err(format!("Invalid type field: expected 'excalidraw', got {:?}", t)),
        None => return Err("Missing required 'type' field".to_string()),
    }
    
    // Validate version field
    match obj.get("version") {
        Some(v) if v.is_number() => {},
        Some(_) => return Err("Version field must be a number".to_string()),
        None => return Err("Missing required 'version' field".to_string()),
    }
    
    // Validate elements field
    match obj.get("elements") {
        Some(e) if e.is_array() => {},
        Some(_) => return Err("Elements field must be an array".to_string()),
        None => return Err("Missing required 'elements' field".to_string()),
    }
    
    Ok(())
}

/// Safely joins a filename to a directory path
pub fn safe_path_join(base: &Path, file_name: &str) -> Result<PathBuf, String> {
    // Remove any path separators from the filename to prevent directory traversal
    let clean_name = file_name
        .replace('/', "_")
        .replace('\\', "_")
        .replace("..", "_");
    
    if clean_name.is_empty() {
        return Err("Invalid filename".to_string());
    }
    
    Ok(base.join(clean_name))
}