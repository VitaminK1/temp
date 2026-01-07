# Ashur Desktop Animation

바탕화면 배경에서 Ashur 캐릭터 애니메이션을 투명하게 재생하는 프로그램입니다.

## 📋 필요 사항

- **Node.js 18 이상** (https://nodejs.org)
- **Windows 10/11** (64-bit)
- Ashur Spine 파일들:
  - `Ashur.skel` (스켈레톤 데이터 - 바이너리 포맷)
  - `Ashur.atlas` (텍스처 아틀라스)
  - `Ashur.png` (또는 여러 이미지 파일)
  - `spine-player.min.js` (Spine Player 라이브러리)

## ✨ 주요 기능

- 🎨 **투명 배경**: 바탕화면에 자연스럽게 통합
- 🎬 **랜덤 애니메이션**: 3~12초마다 자동 변경
- 🎮 **GUI 컨트롤**: 실시간 설정 및 제어
- 🖼️ **스킨 변경**: Normal 등 다양한 스킨 지원
- 📍 **위치 변경**: 랜덤한 화면 위치 이동
- ⚙️ **세밀한 커스터마이징**: 모든 설정 조정 가능

## 🚀 빠른 설치 (3단계)

### 1단계: Node.js 설치
1. https://nodejs.org 방문
2. LTS 버전 다운로드 및 설치
3. 설치 후 컴퓨터 재시작 (권장)

### 2단계: Ashur 파일 복사
```
desktop-spine-animation/
└── spine-assets/
    ├── Ashur.skel          ← 여기에 복사
    ├── Ashur.atlas         ← 여기에 복사
    ├── Ashur.png           ← 여기에 복사
    └── spine-player.min.js ← 여기에 복사
```

**중요:** 파일명이 정확히 `Ashur.skel`, `Ashur.atlas`이어야 합니다!

### 3단계: 설치 및 실행
1. `INSTALL.bat` 더블클릭 → 의존성 설치
2. `START.bat` 더블클릭 → 프로그램 실행

또는 명령 프롬프트에서:
```bash
npm install    # 첫 실행 시 1회만
npm start      # 실행
```

## 📁 완성된 폴더 구조

```
desktop-spine-animation/
├── main.js                 ✅ (제공됨)
├── preload.js              ✅ (제공됨)
├── package.json            ✅ (제공됨)
├── INSTALL.bat             ✅ (제공됨)
├── START.bat               ✅ (제공됨)
├── README.md               ✅ (제공됨)
├── renderer/
│   ├── index.html          ✅ (제공됨)
│   ├── renderer.js         ✅ (제공됨)
│   ├── styles.css          ✅ (제공됨)
│   ├── control.html        ✅ (제공됨 - 컨트롤 창)
│   ├── control.js          ✅ (제공됨 - 컨트롤 로직)
│   └── control-styles.css  ✅ (제공됨 - 컨트롤 스타일)
├── spine-assets/
│   ├── Ashur.skel          ⚠️ (직접 복사 필요)
│   ├── Ashur.atlas         ⚠️ (직접 복사 필요)
│   ├── Ashur.png           ⚠️ (직접 복사 필요)
│   └── spine-player.min.js ⚠️ (직접 복사 필요)
└── node_modules/           (npm install 후 자동 생성)
```

## 🎮 컨트롤 패널 사용법

프로그램 실행 시 자동으로 **컨트롤 창**이 열립니다.

### 현재 상태
- 현재 재생 중인 애니메이션 확인
- 현재 적용된 스킨 확인

### 스킨 선택
1. 드롭다운에서 원하는 스킨 선택 (기본: Normal)
2. "스킨 적용" 버튼 클릭

### 애니메이션 선택
1. 드롭다운에서 원하는 애니메이션 선택
2. "애니메이션 재생" 버튼 클릭

### 재생 설정
- **자동 재생**: 체크 시 랜덤 애니메이션 자동 재생
- **애니메이션 반복**: 각 애니메이션 루프 재생 여부
- **최소/최대 간격**: 자동 재생 시 애니메이션 간 대기 시간
- **위치 변경 확률**: 애니메이션 변경 시 화면 위치 이동 확률

### 빠른 동작
- **위치 변경**: 즉시 화면 위치 변경
- **재생 중지**: 자동 재생 중지

## ⚙️ 설정 변경

**애니메이션 재생 간격 조정** (컨트롤 창에서 조정 가능):
기본값:
- 최소 간격: 3초
- 최대 간격: 12초

**기본 스킨 변경** (`renderer/renderer.js` 14번째 줄):
```javascript
defaultSkin: 'Normal'  // 원하는 스킨 이름으로 변경
```

**창 크기 조정** (`main.js` 12-13번째 줄):
```javascript
const windowWidth = 500;   // 너비
const windowHeight = 500;  // 높이
```

## 🐛 문제 해결

### "Node.js가 설치되어 있지 않습니다"
- Node.js를 https://nodejs.org 에서 다운로드
- 설치 후 컴퓨터 재시작

### "Ashur 로드 실패"
확인 사항:
1. `spine-assets` 폴더에 모든 파일이 있는지 확인
2. 파일명이 정확한지 확인 (`Ashur.skel`, `Ashur.atlas`)
3. spine-player.min.js 버전이 Ashur 파일과 호환되는지 확인
4. .skel 파일 버전이 spine-player와 호환되는지 확인

### 애니메이션이 움직이지 않음
1. 컨트롤 창에서 "자동 재생" 체크 확인
2. 컨트롤 창에서 "애니메이션 반복" 체크 확인
3. 수동으로 애니메이션 선택하여 테스트
4. 개발자 도구에서 콘솔 오류 확인

### 애니메이션이 보이지 않음
1. 개발자 도구 열기: `main.js` 41번째 줄 주석 해제
   ```javascript
   mainWindow.webContents.openDevTools({ mode: 'detach' });
   ```
2. 콘솔에서 오류 확인

### 창이 클릭을 방해함
- 기본적으로 마우스 이벤트를 무시하도록 설정됨
- `main.js` 39번째 줄에서 확인:
  ```javascript
  mainWindow.setIgnoreMouseEvents(true, { forward: true });
  ```

## 🎮 실행 중 제어

### 프로그램 종료
- 명령 프롬프트 창 닫기
- 또는 작업 관리자에서 "Ashur Desktop Animation" 종료

### 로그 확인
명령 프롬프트 창에서 실시간 로그 확인 가능:
- 애니메이션 재생 정보
- 위치 변경 알림
- 오류 메시지

## 📦 실행 파일 만들기

```bash
npm run build
```

결과물: `dist/` 폴더에 설치 프로그램 생성

## 🔧 기술 스택

- **Electron** - 데스크톱 앱 프레임워크
- **Spine Runtime** - 2D 애니메이션 재생
- **Node.js** - JavaScript 런타임

## 📝 라이선스

MIT License

## 🆘 지원

문제가 발생하면:
1. README.md의 문제 해결 섹션 확인
2. 개발자 도구에서 콘솔 로그 확인
3. Node.js와 모든 파일이 제대로 설치되었는지 확인