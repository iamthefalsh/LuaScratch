# 🎮 LuaScratch

**AI-Powered Visual Programming for Roblox Studio**

LuaScratch brings Scratch-like visual programming to Roblox Studio, powered by AI code generation. Build your Roblox games using drag-and-drop blocks while AI handles the complex Luau code generation.

![LuaScratch Preview](https://via.placeholder.com/800x400/6366f1/ffffff?text=LuaScratch+Preview)

## ✨ Features

### 🧩 Visual Block Programming
- **Scratch-like interface** with draggable blocks
- **7 categories**: Events, Control, Motion, Logic, Variables, Functions, Roblox
- **Connect blocks** with parent-child relationships
- **Real-time code generation** from visual blocks

### 🤖 AI-Powered Code Generation
- **GitHub Models API** integration (GPT-5)
- **Natural language to code** - describe what you want
- **Auto-fix errors** - AI detects and fixes runtime errors
- **Code suggestions** - get ideas for your game

### 🔗 Roblox Studio Integration
- **Live connection** to Roblox Studio via HTTP
- **Game tree sync** - see all your game's instances
- **Script execution** - run code directly in Studio
- **Console integration** - see output in LuaScratch
- **Auto-sync** - changes sync automatically

### 🎨 Beautiful Interface
- **Dark theme** with modern design
- **Smooth animations** and transitions
- **Loading screens** with bubble animations
- **Toast notifications** for feedback
- **Responsive layout**

## 📁 Project Structure

```
luascratch/
├── server/
│   ├── server.js           # Main Express/Socket.IO server
│   ├── ai-service.js       # GitHub Models API integration
│   ├── file-watcher.js     # File system watcher for sync
│   └── roblox-bridge.js    # Roblox communication bridge
├── web/
│   ├── index.html          # Main web interface
│   ├── style.css           # Styles with animations
│   └── app.js              # Frontend application
├── roblox-plugin/
│   └── LuaScratchPlugin.lua # Roblox Studio plugin
├── workspace/              # Local game copy (auto-created)
│   ├── scripts/           # Synced Lua/Luau files
│   ├── properties/        # Instance properties
│   └── descriptions/      # Instance descriptions
├── package.json
├── .env
└── README.md
```

## 🚀 Installation

### Prerequisites
- **Node.js** 18+ 
- **npm** or **yarn**
- **Roblox Studio** (latest version)
- **GitHub Token** (already included in .env)

### Step 1: Install Dependencies

```bash
cd luascratch
npm install
```

### Step 2: Start the Server

```bash
npm start
```

The server will start on `http://localhost:3000`

You should see:
```
╔══════════════════════════════════════════════════════════════╗
║                    🎮 LuaScratch Server                       ║
║              AI-Powered Visual Programming for Roblox        ║
╠══════════════════════════════════════════════════════════════╣
║  Web Interface: http://localhost:3000                        ║
╚══════════════════════════════════════════════════════════════╝
```

### Step 3: Install Roblox Plugin

1. Copy `roblox-plugin/LuaScratchPlugin.lua` to:
   - Windows: `%LOCALAPPDATA%\Roblox\Plugins\`
   - Mac: `~/Library/Application Support/Roblox/Plugins/`

2. **Enable HTTP Requests** in Roblox Studio:
   - Go to `File` → `Game Settings` → `Security`
   - Enable `Allow HTTP Requests`

3. **Reload Plugins** in Studio:
   - Press `F6` or go to `Plugins` → `Reload Plugins`

4. Open the **LuaScratch panel** from the Plugins tab

### Step 4: Connect

1. Click **Connect** in the LuaScratch panel
2. Open `http://localhost:3000` in your browser
3. Start building with blocks! 🎉

## 📖 Usage Guide

### Creating Your First Script

1. **Create a New Project**
   - Click "New Project" in the header
   - Enter a name and description

2. **Add Blocks**
   - Select a category from the left sidebar
   - Drag blocks to the workspace
   - Double-click blocks to add them

3. **Connect Blocks**
   - Drag from output connector (bottom) to input connector (top)
   - Blocks execute in order of connections

4. **Generate Code**
   - Switch to "Code" or "Split" view to see generated Luau
   - Code updates automatically as you build

5. **Run in Roblox**
   - Click the "Run" button (▶️)
   - Code executes in your Roblox Studio game
   - See output in the Console panel

### Using AI Assist

1. **Open AI Chat**
   - Click "AI Assist" or the AI tab in the right panel

2. **Describe What You Want**
   - Example: "Create a part that changes color when clicked"
   - Example: "Make a player teleport system"

3. **Review Generated Code**
   - AI generates Luau code
   - View explanation and suggestions
   - Apply to workspace as blocks

4. **Auto-Fix Errors**
   - If code has errors, click "Fix with AI"
   - AI analyzes and corrects the code

### Block Categories

| Category | Color | Description |
|----------|-------|-------------|
| Events | 🟡 Yellow | Game start, player join, touch events |
| Control | 🟠 Orange | Loops, conditions, waits |
| Motion | 🔵 Blue | Movement, rotation, teleport |
| Logic | 🟢 Green | Variables, math, comparisons |
| Variables | 🔴 Red | Create, set, modify variables |
| Functions | 🟣 Purple | Define and call functions |
| Roblox | 🔵 Cyan | Roblox-specific APIs |

## 🔧 Configuration

### Environment Variables (.env)

```env
# GitHub Token (for AI)
GITHUB_TOKEN=your_token_here

# Server Port
PORT=3000

# AI Model
AI_MODEL=openai/gpt-5

# Auto-sync interval (ms)
SYNC_INTERVAL=5000
```

### Roblox Plugin Settings

Edit `LuaScratchPlugin.lua` Config section:

```lua
LuaScratch.Config = {
    ServerURL = "http://localhost:3000",
    SyncInterval = 5,  -- seconds
    AutoSync = true,
    DebugMode = true
}
```

## 🛠️ Development

### Run in Development Mode

```bash
npm run dev
```

### Project Structure for Developers

**Backend (Node.js)**
- `server/server.js` - Express server, Socket.IO events
- `server/ai-service.js` - GitHub Models API wrapper
- `server/file-watcher.js` - File system synchronization
- `server/roblox-bridge.js` - Roblox HTTP communication

**Frontend (Vanilla JS)**
- `web/app.js` - Main application logic
- Block system, drag-drop, code generation
- AI chat integration

**Roblox Plugin (Lua)**
- HTTP communication with server
- Game tree serialization
- Code execution environment

## 🐛 Troubleshooting

### "Roblox: Disconnected" Status

1. Ensure Roblox Studio is open
2. Check that HTTP Requests are enabled
3. Verify the plugin is installed correctly
4. Click "Connect" in the LuaScratch panel

### AI Not Responding

1. Check your GitHub token is valid
2. Verify internet connection
3. Check server logs for errors

### Code Not Executing

1. Ensure Roblox is connected
2. Check Console panel for errors
3. Try simpler code first
4. Use "Fix with AI" for errors

### File Sync Issues

1. Check workspace folder permissions
2. Restart the server
3. Manually click "Sync Now" in plugin

## 📝 API Endpoints

### Roblox Plugin Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/roblox/connect` | POST | Connect Roblox session |
| `/api/roblox/disconnect` | POST | Disconnect session |
| `/api/roblox/sync` | POST | Sync game tree |
| `/api/roblox/execute` | POST | Execute code |
| `/api/roblox/console` | POST | Send console output |
| `/api/roblox/error` | POST | Send error report |

### Socket.IO Events

**Client → Server**
- `project:create` - Create new project
- `block:add` - Add block to workspace
- `block:connect` - Connect two blocks
- `ai:generate` - Request AI code generation
- `roblox:execute` - Execute code in Roblox

**Server → Client**
- `project:created` - Project created confirmation
- `block:added` - New block added
- `ai:response` - AI generated code
- `console:log` - Console output
- `console:error` - Error message

## 🗺️ Roadmap

- [x] Basic block system
- [x] AI code generation
- [x] Roblox integration
- [x] Console output
- [ ] Multiplayer collaboration
- [ ] Custom block creation
- [ ] Asset importing
- [ ] Cloud saves
- [ ] Mobile support

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## 📄 License

MIT License - See LICENSE file

## 🙏 Credits

- **Scratch** - Inspiration for visual programming
- **GitHub Models** - AI code generation
- **Roblox** - Game platform
- **Block-based coding** - Educational approach

---

**Made with ❤️ for the Roblox Developer Community**

Need help? Open an issue or join our Discord!
