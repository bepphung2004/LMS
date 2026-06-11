# AI Semantic Search trong LMS - Hướng dẫn chi tiết theo code dự án

## 1) File này để làm gì?

File này là tài liệu kỹ thuật để:
- Hiểu **toàn bộ cơ chế AI Semantic Search** đang chạy trong dự án LMS.
- Nắm được **vai trò từng file/hàm**, luồng xử lý request, cách tính điểm và lọc kết quả.
- Hiểu vì sao dự án chọn hướng tiếp cận **hybrid (semantic + lexical)** thay vì chỉ keyword.
- Dùng làm tài liệu onboarding cho dev mới hoặc review kiến trúc trước khi tối ưu.

---

## 2) Tổng quan kiến trúc semantic search hiện tại

Hệ thống đang dùng mô hình lai:
1. **Semantic score** từ vector embedding (cosine similarity).
2. **Lexical score** từ keyword matching có trọng số theo field.
3. Trộn 2 điểm theo trọng số:
   - `SEMANTIC_WEIGHT = 0.75`
   - `LEXICAL_WEIGHT = 0.25`

Nguồn code chính:
- `server/controllers/courseController.js`
- `server/utils/embeddingHelper.js`
- `server/utils/embeddingCache.js`
- `server/controllers/educatorControllers.js`
- `server/scripts/generateCourseEmbeddings.js`
- `server/routes/courseRoute.js`
- `client/src/pages/student/CoursesList.jsx`

---

## 3) Data model liên quan AI search

Trong `server/models/Course.js`:
- `aiEmbedding: [{ type: Number }]`: vector embedding của khóa học.
- `aiEmbeddingModel: String`: tên model đã dùng để sinh vector.
- `aiEmbeddingUpdatedAt: Date`: thời điểm cập nhật embedding gần nhất.

Ý nghĩa:
- Mỗi course có embedding riêng để so sánh ngữ nghĩa với query embedding.
- Lưu model + timestamp giúp debug/đồng bộ khi thay model embedding.

---

## 4) Endpoint và wiring

### 4.1 API route
`server/routes/courseRoute.js`
- `GET /api/course/semantic-overview`
- `POST /api/course/semantic-overview`

Controller xử lý: `getSemanticOverview`.

### 4.2 Server mount
`server/server.js`
- `app.use('/api/course', express.json(), courseRouter)`

=> Frontend gọi vào `/api/course/semantic-overview` là đi đúng luồng semantic search.

---

## 5) Luồng xử lý chi tiết (runtime)

Hàm chính: `getSemanticOverview` trong `server/controllers/courseController.js`.

### Bước 1 - Nhận input
- Nhận `query` từ `req.body` hoặc `req.query`.
- Nhận `limit`, ép về [1..10], default 6.
- Nếu query rỗng: trả kết quả rỗng ngay.

### Bước 2 - Lấy query embedding từ cache hoặc sinh mới
- `getCachedEmbedding(query)` trong `embeddingCache.js`.
- Nếu cache miss: `generateQueryEmbeddingVector(query)` rồi `setCachedEmbedding(query, vector)`.

### Bước 3 - Chạy song song 2 tác vụ
`Promise.all`:
1. `callGeminiForAdvice(query)` để tạo lời khuyên ngắn (AI Overview).
2. Query toàn bộ course published + field cần thiết + `aiEmbedding`.

### Bước 4 - Chấm điểm từng course
Với mỗi course:
1. `embeddingScore = cosineSimilarity(queryEmbedding, course.aiEmbedding)`
2. `lexical = lexicalScore(query, course)`
3. `weightedScore = semantic * 0.75 + lexical * 0.25`

Sau đó gắn metadata:
- `_score`, `_semanticScore`, `_embeddingScore`, `_lexicalScore`

### Bước 5 - Rank + lọc ngưỡng thích nghi
1. Sort giảm dần theo `_score`.
2. Tính `adaptiveThreshold`:
   - `max(RELEVANCE_FLOOR, topSemantic * 0.6)`
   - với `RELEVANCE_FLOOR = 0.25`
3. Giữ các course có `_semanticScore >= adaptiveThreshold`.

### Bước 6 - Trả response
Trả:
- `advice` (Gemini)
- `recommendations` (đã bỏ score nội bộ ra khỏi payload)
- `meta` gồm:
  - `totalMatches`
  - `searchMethod: 'hybrid'`
  - `adaptiveThreshold`
  - `weights`
  - `relatedTopics`
  - `embeddingCached`

---

## 6) Thuật toán và logic chính

## 6.1 Semantic: cosine similarity
Trong `courseController.js`:
- Kiểm tra null/empty/mismatch dimension trước khi tính.
- Công thức: `dot(a,b) / (||a|| * ||b||)`.

Lý do chọn cosine:
- Ổn định cho text embedding đã normalize.
- So sánh “hướng” vector (ngữ nghĩa) thay vì độ lớn tuyệt đối.

## 6.2 Lexical score có trọng số field
`lexicalScore(query, course)`:
- Bonus phrase trùng title: +5
- Match token:
  - title +3
  - topic +2.5
  - tags +2
  - description +1
- Chuẩn hóa về [0..1] để cộng chung với semantic score.

Lý do cần lexical:
- Semantic tốt cho ý nghĩa tổng quát nhưng có thể bỏ sót exact keyword user cần.
- Lexical giúp tăng precision cho truy vấn “đúng từ khóa”.

## 6.3 Hybrid scoring
- `0.75 semantic + 0.25 lexical`.

Lý do:
- Ưu tiên AI semantic (chất lượng hiểu ý), vẫn giữ keyword signal để tránh “lệch chủ đề”.

## 6.4 Adaptive threshold
- Không dùng ngưỡng cố định.
- Dùng top semantic score của query hiện tại để co giãn:
  - Query rõ nghĩa -> top score cao -> threshold cao hơn.
  - Query mơ hồ -> threshold mềm hơn nhưng vẫn có sàn 0.25.

Lý do:
- Tránh trả về nhiều kết quả nhiễu.
- Không quá khắt khe khi dữ liệu/chủ đề ít.

---

## 7) Embedding pipeline (offline + online)

## 7.1 Build text embedding cho course
Trong `server/utils/embeddingHelper.js`, `buildCourseEmbeddingText(course)`:
- Lấy:
  - `courseTitle` (làm sạch bớt từ chung)
  - `courseTopic`
  - `courseTags`
  - `chapterTitle` + `lectureTitle`
  - tóm tắt `courseDescription`
- Ghép thành natural-language template.

Mục tiêu:
- Cho model embedding thấy đủ ngữ cảnh nội dung dạy, không chỉ mỗi title.

## 7.2 Model embedding
`EMBEDDING_MODEL_NAME = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2'`

Lý do chọn:
- Hỗ trợ đa ngôn ngữ (phù hợp tiếng Việt).
- Nhẹ, chạy được trong backend Node qua `@xenova/transformers`.

## 7.3 Cập nhật embedding khi course thay đổi
Trong `server/controllers/educatorControllers.js`:
- `addCourse`:
  - tạo course
  - populate transcript
  - `refreshCourseEmbedding(newCourse)`
- `updateCourse`:
  - reset embedding cũ
  - save nội dung mới
  - `refreshCourseEmbedding(course)`

=> Đảm bảo index semantic luôn bám theo nội dung mới.

## 7.4 Batch backfill embedding
Script:
- `server/scripts/generateCourseEmbeddings.js`
- npm script: `"embed:courses": "node scripts/generateCourseEmbeddings.js"`

Dùng khi:
- Đổi model embedding.
- Dữ liệu cũ chưa có embedding.
- Cần re-index hàng loạt.

---

## 8) Cơ chế cache query embedding

`server/utils/embeddingCache.js`:
- Cache kiểu LRU đơn giản bằng `Map`.
- `CACHE_MAX = 200`
- `CACHE_TTL_MS = 30 phút`

Lợi ích:
- Query lặp lại không phải sinh embedding lại.
- Giảm latency và tải compute.

Chi tiết:
- Key được normalize lowercase + trim.
- Lấy cache thì refresh vị trí key để mô phỏng LRU.
- Quá TTL thì xóa.

---

## 9) AI Advice đi kèm semantic search

Trong `courseController.js`, `callGeminiForAdvice(query)`:
- Prompt tiếng Việt, yêu cầu strict:
  - Không intro
  - Plain text, không markdown
- Kết quả được sanitize:
  - `replace(/\*/g, '').trim()`
- Nếu Gemini bận/lỗi -> fallback text thân thiện.

Vai trò:
- Semantic search trả “kết quả”
- AI Advice trả “định hướng học”
- Kết hợp thành khối `AI Overview` trên UI.

---

## 10) Frontend áp dụng semantic search thế nào

`client/src/pages/student/CoursesList.jsx`:
- Debounce 500ms (`DEBOUNCE_MS`) để tránh spam API khi user gõ.
- Khi có keyword:
  1. Gọi `POST /api/course/semantic-overview`
  2. Lấy `advice`, `recommendations`, `meta`
  3. Hiển thị khối `✨ AI Overview`
- Merge danh sách:
  - Ưu tiên top AI recommendations trước.
  - Sau đó append kết quả filter thường và bỏ trùng theo `_id`.

Ý nghĩa sản phẩm:
- User vừa có danh sách “thông minh” (AI ưu tiên), vừa giữ được cách duyệt truyền thống.

---

## 11) Vì sao chọn cách tiếp cận này?

1. **Hybrid thay vì pure semantic**  
   Tránh trường hợp semantic “đúng nghĩa nhưng sai ý định keyword cụ thể”.

2. **Adaptive threshold thay vì fixed threshold**  
   Mỗi query có độ khó khác nhau; threshold động giữ độ linh hoạt.

3. **Precompute embedding cho course**  
   Query-time chỉ cần embedding cho câu hỏi + tính similarity, nhanh hơn so với embed toàn bộ course mỗi lần search.

4. **Cache query embedding**  
   Tối ưu hiệu năng cho từ khóa lặp lại.

5. **AI Advice tách riêng khỏi ranking**  
   Advice hỗ trợ định hướng học, không can thiệp trực tiếp score nên dễ kiểm soát chất lượng kết quả.

---

## 12) Điểm cần lưu ý khi mở rộng

- Nếu đổi embedding model, cần chạy lại batch `embed:courses`.
- Cần đảm bảo vector query và vector course cùng dimension.
- Nếu `courseContent` thay đổi nhưng không gọi `refreshCourseEmbedding`, chất lượng search sẽ giảm.
- Nếu muốn tăng recall:
  - hạ `RELEVANCE_FLOOR`
  - hoặc giảm hệ số adaptive (0.6).
- Nếu muốn tăng precision:
  - nâng lexical weight khi domain keyword rất đặc thù.

---

## 13) Code evidence nhanh (mốc chính)

- `server/controllers/courseController.js`
  - `cosineSimilarity`, `lexicalScore`, `computeAdaptiveThreshold`
  - `getSemanticOverview`
  - `callGeminiForAdvice`
- `server/utils/embeddingHelper.js`
  - `buildCourseEmbeddingText`
  - `generateCourseEmbeddingVector`
  - `generateQueryEmbeddingVector`
  - `refreshCourseEmbedding`
- `server/utils/embeddingCache.js`
  - `getCachedEmbedding`, `setCachedEmbedding`
- `server/controllers/educatorControllers.js`
  - `addCourse`, `updateCourse` gọi `refreshCourseEmbedding`
- `server/scripts/generateCourseEmbeddings.js`
  - batch re-index embedding
- `client/src/pages/student/CoursesList.jsx`
  - gọi API semantic, render AI Overview, merge kết quả

---

## 14) Luồng tuần tự dễ hình dung (end-to-end)

### 14.1 Khi giáo viên tạo khóa học mới (Add Course)

Luồng trong `server/controllers/educatorControllers.js` (`addCourse`):
1. Nhận dữ liệu course từ form.
2. Normalize dữ liệu học thuật (`courseTopic`, `courseLevel`, `courseTags`, `estimatedDurationHours`).
3. Khởi tạo trường AI:
   - `aiEmbedding = []`
   - `aiEmbeddingModel = ''`
   - `aiEmbeddingUpdatedAt = null`
4. Lưu course vào DB.
5. Populate transcript cho lecture nếu có nguồn transcript.
6. Gọi `refreshCourseEmbedding(newCourse)` để sinh embedding thật.
7. Save lại `aiEmbedding`, `aiEmbeddingModel`, `aiEmbeddingUpdatedAt`.

**Code dẫn chứng từng bước:**

```js
// educatorControllers.js - addCourse
const parseCourseData = await JSON.parse(courseData)
parseCourseData.courseTopic = String(parseCourseData.courseTopic || 'Tổng quát').trim() || 'Tổng quát'
parseCourseData.courseLevel = normalizeCourseLevel(parseCourseData.courseLevel)
parseCourseData.courseTags = normalizeCourseTags(parseCourseData.courseTags)
parseCourseData.estimatedDurationHours = calculateEstimatedDurationHours(parseCourseData.courseContent)
```

```js
// Khởi tạo trường AI trước khi tạo course
parseCourseData.aiEmbedding = []
parseCourseData.aiEmbeddingModel = ''
parseCourseData.aiEmbeddingUpdatedAt = null
const newCourse = await Course.create(parseCourseData)
```

```js
// Bổ sung transcript + sinh embedding thật
const transcriptCount = await populateTranscripts(newCourse.courseContent)
const vector = await refreshCourseEmbedding(newCourse)
console.log(`[Embedding] Updated ${vector.length}-dim embedding for course: ${newCourse.courseTitle}`)
```

**Embedding cái gì?**  
Hệ thống không embed raw JSON toàn bộ, mà embed một **chuỗi ngữ nghĩa tổng hợp** do `buildCourseEmbeddingText(course)` tạo ra, gồm:
- title đã làm sạch,
- topic,
- tags,
- chapterTitle + lectureTitle,
- mô tả ngắn.

Mục tiêu: vector đại diện đúng “nội dung học” thay vì chỉ title/description rời rạc.

```js
// embeddingHelper.js - buildCourseEmbeddingText
const contentTitles = (course.courseContent || [])
  .flatMap(chapter => {
    const chapterTitle = stripHtml(chapter.chapterTitle || '')
    const lectureTitles = (chapter.chapterContent || [])
      .map(lecture => stripHtml(lecture.lectureTitle || ''))
      .filter(Boolean)
    return [chapterTitle, ...lectureTitles].filter(Boolean)
  })
  .join(', ')

const nlTemplate = [
  `${cleanTitle || rawTitle} là khóa học về ${topic}.`,
  tags ? `Các chủ đề then chốt gồm: ${tags}.` : '',
  contentTitles ? `Nội dung giảng dạy tập trung vào: ${contentTitles}.` : '',
  `Mô tả ngắn: ${summary}`
].filter(Boolean).join(' ')
```

### 14.2 Khi giáo viên cập nhật khóa học (Update Course)

Trong `updateCourse`:
1. Cập nhật dữ liệu mới.
2. Reset embedding cũ về rỗng.
3. Save course.
4. Populate transcript (nếu cần).
5. Gọi `refreshCourseEmbedding(course)` để re-embed theo nội dung mới.

=> Search index semantic luôn đồng bộ với nội dung thực tế.

**Code dẫn chứng:**

```js
// educatorControllers.js - updateCourse
course.courseContent = parseCourseData.courseContent || course.courseContent
course.aiEmbedding = []
course.aiEmbeddingModel = ''
course.aiEmbeddingUpdatedAt = null
await course.save()
```

```js
const transcriptCount = await populateTranscripts(course.courseContent)
const vector = await refreshCourseEmbedding(course)
console.log(`[Embedding] Updated ${vector.length}-dim embedding for course: ${course.courseTitle}`)
```

### 14.3 Khi học viên tìm kiếm ở frontend

Luồng `client/src/pages/student/CoursesList.jsx`:
1. User gõ từ khóa trên SearchBar.
2. Frontend có debounce 500ms.
3. Khi hết debounce, gọi `POST /api/course/semantic-overview` với `{ query, limit }`.
4. Nhận response gồm `advice`, `recommendations`, `meta`.
5. Render khối `AI Overview`.
6. Merge danh sách để hiển thị:
   - ưu tiên top AI recommendations,
   - nối với danh sách lọc local và bỏ trùng theo `_id`.

**Code dẫn chứng từng bước:**

```js
// Debounce 500ms
const DEBOUNCE_MS = 500
debounceRef.current = setTimeout(async () => { ... }, DEBOUNCE_MS)
```

```js
// Gọi semantic API
const { data } = await axios.post(`${backendUrl}/api/course/semantic-overview`, {
  query: keyword,
  limit: 5
})
setAiAdvice(data.advice || null)
setAiRecommendations(data.recommendations || [])
setSearchMeta(data.meta || null)
```

```js
// Merge ưu tiên AI recommendation
const aiTop = aiRecommendations.slice(0, 3)
const merged = [...aiTop]
const existingIds = new Set(aiTop.map(course => String(course._id)))
filteredCourse.forEach((course) => {
  const id = String(course._id)
  if (!existingIds.has(id)) merged.push(course)
})
```

### 14.4 Backend xử lý khi nhận semantic-overview

Trong `getSemanticOverview` (`courseController.js`):
1. Đọc query + limit.
2. Lấy query embedding từ cache; miss thì generate mới.
3. Song song:
   - gọi Gemini lấy `advice`,
   - lấy danh sách course published kèm `aiEmbedding`.
4. Tính score cho từng course:
   - semantic (cosine),
   - lexical (token weighted),
   - weighted hybrid.
5. Sort theo hybrid score.
6. Lọc bằng adaptive threshold trên semantic score.
7. Trả recommendations + meta cho frontend.

**Code dẫn chứng từng bước:**

```js
// Input
const source = req.method === 'GET' ? req.query : req.body
const query = String(source.query || source.q || '').trim()
const limit = Math.min(10, Math.max(1, Number(source.limit || 6)))
```

```js
// Query embedding cache -> generate
let queryEmbedding = getCachedEmbedding(query)
if (!queryEmbedding) {
  queryEmbedding = await generateQueryEmbeddingVector(query)
  setCachedEmbedding(query, queryEmbedding)
}
```

```js
// Chạy song song advice + lấy course
const [aiAdvice, courses] = await Promise.all([
  callGeminiForAdvice(query),
  Course.find({ isPublished: true })
    .select('courseTitle courseDescription courseThumbnail coursePrice discount educator courseTopic courseLevel courseTags estimatedDurationHours courseContent aiEmbedding')
    .populate({ path: 'educator' })
    .lean()
])
```

```js
// Tính semantic + lexical + hybrid score
const embeddingScore = cosineSimilarity(queryEmbedding, course.aiEmbedding || [])
const lexical = lexicalScore(query, course)
const semanticScore = embeddingScore !== null ? embeddingScore : 0
const weightedScore = (semanticScore * SEMANTIC_WEIGHT) + (lexical * LEXICAL_WEIGHT)
```

```js
// Rank + adaptive threshold + lọc
const ranked = scoredCourses.sort((a, b) => b._score - a._score)
const adaptiveThreshold = computeAdaptiveThreshold(ranked.map(c => c._semanticScore))
const passed = ranked.filter((item) => item._semanticScore >= adaptiveThreshold)
const recommendations = passed.slice(0, limit)
```

```js
// Response
res.json({
  success: true,
  query,
  advice: aiAdvice,
  recommendations,
  meta: {
    totalMatches: passed.length,
    searchMethod: 'hybrid',
    adaptiveThreshold: Number(adaptiveThreshold.toFixed(3)),
    weights: { semantic: SEMANTIC_WEIGHT, lexical: LEXICAL_WEIGHT }
  }
})
```

---

## 15) Exact match ở frontend và lexical ở backend khác nhau thế nào?

### 15.1 Exact match ở frontend có phải chỉ nằm ở frontend không?

**Đúng, trong kiến trúc hiện tại exact match dạng “includes đơn giản” chủ yếu nằm ở frontend** (`matchKeyword` trong `CoursesList.jsx`), dùng để lọc nhanh danh sách local `allCourses`.

Nó là client-side filtering, không phải thuật toán rank chính của semantic API.

### 15.2 Frontend exact match vs backend lexical

1. **Mục tiêu**
   - Frontend exact match: lọc hiển thị nhanh theo từ khóa user.
   - Backend lexical: tạo **thành phần điểm số** trong mô hình hybrid ranking.

2. **Phạm vi dữ liệu**
   - Frontend: chạy trên `allCourses` đang có trong state client.
   - Backend: chạy trên tập course truy vấn từ DB trong request semantic-overview.

3. **Cách tính**
   - Frontend: boolean `includes` (match hay không match).
   - Backend lexical: scoring có trọng số theo field + chuẩn hóa [0..1].

4. **Ảnh hưởng kết quả**
   - Frontend exact: quyết định item nào lọt qua filter local.
   - Backend lexical: ảnh hưởng thứ hạng recommendation AI (kết hợp semantic score).

5. **Độ “thông minh”**
   - Frontend exact: đơn giản, dễ hiểu, độ chính xác phụ thuộc substring.
   - Backend lexical: giàu tín hiệu hơn (phrase bonus, weight title/topic/tags/description).

Kết luận ngắn: frontend exact là tầng UX/filter; backend lexical là tầng ranking/search intelligence.

---

## 16) 3 câu "tại sao" quan trọng (góc nhìn reviewer)

### 16.1 Tại sao khi embed lại dùng `nlTemplate`?

Vì embedding model hoạt động tốt hơn khi đầu vào là **ngôn ngữ tự nhiên có ngữ cảnh**, thay vì chuỗi field rời rạc hoặc raw JSON.

Code cho thấy hệ thống cố tình ghép title/topic/tags/chapter/lecture/summary thành câu:
```js
// embeddingHelper.js
const nlTemplate = [
  `${cleanTitle || rawTitle} là khóa học về ${topic}.`,
  tags ? `Các chủ đề then chốt gồm: ${tags}.` : '',
  contentTitles ? `Nội dung giảng dạy tập trung vào: ${contentTitles}.` : '',
  `Mô tả ngắn: ${summary}`
].filter(Boolean).join(' ')
```

Nếu không dùng template này:
- vector dễ thiếu ngữ cảnh,
- semantic match kém ổn định khi query diễn đạt tự nhiên bằng tiếng Việt.

### 16.2 Tại sao query gửi thêm `limit`?

Vì backend cần biết **số lượng recommendation tối đa** cần trả về cho từng context UI/use-case.

Code dẫn chứng:
```js
// CoursesList.jsx
await axios.post(`${backendUrl}/api/course/semantic-overview`, {
  query: keyword,
  limit: 5
})
```

```js
// courseController.js
const limit = Math.min(10, Math.max(1, Number(source.limit || 6)))
const recommendations = passed.slice(0, limit)
```

Ý nghĩa kỹ thuật:
- tránh trả quá nhiều dữ liệu không cần thiết,
- giảm payload + render cost,
- cho frontend linh hoạt điều chỉnh số item theo layout.

### 16.3 Tại sao input lấy từ cả `query` hoặc `body`?

Vì endpoint hỗ trợ cả GET và POST để linh hoạt cho nhiều client:
- GET tiện debug/manual test, chia sẻ link,
- POST tiện gửi payload giàu hơn trong tương lai.

Code dẫn chứng:
```js
// courseRoute.js
courseRouter.get('/semantic-overview', getSemanticOverview)
courseRouter.post('/semantic-overview', getSemanticOverview)
```

```js
// courseController.js
const source = req.method === 'GET' ? req.query : req.body
const query = String(source.query || source.q || '').trim()
```

Khi dùng kiểu này, 1 controller xử lý được cả 2 kiểu request, giảm duplicate code.

---

## 17) Bộ câu hỏi kiểm tra hiểu bản chất (chi tiết cho người mới)

> Cách dùng mục này khi tự học:  
> Mỗi câu hãy trả lời theo 3 lớp: **(1) mục tiêu**, **(2) cơ chế code**, **(3) trade-off**.  
> Nếu thiếu 1 trong 3 lớp thì coi như chưa hiểu sâu.

### Q1. Vì sao không chỉ dùng lexical search?
**Đáp án mẫu đầy đủ:**
- **Mục tiêu:** lexical tốt khi người dùng gõ đúng từ khóa có trong title/tag, nhưng dễ hụt khi người dùng diễn đạt theo nghĩa tương đương.
- **Cơ chế code:** backend có `lexicalScore(query, course)` nhưng vẫn kết hợp semantic trong `_score = semantic*0.75 + lexical*0.25`.
- **Bản chất:** lexical là “khớp chữ”, semantic là “khớp nghĩa”.
- **Trade-off:** chỉ lexical => precision có thể tốt với exact keyword, nhưng recall kém trong truy vấn tự nhiên.
**Dấu hiệu trả lời chưa đạt:** chỉ nói “semantic thông minh hơn” mà không chỉ ra cách kết hợp trọng số trong code.

### Q2. Vì sao không chỉ dùng semantic score?
**Đáp án mẫu đầy đủ:**
- **Mục tiêu:** semantic giúp hiểu ý, nhưng đôi lúc xếp cao các course “gần nghĩa” mà không chứa từ khóa người dùng đang ưu tiên.
- **Cơ chế code:** `lexicalScore` cộng thêm tín hiệu từ title/topic/tags/description để kéo kết quả về đúng intent keyword.
- **Ví dụ dễ hiểu:** user gõ “python cơ bản”; semantic có thể đẩy course “Data Science nhập môn” lên cao vì gần nghĩa, lexical giúp ưu tiên course có từ “python”.
- **Trade-off:** chỉ semantic => dễ “lệch từ khóa cụ thể”.
**Dấu hiệu chưa đạt:** không phân biệt “khớp nghĩa rộng” và “khớp yêu cầu cụ thể”.

### Q3. Tại sao phải normalize lexical về [0..1]?
**Đáp án mẫu đầy đủ:**
- **Mục tiêu:** cộng lexical với semantic một cách công bằng.
- **Cơ chế code:** lexical có điểm thô từ nhiều rule; code chia theo `maxPossible` rồi clamp về [0..1].
- **Bản chất:** nếu không normalize, lexical có thể lớn hơn semantic nhiều lần và phá cân bằng trọng số.
- **Trade-off:** normalize giúp ổn định nhưng làm mất một phần “độ phân tách tuyệt đối” của điểm thô.
**Dấu hiệu chưa đạt:** trả lời “để đẹp số” thay vì nói về cân bằng scale.

### Q4. Vì sao dùng adaptive threshold thay vì ngưỡng cố định?
**Đáp án mẫu đầy đủ:**
- **Mục tiêu:** mỗi query có mức “dễ khớp” khác nhau.
- **Cơ chế code:** `adaptiveThreshold = max(RELEVANCE_FLOOR, topSemantic*0.6)`.
- **Bản chất:** threshold tự co giãn theo chất lượng top match của chính query hiện tại.
- **Trade-off:** linh hoạt hơn fixed threshold nhưng khó debug hơn nếu không log đủ.
**Dấu hiệu chưa đạt:** không nhắc đến vai trò `RELEVANCE_FLOOR`.

### Q5. Nếu sửa chapterTitle/lectureTitle mà chưa re-embed thì sao?
**Đáp án mẫu đầy đủ:**
- **Mục tiêu:** embedding phải phản ánh nội dung mới nhất.
- **Cơ chế code:** `buildCourseEmbeddingText` lấy chapterTitle/lectureTitle; nếu text đổi mà vector không cập nhật thì vector cũ vẫn đại diện nội dung cũ.
- **Hệ quả:** search semantic trả kết quả lệch, khó hiểu cho user.
- **Cách đúng:** `updateCourse` reset embedding rồi `refreshCourseEmbedding(course)`.
**Dấu hiệu chưa đạt:** chỉ nói “kết quả sai” mà không nêu vì sao sai ở tầng vector.

### Q6. Vai trò script `embed:courses` khi đã có refresh lúc add/update?
**Đáp án mẫu đầy đủ:**
- **Mục tiêu:** xử lý dữ liệu cũ hoặc migration model.
- **Cơ chế code:** script quét course chưa có embedding hoặc embedding model cũ (`aiEmbeddingModel !== EMBEDDING_MODEL_NAME`) rồi re-index hàng loạt.
- **Khi dùng thực tế:** đổi model embedding, import dữ liệu legacy, hoặc nghi ngờ index bị thiếu.
- **Trade-off:** chạy batch tốn thời gian/CPU nhưng đảm bảo nhất quán toàn hệ thống.
**Dấu hiệu chưa đạt:** nghĩ rằng script là dư thừa.

### Q7. Vì sao cache query embedding có TTL + max size?
**Đáp án mẫu đầy đủ:**
- **Mục tiêu:** giảm latency cho query lặp lại mà không phình RAM vô hạn.
- **Cơ chế code:** `CACHE_MAX=200`, `CACHE_TTL_MS=30m`, cache kiểu LRU bằng `Map`.
- **Bản chất:** TTL giải quyết dữ liệu cũ; max size giải quyết giới hạn bộ nhớ.
- **Trade-off:** cache hit tăng tốc nhưng có thể dùng vector cũ trong thời gian TTL.
**Dấu hiệu chưa đạt:** chỉ nói “để nhanh hơn” mà bỏ qua memory control.

### Q8. Khi nào `_embeddingScore` có thể `null`?
**Đáp án mẫu đầy đủ:**
- **Trong code cosineSimilarity sẽ trả null khi:**  
  1) không phải mảng, 2) mảng rỗng, 3) lệch chiều vector, 4) zero-vector.
- **Hệ quả trong scoring:** semanticScore fallback về 0.
- **Ý nghĩa debug:** cần kiểm tra pipeline tạo embedding, model consistency, dữ liệu course cũ.
**Dấu hiệu chưa đạt:** trả lời chung chung “lỗi model”.

### Q9. Tại sao advice AI không tham gia ranking score?
**Đáp án mẫu đầy đủ:**
- **Mục tiêu kiến trúc:** tách “xếp hạng” và “nội dung sinh ngôn ngữ”.
- **Lý do:** ranking cần deterministic/dễ tái lập; advice là generative, biến động theo model/load.
- **Lợi ích:** dễ debug chất lượng search, không để text AI làm nhiễu thứ hạng.
- **Trade-off:** advice hay nhưng không trực tiếp cải thiện ranking nếu score pipeline chưa tốt.
**Dấu hiệu chưa đạt:** trả lời “để đơn giản hơn” mà không nói deterministic.

### Q10. Muốn ưu tiên keyword hơn thì chỉnh ở đâu?
**Đáp án mẫu đầy đủ:**
- **Điểm chỉnh chính:** `SEMANTIC_WEIGHT`, `LEXICAL_WEIGHT`.
- **Điểm chỉnh phụ:** trọng số trong `lexicalScore` (title/topic/tags/description).
- **Cách làm an toàn:** giảm dần semantic (ví dụ 0.75 -> 0.65), đo lại top-k.
- **Rủi ro:** tăng lexical quá mạnh sẽ làm hệ thống quay lại “search kiểu keyword truyền thống”.
**Dấu hiệu chưa đạt:** nói chung chung “chỉnh thuật toán”.

### Q11. Vì sao không embed trực tiếp raw JSON course?
**Đáp án mẫu đầy đủ:**
- **Mục tiêu:** embedding model text cần input ngôn ngữ tự nhiên.
- **Vấn đề raw JSON:** nhiều token kỹ thuật (`{}`, key name, dấu câu) không mang nghĩa học thuật.
- **Giải pháp code:** `nlTemplate` biến dữ liệu thành câu có ngữ cảnh.
- **Kết quả:** vector ổn định hơn, semantic match tốt hơn với query tự nhiên.
**Dấu hiệu chưa đạt:** không phân biệt “data format” và “semantic signal”.

### Q12. Vì sao `limit` bị chặn [1..10]?
**Đáp án mẫu đầy đủ:**
- **Mục tiêu:** bảo vệ hiệu năng API và frontend.
- **Cơ chế code:** `Math.min(10, Math.max(1, Number(source.limit || 6)))`.
- **Bản chất:** guardrail chống request bất thường (0, âm, quá lớn).
- **Trade-off:** giảm linh hoạt cực đoan để đổi lấy ổn định hệ thống.
**Dấu hiệu chưa đạt:** chỉ nói “để giới hạn”.

### Q13. Vì sao hỗ trợ cả `source.query` và `source.q`?
**Đáp án mẫu đầy đủ:**
- **Mục tiêu:** tương thích nhiều client/convention.
- **Bản chất:** `query` là tên rõ nghĩa; `q` là convention phổ biến trong search API.
- **Lợi ích:** giảm lỗi tích hợp khi có client cũ hoặc công cụ test gửi `q`.
**Dấu hiệu chưa đạt:** không nhìn ra yếu tố backward compatibility.

### Q14. Vì sao vẫn cần exact filter ở frontend?
**Đáp án mẫu đầy đủ:**
- **Mục tiêu UX:** phản hồi tức thì và giữ bộ lọc local (giá/chủ đề/trình độ/thời lượng).
- **Bản chất:** frontend exact filter là lớp trình bày; backend semantic là lớp gợi ý thông minh.
- **Code liên quan:** `matchKeyword` + bộ lọc local + merge với `aiRecommendations`.
- **Trade-off:** có hai lớp logic nên phải đồng bộ để tránh user thấy “kết quả lạ”.
**Dấu hiệu chưa đạt:** nghĩ frontend filter là “trùng hoàn toàn” với backend lexical.

### Q15. Vì sao dùng `Promise.all` cho advice và query course?
**Đáp án mẫu đầy đủ:**
- **Mục tiêu:** giảm tổng thời gian chờ.
- **Bản chất:** hai tác vụ độc lập, không cần đợi nhau.
- **Hiệu quả:** latency tổng gần bằng tác vụ chậm nhất, thay vì cộng dồn tuần tự.
- **Trade-off:** cần xử lý lỗi rõ ràng để không khó debug khi 1 nhánh fail.
**Dấu hiệu chưa đạt:** không phân biệt “song song I/O” với “song song CPU”.

### Q16. Vì sao lọc theo `_semanticScore` thay vì `_score`?
**Đáp án mẫu đầy đủ:**
- **Mục tiêu chất lượng:** giữ ngưỡng liên quan ngữ nghĩa tối thiểu.
- **Lý do:** `_score` có lexical; course có lexical cao nhưng semantic thấp vẫn có thể lọt nếu lọc theo `_score`.
- **Thiết kế hiện tại:** lexical dùng để re-rank trong nhóm đã đủ ngữ nghĩa.
- **Trade-off:** có thể bỏ sót course match keyword mạnh nhưng semantic thấp (đây là quyết định sản phẩm).
**Dấu hiệu chưa đạt:** không nhìn ra vai trò “semantic gate”.

### Q17. Tại sao frontend gửi `limit: 5` nhưng UI chỉ render top 3 card?
**Đáp án mẫu đầy đủ:**
- **Mục tiêu:** lấy dư một chút để có dữ liệu cho merge/ranking ổn định, nhưng UI overview giữ gọn.
- **Code liên quan:** API gửi `limit: 5`; card overview dùng `aiRecommendations.slice(0, 3)`.
- **Lợi ích:** phần list tổng hợp vẫn tận dụng thêm recommendation sau khi dedupe.
- **Trade-off:** payload tăng nhẹ để đổi lấy linh hoạt hiển thị.
**Dấu hiệu chưa đạt:** cho rằng đây là bug ngay lập tức.

### Q18. Tại sao trong `getSemanticOverview` query rỗng lại trả thành công với mảng rỗng thay vì 4xx?
**Đáp án mẫu đầy đủ:**
- **Mục tiêu UX/API:** query rỗng là trạng thái hợp lệ của màn hình search.
- **Thiết kế:** trả `success: true` + `recommendations: []` để frontend render nhẹ nhàng, không coi là lỗi hệ thống.
- **Trade-off:** API “tolerant” hơn nhưng cần client tự hiểu rỗng không phải lỗi.
**Dấu hiệu chưa đạt:** nhầm giữa “invalid request” và “valid but empty state”.

### Q19. Tại sao cần `populate({ path: 'educator' })` trong semantic-overview?
**Đáp án mẫu đầy đủ:**
- **Mục tiêu:** frontend card/course list cần thông tin giảng viên ngay trong cùng response.
- **Trade-off:** tăng chi phí query một chút nhưng giảm số lần gọi API phụ.
- **Góc tối ưu:** nếu performance căng, có thể chỉ select field educator tối thiểu.
**Dấu hiệu chưa đạt:** nói “để lấy đủ data” mà không nêu tác động hiệu năng.

### Q20. Nếu muốn chứng minh “tự code và hiểu thật”, bạn nên trình bày ra sao?
**Đáp án mẫu đầy đủ (khung trả lời khi đi vấn đáp):**
1. **Nêu luồng 20 giây:** add/update course -> refresh embedding -> search query -> hybrid score -> threshold -> response.
2. **Chỉ đúng 3 điểm code quan trọng:** `buildCourseEmbeddingText`, `getSemanticOverview`, `lexicalScore`.
3. **Nêu 1 trade-off đã chấp nhận:** lọc theo semantic gate có thể bỏ sót keyword mạnh.
4. **Đưa 1 hướng cải tiến có điều kiện:** A/B test trọng số 0.75/0.25 theo từng domain chủ đề.
**Dấu hiệu chưa đạt:** chỉ kể chức năng UI, không đụng tới vector/score/threshold.

---

## 18) Kết luận ngắn

Dự án đang áp dụng semantic search theo hướng thực dụng và cân bằng:  
**Embedding đa ngôn ngữ + cosine similarity + lexical scoring + adaptive threshold + query cache + AI advice song song.**  
Thiết kế này vừa tăng độ thông minh của tìm kiếm, vừa giữ được tính kiểm soát và hiệu năng trong môi trường production.

