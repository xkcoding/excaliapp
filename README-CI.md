# OwnExcaliDesk CI/CD 分支

这个分支专门用于配置 GitHub Actions 自动化构建和发布流程。

## 🚀 功能特性

### 自动化 CI/CD 流程
- ✅ **持续集成 (CI)**: 自动运行代码质量检查、测试和构建验证
- 📦 **跨平台发布**: 支持 Windows、macOS、Linux 的 x64 和 ARM64 架构
- 🔄 **自动发布**: 推送标签时自动创建 GitHub Release
- 🛡️ **安全检查**: 依赖漏洞扫描和代码安全审计

### 支持的平台和架构

| 平台 | x64 | ARM64 | 安装包格式 |
|------|-----|-------|-----------|
| **Windows** | ✅ | ✅ | MSI, NSIS Setup |
| **macOS** | ✅ | ✅ | DMG, APP |
| **Linux** | ✅ | ✅ | AppImage, DEB, RPM |

## 📋 工作流说明

### 1. 持续集成 (`.github/workflows/ci.yml`)

**触发条件:**
- 推送到 `master`, `main`, `develop`, `ci/*` 分支
- 创建 Pull Request

**检查内容:**
- 🔍 代码格式化和 Lint 检查
- 🧪 单元测试 (前端 + Rust)
- 🔨 构建测试 (跨平台)
- 🛡️ 安全审计
- 📦 依赖审查

### 2. 发布流程 (`.github/workflows/release.yml`)

**触发条件:**
- 推送标签 (格式: `v*.*.*`)
- 手动触发 (可指定版本号)

**构建产物:**
- Windows: `*.msi`, `*-setup.exe`, `*.exe`
- macOS: `*.dmg`, `*.app.tar.gz`
- Linux: `*.AppImage`, `*.deb`, `*.rpm`

## 🚀 使用方法

### 自动发布 Release

1. **准备发布**
   ```bash
   # 确保代码已提交并推送
   git add .
   git commit -m "准备发布 v1.0.0"
   git push origin ci/github-actions
   ```

2. **创建发布标签**
   ```bash
   # 创建版本标签
   git tag v1.0.0
   git push origin v1.0.0
   ```

3. **自动构建和发布**
   - GitHub Actions 会自动检测到标签推送
   - 开始跨平台构建流程
   - 构建完成后自动创建 GitHub Release
   - 上传所有平台的安装包

### 手动触发发布

1. 访问 GitHub Actions 页面
2. 选择 "发布跨平台构建" 工作流
3. 点击 "Run workflow"
4. 输入版本号 (如: v1.0.0)
5. 点击运行

### 检查 CI 状态

每次推送代码时，CI 会自动运行：
- ✅ 绿色: 所有检查通过
- ❌ 红色: 存在问题需要修复
- 🟡 黄色: 正在运行中

## ⚙️ 配置说明

### 环境变量和密钥

**可选配置 (用于应用签名):**
- `TAURI_SIGNING_PRIVATE_KEY`: Tauri 应用签名私钥
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`: 签名私钥密码

### 构建配置

**Tauri 配置更新:**
- 产品名称: `OwnExcaliDesk`
- 标识符: `com.xkcoding.ownexcalidesk`
- 构建命令: 使用 `npm` 而不是 `yarn`
- 窗口标题: `OwnExcaliDesk`

### 版本管理

**版本号格式:**
- 正式版: `v1.0.0`, `v2.1.3`
- 预发布: `v1.0.0-alpha.1`, `v2.0.0-beta.2`
- 开发版: `v0.1.0-dev.20231201`

## 🔧 开发指南

### 本地构建测试

```bash
# 安装依赖
npm ci

# 前端开发
npm run dev

# 构建前端
npm run build

# 构建 Tauri 应用
npm run tauri build

# 类型检查
npx tsc --noEmit

# 运行测试
npm test
```

### 跨平台构建准备

**Windows:**
```bash
# 安装 Visual Studio Build Tools
# 或通过 Chocolatey
choco install visualstudio2022buildtools --package-parameters "--add Microsoft.VisualStudio.Workload.VCTools"
```

**Linux:**
```bash
# Ubuntu/Debian
sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf libssl-dev pkg-config

# CentOS/RHEL
sudo yum install webkit2gtk4.0-devel libappindicator-gtk3-devel librsvg2-devel patchelf-devel openssl-devel
```

**macOS:**
```bash
# 安装 Xcode 命令行工具
xcode-select --install
```

## 📖 相关文档

- [Tauri 构建指南](https://tauri.app/v1/guides/building/)
- [GitHub Actions 文档](https://docs.github.com/en/actions)
- [跨平台 Rust 编译](https://rust-lang.github.io/rustup/cross-compilation.html)

## 🤝 贡献指南

1. Fork 该仓库
2. 创建 feature 分支: `git checkout -b feature/amazing-feature`
3. 提交更改: `git commit -m '添加某个功能'`
4. 推送分支: `git push origin feature/amazing-feature`
5. 创建 Pull Request

## 📄 许可证

该项目基于原始项目的许可证进行分发。

---

**注意**: 这个分支专注于 CI/CD 配置，不包含业务逻辑更改。如需修改应用功能，请在主分支进行开发。