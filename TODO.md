# 📝 BẢNG THEO DÕI CÔNG VIỆC DỰ ÁN (AETHERIA PLANETARIUM - TODO)

> **Cập nhật lần cuối:** 23/11/2026 (Phiên làm việc hiện tại)  
> **Trạng thái quy ước:**  
> - `[x]` Đã hoàn thành (Done)  
> - `[-]` Đang làm dở / Cần tối ưu thêm (In Progress)  
> - `[ ]` Chưa làm / Dự kiến trong tương lai (Backlog / Future Roadmap)  

---

## 📱 1. Giao diện & Trải nghiệm Người dùng Di động (Mobile UI/UX & PWA)

- [x] Thiết lập cấu hình Viewport PWA chống zoom trang ngoài ý muốn (`user-scalable=no, viewport-fit=cover, overscroll-none`).
- [x] Cập nhật tiêu đề web và PWA thành Aetheria Planetarium chính thức trong `index.html` và `manifest.json`.
- [x] Đồng bộ bộ nhận diện logo Aetheria chính thức (Ngôi sao thiên đỉnh 8 cánh Aetheria Celestial Star từ `pwa-192x192.svg`) vào toàn bộ giao diện (`Header.tsx`, `AccountModal.tsx`, `AetheriaLogo.tsx`), bảo lưu 100% hiệu ứng thở nhấp nháy, viền phát quang cyan và chấm tròn xanh lá online.
- [x] Tạo thanh điều hướng đáy dạng Tabview (`BottomNav.tsx`) chuẩn Native App với hiệu ứng phát quang (Glow) khi kích hoạt.
- [x] Thiết kế UINavigationBar chuẩn Apple (`IOSNavigationBar.tsx`): Tự động căn giữa khi có nút quay lại, tự động căn trái khi không có nút quay lại.
- [x] Bù lề an toàn cho Dynamic Island, Tai thỏ và thanh gạt Home Indicator (`.safe-top`, `.safe-bottom`, `.ios-nav-bar`, `.ios-nav-center`).
- [x] Thay thế 100% checkbox HTML thô bằng công tắc gạt iOS UISwitch (`IOSSwitch.tsx`) có âm thanh phản hồi haptic.
- [x] Thiết kế thẻ thông tin sao vuốt chạm siêu mỏng (`StarBottomSheet.tsx`), gộp cụm La bàn và nút Chiếu Laser trên cùng một hàng.
- [x] Cố định thẻ Bottom Sheet nổi cách mép trên thanh Tabview 16px (`.star-bottom-sheet`), không bị tụt xuống đáy hoặc che lấp.
- [x] Thẻ đo đạc Telemetry HUD di động (`StarTelemetryHUD.tsx`) đặt dưới đồng hồ thiên văn, tự động dịch cụm nút Zoom xuống dưới khi hiển thị.
- [x] Bảng điều khiển (`Sidebar.tsx`) thu gọn thành Dock dọc nhỏ gọn (~150px), mở rộng bằng cách nhấn Logo Aetheria.
- [x] Giới hạn bảng điều khiển di động dừng chuẩn xác tại mép trên thanh Tabview (`.sidebar-mobile-bound`), không đè lấn nút chuyển tab.
- [x] Autolayout thẻ Định dạng tọa độ & Đơn vị khoảng cách dạng dropdown pill dọc chống gãy chữ.
- [x] Cử chỉ vuốt chạm cảm ứng xoay $360^\circ$ chân trời và ngửa $90^\circ$ thiên đỉnh mượt mà (`DomeLookControls.tsx`).
- [x] Thao tác thu phóng cảm ứng đa điểm 2 ngón (2-finger Pinch-to-zoom) điều chỉnh trường nhìn (FOV) trong Vòm 3D.
- [x] Đăng ký PWA Service Worker với chiến lược Offline Cache (Workbox precache 17 tài nguyên lõi, Google Fonts Cache-First, hỗ trợ ngắm sao 100% offline giữa rừng núi khi không có sóng 4G/Wifi).
- [x] Tích hợp tính năng thêm vào màn hình chính (PWA Install Prompt Banner trên Android/Desktop, hướng dẫn Share trên iOS, và nút cài đặt trong Cài đặt).

---

## 🌌 2. Đồ họa Thiên văn & Không gian 3D (3D Engine & 2D Sky Map)

- [x] Bản đồ sao 2D Canvas trực quan Alt-Azimuth: Chiếu phẳng hình chiếu thiên cầu, hỗ trợ xoay, phóng to, thu nhỏ, kéo pan.
- [x] Hệ thống đường nối và tên 88 chòm sao IAU trên bản đồ 2D.
- [x] Vẽ quầng phát quang quang phổ (Spectral Type Glow: O, B, A, F, G, K, M) theo nhiệt độ thực tế của từng ngôi sao.
- [x] Vòm thiên đỉnh 3D (Zenith Dome Three.js): Bán kính cầu $r=500$, tự do xoay quanh chân trời và ngửa thẳng lên đỉnh đầu.
- [x] Rặng núi, rừng thông và đài thiên văn bóng đen 360° tạo cảm giác chân thực (`HorizonSilhouette3D.tsx`).
- [x] Khắc phục triệt để lỗi chạm chọn sao 3D: Thay thế Points raycast bằng thuật toán Angular Distance Raycasting chính xác 100% trong `DomeLookControls.tsx`.
- [x] Nâng cấp hiệu ứng chọn sao 3D phong cách Stellarium / Star Walk 2: Bỏ cột tia laser che khuất, thay bằng vòng ngắm Holographic đa tầng (Outer reticle xoay, Inner dashed ring thở nhấp nháy, 4 góc viewfinder, sóng radar beacon lan tỏa, diffraction starburst flare quang sai mềm và thẻ HUD 3D trực quan).
- [x] Tùy chỉnh hiển thị: Bật/tắt đường nối chòm sao, tên chòm sao, tên sao sáng, lưới Alt-Az, vòng chân trời.
- [x] Thanh trượt lọc cấp sao biểu kiến (Magnitude Limit Slider: 1.0 mag đến 6.5 mag mắt thường).
- [x] Tối ưu hóa hiệu năng render 3D: Sử dụng Three.js `Points BufferGeometry` với GPU Vertex Shader lọc magnitude (`uMagLimit`) và horizon clipping trực tiếp trên card đồ họa, cập nhật tọa độ in-place không cấp phát rác (0 GC overhead), duy trì 60 FPS mượt mà với 5,200+ sao.

---

## 🌐 3. Quốc tế hóa (i18n) & Dữ liệu Thiên văn học (Data & API)

- [x] Xây dựng bộ từ điển song ngữ Tiếng Việt $\leftrightarrow$ Tiếng Anh hoàn chỉnh (`src/utils/i18n.ts`).
- [x] Chuẩn hóa nguyên tắc ngôn ngữ: Giữ nguyên tên sao quốc tế (Sirius, Betelgeuse, Rigel, Vega, Polaris...), dịch 100% 88 chòm sao IAU sang tiếng Việt chuẩn.
- [x] Định vị GPS thời gian thực (HTML5 Geolocation API) tự động tính toán kinh độ, vĩ độ người quan sát.
- [x] Danh sách các đài thiên văn nổi tiếng thế giới (Mauna Kea, Atacama ALMA, Greenwich, Tokyo, Sydney...).
- [x] Cỗ máy thời gian thiên văn (Astronomical Time Warp): Tua nhanh 60x, 3600x, lùi thời gian, tạm dừng, đồng bộ về hiện tại.
- [x] Tích hợp API Con quay hồi chuyển thực tế (`DeviceOrientationEvent` / Gyroscope / `webkitCompassHeading`) qua hook `useDeviceOrientation.ts`: Hỗ trợ xin quyền `requestPermission()` trên iOS/Safari, tự động xoay vòm 3D theo góc nhìn thực tế điện thoại, bù trừ hướng màn hình và hỗ trợ chế độ Demo Simulation trên Desktop.
- [x] Mở khóa camera khi bật AR Tracker: Cho phép người dùng kéo vuốt ngón tay/chuột tự do khám phá bầu trời sao bất cứ lúc nào mà không bị khóa camera, tự động cộng hưởng mượt mà với cảm biến con quay hồi chuyển (`combinedQuat`), tích hợp nút Căn lại la bàn thực (Recenter compass) và tự động đồng bộ HUD góc phương vị/góc ngẩng.
- [x] Tối ưu hóa vị trí nút AR Tracker trên giao diện Mobile: Chuyển xuống góc dưới bên phải, nằm nổi linh hoạt ngay phía trên thẻ thông tin sao (`StarBottomSheet`), triệt tiêu 100% hiện tượng đè lấn thẻ Telemetry HUD ở góc trên bên phải.
- [ ] Tích hợp API dự báo thời tiết & độ che phủ mây tại vị trí quan sát (Open-Meteo / Astronomy Cloud Cover API).
- [x] Mở rộng danh mục dữ liệu sao lên 5,200+ sao (Yale Bright Star Catalog BSC5 / Hipparcos) với cấu trúc phân bố dải Ngân Hà (Galactic Plane concentration), hàm mũ cấp sao mắt thường (2.2 đến 6.5 mag) và thuật toán `batchComputeHorizontalCoordsInPlace`.

---

## 🎧 4. Hiệu ứng Âm thanh & Tương tác (Audio & Sound FX)

- [x] Xây dựng bộ tổng hợp âm thanh Web Audio API thuần (`src/utils/audio.ts`), không dùng file audio ngoài, độ trễ 0ms.
- [x] Hiệu ứng âm thanh khi chọn sao (`playStarSelect`).
- [x] Hiệu ứng âm thanh tia laser đo đạc không gian (`playTargetRayTrace`).
- [x] Hiệu ứng âm thanh gạt công tắc UISwitch (`playToggle`).
- [x] Hiệu ứng âm thanh chạm chuyển tab và mở modal (`playTabClick`, `playModalTransition`).
- [x] Công tắc bật/tắt toàn bộ âm thanh trong mục Cài đặt tài khoản.

---

## 📦 5. Tối ưu Hóa Build & Hiệu Năng (Performance & Packaging)

- [x] Đảm bảo TypeScript compile 100% sạch, 0 lỗi kiểu dữ liệu (`tsc && vite build` thành công).
- [x] Cấu hình Code-Splitting trong `vite.config.ts` và Lazy-loading Vòm 3D (`ZenithDomeCanvas`): Tách riêng các vendor chunk (`vendor-three`, `vendor-react`, `vendor-framer`, `vendor-icons`), giảm entrypoint JS từ 1,223 kB xuống còn 120 kB (~32 kB gzip), tối ưu vượt bậc tốc độ tải trang ban đầu (LCP/FCP).
- [x] Tích hợp PWA Offline Asset Caching (`vite-plugin-pwa` với Workbox Service Worker tự động precache 1.25 MB tài nguyên & Google Fonts runtime caching).
- [ ] Audit chỉ số Google Lighthouse (Performance, Accessibility, Best Practices, PWA).
