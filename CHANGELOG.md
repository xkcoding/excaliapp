# OwnExcaliDesk Changelog

## 🤖 v0.3.0 - AI Chart Generation & Intelligent Layout (2025-09-01)

### 🎨 Perfect Handwritten Font Rendering

**✍️ Excalidraw Handwriting Font Fix**
- Fixed missing font files causing system default font display
- Complete integration of Virgil, Cascadia, Assistant handwriting fonts
- Configured EXCALIDRAW_ASSET_PATH for self-hosted font loading
- Optimized CSP security policy for production font and WASM resources
- Consistent font display between development and production modes

### ✨ AI-Powered Chart Generation

**🧠 Text to Chart - Natural Language to Diagrams**
- Generate professional Mermaid charts from natural language descriptions
- Intelligent chart type recognition: flowcharts, sequence diagrams, class diagrams, state diagrams
- Real-time streaming code generation with live preview
- Editable Mermaid code with manual fine-tuning capabilities
- Comprehensive error handling and syntax validation

**⚙️ AI Configuration Management**
- Support for OpenAI, Azure, and custom API providers
- Secure API key storage and connection validation
- Intelligent token estimation and usage control
- Streaming and non-streaming generation modes

### 🎯 Auto Layout Intelligence System

**🔧 Professional elkjs Layout Engine**
- Integrated professional graph layout engine with 6 layout algorithms
- Intelligent pattern recognition: automatically detects chart types and selects optimal algorithms
- One-click optimization: MainMenu → Layout Tools → Auto Layout
- Support for complex diagrams: architecture, flowcharts, sequence, class, and network diagrams

**🧠 Smart Pattern Detection**
- Sequence diagrams: detects horizontal actors + vertical message flow → Layered algorithm
- Architecture diagrams: many boxes, few arrows, box/arrow ratio>3 → Box algorithm
- Business flows: decision nodes + linear flow → Layered algorithm  
- Class diagrams: inheritance hierarchy structure → MrTree algorithm
- Complex networks: connection density>2 → Stress algorithm
- General cases: no clear pattern → intelligent grid layout

### 🌐 Complete Internationalization

**🗣️ Multi-language Interface**
- Full Chinese/English interface support with 250+ translation key-value pairs
- Dynamic language switching with application restart mechanism
- Automatic system language detection with intelligent defaults
- AI prompt localization for generating native language charts

**🎛️ Tauri Main Menu Internationalization**
- Complete Rust-side menu dynamic language support
- Language switching moved from settings to main menu for quick access
- Chinese as default language, aligning with target user base

### 🛠️ Technical Architecture Overhaul

**📊 Intelligent Service Layer**
- `LayoutService.ts` (558 lines) complete intelligent layout analysis system
- `AIService.ts` (539 lines) enterprise-grade AI service integration
- `MermaidConverter.ts` professional chart conversion engine
- Complete TypeScript type system and error handling

**⚡ Performance & Stability Optimization**
- elkjs engine provides O(n log n) complexity, supports large-scale elements
- Streaming AI responses with real-time feedback
- Intelligent caching and error retry mechanisms
- Complete undo/redo support

---

### 🚀 What This Means for You

**For Creative Professionals:**
- Generate professional diagrams from text descriptions, dramatically boosting productivity
- One-click intelligent layout eliminates tedious manual positioning work
- Multi-language interface support adapts to different work environments

**For Professional Users:**
- Professional-grade layout algorithms based on elkjs, rivaling specialized diagramming software
- Support for complex diagram types meeting technical documentation needs
- Customizable AI services, flexibly adapting to enterprise environments

**For Everyone:**
- Zero learning curve intelligent features, automating tedious operations
- Complete Chinese interface for localized user experience
- Enterprise-level stability and error handling mechanisms

---

## 🎨 v0.2.0 - Enhanced Dialog Experience & File Management (2025-08-28)

### ✨ Major UI/UX Improvements

**🎯 Complete Custom Dialog System Overhaul**
- Replaced all native system dialogs with beautiful, consistent custom dialogs
- Unified design language across the entire application
- Smooth animations and modern styling that matches the app's aesthetic
- Enhanced visual hierarchy with proper spacing and typography

**⌨️ Perfected Keyboard Navigation**
- Fixed ESC key functionality across all dialog scenarios
- ESC now properly cancels operations (same as clicking X button)
- Improved keyboard accessibility for all user interactions
- Seamless navigation between dialogs and main interface

**🎛️ Smart Dialog Behavior**
- Clear distinction between "canceling" vs "choosing an option"
- X button and ESC key now truly cancel operations without side effects
- Click outside dialog area no longer triggers unintended actions
- Intelligent dialog state management prevents UI conflicts

### 🔧 Enhanced File Management

**📂 Powerful File Tree Operations**
- Drag and drop files within the directory tree for effortless organization
- Create new folders directly from the file tree interface
- Intuitive file management that feels natural and responsive
- Streamlined workspace organization tools

**💾 Intelligent "Don't Save" Logic**
- Fixed file status indicators (orange dots) properly clearing when abandoning changes
- Smart state management ensures UI reflects actual file status
- Cleaner workspace with accurate visual feedback
- No more confusing status indicators on abandoned files

**📁 Improved File Switching Experience**
- Smooth transitions between files with proper unsaved change handling
- Clear, informative dialogs for unsaved work with better messaging
- Enhanced user choice clarity with improved button labeling
- Streamlined workflow for managing multiple drawings

### 🎨 Visual Polish & Layout

**🎨 Professional Icon Design**
- Redesigned application icon with modern, clean aesthetics
- Enhanced brand identity with professional visual appeal
- Improved icon recognition across different platforms and sizes
- Cohesive visual language throughout the application

**📐 Optimized Interface Layout**
- Relocated sidebar toggle button to a more intuitive position (near canvas zoom controls)
- Improved dialog button spacing with better visual breathing room
- Enhanced content layout with proper line break handling
- More professional and polished overall appearance

**🌟 Better Content Presentation**
- Fixed multiline text rendering in dialog messages
- Improved visual hierarchy in confirmation dialogs
- Better contrast and readability across all UI elements
- Consistent spacing and alignment throughout the interface

### 🛠️ Technical Improvements

**⚡ Enhanced State Management**
- Robust dialog state synchronization between React Context and Zustand store
- Improved TypeScript type safety across dialog system
- Better error handling and fallback mechanisms
- Optimized event handling for better performance

**🔒 Improved Application Lifecycle**
- Enhanced app closing behavior with proper unsaved change detection
- Smart dialog chaining for complex user decisions
- Reliable state persistence during user interactions
- Better integration with Tauri's native capabilities

---

### 🚀 What This Means for You

**For Designers & Creative Professionals:**
- More intuitive file management that respects your creative workflow
- Crystal-clear feedback when switching between projects
- No more confusion about which files have unsaved changes
- Streamlined experience that keeps you focused on creating

**For Power Users:**
- Faster navigation with reliable keyboard shortcuts
- Predictable dialog behavior that matches your expectations
- Better integration with system-level operations
- More responsive and professional application feel

**For Everyone:**
- Cleaner, more modern interface that's a joy to use
- Consistent experience across all application functions
- Reduced cognitive load with clear, actionable dialogs
- Professional-grade desktop application experience

---

*OwnExcaliDesk continues to evolve as the premier local-first drawing tool for creative professionals. This release focuses on refining the user experience with thoughtful improvements based on real user feedback.*

**Download the latest version and experience the difference!** 🎨✨