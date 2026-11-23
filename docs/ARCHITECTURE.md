# 🏛️ KIẾN TRÚC HỆ THỐNG DỰ ÁN AETHERIA (ARCHITECTURE)

> **Tài liệu Kỹ thuật Dự án:** Cấu trúc Mã nguồn, Luồng Xử lý Lõi & Quy tắc Thiết kế  
> **Phiên bản:** v2.5 Space Edition  

---

## 1. 📂 Cấu trúc Thư mục (Project Folder Structure)

```
E:\AetheriaPlanetarium\
├── dist/                          # Thư mục build production (HTML, CSS, JS minified)
├── docs/                          # Tài liệu kiến trúc và bàn giao kỹ thuật
│   ├── HANDOVER.md                # Bản ghi bàn giao giữa các phiên làm việc
│   └── ARCHITECTURE.md            # Tài liệu kiến trúc và quy chuẩn hệ thống
├── public/                        # Tài nguyên tĩnh, PWA icons, manifest.json
├── src/                           # Toàn bộ mã nguồn ứng dụng
│   ├── components/                # Các thành phần giao diện phân tách theo miền nghiệp vụ
│   │   ├── account/               # Quản lý hồ sơ quan sát viên, nhật ký, cài đặt
│   │   │   └── AccountModal.tsx   # Modal cài đặt & tài khoản (Master-Detail trên Web, Stack trên Mobile)
│   │   ├── layout/                # Các thành phần khung sườn ứng dụng
│   │   │   ├── BottomHUD.tsx      # Thanh HUD hiển thị góc nhìn & la bàn (Desktop)
│   │   │   ├── BottomNav.tsx      # Thanh điều hướng Tabview đáy màn hình (Mobile)
│   │   │   ├── Header.tsx         # Thanh tiêu đề đỉnh màn hình (Logo, Chế độ 2D/3D, Đồng hồ)
│   │   │   ├── InfoPanel.tsx      # Bảng thông tin chi tiết ngôi sao (Desktop)
│   │   │   ├── IOSNavigationBar.tsx # Thanh UINavigationBar chuẩn iOS (dùng chung cho mọi Drawer/Modal)
│   │   │   ├── IOSSwitch.tsx      # UISwitch pill Apple với âm thanh haptic
│   │   │   ├── Sidebar.tsx        # Bảng điều khiển thiên văn bên trái (Vị trí, Thời gian, Lớp phủ, Mục sao)
│   │   │   ├── StarBottomSheet.tsx# Thẻ bottom sheet vuốt chạm xem thông tin sao (Mobile)
│   │   │   └── StarTelemetryHUD.tsx# Thẻ đo đạc Telemetry (Độ cao Alt, Phương vị Az, Cấp sao, Khoảng cách)
│   │   ├── planetarium/           # Thành phần hiển thị Bản đồ sao 2D
│   │   │   └── SkyMap2D.tsx       # Canvas 2D mô phỏng thiên cầu với Pan, Zoom, Grids, 88 chòm sao
│   │   ├── search/                # Thành phần tìm kiếm thiên thể
│   │   │   └── SearchBarModal.tsx # Modal tìm kiếm sao, chòm sao với bộ lọc nhanh
│   │   └── zenith3d/              # Thành phần hiển thị Vòm Thiên Đỉnh 3D (Three.js)
│   │       ├── CameraController.tsx    # Điều khiển camera Three.js (Fly, Orbit, Lock Target)
│   │       ├── ConstellationLabels3D.tsx # Nhãn tên 3D chòm sao trong không gian
│   │       ├── ConstellationLines3D.tsx  # Đường vẽ nối sao 3D
│   │       ├── DomeLookControls.tsx      # Cử chỉ xoay 360° yaw và ngửa 90° Zenith trên Mobile/Desktop
│   │       ├── GroundHorizon3D.tsx       # Lưới đĩa mặt đất và vòng phương vị chân trời
│   │       ├── HorizonSilhouette3D.tsx   # Rặng núi, rừng thông và đài thiên văn bóng đen 360°
│   │       ├── StarPoints3D.tsx          # Các điểm sao 3D với màu sắc quang phổ và quầng sáng
│   │       ├── TargetSimulation3D.tsx    # Vòng ngắm Holographic 3D (Reticle, Radar beacon, Diffraction flare, HUD 3D)
│   │       └── ZenithDomeCanvas.tsx      # Canvas R3F chính bao bọc toàn bộ cảnh thiên văn 3D
│   ├── data/                      # Dữ liệu thiên văn cố định
│   │   ├── constellations.ts      # Danh sách toạ độ và liên kết 88 chòm sao IAU
│   │   └── stars.ts               # Danh mục các ngôi sao biểu kiến nổi bật (Hipparcos catalog)
│   ├── types/                     # Định nghĩa kiểu dữ liệu TypeScript
│   │   ├── account.ts             # Kiểu dữ liệu UserProfile, ObservationLog, UserPreferences
│   │   └── celestial.ts           # Kiểu dữ liệu Star, ObserverLocation, CelestialSettings, ViewMode
│   ├── utils/                     # Thư viện tiện ích và thuật toán
│   │   ├── astronomy.ts           # Thuật toán tính Giờ thiên văn địa phương (LST), Alt-Az từ RA/Dec
│   │   ├── audio.ts               # Bộ tạo âm thanh tổng hợp Web Audio API (Laser, Chime, Switch, Click)
│   │   ├── coordinates3D.ts       # Chuyển đổi hệ tọa độ thiên cầu sang Vector3 (x, y, z) Three.js
│   │   └── i18n.ts                # Hệ thống từ điển song ngữ (Anh - Việt) và 88 chòm sao IAU
│   ├── App.tsx                    # Thành phần gốc chứa State Machine trung tâm của ứng dụng
│   ├── index.css                  # Toàn bộ CSS cốt lõi, Glassmorphism, Safe-area Inset & Custom Classes
│   └── main.tsx                   # Điểm khởi chạy React DOM
├── index.html                     # File HTML gốc với cấu hình PWA Meta Tags, Viewport Fit Cover
├── package.json                   # Khai báo dependencies và scripts
├── tailwind.config.js             # Cấu hình hệ màu Space / Cosmic và hiệu ứng glow
├── tsconfig.json                  # Cấu hình TypeScript compiler
└── vite.config.ts                 # Cấu hình Vite bundler
```

---

## 2. 🧠 Luồng Logic Cốt lõi (Core Logic Flow)

### A. Thuật toán Tính toán Thiên văn Học (Celestial Mechanics)
Mọi vị trí ngôi sao trên bầu trời được tính toán động phụ thuộc vào:
1. **Tọa độ địa lý của người quan sát:** `latitude` ($\phi$), `longitude` ($\lambda$).
2. **Thời gian thiên văn (Epoch):** `currentDate` (hỗ trợ cỗ máy thời gian tua nhanh, dừng, lùi thời gian).
3. **Giờ thiên văn địa phương (Local Sidereal Time - LST):** Tính góc phương vị `Hour Angle (HA)` từ `Right Ascension (RA)`.
4. **Hệ tọa độ Chân trời (Alt-Azimuth Coordinate System):**
   - Độ cao góc `Altitude (h)`: $h \in [-90^\circ, 90^\circ]$ (Góc nhìn ngửa thẳng lên đỉnh đầu là $90^\circ$ Zenith).
   - Phương vị `Azimuth (A)`: $A \in [0^\circ, 360^\circ]$ ($0^\circ$ là hướng Bắc, $90^\circ$ Đông, $180^\circ$ Nam, $270^\circ$ Tây).
   - Tọa độ này được đồng bộ tức thì sang cả **Bản đồ 2D (chiếu phẳng)** và **Vòm 3D (hình cầu bán kính r=500 Three.js)**.

### B. Kiến trúc State Tập Trung trong [App.tsx](file:///e:/AetheriaPlanetarium/src/App.tsx)
- `viewMode`: Chuyển đổi giữa `'2D_PLANETARIUM'` và `'3D_ZENITH_DOME'`.
- `selectedStarId`: ID ngôi sao đang được chọn. Khi có sao được chọn:
  - Trên 3D: Kích hoạt vòng ngắm Holographic 3D khóa mục tiêu ngôi sao (`TargetSimulation3D.tsx`).
  - Trên Mobile: Hiển thị thẻ đo đạc Telemetry HUD ở góc trên (`StarTelemetryHUD.tsx`) và thẻ rút gọn vuốt chạm (`StarBottomSheet.tsx`) ở đáy. Cụm nút phóng to bản đồ 2D tự động trượt xuống để không bị che khuất.
  - Trên Desktop: Hiển thị bảng điều khiển cánh phải (`InfoPanel.tsx`).
- `isSidebarOpen`: Quản lý đóng mở bảng điều khiển thiên văn (cho phép click Logo trên Header để bật/tắt).
- `isAccountOpen` & `isSearchOpen`: Quản lý modal Cài đặt và Tìm kiếm. Tự động ẩn thẻ sao khi người dùng mở các modal này để tránh chồng lấn màn hình.

### C. Bộ Tổng hợp Âm thanh Web Audio API ([audio.ts](file:///e:/AetheriaPlanetarium/src/utils/audio.ts))
Ứng dụng sử dụng bộ phát sóng âm tổng hợp tích hợp (Oscillator, BiquadFilter, GainEnvelope) trực tiếp từ trình duyệt:
- `playStarSelect()`: Âm ngân sao chuông vũ trụ thanh thoát tần số cao ($1320\text{Hz} \to 1760\text{Hz}$).
- `playTargetRayTrace()`: Âm tia laser đo đạc khoa học viễn tưởng ($880\text{Hz} \to 220\text{Hz}$).
- `playTabClick()`: Âm chạm nhẹ tinh tế (Haptic tap $440\text{Hz}$).
- `playToggle()`: Âm gạt công tắc quang học dứt khoát ($520\text{Hz} \leftrightarrow 680\text{Hz}$).

---

## 3. 🎨 Quy chuẩn Thiết kế & Hệ thống Giao diện (Design System Rules)

### A. Bảng Màu Không Gian Sâu (Cosmic Color Palette)
Được định nghĩa thống nhất trong `tailwind.config.js`:
- **Nền chính (Space Deep):** `#030712` (Space 950 - Màu đen không gian vũ trụ sâu thẳm, chống chói mắt ban đêm).
- **Màu nhấn viền & dữ liệu (Accent Cyan):** `#38bdf8` (Cyan 400 - Thể hiện các đường đo đạc, vĩ độ, kinh độ, sao loại A/B).
- **Màu phụ (Cosmic Purple):** `#a855f7` (Purple 500 - Lưới Alt-Az, sao loại đặc biệt).
- **Màu cảnh báo & Cấp bậc (Amber / Gold):** `#fbbf24` (Gold 400 - Ngôi sao loại G/K, nút yêu thích).
- **Chế độ quan sát ban đêm (Night Vision Red Mode):** Lớp CSS `.night-vision` phủ filter đỏ đơn sắc bảo vệ võng mạc thích nghi bóng tối khi quan sát ngoài thực địa.

### B. Quy tắc Glassmorphism Đậm Chất iOS
- Không dùng nền màu đặc thông thường. Luôn sử dụng:
  - `.glass-panel`: Nền `rgba(12, 18, 36, 0.72)` + `backdrop-filter: blur(18px)` + viền `border: 1px solid rgba(255, 255, 255, 0.08)`.
  - `.glass-input`: Nền `rgba(8, 14, 29, 0.6)` + viền trắng mờ mượt mà khi focus.
- Bo góc tuân thủ Apple HIG: `rounded-2xl` cho thẻ/card, `rounded-3xl` cho modal/dialog lớn, `rounded-full` cho các pill badge.

### C. Quy tắc An toàn Dynamic Island & Chân trang Mobile (Safe Area Insets)
Tuyệt đối không hardcode lề cố định `top-0` hay `bottom-0` trên Mobile:
- **Thanh điều hướng đỉnh:** Sử dụng `.ios-nav-bar` (`padding-top: env(safe-area-inset-top, 0px)` và chiều cao tự động bù phần notch).
- **Chân trang Tabview:** Sử dụng `.safe-bottom` (`padding-bottom: max(0.75rem, env(safe-area-inset-bottom))`).
- **Thanh Sidebar bên trái:** Cố định đáy qua `.sidebar-mobile-bound` (`bottom: calc(3.75rem + safe-bottom)`), không bao giờ được tràn qua mép trên thanh Tabview.
- **Thẻ thông tin sao:** Cố định đáy qua `.star-bottom-sheet` (`bottom: calc(4.75rem + safe-bottom)`), luôn nổi cao hơn thanh Tabview 16px.

### D. Quy tắc Thành phần Điều khiển
- **Không bao giờ dùng `<input type="checkbox">` thuần:** 100% sử dụng component `<IOSSwitch />`.
- **Căn lề thanh tiêu đề:** Luôn dùng `<IOSNavigationBar />`. Khi có nút quay lại, tiêu đề tự động căn giữa. Khi không có nút quay lại, tiêu đề tự động căn trái.
- **Thẻ có Dropdown / Select:** Áp dụng Autolayout dọc để nhãn và hộp chọn không bị chèn ép ép dòng chữ.
