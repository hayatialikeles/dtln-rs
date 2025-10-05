use std::{env, process::Command};
use build_target::{Arch, Os};

fn main() {
    let target_arch = build_target::target_arch().unwrap();
    let target_os = build_target::target_os().unwrap();

    // Determine prebuilt archive based on OS and architecture
    let archive_name = match (target_os, target_arch) {
        (Os::Windows, Arch::X86_64) => Some("tflite-prebuilt.win.x64.tar.bz2"),
        (Os::Windows, Arch::AARCH64) => Some("tflite-prebuilt.win.arm64.tar.bz2"),
        (Os::MacOs, Arch::X86_64) => Some("tflite-prebuilt.osx.x64.tar.bz2"),
        (Os::MacOs, Arch::AARCH64) => Some("tflite-prebuilt.osx.arm64.tar.bz2"),
        (Os::Linux, Arch::X86_64) => Some("tflite-prebuilt.linux.x64.tar.bz2"),
        (Os::Linux, Arch::AARCH64) => Some("tflite-prebuilt.linux.arm64.tar.bz2"),
        (_, Arch::WASM32) => Some("tflite-prebuilt.wasm.tar.bz2"),
        _ => None,
    };

    // Try to extract prebuilt archive if available
    if let Some(archive) = archive_name {
        let archive_path = format!("./tflite/{}", archive);
        if std::path::Path::new(&archive_path).exists() {
            let extract_result = if cfg!(target_os = "windows") {
                // Use tar.exe on Windows (available in Windows 10+)
                Command::new("tar")
                    .arg("-xjf")
                    .arg(&archive_path)
                    .arg("-C")
                    .arg("./tflite/")
                    .status()
            } else {
                Command::new("tar")
                    .arg("-xjf")
                    .arg(&archive_path)
                    .arg("-C")
                    .arg("./tflite/")
                    .status()
            };

            if extract_result.is_err() {
                eprintln!("Warning: Failed to extract prebuilt TFLite, trying cmake...");
                build_with_cmake();
            }
        } else {
            eprintln!("Warning: Prebuilt archive not found at {}, trying cmake...", archive_path);
            build_with_cmake();
        }
    } else {
        eprintln!("Warning: No prebuilt available for this platform, using cmake...");
        build_with_cmake();
    }

    let root_dir = env::var("CARGO_MANIFEST_DIR").unwrap();
    println!("cargo:rustc-link-search=native={}/tflite/lib/", root_dir);

    // Link to all archives in lib directory
    if let Ok(entries) = std::fs::read_dir(std::format!("{}/tflite/lib", root_dir)) {
        for entry in entries.flatten() {
            let path = entry.path();
            let extension = path.extension();

            match extension {
                Some(ext) if ext == "a" || ext == "lib" => {
                    let lib_name = path.file_stem().unwrap().to_str().unwrap();
                    // Handle both lib prefix (Unix) and no prefix (Windows)
                    let lib_name = lib_name.strip_prefix("lib").unwrap_or(lib_name);

                    // Always use static linking for better portability
                    println!("cargo:rustc-link-lib=static={}", lib_name);
                }
                _ => {}
            }
        }
    }
}

fn build_with_cmake() {
    let cmake_result = Command::new("cmake")
        .current_dir("tflite")
        .arg(".")
        .arg("-DCMAKE_BUILD_TYPE=Release")
        .status();

    if cmake_result.is_err() {
        panic!("Failed to run cmake. Please ensure cmake is installed or provide prebuilt TFLite libraries.");
    }
}
