const chokidar = require('chokidar');
const fs = require('fs-extra');
const path = require('path');

class FileWatcher {
  constructor(workspaceDir) {
    this.workspaceDir = workspaceDir;
    this.fileTree = {};
    this.watcher = null;
    this.init();
  }

  async init() {
    await fs.ensureDir(this.workspaceDir);
    await fs.ensureDir(path.join(this.workspaceDir, 'scripts'));
    await fs.ensureDir(path.join(this.workspaceDir, 'properties'));
    await fs.ensureDir(path.join(this.workspaceDir, 'projects'));
    
    await this.scanDirectory();
    this.startWatching();
    
    console.log('[FileWatcher] Initialized');
  }

  startWatching() {
    this.watcher = chokidar.watch(this.workspaceDir, {
      ignored: /(^|[\/\\])\../,
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 300, pollInterval: 100 }
    });

    this.watcher
      .on('add', (p) => this.handleChange('add', p))
      .on('change', (p) => this.handleChange('change', p))
      .on('unlink', (p) => this.handleChange('unlink', p));
  }

  async handleChange(event, filePath) {
    const relPath = path.relative(this.workspaceDir, filePath);
    console.log(`[FileWatcher] ${event}: ${relPath}`);
    await this.scanDirectory();
    
    if (global.io) {
      global.io.emit('file:changed', { event, path: relPath, tree: this.fileTree });
    }
  }

  async scanDirectory(dir = this.workspaceDir, relPath = '') {
    const result = {
      name: path.basename(dir) || 'workspace',
      path: relPath || '.',
      type: 'directory',
      children: []
    };

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const entryPath = path.join(dir, entry.name);
        const entryRelPath = path.join(relPath, entry.name);
        
        if (entry.isDirectory()) {
          const subDir = await this.scanDirectory(entryPath, entryRelPath);
          result.children.push(subDir);
        } else {
          const stats = await fs.stat(entryPath);
          result.children.push({
            name: entry.name,
            path: entryRelPath,
            type: 'file',
            extension: path.extname(entry.name),
            size: stats.size,
            modified: stats.mtime
          });
        }
      }
      
      result.children.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'directory' ? -1 : 1;
      });
      
    } catch (error) {
      console.error('[FileWatcher] Scan error:', error.message);
    }

    if (relPath === '') {
      this.fileTree = result;
    }
    
    return result;
  }

  getFileTree() {
    return this.fileTree;
  }

  async readFile(filePath) {
    const fullPath = path.join(this.workspaceDir, filePath);
    if (!fullPath.startsWith(this.workspaceDir)) {
      throw new Error('Access denied: Path outside workspace');
    }
    return await fs.readFile(fullPath, 'utf-8');
  }

  async writeFile(filePath, content) {
    const fullPath = path.join(this.workspaceDir, filePath);
    if (!fullPath.startsWith(this.workspaceDir)) {
      throw new Error('Access denied: Path outside workspace');
    }
    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, content, 'utf-8');
  }

  async syncFromRoblox(gameData) {
    console.log('[FileWatcher] Syncing from Roblox...');
    
    if (gameData.scripts) {
      for (const script of gameData.scripts) {
        const scriptPath = path.join('scripts', `${script.Name.replace(/[^a-zA-Z0-9]/g, '_')}.luau`);
        await this.writeFile(scriptPath, script.Source || '-- Empty script');
      }
    }
    
    await this.scanDirectory();
    console.log('[FileWatcher] Sync complete');
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
    }
  }
}

module.exports = FileWatcher;
