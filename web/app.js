/**
 * LuaScratch - Frontend Application
 * AI-Powered Visual Programming for Roblox
 */

// ==================== STATE MANAGEMENT ====================
const state = {
  socket: null,
  sessionId: null,
  currentProject: null,
  blocks: [],
  selectedBlock: null,
  connections: [],
  isDragging: false,
  dragOffset: { x: 0, y: 0 },
  zoom: 1,
  view: 'visual',
  robloxConnected: false,
  consoleMessages: [],
  aiConversation: [],
  blockCategories: {
    events: [
      { type: 'event_start', label: 'When Game Starts', icon: 'fa-play', code: '-- Game start logic' },
      { type: 'event_player_joined', label: 'Player Joined', icon: 'fa-user-plus', code: 'game.Players.PlayerAdded:Connect(function(player)\n  -- Player joined logic\nend)' },
      { type: 'event_player_left', label: 'Player Left', icon: 'fa-user-minus', code: 'game.Players.PlayerRemoving:Connect(function(player)\n  -- Player left logic\nend)' },
      { type: 'event_touched', label: 'When Touched', icon: 'fa-hand-pointer', code: 'script.Parent.Touched:Connect(function(hit)\n  -- Touched logic\nend)' },
      { type: 'event_clicked', label: 'When Clicked', icon: 'fa-mouse-pointer', code: 'script.Parent.ClickDetector.MouseClick:Connect(function(player)\n  -- Click logic\nend)' }
    ],
    control: [
      { type: 'control_wait', label: 'Wait', icon: 'fa-clock', code: 'wait(1)' },
      { type: 'control_repeat', label: 'Repeat', icon: 'fa-redo', code: 'for i = 1, 10 do\n  -- Repeat logic\nend' },
      { type: 'control_while', label: 'While Loop', icon: 'fa-sync', code: 'while condition do\n  -- Loop logic\nend' },
      { type: 'control_if', label: 'If Statement', icon: 'fa-code-branch', code: 'if condition then\n  -- If logic\nend' },
      { type: 'control_if_else', label: 'If Else', icon: 'fa-code-branch', code: 'if condition then\n  -- If logic\nelse\n  -- Else logic\nend' }
    ],
    motion: [
      { type: 'motion_move', label: 'Move', icon: 'fa-arrows-alt', code: 'script.Parent.Position = script.Parent.Position + Vector3.new(0, 0, 5)' },
      { type: 'motion_rotate', label: 'Rotate', icon: 'fa-sync-alt', code: 'script.Parent.CFrame = script.Parent.CFrame * CFrame.Angles(0, math.rad(90), 0)' },
      { type: 'motion_teleport', label: 'Teleport', icon: 'fa-teleport', code: 'script.Parent.Position = Vector3.new(0, 10, 0)' },
      { type: 'motion_set_velocity', label: 'Set Velocity', icon: 'fa-wind', code: 'script.Parent.AssemblyLinearVelocity = Vector3.new(0, 50, 0)' }
    ],
    logic: [
      { type: 'logic_variable', label: 'Set Variable', icon: 'fa-equals', code: 'local myVariable = 0' },
      { type: 'logic_math', label: 'Math Operation', icon: 'fa-calculator', code: 'local result = a + b' },
      { type: 'logic_compare', label: 'Compare', icon: 'fa-balance-scale', code: 'if a == b then\n  -- Compare logic\nend' },
      { type: 'logic_and', label: 'And', icon: 'fa-link', code: 'if a and b then\n  -- And logic\nend' },
      { type: 'logic_or', label: 'Or', icon: 'fa-unlink', code: 'if a or b then\n  -- Or logic\nend' }
    ],
    variables: [
      { type: 'var_create', label: 'Create Variable', icon: 'fa-plus', code: 'local myVar = nil' },
      { type: 'var_set', label: 'Set Value', icon: 'fa-pen', code: 'myVar = value' },
      { type: 'var_change', label: 'Change By', icon: 'fa-plus-minus', code: 'myVar = myVar + 1' },
      { type: 'var_get', label: 'Get Value', icon: 'fa-eye', code: 'print(myVar)' }
    ],
    functions: [
      { type: 'func_define', label: 'Define Function', icon: 'fa-function', code: 'local function myFunction()\n  -- Function logic\nend' },
      { type: 'func_call', label: 'Call Function', icon: 'fa-phone', code: 'myFunction()' },
      { type: 'func_return', label: 'Return', icon: 'fa-reply', code: 'return value' }
    ],
    roblox: [
      { type: 'rbx_print', label: 'Print', icon: 'fa-terminal', code: 'print("Hello, Roblox!")' },
      { type: 'rbx_find_service', label: 'Get Service', icon: 'fa-cog', code: 'local service = game:GetService("Players")' },
      { type: 'rbx_instance_new', label: 'Create Instance', icon: 'fa-plus-circle', code: 'local part = Instance.new("Part")\npart.Parent = workspace' },
      { type: 'rbx_fire_event', label: 'Fire Event', icon: 'fa-bolt', code: 'remoteEvent:FireClient(player, data)' },
      { type: 'rbx_tween', label: 'Tween', icon: 'fa-film', code: 'local tween = game:GetService("TweenService"):Create(object, TweenInfo.new(1), {Position = targetPos})\ntween:Play()' },
      { type: 'rbx_sound', label: 'Play Sound', icon: 'fa-volume-up', code: 'local sound = Instance.new("Sound")\nsound.SoundId = "rbxassetid://123456"\nsound:Play()' }
    ]
  }
};

// ==================== INITIALIZATION ====================
document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

async function initializeApp() {
  showLoadingScreen();
  
  // Simulate loading progress
  await simulateLoading();
  
  // Initialize Socket.IO connection
  initializeSocket();
  
  // Setup UI event listeners
  setupEventListeners();
  
  // Initialize block palette
  initializeBlockPalette();
  
  // Hide loading screen
  hideLoadingScreen();
  
  showToast('Welcome to LuaScratch!', 'success');
}

function showLoadingScreen() {
  document.getElementById('loading-screen').classList.remove('hidden');
  document.getElementById('app').classList.add('hidden');
}

function hideLoadingScreen() {
  document.getElementById('loading-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
}

function simulateLoading() {
  return new Promise(resolve => {
    const statuses = [
      'Initializing core systems...',
      'Loading block library...',
      'Connecting to AI service...',
      'Preparing workspace...',
      'Ready!'
    ];
    
    let i = 0;
    const interval = setInterval(() => {
      if (i < statuses.length) {
        document.querySelector('.loading-status').textContent = statuses[i];
        i++;
      } else {
        clearInterval(interval);
        setTimeout(resolve, 500);
      }
    }, 400);
  });
}

// ==================== SOCKET.IO ====================
function initializeSocket() {
  state.socket = io();
  
  state.socket.on('connect', () => {
    console.log('[LuaScratch] Connected to server');
    logToConsole('Connected to LuaScratch server', 'success');
  });
  
  state.socket.on('disconnect', () => {
    console.log('[LuaScratch] Disconnected from server');
    logToConsole('Disconnected from server', 'error');
  });
  
  state.socket.on('workspace:init', (data) => {
    state.sessionId = data.sessionId;
    console.log('[LuaScratch] Session initialized:', data.sessionId);
  });
  
  state.socket.on('project:created', (project) => {
    state.currentProject = project;
    updateProjectDisplay();
    showToast(`Project "${project.name}" created!`, 'success');
  });
  
  state.socket.on('project:loaded', (project) => {
    state.currentProject = project;
    loadBlocks(project.blocks || []);
    updateProjectDisplay();
    showToast(`Project "${project.name}" loaded!`, 'success');
  });
  
  state.socket.on('project:list', (projects) => {
    updateProjectsList(projects);
  });
  
  state.socket.on('block:added', (block) => {
    if (!state.blocks.find(b => b.id === block.id)) {
      addBlockToWorkspace(block, false);
    }
  });
  
  state.socket.on('block:updated', (data) => {
    updateBlockInWorkspace(data.block);
  });
  
  state.socket.on('block:deleted', (data) => {
    removeBlockFromWorkspace(data.blockId);
  });
  
  state.socket.on('ai:loading', (data) => {
    showAILoading(data.message, data.stage);
  });
  
  state.socket.on('ai:response', (data) => {
    hideAILoading();
    showAIResponse(data);
    addAIChatMessage('ai', data.explanation || 'Code generated successfully!');
  });
  
  state.socket.on('ai:fixed', (data) => {
    hideAILoading();
    showAIFixResponse(data);
  });
  
  state.socket.on('ai:ideas', (data) => {
    hideAILoading();
    showAIIdeas(data);
  });
  
  state.socket.on('ai:error', (error) => {
    hideAILoading();
    showToast(`AI Error: ${error.message}`, 'error');
    logToConsole(`AI Error: ${error.message}`, 'error');
  });
  
  state.socket.on('console:log', (data) => {
    logToConsole(data.message, data.type || 'log', data.source);
  });
  
  state.socket.on('console:error', (data) => {
    logToConsole(data.message, 'error', data.source);
    
    // Auto-fix option for Roblox errors
    if (data.source === 'roblox' && state.currentProject) {
      showAutoFixOption(data);
    }
  });
  
  state.socket.on('console:clear', () => {
    clearConsole();
  });
  
  state.socket.on('roblox:connected', () => {
    state.robloxConnected = true;
    updateRobloxStatus();
    showToast('Roblox Studio connected!', 'success');
  });
  
  state.socket.on('roblox:disconnected', () => {
    state.robloxConnected = false;
    updateRobloxStatus();
    showToast('Roblox Studio disconnected', 'warning');
  });
  
  state.socket.on('file:synced', (files) => {
    updateFileTree(files);
  });
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
  // Navigation tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const tabName = tab.dataset.tab;
      handleNavTab(tabName);
    });
  });
  
  // Block categories
  document.querySelectorAll('.category').forEach(cat => {
    cat.addEventListener('click', () => {
      document.querySelectorAll('.category').forEach(c => c.classList.remove('active'));
      cat.classList.add('active');
      updateBlockPalette(cat.dataset.category);
    });
  });
  
  // Workspace tabs
  document.querySelectorAll('.workspace-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.workspace-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      switchWorkspaceView(tab.dataset.view);
    });
  });
  
  // Sidebar tabs
  document.querySelectorAll('.sidebar-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const panel = tab.dataset.panel;
      document.querySelectorAll('.sidebar-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.sidebar-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`${panel}-panel`).classList.add('active');
    });
  });
  
  // Console filters
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterConsole(btn.dataset.filter);
    });
  });
  
  // Toolbar buttons
  document.getElementById('run-btn').addEventListener('click', executeCode);
  document.getElementById('ai-assist-btn').addEventListener('click', openAIChat);
  document.getElementById('zoom-in').addEventListener('click', () => zoomWorkspace(0.1));
  document.getElementById('zoom-out').addEventListener('click', () => zoomWorkspace(-0.1));
  document.getElementById('fit-view').addEventListener('click', fitWorkspace);
  document.getElementById('delete-block').addEventListener('click', deleteSelectedBlock);
  document.getElementById('clear-workspace').addEventListener('click', clearWorkspace);
  document.getElementById('clear-console').addEventListener('click', clearConsole);
  document.getElementById('copy-code').addEventListener('click', copyCodeToClipboard);
  
  // Property panel
  document.getElementById('update-block').addEventListener('click', updateSelectedBlock);
  document.getElementById('delete-selected').addEventListener('click', deleteSelectedBlock);
  
  // AI Chat
  document.getElementById('send-ai-prompt').addEventListener('click', sendAIPrompt);
  document.getElementById('ai-ideate').addEventListener('click', requestAIIdeas);
  document.getElementById('ai-prompt').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendAIPrompt();
    }
  });
  
  // Modals
  document.querySelectorAll('.modal-close, .modal-cancel').forEach(btn => {
    btn.addEventListener('click', closeAllModals);
  });
  
  document.getElementById('new-project-btn').addEventListener('click', () => {
    closeAllModals();
    openModal('new-project-modal');
  });
  
  document.getElementById('create-project').addEventListener('click', createNewProject);
  document.getElementById('edit-project-btn').addEventListener('click', editCurrentProject);
  
  // AI Response Modal
  document.getElementById('apply-ai-code').addEventListener('click', applyAICode);
  document.getElementById('execute-ai-code').addEventListener('click', executeAICode);
  
  document.querySelectorAll('.ai-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.ai-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.ai-tab-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`ai-${tab.dataset.aiTab}-panel`).classList.add('active');
    });
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboard);
  
  // Workspace drag and drop
  setupWorkspaceDragDrop();
}

// ==================== BLOCK PALETTE ====================
function initializeBlockPalette() {
  updateBlockPalette('events');
}

function updateBlockPalette(category) {
  const palette = document.getElementById('block-palette');
  palette.innerHTML = '';
  
  const blocks = state.blockCategories[category] || [];
  
  blocks.forEach(block => {
    const blockEl = createPaletteBlock(block, category);
    palette.appendChild(blockEl);
  });
}

function createPaletteBlock(block, category) {
  const div = document.createElement('div');
  div.className = `palette-block block-${category}`;
  div.draggable = true;
  div.dataset.type = block.type;
  div.dataset.category = category;
  div.innerHTML = `
    <i class="fas ${block.icon}"></i>
    <span>${block.label}</span>
  `;
  
  div.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      ...block,
      category
    }));
    e.dataTransfer.effectAllowed = 'copy';
  });
  
  div.addEventListener('dblclick', () => {
    addBlockToWorkspace({
      ...block,
      category,
      id: generateId(),
      position: { x: 100 + Math.random() * 100, y: 100 + Math.random() * 100 }
    });
  });
  
  return div;
}

// ==================== WORKSPACE ====================
function setupWorkspaceDragDrop() {
  const workspace = document.getElementById('block-workspace');
  const container = document.getElementById('blocks-container');
  
  workspace.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  });
  
  workspace.addEventListener('drop', (e) => {
    e.preventDefault();
    
    const data = e.dataTransfer.getData('application/json');
    if (!data) return;
    
    const blockData = JSON.parse(data);
    const rect = container.getBoundingClientRect();
    
    const newBlock = {
      ...blockData,
      id: generateId(),
      position: {
        x: (e.clientX - rect.left) / state.zoom,
        y: (e.clientY - rect.top) / state.zoom
      }
    };
    
    addBlockToWorkspace(newBlock);
  });
  
  // Click to deselect
  workspace.addEventListener('click', (e) => {
    if (e.target === workspace || e.target === container) {
      deselectBlock();
    }
  });
}

function addBlockToWorkspace(block, emit = true) {
  state.blocks.push(block);
  
  const blockEl = createWorkspaceBlock(block);
  document.getElementById('blocks-container').appendChild(blockEl);
  
  // Hide placeholder
  const placeholder = document.querySelector('.workspace-placeholder');
  if (placeholder) {
    placeholder.style.display = 'none';
  }
  
  // Update code panel
  updateGeneratedCode();
  
  // Emit to server
  if (emit && state.socket) {
    state.socket.emit('block:add', block);
  }
  
  // Animate in
  blockEl.style.animation = 'messageSlide 0.3s ease';
}

function createWorkspaceBlock(block) {
  const div = document.createElement('div');
  div.className = `workspace-block block-${block.category}`;
  div.id = `block-${block.id}`;
  div.style.left = `${block.position.x}px`;
  div.style.top = `${block.position.y}px`;
  
  div.innerHTML = `
    <div class="block-connector input"></div>
    <div class="block-header">
      <span class="block-title">
        <i class="fas ${block.icon || 'fa-cube'}"></i>
        ${block.label}
      </span>
      <div class="block-actions">
        <button class="block-action-btn" onclick="editBlock('${block.id}')">
          <i class="fas fa-pen"></i>
        </button>
        <button class="block-action-btn" onclick="deleteBlock('${block.id}')">
          <i class="fas fa-times"></i>
        </button>
      </div>
    </div>
    <div class="block-content">${block.description || ''}</div>
    <div class="block-connector output"></div>
  `;
  
  // Make draggable
  makeBlockDraggable(div, block);
  
  // Click to select
  div.addEventListener('click', (e) => {
    e.stopPropagation();
    selectBlock(block);
  });
  
  return div;
}

function makeBlockDraggable(element, block) {
  let isDragging = false;
  let startX, startY, startLeft, startTop;
  
  element.addEventListener('mousedown', (e) => {
    if (e.target.closest('.block-action-btn') || e.target.closest('.block-connector')) {
      return;
    }
    
    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = element.offsetLeft;
    startTop = element.offsetTop;
    
    element.classList.add('dragging');
    
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  });
  
  function onMouseMove(e) {
    if (!isDragging) return;
    
    const dx = (e.clientX - startX) / state.zoom;
    const dy = (e.clientY - startY) / state.zoom;
    
    block.position.x = startLeft + dx;
    block.position.y = startTop + dy;
    
    element.style.left = `${block.position.x}px`;
    element.style.top = `${block.position.y}px`;
    
    updateConnections();
  }
  
  function onMouseUp() {
    isDragging = false;
    element.classList.remove('dragging');
    
    document.removeEventListener('mousemove', onMouseMove);
    document.removeEventListener('mouseup', onMouseUp);
    
    // Update on server
    if (state.socket) {
      state.socket.emit('block:update', {
        id: block.id,
        updates: { position: block.position }
      });
    }
  }
}

function selectBlock(block) {
  // Deselect previous
  deselectBlock();
  
  state.selectedBlock = block;
  
  const blockEl = document.getElementById(`block-${block.id}`);
  if (blockEl) {
    blockEl.classList.add('selected');
  }
  
  // Show properties
  showBlockProperties(block);
}

function deselectBlock() {
  if (state.selectedBlock) {
    const blockEl = document.getElementById(`block-${state.selectedBlock.id}`);
    if (blockEl) {
      blockEl.classList.remove('selected');
    }
  }
  
  state.selectedBlock = null;
  hideBlockProperties();
}

function showBlockProperties(block) {
  document.getElementById('no-selection').classList.add('hidden');
  document.getElementById('block-properties').classList.remove('hidden');
  
  document.getElementById('prop-type').value = block.type;
  document.getElementById('prop-label').value = block.label || '';
  document.getElementById('prop-description').value = block.description || '';
  document.getElementById('prop-code').value = block.code || '';
}

function hideBlockProperties() {
  document.getElementById('no-selection').classList.remove('hidden');
  document.getElementById('block-properties').classList.add('hidden');
}

function updateSelectedBlock() {
  if (!state.selectedBlock) return;
  
  const updates = {
    label: document.getElementById('prop-label').value,
    description: document.getElementById('prop-description').value,
    code: document.getElementById('prop-code').value
  };
  
  Object.assign(state.selectedBlock, updates);
  
  // Update UI
  const blockEl = document.getElementById(`block-${state.selectedBlock.id}`);
  if (blockEl) {
    blockEl.querySelector('.block-title').innerHTML = `
      <i class="fas ${state.selectedBlock.icon || 'fa-cube'}"></i>
      ${updates.label}
    `;
    blockEl.querySelector('.block-content').textContent = updates.description;
  }
  
  // Update code
  updateGeneratedCode();
  
  // Emit to server
  if (state.socket) {
    state.socket.emit('block:update', {
      id: state.selectedBlock.id,
      updates
    });
  }
  
  showToast('Block updated!', 'success');
}

function deleteSelectedBlock() {
  if (!state.selectedBlock) return;
  deleteBlock(state.selectedBlock.id);
}

function deleteBlock(blockId) {
  const blockIndex = state.blocks.findIndex(b => b.id === blockId);
  if (blockIndex === -1) return;
  
  const block = state.blocks[blockIndex];
  
  // Remove from DOM
  const blockEl = document.getElementById(`block-${blockId}`);
  if (blockEl) {
    blockEl.remove();
  }
  
  // Remove from state
  state.blocks.splice(blockIndex, 1);
  
  // Remove connections
  state.connections = state.connections.filter(
    c => c.from !== blockId && c.to !== blockId
  );
  
  // Deselect if needed
  if (state.selectedBlock?.id === blockId) {
    deselectBlock();
  }
  
  // Update code
  updateGeneratedCode();
  
  // Emit to server
  if (state.socket) {
    state.socket.emit('block:delete', blockId);
  }
  
  // Show placeholder if empty
  if (state.blocks.length === 0) {
    document.querySelector('.workspace-placeholder').style.display = 'block';
  }
}

function removeBlockFromWorkspace(blockId) {
  const blockEl = document.getElementById(`block-${blockId}`);
  if (blockEl) {
    blockEl.remove();
  }
  
  state.blocks = state.blocks.filter(b => b.id !== blockId);
  state.connections = state.connections.filter(
    c => c.from !== blockId && c.to !== blockId
  );
  
  if (state.selectedBlock?.id === blockId) {
    deselectBlock();
  }
  
  updateGeneratedCode();
}

function updateBlockInWorkspace(block) {
  const existingBlock = state.blocks.find(b => b.id === block.id);
  if (existingBlock) {
    Object.assign(existingBlock, block);
    
    const blockEl = document.getElementById(`block-${block.id}`);
    if (blockEl) {
      blockEl.querySelector('.block-title').innerHTML = `
        <i class="fas ${block.icon || 'fa-cube'}"></i>
        ${block.label}
      `;
      blockEl.querySelector('.block-content').textContent = block.description || '';
      
      if (block.position) {
        blockEl.style.left = `${block.position.x}px`;
        blockEl.style.top = `${block.position.y}px`;
      }
    }
    
    updateGeneratedCode();
  }
}

function clearWorkspace() {
  if (!confirm('Are you sure you want to clear all blocks?')) return;
  
  state.blocks.forEach(block => {
    if (state.socket) {
      state.socket.emit('block:delete', block.id);
    }
  });
  
  state.blocks = [];
  state.connections = [];
  state.selectedBlock = null;
  
  document.getElementById('blocks-container').innerHTML = `
    <div class="workspace-placeholder">
      <i class="fas fa-hand-pointer"></i>
      <p>Drag blocks here to build your script</p>
      <span>or use AI Assist to generate code</span>
    </div>
  `;
  
  hideBlockProperties();
  updateGeneratedCode();
  
  showToast('Workspace cleared', 'info');
}

function loadBlocks(blocks) {
  clearWorkspace();
  
  blocks.forEach(block => {
    addBlockToWorkspace(block, false);
  });
  
  // Restore connections
  if (state.currentProject?.connections) {
    state.connections = state.currentProject.connections;
    drawConnections();
  }
}

function zoomWorkspace(delta) {
  state.zoom = Math.max(0.5, Math.min(2, state.zoom + delta));
  document.getElementById('blocks-container').style.transform = `scale(${state.zoom})`;
}

function fitWorkspace() {
  state.zoom = 1;
  document.getElementById('blocks-container').style.transform = 'scale(1)';
}

function switchWorkspaceView(view) {
  state.view = view;
  const blockWorkspace = document.querySelector('.block-workspace');
  const codePanel = document.getElementById('code-panel');
  
  if (view === 'visual') {
    blockWorkspace.style.display = 'block';
    codePanel.classList.add('hidden');
    blockWorkspace.style.width = '100%';
  } else if (view === 'code') {
    blockWorkspace.style.display = 'none';
    codePanel.classList.remove('hidden');
    codePanel.style.width = '100%';
  } else if (view === 'split') {
    blockWorkspace.style.display = 'block';
    blockWorkspace.style.width = '50%';
    codePanel.classList.remove('hidden');
    codePanel.style.width = '50%';
  }
  
  updateGeneratedCode();
}

function updateConnections() {
  // Draw SVG connection lines between connected blocks
  const svg = document.getElementById('connections-layer');
  svg.innerHTML = '';
  
  state.connections.forEach(conn => {
    const fromBlock = document.getElementById(`block-${conn.from}`);
    const toBlock = document.getElementById(`block-${conn.to}`);
    
    if (fromBlock && toBlock) {
      const fromRect = fromBlock.getBoundingClientRect();
      const toRect = toBlock.getBoundingClientRect();
      const containerRect = document.getElementById('blocks-container').getBoundingClientRect();
      
      const x1 = (fromRect.left + fromRect.width / 2 - containerRect.left) / state.zoom;
      const y1 = (fromRect.bottom - containerRect.top) / state.zoom;
      const x2 = (toRect.left + toRect.width / 2 - containerRect.left) / state.zoom;
      const y2 = (toRect.top - containerRect.top) / state.zoom;
      
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', `M ${x1} ${y1} C ${x1} ${y1 + 50}, ${x2} ${y2 - 50}, ${x2} ${y2}`);
      path.setAttribute('class', 'connection-line');
      svg.appendChild(path);
    }
  });
}

function drawConnections() {
  updateConnections();
}

// ==================== CODE GENERATION ====================
function updateGeneratedCode() {
  // Generate Luau code from blocks
  let code = '-- Generated by LuaScratch\n';
  code += `-- Project: ${state.currentProject?.name || 'Untitled'}\n`;
  code += `-- Generated at: ${new Date().toLocaleString()}\n\n`;
  
  if (state.blocks.length === 0) {
    code += '-- No blocks in workspace yet. Drag blocks to start building!\n';
  } else {
    // Sort blocks by connections (topological sort)
    const sortedBlocks = sortBlocksByConnections();
    
    sortedBlocks.forEach(block => {
      code += generateBlockCode(block);
      code += '\n';
    });
  }
  
  document.getElementById('code-editor').textContent = code;
  
  return code;
}

function sortBlocksByConnections() {
  // Simple sort: blocks with no parents first
  const result = [];
  const visited = new Set();
  
  // First add blocks with no parents
  state.blocks.filter(b => !b.parentId).forEach(block => {
    addBlockAndChildren(block, result, visited);
  });
  
  // Add any remaining blocks
  state.blocks.forEach(block => {
    if (!visited.has(block.id)) {
      result.push(block);
    }
  });
  
  return result;
}

function addBlockAndChildren(block, result, visited) {
  if (visited.has(block.id)) return;
  
  visited.add(block.id);
  result.push(block);
  
  // Add children recursively
  if (block.children) {
    block.children.forEach(childId => {
      const child = state.blocks.find(b => b.id === childId);
      if (child) {
        addBlockAndChildren(child, result, visited);
      }
    });
  }
}

function generateBlockCode(block) {
  let code = '';
  
  // Add comment with block info
  code += `-- ${block.label}\n`;
  
  // Add the actual code
  if (block.code) {
    code += block.code;
  } else {
    code += `-- TODO: Implement ${block.label}`;
  }
  
  return code;
}

function copyCodeToClipboard() {
  const code = document.getElementById('code-editor').textContent;
  navigator.clipboard.writeText(code).then(() => {
    showToast('Code copied to clipboard!', 'success');
  }).catch(() => {
    showToast('Failed to copy code', 'error');
  });
}

// ==================== EXECUTION ====================
function executeCode() {
  if (!state.robloxConnected) {
    showToast('Roblox Studio is not connected!', 'error');
    logToConsole('Error: Roblox Studio not connected. Install the LuaScratch plugin.', 'error');
    return;
  }
  
  const code = updateGeneratedCode();
  
  if (state.socket) {
    state.socket.emit('roblox:execute', {
      code,
      autoTest: true
    });
  }
  
  logToConsole('Executing code in Roblox Studio...', 'info');
}

// ==================== AI INTEGRATION ====================
function showAILoading(message, stage) {
  const overlay = document.getElementById('ai-loading-overlay');
  const messageEl = document.getElementById('ai-loading-message');
  
  overlay.classList.remove('hidden');
  messageEl.textContent = message;
  
  // Update stages
  document.querySelectorAll('.stage').forEach(s => {
    s.classList.toggle('active', s.dataset.stage === stage);
  });
}

function hideAILoading() {
  document.getElementById('ai-loading-overlay').classList.add('hidden');
}

function sendAIPrompt() {
  const promptInput = document.getElementById('ai-prompt');
  const prompt = promptInput.value.trim();
  
  if (!prompt) {
    showToast('Please enter a prompt', 'warning');
    return;
  }
  
  // Add user message to chat
  addAIChatMessage('user', prompt);
  
  // Clear input
  promptInput.value = '';
  
  // Send to server
  if (state.socket) {
    state.socket.emit('ai:generate', {
      prompt,
      mode: 'generate'
    });
  }
}

function requestAIIdeas() {
  const promptInput = document.getElementById('ai-prompt');
  const context = promptInput.value.trim() || 'My Roblox game';
  
  if (state.socket) {
    state.socket.emit('ai:ideate', { context });
  }
}

function addAIChatMessage(sender, message) {
  const container = document.getElementById('ai-chat-messages');
  
  const messageDiv = document.createElement('div');
  messageDiv.className = sender === 'user' ? 'user-message' : 'ai-message';
  
  messageDiv.innerHTML = `
    <div class="message-bubble">
      <p>${escapeHtml(message)}</p>
    </div>
  `;
  
  container.appendChild(messageDiv);
  container.scrollTop = container.scrollHeight;
}

function showAIResponse(data) {
  document.getElementById('ai-generated-code').textContent = data.code;
  document.getElementById('ai-explanation-text').innerHTML = formatExplanation(data.explanation);
  
  // Show suggested blocks
  const blocksContainer = document.getElementById('ai-suggested-blocks');
  if (data.blocks && data.blocks.length > 0) {
    blocksContainer.innerHTML = data.blocks.map(block => `
      <div class="palette-block block-${block.category || 'roblox'}" style="margin-bottom: 8px;">
        <i class="fas fa-cube"></i>
        <span>${block.label}</span>
      </div>
    `).join('');
  } else {
    blocksContainer.innerHTML = '<p class="empty-state">No specific blocks suggested</p>';
  }
  
  openModal('ai-response-modal');
}

function showAIFixResponse(data) {
  document.getElementById('ai-generated-code').textContent = data.code;
  document.getElementById('ai-explanation-text').innerHTML = `
    <div class="console-message success">
      <span class="message">Fixed! ${formatExplanation(data.explanation)}</span>
    </div>
  `;
  
  // Switch to code tab
  document.querySelectorAll('.ai-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.ai-tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelector('[data-ai-tab="code"]').classList.add('active');
  document.getElementById('ai-code-panel').classList.add('active');
  
  openModal('ai-response-modal');
  showToast('Code fixed by AI!', 'success');
}

function showAIIdeas(data) {
  let ideasHtml = '<h4>Here are some ideas:</h4><ul>';
  data.ideas.forEach(idea => {
    ideasHtml += `<li>${escapeHtml(idea)}</li>`;
  });
  ideasHtml += '</ul>';
  
  addAIChatMessage('ai', ideasHtml);
}

function applyAICode() {
  const code = document.getElementById('ai-generated-code').textContent;
  
  // Create a new block with the AI code
  const newBlock = {
    id: generateId(),
    type: 'ai_generated',
    category: 'roblox',
    label: 'AI Generated Code',
    icon: 'fa-robot',
    code: code,
    description: 'Code generated by AI',
    position: { x: 100, y: 100 }
  };
  
  addBlockToWorkspace(newBlock);
  closeAllModals();
  showToast('AI code applied to workspace!', 'success');
}

function executeAICode() {
  if (!state.robloxConnected) {
    showToast('Roblox Studio is not connected!', 'error');
    return;
  }
  
  const code = document.getElementById('ai-generated-code').textContent;
  
  if (state.socket) {
    state.socket.emit('roblox:execute', {
      code,
      autoTest: true
    });
  }
  
  closeAllModals();
  showToast('Executing AI code in Roblox...', 'info');
}

function showAutoFixOption(error) {
  const code = updateGeneratedCode();
  
  // Show toast with fix option
  const toast = document.createElement('div');
  toast.className = 'toast warning';
  toast.innerHTML = `
    <i class="fas fa-exclamation-triangle toast-icon"></i>
    <span class="toast-message">Error detected! Auto-fix with AI?</span>
    <button class="btn btn-ai" onclick="requestAIFix()">Fix</button>
    <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
  `;
  
  document.getElementById('toast-container').appendChild(toast);
  
  // Store error for fix request
  state.lastError = error;
  state.lastCode = code;
}

function requestAIFix() {
  if (state.socket && state.lastError && state.lastCode) {
    state.socket.emit('ai:fix', {
      code: state.lastCode,
      error: state.lastError.message
    });
    
    // Remove the toast
    document.querySelector('.toast.warning')?.remove();
  }
}

function openAIChat() {
  document.querySelector('[data-panel="ai-chat"]').click();
}

// ==================== PROJECTS ====================
function createNewProject() {
  const name = document.getElementById('project-name').value.trim();
  const description = document.getElementById('project-description').value.trim();
  
  if (!name) {
    showToast('Please enter a project name', 'warning');
    return;
  }
  
  if (state.socket) {
    state.socket.emit('project:create', { name, description });
  }
  
  closeAllModals();
  
  // Reset form
  document.getElementById('project-name').value = '';
  document.getElementById('project-description').value = '';
}

function editCurrentProject() {
  openModal('new-project-modal');
  if (state.currentProject) {
    document.getElementById('project-name').value = state.currentProject.name;
    document.getElementById('project-description').value = state.currentProject.description || '';
  }
}

function updateProjectDisplay() {
  const nameEl = document.getElementById('current-project-name');
  if (state.currentProject) {
    nameEl.textContent = state.currentProject.name;
    nameEl.title = state.currentProject.description || '';
  } else {
    nameEl.textContent = 'No Project';
    nameEl.title = '';
  }
}

function updateProjectsList(projects) {
  const grid = document.getElementById('projects-grid');
  
  if (projects.length === 0) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column: 1/-1;">
        <i class="fas fa-folder-open"></i>
        <p>No projects yet</p>
        <span>Create your first project to get started</span>
      </div>
    `;
    return;
  }
  
  grid.innerHTML = projects.map(project => `
    <div class="project-card" onclick="loadProject('${project.id}')">
      <h4>${escapeHtml(project.name)}</h4>
      <p>${escapeHtml(project.description || 'No description')}</p>
      <div class="project-date">${new Date(project.createdAt).toLocaleDateString()}</div>
    </div>
  `).join('');
}

function loadProject(projectId) {
  if (state.socket) {
    state.socket.emit('project:load', projectId);
  }
  closeAllModals();
}

function handleNavTab(tab) {
  if (tab === 'projects') {
    if (state.socket) {
      state.socket.emit('project:list');
    }
    openModal('projects-modal');
  }
}

// ==================== CONSOLE ====================
function logToConsole(message, type = 'log', source = 'system') {
  const consoleOutput = document.getElementById('console-output');
  
  const entry = document.createElement('div');
  entry.className = `console-message ${type}`;
  
  const timestamp = new Date().toLocaleTimeString();
  const sourceLabel = source !== 'system' ? `[${source}] ` : '';
  
  entry.innerHTML = `
    <span class="timestamp">[${timestamp}]</span>
    <span class="message">${sourceLabel}${escapeHtml(message)}</span>
  `;
  
  consoleOutput.appendChild(entry);
  consoleOutput.scrollTop = consoleOutput.scrollHeight;
  
  // Store message
  state.consoleMessages.push({ message, type, source, timestamp });
}

function clearConsole() {
  document.getElementById('console-output').innerHTML = '';
  state.consoleMessages = [];
}

function filterConsole(filter) {
  const messages = document.querySelectorAll('.console-message');
  
  messages.forEach(msg => {
    if (filter === 'all') {
      msg.style.display = 'flex';
    } else {
      msg.style.display = msg.classList.contains(filter) ? 'flex' : 'none';
    }
  });
}

// ==================== FILE TREE ====================
function updateFileTree(tree) {
  // This would update a file tree view in the workspace tab
  console.log('[LuaScratch] File tree updated:', tree);
}

// ==================== UI HELPERS ====================
function openModal(modalId) {
  document.getElementById(modalId).classList.remove('hidden');
}

function closeAllModals() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.classList.add('hidden');
  });
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  const icons = {
    success: 'fa-check-circle',
    error: 'fa-times-circle',
    warning: 'fa-exclamation-triangle',
    info: 'fa-info-circle'
  };
  
  toast.innerHTML = `
    <i class="fas ${icons[type]} toast-icon"></i>
    <span class="toast-message">${escapeHtml(message)}</span>
    <button class="toast-close" onclick="this.parentElement.remove()">
      <i class="fas fa-times"></i>
    </button>
  `;
  
  container.appendChild(toast);
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

function updateRobloxStatus() {
  const statusEl = document.getElementById('roblox-status');
  const dot = statusEl.querySelector('.status-dot');
  const text = statusEl.querySelector('.status-text');
  
  if (state.robloxConnected) {
    dot.classList.remove('disconnected');
    dot.classList.add('connected');
    text.textContent = 'Roblox: Connected';
  } else {
    dot.classList.remove('connected');
    dot.classList.add('disconnected');
    text.textContent = 'Roblox: Disconnected';
  }
}

function handleKeyboard(e) {
  // Delete key
  if (e.key === 'Delete' && state.selectedBlock) {
    deleteSelectedBlock();
  }
  
  // Escape key
  if (e.key === 'Escape') {
    deselectBlock();
    closeAllModals();
  }
  
  // Ctrl/Cmd + Enter to run
  if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
    executeCode();
  }
  
  // Ctrl/Cmd + S to save
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    showToast('Project auto-saves!', 'info');
  }
}

// ==================== UTILITIES ====================
function generateId() {
  return 'block_' + Math.random().toString(36).substr(2, 9);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatExplanation(text) {
  if (!text) return '';
  return text
    .replace(/\n/g, '<br>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
}

// Make functions available globally for onclick handlers
window.editBlock = (id) => {
  const block = state.blocks.find(b => b.id === id);
  if (block) selectBlock(block);
};

window.deleteBlock = (id) => {
  deleteBlock(id);
};

window.loadProject = (id) => {
  loadProject(id);
};

window.requestAIFix = () => {
  requestAIFix();
};

console.log('[LuaScratch] Application loaded');
