const chokidar = require('chokidar');
const fs = require('fs-extra');
const path = require('path');

class FileWatcher {
  constructor(workspaceDir) {
    this.workspaceDir = workspaceDir;
    this.scriptsDir = path.join(workspaceDir, 'scripts');
    this.propertiesDir = path.join(workspaceDir, 'properties');
    this.descriptionsDir = path.join(workspaceDir, 'descriptions');
    
    this.fileTree = {};
    this.watcher = null;
    
    this.init();
  }

  async init() {
    // Ensure directories exist
    await fs.ensureDir(this.scriptsDir);
    await fs.ensureDir(this.propertiesDir);
    await fs.ensureDir(this.descriptionsDir);
    
    // Initialize file tree
    await this.scanDirectory();
    
    // Start watching
    this.startWatching();
    
    console.log('[FileWatcher] Initialized and watching:', this.workspaceDir);
  }

  startWatching() {
    this.watcher = chokidar.watch(this.workspaceDir, {
      ignored: /(^|[\/\\])\../, // ignore dotfiles
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: {
        stabilityThreshold: 300,
        pollInterval: 100
      }
    });

    this.watcher
      .on('add', (filePath) => this.handleFileChange('add', filePath))
      .on('change', (filePath) => this.handleFileChange('change', filePath))
      .on('unlink', (filePath) => this.handleFileChange('unlink', filePath))
      .on('addDir', (dirPath) => this.handleFileChange('addDir', dirPath))
      .on('unlinkDir', (dirPath) => this.handleFileChange('unlinkDir', dirPath))
      .on('error', (error) => console.error('[FileWatcher] Error:', error));
  }

  async handleFileChange(event, filePath) {
    const relativePath = path.relative(this.workspaceDir, filePath);
    console.log(`[FileWatcher] ${event}: ${relativePath}`);
    
    // Update file tree
    await this.scanDirectory();
    
    // Emit event (would be connected to socket.io in main server)
    if (global.io) {
      global.io.emit('file:changed', {
        event,
        path: relativePath,
        tree: this.fileTree
      });
    }
  }

  async scanDirectory(dir = this.workspaceDir, relativePath = '') {
    const result = {
      name: path.basename(dir) || 'workspace',
      path: relativePath || '.',
      type: 'directory',
      children: []
    };

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        const entryPath = path.join(dir, entry.name);
        const entryRelativePath = path.join(relativePath, entry.name);
        
        if (entry.isDirectory()) {
          const subDir = await this.scanDirectory(entryPath, entryRelativePath);
          result.children.push(subDir);
        } else {
          const stats = await fs.stat(entryPath);
          result.children.push({
            name: entry.name,
            path: entryRelativePath,
            type: 'file',
            extension: path.extname(entry.name),
            size: stats.size,
            modified: stats.mtime
          });
        }
      }
      
      // Sort: directories first, then files alphabetically
      result.children.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'directory' ? -1 : 1;
      });
      
    } catch (error) {
      console.error('[FileWatcher] Scan error:', error.message);
    }

    if (relativePath === '') {
      this.fileTree = result;
    }
    
    return result;
  }

  getFileTree() {
    return this.fileTree;
  }

  async readFile(filePath) {
    const fullPath = path.join(this.workspaceDir, filePath);
    
    // Security check - ensure path is within workspace
    if (!fullPath.startsWith(this.workspaceDir)) {
      throw new Error('Access denied: Path outside workspace');
    }
    
    const exists = await fs.pathExists(fullPath);
    if (!exists) {
      throw new Error(`File not found: ${filePath}`);
    }
    
    const content = await fs.readFile(fullPath, 'utf-8');
    return content;
  }

  async writeFile(filePath, content) {
    const fullPath = path.join(this.workspaceDir, filePath);
    
    // Security check
    if (!fullPath.startsWith(this.workspaceDir)) {
      throw new Error('Access denied: Path outside workspace');
    }
    
    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, content, 'utf-8');
    
    console.log(`[FileWatcher] Written: ${filePath}`);
  }

  async deleteFile(filePath) {
    const fullPath = path.join(this.workspaceDir, filePath);
    
    if (!fullPath.startsWith(this.workspaceDir)) {
      throw new Error('Access denied: Path outside workspace');
    }
    
    await fs.remove(fullPath);
    console.log(`[FileWatcher] Deleted: ${filePath}`);
  }

  async syncFromRoblox(gameData) {
    // Sync game structure from Roblox plugin
    console.log('[FileWatcher] Syncing from Roblox...');
    
    // Save game tree
    await this.writeFile('game_tree.json', JSON.stringify(gameData, null, 2));
    
    // Process scripts
    if (gameData.scripts) {
      for (const script of gameData.scripts) {
        const scriptPath = path.join('scripts', `${script.name}.luau`);
        await this.writeFile(scriptPath, script.source || '-- Empty script');
        
        // Save properties
        const propsPath = path.join('properties', `${script.name}.json`);
        await this.writeFile(propsPath, JSON.stringify(script.properties || {}, null, 2));
        
        // Save description
        if (script.description) {
          const descPath = path.join('descriptions', `${script.name}.txt`);
          await this.writeFile(descPath, script.description);
        }
      }
    }
    
    // Process other instances
    if (gameData.instances) {
      await this.processInstances(gameData.instances, '');
    }
    
    console.log('[FileWatcher] Sync complete');
    await this.scanDirectory();
  }

  async processInstances(instances, parentPath) {
    for (const instance of instances) {
      const instancePath = path.join(parentPath, instance.Name || instance.name || 'Unnamed');
      
      // Save instance properties
      const propsFile = path.join('properties', `${instancePath.replace(/[\\/]/g, '_')}.json`);
      await this.writeFile(propsFile, JSON.stringify({
        ClassName: instance.ClassName || instance.className,
        Properties: instance.Properties || instance.properties || {},
        Children: (instance.Children || instance.children || []).map(c => c.Name || c.name)
      }, null, 2));
      
      // Save description if available
      if (instance.Description || instance.description) {
        const descFile = path.join('descriptions', `${instancePath.replace(/[\\/]/g, '_')}.txt`);
        await this.writeFile(descFile, instance.Description || instance.description);
      }
      
      // Process children recursively
      if (instance.Children || instance.children) {
        await this.processInstances(instance.Children || instance.children, instancePath);
      }
    }
  }

  async getContext() {
    // Build context string from workspace files for AI
    let context = '';
    
    try {
      // Get all .luau and .lua files
      const scriptFiles = await this.getFilesByExtension('.luau');
      const luaFiles = await this.getFilesByExtension('.lua');
      const allScripts = [...scriptFiles, ...luaFiles];
      
      context += `=== SCRIPTS (${allScripts.length}) ===\n`;
      
      for (const file of allScripts.slice(0, 10)) { // Limit to 10 files
        try {
          const content = await this.readFile(file.path);
          context += `\n--- ${file.path} ---\n`;
          context += content.substring(0, 500); // Limit content length
          context += content.length > 500 ? '\n... (truncated)' : '';
          context += '\n';
        } catch (e) {
          // Skip unreadable files
        }
      }
      
      // Get game tree if exists
      try {
        const gameTree = await this.readFile('game_tree.json');
        context += `\n=== GAME STRUCTURE ===\n`;
        context += gameTree.substring(0, 1000);
      } catch (e) {
        // No game tree yet
      }
      
    } catch (error) {
      console.error('[FileWatcher] Context error:', error.message);
    }
    
    return context;
  }

  async getFilesByExtension(ext) {
    const files = [];
    
    const scan = async (dir, relativePath = '') => {
      const entries = await fs.readdir(dir, { withFileTypes: true }).catch(() => []);
      
      for (const entry of entries) {
        const entryPath = path.join(dir, entry.name);
        const entryRelativePath = path.join(relativePath, entry.name);
        
        if (entry.isDirectory()) {
          await scan(entryPath, entryRelativePath);
        } else if (entry.name.endsWith(ext)) {
          files.push({
            name: entry.name,
            path: entryRelativePath
          });
        }
      }
    };
    
    await scan(this.workspaceDir);
    return files;
  }

  stop() {
    if (this.watcher) {
      this.watcher.close();
      console.log('[FileWatcher] Stopped watching');
    }
  }
}

module.exports = FileWatcher;
