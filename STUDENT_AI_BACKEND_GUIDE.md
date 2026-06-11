# Backend Guide: Student Features + AI Features (LMS)

> Tài liệu này tập trung **backend trước** (theo yêu cầu), giúp bạn hiểu sâu luồng Student + AI mà vẫn dễ học, dễ nhớ.

## 1) Bản đồ nhanh kiến trúc backend

- **Entry**: `server/server.js`
- **Routes Student**: `server/routes/userRoute.js`, `server/routes/courseRoute.js`
- **Routes AI**: `server/routes/aiRoutes.js`
- **Controllers chính**:
  - Student: `server/controllers/userController.js`, `server/controllers/courseController.js`
  - AI: `server/controllers/aiController.js`
- **Models dữ liệu**: `server/models/User.js`, `Course.js`, `Purchases.js`, `CourseProgress.js`
- **Utils AI/Semantic**: `server/utils/genaiHelper.js`, `embeddingHelper.js`, `embeddingCache.js`, `transcriptHelper.js`
- **Auth middleware**: `server/middlewares/authMiddleware.js`

---

## 2) `server/server.js`

### File này làm gì?
- Khởi tạo Express app.
- Kết nối MongoDB + Cloudinary.
- Mount toàn bộ route API.
- Gắn middleware Clerk.

### Logic chính
1. `connectDB()` + `connectCloudinary()`
2. `app.use(cors())`, `app.use(clerkMiddleware())`
3. Mount routes:
   - `/api/course`
   - `/api/user`
   - `/api/ai`
   - ...
4. Lắng nghe cổng `PORT`.

### Input/Output
- Không nhận input từ business layer (đây là bootstrap file).
- Output: server lắng nghe HTTP API.

### Lưu ý học nhanh
- Nhớ: đây là “**điểm vào**” nên mọi bug route thường quay về đây để check mount path + middleware thứ tự.

### Câu hỏi kiểm tra + gợi ý
1. **Vì sao `/clerk` và `/stripe` dùng `express.raw` thay vì `express.json`?**  
   *Gợi ý:* webhook cần body nguyên bản để verify signature.
2. **Nếu mount `clerkMiddleware()` sau routes thì sao?**  
   *Gợi ý:* `req.auth` có thể thiếu ở controller cần auth.

---

## 3) `server/middlewares/authMiddleware.js`

### File này làm gì?
- Định nghĩa guard:
  - `requireAuth`: chỉ cần đăng nhập.
  - `protectEducator`: educator/admin.
  - `protectAdmin`: chỉ admin.
- Đồng thời chặn user bị ban (`isBanned`).

### Hàm & logic
- `requireAuth(req,res,next)`
  - Check `req.auth.userId`.
  - Query DB user để check `isBanned`.
  - Pass `next()` nếu hợp lệ.
- `protectEducator(...)`
  - Check auth + banned.
  - Query Clerk `publicMetadata.role` phải là `educator` hoặc `admin`.
- `protectAdmin(...)`
  - Tương tự, role bắt buộc `admin`.

### Input/Output
- Input: `req.auth.userId` (do Clerk middleware cấp).
- Output:
  - Pass `next()`
  - Hoặc trả `401/403/500`.

### Lưu ý học sâu
- Middleware này đang là “single source of truth” cho quyền truy cập route.
- Nếu bạn thấy route nào “lọt quyền”, thường là do route đó **chưa gắn middleware phù hợp**.

### Câu hỏi kiểm tra + gợi ý
1. **Khác nhau giữa `requireAuth` và `protectAdmin` là gì?**  
   *Gợi ý:* auth-only vs role-based.
2. **Vì sao check `isBanned` ở middleware thay vì từng controller?**  
   *Gợi ý:* giảm lặp code, nhất quán toàn hệ thống.

---

## 4) `server/models/User.js`

### Mục đích
- Lưu thông tin user local đồng bộ với Clerk.

### Trường quan trọng
- `_id` (string, Clerk user id)
- `role`: `student | educator | admin`
- `enrolledCourses`: mảng ObjectId `Course`
- `isBanned`: cờ chặn truy cập

### Lưu ý
- `_id` là string (không phải ObjectId), vì dùng trực tiếp Clerk ID.

### Câu hỏi kiểm tra + gợi ý
1. **Tại sao `enrolledCourses` dùng ObjectId nhưng `_id` lại string?**  
   *Gợi ý:* quan hệ Course là Mongo docs, còn user id theo Clerk.

---

## 5) `server/models/Course.js`

### Mục đích
- Model trung tâm của LMS.

### Cấu trúc nested
- `courseContent` gồm nhiều chapter:
  - `chapterTitle`, `chapterOrder`
  - `chapterContent` gồm nhiều lecture:
    - `lectureTitle`, `lectureDuration`, `lectureUrl`, `lectureContent`, ...

### Trường liên quan AI/Semantic
- `aiEmbedding`, `aiEmbeddingModel`, `aiEmbeddingUpdatedAt`
- `courseTags`, `courseTopic`, `courseDescription`

### Trường liên quan rating
- `courseRatings`: `{ userId, rating }[]`

### Lưu ý
- `lectureContent` là transcript text (RAG input cho AI).

### Câu hỏi kiểm tra + gợi ý
1. **`chapterTitle` nằm ở đâu? top-level hay nested?**  
   *Gợi ý:* nested trong `courseContent`.
2. **Semantic search dùng trường nào để embed?**  
   *Gợi ý:* title/topic/tags + chapter/lecture titles + description.

---

## 6) `server/models/Purchases.js`

### Mục đích
- Lưu giao dịch mua khóa học (Stripe flow).

### Trường
- `courseId`, `userId`, `amount`, `status`

### Lưu ý
- Đây là căn cứ để thống kê doanh thu/admin dashboard.

### Câu hỏi kiểm tra + gợi ý
1. **Khi checkout thành công, update trạng thái purchase ở đâu?**  
   *Gợi ý:* luồng webhook Stripe.

---

## 7) `server/models/CourseProgress.js`

### Mục đích
- Theo dõi tiến độ học của user theo course.

### Trường
- `userId`, `courseId`
- `lectureCompleted` (mảng lectureId đã học)

### Lưu ý
- `courseId` ở schema này đang để kiểu string; team nên giữ thống nhất type toàn hệ nếu mở rộng sau này.

### Câu hỏi kiểm tra + gợi ý
1. **Vì sao có thể đánh dấu hoàn thành từng lecture mà không cần cột cho từng lecture?**  
   *Gợi ý:* lưu mảng id đã hoàn thành.

---

## 8) `server/routes/courseRoute.js`

### Endpoint
- `GET /api/course/all` → `getAllCourses`
- `GET/POST /api/course/semantic-overview` → `getSemanticOverview`
- `GET /api/course/:id` → `getCourseId`

### Lưu ý
- `semantic-overview` hỗ trợ cả GET/POST giúp frontend linh hoạt.

### Câu hỏi kiểm tra + gợi ý
1. **Khi search semantic ở frontend, đang gọi route nào?**  
   *Gợi ý:* `/api/course/semantic-overview`.

---

## 9) `server/controllers/courseController.js`

## 9.1 `getAllCourses`

### Làm gì?
- Trả danh sách khóa học đã publish (`isPublished: true`) cho trang Home/List.

### Input
- Không cần body.

### Output
- `{ success, courses }`
- Mỗi course đã map qua `mapCourseForSearch`.

### Điểm quan trọng
- Loại bỏ payload nặng: `-courseContent`, `-enrolledStudents`, `-aiEmbedding`.
- Vẫn trả đủ dữ liệu để card hiển thị (bao gồm `courseRatings` sau khi đã fix).

---

## 9.2 `getCourseId`

### Làm gì?
- Trả chi tiết một khóa học theo `id`.

### Logic đặc biệt
- Với lecture không free preview (`!isPreviewFree`) thì xóa `lectureUrl` trước khi trả về.

### Input
- `req.params.id`

### Output
- `{ success, courseData }`

---

## 9.3 `getSemanticOverview`

### Làm gì?
- Hybrid search: Semantic embedding + lexical score.
- Trả:
  - `advice` (Gemini)
  - `recommendations` (khóa học chấm điểm)
  - `meta`

### Logic chính
1. Parse query + limit.
2. Cache query embedding (`embeddingCache`).
3. Song song:
   - gọi `callGeminiForAdvice`
   - load published courses + aiEmbedding
4. Tính điểm:
   - `semanticScore` (cosine similarity)
   - `lexicalScore` (title/topic/tags/description)
   - score tổng = `semantic*0.75 + lexical*0.25`
5. Adaptive threshold semantic (`max(top*0.6, floor 0.25)`).
6. Trả danh sách pass threshold.

### Lưu ý học sâu
- Vì dùng threshold theo semantic, có thể có trường hợp lexical match nhưng semantic thấp sẽ bị loại.
- Đây là chủ đích để giảm “match từ khóa nhưng sai ngữ cảnh”.

### Câu hỏi kiểm tra + gợi ý
1. **Vì sao cần normalize tiếng Việt có dấu trước khi lexical?**  
   *Gợi ý:* query không dấu vẫn tìm đúng.
2. **Vì sao không dùng fixed threshold 0.7?**  
   *Gợi ý:* query ngắn dễ bị miss; adaptive linh hoạt hơn.

---

## 10) `server/routes/userRoute.js`

### Endpoint Student
- `GET /data`
- `GET /enrolled-courses`
- `POST /purchase`
- `POST /update-course-progress`
- `POST /get-course-progress`
- `POST /add-rating`

### Lưu ý
- Các endpoint này hiện dựa vào `req.auth.userId`; trên thực tế bạn nên đảm bảo đã có guard phù hợp theo chuẩn bảo mật team.

### Câu hỏi kiểm tra + gợi ý
1. **Endpoint nào cập nhật rating?**  
   *Gợi ý:* `POST /add-rating`.

---

## 11) `server/controllers/userController.js`

## 11.1 `getUserData`
- Trả profile user local theo `req.auth.userId`.

## 11.2 `userEnrolledCourses`
- Trả danh sách course đã enroll (`populate('enrolledCourses')`).

## 11.3 `purchaseCourse`
- Tạo bản ghi Purchase `pending`.
- Tạo Stripe Checkout Session.
- Redirect URL:
  - success: `/loading/my-enrollments`
  - cancel: trang origin.

### Input
- Body: `{ courseId }`

### Output
- `{ success, session_url }`

## 11.4 `updateUserCourseProgress`
- Add lectureId vào `CourseProgress.lectureCompleted`.
- Nếu document chưa tồn tại thì tạo mới.

## 11.5 `getUserCourseProgress`
- Trả progress của user cho một khóa.

## 11.6 `addUserRating`
- Validate `rating` từ 1–5.
- Check user đã enroll course.
- Nếu đã từng rating thì update; chưa có thì push mới.

### Input
- `{ courseId, rating }`

### Output
- `{ success, message }`

### Lưu ý học sâu
- Rating được lưu trên `Course.courseRatings`, không tách collection riêng.

### Câu hỏi kiểm tra + gợi ý
1. **Làm sao chống user chưa mua mà vẫn rating?**  
   *Gợi ý:* check `user.enrolledCourses.includes(courseId)`.
2. **Update rating cũ bằng cách nào?**  
   *Gợi ý:* tìm index `course.courseRatings.findIndex`.

---

## 12) `server/routes/aiRoutes.js`

### Endpoint AI
- `GET /api/ai/status`
- `POST /api/ai/chat`
- `POST /api/ai/summarize`
- `POST /api/ai/generate-quiz`
- `POST /api/ai/generate-description`

### Lưu ý
- Các route thao tác AI chính đều gắn `requireAuth`.

### Câu hỏi kiểm tra + gợi ý
1. **Route nào dùng cho nút “Tạo mô tả bằng AI”?**  
   *Gợi ý:* `POST /api/ai/generate-description`.

---

## 13) `server/controllers/aiController.js`

## 13.1 Nhóm core Gemini call

### `getGeminiModels`
- Ghép model từ env `GEMINI_MODEL` + fallback list mặc định.

### `callGemini(prompt, systemPrompt?)`
- Tạo client `@google/genai`.
- Lặp qua từng model theo thứ tự ưu tiên.
- Retry khi rate-limit / temporary unavailable.
- Model not found thì chuyển model kế.
- Nếu AI quá tải: throw `AI_BUSY_MESSAGE`.

### Model order hiện tại
1. `gemini-3-flash-preview`
2. `gemini-3-flash`
3. `gemini-2.5-flash`
4. `gemini-2.0-flash`
5. `gemini-2.0-flash-lite`

---

## 13.2 AI học tập (RAG)

### `chatWithAI`
- Input: `{ message, courseId?, lectureId?, lessonContext? }`
- Nếu có lecture transcript thì build context sát bài học.
- Trả `{ success, response }`.

### `summarizeLesson`
- Input: `{ courseId, chapterIndex?, lectureIndex?, lectureId? }`
- Ưu tiên `lectureId`, fallback bằng index.
- Nếu có transcript: tóm tắt theo nội dung thật.
- Nếu không có: tóm tắt từ mô tả course + context tổng quát.

### `generateQuiz`
- Input: `{ courseId, chapterIndex, numberOfQuestions? }`
- Dùng transcript của cả chapter để sinh câu hỏi.
- Yêu cầu AI trả JSON, sau đó parse.
- Output: `{ quiz, chapterTitle, hasTranscript }`.

---

## 13.3 AI cho Educator

### `generateCourseDescription`
- Input: `{ courseTitle, topics, targetAudience, courseLevel }`
- Prompt yêu cầu output **plain text**.
- Sanitize text để bỏ markdown/html rác.
- Nếu Gemini lỗi → fallback local description.
- Output: `{ success, description }`.

### `checkAIStatus`
- Trả trạng thái có API key Gemini hay không.

### Lưu ý học sâu
- Đây là controller “đa nhiệm”: chat + summarize + quiz + description.
- Khi debug AI lỗi, bắt đầu từ:
  1) model order
  2) loại lỗi (404 model, 429 rate, 503 unavailable)
  3) fallback path.

### Câu hỏi kiểm tra + gợi ý
1. **Vì sao `summarizeLesson` ưu tiên `lectureId` hơn index?**  
   *Gợi ý:* index dễ lệch khi reorder data.
2. **Khi Gemini quá tải, API trả mã gì?**  
   *Gợi ý:* controller map ra `429` với `AI_BUSY_MESSAGE`.

---

## 14) `server/utils/genaiHelper.js`

### Hàm chính
- `createGenAIClient(apiKey)` → tạo `GoogleGenAI`.
- `extractGenAIText(response)` → đọc text từ response theo nhiều cấu trúc.
- `isRateLimitError(error)` → nhận diện 429/resource_exhausted.
- `sleep(ms)` → retry delay.

### Lưu ý
- Đây là utility nền để các controller AI không bị lặp code xử lý response.

### Câu hỏi kiểm tra + gợi ý
1. **Nếu `response.text` rỗng thì helper đọc text ở đâu tiếp?**  
   *Gợi ý:* `candidates[0].content.parts`.

---

## 15) `server/utils/embeddingHelper.js`

### Mục đích
- Sinh vector embedding cho course và query semantic search.

### Hàm chính
- `buildCourseEmbeddingText(course)`:
  - Gộp title/topic/tags/chapterTitle/lectureTitle/description thành template ngôn ngữ tự nhiên.
- `generateCourseEmbeddingVector(course)`:
  - Embed nội dung khóa học.
- `generateQueryEmbeddingVector(queryText)`:
  - Embed query raw (không bọc template).
- `refreshCourseEmbedding(courseDoc)`:
  - Ghi vector vào `course.aiEmbedding`.

### Lưu ý học sâu
- Query embedding tách riêng để tránh “noise” format.

### Câu hỏi kiểm tra + gợi ý
1. **Vì sao chapter/lecture title được đưa vào text embedding?**  
   *Gợi ý:* tăng tín hiệu ngữ nghĩa cho nội dung cụ thể.

---

## 16) `server/utils/embeddingCache.js`

### Mục đích
- Cache embedding của query để giảm latency + chi phí.

### Cơ chế
- LRU đơn giản với `Map`:
  - max size = 200
  - TTL = 30 phút

### Hàm
- `getCachedEmbedding(key)`
- `setCachedEmbedding(key, vector)`
- `getCacheStats()`

### Câu hỏi kiểm tra + gợi ý
1. **Tại sao cần “move to end” khi get cache hit?**  
   *Gợi ý:* cập nhật thứ tự recent trong LRU.

---

## 17) `server/utils/transcriptHelper.js`

### Mục đích
- Lấy transcript YouTube cho lecture, phục vụ RAG.

### Hàm chính
- `fetchYouTubeTranscript(videoUrl)`:
  - parse video id, fetch transcript (ưu tiên `vi`, fallback ngôn ngữ khác).
  - cắt ngắn theo `MAX_TRANSCRIPT_LENGTH`.
- `populateTranscripts(courseContent)`:
  - duyệt từng lecture, fill `lectureContent` nếu trống.

### Lưu ý học sâu
- Transcript tốt ⇒ summarize/quiz/chat chất lượng hơn rõ rệt.

### Câu hỏi kiểm tra + gợi ý
1. **Nếu transcript API fail thì hệ thống có crash không?**  
   *Gợi ý:* không, helper bắt lỗi và trả chuỗi rỗng.

---

## 18) Checklist tự học backend (để nhớ lâu)

1. Đọc route trước, map route → controller tương ứng.
2. Vẽ flow 3 chức năng student cốt lõi:
   - mua khóa học
   - đánh dấu tiến độ
   - rating
3. Vẽ flow 4 chức năng AI:
   - chat
   - summarize
   - quiz
   - description
4. Debug mindset:
   - check input request
   - check query DB
   - check fallback/error map
   - check response shape frontend đang dùng.

---

## 19) Bài tập mini (tự kiểm tra đã hiểu thật chưa)

1. **Nếu muốn search thường match thêm `chapterTitle` thì chỉnh ở đâu trước?**  
   *Gợi ý:* cân nhắc cả backend data shape + lexical scoring.

2. **Nếu muốn AI chat chỉ trả lời từ transcript, không cho suy luận ngoài dữ liệu thì đổi prompt nào?**  
   *Gợi ý:* `chatWithAI` trong `aiController.js`.

3. **Nếu user bị ban vẫn gọi `/api/ai/summarize` được thì lỗi ở tầng nào?**  
   *Gợi ý:* middleware auth route-level.

4. **Nếu rating lưu DB thành công nhưng Home chưa đổi ngay thì debug theo thứ tự nào?**  
   *Gợi ý:* mutation endpoint → `fetchAllCourses` → payload `/api/course/all` có `courseRatings` chưa → UI map.

---

> Nếu bạn muốn, bước tiếp theo mình có thể viết **phần frontend tương ứng** theo đúng format này (CoursesList, CourseDetails, Player, AIChatbot, AITools, AppContext...) để hoàn chỉnh full-stack guide student + AI.
