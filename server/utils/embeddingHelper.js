import { pipeline, env } from '@xenova/transformers'

export const EMBEDDING_MODEL_NAME = 'Xenova/paraphrase-multilingual-MiniLM-L12-v2'

env.allowLocalModels = false
env.useBrowserCache = false

let extractorPromise = null

const stripHtml = (html = '') => String(html).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()

export const buildCourseEmbeddingText = (course = {}) => {
  const rawTitle = course.courseTitle || ''
  const cleanTitle = rawTitle.replace(/Lập trình|Khóa học|Cơ bản|Nâng cao/gi, '').replace(/\s+/g, ' ').trim()
  const topic = course.courseTopic || ''
  const tags = Array.isArray(course.courseTags) ? course.courseTags.join(', ') : ''

  const contentTitles = (course.courseContent || [])
    .flatMap(chapter => {
      const chapterTitle = stripHtml(chapter.chapterTitle || '')
      const lectureTitles = (chapter.chapterContent || [])
        .map(lecture => stripHtml(lecture.lectureTitle || ''))
        .filter(Boolean)
      return [chapterTitle, ...lectureTitles].filter(Boolean)
    })
    .filter(Boolean)
    .join(', ')
  
  const summary = stripHtml(course.courseDescription || '').substring(0, 200)

  const nlTemplate = [
    `${cleanTitle || rawTitle} là khóa học về ${topic}.`,
    tags ? `Các chủ đề then chốt gồm: ${tags}.` : '',
    contentTitles ? `Nội dung giảng dạy tập trung vào: ${contentTitles}.` : '',
    `Mô tả ngắn: ${summary}`
  ].filter(Boolean).join(' ')

  return nlTemplate
}

export const getEmbeddingExtractor = async () => {
  if (!extractorPromise) {
    extractorPromise = pipeline('feature-extraction', EMBEDDING_MODEL_NAME)
  }

  return extractorPromise
}

export const generateCourseEmbeddingVector = async (course = {}, extractor) => {
  const activeExtractor = extractor || await getEmbeddingExtractor()
  const text = buildCourseEmbeddingText(course)
  const output = await activeExtractor(text, {
    pooling: 'mean',
    normalize: true
  })

  return Array.from(output.data, (value) => Number(value))
}


export const generateQueryEmbeddingVector = async (queryText, extractor) => {
  const activeExtractor = extractor || await getEmbeddingExtractor()
  const cleanQuery = String(queryText || '').trim()

  if (!cleanQuery) return []

  const output = await activeExtractor(cleanQuery, {
    pooling: 'mean',
    normalize: true
  })

  return Array.from(output.data, (value) => Number(value))
}

export const refreshCourseEmbedding = async (courseDoc, extractor) => {
  if (!courseDoc) {
    throw new Error('courseDoc is required to refresh embedding')
  }

  const vector = await generateCourseEmbeddingVector(courseDoc, extractor)
  courseDoc.aiEmbedding = vector
  courseDoc.aiEmbeddingModel = EMBEDDING_MODEL_NAME
  courseDoc.aiEmbeddingUpdatedAt = new Date()
  await courseDoc.save()

  return vector
}
