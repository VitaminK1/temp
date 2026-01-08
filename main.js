const { app, BrowserWindow, screen, ipcMain, Menu, globalShortcut } = require('electron');
const path = require('path');

let mainWindow;
let controlWindow;
let isMovementMode = false;
let currentScale = 1.0;
let isCharacterHidden = false;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  const windowWidth = 500;
  const windowHeight = 500;
  
  const startX = Math.floor(Math.random() * (width - windowWidth));
  const startY = Math.floor(Math.random() * (height - windowHeight));
  
  mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: startX,
    y: startY,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    movable: true,
    minimizable: false,
    maximizable: false,
    focusable: true,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
      devTools: true
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));

  // Windows에서 최상위 레벨 설정
  if (process.platform === 'win32') {
    mainWindow.setAlwaysOnTop(true, 'screen-saver');
    mainWindow.setSkipTaskbar(true);
  }
  
  // 초기에는 마우스 이벤트 무시하지 않음
  mainWindow.setIgnoreMouseEvents(false);

  Menu.setApplicationMenu(null);

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer]: ${message}`);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (controlWindow && !controlWindow.isDestroyed()) {
      controlWindow.close();
    }
  });

  setupIpcHandlers();

  mainWindow.webContents.on('crashed', (event, killed) => {
    console.error('창이 충돌했습니다:', killed);
  });

  mainWindow.webContents.on('render-process-gone', (event, details) => {
    console.error('렌더 프로세스 종료:', details);
  });

  mainWindow.webContents.on('unresponsive', () => {
    console.warn('창이 응답하지 않습니다');
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Ashur 애니메이션 로드 완료');
    createControlWindow();
    registerGlobalShortcuts();
    
    // 히트 테스트 설정 (중요!)
    setupHitTest();
  });
}

function createControlWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  
  controlWindow = new BrowserWindow({
    width: 340,
    height: 740,  // 숨김 버튼 공간 추가
    x: width - 360,
    y: 20,
    frame: true,
    transparent: false,
    alwaysOnTop: true,
    resizable: false,
    minimizable: true,
    maximizable: false,
    skipTaskbar: false,
    title: 'Ashur 애니메이션 컨트롤',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  controlWindow.loadFile(path.join(__dirname, 'renderer', 'control.html'));

  controlWindow.on('closed', () => {
    controlWindow = null;
  });
}

function registerGlobalShortcuts() {
  globalShortcut.register('Alt+M', () => {
    toggleMovementMode();
  });
  
  globalShortcut.register('Alt+H', () => {
    toggleCharacterVisibility();
  });
  
  console.log('단축키 등록 완료: Alt+M (이동 모드), Alt+H (캐릭터 숨김)');
}

function toggleMovementMode() {
  isMovementMode = !isMovementMode;
  isInMovementMode = isMovementMode; // 전역 상태 동기화
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('movement-mode-changed', isMovementMode);
    console.log(`이동 모드: ${isMovementMode ? '활성화' : '비활성화'}`);
    
    // 이동 모드일 때는 전체 창 드래그 가능
    if (isMovementMode) {
      mainWindow.setIgnoreMouseEvents(false);
    }
    
    if (controlWindow && !controlWindow.isDestroyed()) {
      controlWindow.webContents.send('movement-mode-status', isMovementMode);
    }
  }
}

function toggleCharacterVisibility() {
  isCharacterHidden = !isCharacterHidden;
  isCharacterVisible = !isCharacterHidden; // 전역 상태 동기화
  
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('visibility-changed', !isCharacterHidden);
    console.log(`캐릭터 표시: ${isCharacterHidden ? '숨김' : '표시'}`);
    
    // 캐릭터가 숨겨지면 클릭 통과
    if (isCharacterHidden) {
      mainWindow.setIgnoreMouseEvents(true, { forward: true });
    } else {
      mainWindow.setIgnoreMouseEvents(false);
    }
    
    if (controlWindow && !controlWindow.isDestroyed()) {
      controlWindow.webContents.send('visibility-status', !isCharacterHidden);
    }
  }
}

function changePositionRandom() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const windowWidth = mainWindow.getBounds().width;
    const windowHeight = mainWindow.getBounds().height;
    
    const newX = Math.floor(Math.random() * (width - windowWidth));
    const newY = Math.floor(Math.random() * (height - windowHeight));
    
    mainWindow.setPosition(newX, newY, true);
    console.log(`랜덤 위치 이동: (${newX}, ${newY})`);
  }
}

function changePositionCenter() {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const windowWidth = mainWindow.getBounds().width;
    const windowHeight = mainWindow.getBounds().height;
    
    const centerX = Math.floor((width - windowWidth) / 2);
    const centerY = Math.floor((height - windowHeight) / 2);
    
    mainWindow.setPosition(centerX, centerY, true);
    console.log(`중앙으로 이동: (${centerX}, ${centerY})`);
  }
}

function changePositionCorner(corner) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    const { width, height } = screen.getPrimaryDisplay().workAreaSize;
    const windowWidth = mainWindow.getBounds().width;
    const windowHeight = mainWindow.getBounds().height;
    
    const margin = 20;
    let newX, newY;
    
    switch(corner) {
      case 'top-left':
        newX = margin;
        newY = margin;
        break;
      case 'top-right':
        newX = width - windowWidth - margin;
        newY = margin;
        break;
      case 'bottom-left':
        newX = margin;
        newY = height - windowHeight - margin;
        break;
      case 'bottom-right':
        newX = width - windowWidth - margin;
        newY = height - windowHeight - margin;
        break;
      default:
        return;
    }
    
    mainWindow.setPosition(newX, newY, true);
    console.log(`${corner}로 이동: (${newX}, ${newY})`);
  }
}

let isInMovementMode = false;
let isCharacterVisible = true;

function setupHitTest() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  
  if (process.platform === 'win32') {
    // Windows: hookWindowMessage 사용
    mainWindow.hookWindowMessage(0x0084, () => {
      if (isInMovementMode || !isCharacterVisible) {
        mainWindow.setIgnoreMouseEvents(false);
      }
    });
    console.log('✅ Windows 히트 테스트 설정 완료');
  } else {
    // macOS/Linux: 간단한 영역 기반 처리
    console.log('⚠️ macOS/Linux에서는 전체 창이 드래그 가능합니다');
    mainWindow.setIgnoreMouseEvents(false);
  }
}

function setupIpcHandlers() {
  // 랜덤 위치 변경
  ipcMain.on('change-position', () => {
    changePositionRandom();
  });

  // 중앙으로 이동
  ipcMain.on('change-position-center', () => {
    changePositionCenter();
  });

  // 모서리로 이동
  ipcMain.on('change-position-corner', (event, corner) => {
    changePositionCorner(corner);
  });

  // 이동 모드 토글
  ipcMain.on('toggle-movement-mode', () => {
    toggleMovementMode();
  });

  // 이동 모드 상태 요청
  ipcMain.on('get-movement-mode', (event) => {
    event.reply('movement-mode-status', isMovementMode);
  });

  // 캐릭터 표시/숨김 토글
  ipcMain.on('toggle-character-visibility', () => {
    toggleCharacterVisibility();
  });

  // 캐릭터 표시 상태 요청
  ipcMain.on('get-character-visibility', (event) => {
    event.reply('visibility-status', !isCharacterHidden);
  });

  // 크기 변경 (30% ~ 100%)
  ipcMain.on('change-scale', (event, scale) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      // 범위 제한: 0.3 ~ 1.0
      currentScale = Math.max(0.3, Math.min(1.0, scale));
      mainWindow.webContents.send('scale-changed', currentScale);
      console.log(`크기 변경: ${(currentScale * 100).toFixed(0)}%`);
    }
  });

  // 현재 크기 요청
  ipcMain.on('get-current-scale', (event) => {
    event.reply('current-scale', currentScale);
  });

  ipcMain.on('log-message', (event, message) => {
    console.log(`[Ashur]: ${message}`);
  });

  ipcMain.on('log-error', (event, error) => {
    console.error(`[Ashur Error]: ${error}`);
  });

  ipcMain.on('update-settings', (event, settings) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('settings-changed', settings);
      console.log('설정 업데이트:', settings);
    }
  });

  ipcMain.on('request-animation-info', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('get-animation-info');
    }
  });

  ipcMain.on('animation-info', (event, info) => {
    if (controlWindow && !controlWindow.isDestroyed()) {
      controlWindow.webContents.send('animation-info-received', info);
    }
  });

  ipcMain.on('play-animation', (event, animationName) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('play-specific-animation', animationName);
    }
  });

  ipcMain.on('change-skin', (event, skinName) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('change-skin', skinName);
    }
  });

  ipcMain.on('stop-animation', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('stop-animation');
    }
  });

  ipcMain.on('toggle-control-window', () => {
    if (controlWindow) {
      if (controlWindow.isVisible()) {
        controlWindow.hide();
      } else {
        controlWindow.show();
      }
    } else {
      createControlWindow();
    }
  });

  ipcMain.on('toggle-devtools-main', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.webContents.isDevToolsOpened()) {
        mainWindow.webContents.closeDevTools();
        console.log('메인 창 개발자 도구 닫기');
      } else {
        mainWindow.webContents.openDevTools({ mode: 'detach' });
        console.log('메인 창 개발자 도구 열기');
      }
    }
  });

  // 개발자 도구 토글 (컨트롤 창)
  ipcMain.on('toggle-devtools-control', () => {
    if (controlWindow && !controlWindow.isDestroyed()) {
      if (controlWindow.webContents.isDevToolsOpened()) {
        controlWindow.webContents.closeDevTools();
        console.log('컨트롤 창 개발자 도구 닫기');
      } else {
        controlWindow.webContents.openDevTools({ mode: 'detach' });
        console.log('컨트롤 창 개발자 도구 열기');
      }
    }
  });

  ipcMain.on('quit-app', () => {
    console.log('Quit requested from control window');
    app.quit();
  });

  // Renderer 요청: 창의 마우스 이벤트 무시 설정 (픽셀 단위 통과 처리용)
  ipcMain.on('set-ignore-mouse', (event, payload) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      try {
        let ignoreVal = false;
        let opts = { forward: true };

        if (typeof payload === 'object' && payload !== null) {
          ignoreVal = Boolean(payload.ignore);
          if (payload.options && typeof payload.options === 'object') {
            opts = { ...opts, ...payload.options };
          }
        } else {
          ignoreVal = Boolean(payload);
        }

        // forward 옵션 보장
        if (!Object.prototype.hasOwnProperty.call(opts, 'forward')) {
          opts.forward = true;
        }

        mainWindow.setIgnoreMouseEvents(ignoreVal, opts);
        console.log('setIgnoreMouseEvents ->', ignoreVal, opts);
      } catch (err) {
        console.error('setIgnoreMouseEvents 실패', err);
      }
    }
  });

}

app.whenReady().then(() => {
  app.commandLine.appendSwitch('enable-transparent-visuals');
  app.commandLine.appendSwitch('disable-gpu-vsync');
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('before-quit', () => {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.destroy();
  }
  if (controlWindow && !controlWindow.isDestroyed()) {
    controlWindow.destroy();
  }
});

process.on('uncaughtException', (error) => {
  console.error('처리되지 않은 예외:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('처리되지 않은 Promise 거부:', reason);
});