# 🚀 DỰ ÁN AETHERIA PLANETARIUM - TÀI LIỆU BÀN GIAO (HANDOVER)

> **Checkpoint Phiên làm việc:** 25/11/2026  
> **Tác giả / Maintainer:** Quang Vo (LVQ Std)  
> **Dành cho:** AI Agent / Developer kế thừa phiên tiếp theo

---

## 1. 🔭 Tổng quan Dự án (Project Overview)
**Aetheria Planetarium** là ứng dụng web/PWA thiên văn học mô phỏng bầu trời sao tương tác thời gian thực với giao diện Deep Space Glassmorphic UI, tối ưu chuẩn ứng dụng di động iOS/Android bản địa.

Ứng dụng sở hữu 2 chế độ hiển thị lõi:
1. **Bản đồ 2D (`SkyMap2D`):** Chiếu trực giao Alt-Azimuth toàn bộ vòm trời với lưới tọa độ, đường nối 88 chòm sao IAU, quầng phát quang quang phổ và thao tác pan/zoom tự do.
2. **Vòm Thiên Đỉnh 3D (`ZenithDomeCanvas`):** WebGL / Three.js xoay $360^\circ$ chân trời, ngửa $90^\circ$ thiên đỉnh (Zenith), rặng núi & đài thiên văn 360°, vòng ngắm holographic 3D và chế độ la bàn AR.

---

## 2. 🛠️ Tech Stack & Thư viện (Precise Versions)
- **Core Framework:** React 18.3.1 (`react`, `react-dom`)
- **Ngôn ngữ:** TypeScript 5.4.5 (Strict type checking)
- **Bundler & Dev Server:** Vite 5.4.21 (`vite` ^5.2.12), `vite-plugin-pwa` ^2.0.0
- **3D Graphics Engine:** Three.js 0.165.0, `@react-three/fiber` 8.16.8, `@react-three/drei` 9.106.0
- **Styling:** Tailwind CSS 3.4.3, Autoprefixer 10.4.19, PostCSS 8.4.38
- **UI Animations:** Framer Motion 11.2.10
- **Biểu tượng (Icons):** Lucide React 0.383.0
- **Class Utilities:** `clsx` 2.1.1, `tailwind-merge` 2.3.0
- **Âm thanh (Audio Engine):** Web Audio API synthesizer thuần (`src/utils/audio.ts`)

---

## 3. 🎯 Tiến độ hiện tại (Current State & Completed Tasks)

### A–E. Nền tảng Mobile UI, Code-Splitting, AR Tracker, PWA Workbox & 5.200+ Sao (23/11/2026)
- Xây dựng giao diện song ngữ Anh–Việt với 88 chòm sao IAU, danh mục 5.200+ sao (`batchComputeHorizontalCoordsInPlace`, GPU shader `uMagLimit` 60 FPS), cảm biến AR (`useDeviceOrientation.ts`), code-splitting (`React.lazy`), và Workbox Service Worker.

### F–I. Raycasting 3D, Mở khóa Camera AR, Logo 8 cánh & Nhận diện thương hiệu (23/11/2026)
- Angular Distance Raycasting 3D chính xác (`DomeLookControls.tsx`), vòng ngắm Holographic (`TargetSimulation3D.tsx`), Additive Manual Drag Offset khi bật AR, nút AR neo nổi trên `StarBottomSheet.tsx`.

### J. Khắc phục Triệt để iOS PWA Safe Area, TopSafeBar Thống Nhất, About UI & Edge-Swipe 28px (25/11/2026)
1. **Khung vỏ 2 tầng & Hiệu chuẩn Viewport iOS Standalone ([App.tsx](file:///e:/AetheriaPlanetarium/src/App.tsx), [viewport.ts](file:///e:/AetheriaPlanetarium/src/utils/viewport.ts), [index.html](file:///e:/AetheriaPlanetarium/index.html)):**
   - Giải quyết dứt điểm khoảng hở đáy `~59px` dưới `BottomNav` trên iPhone Home Screen PWA bằng cấu trúc 2 tầng Flex (`#aetheria-app-shell`, `height: var(--app-height)`), đo `satPx > 0` ngay Frame-0 để phân biệt full-bleed với non-translucent status bar.
   - Bỏ ghi đè CSS `--sat/--sab` cứng, tách đăng ký Service Worker chỉ chạy khi `import.meta.env.DEV === false` ([usePWA.ts](file:///e:/AetheriaPlanetarium/src/hooks/usePWA.ts)), bổ sung nhận diện iPadOS 13+, tạo bộ icon PNG không trong suốt (`apple-touch-icon.png`, `pwa-192x192.png`, `pwa-512x512.png`).
   - Nâng kích thước font input mobile tối thiểu `16px` (`@media (pointer: coarse)`), sửa `touch-action` toàn cục sang `touch-manipulation`, thêm `useDragControls` cho `StarBottomSheet`.
2. **Vùng đỉnh Thống nhất & Giảm thiểu Blur iOS 26/27 ([TopSafeBar.tsx](file:///e:/AetheriaPlanetarium/src/components/layout/TopSafeBar.tsx), [Header.tsx](file:///e:/AetheriaPlanetarium/src/components/layout/Header.tsx), [IOSNavigationBar.tsx](file:///e:/AetheriaPlanetarium/src/components/layout/IOSNavigationBar.tsx), [SearchBarModal.tsx](file:///e:/AetheriaPlanetarium/src/components/search/SearchBarModal.tsx), [index.css](file:///e:/AetheriaPlanetarium/src/index.css)):**
   - Hợp nhất toàn bộ `<header>` về một component duy nhất `<TopSafeBar />` dùng tokens `--ios-top-blur-clearance` (`18px` trên portrait mobile standalone), `--top-bar-pt`, `--top-bar-row-h` (`40px` mobile / `56px` desktop) và `#ios-status-bar-shield` ngoài `#root`.
   - Thiết kế `Header` mobile dạng capsule gọn `36px`, gỡ shadow halo cyan trên mobile và không giữ `backdrop-blur-xs` trên backdrop `Sidebar` khi đang đóng.
   - Tích hợp cặp lớp dọn composite `#ios-blur-cover` + `#ios-blur-panel` (`rgba(255,255,255,0.01)`) trong `viewport.ts` khi khởi chạy, sau splash, và lúc quay lại từ nền.
3. **Cô lập 3D `<Html>` & Sửa Stack Cài đặt ([ZenithDomeCanvas.tsx](file:///e:/AetheriaPlanetarium/src/components/zenith3d/ZenithDomeCanvas.tsx), [AccountModal.tsx](file:///e:/AetheriaPlanetarium/src/components/account/AccountModal.tsx)):**
   - Giới hạn `zIndexRange={[10, 0]}` + `hideHtmlOverlays` ở cả 5 thành phần Drei `<Html>` và bọc Workspace/`<main>` bằng `z-0 isolate` để nhãn 3D không đè lên modal `Cài đặt`.
   - Cô lập Level-0 (`z-10 isolate`) và Level-1 (`z-30 isolate`) trong `AccountModal` để luôn hiển thị `< Cài đặt` và tiêu đề căn giữa ở mục con, sửa kích thước avatar `w-12 h-12`.
   - Đưa `<AetheriaSplashScreen />` thành sibling của `#aetheria-app-shell` (`fixed top-0 left-0 right-0 z-[9999]`) để luôn nằm trên `#ios-status-bar-shield`.
4. **Thiết kế lại Mục Thông tin ứng dụng ([AboutSection.tsx](file:///e:/AetheriaPlanetarium/src/components/account/AboutSection.tsx), [AetheriaLogo.tsx](file:///e:/AetheriaPlanetarium/src/components/common/AetheriaLogo.tsx)):**
   - Bố cục iOS Inset Grouped gồm Hero căn giữa (nút copy phiên bản `Zenith 3D • v2.5.0`), Nguồn dữ liệu khoa học (Hipparcos / IAU 88 / J2000.0), Có gì mới, Quyền riêng tư cục bộ, Tác giả & Liên hệ (`Quang Vo` / `LVQ Std` / `kingescaped.dev@gmail.com` / `@kingescaped`), Giấy phép mã nguồn mở, và Footer `© 2026 Aetheria Planetarium - LVQ Std`.
   - Sửa trùng SVG gradient ID bằng `useId()` trong `AetheriaLogo.tsx`.
5. **Chuẩn hóa Cử chỉ Vuốt Mép 28px ([useEdgeSwipeBack.ts](file:///e:/AetheriaPlanetarium/src/hooks/useEdgeSwipeBack.ts), [Sidebar.tsx](file:///e:/AetheriaPlanetarium/src/components/layout/Sidebar.tsx), [AccountModal.tsx](file:///e:/AetheriaPlanetarium/src/components/account/AccountModal.tsx), [SearchBarModal.tsx](file:///e:/AetheriaPlanetarium/src/components/search/SearchBarModal.tsx)):**
   - Khóa chặt vùng cảm ứng vuốt quay lại trong đúng **`28px` sát mép cửa sổ** (`EDGE_SWIPE_DEFAULTS.edgeWidth`), bỏ `drag="x"` toàn màn hình cũ trên `AccountModal` Level-1 (vốn khiến vuốt từ cạnh phải iPhone vẫn kích hoạt quay lại).
   - Mở rộng hỗ trợ `edge: 'right'` (chạm mép phải drawer vuốt sang trái để đóng) cho `Sidebar` (`Bảng điều khiển`) trên mobile `< 768px`, cùng `edge: 'left'` thống nhất cho `AccountModal` (cấp gốc & mục con) và `SearchBarModal`.

### K. Tích hợp Thời tiết Thiên văn Open-Meteo, Mô phỏng Mây 2D/3D & Audit Google Lighthouse (25/11/2026)
1. **Dữ liệu Khí tượng & Mô hình Seeing ([openMeteo.ts](file:///e:/AetheriaPlanetarium/src/services/openMeteo.ts), [seeingModel.ts](file:///e:/AetheriaPlanetarium/src/utils/seeingModel.ts), [useAstronomyWeather.ts](file:///e:/AetheriaPlanetarium/src/hooks/useAstronomyWeather.ts), [weather.ts](file:///e:/AetheriaPlanetarium/src/types/weather.ts)):**
   - Kết nối `https://api.open-meteo.com/v1/forecast` (`current` + `hourly` 96 giờ gồm `past_days=1` và `forecast_days=3`, `timeformat=unixtime`, `timezone=auto`) với debounce `400ms` theo tọa độ, timeout `10s`, AbortController và cache cục bộ (`localStorage` + RAM, TTL 15 phút, tối đa 8 tọa độ) kèm Workbox `NetworkFirst` trong [vite.config.ts](file:///e:/AetheriaPlanetarium/vite.config.ts).
   - Mô hình thuần túy `computeSeeingMetrics()` tính điểm Seeing `0–100`, ước lượng arcsecond (`0.8"–4.5"`), phân hạng 4 mức (`excellent` / `good` / `fair` / `poor`), chênh lệch điểm sương (`dewSpreadC`), và `interpolateWeatherAtDate()` nội suy tuyến tính theo đồng hồ mô phỏng (`SkyMap2D` / `ZenithDomeCanvas` đồng bộ theo phút).
   - Kiểm thử đơn vị `tests/weather.test.ts` chạy qua `node --test tests/weather.test.ts` đạt `8/8` pass.
2. **Mô phỏng Khí quyển Trực quan 2D & 3D ([skyWeatherOverlay2D.ts](file:///e:/AetheriaPlanetarium/src/components/planetarium/skyWeatherOverlay2D.ts), [SkyMap2D.tsx](file:///e:/AetheriaPlanetarium/src/components/planetarium/SkyMap2D.tsx), [CloudVeil3D.tsx](file:///e:/AetheriaPlanetarium/src/components/zenith3d/CloudVeil3D.tsx), [StarPoints3D.tsx](file:///e:/AetheriaPlanetarium/src/components/zenith3d/StarPoints3D.tsx), [ConstellationLines3D.tsx](file:///e:/AetheriaPlanetarium/src/components/zenith3d/ConstellationLines3D.tsx), [ZenithDomeCanvas.tsx](file:///e:/AetheriaPlanetarium/src/components/zenith3d/ZenithDomeCanvas.tsx)):**
   - Khi bật `simulateSkyWeather`, `computeSkyVisualAttenuation()` giảm cấp sao giới hạn (`magPenalty`), làm mờ độ sáng sao (`starOpacity`, giữ ngưỡng sao cực sáng `mag < 1.0`), giảm độ rõ nét chòm sao (`constellationOpacity`), tăng nhấp nháy nhiễu động (`uTwinkleBoost` trong GLSL), và phủ lớp sương mù / dải mây trên cả bản đồ 2D lẫn vòm 3D WebGL (`CloudVeil3D`).
3. **Giao diện Badge Thu Gọn & Bảng Chi Tiết Đồng Bộ Theo Giờ ([WeatherBadge.tsx](file:///e:/AetheriaPlanetarium/src/components/weather/WeatherBadge.tsx), [WeatherDetailPanel.tsx](file:///e:/AetheriaPlanetarium/src/components/weather/WeatherDetailPanel.tsx), [WeatherMetricsCard.tsx](file:///e:/AetheriaPlanetarium/src/components/weather/WeatherMetricsCard.tsx), [WeatherHourlyStrip.tsx](file:///e:/AetheriaPlanetarium/src/components/weather/WeatherHourlyStrip.tsx)):**
   - Badge thu gọn hiển thị `% mây` và hạng Seeing trên Desktop (`Header`) và góc trên trái Mobile (`App.tsx`, không đè lên `StarTelemetryHUD`).
   - Bấm mở chi tiết xem điểm Seeing, tầng mây Thấp/Trung/Cao, độ ẩm, điểm sương + cảnh báo đọng sương (`ΔT < 2.5°C`), gió, tầm nhìn, công tắc `<IOSSwitch />` bật/tắt mô phỏng bầu trời, và dải dự báo 36 giờ chạm để tua đồng hồ thiên văn sang giờ đó.
4. **Tối ưu & Audit Google Lighthouse trên `vite preview` ([vite.config.ts](file:///e:/AetheriaPlanetarium/vite.config.ts), [App.tsx](file:///e:/AetheriaPlanetarium/src/App.tsx), [viewport.ts](file:///e:/AetheriaPlanetarium/src/utils/viewport.ts), [index.html](file:///e:/AetheriaPlanetarium/index.html)):**
   - Lazy-load `ZenithDomeCanvas`, `AccountModal`, `SearchBarModal` và tách `vite/preload-helper` sang `vendor-react` + lọc `modulePreload` để `vendor-three` (`713.63 kB`) không nạp ở màn hình 2D ban đầu.
   - Giảm tick clock `1x` về `1000ms` (tính lại sao mỗi `15s` khi chạy `1x`), đo kích thước `SkyMap2D` bằng `ResizeObserver`, bỏ `shadowBlur` trên 88 chòm sao 2D, bỏ splash timer/overlay ngoài iOS Standalone, và sửa Accessibility (`heading-order`, `label-content-name-mismatch`, `meta-viewport`, `meta-description`, `robots.txt`).
   - **Kết quả đo Google Lighthouse (`http://localhost:4173/aetheriaplanetarium/`, trước → sau):**
     - **Mobile:** Performance `58 → 85` (FCP `1.3s → 0.8s`, LCP `4.6s → 3.5s`, TBT `1360ms → 260ms`, CLS `0.001 → 0`, Speed Index `2.7s → 1.9s`), Accessibility `98 → 100`, Best Practices `100 → 100`, SEO `100 → 100`.
     - **Desktop:** Performance `72 → 99` (FCP `0.2s → 0.2s`, LCP `1.6s → 1.0s`, TBT `520ms → 0ms`, CLS `0.003 → 0.003`, Speed Index `0.9s → 0.7s`), Accessibility `98 → 100`, Best Practices `100 → 100`, SEO `100 → 100`.

### L. Hệ Mặt Trời Động (`astronomy-engine`) & Kiểm chứng Deploy Production (25/11/2026)
1. **Động cơ Ephemeris 9 Thiên thể ([solarSystem.ts](file:///e:/AetheriaPlanetarium/src/utils/solarSystem.ts), [solarSystem.ts](file:///e:/AetheriaPlanetarium/src/types/solarSystem.ts), [solarSystemFormat.ts](file:///e:/AetheriaPlanetarium/src/utils/solarSystemFormat.ts), [vite.config.ts](file:///e:/AetheriaPlanetarium/vite.config.ts)):**
   - Tích hợp `astronomy-engine` (đóng gói thành chunk `vendor-astronomy` `56.74 kB`, vẫn tách hoàn toàn `vendor-three` khỏi bundle 2D ban đầu) để tính vị trí thời gian thực cho **Mặt Trời, Mặt Trăng, Sao Thủy, Sao Kim, Sao Hỏa, Sao Mộc, Sao Thổ, Sao Thiên Vương, Sao Hải Vương**.
   - Tính tọa độ `(RA, Dec)`, `(Alt, Az)` có hiệu chỉnh khúc xạ khí quyển, cấp sao biểu kiến, khoảng cách (`km` / `AU`), độ chiếu sáng (`%`), 8 pha Mặt Trăng + tuổi trăng, góc nghiêng vành đai Sao Thổ (`ringTiltDeg`), và giờ mọc/lặn kế tiếp (`computeBodyRiseSet` tính theo nhu cầu khi chọn mục tiêu).
   - Kiểm thử đơn vị [solarSystem.test.ts](file:///e:/AetheriaPlanetarium/tests/solarSystem.test.ts) (`5/5` pass, đối chiếu Xuân phân / Hạ chí 2026 và ngày Trăng non / Trăng tròn 11/2026) cùng [weather.test.ts](file:///e:/AetheriaPlanetarium/tests/weather.test.ts) đạt tổng `13/13` pass.
2. **Hiển thị 2D/3D, Tìm kiếm & Thẻ Chi tiết ([solarSystemOverlay2D.ts](file:///e:/AetheriaPlanetarium/src/components/planetarium/solarSystemOverlay2D.ts), [SolarSystem3D.tsx](file:///e:/AetheriaPlanetarium/src/components/zenith3d/SolarSystem3D.tsx), [InfoPanel.tsx](file:///e:/AetheriaPlanetarium/src/components/layout/InfoPanel.tsx), [StarBottomSheet.tsx](file:///e:/AetheriaPlanetarium/src/components/layout/StarBottomSheet.tsx), [SearchBarModal.tsx](file:///e:/AetheriaPlanetarium/src/components/search/SearchBarModal.tsx), [Sidebar.tsx](file:///e:/AetheriaPlanetarium/src/components/layout/Sidebar.tsx)):**
   - Vẽ hào quang Mặt Trời, đĩa pha Mặt Trăng theo góc chiếu sáng (Canvas 2D & GLSL fragment shader 3D), vành đai Sao Thổ và các hành tinh kèm hit-testing 2D / Angular Distance Raycasting 3D ưu tiên thiên thể Hệ Mặt Trời.
   - Thêm bộ lọc `Hệ Mặt Trời` trong `SearchBarModal`, lưới chọn nhanh 9 thiên thể ở tab Mục sao và công tắc `<IOSSwitch />` bật/tắt `showSolarSystem` trong `Sidebar`.
   - Google Lighthouse trên `vite preview` sau khi tích hợp `astronomy-engine`: **Mobile** `Perf 87 / A11y 100 / BP 100 / SEO 100` (`TBT 180ms`, `CLS 0`), **Desktop** `Perf 99 / A11y 100 / BP 100 / SEO 100` (`TBT 0ms`).

---

## 4. ⚠️ Các vấn đề tồn đọng (Known Issues & Warnings)
1. **Hành vi kính mờ OS iOS 26/27 trên PWA (`UIScrollEdgeEffect`):**
   Apple hiện ép dải mờ UIKit ở mép trên đối với Home Screen Web Apps (`black-translucent` đã bị deprecated theo WebKit Bug 301994 / 317153) và chưa có thuộc tính web chuẩn để tắt hoàn toàn ở tầng OS. Cấu hình `--ios-top-blur-clearance: 18px` giúp thanh công cụ nằm sát ngay dưới ngưỡng mờ với chi phí đệm tối thiểu; nếu muốn sát `0px` tuyệt đối như app native, cần đóng gói vỏ `WKWebView` / Capacitor đặt `topEdgeEffect.isHidden = true`.
2. **Môi trường Sandbox Windows khi chạy Vite build:**
   `npx tsc --noEmit` và `node --test tests/weather.test.ts tests/solarSystem.test.ts` chạy sạch trong sandbox, còn `npm run build` cần quyền ngoài sandbox do Rollup `fs.realpath` trên ổ `E:\`.

---

## 5. 📋 Kế hoạch hành động cho phiên kế tiếp (Next Steps - High Priority)
1. **[XONG]** Code-Splitting & Lazy-load Vòm 3D (`vite.config.ts`, `App.tsx`).
2. **[XONG]** Chế độ Con quay hồi chuyển AR Star Tracker (`useDeviceOrientation.ts`, `DomeLookControls.tsx`).
3. **[XONG]** Đăng ký PWA Service Worker & Offline Cache (`vite.config.ts`, `usePWA.ts`, `PWAInstallBanner.tsx`).
4. **[XONG]** Danh mục 5.200+ sao & tối ưu GPU 60 FPS (`stars.ts`, `astronomy.ts`, `StarPoints3D.tsx`).
5. **[XONG]** Chuẩn hóa Safe Area iOS Standalone, `<TopSafeBar>`, `AboutSection`, và Edge-Swipe `28px` (`useEdgeSwipeBack.ts`, `viewport.ts`).
6. **[XONG]** Tích hợp API dự báo thời tiết thiên văn & độ che phủ mây Open-Meteo, mô phỏng bầu trời 2D/3D, đồng bộ dự báo theo giờ và Audit Google Lighthouse (`openMeteo.ts`, `seeingModel.ts`, `WeatherDetailPanel.tsx`).
7. **[XONG]** Mở rộng dữ liệu thiên văn động Hệ Mặt Trời 9 thiên thể (`astronomy-engine`, `solarSystem.ts`, `SolarSystem3D.tsx`, `solarSystemOverlay2D.ts`) và tích hợp quy trình kiểm chứng build/deploy production.
8. **Ưu tiên tiếp theo — Kiểm thử thiết bị iOS thực tế & Mở rộng vật thể Vũ trụ sâu (Messier/NGC):**
   Xác nhận thực địa PWA iOS Standalone trên iPhone/iPad theo checklist, và bổ sung danh mục tinh vân/thiên hà Messier (DSO) kèm đường hoàng đạo (Ecliptic line).
