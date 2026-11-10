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

- **다섯 가지 파형 스타일.** 막대, 리본, 주파수 대역, 실시간 기록, 도트 중에서 원하는 모습을 고를 수 있습니다.
- **앨범 커버에서 가져온 색.** 커버 색상 자동 추출과 Sunset, White, Mint, Lilac, Cherry 프리셋을 제공합니다.
- **음악에 집중하는 화면.** 재생 중 3초간 입력이 없으면 커버·곡 정보·컨트롤이 함께 사라집니다. 마우스나 키보드를 쓰면 다시 나타나고, 일시정지 중에는 계속 표시됩니다.
- **바로 이어지는 탐색.** **Search**, **Playlists**, **YouTube Music**으로 이동하고 **Back to Waveflow**로 돌아오세요. 탐색 중에도 재생과 파형 수집은 이어집니다.
- **들은 구간을 기억하는 파형.** 재생하며 모은 파형을 로컬에 저장해, 같은 곡을 다시 들을 때 더 많은 구간을 볼 수 있습니다.
- **손에 익는 조작.** 전체화면, 키보드 단축키, 파형 드래그와 확대·축소를 지원합니다. 앱의 Waveflow 인터페이스는 Pretendard와 영어 문구를 사용합니다.

### 나만의 흐름 고르기

| 스타일 | 화면 |
| :--- | :--- |
| **Classic** | 기준선 아래에 반사가 비치는 막대 파형 |
| **Ribbon** | 하나로 이어져 부드럽게 흐르는 곡면 |
| **Spectrum** | 저음·중음·고음 대역이 겹쳐지는 파형 |
| **Live** | 지금 들어오는 소리의 실시간 기록 |
| **Dots** | 점으로 그려지는 파형 |

## 빠르게 시작하기

**필요 환경:** Node.js 22.18 이상, pnpm 11 이상.

현재 검증한 환경은 macOS의 Apple Silicon Mac입니다. 상속된 Intel·Windows·Linux 빌드 대상은 Waveflow에서 아직 검증하지 않았습니다.

```sh
git clone https://github.com/choijw1004/waveflow.git
cd waveflow
pnpm install --frozen-lockfile
pnpm dev
```

1. 앱에서 유튜브 뮤직에 로그인합니다.
2. **Plugins(확장)** 메뉴에서 **Waveflow**를 켭니다.
3. 곡을 재생한 뒤 **W**를 누르거나 **Back to Waveflow**를 클릭합니다.

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
| <kbd>1</kbd>–<kbd>5</kbd> | 파형 스타일 선택 |
| <kbd>C</kbd> | 색상 전환 |
| <kbd>M</kbd> | 움직임 강도 전환 |
| <kbd>F</kbd> | 전체화면 전환 |
| <kbd>/</kbd> | 검색 열기 |
| <kbd>P</kbd> | 재생목록 열기 |
| <kbd>←</kbd> / <kbd>→</kbd> | 5초 뒤로 / 앞으로 이동 |
| <kbd>+</kbd> / <kbd>−</kbd> | 확대 / 축소 |
| <kbd>Esc</kbd> | 전체화면 해제 후 유튜브 뮤직으로 돌아가기 |
| 파형 드래그 | 곡의 재생 위치 이동 |

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
