/**
 * Ashur 바탕화면 애니메이션 플레이어 (픽셀 단위 투명도 감지)
 */

class AshurDesktopPlayer {
  constructor() {
    this.player = null;
    this.animations = [];
    this.skins = [];
    this.currentAnimation = null;
    this.currentSkin = 'Normal';
    this.container = document.getElementById('spine-container');
    this.currentScale = 1.0;
    this.isVisible = true;
    
    this.settings = {
      minInterval: 3000,
      maxInterval: 12000,
      loop: true,
      autoPlay: true,
      defaultSkin: 'Normal'
    };
    
    this.animationTimer = null;
    this.isInitialized = false;
    this.loadAttempts = 0;
    this.maxLoadAttempts = 3;
    this.api = window.electronAPI || null;
    this._loopActive = false;
    
    // 이동 모드 상태
    this.isMovementMode = false;
    this.movementOverlay = null;
    this.dragHandle = null;
    
    // 픽셀 감지 관련
    this.canvas = null;
    this.checkInterval = null;
    this.lastMouseX = -1;
    this.lastMouseY = -1;
    this.isMouseOver = false; // opaque state
    
    this.log('Ashur Player 초기화 시작');
    this.setupIpcListeners();
    this.createDragHandle();
    this.createMovementOverlay();
    this.init();
  }

  /**
   * 항상 표시되는 드래그 핸들 생성 (투명)
   */
  createDragHandle() {
    this.dragHandle = document.createElement('div');
    this.dragHandle.id = 'drag-handle';
    this.dragHandle.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: transparent;
      z-index: 1;
      cursor: move;
      -webkit-app-region: drag;
      pointer-events: none;
    `;
    
    document.body.appendChild(this.dragHandle);
    this.log('드래그 핸들 생성 완료');
  }

  /**
   * 픽셀 단위 투명도 감지 시작
   */
  startPixelDetection() {
    // Canvas 요소 찾기
    this.canvas = this.container.querySelector('canvas');
    
    if (!this.canvas) {
      this.log('Canvas를 찾을 수 없습니다. 1초 후 재시도...');
      setTimeout(() => this.startPixelDetection(), 1000);
      return;
    }
    
    this.log('✅ Canvas 발견 - 픽셀 감지 시작');
    
    // 마우스 이벤트 리스너
    let checkTimeout = null;
    
    const checkMousePosition = (e) => {
      // 이동 모드일 때는 항상 드래그 가능
      if (this.isMovementMode) {
        this.setIgnoreMouseEvents(false);
        return;
      }
      
      // 캐릭터가 숨겨져 있으면 항상 통과
      if (!this.isVisible) {
        this.setIgnoreMouseEvents(true);
        return;
      }
      
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      
      // 디바운싱
      if (checkTimeout) return;
      
      checkTimeout = setTimeout(() => {
        this.checkTransparencyAtMouse(e.clientX, e.clientY);
        checkTimeout = null;
      }, 16); // ~60fps
    };
    
    document.addEventListener('mousemove', checkMousePosition, { passive: true });
    
    // 초기 체크
    this.checkTransparencyAtMouse(0, 0);
    
    this.log('마우스 이벤트 리스너 등록 완료');
  }

  /**
   * 특정 좌표의 투명도 확인
   */
  checkTransparencyAtMouse(mouseX, mouseY) {
    if (!this.canvas || !this.isVisible || this.isMovementMode) return;

    try {
      const rect = this.canvas.getBoundingClientRect();

      // 마우스가 캔버스 영역 밖이면 통과 (and state diff)
      if (mouseX < rect.left || mouseX > rect.right ||
          mouseY < rect.top || mouseY > rect.bottom) {
        if (this.isMouseOver !== false) {
          this.isMouseOver = false;
          this.setIgnoreMouseEvents(true, { forward: true });
        }
        return;
      }

      // 캔버스 내부 좌표로 변환
      const x = mouseX - rect.left;
      const y = mouseY - rect.top;

      // 캔버스 스케일 고려 (device pixel ratio included)
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;

      const canvasX = Math.floor(x * scaleX);
      const canvasY = Math.floor(y * scaleY);

      // 우선 시도: WebGL readPixels (Y축 보정 필요)
      const gl = this.canvas.getContext('webgl2') || this.canvas.getContext('webgl') || this.canvas.getContext('experimental-webgl');
      const threshold = 10; // 알파 임계값

      if (gl && typeof gl.readPixels === 'function') {
        const glY = Math.max(0, this.canvas.height - canvasY - 1);
        const pixel = new Uint8Array(4);
        gl.readPixels(canvasX, glY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        const alpha = pixel[3];
        const isOpaque = alpha > threshold;

        if (isOpaque !== this.isMouseOver) {
          this.isMouseOver = isOpaque;
          if (isOpaque) {
            this.setIgnoreMouseEvents(false);
          } else {
            this.setIgnoreMouseEvents(true, { forward: true });
          }
        }
        return;
      }

      // Fallback: 2D getImageData if no GL context
      const ctx = this.canvas.getContext('2d', { willReadFrequently: true });
      const imageData = ctx.getImageData(canvasX, canvasY, 1, 1);
      const alpha = imageData.data[3];
      const isOpaque = alpha > threshold;

      if (isOpaque !== this.isMouseOver) {
        this.isMouseOver = isOpaque;
        if (isOpaque) {
          this.setIgnoreMouseEvents(false);
        } else {
          this.setIgnoreMouseEvents(true, { forward: true });
        }
      }

    } catch (error) {
      // 안전모드: 오류 발생 시 창이 마우스를 받게 한다(감지가 끊기는 문제 방지)
      if (this.isMouseOver !== true) {
        this.isMouseOver = true;
        this.setIgnoreMouseEvents(false);
      }
    }
  }

  /**
   * 마우스 이벤트 무시 설정
   */
  setIgnoreMouseEvents(ignore, options) {
    // 중복 호출 방지
    if (this._isIgnoringMouse === Boolean(ignore)) return;
    this._isIgnoringMouse = Boolean(ignore);

    // 메인 프로세스에 요청하여 BrowserWindow.setIgnoreMouseEvents를 조정
    if (this.api && typeof this.api.setIgnoreMouseEvents === 'function') {
      try {
        // 기본 옵션으로 forward:true when ignoring so renderer still receives mousemove
        const opts = options || (ignore ? { forward: true } : {});
        this.api.setIgnoreMouseEvents(Boolean(ignore), opts);
      } catch (e) {
        // 안전하게 무시
      }
    }

    // 드래그 핸들의 pointer-events 제어
    if (this.dragHandle) {
      this.dragHandle.style.pointerEvents = ignore ? 'none' : 'auto';
    }
  }

  /**
   * 이동 모드 오버레이 생성
   */
  createMovementOverlay() {
    this.movementOverlay = document.createElement('div');
    this.movementOverlay.id = 'movement-overlay';
    this.movementOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(102, 126, 234, 0.2);
      backdrop-filter: blur(3px);
      display: none;
      z-index: 9999;
      cursor: move;
      -webkit-app-region: drag;
    `;
    
    // 이동 모드 UI 컨테이너
    const uiContainer = document.createElement('div');
    uiContainer.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.85);
      border-radius: 16px;
      padding: 24px;
      min-width: 280px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      pointer-events: auto;
      -webkit-app-region: no-drag;
    `;
    
    uiContainer.innerHTML = `
      <div style="color: white; font-family: 'Segoe UI', sans-serif; text-align: center;">
        <div style="font-size: 24px; margin-bottom: 12px;">📍 이동 모드</div>
        <div style="font-size: 13px; opacity: 0.9; margin-bottom: 20px;">
          원하는 위치로 드래그하거나<br>아래 버튼을 사용하세요
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 12px;">
          <button id="move-center" style="
            padding: 10px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: none;
            border-radius: 8px;
            color: white;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
          ">🎯 중앙</button>
          
          <button id="move-random" style="
            padding: 10px;
            background: linear-gradient(135deg, #2193b0 0%, #6dd5ed 100%);
            border: none;
            border-radius: 8px;
            color: white;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
          ">🎲 랜덤</button>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 16px;">
          <button id="move-tl" style="
            padding: 8px;
            background: rgba(255, 255, 255, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 6px;
            color: white;
            font-size: 11px;
            cursor: pointer;
            transition: background 0.2s;
          ">↖️ 좌상</button>
          
          <button id="move-tr" style="
            padding: 8px;
            background: rgba(255, 255, 255, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 6px;
            color: white;
            font-size: 11px;
            cursor: pointer;
            transition: background 0.2s;
          ">↗️ 우상</button>
          
          <button id="move-bl" style="
            padding: 8px;
            background: rgba(255, 255, 255, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 6px;
            color: white;
            font-size: 11px;
            cursor: pointer;
            transition: background 0.2s;
          ">↙️ 좌하</button>
          
          <button id="move-br" style="
            padding: 8px;
            background: rgba(255, 255, 255, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 6px;
            color: white;
            font-size: 11px;
            cursor: pointer;
            transition: background 0.2s;
          ">↘️ 우하</button>
        </div>
        
        <div style="font-size: 11px; opacity: 0.7; margin-bottom: 12px;">
          단축키: <strong>Alt+M</strong>
        </div>
        
        <button id="close-movement" style="
          width: 100%;
          padding: 10px;
          background: rgba(235, 51, 73, 0.9);
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: background 0.2s;
        ">✕ 이동 모드 종료</button>
      </div>
    `;
    
    // 버튼 이벤트 리스너
    this.movementOverlay.appendChild(uiContainer);
    document.body.appendChild(this.movementOverlay);
    
    // 버튼 효과
    const buttons = uiContainer.querySelectorAll('button');
    buttons.forEach(btn => {
      btn.addEventListener('mouseenter', () => {
        btn.style.transform = 'scale(1.05)';
        if (btn.style.background.includes('rgba(255, 255, 255, 0.15)')) {
          btn.style.background = 'rgba(255, 255, 255, 0.25)';
        }
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'scale(1)';
        if (btn.style.background.includes('rgba(255, 255, 255, 0.25)')) {
          btn.style.background = 'rgba(255, 255, 255, 0.15)';
        }
      });
    });
    
    // 버튼 클릭 이벤트
    this.setupMovementButtons();
  }

  /**
   * 이동 모드 버튼 설정
   */
  setupMovementButtons() {
    const centerBtn = document.getElementById('move-center');
    const randomBtn = document.getElementById('move-random');
    const tlBtn = document.getElementById('move-tl');
    const trBtn = document.getElementById('move-tr');
    const blBtn = document.getElementById('move-bl');
    const brBtn = document.getElementById('move-br');
    const closeBtn = document.getElementById('close-movement');
    
    if (centerBtn) {
      centerBtn.addEventListener('click', () => {
        if (this.api) this.api.changePositionCenter();
      });
    }
    
    if (randomBtn) {
      randomBtn.addEventListener('click', () => {
        if (this.api) this.api.changePosition();
      });
    }
    
    if (tlBtn) {
      tlBtn.addEventListener('click', () => {
        if (this.api) this.api.changePositionCorner('top-left');
      });
    }
    
    if (trBtn) {
      trBtn.addEventListener('click', () => {
        if (this.api) this.api.changePositionCorner('top-right');
      });
    }
    
    if (blBtn) {
      blBtn.addEventListener('click', () => {
        if (this.api) this.api.changePositionCorner('bottom-left');
      });
    }
    
    if (brBtn) {
      brBtn.addEventListener('click', () => {
        if (this.api) this.api.changePositionCorner('bottom-right');
      });
    }
    
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        if (this.api) this.api.toggleMovementMode();
      });
    }
  }

  setupIpcListeners() {
    if (!this.api) {
      this.log('Electron API를 사용할 수 없습니다 (브라우저 모드)');
      return;
    }

    this.api.onSettingsChanged((settings) => {
      this.updateSettings(settings);
    });

    this.api.onGetAnimationInfo(() => {
      this.sendAnimationInfo();
    });

    this.api.onPlayAnimation((animationName) => {
      this.playSpecificAnimation(animationName);
    });

    this.api.onChangeSkin((skinName) => {
      this.changeSkin(skinName);
    });

    this.api.onStopAnimation(() => {
      this.stopRandomLoop();
    });

    // 이동 모드 변경 리스너
    this.api.onMovementModeChanged((isEnabled) => {
      this.setMovementMode(isEnabled);
    });

    // 크기 변경 리스너
    this.api.onScaleChanged((scale) => {
      this.setScale(scale);
    });

    // 캐릭터 표시/숨김 리스너
    this.api.onVisibilityChanged((isVisible) => {
      this.setVisibility(isVisible);
    });
  }

  /**
   * 이동 모드 설정
   */
  setMovementMode(enabled) {

    // 상태 업데이트
    this.isMovementMode = Boolean(enabled);

    if (this.movementOverlay) {
      this.movementOverlay.style.display = this.isMovementMode ? 'block' : 'none';
    }

    if (this.drafalse);
    } else {
      // 이동 모드 해제 시 현재 마우스 위치를 다시 검사하여 투과 여부를 결정
      if (this.lastMouseX >= 0) {
        this.checkTransparencyAtMouse(this.lastMouseX, this.lastMouseY);
      }
    }

    this.log(`이동 모드: ${this.isMovementMode ? '활성화' : '비활성화'}`);

  }

  /**
   * 크기 변경 적용 (30% ~ 100%)
   */
    // 이동 모드일 때는 항상 마우스 이벤트를 받도록 설정
    if (this.isMovemgHandle) {
      this.dragHandle.style.zIndex = this.isMovementMode ? '9998' : '1';
      this.dragHandle.style.pointerEvents = this.isMovementMode ? 'auto' : 'none';
    }
entMode) {
      this.setIgnoreMouseEvents(
  setScale(scale) {
    // 범위 제한: 0.3 ~ 1.0 (30% ~ 100%)
    scale = Math.max(0.3, Math.min(1.0, scale));
    this.currentScale = scale;
    
    if (this.container) {
      this.container.style.transform = `scale(${scale})`;
      this.log(`크기 변경: ${(scale * 100).toFixed(0)}%`);
    }
  }

  /**
   * 캐릭터 표시/숨김 설정
   */
  setVisibility(isVisible) {
    this.isVisible = isVisible;
    
    if (this.container) {
      this.container.style.opacity = isVisible ? '1' : '0';
    }
    
    // 숨김 상태면 항상 마우스 이벤트 통과
    if (!isVisible) {
      this.setIgnoreMouseEvents(true);
    } else if (!this.isMovementMode && this.lastMouseX >= 0) {
      // 다시 표시될 때 현재 마우스 위치 체크
      this.checkTransparencyAtMouse(this.lastMouseX, this.lastMouseY);
    }
    
    this.log(`캐릭터 표시: ${isVisible ? '표시' : '숨김'}`);
  }

  updateSettings(newSettings) {
    if (!newSettings || typeof newSettings !== 'object') {
      this.logError('잘못된 설정 데이터', newSettings);
      return;
    }

    const merged = { ...this.settings, ...newSettings };
    
    merged.minInterval = this.validateNumber(merged.minInterval, 1000, 300000, 3000);
    merged.maxInterval = this.validateNumber(merged.maxInterval, 1000, 300000, 12000);
    
    if (merged.minInterval >= merged.maxInterval) {
      this.log('최소 간격이 최대 간격보다 크거나 같습니다. 값을 교환합니다.');
      [merged.minInterval, merged.maxInterval] = [merged.maxInterval, merged.minInterval];
    }
    
    merged.autoPlay = Boolean(merged.autoPlay);
    merged.loop = Boolean(merged.loop);

    this.settings = merged;
    this.log(`설정 업데이트: ${JSON.stringify(this.settings)}`);

    if (this.settings.autoPlay && !this._loopActive) {
      this.startRandomAnimationLoop();
    } else if (!this.settings.autoPlay && this._loopActive) {
      this.stopRandomLoop();
    }
  }

  validateNumber(value, min, max, defaultValue) {
    const num = Number(value);
    if (isNaN(num) || num < min || num > max) {
      return defaultValue;
    }
    return num;
  }

  sendAnimationInfo() {
    if (!this.api) return;
    
    const info = {
      animations: this.animations,
      skins: this.skins,
      currentAnimation: this.currentAnimation,
      currentSkin: this.currentSkin,
      settings: this.settings,
      isPlaying: this._loopActive
    };
    
    this.api.sendAnimationInfo(info);
    this.log('애니메이션 정보 전송');
  }

  log(message) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    console.log(`[${timestamp}] [Ashur]: ${message}`);
    if (this.api) {
      this.api.log(message);
    }
  }

  logError(message, error) {
    const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
    const errorMsg = error?.message || error || '알 수 없는 오류';
    console.error(`[${timestamp}] [Ashur Error]: ${message}`, error);
    if (this.api) {
      this.api.logError(`${message}: ${errorMsg}`);
    }
  }

  async init() {
    if (this.isInitialized) {
      this.log('이미 초기화되었습니다');
      return;
    }

    try {
      this.log('Spine Player 로드 중...');
      await this.loadSpinePlayer();
      this.isInitialized = true;
      this.log('✅ 초기화 완료');
      
      // 픽셀 감지 시작
      this.startPixelDetection();
      
      this.sendAnimationInfo();
      
      if (this.settings.autoPlay) {
        setTimeout(() => this.startRandomAnimationLoop(), 500);
      }
    } catch (error) {
      this.logError('초기화 실패', error);
      this.handleLoadError(error);
    }
  }

  async loadSpinePlayer() {
    return new Promise((resolve, reject) => {
      if (typeof spine === 'undefined') {
        reject(new Error('spine-player.min.js가 로드되지 않았습니다'));
        return;
      }

      const container = this.container;
      if (!container) {
        reject(new Error('spine-container를 찾을 수 없습니다'));
        return;
      }

      this.log('Ashur 파일 로드 시도...');

      const config = {
        skelUrl: '../spine-assets/Ashur.skel',
        atlasUrl: '../spine-assets/Ashur.atlas',
        animation: '',
        skin: this.settings.defaultSkin,
        backgroundColor: '#00000000',
        alpha: true,
        preserveDrawingBuffer: true, // getImageData를 위해 필요
        premultipliedAlpha: true,
        viewport: {
          debugRender: false,
          padLeft: '5%',
          padRight: '5%',
          padTop: '5%',
          padBottom: '5%'
        },
        showControls: false,
        showLoading: false,
        
        success: (player) => {
          this.log('✅ Ashur 로드 성공');
          this.player = player;
          
          this.clearLoadingMessage(container);
          
          try {
            this.extractAnimationsAndSkins();
            resolve();
          } catch (error) {
            reject(error);
          }
        },
        
        error: (player, reason) => {
          this.logError('Ashur 로드 실패', reason);
          reject(new Error(`Spine 로드 실패: ${reason}`));
        }
      };

      try {
        new spine.SpinePlayer(container, config);
      } catch (error) {
        this.logError('SpinePlayer 생성 실패', error);
        reject(error);
      }
    });
  }

  clearLoadingMessage(container) {
    const loading = container.querySelector('.loading');
    if (loading) {
      loading.remove();
    }
  }

  extractAnimationsAndSkins() {
    if (!this.player?.skeleton?.data) {
      throw new Error('Skeleton 데이터를 찾을 수 없습니다');
    }

    const skeletonData = this.player.skeleton.data;
    
    this.animations = skeletonData.animations
      .map(anim => anim.name)
      .filter(name => name);
    
    this.log(`발견된 애니메이션 ${this.animations.length}개: ${this.animations.join(', ')}`);

    if (this.animations.length === 0) {
      throw new Error('사용 가능한 애니메이션이 없습니다');
    }

    if (skeletonData.skins?.length > 0) {
      this.skins = skeletonData.skins
        .map(skin => skin.name)
        .filter(name => name);
      
      this.log(`사용 가능한 스킨: ${this.skins.join(', ')}`);
      
      if (this.skins.includes(this.settings.defaultSkin)) {
        this.changeSkin(this.settings.defaultSkin);
      }
    }
  }

  changeSkin(skinName) {
    if (!this.player) {
      this.log('플레이어가 초기화되지 않았습니다');
      return false;
    }

    if (!this.skins.includes(skinName)) {
      this.log(`스킨 "${skinName}"을 찾을 수 없습니다`);
      return false;
    }

    try {
      this.player.skeleton.setSkinByName(skinName);
      this.player.skeleton.setSlotsToSetupPose();
      this.currentSkin = skinName;
      this.log(`✅ 스킨 변경: "${skinName}"`);
      this.sendAnimationInfo();
      return true;
    } catch (error) {
      this.logError('스킨 변경 실패', error);
      return false;
    }
  }

  playRandomAnimation() {
    if (!this.isInitialized || !this.player) {
      this.log('플레이어가 초기화되지 않았습니다');
      return false;
    }

    if (this.animations.length === 0) {
      this.log('재생할 애니메이션이 없습니다');
      return false;
    }

    try {
      const nextAnimation = this.selectRandomAnimation();
      return this.playSpecificAnimation(nextAnimation);
    } catch (error) {
      this.logError('랜덤 애니메이션 재생 실패', error);
      return false;
    }
  }

  selectRandomAnimation() {
    if (this.animations.length === 1) {
      return this.animations[0];
    }

    for (let i = 0; i < 10; i++) {
      const candidate = this.animations[
        Math.floor(Math.random() * this.animations.length)
      ];
      if (candidate !== this.currentAnimation) {
        return candidate;
      }
    }

    return this.animations[Math.floor(Math.random() * this.animations.length)];
  }

  playSpecificAnimation(animationName) {
    if (!this.player) {
      this.log('플레이어가 초기화되지 않았습니다');
      return false;
    }

    if (!this.animations.includes(animationName)) {
      this.log(`애니메이션 "${animationName}"을 찾을 수 없습니다`);
      return false;
    }

    try {
      this.player.setAnimation(animationName, this.settings.loop);
      
      if (this.player.paused && typeof this.player.play === 'function') {
        this.player.play();
      }
      
      this.currentAnimation = animationName;
      this.log(`▶️ 재생: "${animationName}" (loop: ${this.settings.loop})`);
      this.sendAnimationInfo();
      return true;
    } catch (error) {
      this.logError(`애니메이션 "${animationName}" 재생 실패`, error);
      return false;
    }
  }

  startRandomAnimationLoop() {
    this.stopRandomLoop();

    if (this._loopActive) {
      this.log('이미 루프가 실행 중입니다');
      return;
    }

    this._loopActive = true;
    this.log('🔄 랜덤 애니메이션 루프 시작');

    setTimeout(() => {
      if (this._loopActive) {
        this.playRandomAnimation();
      }
    }, 500);

    this.scheduleNextAnimation();
  }

  scheduleNextAnimation() {
    if (!this._loopActive || !this.settings.autoPlay) {
      this.log('자동 재생이 비활성화되어 예약을 중단합니다');
      this._loopActive = false;
      return;
    }

    const interval = Math.floor(
      Math.random() * (this.settings.maxInterval - this.settings.minInterval) +
      this.settings.minInterval
    );

    this.log(`⏰ 다음 재생까지: ${(interval / 1000).toFixed(1)}초`);

    this.animationTimer = setTimeout(() => {
      if (this._loopActive) {
        this.playRandomAnimation();
        this.scheduleNextAnimation();
      }
    }, interval);
  }

  stopRandomLoop() {
    if (this.animationTimer) {
      clearTimeout(this.animationTimer);
      this.animationTimer = null;
    }
    
    if (this._loopActive) {
      this._loopActive = false;
      this.log('⏸️ 랜덤 재생 중지');
      this.sendAnimationInfo();
    }
  }

  handleLoadError(error) {
    this.loadAttempts++;
    
    const container = this.container;
    if (!container) return;

    const errorMessage = `
      <div class="error">
        <div style="margin-bottom: 10px; font-size: 16px; font-weight: bold;">
          ⚠️ Ashur 로드 실패
        </div>
        <div style="margin-bottom: 8px;">
          ${this.escapeHtml(error.message || '알 수 없는 오류')}
        </div>
        <div style="font-size: 12px; opacity: 0.8;">
          시도 횟수: ${this.loadAttempts}/${this.maxLoadAttempts}
        </div>
        <div style="font-size: 11px; margin-top: 10px; opacity: 0.6;">
          spine-assets 폴더에 Ashur.skel, Ashur.atlas, 이미지 파일들이 있는지 확인하세요
        </div>
      </div>
    `;
    
    container.innerHTML = errorMessage;

    if (this.loadAttempts < this.maxLoadAttempts) {
      this.log(`${this.loadAttempts}번째 재시도 예정 (2초 후)...`);
      setTimeout(() => {
        this.init();
      }, 2000);
    } else {
      this.logError('❌ 최대 재시도 횟수 초과', error);
    }
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  destroy() {
    this.log('🧹 Player 정리 중...');
    
    this.stopRandomLoop();
    
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    if (this.player) {
      try {
        if (typeof this.player.dispose === 'function') {
          this.player.dispose();
        }
      } catch (error) {
        this.logError('Player dispose 실패', error);
      }
      this.player = null;
    }
    
    if (this.movementOverlay && this.movementOverlay.parentNode) {
      this.movementOverlay.parentNode.removeChild(this.movementOverlay);
    }
    
    if (this.dragHandle && this.dragHandle.parentNode) {
      this.dragHandle.parentNode.removeChild(this.dragHandle);
    }
    
    this.isInitialized = false;
    this.animations = [];
    this.skins = [];
    this.currentAnimation = null;
    this.canvas = null;
    
    this.log('✅ 정리 완료');
  }
}

let ashurPlayer = null;

window.addEventListener('DOMContentLoaded', () => {
  console.log('DOM 로드 완료, Ashur Player 생성 중...');
  
  try {
    ashurPlayer = new AshurDesktopPlayer();
  } catch (error) {
    console.error('❌ AshurDesktopPlayer 생성 실패:', error);
  }
});

window.addEventListener('beforeunload', () => {
  if (ashurPlayer) {
    ashurPlayer.destroy();
    ashurPlayer = null;
  }
});

window.addEventListener('error', (event) => {
  console.error('전역 오류:', event.error);
  if (ashurPlayer) {
    ashurPlayer.logError('전역 오류', event.error);
  }
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('처리되지 않은 Promise 거부:', event.reason);
  if (ashurPlayer) {
    ashurPlayer.logError('처리되지 않은 Promise', event.reason);
  }
});