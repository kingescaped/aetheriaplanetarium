# 🏛️ KIẾN TRÚC HỆ THỐNG DỰ ÁN AETHERIA (ARCHITECTURE)

> **Tài liệu Kỹ thuật Dự án:** Cấu trúc Mã nguồn, Luồng Xử lý Lõi & Quy chuẩn Thiết kế  
> **Phiên bản:** v2.5.0 Zenith 3D Edition (Cập nhật 25/11/2026)

---

## 1. 📂 Cấu trúc Thư mục (Project Folder Structure)

```text
E:\AetheriaPlanetarium\
├── dist/                               # Bản build production (HTML, CSS, JS minified, sw.js)
├── docs/                               # Tài liệu kiến trúc và bàn giao kỹ thuật
│   ├── HANDOVER.md                     # Bản ghi bàn giao giữa các phiên làm việc
│   └── ARCHITECTURE.md                 # Tài liệu kiến trúc và quy chuẩn hệ thống
├── public/                             # Tài nguyên tĩnh, manifest.json, apple-touch-icon.png, pwa-192x192.png, pwa-512x512.png
├── src/                                # Toàn bộ mã nguồn ứng dụng
│   ├── components/
│   │   ├── account/
│   │   │   ├── AboutSection.tsx        # Mục Thông tin ứng dụng chuẩn iOS Inset Grouped
│   │   │   └── AccountModal.tsx        # Modal cài đặt & tài khoản (Master-Detail Desktop, Stack Mobile)
│   │   ├── common/
│   │   │   ├── AetheriaLogo.tsx        # Logo ngôi sao 8 cánh (useId tránh trùng SVG gradient ID)
│   │   │   └── AetheriaSplashScreen.tsx# Màn hình khởi tạo đồng bộ Safe Area (z-[9999])
│   │   ├── layout/
│   │   │   ├── BottomHUD.tsx           # Thanh HUD góc nhìn & la bàn (Desktop)
│   │   │   ├── BottomNav.tsx           # Thanh điều hướng Tabview đáy màn hình (Mobile)
│   │   │   ├── Header.tsx              # Thanh tiêu đề đỉnh (Capsule gọn trên Mobile, Full Bar trên Desktop)
│   │   │   ├── InfoPanel.tsx           # Bảng thông tin sao chi tiết (Desktop)
│   │   │   ├── IOSNavigationBar.tsx    # Thanh UINavigationBar dùng chung cho Drawer/Modal
│   │   │   ├── IOSSwitch.tsx           # UISwitch pill Apple kèm âm thanh haptic
│   │   │   ├── Sidebar.tsx             # Bảng điều khiển thiên văn bên trái (hỗ trợ vuốt mép phải đóng trên Mobile)
│   │   │   ├── StarBottomSheet.tsx     # Thẻ bottom sheet xem thông tin sao (Mobile)
│   │   │   ├── StarTelemetryHUD.tsx    # Thẻ đo đạc Telemetry (Alt, Az, Mag, Khoảng cách)
│   │   │   └── TopSafeBar.tsx          # Vỏ thanh đỉnh thống nhất dùng chung cho mọi màn hình
│   │   ├── planetarium/
│   │   │   └── SkyMap2D.tsx            # Bản đồ sao 2D Canvas Alt-Azimuth
│   │   ├── pwa/
│   │   │   └── PWAInstallBanner.tsx    # Banner gợi ý cài đặt PWA & Offline Ready
│   │   ├── search/
│   │   │   └── SearchBarModal.tsx      # Modal tìm kiếm thiên thể (hỗ trợ vuốt mép trái đóng)
│   │   └── zenith3d/                   # Vòm Thiên Đỉnh 3D (Three.js / R3F)
│   │       ├── CameraController.tsx
│   │       ├── ConstellationLabels3D.tsx
│   │       ├── ConstellationLines3D.tsx
│   │       ├── DomeLookControls.tsx
│   │       ├── GroundHorizon3D.tsx
│   │       ├── HorizonSilhouette3D.tsx
│   │       ├── StarPoints3D.tsx
│   │       ├── TargetSimulation3D.tsx
│   │       └── ZenithDomeCanvas.tsx
│   ├── data/                           # constellations.ts (88 chòm sao IAU), stars.ts (5.200+ sao)
│   ├── hooks/
│   │   ├── useDeviceOrientation.ts     # Cảm biến la bàn AR & xin quyền iOS
│   │   ├── useEdgeSwipeBack.ts         # Hook cử chỉ vuốt mép trái/phải giới hạn 28px chuẩn iOS
│   │   └── usePWA.ts                   # Đăng ký Workbox SW (chỉ Production) & trạng thái cài đặt
│   ├── types/                          # account.ts, celestial.ts
│   ├── utils/
│   │   ├── astronomy.ts                # LST, Alt-Az, batchComputeHorizontalCoordsInPlace
│   │   ├── audio.ts                    # Bộ tổng hợp âm thanh Web Audio API
│   │   ├── coordinates3D.ts            # Hệ tọa độ thiên cầu 3D
│   │   ├── i18n.ts                     # Từ điển song ngữ VI / EN
│   │   └── viewport.ts                 # Hiệu chuẩn --app-height, --visual-vh & dọn blur iOS
│   ├── App.tsx                         # State Machine & Two-Row App Shell
│   ├── index.css                       # CSS tokens Safe Area, Glassmorphism, Dark Scheme
│   └── main.tsx                        # Khởi chạy React & hiệu chuẩn viewport
├── index.html                          # Entry HTML, PWA Meta Tags & #ios-status-bar-shield
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## 2. 🧠 Luồng Logic Cốt lõi (Core Logic Flow)

### A. Thuật toán Thiên văn học (`Celestial Mechanics`)
Vị trí mọi ngôi sao được tính động theo tọa độ địa lý (`latitude`, `longitude`), mốc thời gian (`currentDate`), Giờ thiên văn địa phương (`LST`) và hệ tọa độ Chân trời `Alt-Azimuth`, đồng bộ tức thì sang cả `SkyMap2D` và `ZenithDomeCanvas` (`r = 500`) với 0 cấp phát rác (`batchComputeHorizontalCoordsInPlace`).

### B. Kiến trúc State Tập Trung & Cô lập Lớp (`Stacking Context`) trong [App.tsx](file:///e:/AetheriaPlanetarium/src/App.tsx)
- Vùng không gian vẽ (`Workspace` và `<main>`) được cô lập qua `z-0 isolate`, truyền `hideHtmlOverlays={isAnyModalOpen || (isMobile && isSidebarOpen)}` sang `ZenithDomeCanvas` và giới hạn `zIndexRange={[10, 0]}` trên mọi nhãn Drei `<Html>` để không bao giờ xuyên lên trên `AccountModal`, `Sidebar`, hay `SearchBarModal`.
- `<AetheriaSplashScreen />` (`z-[9999]`, `fixed top-0 left-0 right-0`) đặt ngang hàng với `#aetheria-app-shell` dưới `#root` để nằm trên `#ios-status-bar-shield` (`z-index: 90`).
- Các lớp Level-0 (`relative z-10 isolate`) và Level-1 (`z-30 isolate`) trong `AccountModal` được cô lập tách biệt để thanh tiêu đề mục con (`< Cài đặt`) luôn hiển thị đúng trên đỉnh.

### C. Bộ Tổng hợp Âm thanh Web Audio API ([audio.ts](file:///e:/AetheriaPlanetarium/src/utils/audio.ts))
- `playStarSelect()`, `playTargetRayTrace()`, `playTabClick()`, `playToggle()` tổng hợp trực tiếp bằng Oscillator / BiquadFilter / GainEnvelope (0ms trễ, không phụ thuộc file âm thanh ngoài).

---

## 3. 🎨 Quy chuẩn Thiết kế & Hệ thống Giao diện (Design System Rules)

### A. Bảng Màu Không Gian Sâu (Cosmic Color Palette)
- **Nền chính:** `#030712` (`space-950`, đồng bộ xuyên suốt HTML, `manifest.json`, `#ios-status-bar-shield`, `TopSafeBar`, `BottomNav`, và mọi modal).
- **Accent Cyan:** `#38bdf8`, **Purple:** `#a855f7`, **Amber:** `#fbbf24`, và lớp `.night-vision` lọc đỏ bảo vệ mắt ban đêm.

### B. Quy tắc Glassmorphism & Tối ưu Thị giác Mobile
- Các thẻ nổi và bảng điều khiển dùng `.glass-panel` / `.glass-input`.
- Các thanh neo mép màn hình (`TopSafeBar`, `BottomNav`) dùng nền đặc `#030712` (không dùng `backdrop-filter` trên thanh dính mép) để tránh xung đột lấy mẫu màu cạnh trên WebKit iOS.

### C. Kiến trúc App Shell & An toàn Safe Area ([index.css](file:///e:/AetheriaPlanetarium/src/index.css), [viewport.ts](file:///e:/AetheriaPlanetarium/src/utils/viewport.ts))
- **Two-Row Flex Shell (`#aetheria-app-shell`):** Gắn `fixed top-0 left-0 right-0` với `height: var(--app-height, 100vh)` (không dùng `bottom: 0` hay `100dvh`). Trên iOS Standalone có `satPx > 0`, [index.html](file:///e:/AetheriaPlanetarium/index.html) (Frame-0) và `initViewportCalibration()` mở rộng `--app-height` bằng chiều cao màn hình vật lý để `BottomNav` (Row 2) luôn chạm sát đáy vật lý.
- **Thống nhất thanh đỉnh qua `<TopSafeBar />`:** Toàn bộ màn hình đầu (`Header`, `IOSNavigationBar`, `SearchBarModal`) dùng [TopSafeBar.tsx](file:///e:/AetheriaPlanetarium/src/components/layout/TopSafeBar.tsx) đọc 3 CSS tokens:
  - `--ios-top-blur-clearance`: `0px` mặc định; `18px` trên `html.ios-standalone` khi `@media (orientation: portrait) and (max-width: 767px)`.
  - `--top-bar-pt: calc(var(--sat) + var(--ios-top-blur-clearance))` (dùng bởi `.safe-pt` và `#ios-status-bar-shield`).
  - `--top-bar-row-h: 40px` (`56px` từ `md:` trở lên), tạo `--header-h: calc(var(--top-bar-row-h) + var(--top-bar-pt))`.
- **Giới hạn nền tảng đã ghi nhận (iOS 26/27 `UIScrollEdgeEffect`):** WebKit iOS 26/27 ép phủ dải kính mờ OS ở cạnh trên các Home Screen PWA (`black-translucent` bị khai tử theo WebKit Bug 301994 / 317153). Dự án kết hợp `apple-mobile-web-app-status-bar-style="black"`, `#ios-status-bar-shield`, cơ chế sweep `#ios-blur-cover` + `#ios-blur-panel` (`rgba(255,255,255,0.01)`) và `--ios-top-blur-clearance: 18px` để giữ thanh trên gọn và sắc nét nhất có thể trong giới hạn trình duyệt web (muốn 0px tuyệt đối như app native cần bọc `WKWebView` để đặt `topEdgeEffect.isHidden = true`).

### D. Quy tắc Thành phần Điều khiển
- **100% `<IOSSwitch />`**, không dùng `<input type="checkbox">` thuần.
- **Kích thước font input tối thiểu `16px`** trên màn hình cảm ứng (`@media (pointer: coarse)`) để iOS không tự phóng to viewport khi nhập liệu.
- **Cần thêm màn hình mới?** Bọc phần đầu bằng `<TopSafeBar />` hoặc `<IOSNavigationBar />` để kế thừa trọn bộ Safe Area và blur clearance tự động.

### E. Quy tắc Cử chỉ Vuốt Mép (`Edge-Swipe Back`) — [useEdgeSwipeBack.ts](file:///e:/AetheriaPlanetarium/src/hooks/useEdgeSwipeBack.ts)
- **Tổng quan:** Hỗ trợ đóng drawer/modal hoặc quay lại màn hình trước trên iOS/mobile bằng thao tác kéo mượt 120fps theo ngón tay (`cubic-bezier [0.32, 0.72, 0, 1]`).
- **Xác thực đầu vào & Điều kiện bắt buộc (Prerequisites / Validation):**
  1. Cửa sổ đang mở (`enabled === true`); với `Sidebar`, thêm điều kiện viewport di động `< 768px`.
  2. Chạm đơn 1 ngón (`touches.length === 1`), **không** bắt đầu từ `input`, `select`, `textarea` (tránh tranh chấp thanh trượt `range`).
  3. Tọa độ chạm ban đầu (`clientX`) phải nằm trong **dải mép `28px`** (`EDGE_SWIPE_DEFAULTS.edgeWidth`) tính từ cạnh đúng của **chính cửa sổ đó** (`rect.left` hoặc `rect.right`), tuyệt đối không bắt vuốt giữa màn hình hay cạnh đối diện.
  4. Khóa hướng khi dịch chuyển `> 8px` với tỉ lệ `|Δx| > |Δy| × 1.2` theo đúng chiều đóng; thả tay kích hoạt đóng khi kéo `>= 60px` hoặc vẩy `>= 30px` với vận tốc `> 0.3 px/ms`.
- **Phân bổ cạnh theo từng cửa sổ:**
  - [AccountModal.tsx](file:///e:/AetheriaPlanetarium/src/components/account/AccountModal.tsx) (Level-0 Cài đặt gốc & Level-1 Mục con): `edge: 'left'` → chạm sát mép trái màn hình (`<= 28px`), vuốt sang phải để đóng hoặc quay lại cấp Cài đặt.
  - [SearchBarModal.tsx](file:///e:/AetheriaPlanetarium/src/components/search/SearchBarModal.tsx): `edge: 'left'` → chạm sát mép trái (`<= 28px`), vuốt sang phải để đóng.
  - [Sidebar.tsx](file:///e:/AetheriaPlanetarium/src/components/layout/Sidebar.tsx) (`Bảng điều khiển`, drawer trượt từ trái): `edge: 'right'` → chạm sát mép phải của chính tấm drawer (`rect.right - clientX <= 28px`), vuốt sang trái để đóng.
- **Cách áp dụng cho cửa sổ mới:** Import `useEdgeSwipeBack` từ [useEdgeSwipeBack.ts](file:///e:/AetheriaPlanetarium/src/hooks/useEdgeSwipeBack.ts), chọn `edge: 'left'` (modal/sheet trượt từ phải) hoặc `edge: 'right'` (drawer trượt từ trái) và gắn `{...handlers}` + `style` lên lớp nội dung nổi.
