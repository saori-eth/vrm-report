# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Common Commands

### Development
- `npm install` - Install dependencies
- `npm run dev` - Start development server with Vite
- `npm run build` - Build for production (TypeScript compilation + Vite build)
- `npm run preview` - Preview production build locally

### Project Structure
No linting or testing commands are configured. The project uses TypeScript with strict mode enabled.

## Architecture Overview

This is a client-side VRM (Virtual Reality Model) viewer and analyzer built with Three.js and the Pixiv three-vrm library. The application allows users to upload VRM files and provides detailed statistics about the model.

### Core Components

**main.ts** - Main Three.js scene setup and VRM loading logic
- Initializes Three.js scene with lighting, camera, and OrbitControls
- Handles progressive VRM loading with memory management and cleanup
- Extracts comprehensive VRM statistics (geometry, materials, textures, expressions, metadata)
- Manages animations and rendering loop with AnimationMixer support
- Contains detailed performance analysis (VRAM usage, draw calls, memory estimates)
- Implements animation system for T-pose, idle, and walk animations

**ui.ts** - User interface and interaction handling
- Manages drag-and-drop file upload (desktop) and file picker (mobile/tablet)
- Displays comprehensive VRM statistics in collapsible sections
- Provides interactive expression controls with sliders
- Includes texture preview with canvas rendering and download functionality
- Implements animation control buttons (T-Pose, Idle, Walk)
- Handles responsive design for different device types

**vrm.ts** - VRM animation utilities
- Contains Mixamo animation loading and retargeting for VRM models
- Provides bone mapping between Mixamo rigs and VRM humanoid bones
- Includes T-pose reset functionality for VRM models
- `loadAnim()` converts FBX animations to VRM-compatible format
- `resetVRM()` resets VRM to T-pose state using stored initial transforms
- `storeInitialVRMState()` captures initial bone transforms when VRM loads

### Key Dependencies
- **@pixiv/three-vrm** - VRM format support for Three.js
- **three** - 3D graphics library for WebGL rendering
- **vite** - Build tool and development server
- **@vercel/analytics** - Analytics integration

### File Upload & Processing
- Supports drag-and-drop on desktop, file picker on mobile
- 100MB file size limit enforced
- Progressive loading with chunked texture processing to prevent UI blocking
- Automatic memory cleanup for previous models

### VRM Statistics Extraction
The app provides detailed analysis including:
- Geometry stats (meshes, vertices, faces, bones)
- Rendering performance (draw calls, material/texture counts)
- Memory estimates (texture VRAM, geometry memory, total estimated VRAM)
- Expression system analysis with interactive controls
- Metadata and usage permissions parsing
- Texture preview and download functionality

### Development Notes
- Uses TypeScript with strict mode
- No testing framework configured
- Built for deployment as static site
- IndexedDB used for session persistence
- Responsive design supports desktop and mobile