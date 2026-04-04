# PlanTap

基于 TypeScript + Vite + React + Electron 构建的 Notion 风格项目管理桌面应用。

## 功能特点

- **简单易用**：简洁、最小化的界面，专注于核心项目管理功能
- **层级结构**：项目 → 阶段 → 任务，清晰有序的项目管理
- **多种视图**：支持列表视图和甘特图视图自由切换
- **本地数据存储**：所有数据存储在本地 SQLite 数据库，无需云端依赖，保护隐私
- **导入导出**：支持 JSON 和 Excel 格式，方便数据备份和分享
- **回收站**：软删除机制，误删的项目可在 30 天内恢复，超时自动清除
- **智能通知**：应用内通知、邮件通知（SMTP）、钉钉 Webhook 通知
- **AI 助手**：内置 AI 对话，支持项目进度分析、风险识别、钉钉通知起草
- **视觉 AI**：上传图片进行 AI 分析，自动提取项目信息创建或更新项目
- **主题切换**：支持浅色、深色和跟随系统主题
- **多语言**：支持中文、英文、法语和日语
- **跨平台桌面**：基于 Electron 运行，支持 macOS 和 Windows

## 技术栈

- **桌面端**：Electron 28
- **构建工具**：Vite
- **开发语言**：TypeScript
- **UI 框架**：React 18+
- **样式**：Tailwind CSS v3
- **数据库**：SQLite (better-sqlite3)，存储在用户数据目录
- **图标**：Font Awesome 6
- **状态管理**：Zustand (通过 IPC 与 SQLite 同步)
- **国际化**：i18next

## 快速开始

### 环境要求

- Node.js 18+
- pnpm

### 安装

```bash
pnpm install
```

### 开发

```bash
# 启动 Web 开发服务器
pnpm dev

# 启动 Electron 桌面应用（开发模式）
pnpm dev:electron
```

### 构建

```bash
# Web 生产构建
pnpm build

# 构建并打包 Electron 应用
pnpm dist
```

## 项目结构

```
src/
  components/      # React UI 组件
  stores/          # Zustand 状态管理
  types/           # TypeScript 类型定义
  i18n/            # 国际化 (en, zh, fr, ja)
electron/
  main.cjs         # Electron 主进程、SQLite、IPC 处理器
  preload.cjs      # 渲染进程的 IPC 桥接
public/
  icon.icns        # 应用图标 (macOS)
```

## 数据模型

```typescript
interface Project {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  progress: number;
  deletedAt?: string;  // 软删除时间戳
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

## AI 助手

内置 AI 助手可以帮你：

- 分析项目进度和统计数据
- 识别项目风险和逾期任务
- 生成任务计划建议
- 起草和发送钉钉通知
- **视觉 AI**：分析上传的图片，提取项目信息，自动创建或更新项目

AI 配置存储在本地，API 密钥不会暴露给外部服务。

## 通知系统

三种通知方式：

1. **应用内通知**：显示在应用顶部的通知铃铛图标下拉菜单中
2. **邮件通知**：基于 SMTP 的邮件通知（目前输出到控制台）
3. **钉钉通知**：基于 Webhook 的钉钉机器人通知，支持 HMAC-SHA256 签名验证

## 开源协议

MIT License

版权所有 (c) 2024 PlanTap

特此向任何获得本软件和相关文档副本的人免费授予不受限制处理本软件的权利，
包括但不限于使用、复制、修改、合并、发布、分发、再许可和/或出售本软件副本的权利，
并允许获得本软件的人这样做，但须满足以下条件：

上述版权声明和本许可声明应包含在本软件的所有副本或主要部分中。

本软件按"原样"提供，不提供任何明示或暗示的保证，包括但不限于对适销性、
特定用途适用性和非侵权性的保证。在任何情况下，作者或版权持有人均不对任何索赔、
损害或其他责任承担责任，无论是在合同诉讼、侵权诉讼或其他诉讼中，
还是与本软件或使用或其他与本软件相关的交易相关。
