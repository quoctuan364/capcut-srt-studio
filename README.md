<div align="center">

# CapCut Auto-SRT & Viral Hook Studio

**Công cụ tự động ngắt nhịp phụ đề chuẩn TikTok / Reels / Shorts, phân tích câu mở đầu 3 giây (Hook Analyzer), mô phỏng màn hình 9:16 và xuất file `.SRT` kéo thả trực tiếp vào CapCut.**

[![Live Demo](https://img.shields.io/badge/LIVE_DEMO-OPEN_STUDIO_NOW-61FFCA?style=for-the-badge&labelColor=0D0B18)](https://quoctuan364.github.io/capcut-srt-studio/)
[![Zero Dependencies](https://img.shields.io/badge/ARCHITECTURE-100%25_CLIENT_SIDE-A277FF?style=for-the-badge&labelColor=0D0B18)](#)
[![CapCut Ready](https://img.shields.io/badge/EXPORT-.SRT_%7C_.VTT_%7C_.TXT-F694FF?style=for-the-badge&labelColor=0D0B18)](#)
[![License: MIT](https://img.shields.io/badge/LICENSE-MIT-FFCA85?style=for-the-badge&labelColor=0D0B18)](#)

*Phát triển bởi [Quốc Tuấn (@quoctuan364)](https://github.com/quoctuan364)*

</div>

---

## Live Demo Trực Tuyến

Mở và sử dụng trực tiếp ngay trên trình duyệt (không cần cài đặt):
👉 **https://quoctuan364.github.io/capcut-srt-studio/**

---

## Tính năng Chính (Core Features)

1. **Thuật toán Ngắt Nhịp Phụ Đề Thông Minh cho Tiếng Việt:**
   - Tự động tách kịch bản theo nhịp ngắt câu tự nhiên (dấu chấm, dấu phẩy, xuống dòng) và giới hạn đúng **4 từ (Hormozi Style)**, **6 từ (TikTok/Reels chuẩn)** hoặc **9 từ (YouTube ngang)** mỗi dòng, tránh tình trạng lẻ 1 từ mồ côi cuối câu.
   - Tùy chỉnh tốc độ đọc thoại (**145 / 175 / 205 WPM**) để tự động tính toán chính xác mốc thời gian `00:00:00,000 --> 00:00:01,850`.
2. **Phân Tích & Chấm Điểm Câu Mở Đầu 3 Giây (Viral Hook Analyzer):**
   - Quét ngay câu đầu tiên của kịch bản, chấm điểm trên thang `100`, phát hiện các yếu tố giữ chân (Cảnh báo/Phủ định, Con số cụ thể, Curiosity Gap) và cảnh báo nếu câu mở đầu quá dài hoặc chào hỏi rườm rà.
3. **Mô Phỏng Màn Hình Điện Thoại 9:16 & Giọng Đọc Thử (TTS):**
   - Xem trước trực tiếp phụ đề chạy theo đúng mốc giây trên khung điện thoại 9:16 với 3 phong cách chữ (`Aura Neon Glow`, `Hormozi Bold Yellow`, `Clean Minimal White`), kết hợp giọng đọc thử tiếng Việt qua Web Speech API.
4. **Máy Nhắc Chữ Toàn Màn Hình (Built-in Teleprompter):**
   - Chế độ máy nhắc chữ khi quay video bằng điện thoại/webcam: tùy chỉnh tốc độ cuộn, cỡ chữ (`28px–72px`) và chế độ **Lật gương (Mirror Mode)** cho kính phản xạ.
5. **Xuất File Trực Tiếp Cho CapCut PC / Premiere / DaVinci:**
   - Hỗ trợ tải ngay **`.SRT`**, **`.VTT`**, **`.TXT`** hoặc Copy 1-click. Trên CapCut PC, chỉ cần vào **Text → Local Captions → Import** và chọn file `.srt` vừa tải là toàn bộ phụ đề khớp nhịp sẽ tự động lên Timeline.

---

## Cách Kéo File `.SRT` Vào CapCut PC

1. Dán kịch bản của bạn vào cột **01 // Kịch Bản Thoại Đầu Vào**.
2. Chỉnh lại nội dung từng dòng trực tiếp trên cột **02 // Timeline Phụ Đề** nếu muốn.
3. Bấm **Tải File Phụ Đề (.SRT)** ở góc trên bên phải.
4. Mở **CapCut PC** → chọn tab **Text (Văn bản)** → **Local Captions (Phụ đề cục bộ)** → **Import** file `capcut-subtitles.srt` và kéo xuống Timeline.

---

## Giấy phép (License)

Phân phối dưới giấy phép **MIT License** — [@quoctuan364](https://github.com/quoctuan364).
