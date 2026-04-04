# PlanTap

A Notion-style project management desktop application, built with TypeScript + Vite + React + Electron.

## Features

- **Simple & Intuitive**: Clean, minimal interface focused on essential project management functionality
- **Hierarchical Structure**: Projects → Phases → Tasks for organized project management
- **Multiple Views**: Switch between List view and Gantt chart view
- **Local Data Storage**: All data stored locally in SQLite database - no cloud dependency, full privacy
- **Import/Export**: Support for JSON and Excel formats to easily backup and share project data
- **Smart Notifications**: In-app notifications, Email (SMTP), and DingTalk webhook support
- **Recycle Bin**: Soft delete with 30-day auto-purge for accidentally deleted projects
- **AI Assistant**: Built-in AI chat for project analysis, risk identification, and DingTalk notification drafting
- **Vision AI**: Upload images for AI analysis - extract project info and create/update projects automatically
- **Theme Support**: Light/Dark/System theme modes
- **Multi-language**: Support for English, Chinese, French, and Japanese
- **Cross-platform Desktop**: Runs as an Electron application on macOS and Windows

## Tech Stack

- **Desktop**: Electron 28
- **Build**: Vite
- **Language**: TypeScript
- **UI Framework**: React 18+
- **Styling**: Tailwind CSS v3
- **Database**: SQLite (better-sqlite3) - stored locally at user data path
- **Icons**: Font Awesome 6
- **State Management**: Zustand (synced with SQLite via IPC)
- **i18n**: i18next

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm

### Installation

```bash
pnpm install
```

### Development

```bash
# Start web development server
pnpm dev

# Start Electron desktop app (development mode)
pnpm dev:electron
```

### Build

```bash
# Web production build
pnpm build

# Build and package Electron app
pnpm dist
```

## Project Structure

```
src/
  components/      # React UI components
  stores/          # Zustand state management
  types/           # TypeScript interfaces
  i18n/            # Internationalization (en, zh, fr, ja)
electron/
  main.cjs         # Electron main process, SQLite, IPC handlers
  preload.cjs      # IPC bridge for renderer process
public/
  icon.icns        # App icon (macOS)
```

## Data Model

```typescript
interface Project {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  progress: number;
  deletedAt?: string;  // Soft delete timestamp
}

interface Phase {
  id: string;
  projectId: string;
  name: string;
  startDate: string;
  endDate: string;
  actualEndDate?: string;
  status: 'todo' | 'doing' | 'done';
}

interface Task {
  id: string;
  phaseId: string;
  name: string;
  assignee: string;
  plannedHours: number;
  actualHours: number;
  dueDate: string;
  status: 'todo' | 'doing' | 'done';
  priority: 'low' | 'medium' | 'high';
  tags: string[];
  notificationConfig: NotificationConfig;
}
```

## AI Assistant

The built-in AI assistant can help you:

- Analyze project progress and statistics
- Identify project risks and overdue tasks
- Generate task planning suggestions
- Draft and send DingTalk notifications
- **Vision AI**: Analyze uploaded images to extract project information and automatically create or update projects

AI configuration is stored locally and API keys are never exposed to external services.

## Notification System

Three notification methods:

1. **In-App**: Shows in the app header bell icon dropdown
2. **Email**: SMTP-based email notifications (console logging for now)
3. **DingTalk**: Webhook-based DingTalk robot notifications with HMAC-SHA256 signature support

## License

MIT License

Copyright (c) 2024 PlanTap

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
