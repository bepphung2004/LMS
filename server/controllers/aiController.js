import Course from '../models/Course.js'
import User from '../models/User.js'
import {
  AI_BUSY_MESSAGE
} from '../utils/genaiHelper.js'
import { callGeminiWithFallback } from '../utils/geminiCallHelper.js'

const checkCourseAccess = async (userId, courseId) => {
  if (!courseId) return false
  const user = await User.findById(userId)
  if (!user) return false
  if (user.enrolledCourses && user.enrolledCourses.map(id => id.toString()).includes(courseId.toString())) {
    return true
  }
  if (user.role === 'educator' || user.role === 'admin' || user.isEducator) {
    return true
  }
  return false
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

const callGemini = async (prompt, systemPrompt = '') => {
  return callGeminiWithFallback({
    apiKey: GEMINI_API_KEY,
    prompt,
    systemPrompt,
    logPrefix: 'AI'
  })
}


const callAI = callGemini

const parseJSONFromAI = (rawText) => {
  const cleaned = rawText.replace(/```json\n?|```/g, '').trim()
  return JSON.parse(cleaned)
}

const isBusyAIError = (error) => String(error?.message || '') === AI_BUSY_MESSAGE

const stripHtmlTags = (html = '') => html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

const sanitizePlainText = (text = '') => {
  return String(text)
    .replace(/```(?:json|html|markdown)?\n?/gi, '')
    .replace(/```/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/[*_~`#]/g, '')
    .replace(/^\s*[-•]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim()
}


const findLecture = (course, chapterIndex, lectureIndex) => {
  const chapter = course?.courseContent?.[chapterIndex]
  if (!chapter) return null
  const lecture = chapter.chapterContent?.[lectureIndex]
  if (!lecture) return null
  return { chapter, lecture }
}


const findLectureById = (course, lectureId) => {
  if (!lectureId || !course?.courseContent) return null
  for (let ci = 0; ci < course.courseContent.length; ci++) {
    const chapter = course.courseContent[ci]
    if (!Array.isArray(chapter.chapterContent)) continue
    for (let li = 0; li < chapter.chapterContent.length; li++) {
      if (chapter.chapterContent[li].lectureId === lectureId) {
        return {
          chapter,
          lecture: chapter.chapterContent[li],
          chapterIndex: ci,
          lectureIndex: li
        }
      }
    }
  }
  return null
}


const buildLectureContext = (lecture, chapter, course) => {
  const parts = [
    `Khóa học: ${course.courseTitle}`,
    `Chương: ${chapter.chapterTitle}`,
    `Bài: ${lecture.lectureTitle}`
  ]

  const transcript = (lecture.lectureContent || '').trim()
  if (transcript) {
    parts.push(`\nNỘI DUNG VĂN BẢN THỰC TẾ CỦA BÀI HỌC:\n${transcript}`)
  } else {
    const courseDescription = stripHtmlTags(course.courseDescription || '').trim()
    parts.push('\n(Bài học này chưa có transcript.)')
    parts.push(`MÔ TẢ KHÓA HỌC (ngữ cảnh dự phòng): ${courseDescription || 'Không có mô tả khóa học.'}`)
    parts.push('Hãy trả lời dựa trên ngữ cảnh tổng quát của khóa học và nêu rõ đây là suy luận tổng quát.')
  }

  return parts.join('\n')
}

const buildFallbackDescription = ({ courseTitle, topics, targetAudience, courseLevel }) => {
  const topicsList = (topics || '')
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)
    .slice(0, 5)

  const topicSentence = topicsList.length
    ? `Các nội dung trọng tâm gồm ${topicsList.join(', ')}.`
    : 'Nội dung tập trung vào kiến thức nền tảng, kỹ năng thực hành và cách áp dụng vào dự án thực tế.'

  return `${courseTitle} là khóa học được thiết kế thực tế và dễ tiếp cận, giúp học viên nắm chắc kiến thức cốt lõi để áp dụng ngay vào công việc. ${topicSentence} ${targetAudience ? `Khóa học phù hợp cho ${targetAudience}.` : 'Khóa học phù hợp cho sinh viên IT và người mới đi làm muốn xây nền tảng vững chắc.'} ${courseLevel ? `Mức độ phù hợp: ${courseLevel}.` : ''} Sau khi hoàn thành, học viên có thể tự tin triển khai sản phẩm chất lượng, làm việc nhóm hiệu quả và phát triển lộ trình nghề nghiệp rõ ràng.`.trim()
}


export const chatWithAI = async (req, res) => {
  try {
    const { message, courseId, lectureId, lessonContext } = req.body
    const userId = req.auth.userId

    if (!courseId) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin khóa học' })
    }

    const hasAccess = await checkCourseAccess(userId, courseId)
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập khóa học này' })
    }

    if (!message) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập câu hỏi' })
    }

    let contextInfo = ''
    if (courseId) {
      const course = await Course.findById(courseId)
      if (course) {
        const found = lectureId ? findLectureById(course, lectureId) : null

        if (found) {
          contextInfo = buildLectureContext(found.lecture, found.chapter, course)
        } else {
          const fallbackDescription = stripHtmlTags(course.courseDescription || '').trim()
          contextInfo = `
Bối cảnh: Học viên đang học khóa "${course.courseTitle}".
Mô tả khóa học (ngữ cảnh dự phòng): ${fallbackDescription || 'Không có mô tả khóa học.'}
${lessonContext ? `Bài học hiện tại: ${lessonContext}` : ''}`
        }
      }
    }

    const systemPrompt = `Bạn là trợ lý học tập AI trong hệ thống e-learning.
Nhiệm vụ của bạn:
- Trả lời câu hỏi dựa trên NỘI DUNG THỰC TẾ của bài học (nếu có transcript bên dưới)
- Giải thích khái niệm một cách dễ hiểu
- Đưa ra ví dụ minh họa
- Hướng dẫn thực hành
- Khuyến khích và động viên học viên

${contextInfo}

Trả lời bằng tiếng Việt, ngắn gọn nhưng đầy đủ thông tin.`

    const aiResponse = await callAI(message, systemPrompt)

    res.json({ 
      success: true, 
      response: aiResponse 
    })
  } catch (error) {
    console.error('AI Chat Error:', error)
    if (isBusyAIError(error)) {
      return res.status(429).json({
        success: false,
        message: AI_BUSY_MESSAGE
      })
    }
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Lỗi khi xử lý yêu cầu AI'
    })
  }
}

export const summarizeLesson = async (req, res) => {
  try {
    const { courseId, chapterIndex, lectureIndex, lectureId } = req.body
    const userId = req.auth.userId

    if (!courseId) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin khóa học' })
    }

    const hasAccess = await checkCourseAccess(userId, courseId)
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập khóa học này' })
    }

    const course = await Course.findById(courseId)
    if (!course) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khóa học' })
    }

    let found = lectureId ? findLectureById(course, lectureId) : null
    if (!found) {
      found = findLecture(course, chapterIndex, lectureIndex)
    }
    if (!found) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài học' })
    }

    const { chapter, lecture } = found
    const transcript = (lecture.lectureContent || '').trim()
    const hasTranscript = transcript.length > 0

    const prompt = hasTranscript
      ? `Dựa trên NỘI DUNG VĂN BẢN THỰC TẾ của bài học sau đây, hãy tóm tắt thành các ý chính:

Khóa học: ${course.courseTitle}
Chương: ${chapter.chapterTitle}
Bài: ${lecture.lectureTitle}

NỘI DUNG BÀI HỌC:
${transcript}

Hãy tóm tắt thành:
1. Các khái niệm chính (3-5 ý)
2. Những điểm quan trọng cần nhớ
3. Ứng dụng thực tế

Format output dưới dạng markdown với heading và bullet points.`
      : `Tóm tắt nội dung bài học sau thành các ý chính (lưu ý: bài học này chưa có transcript, hãy dựa trên mô tả khóa học và kiến thức tổng quát):

Khóa học: ${course.courseTitle}
Chương: ${chapter.chapterTitle}
Bài: ${lecture.lectureTitle}
Mô tả khóa học (ngữ cảnh dự phòng): ${stripHtmlTags(course.courseDescription || '') || 'Không có mô tả khóa học.'}

Hãy tóm tắt thành:
1. Các khái niệm chính (3-5 ý)
2. Những điểm quan trọng cần nhớ
3. Ứng dụng thực tế

Format output dưới dạng markdown với heading và bullet points.`

    const summary = await callAI(prompt)

    res.json({ 
      success: true, 
      summary,
      lectureTitle: lecture.lectureTitle,
      chapterTitle: chapter.chapterTitle,
      hasTranscript
    })
  } catch (error) {
    console.error('Summarize Error:', error)
    if (isBusyAIError(error)) {
      return res.status(429).json({
        success: false,
        message: AI_BUSY_MESSAGE
      })
    }
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Lỗi khi tóm tắt bài học'
    })
  }
}

export const generateQuiz = async (req, res) => {
  try {
    const { courseId, lectureId, chapterIndex, numberOfQuestions = 5 } = req.body
    const userId = req.auth.userId

    if (!courseId) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin khóa học' })
    }

    const hasAccess = await checkCourseAccess(userId, courseId)
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập khóa học này' })
    }

    const course = await Course.findById(courseId)
    if (!course) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khóa học' })
    }

    let transcript = ''
    let hasTranscript = false
    let promptSubject = ''

    if (lectureId) {
      const found = findLectureById(course, lectureId)
      if (!found) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy bài giảng' })
      }
      const { chapter, lecture } = found
      transcript = (lecture.lectureContent || '').trim()
      hasTranscript = transcript.length > 0
      promptSubject = `Bài học "${lecture.lectureTitle}" thuộc Chương "${chapter.chapterTitle}" trong Khóa học "${course.courseTitle}"`
    } else if (typeof chapterIndex !== 'undefined') {
      const chapter = course.courseContent[chapterIndex]
      if (!chapter) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy chương' })
      }
      const lectureContextParts = chapter.chapterContent.map((lecture, idx) => {
        const trans = (lecture.lectureContent || '').trim()
        if (trans) {
          return `Bài ${idx + 1} - ${lecture.lectureTitle}:\n${trans}`
        }
        return `Bài ${idx + 1} - ${lecture.lectureTitle} (chưa có nội dung chi tiết)`
      })
      transcript = lectureContextParts.join('\n\n')
      hasTranscript = chapter.chapterContent.some(l => (l.lectureContent || '').trim().length > 0)
      promptSubject = `Chương "${chapter.chapterTitle}" trong Khóa học "${course.courseTitle}"`
    } else {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin bài giảng hoặc chương' })
    }

    const contextBlock = hasTranscript
      ? `NỘI DUNG THỰC TẾ:\n${transcript}`
      : `CHƯA CÓ TRANSCRIPT. DÙNG NGỮ CẢNH DỰ PHÒNG:
Mô tả khóa học: ${stripHtmlTags(course.courseDescription || '') || 'Không có mô tả khóa học.'}`

    const prompt = `Tạo ${numberOfQuestions} câu hỏi trắc nghiệm cho: ${promptSubject}

${contextBlock}

Yêu cầu:
- Mỗi câu hỏi có 4 đáp án (không kèm theo bất kỳ tiền tố như A., B., C., D. hay A), B), C), D) nào ở đầu mỗi đáp án)
- Chỉ có 1 đáp án đúng
- ${hasTranscript ? 'Câu hỏi phải dựa trên NỘI DUNG THỰC TẾ được cung cấp ở trên, không bịa đặt nội dung khác' : 'Câu hỏi phải dựa trên mô tả khóa học và ngữ cảnh tổng quát, không bịa chi tiết không có trong dữ liệu'}
- Bao gồm câu hỏi lý thuyết và ứng dụng liên quan mật thiết

Trả về JSON với format:
{
  "questions": [
    {
      "question": "Nội dung câu hỏi",
      "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
      "correctAnswer": 0,
      "explanation": "Giải thích ngắn gọn vì sao đáp án đúng"
    }
  ]
}

Chỉ trả về JSON, không có text khác.`

    const response = await callAI(prompt)
    
    let quiz
    try {
      quiz = parseJSONFromAI(response)
    } catch (parseError) {
      console.error('Quiz parse error:', parseError)
      return res.status(500).json({ 
        success: false, 
        message: 'Lỗi xử lý dữ liệu quiz từ AI'
      })
    }

    res.json({ 
      success: true, 
      quiz: quiz.questions,
      hasTranscript
    })
  } catch (error) {
    console.error('Generate Quiz Error:', error)
    if (isBusyAIError(error)) {
      return res.status(429).json({
        success: false,
        message: AI_BUSY_MESSAGE
      })
    }
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Lỗi khi tạo câu hỏi trắc nghiệm'
    })
  }
}

export const generateFinalExam = async (req, res) => {
  try {
    const { courseId, numberOfQuestions = 10 } = req.body
    const userId = req.auth.userId

    if (!courseId) {
      return res.status(400).json({ success: false, message: 'Thiếu thông tin khóa học' })
    }

    const hasAccess = await checkCourseAccess(userId, courseId)
    if (!hasAccess) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền truy cập khóa học này' })
    }

    const course = await Course.findById(courseId)
    if (!course) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khóa học' })
    }

    const outlineParts = []
    if (Array.isArray(course.courseContent)) {
      course.courseContent.forEach((chapter, cIdx) => {
        outlineParts.push(`Chương ${cIdx + 1}: ${chapter.chapterTitle}`)
        if (Array.isArray(chapter.chapterContent)) {
          chapter.chapterContent.forEach((lecture, lIdx) => {
            outlineParts.push(`  - Bài ${cIdx + 1}.${lIdx + 1}: ${lecture.lectureTitle}`)
          })
        }
      })
    }
    const courseOutline = outlineParts.join('\n')

    const prompt = `Tạo đề thi kết thúc khóa học gồm ${numberOfQuestions} câu hỏi trắc nghiệm tổng hợp cho khóa học sau:

Tên khóa học: ${course.courseTitle}
Chủ đề: ${course.courseTopic || 'Tổng quát'}
Mô tả khóa học: ${stripHtmlTags(course.courseDescription || '') || 'Không có mô tả khóa học.'}

CẤU TRÚC CHƯƠNG TRÌNH HỌC (ĐỂ AI HIỂU PHẠM VI KIẾN THỨC):
${courseOutline}

Yêu cầu:
- Tạo đúng ${numberOfQuestions} câu hỏi trắc nghiệm chất lượng cao. Các câu hỏi phải bao quát toàn bộ nội dung khóa học theo cấu trúc chương trình ở trên.
- Mỗi câu hỏi có đúng 4 đáp án (không kèm theo bất kỳ tiền tố như A., B., C., D. hay A), B), C), D) nào ở đầu mỗi đáp án).
- Chỉ có đúng 1 đáp án đúng.
- Không được sử dụng transcript chi tiết của các bài giảng (vì không được cung cấp), hãy dựa trên tiêu đề bài học, chương học và mô tả khóa học để sinh câu hỏi phù hợp nhất.
- Đảm bảo câu hỏi có mức độ tổng hợp cao, phù hợp làm đề thi tốt nghiệp khóa học.

Trả về JSON với format:
{
  "questions": [
    {
      "question": "Nội dung câu hỏi",
      "options": ["Đáp án A", "Đáp án B", "Đáp án C", "Đáp án D"],
      "correctAnswer": 0,
      "explanation": "Giải thích ngắn gọn vì sao đáp án đúng"
    }
  ]
}

Chỉ trả về JSON, không có text khác.`

    const response = await callAI(prompt)
    
    let exam
    try {
      exam = parseJSONFromAI(response)
    } catch (parseError) {
      console.error('Final exam parse error:', parseError)
      return res.status(500).json({ 
        success: false, 
        message: 'Lỗi xử lý dữ liệu đề thi tốt nghiệp từ AI'
      })
    }

    res.json({ 
      success: true, 
      questions: exam.questions
    })
  } catch (error) {
    console.error('Generate Final Exam Error:', error)
    if (isBusyAIError(error)) {
      return res.status(429).json({
        success: false,
        message: AI_BUSY_MESSAGE
      })
    }
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Lỗi khi tạo đề thi tốt nghiệp'
    })
  }
}


export const generateCourseDescription = async (req, res) => {
  try {
    const { courseTitle, topics, targetAudience, courseLevel } = req.body

    if (!courseTitle) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập tên khóa học' })
    }

    const prompt = `Bạn là chuyên gia viết nội dung cho nền tảng e-learning.
Nhiệm vụ: tạo mô tả khóa học ngắn gọn, chuyên nghiệp, dễ đọc.

Thông tin khóa học:

Tên khóa học: ${courseTitle}
${topics ? `Các chủ đề chính: ${topics}` : ''}
${targetAudience ? `Đối tượng học viên: ${targetAudience}` : ''}
${courseLevel ? `Trình độ: ${courseLevel}` : ''}

YÊU CẦU NGHIÊM NGẶT:
- Chỉ trả về văn bản thuần (Plain Text), không HTML, không Markdown, không code fence.
- Viết khoảng 120-220 từ, mạch lạc và tự nhiên.
- Nêu rõ lợi ích khi học và kỹ năng đạt được.
- Bắt đầu nội dung ngay, không mở đầu kiểu "Chào bạn", "Tôi sẽ", "Dưới đây là".`

    let aiRaw = ''
    try {
      aiRaw = await callAI(prompt)
    } catch (error) {
      console.warn('[Generate Description] Gemini unavailable, using local fallback:', error.message)
      const description = sanitizePlainText(buildFallbackDescription({ courseTitle, topics, targetAudience, courseLevel }))
      return res.json({
        success: true,
        description
      })
    }

    let description = sanitizePlainText(aiRaw)

    const wordCount = description.split(' ').filter(Boolean).length
    if (wordCount < 70) {
      description = sanitizePlainText(buildFallbackDescription({ courseTitle, topics, targetAudience, courseLevel }))
    }

    res.json({ 
      success: true, 
      description 
    })
  } catch (error) {
    console.error('Generate Description Error:', error)
    if (isBusyAIError(error)) {
      return res.status(429).json({
        success: false,
        message: AI_BUSY_MESSAGE
      })
    }
    res.status(500).json({ 
      success: false, 
      message: error.message || 'Lỗi khi tạo mô tả khóa học'
    })
  }
}

export const checkAIStatus = async (req, res) => {
  try {
    const isAvailable = !!GEMINI_API_KEY
    
    res.json({ 
      success: true, 
      available: isAvailable,
      provider: isAvailable ? 'Google Gemini' : 'None'
    })
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      available: false,
      message: error.message 
    })
  }
}
