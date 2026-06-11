# PROJECT OVERVIEW & TECH STACK

* **Tên dự án**: LMS (Learning Management System)
* **Mục tiêu chính**: Nền tảng học trực tuyến cho phép sinh viên mua/đăng ký khóa học, giảng viên tạo và quản lý khóa học, admin quản trị hệ thống và kiểm duyệt người dùng.
* **Ngôn ngữ**: JavaScript (ES Modules, JSX)
* **Frontend**: React (Vite), TailwindCSS, React Router, Clerk React (Auth), Axios, Quill (Rich Text), Xenova/Transformers (AI Embeddings).
* **Backend**: Node.js, Express, Mongoose (MongoDB), Clerk Express, Cloudinary (Lưu trữ ảnh/video), Stripe (Thanh toán), Svix (Webhooks).
* **Database**: MongoDB

# PROJECT STRUCTURE

```text
LMS/
├── client/                 # Frontend React (Vite)
│   ├── src/
│   │   ├── components/     # Các UI components dùng chung (Navbar, Loading, v.v.)
│   │   ├── context/        # Chứa AppContext.jsx để quản lý global state
│   │   ├── pages/          # Các trang được chia theo roles: student, educator, admin
│   │   ├── utils/          # Các hàm hỗ trợ dùng chung
│   │   └── App.jsx         # Cấu hình routing chính của ứng dụng
├── server/                 # Backend Node.js (Express)
│   ├── configs/            # File cấu hình cho MongoDB, Cloudinary
│   ├── controllers/        # Xử lý logic nghiệp vụ (admin, ai, course, educator, user, webhooks)
│   ├── middlewares/        # Express middlewares (có thể xử lý xác thực/phân quyền)
│   ├── models/             # Mongoose Schemas (User, Course, EducatorApplication, v.v.)
│   ├── routes/             # Định nghĩa API endpoints tương ứng với controllers
│   ├── scripts/            # Scripts chạy độc lập (VD: generateCourseEmbeddings.js)
│   └── server.js           # Điểm vào (entry point) của backend
```

# CORE LOGIC & BUSINESS RULES

* **Authentication & Authorization**: Quản lý hoàn toàn thông qua **Clerk**. Hệ thống webhook của Clerk đồng bộ dữ liệu người dùng về MongoDB nội bộ thông qua endpoint `/clerk`.
* **Role-based Access Control**: 
  * `student`: Xem, mua, và học khóa học.
  * `educator`: Tạo, chỉnh sửa khóa học của mình, xem danh sách học viên đăng ký.
  * `admin`: Duyệt ứng viên làm giảng viên (`EducatorApplication`), quản lý (ban/unban) người dùng, quản lý tất cả khóa học.
* **Quản lý State**: Sử dụng React Context (`AppContext`) kết hợp với custom hooks từ thư viện của Clerk.
* **Banning System**: Người dùng có thuộc tính `isBanned`. Nếu bị ban, UI sẽ chặn truy cập (hiển thị `DisabledAccountNotice`) và tự động đăng xuất người dùng khỏi hệ thống.
* **Thanh toán & Đăng ký khóa học**: Sử dụng Stripe Checkout và xử lý thông qua hệ thống Stripe Webhooks để xác nhận `Purchases` và cập nhật quyền truy cập khóa học.
* **AI Embeddings**: Ứng dụng AI (sử dụng Transformer) để tạo embeddings cho khóa học, phục vụ tính năng tìm kiếm và gợi ý thông minh dựa trên vector.

# DATABASE SCHEMA & DATA FLOW

* **User**: Lưu thông tin cơ bản đồng bộ từ Clerk, kèm theo `role` (student/educator/admin), `enrolledCourses` và cờ `isBanned`.
* **Course**: Gồm các thông tin mô tả, `coursePrice`, `discount`, cấu trúc chương trình học (`courseContent`: chapters -> lectures), refs tới `educator` và chứa vector `aiEmbedding` dùng cho AI Search.
* **EducatorApplication**: Đơn đăng ký làm giảng viên của sinh viên. Trạng thái gồm `pending`, `approved`, `rejected` (do Admin xét duyệt).
* **Purchases**: Ghi nhận các giao dịch thanh toán thành công (Stripe).
* **CourseProgress**: Theo dõi tiến độ xem video/hoàn thành bài giảng của học viên.

**Data Flow cơ bản**: 
1. Client gọi API đính kèm JWT của Clerk.
2. Server xác thực thông qua thư viện `@clerk/express`.
3. Controller truy vấn Mongoose Models, lưu file lên Cloudinary hoặc xử lý nghiệp vụ.
4. Server trả kết quả JSON về Client render qua React Component.

# API & INTEGRATION

**Danh sách Endpoints quan trọng (`server.js`)**:
* `POST /clerk` - Webhook nhận sự kiện từ hệ thống Clerk (ví dụ user.created).
* `POST /stripe` - Webhook nhận sự kiện thanh toán thành công từ Stripe.
* `/api/user` - Router xử lý lấy thông tin user, khóa học đã đăng ký, cập nhật tiến độ học.
* `/api/course` - Router xử lý hiển thị danh sách khóa học, xem chi tiết khóa học.
* `/api/educator` - Router xử lý chức năng dành riêng cho giảng viên (tạo/sửa khóa học, xem thống kê).
* `/api/admin` - Router quản trị user (ban/unban), duyệt đơn đăng ký giảng viên.
* `/api/ai` - Router xử lý tìm kiếm và gợi ý khóa học thông qua vector database.

# CURRENT STATUS & ROADMAPS

* **Đã hoàn thành**: 
  * Kiến trúc nền tảng Frontend và Backend.
  * Tích hợp Auth (Clerk), thanh toán (Stripe), upload media (Cloudinary).
  * Chức năng cốt lõi: Phân quyền, đăng ký giảng viên, tạo khóa học, xem video.
  * Tinh chỉnh tính năng AI/Embeddings: Refactor thành Natural Language Template với trích xuất chapter/lecture từ courseContent. Embedding pipeline tối ưu cho model multilingual của Xenova.
* **Đang làm dở / Tồn đọng** (Chi tiết: `BUSINESS_ISSUES_AND_FIX_PLAN.md`):
  * **14 lỗi nghiệp vụ** đã được xác định qua audit toàn diện (3 Critical, 3 High, 5 Medium, 3 Low).
  * 🔴 Critical: Biến `relatedTopics` chưa khai báo gây crash endpoint search; AI không cảnh báo khi nội dung dựa trên suy luận; lời khuyên AI search không khớp với khóa học thực tế.
  * 🟠 High: Thiếu auto-complete bài học; thiếu bài kiểm tra hết khóa; cho phép mua trùng khóa học.
  * 🟡 Medium: AI tools không kiểm tra enrollment; xóa khóa học không dọn dữ liệu liên quan; hardcode "Còn 5 ngày"; rating bị Math.floor; trường `completed` không được cập nhật.
  * 🟢 Low: Thiếu chứng nhận hoàn thành; không phân trang API; quiz không lưu lịch sử.


# CODING STANDARDS

* **Kiến trúc Backend**: Sử dụng **Layered Architecture** đơn giản (Routes -> Controllers -> Models).
* **Kiểu Component**: Frontend hoàn toàn sử dụng Functional Components và Hooks.
* **Naming Convention**: 
  * Files: React components đặt tên `PascalCase` (`App.jsx`, `Home.jsx`). Files bên backend đặt `camelCase` (`userController.js`).
  * Biến/Hàm: Đặt tên mô tả chức năng theo kiểu `camelCase`.
* **Module System**: Backend sử dụng chuẩn ES Modules (`import/export` thay vì `require`).
* **Môi trường**: Thông tin nhạy cảm được load từ biến môi trường qua thư viện `dotenv/config`.

# TECHNICAL DETAILS

## 1. Detailed Mongoose Schemas

**User Schema**
```javascript
{
  _id: { type: String, required: true }, // Clerk User ID
  name: { type: String, required: true },
  email: { type: String, required: true },
  imageUrl: { type: String, required: true },
  role: { type: String, enum: ['student', 'educator', 'admin'], default: 'student' },
  enrolledCourses: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  isBanned: { type: Boolean, default: false }
} // timestamps: true
```

**Course Schema**
```javascript
{
  courseTitle: { type: String, required: true },
  courseDescription: { type: String, required: true },
  courseTopic: { type: String, default: 'Tổng quát' },
  courseLevel: { type: String, enum: ['beginner', 'intermediate', 'advanced', 'all-levels'], default: 'beginner' },
  courseTags: [{ type: String }],
  estimatedDurationHours: { type: Number, default: 0, min: 0 },
  aiEmbedding: [{ type: Number }], // Vector lưu trữ embedding từ AI
  aiEmbeddingModel: { type: String, default: '' },
  aiEmbeddingUpdatedAt: { type: Date, default: null },
  courseThumbnail: { type: String },
  coursePrice: { type: Number, required: true },
  isPublished: { type: Boolean, default: true },
  discount: { type: Number, required: true, min: 0, max: 100 },
  courseContent: [ // Array of Chapter Schema
    {
      chapterId: { type: String, required: true },
      chapterOrder: { type: Number, required: true },
      chapterTitle: { type: String, required: true },
      chapterContent: [ // Array of Lecture Schema
        {
          lectureId: { type: String, required: true },
          lectureTitle: { type: String, required: true },
          lectureDuration: { type: Number, required: true },
          lectureUrl: { type: String, required: true },
          lectureContent: { type: String, default: '' }, // Transcript/nội dung văn bản (RAG)
          isPreviewFree: { type: Boolean, default: true },
          lectureOrder: { type: Number, required: true }
        }
      ]
    }
  ],
  courseRatings: [{ userId: { type: String }, rating: { type: Number, min: 1, max: 5 } }],
  educator: { type: String, ref: 'User', required: true },
  enrolledStudents: [{ type: String, ref: 'User' }]
} // timestamps: true
```

**EducatorApplication Schema**
```javascript
{
  userId: { type: String, required: true, ref: 'User' },
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  expertise: { type: String, required: true },
  experience: { type: String, required: true },
  qualification: { type: String, required: true },
  linkedinUrl: { type: String },
  portfolioUrl: { type: String },
  courseTopics: { type: String, required: true },
  teachingApproach: { type: String, required: true },
  sampleVideoUrl: { type: String },
  cvUrl: { type: String },
  certificatesUrl: [{ type: String }],
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  reviewedBy: { type: String, ref: 'User' },
  reviewedAt: { type: Date },
  rejectionReason: { type: String }
} // timestamps: true
```

**Purchase Schema**
```javascript
{
  courseId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Course' },
  userId: { type: String, required: true, ref: 'User' },
  amount: { type: Number, required: true },
  status: { type: String, enum: ['pending', 'completed', 'failed'], default: 'pending' }
} // timestamps: true
```

**CourseProgress Schema**
```javascript
{
  userId: { type: String, required: true }, // Không dùng ref ObjectId do userId là Clerk ID
  courseId: { type: String, required: true },
  completed: { type: Boolean, default: false },
  lectureCompleted: [] // Array chứa ID các bài học đã hoàn thành
}
```

## 2. Auth Payload & Webhook Events

**Clerk Webhook Events (`/clerk`)**
* `user.created`: Tạo mới User trong DB với role mặc định là `student`. Trích xuất `id`, `email_addresses[0].email_address`, `first_name`, `last_name`, `image_url`.
* `user.updated`: Cập nhật `email`, `name`, `imageUrl`.
* `user.deleted`: Xóa User khỏi DB theo ID.

**Stripe Webhook Events (`/stripe`)**
* `payment_intent.succeeded`: Thanh toán thành công. Lấy `purchaseId` từ `session.metadata`. Tiến hành cập nhật ID user vào mảng `enrolledStudents` (Course), ID khóa học vào mảng `enrolledCourses` (User), và chuyển `Purchase` status sang `completed`.
* `payment_intent.payment_failed`: Thanh toán thất bại. Đổi status của `Purchase` thành `failed`.

**Auth Payload**
* Trong các route được bảo vệ, Middleware của Clerk trích xuất ID người dùng và chèn vào `req.auth`. Backend truy cập ID này bằng `req.auth.userId`.

## 3. Global State Structure (`AppContext.jsx`)

Các giá trị được export qua `AppContext.Provider` cho toàn bộ các components khác:

```javascript
{
  // State variables
  currency,                 // (string) Đơn vị tiền tệ (ví dụ: "VND"), lấy từ env
  backendUrl,               // (string) URL của backend API từ env
  allCourses,               // (array) Danh sách tất cả khóa học
  enrolledCourses,          // (array) Các khóa học mà user hiện tại đã mua/đăng ký
  userData,                 // (object) Thông tin của user hiện tại (lấy từ backend)
  isEducator,               // (boolean) Trạng thái kiểm tra xem user có metadata role là educator không
  
  // Setter Functions
  navigate,                 // Hàm chuyển trang của react-router-dom
  setIsEducator,            // (function) Set state isEducator
  setEnrolledCourses,       // (function) Set state enrolledCourses
  
  // API Call Functions
  getToken,                 // (function) Lấy Clerk Auth JWT token
  fetchAllCourses,          // (function) Fetch toàn bộ list khóa học
  fetchUserData,            // (function) Fetch thông tin user đang đăng nhập
  fetchUserEnrolledCourses, // (function) Fetch danh sách các khóa học user đã đăng ký
  
  // Helpers
  calculateRating,          // (function) Tính trung bình số sao rating của 1 khóa học
  calculateChapterTime,     // (function) Tính tổng thời lượng của một chương học (parse sang định dạng H/M)
  calculateCourseDuration,  // (function) Tính tổng thời lượng toàn bộ khóa học
  calculateNoOfLectures     // (function) Đếm tổng số bài giảng trong 1 khóa học
}
```

## 4. AI Architecture (RAG + Gemini-Only)

**Kiến trúc**: Hệ thống AI sử dụng **Retrieval-Augmented Generation (RAG)** — truy vấn transcript thực tế từ DB rồi inject vào prompt cho LLM, thay vì chỉ dựa vào tiêu đề bài học.

**AI Provider**: Hệ thống đã nâng cấp lên **Gemini 3 Flash SDK (2026)** thông qua thư viện chính thức `@google/genai`. OpenAI đã bị loại bỏ hoàn toàn.

**Transcript Pipeline**:
* Khi Educator tạo/cập nhật khóa học, server tự động gọi `populateTranscripts()` để lấy transcript từ YouTube URL bằng package `youtube-transcript`.
* Transcript được lưu vào trường `lectureContent` trong Lecture Schema.
* `lectureContent` là nguồn ngữ cảnh **ưu tiên số 1** cho các tính năng AI (`chatWithAI`, `summarizeLesson`, `generateQuiz`).
* Nếu video không có subtitle, `lectureContent` sẽ rỗng và AI sẽ fallback về `courseDescription` + ngữ cảnh tổng quát.
* Sau khi đồng bộ transcript trong `addCourse/updateCourse`, hệ thống tự động tạo `aiEmbedding` ngay lập tức qua `server/utils/embeddingHelper.js` với model cố định `Xenova/paraphrase-multilingual-MiniLM-L12-v2` (không cần chạy script thủ công).

**API Tìm kiếm (`/api/course/semantic-overview`)**:
```javascript
// Response mới:
{
  success: true,
  query: "react hooks",
  advice: "Lời khuyên AI dạng chuỗi text thuần...", // Gemini-generated, hoặc null
  recommendations: [ { _id, courseTitle, courseTopic, courseLevel, _score, ... } ],
  meta: {
    totalMatches: 5,
    searchMethod: "hybrid",
    adaptiveThreshold: 0.45,
    weights: { semantic: 0.75, lexical: 0.25 },
    relatedTopics: ["Web Development", "JavaScript"],
    embeddingCached: true
  }
}
```
* Pha 1 (AI Advice): Gọi Gemini song song với truy vấn DB, sinh **2 câu** lời khuyên lộ trình học.
  * AI Strategy: dùng **Model Fallback** cho Gemini 3 Flash theo thứ tự `gemini-3-flash-preview` → `gemini-3-flash` để đảm bảo availability.
* Pha 2 (Ranking): **Weighted Hybrid Search** theo điểm tuyến tính:
  * `_score = (semanticScore * 0.75) + (normalizedLexicalScore * 0.25)` — cân bằng giữa ngữ nghĩa AI và từ khóa chính xác.
  * Lexical scoring được **normalize về 0–1** với exact-match bonus (trọng số +5 cho exact phrase match trong title).
  * Áp dụng **Adaptive Semantic Guard**: threshold tự động = `max(0.25, topScore * 0.6)` thay vì cố định 0.7, tránh lọc mất kết quả hợp lệ khi query ngắn/mơ hồ.
  * Query embedding được tạo bằng `generateQueryEmbeddingVector(query)` — nhúng trực tiếp text query thô, không qua format CORE/TOPIC/DESC (giảm noise, tăng accuracy).
  * **Embedding Cache (LRU)**: cache 200 query embeddings gần nhất (TTL 30 phút), tránh compute lại cho cùng query.
* Embedding pipeline dùng **Natural Language Template**:
   * Xây dựng chuỗi nhúng từ template tự nhiên: `"{cleanTitle} là khóa học về {topic}. Các chủ đề then chốt gồm: {tags}. Nội dung giảng dạy tập trung vào: {chapterTitles + lectureTitles}. Mô tả ngắn: {200 ký tự courseDescription}."` để tối ưu cho model `Xenova/paraphrase-multilingual-MiniLM-L12-v2`.
   * Duyệt sâu vào mảng `courseContent` (nested chapters/lectures) để trích xuất toàn bộ `chapterTitle` và `lectureTitle`.
   * Làm sạch tiêu đề bằng loại các từ nhiễu: `Lập trình`, `Khóa học`, `Cơ bản`, `Nâng cao` để AI tập trung vào thực thể chuyên môn.
   * Loại bỏ HTML tags và chuẩn hóa khoảng trắng trước nhúng, đảm bảo text sạch sẽ vào model.
   * Vector trả về định dạng mảng số thực (384 chiều) để lưu tại `aiEmbedding` field trong MongoDB.

* Giao diện AI Overview chuẩn hóa theo Coursera: Lời khuyên dạng Plain Text (không intro, không markdown) + Top gợi ý khóa học (Interactive Cards) dựa trên điểm Semantic. Card gợi ý có đầy đủ hiệu ứng hover và tự động scrollToTop khi điều hướng.
* Hiển thị search metadata: badge phương pháp search (Semantic + Lexical), tổng matches, trạng thái cache, chủ đề liên quan.
* Skeleton loading animation cho AI Overview (shimmer effect) trong khi chờ backend response.
* Badge "✨ AI Đề xuất" trên CourseCard cho khóa học từ semantic results, với viền xanh nổi bật.
* Debounce 500ms cho API semantic search call, tránh gọi quá nhiều khi user đang gõ.

**Controller: `aiController.js`**:
* `chatWithAI`: Nhận `lectureId` → Truy vấn DB lấy `lectureContent` → Inject transcript đầy đủ vào system prompt.
* `summarizeLesson`: Nhận `lectureId` hoặc `chapterIndex/lectureIndex` → Ưu tiên `lectureContent` đầy đủ để tóm tắt.
* `generateQuiz`: Gom `lectureContent` của tất cả lectures trong chapter → Sinh quiz dựa trên transcript thực tế.
* Khi thiếu transcript: fallback về `courseDescription` và yêu cầu AI trả lời theo ngữ cảnh tổng quát.
* `generateCourseDescription`: Giữ nguyên (sinh mô tả khóa học cho Educator).
* `checkAIStatus`: Trả về `provider: 'Google Gemini'`.

**Script: `generateCourseEmbeddings.js`**:
* Chạy độc lập, tái sử dụng utility `server/utils/embeddingHelper.js` với model `Xenova/paraphrase-multilingual-MiniLM-L12-v2`.
* Dùng cho backfill/re-index hàng loạt; còn luồng create/update khóa học đã tự động sinh embedding realtime.

**Utility: `server/utils/transcriptHelper.js`**:
* `fetchYouTubeTranscript(url)`: Trích YouTube ID → Gọi `youtube-transcript` → Trả về text thuần (tối đa 8000 ký tự).
* `populateTranscripts(courseContent)`: Duyệt tất cả lectures, fetch transcript cho những bài chưa có `lectureContent`.
