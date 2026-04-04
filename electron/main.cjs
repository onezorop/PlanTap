const { app, BrowserWindow, ipcMain, Notification } = require('electron');
const path = require('path');
const fs = require('fs');

const https = require('https');
const http = require('http');
const crypto = require('crypto');

// Database is loaded lazily after app is ready
let db;
let mainWindow;
let notificationInterval = null;
let dbPath;

// Current schema version - increment this each time a migration is added
const CURRENT_SCHEMA_VERSION = 2;

// Notification state
let lastNotifiedTasks = new Map(); // taskId -> last notified time
let lastNotifiedPhases = new Map(); // phaseId -> last notified time

// Backup database before migration
function backupDatabase(dbPath) {
  const backupPath = `${dbPath}.backup`;
  try {
    fs.copyFileSync(dbPath, backupPath);
    console.log(`Database backed up to: ${backupPath}`);
    return backupPath;
  } catch (err) {
    console.error('Failed to backup database:', err);
    throw err;
  }
}

// Helper: Execute a query and get all results
function dbAll(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

// Helper: Execute a query and get one result
function dbGet(sql, params = []) {
  const stmt = db.prepare(sql);
  if (params.length > 0) stmt.bind(params);
  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
}

// Helper: Execute a statement (INSERT, UPDATE, DELETE)
function dbRun(sql, params = []) {
  db.run(sql, params);
  saveDatabase();
}

// Helper: Execute multiple SQL statements
function dbExec(sql) {
  db.exec(sql);
  saveDatabase();
}

// Save database to file
function saveDatabase() {
  if (db && dbPath) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
}

// Get current database version
function getDbVersion() {
  try {
    const row = dbGet('SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1');
    return row ? row.version : -1; // -1 means no migrations table yet
  } catch {
    return -1;
  }
}

// Set database version after migration
function setDbVersion(version) {
  dbRun('INSERT INTO schema_migrations (version, appliedAt) VALUES (?, ?)',
    [version, new Date().toISOString()]);
}

// Detect existing database version based on schema state
function detectExistingVersion() {
  try {
    // Check projects.deletedAt column (v2 feature)
    const projectColumns = dbAll("PRAGMA table_info(projects)");
    const hasDeletedAt = projectColumns.some(col => col.name === 'deletedAt');

    // Check tasks.notificationConfig column (v1 feature)
    const taskColumns = dbAll("PRAGMA table_info(tasks)");
    const hasNotificationConfig = taskColumns.some(col => col.name === 'notificationConfig');

    if (hasDeletedAt && hasNotificationConfig) return 2;
    if (hasNotificationConfig) return 1;
    return 0;
  } catch {
    return 0;
  }
}

// Run database migrations
function runMigrations(targetVersion) {
  console.log(`Running migrations from version ${getDbVersion()} to ${targetVersion}...`);

  // Migration v1: Add notificationConfig column to tasks
  if (getDbVersion() < 1) {
    const columns = dbAll("PRAGMA table_info(tasks)");
    const hasNotificationConfig = columns.some(col => col.name === 'notificationConfig');
    if (!hasNotificationConfig) {
      dbExec("ALTER TABLE tasks ADD COLUMN notificationConfig TEXT DEFAULT '{\"enabled\":false,\"advanceMinutes\":60,\"repeatIntervalMinutes\":0}'");
      console.log('Migration v1: Added notificationConfig column to tasks table');
    }
    setDbVersion(1);
  }

  // Migration v2: Add deletedAt column to projects
  if (getDbVersion() < 2) {
    const projectColumns = dbAll("PRAGMA table_info(projects)");
    const hasDeletedAt = projectColumns.some(col => col.name === 'deletedAt');
    if (!hasDeletedAt) {
      dbExec("ALTER TABLE projects ADD COLUMN deletedAt TEXT");
      console.log('Migration v2: Added deletedAt column to projects table');
    }
    setDbVersion(2);
  }

  console.log(`Migrations complete. Database is now at version ${getDbVersion()}`);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });


  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

async function initDatabase() {
  try {
    const initSqlJs = require('sql.js');
    const SQL = await initSqlJs();
    console.log('sql.js initialized');

    const userDataPath = app.getPath('userData');
    dbPath = path.join(userDataPath, 'plantap.db');

    console.log('Initializing database at:', dbPath);

    // Load existing database or create new one
    if (fs.existsSync(dbPath)) {
      console.log('Loading existing database...');
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
    } else {
      console.log('Creating new database...');
      db = new SQL.Database();
    }

    console.log('Database initialized successfully at:', dbPath);

    dbExec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        appliedAt TEXT NOT NULL
      );
    `);

    // Step 2: Check current version
    let currentVersion = getDbVersion();

    // For databases without version tracking yet (-1), detect existing state first
    if (currentVersion === -1) {
      currentVersion = detectExistingVersion();
      console.log(`Detected existing database version: ${currentVersion}`);
      // Record the detected version as the baseline
      if (currentVersion > 0) {
        setDbVersion(currentVersion);
      }
    }

    // Step 3: Create all tables first (using IF NOT EXISTS so existing tables are preserved)
    dbExec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        startDate TEXT NOT NULL,
        endDate TEXT NOT NULL,
        progress INTEGER DEFAULT 0,
        deletedAt TEXT
      );

      CREATE TABLE IF NOT EXISTS phases (
        id TEXT PRIMARY KEY,
        projectId TEXT NOT NULL,
        name TEXT NOT NULL,
        startDate TEXT NOT NULL,
        endDate TEXT NOT NULL,
        actualEndDate TEXT,
        status TEXT DEFAULT 'todo',
        FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        phaseId TEXT NOT NULL,
        name TEXT NOT NULL,
        assignee TEXT NOT NULL,
        plannedHours REAL DEFAULT 0,
        actualHours REAL DEFAULT 0,
        dueDate TEXT NOT NULL,
        status TEXT DEFAULT 'todo',
        priority TEXT DEFAULT 'medium',
        tags TEXT DEFAULT '[]',
        notificationConfig TEXT DEFAULT '{"enabled":false,"advanceMinutes":60,"repeatIntervalMinutes":0}',
        FOREIGN KEY (phaseId) REFERENCES phases(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS notification_settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        settings TEXT DEFAULT '{"inApp":{"enabled":true},"system":{"enabled":true},"email":{"enabled":false,"smtpHost":"","smtpPort":587,"smtpUser":"","smtpPassword":"","fromEmail":""},"dingtalk":{"enabled":false,"webhookUrl":"","secret":""}}'
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        typeId TEXT NOT NULL,
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        read INTEGER DEFAULT 0,
        createdAt TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS ai_config (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        config TEXT DEFAULT '{"enabled":false,"provider":{"type":"openai","name":"OpenAI","model":"gpt-4o"}}'
      );

      CREATE TABLE IF NOT EXISTS ai_messages (
        id TEXT PRIMARY KEY,
        role TEXT NOT NULL,
        content TEXT NOT NULL,
        createdAt TEXT NOT NULL
      );
    `);

    // Step 4: If upgrade needed, backup before migrating (must be AFTER tables are created)
    if (currentVersion < CURRENT_SCHEMA_VERSION) {
      console.log(`Database upgrade needed: v${currentVersion} -> v${CURRENT_SCHEMA_VERSION}`);
      backupDatabase(dbPath);
      runMigrations(CURRENT_SCHEMA_VERSION);
    }

    // Step 5: Auto-delete projects that have been in recycle bin for more than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const expiredProjects = dbAll("SELECT id FROM projects WHERE deletedAt IS NOT NULL AND deletedAt < ?", [thirtyDaysAgo.toISOString()]);
    for (const project of expiredProjects) {
      dbRun('DELETE FROM tasks WHERE phaseId IN (SELECT id FROM phases WHERE projectId = ?)', [project.id]);
      dbRun('DELETE FROM phases WHERE projectId = ?', [project.id]);
      dbRun('DELETE FROM projects WHERE id = ?', [project.id]);
      console.log('Auto-deleted expired project:', project.id);
    }

    // Step 6: Ensure default rows exist
    dbRun("INSERT OR IGNORE INTO notification_settings (id, settings) VALUES (1, '{\"inApp\":{\"enabled\":true},\"system\":{\"enabled\":true},\"email\":{\"enabled\":false,\"smtpHost\":\"\",\"smtpPort\":587,\"smtpUser\":\"\",\"smtpPassword\":\"\",\"fromEmail\":\"\"},\"dingtalk\":{\"enabled\":false,\"webhookUrl\":\"\",\"secret\":\"\"}}')");
    dbRun("INSERT OR IGNORE INTO ai_config (id, config) VALUES (1, '{\"enabled\":false,\"provider\":{\"type\":\"openai\",\"name\":\"OpenAI\",\"model\":\"gpt-4o\"}}')");

    console.log('Database tables created');
  } catch (error) {
    console.error('Database initialization failed:', error);
    console.error('Error stack:', error.stack);
    throw error;
  }
}

// Get notification settings
function getNotificationSettings() {
  const row = dbGet('SELECT settings FROM notification_settings WHERE id = 1');
  return JSON.parse(row.settings);
}

// Check if should notify (considering repeat interval and database history)
function shouldNotify(type, typeId, lastNotifiedMap, repeatIntervalMinutes) {
  // Check in-memory map first
  if (lastNotifiedMap.has(typeId)) {
    if (repeatIntervalMinutes === 0) return false; // No repeat, only once per session
    const lastTime = lastNotifiedMap.get(typeId);
    const now = Date.now();
    if ((now - lastTime) < repeatIntervalMinutes * 60 * 1000) return false;
  }

  // Check database to avoid duplicate notifications after restart
  const existing = dbGet(
    "SELECT createdAt FROM notifications WHERE type = ? AND typeId = ? ORDER BY createdAt DESC LIMIT 1",
    [type, typeId]
  );

  if (existing) {
    const lastTime = new Date(existing.createdAt).getTime();
    const now = Date.now();
    if (repeatIntervalMinutes === 0) {
      // For non-repeating notifications, don't send again if already sent today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      if (lastTime >= todayStart.getTime()) return false;
    } else {
      if ((now - lastTime) < repeatIntervalMinutes * 60 * 1000) return false;
    }
  }

  return true;
}

// Send in-app notification
function sendInAppNotification(notification) {
  dbRun(`
    INSERT INTO notifications (id, type, typeId, title, message, read, createdAt)
    VALUES (?, ?, ?, ?, ?, 0, ?)
  `, [notification.id, notification.type, notification.typeId, notification.title, notification.message, notification.createdAt]);

  // Send to renderer if window exists
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('notification:new', notification);
  }

  // Also show desktop notification (native OS notification) if enabled
  const settings = getNotificationSettings();
  if (settings.system?.enabled && Notification.isSupported()) {
    new Notification({ title: notification.title, body: notification.message }).show();
  }
}

// Send DingTalk notification
function sendDingTalkNotification(webhookUrl, secret, title, message) {
  try {
    const postData = JSON.stringify({
      msgtype: 'text',
      text: {
        content: `【项目管理系统】\n${title}\n${message}`,
      },
    });

    const url = new URL(webhookUrl);

    // If secret is provided, add signature (加签模式)
    if (secret) {
      const timestamp = Date.now();
      const sign = crypto
        .createHmac('sha256', secret)
        .update(`${timestamp}\n${secret}`)
        .digest('base64');
      url.searchParams.set('sign', encodeURIComponent(sign));
      url.searchParams.set('timestamp', timestamp.toString());
    }
    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        console.log('DingTalk notification sent:', data);
      });
    });

    req.on('error', (e) => {
      console.error('DingTalk notification error:', e.message);
    });

    req.write(postData);
    req.end();
  } catch (e) {
    console.error('DingTalk error:', e.message);
  }
}

// Send Email notification (simple SMTP)
function sendEmailNotification(settings, title, message) {
  // Email sending would require a more complex SMTP implementation
  // For now, we'll log it - in production you'd use a library like nodemailer
  console.log('Email notification would be sent:', {
    to: settings.smtpUser,
    from: settings.fromEmail,
    subject: title,
    body: message,
  });
  // TODO: Implement actual email sending with nodemailer or similar
}

// Check and send notifications
function checkNotifications() {
  const settings = getNotificationSettings();
  const now = new Date();

  // Get all tasks that are not done
  const tasks = dbAll('SELECT * FROM tasks WHERE status != ?', ['done']);
  const phases = dbAll('SELECT p.*, pr.name as projectName FROM phases p LEFT JOIN projects pr ON p.projectId = pr.id WHERE p.status != ?', ['done']);

  // Check tasks
  for (const task of tasks) {
    const config = JSON.parse(task.notificationConfig || '{"enabled":false,"advanceMinutes":60,"repeatIntervalMinutes":0}');
    if (!config.enabled) continue;

    const dueDate = new Date(task.dueDate);
    const advanceTime = config.advanceMinutes * 60 * 1000;
    const triggerTime = dueDate.getTime() - advanceTime;

    if (now.getTime() >= triggerTime) {
      if (!shouldNotify('task', task.id, lastNotifiedTasks, config.repeatIntervalMinutes)) continue;

      const title = '任务截止提醒';
      const message = `任务 "${task.name}" 即将到期（${task.dueDate}）`;
      const notificationId = `task-${task.id}-${Date.now()}`;

      // Send via enabled channels
      if (settings.inApp.enabled) {
        sendInAppNotification({
          id: notificationId,
          type: 'task',
          typeId: task.id,
          title,
          message,
          createdAt: now.toISOString(),
        });
      }

      if (settings.dingtalk.enabled && settings.dingtalk.webhookUrl) {
        sendDingTalkNotification(settings.dingtalk.webhookUrl, settings.dingtalk.secret, title, message);
      }

      if (settings.email.enabled && settings.email.smtpHost) {
        sendEmailNotification(settings.email, title, message);
      }

      // Update last notified time
      lastNotifiedTasks.set(task.id, Date.now());
    }
  }

  // Check phases
  for (const phase of phases) {
    const dueDate = new Date(phase.endDate);
    // Use default 60 minutes advance if no config stored
    const advanceMinutes = 60;
    const advanceTime = advanceMinutes * 60 * 1000;
    const triggerTime = dueDate.getTime() - advanceTime;

    if (now.getTime() >= triggerTime) {
      if (!shouldNotify('phase', phase.id, lastNotifiedPhases, 0)) continue;

      const title = '阶段截止提醒';
      const message = `阶段 "${phase.name}" (项目: ${phase.projectName}) 即将到期（${phase.endDate}）`;
      const notificationId = `phase-${phase.id}-${Date.now()}`;

      if (settings.inApp.enabled) {
        sendInAppNotification({
          id: notificationId,
          type: 'phase',
          typeId: phase.id,
          title,
          message,
          createdAt: now.toISOString(),
        });
      }

      if (settings.dingtalk.enabled && settings.dingtalk.webhookUrl) {
        sendDingTalkNotification(settings.dingtalk.webhookUrl, settings.dingtalk.secret, title, message);
      }

      lastNotifiedPhases.set(phase.id, Date.now());
    }
  }
}

// Start notification checker
function startNotificationChecker() {
  if (notificationInterval) return;
  notificationInterval = setInterval(checkNotifications, 10000); // Check every 10 seconds (TEST MODE)
  console.log('Notification checker started');
}

// IPC Handlers for Projects
ipcMain.handle('db:projects:getAll', () => {
  return dbAll('SELECT * FROM projects WHERE deletedAt IS NULL ORDER BY startDate DESC');
});

// Batch query: get all data in one request (for fast startup)
ipcMain.handle('db:getAllData', () => {
  const projects = dbAll('SELECT * FROM projects WHERE deletedAt IS NULL ORDER BY startDate DESC');
  const phases = dbAll('SELECT * FROM phases ORDER BY startDate');
  const tasks = dbAll('SELECT * FROM tasks ORDER BY dueDate');

  // Parse JSON fields for tasks
  const parsedTasks = tasks.map(t => ({
    ...t,
    tags: JSON.parse(t.tags || '[]'),
    notificationConfig: JSON.parse(t.notificationConfig || '{"enabled":false,"advanceMinutes":60,"repeatIntervalMinutes":0}'),
  }));

  return { projects, phases, tasks: parsedTasks };
});

ipcMain.handle('db:projects:add', (_, project) => {
  dbRun(`
    INSERT INTO projects (id, name, startDate, endDate, progress, deletedAt)
    VALUES (?, ?, ?, ?, ?, NULL)
  `, [project.id, project.name, project.startDate, project.endDate, project.progress]);
  return project;
});

ipcMain.handle('db:projects:update', (_, id, updates) => {
  const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = Object.values(updates);
  dbRun(`UPDATE projects SET ${fields} WHERE id = ?`, [...values, id]);
  return { id, ...updates };
});

// Soft delete - move to recycle bin
ipcMain.handle('db:projects:softDelete', (_, id) => {
  const now = new Date().toISOString();
  dbRun('UPDATE projects SET deletedAt = ? WHERE id = ?', [now, id]);
  return true;
});

// Restore from recycle bin
ipcMain.handle('db:projects:restore', (_, id) => {
  dbRun('UPDATE projects SET deletedAt = NULL WHERE id = ?', [id]);
  return true;
});

// Permanently delete from recycle bin
ipcMain.handle('db:projects:permanentDelete', (_, id) => {
  const phases = dbAll('SELECT id FROM phases WHERE projectId = ?', [id]);
  phases.forEach(phase => {
    dbRun('DELETE FROM tasks WHERE phaseId = ?', [phase.id]);
  });
  dbRun('DELETE FROM phases WHERE projectId = ?', [id]);
  dbRun('DELETE FROM projects WHERE id = ?', [id]);
  return true;
});

// Get recycle bin projects
ipcMain.handle('db:projects:getRecycleBin', () => {
  return dbAll('SELECT * FROM projects WHERE deletedAt IS NOT NULL ORDER BY deletedAt DESC');
});

// Empty recycle bin (delete all)
ipcMain.handle('db:projects:emptyRecycleBin', () => {
  const deletedProjects = dbAll('SELECT id FROM projects WHERE deletedAt IS NOT NULL');
  for (const project of deletedProjects) {
    dbRun('DELETE FROM tasks WHERE phaseId IN (SELECT id FROM phases WHERE projectId = ?)', [project.id]);
    dbRun('DELETE FROM phases WHERE projectId = ?', [project.id]);
    dbRun('DELETE FROM projects WHERE id = ?', [project.id]);
  }
  return true;
});

// Legacy hard delete (for backwards compatibility, now does soft delete)
ipcMain.handle('db:projects:delete', (_, id) => {
  const now = new Date().toISOString();
  dbRun('UPDATE projects SET deletedAt = ? WHERE id = ?', [now, id]);
  return true;
});

// IPC Handlers for Phases
ipcMain.handle('db:phases:getByProject', (_, projectId) => {
  return dbAll('SELECT * FROM phases WHERE projectId = ? ORDER BY startDate', [projectId]);
});

ipcMain.handle('db:phases:add', (_, phase) => {
  dbRun(`
    INSERT INTO phases (id, projectId, name, startDate, endDate, actualEndDate, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [phase.id, phase.projectId, phase.name, phase.startDate, phase.endDate, phase.actualEndDate || null, phase.status]);
  return phase;
});

ipcMain.handle('db:phases:update', (_, id, updates) => {
  const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
  const values = Object.values(updates);
  dbRun(`UPDATE phases SET ${fields} WHERE id = ?`, [...values, id]);
  return { id, ...updates };
});

ipcMain.handle('db:phases:delete', (_, id) => {
  dbRun('DELETE FROM tasks WHERE phaseId = ?', [id]);
  dbRun('DELETE FROM phases WHERE id = ?', [id]);
  return true;
});

// IPC Handlers for Tasks
ipcMain.handle('db:tasks:getByPhase', (_, phaseId) => {
  const tasks = dbAll('SELECT * FROM tasks WHERE phaseId = ? ORDER BY dueDate', [phaseId]);
  return tasks.map(t => ({
    ...t,
    tags: JSON.parse(t.tags || '[]'),
    notificationConfig: JSON.parse(t.notificationConfig || '{"enabled":false,"advanceMinutes":60,"repeatIntervalMinutes":0}'),
  }));
});

ipcMain.handle('db:tasks:add', (_, task) => {
  const notificationConfig = JSON.stringify(task.notificationConfig || { enabled: false, advanceMinutes: 60, repeatIntervalMinutes: 0 });
  dbRun(`
    INSERT INTO tasks (id, phaseId, name, assignee, plannedHours, actualHours, dueDate, status, priority, tags, notificationConfig)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    task.id, task.phaseId, task.name, task.assignee,
    task.plannedHours, task.actualHours, task.dueDate,
    task.status, task.priority, JSON.stringify(task.tags || []), notificationConfig
  ]);
  return task;
});

ipcMain.handle('db:tasks:update', (_, id, updates) => {
  const finalUpdates = { ...updates };
  if (finalUpdates.tags) {
    finalUpdates.tags = JSON.stringify(finalUpdates.tags);
  }
  if (finalUpdates.notificationConfig) {
    finalUpdates.notificationConfig = JSON.stringify(finalUpdates.notificationConfig);
  }
  const fields = Object.keys(finalUpdates).map(k => `${k} = ?`).join(', ');
  const values = Object.values(finalUpdates);
  dbRun(`UPDATE tasks SET ${fields} WHERE id = ?`, [...values, id]);
  return { id, ...updates };
});

ipcMain.handle('db:tasks:delete', (_, id) => {
  dbRun('DELETE FROM tasks WHERE id = ?', [id]);
  return true;
});

// IPC Handlers for Notification Settings
ipcMain.handle('notification:settings:get', () => {
  return getNotificationSettings();
});

ipcMain.handle('notification:settings:update', (_, settings) => {
  dbRun('UPDATE notification_settings SET settings = ? WHERE id = 1', [JSON.stringify(settings)]);
  return settings;
});

// IPC Handlers for In-App Notifications
ipcMain.handle('notification:inapp:getAll', () => {
  return dbAll('SELECT * FROM notifications ORDER BY createdAt DESC LIMIT 50');
});

ipcMain.handle('notification:inapp:markRead', (_, id) => {
  dbRun('UPDATE notifications SET read = 1 WHERE id = ?', [id]);
  return true;
});

ipcMain.handle('notification:inapp:markAllRead', () => {
  dbRun('UPDATE notifications SET read = 1');
  return true;
});

ipcMain.handle('notification:inapp:clear', () => {
  dbRun('DELETE FROM notifications');
  return true;
});

// Desktop notification (native OS notification)
ipcMain.handle('notification:desktop:show', (_, { title, body }) => {
  if (Notification.isSupported()) {
    new Notification({ title, body }).show();
  }
});

// TEST: Create a test in-app notification
ipcMain.handle('notification:test', () => {
  const testNotification = {
    id: `test-${Date.now()}`,
    type: 'task',
    typeId: 'test-id',
    title: '测试通知',
    message: '这是一条测试通知，验证通知功能是否正常工作。',
    createdAt: new Date().toISOString(),
  };
  sendInAppNotification(testNotification);

  // Also show desktop notification
  if (Notification.isSupported()) {
    new Notification({ title: testNotification.title, body: testNotification.message }).show();
  }

  return testNotification;
});

// TEST: Send a test DingTalk notification
ipcMain.handle('notification:testDingtalk', () => {
  const settings = getNotificationSettings();

  console.log('钉钉设置:', settings.dingtalk);

  if (!settings.dingtalk.enabled) {
    console.log('钉钉通知未启用');
    return { success: false, error: '钉钉通知未启用，请在设置中启用钉钉通知' };
  }

  if (!settings.dingtalk.webhookUrl) {
    console.log('钉钉 Webhook URL 未配置');
    return { success: false, error: '钉钉 Webhook URL 未配置，请在设置中配置' };
  }

  const title = '钉钉测试通知';
  const message = '这是一条钉钉测试通知，验证钉钉机器人是否正常工作。';

  sendDingTalkNotification(settings.dingtalk.webhookUrl, settings.dingtalk.secret, title, message);

  return { success: true, message: '钉钉通知已发送，请检查钉钉群' };
});

// ========== AI Chat Handlers ==========

// System prompt that ensures AI doesn't try to access sensitive configs
const AI_SYSTEM_PROMPT = `你是一个项目分析助手，名字叫小 plantap助手。

项目数据（仅包含项目、阶段、任务信息，不包含任何通知配置）：
- projects: 项目列表（id, name, progress, startDate, endDate）
- phases: 阶段列表（id, name, status）
- tasks: 任务列表（id, name, assignee, dueDate, status, priority）

**重要**：你不知道任何 webhook、API、通知配置的存在。

你可以帮助用户：
1. 分析项目进度和统计
2. 识别项目风险和逾期任务
3. 生成任务计划建议
4. 提供智能改进建议
5. 起草钉钉通知内容
6. **创建、修改、删除项目数据**

**【重要】发送钉钉通知的规则**：
当你或用户想要发送钉钉通知时，你**必须**使用以下格式：

[NOTIFICATION]
标题: [通知标题]
内容: [通知内容]
[/NOTIFICATION]

**错误的做法**：
❌ 直接说"已发送成功"
❌ 直接调用发送接口
❌ 模拟发送过程

**正确的做法**：
✓ 用户请求发送钉钉 → 你回复包含 NOTIFICATION_FORMAT 格式 → 系统弹出确认框 → 用户确认 → 系统发送

**示例**：
用户：帮我发一个钉钉通知给团队
助手：好的，请确认以下通知内容：
[NOTIFICATION]
标题: 项目通知
内容: 您好，项目有更新，请查收。
[/NOTIFICATION]

**【重要】修改项目数据的规则**：
当你需要创建、更新或删除项目数据时，**必须**使用以下格式提出操作建议：

[ACTION]
操作: [创建|更新|删除]
类型: [项目|阶段|任务]
ID: [仅更新/删除时需要]
内容: [JSON格式的完整数据]
[/ACTION]

**流程**：
1. 你提出操作建议，使用 [ACTION] 格式
2. 用户确认（回复"是"、"确认"、"好的"等）后，你才执行
3. 执行成功后告知用户结果

**创建项目示例**：
用户：帮我创建一个项目叫测试项目
助手：好的，请确认以下信息：
- 项目名称：测试项目
- 开始日期：今天
- 结束日期：一个月后

[ACTION]
操作: 创建
类型: 项目
内容: {"name":"测试项目","startDate":"${new Date().toISOString().split('T')[0]}","endDate":"${new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]}","progress":0}
[/ACTION]

用户：是
助手：执行操作中...
项目"测试项目"已创建成功！

用户：好的
助手：执行操作中...

**更新任务示例**：
用户：把测试任务的status改成done
助手：[找到对应任务后]
[ACTION]
操作: 更新
类型: 任务
ID: task-xxx
内容: {"status":"done"}
[/ACTION]

用户：确认
助手：执行操作中...
任务状态已更新为"已完成"！

**删除项目示例**：
用户：删除测试项目
助手：[找到项目]
[ACTION]
操作: 删除
类型: 项目
ID: project-xxx
[/ACTION]

用户：是
助手：执行操作中...
项目"测试项目"已移动到回收站（30天后自动删除）。

**注意**：
- 你只能通过 [ACTION] 格式提出操作建议，由系统代为执行
- 删除操作是软删除，项目会进入回收站
- 创建和更新需要用户提供必要的信息

**【重要】图片分析功能**：
当用户发送图片时，请分析图片内容：
- 如果图片包含项目相关信息（如项目计划、任务列表、进度表等），提取信息并询问用户是否要创建或更新项目数据
- 如果用户确认，使用 [ACTION] 格式提出操作建议
- 如果图片不包含项目相关信息，请告知用户图片内容并询问需要什么帮助

**图片分析示例**：
用户：[发送了一张项目计划截图]
助手：我看到这张图片是一个项目计划，包含以下信息：
- 项目名称：XXX
- 开始日期：2026-04-01
- 结束日期：2026-04-30
- 阶段：需求分析、开发、测试

是否需要我帮您创建这个项目？

用户：是的
助手：[ACTION]
操作: 创建
类型: 项目
内容: {"name":"XXX","startDate":"2026-04-01","endDate":"2026-04-30","progress":0}
[/ACTION]`;

// Get AI config from database
function getAIConfig() {
  const row = dbGet('SELECT config FROM ai_config WHERE id = 1');
  return JSON.parse(row.config);
}

// Call LLM API (OpenAI compatible)
async function callLLM(provider, messages, images = []) {
  const { type, apiKey, baseUrl, model } = provider;

  let endpoint = '';
  let headers = {};
  let body = {};

  // Check if model supports vision
  const visionModels = ['gpt-4o', 'gpt-4-turbo', 'gpt-4-vision-preview', 'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku', 'claude-3.5-sonnet', 'claude-3.5-haiku'];
  const supportsVision = visionModels.some(m => model.toLowerCase().includes(m));

  if (type === 'openai' || type === 'custom') {
    endpoint = (baseUrl || 'https://api.openai.com/v1') + '/chat/completions';
    headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    };

    // Format messages with images if supported
    const formattedMessages = messages.map(msg => {
      if (msg.role === 'user' && images.length > 0 && supportsVision) {
        const content = [{ type: 'text', text: msg.content }];
        images.forEach(img => {
          content.push({
            type: 'image_url',
            image_url: { url: img, detail: 'low' },
          });
        });
        return { role: msg.role, content };
      }
      return msg;
    });

    body = {
      model: model,
      messages: formattedMessages,
      temperature: 0.7,
    };
  } else if (type === 'claude') {
    endpoint = (baseUrl || 'https://api.anthropic.com/v1') + '/messages';
    headers = {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    };

    // Claude supports vision with base64 images
    const formattedMessages = messages.filter(m => m.role !== 'system').map(msg => {
      if (msg.role === 'user' && images.length > 0) {
        const content = [{ type: 'text', text: msg.content }];
        images.forEach(img => {
          // Extract base64 data from data URL
          const base64Data = img.split(',')[1];
          const mediaType = img.split(';')[0].split('/')[1];
          content.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: `image/${mediaType}`,
              data: base64Data,
            },
          });
        });
        return { role: msg.role, content };
      }
      return msg;
    });

    body = {
      model: model,
      max_tokens: 1024,
      messages: formattedMessages,
      system: messages.find(m => m.role === 'system')?.content || AI_SYSTEM_PROMPT,
    };
  } else if (type === 'ollama') {
    endpoint = (baseUrl || 'http://localhost:11434') + '/api/chat';
    headers = {
      'Content-Type': 'application/json',
    };

    // Ollama vision support varies by model
    const formattedMessages = messages.map(msg => {
      if (msg.role === 'user' && images.length > 0) {
        // For Ollama with vision, include images in the message
        return {
          role: msg.role,
          content: msg.content,
          images: images.map(img => img.split(',')[1]), // Send base64 data
        };
      }
      return msg;
    });

    body = {
      model: model,
      messages: formattedMessages,
      stream: false,
    };
  }

  return new Promise((resolve, reject) => {
    const url = new URL(endpoint);
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: 'POST',
      headers: headers,
    };

    const req = (url.protocol === 'https:' ? https : http).request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 200 && res.statusCode < 300) {
            if (type === 'claude') {
              resolve(parsed.content[0].text);
            } else if (type === 'ollama') {
              resolve(parsed.message.content);
            } else {
              resolve(parsed.choices[0].message.content);
            }
          } else {
            reject(new Error(parsed.error?.message || `API error: ${res.statusCode}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(body));
    req.end();
  });
}

// IPC: AI Chat
ipcMain.handle('ai:chat', async (_, { messages, projectContext, images }) => {
  const config = getAIConfig();

  if (!config.enabled || !config.provider.apiKey) {
    return JSON.stringify({ type: 'text', content: 'AI功能未启用或未配置API密钥，请先在设置中配置AI。' });
  }

  try {
    // Build messages with system prompt and project context
    const systemMessage = {
      role: 'system',
      content: AI_SYSTEM_PROMPT + '\n\n项目数据上下文：\n' + JSON.stringify(projectContext, null, 2),
    };

    const allMessages = [systemMessage, ...messages];

    const response = await callLLM(config.provider, allMessages, images || []);

    console.log('AI Response:', response);

    // Parse notification format from response
    const notificationMatch = response.match(/\[NOTIFICATION\]\s*\n([\s\S]*?)\n\[\/NOTIFICATION\]/);

    if (notificationMatch) {
      const notificationContent = notificationMatch[1];
      const titleMatch = notificationContent.match(/标题:\s*(.+)/);
      const contentMatch = notificationContent.match(/内容:\s*(.+)/);

      const notification = {
        title: titleMatch ? titleMatch[1].trim() : '项目通知',
        content: contentMatch ? contentMatch[1].trim() : notificationContent.trim(),
      };

      // Clean response by removing notification blocks
      const cleanResponse = response.replace(/\[NOTIFICATION\]\s*\n[\s\S]*?\n\[\/NOTIFICATION\]/g, '').trim();

      return JSON.stringify({
        type: 'text_with_notification',
        content: cleanResponse,
        notification: notification,
      });
    }

    return JSON.stringify({ type: 'text', content: response });
  } catch (error) {
    console.error('AI chat error:', error.message);
    return JSON.stringify({ type: 'text', content: `抱歉，AI请求失败：${error.message}` });
  }
});

// IPC: Get AI Config
ipcMain.handle('ai:config:get', () => {
  return getAIConfig();
});

// IPC: Update AI Config
ipcMain.handle('ai:config:update', (_, config) => {
  dbRun('UPDATE ai_config SET config = ? WHERE id = 1', [JSON.stringify(config)]);
  return config;
});

// IPC: Get AI Messages
ipcMain.handle('ai:messages:getAll', () => {
  return dbAll('SELECT id, role, content, createdAt as timestamp FROM ai_messages ORDER BY createdAt ASC');
});

// IPC: Save AI Message
ipcMain.handle('ai:messages:add', (_, message) => {
  dbRun('INSERT INTO ai_messages (id, role, content, createdAt) VALUES (?, ?, ?, ?)',
    [message.id, message.role, message.content, message.timestamp]);
  return message;
});

// IPC: Clear AI Messages
ipcMain.handle('ai:messages:clear', () => {
  dbRun('DELETE FROM ai_messages');
  return true;
});

// IPC: Send AI Notification (requires user confirmation)
ipcMain.handle('ai:notification:send', (_, { title, message }) => {
  const settings = getNotificationSettings();

  if (settings.dingtalk.enabled && settings.dingtalk.webhookUrl) {
    sendDingTalkNotification(settings.dingtalk.webhookUrl, settings.dingtalk.secret, title, message);
    return { success: true };
  }

  if (settings.email.enabled && settings.email.smtpHost) {
    sendEmailNotification(settings.email, title, message);
    return { success: true };
  }

  return { success: false, error: '没有可用的通知渠道' };
});

// IPC: Execute AI Action (create/update/delete project data)
ipcMain.handle('ai:executeAction', (_, action) => {
  const { type, target, id, data } = action;

  try {
    switch (type) {
      case 'create':
        if (target === 'project') {
          // Check for duplicate project name
          const projectName = data.name;
          const existing = dbGet('SELECT * FROM projects WHERE name = ? AND deletedAt IS NULL', [projectName]);

          if (existing) {
            return {
              success: false,
              error: 'DUPLICATE_NAME',
              duplicateProject: existing,
              message: `项目 "${projectName}" 已存在`
            };
          }

          const projectId = `project-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
          const project = { ...data, id: projectId, deletedAt: null };
          // Remove nested phases/tasks from project data
          delete project.phases;
          delete project.tasks;

          dbRun(`
            INSERT INTO projects (id, name, startDate, endDate, progress, deletedAt)
            VALUES (?, ?, ?, ?, ?, NULL)
          `, [project.id, project.name, project.startDate, project.endDate, project.progress || 0]);

          // Handle nested phases and tasks if present
          if (data.phases && Array.isArray(data.phases)) {
            for (const phaseData of data.phases) {
              const phaseId = phaseData.id || `phase-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
              const phase = { ...phaseData, id: phaseId, projectId: projectId };
              delete phase.tasks; // Remove nested tasks from phase

              dbRun(`
                INSERT INTO phases (id, projectId, name, startDate, endDate, actualEndDate, status)
                VALUES (?, ?, ?, ?, ?, ?, ?)
              `, [phase.id, phase.projectId, phase.name, phase.startDate, phase.endDate, phase.actualEndDate || null, phase.status || 'todo']);

              // Handle nested tasks within phase
              if (phaseData.tasks && Array.isArray(phaseData.tasks)) {
                for (const taskData of phaseData.tasks) {
                  const task = { ...taskData, id: taskData.id || `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, phaseId: phaseId };
                  const notificationConfig = JSON.stringify(task.notificationConfig || { enabled: false, advanceMinutes: 60, repeatIntervalMinutes: 0 });

                  dbRun(`
                    INSERT INTO tasks (id, phaseId, name, assignee, plannedHours, actualHours, dueDate, status, priority, tags, notificationConfig)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                  `, [
                    task.id, task.phaseId, task.name, task.assignee,
                    task.plannedHours || 0, task.actualHours || 0, task.dueDate,
                    task.status || 'todo', task.priority || 'medium', JSON.stringify(task.tags || []), notificationConfig
                  ]);
                }
              }
            }
          }

          return { success: true, data: project };
        }
        if (target === 'phase') {
          const phase = { ...data, id: `phase-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
          dbRun(`
            INSERT INTO phases (id, projectId, name, startDate, endDate, actualEndDate, status)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `, [phase.id, phase.projectId, phase.name, phase.startDate, phase.endDate, phase.actualEndDate || null, phase.status || 'todo']);
          return { success: true, data: phase };
        }
        if (target === 'task') {
          const task = { ...data, id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 6)}` };
          const notificationConfig = JSON.stringify(task.notificationConfig || { enabled: false, advanceMinutes: 60, repeatIntervalMinutes: 0 });
          dbRun(`
            INSERT INTO tasks (id, phaseId, name, assignee, plannedHours, actualHours, dueDate, status, priority, tags, notificationConfig)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            task.id, task.phaseId, task.name, task.assignee,
            task.plannedHours || 0, task.actualHours || 0, task.dueDate,
            task.status || 'todo', task.priority || 'medium', JSON.stringify(task.tags || []), notificationConfig
          ]);
          return { success: true, data: task };
        }
        break;

      case 'update':
        if (target === 'project') {
          const projectFields = Object.keys(data).map(k => `${k} = ?`).join(', ');
          const projectValues = Object.values(data);
          dbRun(`UPDATE projects SET ${projectFields} WHERE id = ?`, [...projectValues, id]);
          return { success: true, data: { id, ...data } };
        }
        if (target === 'phase') {
          const phaseFields = Object.keys(data).map(k => `${k} = ?`).join(', ');
          const phaseValues = Object.values(data);
          dbRun(`UPDATE phases SET ${phaseFields} WHERE id = ?`, [...phaseValues, id]);
          return { success: true, data: { id, ...data } };
        }
        if (target === 'task') {
          const finalData = { ...data };
          if (finalData.tags) finalData.tags = JSON.stringify(finalData.tags);
          if (finalData.notificationConfig) finalData.notificationConfig = JSON.stringify(finalData.notificationConfig);
          const taskFields = Object.keys(finalData).map(k => `${k} = ?`).join(', ');
          const taskValues = Object.values(finalData);
          dbRun(`UPDATE tasks SET ${taskFields} WHERE id = ?`, [...taskValues, id]);
          return { success: true, data: { id, ...data } };
        }
        break;

      case 'delete':
        if (target === 'project') {
          const now = new Date().toISOString();
          dbRun('UPDATE projects SET deletedAt = ? WHERE id = ?', [now, id]);
          return { success: true };
        }
        if (target === 'phase') {
          dbRun('DELETE FROM tasks WHERE phaseId = ?', [id]);
          dbRun('DELETE FROM phases WHERE id = ?', [id]);
          return { success: true };
        }
        if (target === 'task') {
          dbRun('DELETE FROM tasks WHERE id = ?', [id]);
          return { success: true };
        }
        break;
    }

    return { success: false, error: `Unknown action: ${type} ${target}` };
  } catch (error) {
    console.error('AI executeAction error:', error.message);
    return { success: false, error: error.message };
  }
});

app.whenReady().then(async () => {
  try {
    console.log('App ready, initializing...');
    await initDatabase();
    console.log('Database initialized successfully');
    createWindow();
    startNotificationChecker();
    console.log('App initialization complete');
  } catch (error) {
    console.error('Failed to initialize app:', error);
    console.error('Error stack:', error.stack);
  }
});

app.on('window-all-closed', () => {
  if (notificationInterval) {
    clearInterval(notificationInterval);
  }
  if (db) {
    saveDatabase();
    db.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
