# Không Gian Cá Nhân & Trợ Lý Đồng Hành AI Toàn Diện

Ứng dụng web cá nhân giúp **theo dõi Tâm - Sinh - Lý qua từng ngày**, **chinh phục Mục tiêu & Chuỗi kỷ luật**, **phân tích dữ liệu đa năm** và đồng hành cùng **1 Người bạn AI duy nhất** (kết hợp *Trợ lý sức khoẻ + Chuyên gia tâm lý CBT + Bạn đồng hành mục tiêu*).

Thiết kế chuyên biệt để chạy **miễn phí 100% trên GitHub Pages**, tối ưu trải nghiệm **120Hz trên iPhone 17 (`402 × 874 px`)** và bảo mật tuyệt đối dữ liệu riêng tư.

---

## Điểm nổi bật của hệ thống

1. **Tự động Kết nối & Xác thực API (`Auto-Connect Handshake`)**: Tự động kiểm tra kết nối ngay khi mở web (tốn `0` token), hiển thị đèn tín hiệu trực tuyến kèm độ trễ `ms`, hỗ trợ **Google Gemini (dòng 4 & 3.8)**, **Groq**, **OpenRouter** và **OpenAI**, kèm nút quét model mới nhất trực tiếp từ máy chủ.
2. **6 Kỹ năng AI Thực tế & Khoá Chống Bịa Chuyện (`Zero-Hallucination`)**: Hạ nhiệt độ sinh ngôn ngữ (`0.30–0.42`) bám chặt số liệu thật 100%, tích cực thực tế, không tô hồng sáo rỗng.
3. **Hệ thống Mục tiêu 3 Chế độ Thực tế**: Đo lường bằng **Chuỗi ngày kỷ luật** (điểm danh từng ngày, ghi nhận vấp ngã không mất tổng ngày thắng), **Các bước cột mốc**, hoặc **Con số định lượng** — kèm chiến lược 4 phần đầy đủ từ AI.
4. **Kiến trúc Dữ liệu Đa Năm (`IndexedDB` + Phân tích Đa tầng)**: Tự động gom nhóm biểu đồ từ *7 ngày → 30 ngày → 3 tháng → 1 năm → Nhiều năm*, tính ma trận tương quan Pearson `r`, thống kê tác nhân gốc rễ, bản đồ nhiệt 365 ngày và xuất bảng Excel/Numbers (`.csv`).
5. **Đồng bộ 2 Chiều Không Ghi Đè qua GitHub Secret Gist**: Hợp nhất dữ liệu thông minh giữa **iPhone 17** và **Máy tính** kèm mã hoá đầu-cuối **AES-GCM 256-bit**.

---

## Chạy thử & Đóng gói trên máy tính

```bash
npm install
npm run dev
npm run build
```

---

## Triển khai miễn phí lên GitHub Pages (Chi phí \$0)

1. Tạo một Repository mới trên GitHub.
2. Đẩy mã nguồn thư mục này lên nhánh `main` (tệp `.github/workflows/deploy.yml` và `public/.nojekyll` đã cấu hình sẵn; mọi khoá API cá nhân đều nằm trên trình duyệt của bạn, không nằm trong mã nguồn).
3. Vào **Settings > Pages** trên GitHub -> mục **Build and deployment > Source** chọn **GitHub Actions**.
4. Mở đường dẫn `https://<username>.github.io/<repo-name>/` bằng **Safari trên iPhone 17** -> nhấn **Chia sẻ (Share)** -> **Thêm vào MH chính (Add to Home Screen)** để sử dụng tràn viền Dynamic Island như ứng dụng gốc!
