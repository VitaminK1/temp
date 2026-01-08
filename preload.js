const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // 위치 변경
  changePosition: () => {
    ipcRenderer.send('change-position');
  },

  // 중앙으로 이동
  changePositionCenter: () => {
    ipcRenderer.send('change-position-center');
  },

  // 모서리로 이동
  changePositionCorner: (corner) => {
    ipcRenderer.send('change-position-corner', corner);
  },
  
  // 로그 전송
  log: (message) => {
    ipcRenderer.send('log-message', message);
  },
  
  // 에러 로그 전송
  logError: (error) => {
    ipcRenderer.send('log-error', error);
  },

  // 설정 업데이트
  updateSettings: (settings) => {
    ipcRenderer.send('update-settings', settings);
  },

  // 설정 변경 리스너
  onSettingsChanged: (callback) => {
    ipcRenderer.on('settings-changed', (event, settings) => callback(settings));
  },

  // 애니메이션 정보 요청
  requestAnimationInfo: () => {
    ipcRenderer.send('request-animation-info');
  },

  // 애니메이션 정보 전송
  sendAnimationInfo: (info) => {
    ipcRenderer.send('animation-info', info);
  },

  // 애니메이션 정보 수신
  onAnimationInfoReceived: (callback) => {
    ipcRenderer.on('animation-info-received', (event, info) => callback(info));
  },

  // 애니메이션 정보 요청 수신
  onGetAnimationInfo: (callback) => {
    ipcRenderer.on('get-animation-info', () => callback());
  },

  // 특정 애니메이션 재생
  playAnimation: (animationName) => {
    ipcRenderer.send('play-animation', animationName);
  },

  // 특정 애니메이션 재생 수신
  onPlayAnimation: (callback) => {
    ipcRenderer.on('play-specific-animation', (event, animationName) => callback(animationName));
  },

  // 스킨 변경
  changeSkin: (skinName) => {
    ipcRenderer.send('change-skin', skinName);
  },

  // 스킨 변경 수신
  onChangeSkin: (callback) => {
    ipcRenderer.on('change-skin', (event, skinName) => callback(skinName));
  },

  // 애니메이션 중지
  stopAnimation: () => {
    ipcRenderer.send('stop-animation');
  },

  // 애니메이션 중지 수신
  onStopAnimation: (callback) => {
    ipcRenderer.on('stop-animation', () => callback());
  },

  // 컨트롤 창 토글
  toggleControlWindow: () => {
    ipcRenderer.send('toggle-control-window');
  },
  
  // 애플리케이션 종료
  quitApp: () => {
    ipcRenderer.send('quit-app');
  },

  // === 이동 모드 관련 ===
  
  // 이동 모드 토글
  toggleMovementMode: () => {
    ipcRenderer.send('toggle-movement-mode');
  },

  // 이동 모드 상태 요청
  getMovementMode: () => {
    ipcRenderer.send('get-movement-mode');
  },

  // 이동 모드 변경 수신 (메인 창용)
  onMovementModeChanged: (callback) => {
    ipcRenderer.on('movement-mode-changed', (event, isEnabled) => callback(isEnabled));
  },

  // 이동 모드 상태 수신 (컨트롤 창용)
  onMovementModeStatus: (callback) => {
    ipcRenderer.on('movement-mode-status', (event, isEnabled) => callback(isEnabled));
  },

  // === 크기 조절 관련 ===
  
  // 크기 변경
  changeScale: (scale) => {
    ipcRenderer.send('change-scale', scale);
  },

  // 현재 크기 요청
  getCurrentScale: () => {
    ipcRenderer.send('get-current-scale');
  },

  // 크기 변경 수신 (메인 창용)
  onScaleChanged: (callback) => {
    ipcRenderer.on('scale-changed', (event, scale) => callback(scale));
  },

  // 현재 크기 수신 (컨트롤 창용)
  onCurrentScale: (callback) => {
    ipcRenderer.on('current-scale', (event, scale) => callback(scale));
  },

  // === 캐릭터 표시/숨김 관련 ===
  
  // 캐릭터 표시/숨김 토글
  toggleCharacterVisibility: () => {
    ipcRenderer.send('toggle-character-visibility');
  },

  // 캐릭터 표시 상태 요청
  getCharacterVisibility: () => {
    ipcRenderer.send('get-character-visibility');
  },

  // 캐릭터 표시 상태 변경 수신 (메인 창용)
  onVisibilityChanged: (callback) => {
    ipcRenderer.on('visibility-changed', (event, isVisible) => callback(isVisible));
  },

  // 캐릭터 표시 상태 수신 (컨트롤 창용)
  onVisibilityStatus: (callback) => {
    ipcRenderer.on('visibility-status', (event, isVisible) => callback(isVisible));
  }
  ,
  // 창의 마우스 이벤트 무시 설정 (렌더러에서 픽셀 단위로 호출)
  // Accepts second parameter `options` which will be forwarded to main (e.g. { forward: true })
  setIgnoreMouseEvents: (ignore, options) => {
    ipcRenderer.send('set-ignore-mouse', { ignore: Boolean(ignore), options: options || {} });
  }
  ,
  toggleDevToolsMain: () => {
    ipcRenderer.send('toggle-devtools-main');
  },
  
  toggleDevToolsControl: () => {
    ipcRenderer.send('toggle-devtools-control');
  }
});

console.log('Preload script loaded for Ashur animation');