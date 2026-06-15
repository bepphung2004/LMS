import User from '../models/User.js'
import { Purchase } from '../models/Purchases.js'
import Stripe from 'stripe'
import Course from '../models/Course.js'
import { CourseProgress } from './../models/CourseProgress.js'

const bannedMessage = 'Tài khoản của bạn đã bị vô hiệu hóa do vi phạm điều khoản người dùng.'

const ensureUserIsActive = async (userId, res) => {
  const user = await User.findById(userId)
  if (!user) {
    res.status(404).json({ success: false, message: 'User not found' })
    return null
  }

  if (user.isBanned) {
    res.status(403).json({ success: false, isBanned: true, message: bannedMessage })
    return null
  }

  return user
}

// Get user data
export const getUserData = async (req, res) => {
  try {
    const userId = req.auth.userId
    const user = await User.findById(userId)

    if (!user) {
      return res.json({ success: false, message: 'User not found' })
    }

    res.json({ success: true, user })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

// Users enrolled courses with lecture links
export const userEnrolledCourses = async (req, res) => {
  try {
    const userId = req.auth.userId
    if (!await ensureUserIsActive(userId, res)) return

    const userData = await User.findById(userId).populate({
      path: 'enrolledCourses',
      populate: {
        path: 'educator',
        select: 'name imageUrl'
      }
    })
    res.json({ success: true, enrolledCourses: userData.enrolledCourses })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

// Purchase a course
export const purchaseCourse = async (req, res) => {
  try {
    const { courseId } = req.body
    const { origin } = req.headers
    const userId = req.auth.userId
    const userData = await ensureUserIsActive(userId, res)
    if (!userData) return

    if (userData.enrolledCourses && userData.enrolledCourses.map(id => id.toString()).includes(courseId.toString())) {
      return res.status(400).json({ success: false, message: 'Bạn đã đăng ký khóa học này rồi' })
    }

    const courseData = await Course.findById(courseId)

    if (!userData || !courseData) {
      return res.json({ success: false, message: 'Invalid user or course' })
    }

    const currency = (process.env.CURRENCY || 'vnd').toLowerCase()
    const discountedAmount = courseData.coursePrice - courseData.coursePrice * courseData.discount / 100
    const isZeroDecimalCurrency = currency === 'vnd'

    const purchaseData = {
      courseId: courseData._id,
      userId,
      amount: isZeroDecimalCurrency ? Math.round(discountedAmount) : Number(discountedAmount.toFixed(2)),
    }

    const newPurchase = await Purchase.create(purchaseData)

    // Stripe Gateway Initialization
    const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY)

    // Create line items to for stripe
    const line_items = [{
      price_data: {
        currency,
        product_data: {
          name: courseData.courseTitle,
        },
        unit_amount: isZeroDecimalCurrency
          ? Math.round(purchaseData.amount)
          : Math.round(purchaseData.amount * 100),
      },
      quantity: 1,
    }]

    const session = await stripeInstance.checkout.sessions.create({
      success_url: `${origin}/loading/my-enrollments`,
      cancel_url: `${origin}`,
      line_items: line_items,
      mode: 'payment',
      metadata: {
        purchaseId: newPurchase._id.toString(),
      }
    })

    res.json({ success: true, session_url: session.url })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

// Update User Course Progress
export const updateUserCourseProgress = async (req, res) => {
  try {
    const userId = req.auth.userId
    const { courseId, lectureId } = req.body
    if (!await ensureUserIsActive(userId, res)) return

    const course = await Course.findById(courseId)
    if (!course) {
      return res.status(404).json({ success: false, message: 'Khóa học không tồn tại' })
    }

    let progressData = await CourseProgress.findOne({ userId, courseId })

    if (progressData) {
      if (!progressData.lectureCompleted.includes(lectureId)) {
        progressData.lectureCompleted.push(lectureId)
      }
    } else {
      progressData = new CourseProgress({
        userId,
        courseId,
        lectureCompleted: [lectureId],
      })
    }

    // Check if they completed all lectures
    let totalLecturesCount = 0
    if (course.courseContent) {
      course.courseContent.forEach(chapter => {
        if (chapter.chapterContent) {
          totalLecturesCount += chapter.chapterContent.length
        }
      })
    }

    const allLecturesDone = progressData.lectureCompleted.length >= totalLecturesCount

    if (allLecturesDone) {
      const hasFinalExam = course.finalExam?.isPublished === true
      if (hasFinalExam) {
        if (progressData.finalExamPassed) {
          progressData.completed = true
        } else {
          progressData.completed = false
        }
      } else {
        progressData.completed = true
      }
    }

    await progressData.save()

    res.json({ 
      success: true, 
      message: 'Course progress updated successfully',
      progressData
    })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

// Submit student final exam
export const submitFinalExam = async (req, res) => {
  try {
    const userId = req.auth.userId
    const { courseId, answers } = req.body
    if (!await ensureUserIsActive(userId, res)) return

    const course = await Course.findById(courseId)
    if (!course) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy khóa học' })
    }

    const finalExam = course.finalExam
    if (!finalExam || !finalExam.isPublished || !finalExam.questions || finalExam.questions.length === 0) {
      return res.status(400).json({ success: false, message: 'Khóa học này không có bài thi hết khóa được xuất bản' })
    }

    let progressData = await CourseProgress.findOne({ userId, courseId })
    if (!progressData) {
      return res.status(400).json({ success: false, message: 'Bạn chưa bắt đầu khóa học này' })
    }

    let totalLecturesCount = 0
    if (course.courseContent) {
      course.courseContent.forEach(chapter => {
        if (chapter.chapterContent) {
          totalLecturesCount += chapter.chapterContent.length
        }
      })
    }

    const allLecturesDone = progressData.lectureCompleted.length >= totalLecturesCount
    if (!allLecturesDone) {
      return res.status(400).json({ 
        success: false, 
        message: `Bạn chưa hoàn thành đầy đủ tất cả bài học. Hãy học đủ ${totalLecturesCount} bài học trước khi thi tốt nghiệp.` 
      })
    }

    const questions = finalExam.questions
    let correctCount = 0
    const scoredQuestionsResult = []

    questions.forEach((q, idx) => {
      const studentAnswer = answers && typeof answers[idx] !== 'undefined' ? answers[idx] : null
      const isCorrect = studentAnswer === q.correctAnswer
      if (isCorrect) {
        correctCount++
      }
      scoredQuestionsResult.push({
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        studentAnswer,
        isCorrect,
        explanation: q.explanation
      })
    })

    const totalQuestions = questions.length
    const scorePercent = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0
    const requiredScorePercent = finalExam.requiredScorePercent || 70
    const passed = scorePercent >= requiredScorePercent

    progressData.finalExamScore = scorePercent
    progressData.finalExamPassed = passed
    if (passed) {
      progressData.completed = true
    }

    await progressData.save()

    res.json({
      success: true,
      message: passed ? 'Chúc mừng! Bạn đã thi đỗ kỳ thi tốt nghiệp khóa học!' : 'Tiếc quá! Bạn chưa đạt điểm số yêu cầu để đỗ kì thi.',
      scorePercent,
      requiredScorePercent,
      passed,
      correctCount,
      totalQuestions,
      results: scoredQuestionsResult
    })

  } catch (error) {
    console.error('Submit final exam error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}


// Get User Course Progress
export const getUserCourseProgress = async (req, res) => {
  try {
    const userId = req.auth.userId
    const { courseId } = req.body
    if (!await ensureUserIsActive(userId, res)) return

    const progressData = await CourseProgress.findOne({ userId, courseId })
    
    res.json({ success: true, progressData })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

// Add user rating to course
export const addUserRating = async (req, res) => {
  const userId = req.auth.userId
  const { courseId, rating } = req.body

  if (!courseId || !userId || !rating || rating < 1 || rating > 5) {
    return res.json({ success: false, message: 'Invalid data provided' })
  }
  try {
    const activeUser = await ensureUserIsActive(userId, res)
    if (!activeUser) return

    const course = await Course.findById(courseId)
    if (!course) {
      return res.json({ success: false, message: 'Course not found' })
    }

    const user = await User.findById(userId)
    if (!user || !user.enrolledCourses.map(c => c.toString()).includes(courseId.toString())) {
      return res.json({ success: false, message: 'User not enrolled in this course' })
    }

    const existingRatingIndex = course.courseRatings.findIndex(r => r.userId === userId)
    if (existingRatingIndex > -1) {
      course.courseRatings[existingRatingIndex].rating = rating
    } else {
      course.courseRatings.push({ userId, rating })
    }
    await course.save()
    res.json({ success: true, message: 'Rating submitted successfully' })

  } catch (error) {
    return res.json({ success: false, message: error.message })
  }
}
