import Course from '../models/Course.js'
import {
  AI_BUSY_MESSAGE
} from '../utils/genaiHelper.js'
import { generateQueryEmbeddingVector } from '../utils/embeddingHelper.js'
import { getCachedEmbedding, setCachedEmbedding } from '../utils/embeddingCache.js'
import { callGeminiWithFallback } from '../utils/geminiCallHelper.js'


const normalizeText = (value = '') => {
  return String(value)
    .replace(/<[^>]*>/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const tokenize = (value = '') => normalizeText(value).split(' ').filter(Boolean)

const computeEstimatedDurationHours = (course = {}) => {
  if (Number(course.estimatedDurationHours) > 0) {
    return Number(course.estimatedDurationHours)
  }

  const totalMinutes = (course.courseContent || []).reduce((chapterTotal, chapter) => {
    const chapterMinutes = (chapter.chapterContent || []).reduce((lectureTotal, lecture) => {
      return lectureTotal + Number(lecture.lectureDuration || 0)
    }, 0)
    return chapterTotal + chapterMinutes
  }, 0)

  return Number((totalMinutes / 60).toFixed(1))
}

const cosineSimilarity = (a = [], b = []) => {
  if (!Array.isArray(a) || !Array.isArray(b)) {
    console.warn('[SemanticSearch] Invalid embedding format. Expected arrays for queryEmbedding and aiEmbedding.')
    return null
  }

  if (a.length === 0 || b.length === 0) {
    console.warn(`[SemanticSearch] Empty embedding detected (queryEmbedding=${a.length}, courseEmbedding=${b.length}).`)
    return null
  }

  if (a.length !== b.length) {
    console.warn(`[SemanticSearch] Embedding dimension mismatch (query=${a.length}, course=${b.length}).`)
    return null
  }

  let dot = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i += 1) {
    const av = Number(a[i] || 0)
    const bv = Number(b[i] || 0)
    dot += av * bv
    normA += av * av
    normB += bv * bv
  }

  if (normA === 0 || normB === 0) {
    console.warn('[SemanticSearch] Zero-vector embedding detected; cosine similarity cannot be computed.')
    return null
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

const lexicalScore = (query = '', course = {}) => {
  const tokens = tokenize(query)
  if (tokens.length === 0) return 0

  const title = normalizeText(course.courseTitle)
  const topic = normalizeText(course.courseTopic)
  const description = normalizeText(course.courseDescription)
  const tags = normalizeText((course.courseTags || []).join(' '))

  let score = 0

  const normalizedQuery = normalizeText(query)
  if (title.includes(normalizedQuery)) score += 5

  tokens.forEach((token) => {
    if (title.includes(token)) score += 3
    if (topic.includes(token)) score += 2.5
    if (tags.includes(token)) score += 2
    if (description.includes(token)) score += 1
  })

  const maxPossible = 5 + tokens.length * (3 + 2.5 + 2 + 1)
  return maxPossible > 0 ? Math.min(1, score / maxPossible) : 0
}


const RELEVANCE_FLOOR = 0.30
const computeAdaptiveThreshold = (semanticScores = []) => {
  if (semanticScores.length === 0) return RELEVANCE_FLOOR
  const topScore = Math.max(...semanticScores)
  return Math.max(RELEVANCE_FLOOR, topScore * 0.6)
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const SEMANTIC_WEIGHT = 0.75
const LEXICAL_WEIGHT = 0.25

const AI_ADVICE_FALLBACK = 'Hiện tại hệ thống AI tư vấn đang bận, bạn hãy tham khảo lộ trình trong các khóa học bên dưới.'

const callGeminiForAdvice = async (query, topCourses) => {
  const hasGeminiApiKey = Boolean(GEMINI_API_KEY)
  console.log(`[AI Advice] GEMINI_API_KEY configured: ${hasGeminiApiKey}`)
  if (!hasGeminiApiKey) {
    return {
      relevantCourseIds: topCourses.map(c => String(c._id)),
      advice: AI_ADVICE_FALLBACK
    }
  }

  try {
    const courseListText = topCourses
      .map(c => `ID: ${c._id}\nTiêu đề: ${c.courseTitle}\nChủ đề: ${c.courseTopic}\nTrình độ: ${c.courseLevel}\nMô tả: ${(c.courseDescription || '').replace(/<[^>]*>/g, ' ').substring(0, 150)}`)
      .join('\n\n')

    const prompt = `Bạn là chuyên gia tư vấn lộ trình học tập tại hệ thống Edemy.
Học viên đang tìm kiếm từ khóa: "${query}"

Dưới đây là danh sách các khóa học ứng viên có trong cơ sở dữ liệu:
${courseListText}

Hãy thực hiện hai nhiệm vụ sau:
Nhiệm vụ 1: Lọc (Filter) và Tái Sắp xếp (Rerank/Sequence):
- Chỉ giữ lại những khóa học trực tiếp hữu ích và liên quan cho từ khóa tìm kiếm "${query}" của học viên.
- Loại bỏ hoàn toàn những khóa học không liên quan hoặc chỉ liên quan rất yếu (Ví dụ: nếu tìm kiếm "xây dựng website", các khóa như Flutter, Kotlin Mobile App là KHÔNG liên quan và phải bị loại bỏ).
- Sắp xếp các khóa học giữ lại theo thứ tự lộ trình học tập khoa học và logic nhất từ dễ đến khó (mức cơ bản/beginner trước, mức nâng cao/advanced sau).

Nhiệm vụ 2: Viết Lời khuyên Lộ trình (Advice):
- Viết 1 đoạn văn ngắn (2-3 câu, tiếng Việt) định hướng và khuyên học viên học theo trình tự các khóa học được chọn ở trên.
- Chỉ đề cập đến các khóa học có trong danh sách được giữ lại ở Nhiệm vụ 1. Tuyệt đối không nhắc đến bất kỳ công nghệ hay khóa học nào ngoài danh sách được chọn.
- Phải giải thích rõ ràng tại sao nên bắt đầu từ khóa cơ bản rồi mới đến khóa nâng cao (Ví dụ: "Nên học khóa ReactJS (cơ bản) trước để làm chủ giao diện, sau đó mới học NodeJS (nâng cao) để tự xây dựng Backend Server...").
- Đi thẳng vào nội dung lời khuyên, không chào hỏi, không dùng Markdown (không in đậm **, không gạch đầu dòng).

BẮT BUỘC TRẢ VỀ KẾT QUẢ DƯỚI DẠNG MỘT ĐỐI TƯỢNG JSON DUY NHẤT theo cấu trúc mẫu sau (không chứa bất kỳ văn bản giải thích nào ngoài khối JSON):
{
  "relevantCourseIds": ["id_khóa_1_dễ", "id_khóa_2_khó_hơn"],
  "advice": "Chuỗi văn bản lời khuyên lộ trình của bạn ở đây..."
}
Nếu không có khóa học nào liên quan đến từ khóa tìm kiếm, hãy trả về:
{
  "relevantCourseIds": [],
  "advice": "Hiện tại hệ thống Edemy chưa có khóa học trực tiếp phù hợp với từ khóa \\"${query}\\". Tuy nhiên, bạn có thể tham khảo một số khóa học liên quan bên dưới để phát triển kỹ năng bổ trợ."
}`

    const text = await callGeminiWithFallback({
      apiKey: GEMINI_API_KEY,
      prompt,
      logPrefix: 'AI Search Advice'
    })

    const cleanText = String(text || '')
      .replace(/^```json\s*/i, '')
      .replace(/```\s*$/, '')
      .trim()

    const parsed = JSON.parse(cleanText)
    if (parsed && Array.isArray(parsed.relevantCourseIds)) {
      return {
        relevantCourseIds: parsed.relevantCourseIds.map(String),
        advice: parsed.advice ? String(parsed.advice).replace(/\*/g, '').trim() : null
      }
    }
  } catch (error) {
    console.warn('[AI Advice] Gemini call or JSON parsing failed:', error.message)
  }

  return {
    relevantCourseIds: topCourses.map(c => String(c._id)),
    advice: AI_ADVICE_FALLBACK
  }
}

const mapCourseForSearch = (course = {}) => ({
  _id: course._id,
  courseTitle: course.courseTitle,
  courseDescription: course.courseDescription,
  courseThumbnail: course.courseThumbnail,
  coursePrice: course.coursePrice,
  discount: course.discount,
  educator: course.educator,
  courseTopic: course.courseTopic || 'Tổng quát',
  courseLevel: course.courseLevel || 'beginner',
  courseTags: Array.isArray(course.courseTags) ? course.courseTags : [],
  courseRatings: Array.isArray(course.courseRatings) ? course.courseRatings : [],
  estimatedDurationHours: computeEstimatedDurationHours(course)
})

export const getAllCourses = async (req, res) => {
  try {
    const courses = await Course.find({ isPublished: true })
      .select(['-courseContent', '-enrolledStudents', '-aiEmbedding'])
      .populate({ path: 'educator' })
      .lean()

    res.json({
      success: true,
      courses: courses.map(mapCourseForSearch)
    })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

export const getSemanticOverview = async (req, res) => {
  try {
    const source = req.method === 'GET' ? req.query : req.body
    const query = String(source.query || source.q || '').trim()
    const limit = Math.min(10, Math.max(1, Number(source.limit || 6)))

    if (!query) {
      return res.json({
        success: true,
        query,
        advice: null,
        recommendations: [],
        meta: { totalMatches: 0, searchMethod: 'none' }
      })
    }

    let queryEmbedding = getCachedEmbedding(query)
    const embeddingCached = queryEmbedding !== null

    if (!queryEmbedding) {
      queryEmbedding = await generateQueryEmbeddingVector(query)
      setCachedEmbedding(query, queryEmbedding)
    }

    const courses = await Course.find({ isPublished: true })
      .select('courseTitle courseDescription courseThumbnail coursePrice discount educator courseTopic courseLevel courseTags estimatedDurationHours courseContent aiEmbedding')
      .populate({ path: 'educator' })
      .lean()

    const scoredCourses = courses
      .map((course) => {
        const embeddingScore = cosineSimilarity(queryEmbedding, course.aiEmbedding || [])
        const lexical = lexicalScore(query, course)
        const semanticScore = embeddingScore !== null ? embeddingScore : 0
        const weightedScore = (semanticScore * SEMANTIC_WEIGHT) + (lexical * LEXICAL_WEIGHT)

        if (embeddingScore === null) {
          console.warn(`[SemanticSearch] embeddingScore=null for courseId=${course._id}. Verify aiEmbedding data/model consistency.`)
        }

        return {
          ...mapCourseForSearch(course),
          _score: weightedScore,
          _semanticScore: semanticScore,
          _embeddingScore: embeddingScore,
          _lexicalScore: lexical
        }
      })

    const ranked = scoredCourses
      .sort((a, b) => b._score - a._score)

    const allSemanticScores = ranked.map(c => c._semanticScore)
    const adaptiveThreshold = computeAdaptiveThreshold(allSemanticScores)

    const passed = ranked.filter((item) => item._semanticScore >= adaptiveThreshold)

    const candidates = passed.slice(0, 6)
    const maxSemanticScore = candidates.length > 0 ? Math.max(...candidates.map(c => c._semanticScore)) : 0
    let aiAdvice = null
    let finalRecommendations = passed

    if (candidates.length > 0) {
      if (maxSemanticScore >= 0.35) {
        const aiResult = await callGeminiForAdvice(query, candidates)
        aiAdvice = aiResult.advice

        if (aiResult.relevantCourseIds && aiResult.relevantCourseIds.length > 0) {
          const idMap = new Map(aiResult.relevantCourseIds.map((id, index) => [String(id), index]))
          
          // Filter passed courses to only those returned by Gemini and sort by Gemini's preferred order
          const filteredPassed = passed
            .filter(c => idMap.has(String(c._id)))
            .sort((a, b) => idMap.get(String(a._id)) - idMap.get(String(b._id)))

          finalRecommendations = filteredPassed
        } else {
          finalRecommendations = []
        }
      } else {
        // Fallback message for weak matches to avoid Gemini hallucinating mismatching advice
        aiAdvice = `Hiện tại hệ thống Edemy chưa có khóa học trực tiếp về "${query}". Tuy nhiên, bạn có thể tham khảo một số khóa học liên quan bên dưới để phát triển kỹ năng bổ trợ.`
        finalRecommendations = passed
      }
    } else {
      finalRecommendations = []
    }

    const recommendations = finalRecommendations
      .slice(0, limit)
      .map(({ _semanticScore, _embeddingScore, _lexicalScore, ...item }) => item)

    const relatedTopics = [...new Set(finalRecommendations.map(c => c.courseTopic).filter(Boolean))]

    res.json({
      success: true,
      query,
      advice: aiAdvice,
      recommendations,
      meta: {
        totalMatches: recommendations.length,
        searchMethod: 'llm-reranked',
        adaptiveThreshold: Number(adaptiveThreshold.toFixed(3)),
        weights: { semantic: SEMANTIC_WEIGHT, lexical: LEXICAL_WEIGHT },
        relatedTopics,
        embeddingCached
      }
    })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

export const getCourseId = async (req, res) => {
  const { id } = req.params

  try {
    const courseData = await Course.findById(id).populate({ path: 'educator' })

    courseData.courseContent.forEach(chapter => {
      chapter.chapterContent.forEach(lecture => {
        if (!lecture.isPreviewFree) {
          lecture.lectureUrl = ''
        }
      })
    })

    res.json({ success: true, courseData })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

