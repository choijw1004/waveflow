<p align="center">
  <img src="icon/banner.svg" alt="Waveflow — 음악이 화면 위를 흐르는 순간" width="100%" />
</p>

<p align="center">
  <strong>음악이 화면 위를 흐르는 순간.</strong><br />
  유튜브 뮤직과 전체화면 파형 비주얼라이저를 함께 담은 데스크톱 플레이어.
</p>

<p align="center">
  <a href="README.md">English</a> · <strong>한국어</strong>
</p>

<p align="center">
  <a href="license"><img src="https://img.shields.io/badge/license-MIT-E53935?style=flat-square" alt="MIT 라이선스" /></a>
  <img src="https://img.shields.io/badge/macOS-Apple%20Silicon-171717?style=flat-square&amp;logo=apple&amp;logoColor=white" alt="macOS Apple Silicon에서 검증" />
  <a href="https://www.electronjs.org/"><img src="https://img.shields.io/badge/Electron-171717?style=flat-square&amp;logo=electron&amp;logoColor=white" alt="Electron 기반" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-171717?style=flat-square&amp;logo=typescript&amp;logoColor=white" alt="TypeScript로 개발" /></a>
</p>

<p align="center">
  <a href="#주요-기능">주요 기능</a> ·
  <a href="#빠르게-시작하기">시작하기</a> ·
  <a href="#키보드-단축키">단축키</a> ·
  <a href="#기여하기">기여하기</a>
</p>

---

Waveflow는 지금 듣는 곡을 흐르는 파형으로 보여줍니다. 마음에 드는 스타일을 고르고, 앨범 커버의 색을 입혀 음악에 집중해 보세요. 다음 곡을 찾고 싶을 때는 검색과 재생목록을 바로 열 수 있습니다.

[Pear Desktop](https://github.com/pear-devs/pear-desktop)을 기반으로, 플레이어와 비주얼라이저를 하나의 저장소에서 개발합니다.

## 주요 기능

- **손끝으로 만지는 음악.** Vinyl은 컬러 파형이 흐르는 정사각형 재킷 뒤로 검은 LP가 드러나는 구성입니다. 밖으로 드러난 판을 한 바퀴 돌리면 30초 이동합니다. 시계 방향은 앞으로, 반대 방향은 뒤로 탐색합니다.
- **메인 선택 다섯 가지, 전체 비주얼 열두 가지.** Flow·Scope·Orbit·Vinyl·Stardust를 메인에서 바로 선택합니다. Flow·Scope·Orbit은 저음과 박자에 더 역동적으로 반응합니다. **Dot styles**에서 Stardust·Constellation·Dot Halo·기존 Dots를, **More styles**에서 기존 타임라인 스타일을 고를 수 있습니다.
- **음악과 함께 흐르는 색.** Album·Aurora·Sunset·Ocean·Rainbow 중에서 고르면 여러 색이 파형 위를 부드럽게 흘러갑니다. 기존 단색도 그대로 선택할 수 있습니다. 일시정지하거나 Motion을 끄면 색의 이동도 멈춥니다.
- **음악에 집중하는 화면.** 재생 중 3초간 입력이 없으면 커버·곡 정보·컨트롤이 함께 사라집니다. 마우스나 키보드를 쓰면 다시 나타나고, 일시정지 중에는 계속 표시됩니다.
- **바로 이어지는 탐색.** **Search**, **Playlists**, **YouTube Music**으로 이동하고 **Back to Waveflow**로 돌아오세요. 탐색 중에도 재생과 파형 수집은 이어집니다.
- **들은 구간을 기억하는 파형.** 재생하며 모은 파형을 로컬에 저장해, 같은 곡을 다시 들을 때 더 많은 구간을 볼 수 있습니다.
- **손에 익는 조작.** 전체화면, 키보드 단축키, 파형 드래그와 확대·축소를 지원합니다. 앱의 Waveflow 인터페이스는 Pretendard와 영어 문구를 사용합니다.

### 나만의 흐름 고르기

| 스타일 | 화면 |
| :--- | :--- |
| **Flow** (기본) | 실시간 주파수에 반응하는 반투명한 물결 |
| **Scope** | 원형 그리드 위에 은은하게 빛나는 실제 오디오 곡선 |
| **Orbit** | 음악에 따라 미세하게 일렁이는 얇은 고리 |
| **Vinyl** | 컬러 파형 재킷 뒤에서 드러나는 LP를 직접 돌려 탐색 |
| **Stardust** | 주파수에 반응하며 여러 겹으로 흘러가는 입자 |
| **Constellation** | 저음에 맞춰 퍼지는 별과 별자리 연결선 |
| **Dot Halo** | 음악에 따라 회전하고 일렁이는 일곱 겹의 도트 고리 |
| **Classic** | 기준선 아래에 반사가 비치는 막대 파형 |
| **Ribbon** | 하나로 이어져 부드럽게 흐르는 곡면 |
| **Spectrum** | 저음·중음·고음 대역이 겹쳐지는 파형 |
| **Live** | 지금 들어오는 소리의 실시간 기록 |
| **Dots** | 점으로 그려지는 파형 |

### 화면으로 보는 기능

실제 Waveflow 렌더러와 컨트롤에 일정한 데모 오디오를 넣어 캡처했습니다. 개인 계정이나 재생목록은 포함하지 않습니다.

![Flow · Aurora — Waveflow](docs/screenshots/flow.jpg)

**메인 스타일 다섯 가지**

위의 큰 물결이 Flow입니다. Scope·Orbit·Vinyl·Stardust도 메인에서 바로 선택할 수 있습니다.

<table>
  <tr>
    <td width="50%"><strong>Scope</strong><br /><img src="docs/screenshots/scope.jpg" alt="Scope — Waveflow" width="100%" /></td>
    <td width="50%"><strong>Orbit</strong><br /><img src="docs/screenshots/orbit.jpg" alt="Orbit — Waveflow" width="100%" /></td>
  </tr>
  <tr>
    <td width="50%"><strong>Vinyl</strong><br /><img src="docs/screenshots/vinyl.jpg" alt="Vinyl — Waveflow" width="100%" /></td>
    <td width="50%"><strong>Stardust</strong><br /><img src="docs/screenshots/particles.jpg" alt="Stardust — Waveflow" width="100%" /></td>
  </tr>
</table>

**다섯 가지 색상 분위기**

Album은 앨범 커버 색을 따라갑니다. Aurora·Sunset·Ocean·Rainbow는 여러 색을 섞어 파형 위로 흘려보냅니다. 색상 선택창에서 바로 고르거나 **C**로 바꿀 수 있습니다.

<table>
  <tr>
    <td width="50%"><strong>Album · 앨범색</strong><br /><img src="docs/screenshots/color-album.jpg" alt="Album · 앨범색 — Waveflow" width="100%" /></td>
    <td width="50%"><strong>Sunset · 선셋</strong><br /><img src="docs/screenshots/color-sunset.jpg" alt="Sunset · 선셋 — Waveflow" width="100%" /></td>
  </tr>
  <tr>
    <td width="50%"><strong>Ocean · 오션</strong><br /><img src="docs/screenshots/color-ocean.jpg" alt="Ocean · 오션 — Waveflow" width="100%" /></td>
    <td width="50%"><strong>Rainbow · 무지개</strong><br /><img src="docs/screenshots/color-rainbow.jpg" alt="Rainbow · 무지개 — Waveflow" width="100%" /></td>
  </tr>
</table>

<details>
<summary><strong>나머지 스타일 보기</strong></summary>

<table>
  <tr>
    <td width="50%"><strong>Constellation</strong><br /><img src="docs/screenshots/constellation.jpg" alt="Constellation — Waveflow" width="100%" /></td>
    <td width="50%"><strong>Dot Halo</strong><br /><img src="docs/screenshots/dot-ring.jpg" alt="Dot Halo — Waveflow" width="100%" /></td>
  </tr>
  <tr>
    <td width="50%"><strong>Classic</strong><br /><img src="docs/screenshots/classic.jpg" alt="Classic — Waveflow" width="100%" /></td>
    <td width="50%"><strong>Ribbon</strong><br /><img src="docs/screenshots/ribbon.jpg" alt="Ribbon — Waveflow" width="100%" /></td>
  </tr>
  <tr>
    <td width="50%"><strong>Spectrum</strong><br /><img src="docs/screenshots/spectrum.jpg" alt="Spectrum — Waveflow" width="100%" /></td>
    <td width="50%"><strong>Live</strong><br /><img src="docs/screenshots/live.jpg" alt="Live — Waveflow" width="100%" /></td>
  </tr>
  <tr>
    <td width="50%"><strong>Dots</strong><br /><img src="docs/screenshots/dots.jpg" alt="Dots — Waveflow" width="100%" /></td>
    <td></td>
  </tr>
</table>

</details>

**음악에 집중하는 화면과 직접 만지는 재생**

재생 중에는 커버와 컨트롤이 함께 사라집니다. LP를 돌리는 동안에는 재생 위치를 계속 표시하고, 타임라인 스타일에서는 이전에 들으며 저장한 파형을 볼 수 있습니다.

<table>
  <tr>
    <td width="50%"><strong>컨트롤을 숨긴 몰입 화면</strong><br /><img src="docs/screenshots/immersive.jpg" alt="컨트롤을 숨긴 몰입 화면 — Waveflow" width="100%" /></td>
    <td width="50%"><strong>LP를 돌려 재생 위치 이동</strong><br /><img src="docs/screenshots/vinyl-scrubbing.jpg" alt="LP를 돌려 재생 위치 이동 — Waveflow" width="100%" /></td>
  </tr>
</table>

<details>
<summary><strong>작은 창에서도 사용</strong></summary>

<img src="docs/screenshots/compact.jpg" alt="Waveflow compact window" width="390" />

</details>

## 빠르게 시작하기

**Apple Silicon Mac:** [저장소 최상위의 최신 DMG 다운로드](https://github.com/choijw1004/waveflow/raw/refs/heads/main/Waveflow-3.12.0-arm64.dmg). 체크섬은 [`Waveflow-3.12.0-arm64.dmg.sha256`](Waveflow-3.12.0-arm64.dmg.sha256)에 있습니다.

**필요 환경:** Node.js 22.18 이상, pnpm 11 이상.

현재 검증한 환경은 macOS의 Apple Silicon Mac입니다. 상속된 Intel·Windows·Linux 빌드 대상은 Waveflow에서 아직 검증하지 않았습니다.

```sh
git clone https://github.com/choijw1004/waveflow.git
cd waveflow
pnpm install --frozen-lockfile
pnpm dev
```

1. 앱을 열면 Waveflow 파형 화면이 먼저 나타납니다.
2. **YouTube Music**을 눌러 로그인하거나 **Search**에서 곡을 찾습니다.
3. 곡을 재생한 뒤 **W**를 누르거나 **Back to Waveflow**를 클릭합니다.

Waveflow는 기본으로 활성화됩니다. 이전에 직접 껐다면 **Plugins(확장)** 메뉴에서 다시 켤 수 있습니다.

모든 명령은 이 저장소에서 실행합니다. 별도 Pear Desktop 체크아웃이나 동기화 과정은 필요하지 않습니다.

### 음악과 화면 사이를 오가기

| 버튼 | 동작 |
| :--- | :--- |
| **Search** | 유튜브 뮤직 검색을 열고 검색창에 포커스 |
| **Playlists** | 내 유튜브 뮤직 재생목록 열기 |
| **YouTube Music** | 현재 탐색 중인 유튜브 뮤직 화면으로 돌아가기 |
| **Back to Waveflow** | 비주얼라이저로 돌아가기 |

### macOS 앱 빌드하기

```sh
pnpm dist:mac:arm64
```

앱과 설치 파일은 `pack/`에 생성됩니다.

```text
pack/
├── mac-arm64/Waveflow.app
└── Waveflow-<version>-arm64.dmg
```

현재 macOS 패키지는 로컬 실행용 ad-hoc 서명을 사용하며 Apple 공증은 받지 않았습니다. Homebrew 배포는 아직 구성되지 않았으므로 위 명령으로 소스에서 빌드할 수 있습니다.

## 키보드 단축키

| 키 | 동작 |
| :--- | :--- |
| <kbd>W</kbd> | Waveflow와 유튜브 뮤직 화면 전환 |
| <kbd>Space</kbd> | 재생 / 일시정지 |
| <kbd>1</kbd>–<kbd>3</kbd> | Flow / Scope / Orbit |
| <kbd>4</kbd>–<kbd>8</kbd> | Classic / Ribbon / Spectrum / Live / Dots |
| <kbd>9</kbd> / <kbd>V</kbd> | 실시간 주파수 + 직접 조작하는 LP |
| <kbd>D</kbd> | Stardust / Constellation / Dot Halo / Dots 전환 |
| <kbd>C</kbd> | 색상 전환 |
| <kbd>M</kbd> | 움직임 강도 전환 |
| <kbd>F</kbd> | 전체화면 전환 |
| <kbd>/</kbd> | 검색 열기 |
| <kbd>P</kbd> | 재생목록 열기 |
| <kbd>←</kbd> / <kbd>→</kbd> | 5초 뒤로 / 앞으로 이동 |
| <kbd>+</kbd> / <kbd>−</kbd> | 확대 / 축소 |
| <kbd>Esc</kbd> | 전체화면 해제 후 유튜브 뮤직으로 돌아가기 |
| 파형 드래그 | 곡의 재생 위치 이동 |
| LP 돌리기 | 한 바퀴당 30초 탐색, 회전 중 타임라인 즉시 반영 |

비주얼라이저 단축키는 Waveflow 화면에서 동작합니다. **W**는 탐색 화면에서도 사용할 수 있으며, 검색창 등에서 글을 입력하는 중에는 동작하지 않습니다.

<details>
<summary><strong>파형은 어떻게 기억하나요?</strong></summary>

처음 듣는 곡은 소리가 재생되는 동안 파형의 피크를 수집합니다. 수집한 값은 곡별로 로컬 IndexedDB에 저장됩니다. 다시 들을 때는 저장된 구간을 현재 재생 위치보다 앞쪽에서도 보여줄 수 있습니다.

건너뛴 구간은 해당 부분을 들을 때까지 비어 있습니다. 파형 저장을 끄거나 기록을 지우려면 Waveflow 플러그인 메뉴를 이용하세요.

</details>

## 개발하기

| 명령 | 용도 |
| :--- | :--- |
| `pnpm dev` | 개발 모드로 데스크톱 앱 실행 |
| `pnpm screenshots` | 데모 오디오로 README 기능 화면 캡처 |
| `pnpm test` | 파형·브랜딩·UI 통합 검사 |
| `pnpm typecheck` | TypeScript 타입 검사 |
| `pnpm build` | Electron 메인·프리로드·렌더러 번들 빌드 |
| `pnpm start` | 빌드한 앱 실행 |
| `pnpm dist:mac:arm64` | Apple Silicon 앱과 DMG 패키징 |

<details>
<summary><strong>저장소 구조</strong></summary>

```text
src/
├── plugins/waveflow/       파형 렌더링·오디오 수집·탐색·캐시
├── i18n/resources/         인터페이스 문구
├── brand.ts               앱 이름·식별자·창 제목
└── ...                    Pear Desktop 호스트
icon/                      앱 아이콘과 README 배너
tests/                     파형·브랜딩 검사
scripts/check-ui.mjs       UI 통합 검사
waveflow/reference/        초기 비주얼 레퍼런스
```

</details>

## 기여하기

버그 제보, 새로운 시각 표현, 성능 개선, 풀 리퀘스트를 환영합니다.

- [이슈](https://github.com/choijw1004/waveflow/issues)에 버그 재현 방법이나 아이디어를 남겨 주세요.
- 코드를 변경했다면 풀 리퀘스트를 열기 전에 `pnpm test`와 `pnpm typecheck`를 실행해 주세요.
- 화면이나 조작을 변경했다면 스크린샷 또는 짧은 영상을 첨부하고 데스크톱 앱에서 동작을 확인해 주세요.

## 크레딧과 라이선스

Waveflow는 [Pear Desktop](https://github.com/pear-devs/pear-desktop)을 기반으로 합니다. 호스트 소스는 커밋 [`3337446`](https://github.com/pear-devs/pear-desktop/commit/3337446b448454125ad261099a25f6b10fbb8cb6)을 기준으로 가져왔으며, 원저작자의 저작권 표기를 [MIT 라이선스](license)에 유지합니다.

인터페이스에 사용하는 [Pretendard](https://github.com/orioncactus/pretendard)는 [SIL Open Font License](src/plugins/waveflow/assets/Pretendard-LICENSE.txt)에 따라 번들에 포함합니다.

---

<p align="center">
  <a href="https://github.com/choijw1004/waveflow">소스 코드</a> ·
  <a href="https://github.com/choijw1004/waveflow/issues">이슈</a> ·
  <a href="README.md">Read in English</a>
</p>
