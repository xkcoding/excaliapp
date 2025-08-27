#!/bin/bash

# OwnExcaliDesk 本地构建脚本
# 用于在本地环境测试跨平台构建

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 输出函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示使用帮助
show_help() {
    echo "OwnExcaliDesk 本地构建脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help          显示此帮助信息"
    echo "  -t, --target TARGET 指定构建目标 (默认: 当前平台)"
    echo "  -r, --release       发布模式构建"
    echo "  -c, --clean         清理构建缓存"
    echo "  -d, --dev           开发模式构建"
    echo "  --test-only         仅运行测试，不构建"
    echo "  --lint-only         仅运行 lint 检查"
    echo ""
    echo "支持的构建目标:"
    echo "  x86_64-pc-windows-msvc    (Windows x64)"
    echo "  aarch64-pc-windows-msvc   (Windows ARM64)"
    echo "  x86_64-apple-darwin       (macOS Intel)"
    echo "  aarch64-apple-darwin      (macOS Apple Silicon)"
    echo "  x86_64-unknown-linux-gnu  (Linux x64)"
    echo "  aarch64-unknown-linux-gnu (Linux ARM64)"
    echo ""
    echo "示例:"
    echo "  $0                                    # 构建当前平台"
    echo "  $0 -r                                 # 发布模式构建"
    echo "  $0 -t x86_64-pc-windows-msvc         # 构建 Windows x64"
    echo "  $0 --test-only                       # 仅运行测试"
    echo "  $0 --clean -r                        # 清理后发布构建"
}

# 检查依赖
check_dependencies() {
    log_info "检查依赖..."
    
    # 检查 Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js 未安装，请先安装 Node.js"
        exit 1
    fi
    
    # 检查 npm
    if ! command -v npm &> /dev/null; then
        log_error "npm 未安装，请先安装 npm"
        exit 1
    fi
    
    # 检查 Rust
    if ! command -v cargo &> /dev/null; then
        log_error "Rust 未安装，请先安装 Rust"
        log_info "安装命令: curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh"
        exit 1
    fi
    
    log_success "所有依赖检查通过"
}

# 安装依赖
install_dependencies() {
    log_info "安装依赖..."
    
    log_info "安装前端依赖..."
    npm ci
    
    log_success "依赖安装完成"
}

# 运行 lint 检查
run_lint() {
    log_info "运行 lint 检查..."
    
    # TypeScript 类型检查
    log_info "运行 TypeScript 类型检查..."
    npx tsc --noEmit
    
    # Rust 格式化检查
    log_info "运行 Rust 格式化检查..."
    cd src-tauri
    cargo fmt --all -- --check
    
    # Rust Clippy 检查
    log_info "运行 Rust Clippy 检查..."
    cargo clippy --all-targets --all-features -- -D warnings
    cd ..
    
    log_success "Lint 检查完成"
}

# 运行测试
run_tests() {
    log_info "运行测试..."
    
    # 前端测试
    log_info "运行前端测试..."
    npm test
    
    # Rust 测试
    log_info "运行 Rust 测试..."
    cd src-tauri
    cargo test --all
    cd ..
    
    log_success "测试完成"
}

# 清理构建缓存
clean_build() {
    log_info "清理构建缓存..."
    
    # 清理前端构建
    rm -rf dist
    rm -rf node_modules/.vite
    
    # 清理 Rust 构建
    cd src-tauri
    cargo clean
    cd ..
    
    log_success "构建缓存清理完成"
}

# 构建前端
build_frontend() {
    log_info "构建前端..."
    npm run build
    log_success "前端构建完成"
}

# 构建 Tauri 应用
build_tauri() {
    local target="$1"
    local mode="$2"
    
    log_info "构建 Tauri 应用..."
    
    if [[ -n "$target" ]]; then
        log_info "构建目标: $target"
        if [[ "$mode" == "dev" ]]; then
            npm run tauri build -- --target "$target" --debug
        else
            npm run tauri build -- --target "$target"
        fi
    else
        log_info "构建目标: 当前平台"
        if [[ "$mode" == "dev" ]]; then
            npm run tauri build -- --debug
        else
            npm run tauri build
        fi
    fi
    
    log_success "Tauri 应用构建完成"
}

# 获取当前平台的默认目标
get_default_target() {
    local os="$(uname -s)"
    local arch="$(uname -m)"
    
    case "$os" in
        Linux)
            case "$arch" in
                x86_64) echo "x86_64-unknown-linux-gnu" ;;
                aarch64|arm64) echo "aarch64-unknown-linux-gnu" ;;
                *) echo "unknown" ;;
            esac
            ;;
        Darwin)
            case "$arch" in
                x86_64) echo "x86_64-apple-darwin" ;;
                arm64) echo "aarch64-apple-darwin" ;;
                *) echo "unknown" ;;
            esac
            ;;
        CYGWIN*|MINGW*|MSYS*)
            case "$arch" in
                x86_64) echo "x86_64-pc-windows-msvc" ;;
                aarch64|arm64) echo "aarch64-pc-windows-msvc" ;;
                *) echo "unknown" ;;
            esac
            ;;
        *) echo "unknown" ;;
    esac
}

# 显示构建信息
show_build_info() {
    log_info "构建信息:"
    echo "  项目: OwnExcaliDesk"
    echo "  版本: $(node -p "require('./package.json').version")"
    echo "  Node.js: $(node --version)"
    echo "  npm: $(npm --version)"
    echo "  Rust: $(rustc --version)"
    echo "  Cargo: $(cargo --version)"
    echo ""
}

# 主函数
main() {
    local target=""
    local mode="release"
    local clean=false
    local test_only=false
    local lint_only=false
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            -t|--target)
                target="$2"
                shift 2
                ;;
            -r|--release)
                mode="release"
                shift
                ;;
            -d|--dev)
                mode="dev"
                shift
                ;;
            -c|--clean)
                clean=true
                shift
                ;;
            --test-only)
                test_only=true
                shift
                ;;
            --lint-only)
                lint_only=true
                shift
                ;;
            *)
                log_error "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 显示构建信息
    show_build_info
    
    # 检查依赖
    check_dependencies
    
    # 清理构建（如果需要）
    if [[ "$clean" == true ]]; then
        clean_build
    fi
    
    # 安装依赖
    install_dependencies
    
    # 仅运行 lint
    if [[ "$lint_only" == true ]]; then
        run_lint
        exit 0
    fi
    
    # 仅运行测试
    if [[ "$test_only" == true ]]; then
        run_tests
        exit 0
    fi
    
    # 运行 lint 和测试
    run_lint
    run_tests
    
    # 构建前端
    build_frontend
    
    # 构建 Tauri 应用
    if [[ -z "$target" ]]; then
        target="$(get_default_target)"
        if [[ "$target" == "unknown" ]]; then
            log_warning "无法识别当前平台，使用默认构建"
            target=""
        fi
    fi
    
    build_tauri "$target" "$mode"
    
    log_success "🎉 构建完成！"
    log_info "构建产物位置: src-tauri/target/*/release/bundle/"
}

# 运行主函数
main "$@"