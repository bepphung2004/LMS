import express from 'express'
import { requireAuth } from '../middlewares/authMiddleware.js'
import {
   chatWithAI,
   summarizeLesson,
   generateQuiz,
   generateFinalExam,
   generateCourseDescription,
   checkAIStatus
} from '../controllers/aiController.js'

const aiRouter = express.Router()


aiRouter.get('/status', checkAIStatus)

aiRouter.post('/chat', requireAuth, chatWithAI)

aiRouter.post('/summarize', requireAuth, summarizeLesson)

aiRouter.post('/generate-quiz', requireAuth, generateQuiz)

aiRouter.post('/generate-final-exam', requireAuth, generateFinalExam)

aiRouter.post('/generate-description', requireAuth, generateCourseDescription)

export default aiRouter
