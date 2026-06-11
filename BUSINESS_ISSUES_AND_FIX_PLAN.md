# 🔍 LMS — Kiểm Tra Nghiệp Vụ & Kế Hoạch Sửa Lỗi Toàn Diện

> **Ngày tạo**: 2026-05-19  
> **Phạm vi**: Toàn bộ nghiệp vụ Frontend + Backend  
> **Phương pháp**: Phân tích source code tĩnh kết hợp truy vết luồng dữ liệu

---

## Mục lục

1. [Tổng quan các lỗi nghiệp vụ](#1-tổng-quan-các-lỗi-nghiệp-vụ)
2. [Chi tiết từng lỗi & Kế hoạch sửa](#2-chi-tiết-từng-lỗi--kế-hoạch-sửa)
3. [Lộ trình triển khai theo Phase](#3-lộ-trình-triển-khai-theo-phase)

---

## 1. Tổng quan các lỗi nghiệp vụ

| # | Mức độ | Lỗi nghiệp vụ | Nguồn phát hiện |
|---|--------|---------------|-----------------|
| BUG-01 | 🔴 Critical | Không xác định được độ xác thực nội dung AI (tóm tắt, quiz) | User report |
| BUG-02 | 🔴 Critical | Lời khuyên AI tìm kiếm không khớp với khóa học đề xuất | User report |
| BUG-03 | 🟠 High | Thiếu cơ chế tự đánh dấu hoàn thành bài học (auto-complete) | User report |
| BUG-04 | 🟠 High | Thiếu bài kiểm tra hết khóa (Final Exam) | User report |
| BUG-05 | 🔴 Critical | Biến `relatedTopics` không được khai báo → crash runtime | Code audit |
| BUG-06 | 🟠 High | Cho phép mua trùng khóa học đã đăng ký | Code audit |
| BUG-07 | 🟡 Medium | AI tools không kiểm tra quyền truy cập khóa học | Code audit |
| BUG-08 | 🟡 Medium | Xóa khóa học (Admin) không dọn CourseProgress & Purchase | Code audit |
| BUG-09 | 🟡 Medium | Thông tin khuyến mãi hardcode "Còn 5 ngày" | Code audit |
| BUG-10 | 🟡 Medium | Rating luôn bị `Math.floor` → mất chính xác | Code audit |
| BUG-11 | 🟡 Medium | Trường `completed` trong CourseProgress không bao giờ được cập nhật | Code audit |
| BUG-12 | 🟢 Low | Thiếu chứng nhận hoàn thành khóa học (Certificate) | Code audit |
| BUG-13 | 🟢 Low | Không phân trang danh sách khóa học / users | Code audit |
| BUG-14 | 🟢 Low | Quiz không lưu lịch sử kết quả | Code audit |

---

## 2. Chi tiết từng lỗi & Kế hoạch sửa

---

### BUG-01 🔴 Không xác định được độ xác thực nội dung AI

**Vấn đề**: Khi bài học không có transcript (`lectureContent` rỗng), AI vẫn tạo tóm tắt/quiz dựa trên suy luận từ tiêu đề bài học + mô tả khóa học tổng quát. Người dùng không có cách nào biết nội dung AI trả về là **dựa trên dữ liệu thật** hay **suy luận tổng quát**.

**Nguyên nhân gốc** — `aiController.js` dòng 184-215:
- Backend đã trả `hasTranscript` boolean nhưng frontend **không hiển thị cảnh báo** cho user.
- `AITools.jsx` dòng 88-98: Component `AILessonSummary` chỉ render `summary.summary` mà bỏ qua `summary.hasTranscript`.

**Kế hoạch sửa**:

| File | Thay đổi |
|------|----------|
| `AITools.jsx` (Summary) | Kiểm tra `summary.hasTranscript`. Nếu `false` → hiển thị banner cảnh báo: *"⚠️ Nội dung tóm tắt được AI suy luận từ mô tả khóa học tổng quát, không dựa trên transcript bài giảng thực tế. Độ chính xác có thể hạn chế."* |
| `AITools.jsx` (Quiz) | Tương tự — kiểm tra `data.hasTranscript`, hiển thị badge cảnh báo trên đầu quiz. |
| `AIChatbot.jsx` | Thêm truyền `hasTranscript` từ response, hiển thị indicator nhỏ trên chat header. |
| `aiController.js` | Bổ sung thêm trường `contentSource: hasTranscript ? 'transcript' : 'fallback'` vào response của tất cả AI endpoints để frontend dễ phân biệt. |

---

### BUG-02 🔴 Lời khuyên AI tìm kiếm không khớp với khóa học đề xuất

**Vấn đề**: Lời khuyên lộ trình (`advice`) do Gemini sinh **không biết** danh sách khóa học nào thực sự có trong hệ thống. AI tạo lời khuyên dựa trên kiến thức tổng quát, dẫn đến lời khuyên có thể đề cập công nghệ/chủ đề mà hệ thống không có khóa học nào phù hợp.

**Nguyên nhân gốc** — `courseController.js` dòng 112-146:
- Hàm `callGeminiForAdvice(query)` gọi Gemini **song song** với query DB, không inject context về khóa học thực có trong hệ thống.

**Kế hoạch sửa**:

| File                  | Thay đổi                                                                                                                                                                                                                           |
| -----------------------| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `courseController.js` | Thay đổi thứ tự: query DB trước → lấy top 5 khóa học → inject danh sách tiêu đề & chủ đề vào prompt Gemini. Prompt mới sẽ bao gồm danh sách khóa học thực tế. Nếu không có khóa học nào khớp → trả advice = `null` thay vì gọi AI. |

**Prompt mẫu mới**:
```
Hệ thống có các khóa học liên quan đến "${query}":
${topCourses.map(c => `- ${c.courseTitle} (${c.courseTopic})`).join('\n')}

Dựa trên DANH SÁCH KHÓA HỌC TRÊN, hãy đưa lời khuyên lộ trình học ngắn gọn (2-3 câu).
Chỉ đề cập đến nội dung có trong các khóa học trên, KHÔNG đề cập khóa học hay chủ đề không có trong danh sách.
```

---

### BUG-03 🟠 Thiếu cơ chế tự đánh dấu hoàn thành bài học

**Vấn đề**: Hiện tại học viên phải **bấm thủ công** nút "Đánh dấu đã hoàn thành" mỗi bài. Không có auto-complete khi xem hết video.

**Nguyên nhân gốc** — `Player.jsx` dòng 262-265:
- Component `Youtube` không lắng nghe sự kiện `onEnd` (video kết thúc).

**Kế hoạch sửa**:

| File | Thay đổi |
|------|----------|
| `Player.jsx` | Thêm prop `onEnd` cho component `<Youtube>`. Khi video kết thúc → tự gọi `markLectureAsCompleted(playerData.lectureId)` nếu bài chưa completed. Thêm `onStateChange` để track thời gian xem, auto-complete khi user xem ≥ 90% thời lượng bài giảng. |

---

### BUG-04 🟠 Thiếu bài kiểm tra hết khóa (Final Exam)

**Vấn đề**: Hệ thống chỉ có quiz theo **chương** (`generateQuiz` nhận `chapterIndex`). Không có bài kiểm tra tổng kết toàn khóa, không có cơ chế đánh giá xem học viên đã thực sự nắm được kiến thức tổng thể hay chưa.

**Nguyên nhân gốc** — `aiController.js` dòng 241-331:
- `generateQuiz` chỉ lấy transcript từ **1 chapter** (`course.courseContent[chapterIndex]`).

**Kế hoạch sửa**:

| File | Thay đổi |
|------|----------|
| `aiController.js` | Thêm hàm `generateFinalExam`: khi `chapterIndex` không được truyền hoặc bằng `-1` → gom transcript từ **tất cả chapters**, sinh 10-15 câu hỏi bao phủ toàn khóa. Thêm trường `examType: 'chapter' \| 'final'` trong response. |
| `aiRoutes.js` | Thêm route `POST /api/ai/generate-final-exam`. |
| `Player.jsx` | Thêm nút "Kiểm tra hết khóa" trong AI Tools bar, chỉ hiện khi học viên đã hoàn thành ≥ 80% bài giảng. |
| `AITools.jsx` | Tạo component `AIFinalExam` tương tự `AIQuizGenerator` nhưng với UI khác biệt (màu cam/đỏ, hiển thị kết quả đạt/không đạt với ngưỡng 70%). |
| `CourseProgress` model | Thêm trường `finalExamScore: { type: Number, default: null }` và `finalExamPassedAt: { type: Date, default: null }`. |

---

### BUG-05 🔴 Biến `relatedTopics` không khai báo → Crash Runtime

**Vấn đề**: Trong response của `getSemanticOverview`, trường `relatedTopics` được sử dụng nhưng **không bao giờ được khai báo hay gán giá trị** → `ReferenceError` crash toàn bộ endpoint search.

**Nguyên nhân gốc** — `courseController.js` dòng 257:
```javascript
meta: {
  // ...
  relatedTopics,  // ← UNDECLARED VARIABLE
  embeddingCached
}
```

**Kế hoạch sửa**:

| File                  | Thay đổi                                                                                                                                                                                             |
| -----------------------| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `courseController.js` | Trích xuất `relatedTopics` từ danh sách `courseTopic` của các khóa học passed: `const relatedTopics = [...new Set(passed.map(c => c.courseTopic).filter(Boolean))]`. Đặt trước dòng `res.json(...)`. |

---

### BUG-06 🟠 Cho phép mua trùng khóa học đã đăng ký

**Vấn đề**: API `purchaseCourse` không kiểm tra xem user đã enrolled khóa học chưa. User có thể tạo nhiều Stripe Checkout sessions cho cùng 1 khóa học → thanh toán trùng.

**Nguyên nhân gốc** — `userController.js` dòng 54-111:
- Không có check `enrolledCourses.includes(courseId)` trước khi tạo Purchase.

**Kế hoạch sửa**:

| File                | Thay đổi                                                                                                                                    |
| ---------------------| ---------------------------------------------------------------------------------------------------------------------------------------------|
| `userController.js` | Thêm check ngay sau `ensureUserIsActive`: kiểm tra `userData.enrolledCourses` có chứa `courseId` chưa. Nếu có → return 400 với message lỗi. |

---

### BUG-07 🟡 AI tools không kiểm tra quyền truy cập khóa học

**Vấn đề**: Bất kỳ user đã đăng nhập nào cũng có thể gọi `/api/ai/summarize`, `/api/ai/generate-quiz`, `/api/ai/chat` cho bất kỳ khóa học nào, kể cả khóa học chưa mua.

**Nguyên nhân gốc** — `aiController.js`:
- Các hàm `summarizeLesson`, `generateQuiz`, `chatWithAI` chỉ check `courseId` tồn tại, không check user đã enrolled.

**Kế hoạch sửa**:

| File | Thay đổi |
|------|----------|
| `aiController.js` | Thêm kiểm tra enrollment: query `User.findById(userId)` → check `enrolledCourses.includes(courseId)`. Nếu không → return 403. |

---

### BUG-08 🟡 Xóa khóa học (Admin) không dọn dữ liệu liên quan

**Vấn đề**: `deleteCourseAdmin` chỉ xóa Course và pull từ `enrolledCourses` của User. Không dọn `CourseProgress` và `Purchase` records → dữ liệu rác trong DB.

**Nguyên nhân gốc** — `adminController.js` dòng 345-366.

**Kế hoạch sửa**:

| File | Thay đổi |
|------|----------|
| `adminController.js` | Thêm: `await CourseProgress.deleteMany({ courseId })` và `await Purchase.deleteMany({ courseId })` trước khi xóa Course. |



### BUG-10 🟡 Rating luôn bị Math.floor → mất chính xác

**Vấn đề**: `AppContext.jsx` dòng 81 dùng `Math.floor` → khóa học rating 4.8 sẽ hiển thị 4 sao. Gây thiệt cho giảng viên.

**Kế hoạch sửa**:

| File | Thay đổi |
|------|----------|
| `AppContext.jsx` | Đổi thành `return Number((totalRating / ratings.length).toFixed(1))` để giữ 1 chữ số thập phân. |
| `CourseDetails.jsx` | Cập nhật logic render sao để hỗ trợ half-star (sao nửa). |

---

### BUG-11 🟡 Trường `completed` trong CourseProgress không bao giờ được cập nhật

**Vấn đề**: Model `CourseProgress` có trường `completed: Boolean` nhưng `userController.js` hàm `updateUserCourseProgress` chỉ push `lectureId` vào `lectureCompleted`, **không bao giờ set `completed = true`** khi toàn bộ bài đã hoàn thành.

**Kế hoạch sửa**:

| File | Thay đổi |
|------|----------|
| `userController.js` | Sau khi push lectureId, query Course để lấy tổng số lectures. Nếu `lectureCompleted.length === totalLectures` → set `progressData.completed = true` rồi save. |

---

### BUG-12 🟢 Thiếu chứng nhận hoàn thành khóa học

**Vấn đề**: `CourseDetails.jsx` dòng 361 quảng cáo *"Cấp chứng nhận hoàn thành khóa học"* nhưng hệ thống **không có tính năng này**.

**Kế hoạch sửa**:

| File | Thay đổi |
|------|----------|
| Backend | Tạo endpoint `GET /api/user/certificate/:courseId` → kiểm tra `completed === true` → generate PDF certificate (dùng `pdfkit` hoặc HTML template). |
| Frontend | Thêm nút "Tải chứng nhận" trên trang MyEnrollments khi khóa học đã hoàn thành 100%. |
| *Phương án nhanh* | Nếu chưa cần làm → xóa dòng quảng cáo trong CourseDetails.jsx. |

---

### BUG-13 🟢 Không phân trang danh sách khóa học / users

**Vấn đề**: `getAllCourses`, `getAllUsers`, `getAllCoursesAdmin` trả **toàn bộ records** không phân trang. Khi dữ liệu lớn → chậm response, tốn bandwidth.

**Kế hoạch sửa**: Thêm `page` & `limit` query params cho các endpoint list. Sử dụng `.skip()` và `.limit()` của Mongoose. Trả thêm `totalCount` trong response.

---



## 3. Lộ trình triển khai theo Phase

### Phase 1 — Hotfix (Ưu tiên cao nhất, 1-2 ngày)

> Sửa các lỗi gây crash hoặc ảnh hưởng trực tiếp đến trải nghiệm người dùng.

| Task | Bug | File chính |
|------|-----|-----------|
| Fix `relatedTopics` undeclared | BUG-05 | `courseController.js` |
| Chặn mua trùng khóa học | BUG-06 | `userController.js` |
| Hiển thị cảnh báo AI fallback | BUG-01 | `AITools.jsx`, `AIChatbot.jsx` |
| Xóa/sửa text hardcode "Còn 5 ngày" | BUG-09 | `CourseDetails.jsx` |

---

### Phase 2 — AI Quality (3-4 ngày)

> Nâng cao chất lượng và độ tin cậy của các tính năng AI.

| Task | Bug | File chính |
|------|-----|-----------|
| Inject context khóa học vào advice | BUG-02 | `courseController.js` |
| Thêm final exam | BUG-04 | `aiController.js`, `AITools.jsx`, `Player.jsx` |
| Kiểm tra enrollment cho AI | BUG-07 | `aiController.js` |
| Lưu quiz history | BUG-14 | New model + `aiController.js` |

---

### Phase 3 — Progress System (2-3 ngày)

> Hoàn thiện hệ thống theo dõi tiến độ học tập.

| Task | Bug | File chính |
|------|-----|-----------|
| Auto-complete khi xem hết video | BUG-03 | `Player.jsx` |
| Cập nhật `completed` flag | BUG-11 | `userController.js` |
| Fix rating precision | BUG-10 | `AppContext.jsx`, `CourseDetails.jsx` |
| Dọn dữ liệu khi xóa khóa | BUG-08 | `adminController.js` |

---

### Phase 4 — Enhancement (3-5 ngày, optional)

> Tính năng bổ sung, không ảnh hưởng nghiệp vụ cốt lõi.

| Task | Bug | File chính |
|------|-----|-----------|
| Tạo certificate PDF | BUG-12 | New endpoint + frontend |
| Phân trang API | BUG-13 | Controllers + frontend |

---

> **Tổng thời gian ước tính**: 9-14 ngày làm việc (tùy độ phức tạp UI/UX cho Phase 4).
