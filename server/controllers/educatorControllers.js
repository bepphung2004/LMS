import { clerkClient } from '@clerk/express'
import { v2 as cloudinary } from 'cloudinary'
import Course from '../models/Course.js'
import { Purchase } from '../models/Purchases.js'
import User from '../models/User.js'
import EducatorApplication from '../models/EducatorApplication.js'

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
      if (req.files.cv && req.files.cv[0]) {
        const cvUpload = await cloudinary.uploader.upload(req.files.cv[0].path, {
          folder: 'educator-applications/cv'
        })
        cvUrl = cvUpload.secure_url
      }
      
      if (req.files.certificates) {
        for (const cert of req.files.certificates) {
          const certUpload = await cloudinary.uploader.upload(cert.path, {
            folder: 'educator-applications/certificates'
          })
          certificatesUrl.push(certUpload.secure_url)
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
      message: 'Đơn đăng ký đã được gửi. Chúng tôi sẽ xem xét và phản hồi qua email.',
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

    const parseCourseData = await JSON.parse(courseData)
    parseCourseData.educator = userId
    const newCourse = await Course.create(parseCourseData)
    const imageUpload = await cloudinary.uploader.upload(imageFile.path)
    newCourse.courseThumbnail = imageUpload.secure_url
    await newCourse.save()

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
    course.coursePrice = parseCourseData.coursePrice ?? course.coursePrice
    course.discount = parseCourseData.discount ?? course.discount
    course.courseContent = parseCourseData.courseContent || course.courseContent
    course.isPublished = parseCourseData.isPublished ?? course.isPublished

    // Update thumbnail if new image provided
    if (imageFile) {
      const imageUpload = await cloudinary.uploader.upload(imageFile.path)
      course.courseThumbnail = imageUpload.secure_url
    }

    await course.save()

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
    const courses = await Course.find({ educator })
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
    const purchases = await Purchase.find({
      courseId: { $in: courseIds },
      status: 'completed'
    }).populate('userId', 'name imageUrl').populate('courseId', 'courseTitle')
    const enrolledStudents = purchases.map(purchase => ({
      student: purchase.userId,
      courseTitle: purchase.courseId.courseTitle,
      purchaseDate: purchase.createdAt
    }))
    res.json({ success: true, enrolledStudents })
  } catch (error) {
    res.json({ success: false, message: error.message })
  }
}