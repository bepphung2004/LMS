import { clerkClient } from '@clerk/express'
import { v2 as cloudinary } from 'cloudinary'
import fs from 'node:fs/promises'
import path from 'node:path'
import Course from '../models/Course.js'
import { Purchase } from '../models/Purchases.js'
import User from '../models/User.js'
import EducatorApplication from '../models/EducatorApplication.js'
import { assertCloudinaryConfigured } from '../configs/cloudinary.js'
import { populateTranscripts } from '../utils/transcriptHelper.js'
import { refreshCourseEmbedding } from '../utils/embeddingHelper.js'

const normalizeCourseLevel = (level = '') => {
  const normalized = String(level).trim().toLowerCase()
  const allowed = ['beginner', 'intermediate', 'advanced', 'all-levels']
  return allowed.includes(normalized) ? normalized : 'beginner'
}

const normalizeCourseTags = (tags) => {
  if (Array.isArray(tags)) {
    return tags
      .map(tag => String(tag).trim())
      .filter(Boolean)
      .slice(0, 12)
  }

  if (typeof tags === 'string') {
    return tags
      .split(',')
      .map(tag => tag.trim())
      .filter(Boolean)
      .slice(0, 12)
  }

  return []
}

const calculateEstimatedDurationHours = (courseContent = []) => {
  const totalMinutes = (courseContent || []).reduce((chapterTotal, chapter) => {
    const chapterMinutes = (chapter.chapterContent || []).reduce((lectureTotal, lecture) => {
      return lectureTotal + Number(lecture.lectureDuration || 0)
    }, 0)
    return chapterTotal + chapterMinutes
  }, 0)

  return Number((totalMinutes / 60).toFixed(1))
}

// Submit educator application (instead of direct role update)
export const submitEducatorApplication = async (req, res) => {
  try {
    const userId = req.auth.userId
    const {
      fullName,
      email,
      phone,
      expertise,
      experience,
      qualification,
      linkedinUrl,
      portfolioUrl,
      courseTopics,
      teachingApproach,
      sampleVideoUrl
    } = req.body

    // Check if user already has a pending application
    const existingApplication = await EducatorApplication.findOne({ 
      userId, 
      status: 'pending' 
    })
    
    if (existingApplication) {
      return res.status(400).json({ 
        success: false, 
        message: 'Bạn đã có đơn đăng ký đang chờ duyệt' 
      })
    }

    // Check if user is already an educator
    const user = await User.findById(userId)
    if (user?.role === 'educator') {
      return res.status(400).json({ 
        success: false, 
        message: 'Bạn đã là giảng viên' 
      })
    }

    // Validate required fields
    if (!fullName || !email || !phone || !expertise || !experience || 
        !qualification || !courseTopics || !teachingApproach) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vui lòng điền đầy đủ thông tin bắt buộc' 
      })
    }

    // Handle file uploads if present
    let cvUrl = null
    let certificatesUrl = []
    
    if (req.files) {
      if (req.files.certificates?.length || req.files.cv?.length) {
        assertCloudinaryConfigured()
      }

      if (req.files.cv && req.files.cv[0]) {
        const cvFile = req.files.cv[0]
        const cvUpload = await cloudinary.uploader.upload(cvFile.path, {
          folder: 'educator-applications/cvs',
          resource_type: 'auto'
        })
        cvUrl = cvUpload.secure_url
        await fs.unlink(cvFile.path).catch(() => {})
      }
      
      if (req.files.certificates) {
        for (const cert of req.files.certificates) {
          const certUpload = await cloudinary.uploader.upload(cert.path, {
            folder: 'educator-applications/certificates',
            resource_type: 'auto'
          })
          certificatesUrl.push(certUpload.secure_url)
          await fs.unlink(cert.path).catch(() => {})
        }
      }
    }

    const application = await EducatorApplication.create({
      userId,
      fullName,
      email,
      phone,
      expertise,
      experience,
      qualification,
      linkedinUrl,
      portfolioUrl,
      courseTopics,
      teachingApproach,
      sampleVideoUrl,
      cvUrl,
      certificatesUrl
    })

    res.json({ 
      success: true, 
      message: 'Đơn đăng ký đã được gửi. Vui lòng chờ admin xét duyệt.',
      application 
    })
  } catch (error) {
    console.error('Submit application error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// Get application status for current user
export const getApplicationStatus = async (req, res) => {
  try {
    const userId = req.auth.userId
    const application = await EducatorApplication.findOne({ userId }).sort({ createdAt: -1 })
    
    res.json({ 
      success: true, 
      application 
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Legacy function - now requires admin approval
export const updateRoleEducator = async (req, res) => {
  try {
    res.status(400).json({
      success: false, 
      message: 'Vui lòng điền form đăng ký giảng viên để được xét duyệt'
    })
  } catch (error) {
    res.json({success: false, message: error.message} )
  }
}

export const addCourse = async (req, res) => {
  try {
    const { courseData } = req.body
    const imageFile = req.file
    const userId = req.auth.userId

    if (!imageFile) {
      return res.status(400).json({ success: false, message: 'Thumbnail not attached' });
    }

    assertCloudinaryConfigured()

    const parseCourseData = await JSON.parse(courseData)
    parseCourseData.educator = userId
    parseCourseData.courseTopic = String(parseCourseData.courseTopic || 'Tổng quát').trim() || 'Tổng quát'
    parseCourseData.courseLevel = normalizeCourseLevel(parseCourseData.courseLevel)
    parseCourseData.courseTags = normalizeCourseTags(parseCourseData.courseTags)
    parseCourseData.estimatedDurationHours = calculateEstimatedDurationHours(parseCourseData.courseContent)
    parseCourseData.aiEmbedding = []
    parseCourseData.aiEmbeddingModel = ''
    parseCourseData.aiEmbeddingUpdatedAt = null
    const newCourse = await Course.create(parseCourseData)
    const imageUpload = await cloudinary.uploader.upload(imageFile.path)
    newCourse.courseThumbnail = imageUpload.secure_url
    await newCourse.save()

    const transcriptCount = await populateTranscripts(newCourse.courseContent)
    if (transcriptCount > 0) {
      console.log(`[Transcript] Populated ${transcriptCount} lecture transcripts for course: ${newCourse.courseTitle}`)
    }

    const vector = await refreshCourseEmbedding(newCourse)
    console.log(`[Embedding] Updated ${vector.length}-dim embedding for course: ${newCourse.courseTitle}`)

    res.json({ success: true, message: 'Khóa học đã được tạo thành công', course: newCourse })

  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Update course
export const updateCourse = async (req, res) => {
  try {
    const { courseId } = req.params
    const { courseData } = req.body
    const imageFile = req.file
    const userId = req.auth.userId

    const course = await Course.findById(courseId)
    
    if (!course) {
      return res.status(404).json({ success: false, message: 'Khóa học không tồn tại' })
    }

    // Check if user is the owner
    if (course.educator !== userId) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền chỉnh sửa khóa học này' })
    }

    const parseCourseData = JSON.parse(courseData)
    
    // Update course fields
    course.courseTitle = parseCourseData.courseTitle || course.courseTitle
    course.courseDescription = parseCourseData.courseDescription || course.courseDescription
    course.courseTopic = String(parseCourseData.courseTopic || course.courseTopic || 'Tổng quát').trim() || 'Tổng quát'
    course.courseLevel = normalizeCourseLevel(parseCourseData.courseLevel || course.courseLevel)
    course.courseTags = normalizeCourseTags(parseCourseData.courseTags ?? course.courseTags)
    course.coursePrice = parseCourseData.coursePrice ?? course.coursePrice
    course.discount = parseCourseData.discount ?? course.discount
    course.courseContent = parseCourseData.courseContent || course.courseContent
    course.estimatedDurationHours = calculateEstimatedDurationHours(course.courseContent)
    course.isPublished = parseCourseData.isPublished ?? course.isPublished
    course.aiEmbedding = []
    course.aiEmbeddingModel = ''
    course.aiEmbeddingUpdatedAt = null

    // Update thumbnail if new image provided
    if (imageFile) {
      assertCloudinaryConfigured()
      const imageUpload = await cloudinary.uploader.upload(imageFile.path)
      course.courseThumbnail = imageUpload.secure_url
    }

    await course.save()

    const transcriptCount = await populateTranscripts(course.courseContent)
    if (transcriptCount > 0) {
      console.log(`[Transcript] Populated ${transcriptCount} lecture transcripts for course: ${course.courseTitle}`)
    }

    const vector = await refreshCourseEmbedding(course)
    console.log(`[Embedding] Updated ${vector.length}-dim embedding for course: ${course.courseTitle}`)

    res.json({ success: true, message: 'Khóa học đã được cập nhật', course })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Delete course
export const deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.params
    const userId = req.auth.userId

    const course = await Course.findById(courseId)
    
    if (!course) {
      return res.status(404).json({ success: false, message: 'Khóa học không tồn tại' })
    }

    // Check if user is the owner
    if (course.educator !== userId) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xóa khóa học này' })
    }

    // Check if course has enrolled students
    if (course.enrolledStudents.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Không thể xóa khóa học đã có học viên đăng ký. Hãy ẩn khóa học thay vì xóa.' 
      })
    }

    await Course.findByIdAndDelete(courseId)

    res.json({ success: true, message: 'Khóa học đã được xóa' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Get single course for editing
export const getCourseById = async (req, res) => {
  try {
    const { courseId } = req.params
    const userId = req.auth.userId

    const course = await Course.findById(courseId)
    
    if (!course) {
      return res.status(404).json({ success: false, message: 'Khóa học không tồn tại' })
    }

    // Check if user is the owner
    if (course.educator !== userId) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền xem khóa học này' })
    }

    res.json({ success: true, course })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Toggle course publish status
export const toggleCoursePublish = async (req, res) => {
  try {
    const { courseId } = req.params
    const userId = req.auth.userId

    const course = await Course.findById(courseId)
    
    if (!course) {
      return res.status(404).json({ success: false, message: 'Khóa học không tồn tại' })
    }

    if (course.educator !== userId) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền thay đổi trạng thái khóa học này' })
    }

    course.isPublished = !course.isPublished
    await course.save()

    res.json({ 
      success: true, 
      message: course.isPublished ? 'Khóa học đã được xuất bản' : 'Khóa học đã được ẩn',
      isPublished: course.isPublished
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Get educator courses
export const getEducatorCourses = async (req, res) => {
  try {
    const educator = req.auth.userId
    const { page, limit } = req.query

    if (page) {
      const pageNum = Math.max(1, Number(page || 1))
      const limitNum = Math.max(1, Number(limit || 10))
      const skip = (pageNum - 1) * limitNum

      const total = await Course.countDocuments({ educator })
      const courses = await Course.find({ educator })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)

      return res.json({
        success: true,
        courses,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum)
        }
      })
    }

    // Default: fetch all
    const courses = await Course.find({ educator }).sort({ createdAt: -1 })
    res.json({ success: true, courses })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

// Get educator dashboard data
export const educatorDashboardData = async (req, res) => {
  try {
    const educator = req.auth.userId
    const courses = await Course.find({ educator })
    const totalCourses = courses.length
    const courseIds = courses.map(course => course._id)

    // Calculate total earnings from purchases
    const purchases = await Purchase.find({
      courseId: { $in: courseIds },
      status: 'completed'
    })

    const totalEarnings = purchases.reduce((sum, purchase) => sum + purchase.amount, 0)

    // Collect unique enrolled students IDs with their course titles
    const enrolledStudentsData = []
    for (const course of courses) {
      const students = await User.find({
        _id: { $in: course.enrolledStudents }
      }, 'name imageUrl')
      students.forEach(student => {
        enrolledStudentsData.push({
          student,
          courseTitle: course.courseTitle
        })
      })
    }
    res.json({ success: true, data: {
      totalEarnings,
      enrolledStudentsData,
      totalCourses
    }})
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

// Get enrolled students data with purchase data
export const getEnrolledStudentsData = async (req, res) => {
  try {
    const educator = req.auth.userId
    const courses = await Course.find({ educator })
    const courseIds = courses.map(course => course._id)

    const page = Math.max(1, Number(req.query.page || 1))
    const limit = Math.max(1, Number(req.query.limit || 10))
    const skip = (page - 1) * limit

    const total = await Purchase.countDocuments({
      courseId: { $in: courseIds },
      status: 'completed'
    })

    const purchases = await Purchase.find({
      courseId: { $in: courseIds },
      status: 'completed'
    })
      .populate('userId', 'name imageUrl')
      .populate('courseId', 'courseTitle')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const enrolledStudents = purchases.map(purchase => ({
      student: purchase.userId,
      courseTitle: purchase.courseId.courseTitle,
      purchaseDate: purchase.createdAt
    }))

    res.json({
      success: true,
      enrolledStudents,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}

export const saveLectureQuiz = async (req, res) => {
  try {
    const { courseId, lectureId, quizQuestions, isQuizPublished, quizzes } = req.body
    const userId = req.auth.userId

    const course = await Course.findById(courseId)
    if (!course) {
      return res.status(404).json({ success: false, message: 'Khóa học không tồn tại' })
    }

    if (course.educator !== userId) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền chỉnh sửa khóa học này' })
    }

    let found = false
    if (course.courseContent) {
      for (const chapter of course.courseContent) {
        if (chapter.chapterContent) {
          for (const lecture of chapter.chapterContent) {
            if (lecture.lectureId === lectureId) {
              lecture.lectureQuiz = quizzes || quizQuestions || []
              lecture.isQuizPublished = true
              found = true
              break
            }
          }
        }
        if (found) break
      }
    }

    if (!found) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy bài giảng' })
    }

    await course.save()

    res.json({
      success: true,
      message: 'Đã lưu quiz bài học thành công',
      isQuizPublished: true
    })
  } catch (error) {
    console.error('Save Lecture Quiz error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

export const saveFinalExam = async (req, res) => {
  try {
    const { courseId, requiredScorePercent, isPublished, questions, durationMins } = req.body
    const userId = req.auth.userId

    const course = await Course.findById(courseId)
    if (!course) {
      return res.status(404).json({ success: false, message: 'Khóa học không tồn tại' })
    }

    if (course.educator !== userId) {
      return res.status(403).json({ success: false, message: 'Bạn không có quyền chỉnh sửa khóa học này' })
    }

    course.finalExam = {
      requiredScorePercent: Number(requiredScorePercent ?? 70),
      durationMins: Number(durationMins ?? 30),
      isPublished: true,
      questions: questions || []
    }

    await course.save()

    res.json({
      success: true,
      message: 'Đã lưu bài thi hết khóa thành công',
      finalExam: course.finalExam
    })
  } catch (error) {
    console.error('Save Final Exam error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}
