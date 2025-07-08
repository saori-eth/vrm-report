# VRM Report

A serverless web application for viewing and analyzing VRM avatar files with detailed statistics.

## Features

- Drag-and-drop VRM file upload (desktop)
- File picker support (mobile/tablet)
- Real-time 3D preview with Three.js
- Comprehensive VRM statistics display
  - Geometry: mesh, vertex & face counts, rig/bone totals
  - Rendering resources: draw-calls, material & texture counts (with max texture size)
  - Memory footprint: disk size, texture + geometry VRAM estimates
  - Facial rig: expression list & total count
Metadata & licensing: author, version, usage and redistribution permissions
- Session persistence with IndexedDB
- Responsive design for all devices

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```