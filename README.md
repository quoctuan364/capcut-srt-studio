<div align="center">

# CapCut Auto-SRT Studio v2.0

**Công cụ biên tập phụ đề tiếng Việt chạy 100% trên trình duyệt: tự động ngắt nhịp chuẩn TikTok/Reels, Import & chỉnh mốc `.SRT / .VTT`, nạp Video/Audio thật vào khung 9:16 và xuất file kéo thẳng vào CapCut.**

[![Live Demo](https://img.shields.io/badge/LIVE_DEMO-OPEN_STUDIO_NOW-10B981?style=for-the-badge&labelColor=090C12)](https://quoctuan364.github.io/capcut-srt-studio/)
[![Zero Dependencies](https://img.shields.io/badge/ARCHITECTURE-100%25_CLIENT_SIDE-0F172A?style=for-the-badge&labelColor=10B981)](https://github.com/quoctuan364/capcut-srt-studio)
[![CapCut Ready](https://img.shields.io/badge/EXPORT-.SRT_%7C_.VTT_%7C_.TXT-090C12?style=for-the-badge&labelColor=1F2A3E)](#)
[![License: MIT](https://img.shields.io/badge/LICENSE-MIT-090C12?style=for-the-badge&labelColor=1F2A3E)](#)

*Phát triển bởi [Quốc Tuấn (@quoctuan364)](https://github.com/quoctuan364)*

</div>

---

## Live Demo Trực Tuyến

Mở và sử dụng ngay trên trình duyệt (không cần cài đặt, không upload dữ liệu ra ngoài):
- **https://quoctuan364.github.io/capcut-srt-studio/**

![CapCut Auto-SRT Studio v2.0 — 3-Column Cinema NLE Workspace](./preview-v2.png)

---

## Tính Năng Mới ở Phiên Bản v2.0

1. **Nạp Video / Audio Thật vào Khung 9:16 (Drag & Drop Media):**
   - Kéo thả trực tiếp video quay dọc hoặc file thu âm vào màn hình mô phỏng để căn chữ ngay trên video thật.
   - Hỗ trợ thanh tua (Scrub Bar), tốc độ phát `0.75x / 1.0x / 1.25x`, phím tắt `Space`, Safe Zone 9:16 và chọn vị trí phụ đề (Dưới / Giữa / Trên).
2. **Import & Biên Tập Timeline `.SRT / .VTT` Chuyên Sâu:**
   - Nhập file `.SRT` hoặc `.VTT` có sẵn để sửa lỗi chính tả và đồng bộ lại thời gian.
   - **Time-Shift toàn bộ timeline** (`-0.5s`, `-0.1s`, `+0.1s`, `+0.5s`), chỉnh trực tiếp giây bắt đầu/kết thúc từng dòng, **Tách đôi (`Split`)**, **Gộp dòng (`Merge`)**, và **cảnh báo tốc độ đọc (CPS > 20)** giúp phụ đề không bị trôi quá nhanh.
3. **Thuật Toán Ngắt Nhịp Tiếng Việt & Viral Hook Analyzer:**
   - Tự chia dòng theo nhịp ngắt câu (4 / 6 / 9 từ, chống lẻ 1 từ cuối dòng) theo tốc độ nói `130–230 WPM`.
   - Chấm điểm câu mở đầu 3 giây kèm thanh tiến độ và gợi ý sửa Hook.
4. **Tự Động Lưu Nháp (`localStorage`) & Teleprompter Toàn Màn Hình:**
   - Không lo mất kịch bản khi tải lại trang; hỗ trợ 3 mẫu kịch bản nhanh (`Tech`, `Review`, `Story`) và máy nhắc chữ lật gương.

---

## Cách Chạy Cục Bộ Trên Windows

Nháy đúp file `start-capcut.bat` (hoặc mở trực tiếp `index.html` trên trình duyệt).

## Giấy phép

MIT License — [@quoctuan364](https://github.com/quoctuan364).
