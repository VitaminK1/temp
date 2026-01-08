/**
 * Ashur 컨트롤 패널 (이동 모드 + 크기 조절 + 숨김)
 */

class ControlPanel {
  constructor() {
    this.animations = [];
    this.skins = [];
    this.currentSettings = {};
    this.api = window.electronAPI || null;
    this.updateTimeout = null;
    this.isMovementMode = false;
    this.currentScale = 1.0;
    this.isVisible = true;

    this.log('컨트롤 패널 초기화 시작');
    
    this.initElements();
    this.setupEventListeners();
    this.requestAnimationInfo();
    this.requestMovementModeStatus();
    this.requestCurrentScale();
    this.requestVisibilityStatus();
  }

  initElements() {
    // 상태 표시
    this.currentAnimationEl = this.getElement('current-animation');
    this.currentSkinEl = this.getElement('current-skin');
    this.movementModeStatusEl = this.getElement('movement-mode-status');
    this.visibilityStatusEl = this.getElement('visibility-status');

    // 선택 박스
    this.skinSelect = this.getElement('skin-select');
    this.animationSelect = this.getElement('animation-select');

    // 버튼
    this.toggleMovementModeBtn = this.getElement('toggle-movement-mode');
    this.movementButtonText = this.getElement('movement-button-text');
    this.toggleVisibilityBtn = this.getElement('toggle-visibility');
    this.visibilityButtonText = this.getElement('visibility-button-text');
    this.quitAppBtn = this.getElement('quit-app');
    
    // 개발자 도구 버튼 추가
    this.toggleDevToolsMainBtn = this.getElement('toggle-devtools-main');
    this.toggleDevToolsControlBtn = this.getElement('toggle-devtools-control');

    // 크기 조절
    this.scaleSlider = this.getElement('scale-slider');
    this.scaleValue = this.getElement('scale-value');

    // 설정 입력
    this.autoPlayCheck = this.getElement('auto-play');

    this.validateElements();
  }

  getElement(id) {
    const element = document.getElementById(id);
    if (!element) {
      console.warn(`요소를 찾을 수 없습니다: ${id}`);
    }
    return element;
  }

  validateElements() {
    const requiredElements = [
      'currentAnimationEl', 'currentSkinEl', 'skinSelect', 
      'animationSelect', 'autoPlayCheck',
      'toggleMovementModeBtn', 'movementModeStatusEl',
      'scaleSlider', 'scaleValue',
      'toggleVisibilityBtn', 'visibilityStatusEl'
    ];

    const missing = requiredElements.filter(name => !this[name]);
    
    if (missing.length > 0) {
      console.error('누락된 DOM 요소:', missing);
    }
  }

  setupEventListeners() {
    // 애니메이션 정보 수신
    if (this.api) {
      this.api.onAnimationInfoReceived((info) => {
        this.updateAnimationInfo(info);
      });

      // 이동 모드 상태 수신
      this.api.onMovementModeStatus((isEnabled) => {
        this.updateMovementModeUI(isEnabled);
      });

      // 현재 크기 수신
      this.api.onCurrentScale((scale) => {
        this.updateScaleUI(scale);
      });

      // 캐릭터 표시 상태 수신
      this.api.onVisibilityStatus((isVisible) => {
        this.updateVisibilityUI(isVisible);
      });
    }

    // 스킨 선택 즉시 적용
    if (this.skinSelect) {
      this.skinSelect.addEventListener('change', () => {
        const val = this.skinSelect.value;
        if (val && this.api) {
          this.api.changeSkin(val);
          this.log(`스킨 변경 요청(선택): ${val}`);
        }
      });
    }

    // 애니메이션 선택 즉시 재생
    if (this.animationSelect) {
      this.animationSelect.addEventListener('change', () => {
        const val = this.animationSelect.value;
        if (val && this.api) {
          this.api.playAnimation(val);
          this.log(`애니메이션 재생 요청(선택): ${val}`);
        }
      });
    }

    // 크기 조절 슬라이더
    if (this.scaleSlider) {
      this.scaleSlider.addEventListener('input', (e) => {
        const scale = parseFloat(e.target.value);
        this.updateScaleDisplay(scale);
        
        // 실시간 변경
        if (this.api) {
          this.api.changeScale(scale);
        }
      });
    }

    // 캐릭터 표시/숨김 토글
    if (this.toggleVisibilityBtn) {
      this.toggleVisibilityBtn.addEventListener('click', () => {
        this.handleToggleVisibility();
      });
    }

    // 이동 모드 토글
    if (this.toggleMovementModeBtn) {
      this.toggleMovementModeBtn.addEventListener('click', () => {
        this.handleToggleMovementMode();
      });
    }

    // 종료
    if (this.quitAppBtn) {
      this.quitAppBtn.addEventListener('click', () => {
        this.handleQuitApp();
      });
    }
    if (this.toggleDevToolsMainBtn) {
      this.toggleDevToolsMainBtn.addEventListener('click', () => {
        if (this.api) {
          this.api.toggleDevToolsMain();
          this.log('캐릭터 창 개발자 도구 토글 요청');
        }
      });
    }

    if (this.toggleDevToolsControlBtn) {
      this.toggleDevToolsControlBtn.addEventListener('click', () => {
        if (this.api) {
          this.api.toggleDevToolsControl();
          this.log('컨트롤 창 개발자 도구 토글 요청');
        }
      });
    }
    // 자동 재생 체크박스
    if (this.autoPlayCheck) {
      this.autoPlayCheck.addEventListener('change', () => {
        const settings = { autoPlay: this.autoPlayCheck.checked, loop: true };
        if (this.api) this.api.updateSettings(settings);
        this.log('랜덤 재생 토글 변경:', settings);
      });
    }
  }

  requestAnimationInfo() {
    if (this.api) {
      this.log('애니메이션 정보 요청 중...');
      this.api.requestAnimationInfo();
    } else {
      this.log('Electron API를 사용할 수 없습니다');
    }
  }

  requestMovementModeStatus() {
    if (this.api) {
      this.api.getMovementMode();
    }
  }

  requestCurrentScale() {
    if (this.api) {
      this.api.getCurrentScale();
    }
  }

  requestVisibilityStatus() {
    if (this.api) {
      this.api.getCharacterVisibility();
    }
  }

  updateAnimationInfo(info) {
    if (!info || typeof info !== 'object') {
      this.log('잘못된 애니메이션 정보');
      return;
    }

    this.log('애니메이션 정보 수신:', info);

    this.animations = Array.isArray(info.animations) ? info.animations : [];
    this.skins = Array.isArray(info.skins) ? info.skins : [];
    this.currentSettings = info.settings || {};

    this.updateStatus(info);
    this.updateSkinSelect();
    this.updateAnimationSelect();
    this.updateSettingsForm();
  }

  updateStatus(info) {
    if (this.currentAnimationEl) {
      this.currentAnimationEl.textContent = info.currentAnimation || '-';
    }
    if (this.currentSkinEl) {
      this.currentSkinEl.textContent = info.currentSkin || '-';
    }
  }

  updateSkinSelect() {
    if (!this.skinSelect) return;

    this.skinSelect.innerHTML = '';

    if (this.skins.length === 0) {
      this.skinSelect.innerHTML = '<option value="">사용 가능한 스킨 없음</option>';
      return;
    }

    this.skins.forEach(skin => {
      const option = document.createElement('option');
      option.value = skin;
      option.textContent = skin;
      this.skinSelect.appendChild(option);
    });
  }

  updateAnimationSelect() {
    if (!this.animationSelect) return;

    this.animationSelect.innerHTML = '';

    if (this.animations.length === 0) {
      this.animationSelect.innerHTML = '<option value="">사용 가능한 애니메이션 없음</option>';
      return;
    }

    this.animations.forEach(animation => {
      const option = document.createElement('option');
      option.value = animation;
      option.textContent = animation;
      this.animationSelect.appendChild(option);
    });
  }

  updateSettingsForm() {
    if (!this.currentSettings) return;

    if (this.autoPlayCheck) {
      this.autoPlayCheck.checked = this.currentSettings.autoPlay !== false;
    }
  }

  updateScaleUI(scale) {
    this.currentScale = scale;
    
    if (this.scaleSlider) {
      this.scaleSlider.value = scale;
    }
    
    this.updateScaleDisplay(scale);
  }

  updateScaleDisplay(scale) {
    if (this.scaleValue) {
      this.scaleValue.textContent = `${(scale * 100).toFixed(0)}%`;
    }
  }

  handleToggleVisibility() {
    if (this.api) {
      this.api.toggleCharacterVisibility();
      this.log('캐릭터 표시/숨김 토글 요청');
    }
  }

  updateVisibilityUI(isVisible) {
    this.isVisible = isVisible;
    
    // 상태 텍스트 업데이트
    if (this.visibilityStatusEl) {
      this.visibilityStatusEl.textContent = isVisible ? '표시' : '숨김';
      this.visibilityStatusEl.style.color = isVisible ? '#667eea' : '#eb3349';
    }
    
    // 버튼 텍스트 업데이트
    if (this.visibilityButtonText) {
      this.visibilityButtonText.textContent = isVisible 
        ? '👻 캐릭터 숨기기' 
        : '👁️ 캐릭터 표시';
    }
    
    // 버튼 스타일 업데이트
    if (this.toggleVisibilityBtn) {
      if (isVisible) {
        this.toggleVisibilityBtn.classList.remove('btn-success');
        this.toggleVisibilityBtn.classList.add('btn-secondary');
      } else {
        this.toggleVisibilityBtn.classList.remove('btn-secondary');
        this.toggleVisibilityBtn.classList.add('btn-success');
      }
    }
    
    this.log(`캐릭터 표시 UI 업데이트: ${isVisible ? '표시' : '숨김'}`);
  }

  handleToggleMovementMode() {
    if (this.api) {
      this.api.toggleMovementMode();
      this.log('이동 모드 토글 요청');
    }
  }

  updateMovementModeUI(isEnabled) {
    this.isMovementMode = isEnabled;
    
    // 상태 텍스트 업데이트
    if (this.movementModeStatusEl) {
      this.movementModeStatusEl.textContent = isEnabled ? '활성화' : '비활성화';
      this.movementModeStatusEl.style.color = isEnabled ? '#56ab2f' : '#667eea';
    }
    
    // 버튼 텍스트 및 스타일 업데이트
    if (this.movementButtonText) {
      this.movementButtonText.textContent = isEnabled 
        ? '✅ 이동 모드 닫기' 
        : '🎯 이동 모드 열기';
    }
    
    if (this.toggleMovementModeBtn) {
      if (isEnabled) {
        this.toggleMovementModeBtn.classList.remove('btn-primary');
        this.toggleMovementModeBtn.classList.add('btn-success');
      } else {
        this.toggleMovementModeBtn.classList.remove('btn-success');
        this.toggleMovementModeBtn.classList.add('btn-primary');
      }
    }
    
    this.log(`이동 모드 UI 업데이트: ${isEnabled ? '활성화' : '비활성화'}`);
  }

  handleQuitApp() {
    if (this.api && typeof this.api.quitApp === 'function') {
      this.api.quitApp();
      this.log('종료 요청 보냄');
    } else {
      this.log('quitApp API 없음 - 창 닫기 시도');
      try { window.close(); } catch (e) {}
    }
  }

  showMessage(message, type = 'info') {
    const prefix = type === 'success' ? '✓' : type === 'error' ? '✗' : type === 'warning' ? '⚠' : 'ℹ';
    console.log(`${prefix} ${message}`);
  }

  log(message, data) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    if (data) {
      console.log(`[${timestamp}] [컨트롤]: ${message}`, data);
    } else {
      console.log(`[${timestamp}] [컨트롤]: ${message}`);
    }
  }

  destroy() {
    clearTimeout(this.updateTimeout);
    this.log('컨트롤 패널 정리 완료');
  }
}

let controlPanel = null;

window.addEventListener('DOMContentLoaded', () => {
  console.log('컨트롤 패널 초기화 중...');
  
  try {
    controlPanel = new ControlPanel();
  } catch (error) {
    console.error('컨트롤 패널 생성 실패:', error);
  }
});

window.addEventListener('beforeunload', () => {
  if (controlPanel) {
    controlPanel.destroy();
    controlPanel = null;
  }
});

window.addEventListener('error', (event) => {
  console.error('컨트롤 패널 오류:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('처리되지 않은 Promise:', event.reason);
});