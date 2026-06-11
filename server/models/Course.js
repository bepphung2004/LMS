import mongoose from 'mongoose'

const lectureSchema = new mongoose.Schema({
  lectureId: { type: String, required: true },
  lectureTitle: { type: String, required: true },
  lectureDuration: { type: Number, required: true },
  lectureUrl: { type: String, required: true },
  lectureContent: { type: String, default: '' },
  isPreviewFree: { type: Boolean, default: true },
  lectureOrder: { type: Number, required: true },
  lectureQuiz: { type: Array, default: [] },
  isQuizPublished: { type: Boolean, default: false }
}, {_id: false})

const chapterSchema = new mongoose.Schema({
  chapterId: { type: String, required: true },
  chapterOrder: { type: Number, required: true },
  chapterTitle: { type: String, required: true },
  chapterContent: [lectureSchema],
}, {_id: false})

const courseSchema = new mongoose.Schema({
  courseTitle: { type: String, required: true },
  courseDescription: { type: String, required: true },
  courseTopic: { type: String, default: 'Tổng quát' },
  courseLevel: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'all-levels'],
    default: 'beginner'
  },
  courseTags: [{ type: String }],
  estimatedDurationHours: { type: Number, default: 0, min: 0 },
  aiEmbedding: [{ type: Number }],
  aiEmbeddingModel: { type: String, default: '' },
  aiEmbeddingUpdatedAt: { type: Date, default: null },
  courseThumbnail: { type: String },
  coursePrice: { type: Number, required: true },
  isPublished: { type: Boolean, default: true },
  discount: { type: Number, required: true, min: 0, max: 100},
  courseContent: [chapterSchema],
  courseRatings: [
    { userId: { type: String }, rating: { type: Number, min: 1, max: 5 } }
  ],
  educator: { type: String, ref: 'User', required: true },
  enrolledStudents: [
    { type: String, ref: 'User' }
  ],
  finalExam: {
    requiredScorePercent: { type: Number, default: 70, min: 0, max: 100 },
    isPublished: { type: Boolean, default: false },
    questions: [
      {
        question: { type: String, required: true },
        options: [{ type: String, required: true }],
        correctAnswer: { type: Number, required: true },
        explanation: { type: String, default: '' }
      }
    ]
  }
}, { timestamps: true, minimize: false })

const Course = mongoose.model('Course', courseSchema)

export default Course
