# Waveflow

유튜브 뮤직(Pear Desktop 앱)에서 재생 중인 곡을 **전체화면 흐르는 파형**으로 보여주는 비주얼라이저.
사운드클라우드 트랙 페이지 같은 막대 파형 + 아래 반사, 왼쪽 위에 앨범 커버·제목·아티스트.

- 레포: `waveflow` (GitHub: choijw1004)
- 설명: Your music, flowing across the screen. A fullscreen, SoundCloud-style waveform visualizer for YouTube Music.
- 디자인 기준: `reference/waveflow-demo.html` (브라우저에서 바로 열어 볼 수 있는 완성 데모. 그리기 로직의 원본)

## 결정된 것

- 형태: **Pear Desktop(구 th-ch/youtube-music) 플러그인**으로 개발. 사이트가 아니라 맥 데스크톱 앱 안에서 동작.
- 언어: **TypeScript**. 설정 UI가 필요할 때만 SolidJS.
- 배포 순서: 포크에서 개발 → 내 맥에서 사용 → 완성되면 pear-devs/pear-desktop에 PR.
  PR이 안 받아들여지면 내 Homebrew tap(`brew install choijw1004/tap/waveflow`)으로 배포.
- 코드 위치: 이 레포 루트의 `src/plugins/waveflow/`(플러그인), `src/i18n/resources/en.json`·`ko.json`의 `plugins.waveflow`(문구)가 원본.
- Pear Desktop 호스트 소스·패키지·빌드 도구를 이 저장소 루트로 통합함. 이 폴더에서 `pnpm install --frozen-lockfile` → `pnpm dev`. 외부 체크아웃이나 동기화 스크립트는 사용하지 않음.
- 이전 외부 체크아웃은 `.local/pear-desktop-backup/`에 로컬 백업하며 Git에서 제외. `.git` 이력과 원격은 현재 Waveflow 저장소 것을 유지.
- 앱·메뉴·설치 파일 이름은 **Waveflow**, 앱 ID는 `com.choijw1004.waveflow`. 기존 설치의 로그인·설정은 `src/providers/app-identity.ts`에서 이전 프로필을 연결해 유지. 이 모듈은 config store 생성보다 먼저 실행되어야 함.
- 테스트: `pnpm test` (파형 기록·정규화·색 보정 + UI 통합 검사). `pnpm typecheck`, `pnpm build`로 빌드 검증.
- UI 통합 검사: `pnpm test:ui` (영어 UI·폰트 번들·자동 숨김·탐색·단축키·정리 동작)

## 기술 스택 (Pear Desktop v3.12.0 기준, 2026-11 확인)

Electron 42 · TypeScript · electron-vite / Vite · SolidJS · pnpm · electron-builder
플러그인에서 쓰는 것: Web Audio API(AnalyserNode), Canvas 2D(무거우면 WebGL), IndexedDB(파형 캐시)

## Pear Desktop 연결 지점 (소스에서 확인함)

- 플러그인 생성: `createPlugin` from `@/utils`. 참고 구현은 `src/plugins/visualizer/index.ts`
- **소리**: renderer가 곡마다 `document`에 `peard:audio-can-play` CustomEvent를 보냄
  - `e.detail = { audioContext: AudioContext, audioSource: MediaElementAudioSourceNode }`
  - 타입: `src/reset.d.ts`의 `Compressor`, 발생 위치: `src/renderer.ts`
  - visualizer 플러그인은 `onPlayerApiReady`에서 이 이벤트를 구독함. 곡마다 발생하므로 AnalyserNode 중복 생성 주의
  - AnalyserNode는 audioSource에 연결만 하고 destination에는 연결하지 않음(이미 출력되고 있음)
- **곡 정보**: `ctx.ipc.on('peard:update-song-info', (info: SongInfo) => ...)` (예: `src/plugins/synced-lyrics/renderer/index.ts`)
  - `SongInfo`(`src/providers/song-info.ts`): title, artist, imageSrc, songDuration, elapsedSeconds, isPaused, videoId, album 등
  - 동기 조회: `getSongInfo()` from `@/providers/song-info-front`

## 데모에서 가져올 기능

- 스타일 5종: 클래식(막대+반사), 리본(곡선 면), 스펙트럼(저·중·고 3층 막대), 라이브(실시간만), 도트
- 지나간 쪽 = 강조색, 다가올 쪽 = 회색. 화면 좌우 끝은 페이드
- 움직임(끔/보통/강하게): 재생선 근처 막대가 주파수별로 튀고, 바깥으로 퍼지는 물결, 전체가 음량에 맞춰 살짝 반짝임
- 색상: 기본은 **앨범 커버에서 추출**(채도 높은 픽셀 상위 12% 평균 → 채도·밝기 보정, 흑백 커버면 흰색). 배경 글로우는 커버 평균색. 프리셋 선셋/화이트/민트/라일락/체리
- 재생선(세로 흰 선)과 그 위 시간 표시는 **없음**. 가로 기준선은 있음. 라이브 스타일에 LIVE 같은 텍스트 **없음**
- 재생 중 3초간 입력이 없으면 제목·커버·탐색 버튼·하단 컨트롤이 함께 페이드아웃. 마우스·키보드 입력 시 다시 표시. 일시정지 중이나 키보드로 컨트롤에 포커스한 동안에는 표시 유지
- 상단 Search / Playlists / YouTube Music으로 앱을 종료하지 않고 원래 유튜브 뮤직 화면 탐색. 탐색 화면에는 Back to Waveflow 버튼 상시 표시. 재생·파형 수집은 계속됨
- Electron의 기존 상단 창 드래그 영역이 오버레이 클릭을 가로챌 수 있어 `.waveflow`와 버튼은 `-webkit-app-region: no-drag`, 열린 동안 원래 navbar의 드래그 영역도 해제. 이 문제는 브라우저 DOM 모의 검사로 확인되지 않으므로 설치 앱에서 상단 버튼 마우스 클릭을 검증해야 함.
- 단축키: Space 재생, 1–5 스타일, C 색상, M 움직임, F 전체화면, / 검색, P 재생목록, W 탐색/비주얼라이저 전환, Esc 전체화면 해제/탐색, ←→ 5초, +/− 확대
- 글꼴: 번들에 포함한 Pretendard Variable (`assets/`, SIL OFL). UI 문구는 Pear 언어 설정과 관계없이 영어

## 데모와 달라지는 점 (중요)

데모는 파일 전체를 미리 분석해 미래 파형까지 그렸지만, 플러그인에서는 **지금 들리는 소리만** 받을 수 있음.
- 처음 듣는 곡: 재생선을 오른쪽 ~75%로 옮겨 지나온 파형으로 화면을 채움. 스펙트럼 3밴드는 실시간 주파수 데이터에서 계산
- 다시 듣는 곡: 재생하며 쌓은 피크(초당 20개)를 videoId별로 IndexedDB에 저장 → 다음 재생 때 가운데 재생선 기준으로 전체 파형 표시
- 건너뛴 구간은 비어 있음 → 구간별 수집 여부를 함께 저장하고, 빈 구간은 흐리게 처리
- 그리기 코드는 파형 데이터 출처를 `LiveSource` / `CachedSource`로 갈아 끼울 수 있게 분리

## 막힐 수 있는 지점

- 커버 이미지가 ytimg 주소라 canvas `getImageData`가 보안 정책(tainted canvas)에 막힐 수 있음
  → 막히면 메인 프로세스에서 이미지를 받아 색만 계산해 IPC로 전달 (`src/providers/song-info.ts`의 `getImage`가 `net.fetch` 사용)
- 큰 화면(트리플 모니터) 전체에서 Canvas 2D 성능 부족 시 그리기만 WebGL로 교체
- 비공식 유튜브 클라이언트라 유튜브 쪽 변경으로 깨질 수 있음

## 진행 순서

1. Pear Desktop 포크 → `pnpm install` → `pnpm dev`로 실행 확인
2. `src/plugins/waveflow/` 생성, 앱 메뉴에서 켜고 끄기 확인
3. 소리·곡 정보 연결: 콘솔에 레벨 값과 제목이 찍히는지까지만 확인
4. 데모의 그리기 코드를 TS 클래스로 이식 (데이터 출처 분리)
5. 전체화면 오버레이 + 단축키 + 자동 숨김
6. IndexedDB 파형 캐시
7. `pnpm dist:mac:arm64`로 .dmg 빌드 (`build:mac` 스크립트는 없음)

참고: Pear Desktop 공식 설치는 `brew install pear-devs/pear/pear-desktop`
