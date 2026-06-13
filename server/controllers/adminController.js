import { clerkClient } from '@clerk/express'
import fs from 'node:fs/promises'
import path from 'node:path'
import User from '../models/User.js'
import Course from '../models/Course.js'
import { Purchase } from '../models/Purchases.js'
import { CourseProgress } from '../models/CourseProgress.js'
import EducatorApplication from '../models/EducatorApplication.js'

const getExtFromContentType = (contentType = '') => {
  const type = contentType.toLowerCase()
  if (type.includes('pdf')) return '.pdf'
  if (type.includes('msword')) return '.doc'
  if (type.includes('officedocument.wordprocessingml.document')) return '.docx'
  if (type.includes('image/png')) return '.png'
  if (type.includes('image/jpeg')) return '.jpg'
  return '.bin'
}

// Get admin dashboard stats
export const getAdminDashboard = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments()
    const totalCourses = await Course.countDocuments()
    const totalEducators = await User.countDocuments({ role: 'educator' })
    const pendingApplications = await EducatorApplication.countDocuments({ status: 'pending' })
    
    const totalRevenue = await Purchase.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ])

    // Recent enrollments
    const recentEnrollments = await Purchase.find({ status: 'completed' })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate('userId', 'name imageUrl email')
      .populate('courseId', 'courseTitle')

    // Recent applications
    const recentApplications = await EducatorApplication.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('userId', 'name imageUrl email')

    res.json({
      success: true,
      data: {
        totalUsers,
        totalCourses,
        totalEducators,
        pendingApplications,
        totalRevenue: totalRevenue[0]?.total || 0,
        recentEnrollments,
        recentApplications
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Get all educator applications
export const getEducatorApplications = async (req, res) => {
  try {
    const { status } = req.query // pending, approved, rejected, all
    const page = Math.max(1, Number(req.query.page || 1))
    const limit = Math.max(1, Number(req.query.limit || 10))
    const skip = (page - 1) * limit
    
    let filter = {}
    if (status && status !== 'all') {
      filter.status = status
    }

    // Status counts
    const allApplications = await EducatorApplication.find().select('status')
    const statusCounts = { all: allApplications.length, pending: 0, approved: 0, rejected: 0 }
    allApplications.forEach(app => {
      if (app.status === 'pending') statusCounts.pending++
      if (app.status === 'approved') statusCounts.approved++
      if (app.status === 'rejected') statusCounts.rejected++
    })

    const total = status === 'all' ? statusCounts.all : (statusCounts[status] || 0)
    const applications = await EducatorApplication.find(filter)
      .sort({ createdAt: -1 })
      .populate('userId', 'name imageUrl email')
      .populate('reviewedBy', 'name')
      .skip(skip)
      .limit(limit)

    res.json({
      success: true,
      applications,
      statusCounts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Get single application details
export const getApplicationDetails = async (req, res) => {
  try {
    const { applicationId } = req.params

    const application = await EducatorApplication.findById(applicationId)
      .populate('userId', 'name imageUrl email')
      .populate('reviewedBy', 'name')

    if (!application) {
      return res.status(404).json({ success: false, message: 'Đơn đăng ký không tồn tại' })
    }

    res.json({ success: true, application })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Download application CV (supports local file path and legacy remote URLs)
export const downloadApplicationCv = async (req, res) => {
  try {
    const { applicationId } = req.params
    const application = await EducatorApplication.findById(applicationId)

    if (!application || !application.cvUrl) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy CV' })
    }

    // New local-storage flow
    if (application.cvUrl.startsWith('/uploads/')) {
      const relativePath = application.cvUrl.replace(/^\/+/, '')
      const absolutePath = path.join(process.cwd(), relativePath)
      try {
        await fs.access(absolutePath)
        return res.download(absolutePath, path.basename(absolutePath))
      } catch (err) {
        return res.status(404).json({ success: false, message: 'CV không tồn tại trên hệ thống cục bộ' })
      }
    }

    // Cloudinary or remote URL flow
    const response = await fetch(application.cvUrl)
    if (!response.ok) {
      const cldError = response.headers.get('x-cld-error')
      if (response.status === 401 && cldError && cldError.toLowerCase().includes('deny')) {
        return res.status(400).json({ 
          success: false, 
          message: 'Tải CV thất bại: Tài khoản Cloudinary của bạn đang chặn phân phối tệp PDF/ZIP. Vui lòng truy cập trang quản trị Cloudinary (Settings -> Security) và kích hoạt tùy chọn "Allow delivery of PDF and ZIP files" rồi lưu lại để cho phép tải CV.' 
        })
      }
      return res.status(404).json({ success: false, message: 'Không thể tải CV từ nguồn lưu trữ trực tuyến' })
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream'
    let ext = getExtFromContentType(contentType)

    // Robust fallback: if type is generic binary/octet-stream or .bin, try to extract extension from the cvUrl path
    if ((ext === '.bin' || contentType === 'application/octet-stream') && application.cvUrl) {
      try {
        const urlPath = new URL(application.cvUrl).pathname
        const parsedExt = path.extname(urlPath).toLowerCase()
        if (['.pdf', '.doc', '.docx', '.png', '.jpg', '.jpeg'].includes(parsedExt)) {
          ext = parsedExt
        }
      } catch (e) {
        console.error('Error parsing extension from CV URL:', e)
      }
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    const fileName = `cv-${applicationId}${ext}`

    res.setHeader('Content-Type', contentType)
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
    return res.send(buffer)
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message })
  }
}

// Approve educator application
export const approveApplication = async (req, res) => {
  try {
    const { applicationId } = req.params
    const adminId = req.auth.userId

    const application = await EducatorApplication.findById(applicationId)
    
    if (!application) {
      return res.status(404).json({ success: false, message: 'Đơn đăng ký không tồn tại' })
    }

    if (application.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Đơn đăng ký đã được xử lý' })
    }

    // Update application status
    application.status = 'approved'
    application.reviewedBy = adminId
    application.reviewedAt = new Date()
    await application.save()

    // Update user role in database
    await User.findByIdAndUpdate(application.userId, { role: 'educator' })

    // Update user role in Clerk
    await clerkClient.users.updateUser(application.userId, {
      publicMetadata: {
        role: 'educator',
      }
    })

    res.json({ 
      success: true, 
      message: 'Đơn đăng ký đã được duyệt thành công.' 
    })
  } catch (error) {
    console.error('Approve application error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// Reject educator application
export const rejectApplication = async (req, res) => {
  try {
    const { applicationId } = req.params
    const { reason } = req.body
    const adminId = req.auth.userId

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp lý do từ chối' })
    }

    const application = await EducatorApplication.findById(applicationId)
    
    if (!application) {
      return res.status(404).json({ success: false, message: 'Đơn đăng ký không tồn tại' })
    }

    if (application.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'Đơn đăng ký đã được xử lý' })
    }

    // Update application status
    application.status = 'rejected'
    application.reviewedBy = adminId
    application.reviewedAt = new Date()
    application.rejectionReason = reason
    await application.save()

    res.json({ 
      success: true, 
      message: 'Đơn đăng ký đã bị từ chối.' 
    })
  } catch (error) {
    console.error('Reject application error:', error)
    res.status(500).json({ success: false, message: error.message })
  }
}

// Get all users
export const getAllUsers = async (req, res) => {
  try {
    const { role, search } = req.query
    const page = Math.max(1, Number(req.query.page || 1))
    const limit = Math.max(1, Number(req.query.limit || 10))
    const skip = (page - 1) * limit
    
    let filter = {}
    if (role && role !== 'all') {
      filter.role = role
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }

    // Role counts matching the search filter
    let countsFilter = {}
    if (search) {
      countsFilter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ]
    }

    const allMatchingUsers = await User.find(countsFilter).select('role')
    const roleCounts = { all: allMatchingUsers.length, student: 0, educator: 0, admin: 0 }
    allMatchingUsers.forEach(u => {
      if (u.role === 'student') roleCounts.student++
      if (u.role === 'educator') roleCounts.educator++
      if (u.role === 'admin') roleCounts.admin++
    })

    const total = role === 'all' ? roleCounts.all : roleCounts[role] || 0
    const users = await User.find(filter)
      .select('-enrolledCourses')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    res.json({
      success: true,
      users,
      roleCounts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Ban user account (student/educator only)
export const banUserAccount = async (req, res) => {
  try {
    const { userId } = req.params
    const adminId = req.auth.userId

    // Prevent admin from banning their own account
    if (userId === adminId) {
      return res.status(400).json({ success: false, message: 'Không thể cấm tài khoản của chính mình' })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' })
    }

    if (!['student', 'educator'].includes(user.role)) {
      return res.status(400).json({ success: false, message: 'Chỉ có thể cấm tài khoản học viên hoặc giảng viên' })
    }

    if (user.isBanned) {
      return res.status(400).json({ success: false, message: 'Tài khoản này đã bị cấm trước đó' })
    }

    // Update in database
    user.isBanned = true
    await user.save()

    // Keep role metadata in Clerk, add banned flag for downstream integrations.
    await clerkClient.users.updateUser(userId, {
      publicMetadata: {
        role: user.role,
        isBanned: true,
      }
    })

    res.json({ success: true, message: 'Đã cấm tài khoản thành công' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Unban user account (student/educator only)
export const unbanUserAccount = async (req, res) => {
  try {
    const { userId } = req.params

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' })
    }

    if (!['student', 'educator'].includes(user.role)) {
      return res.status(400).json({ success: false, message: 'Chỉ có thể bỏ cấm tài khoản học viên hoặc giảng viên' })
    }

    if (!user.isBanned) {
      return res.status(400).json({ success: false, message: 'Tài khoản này chưa bị cấm' })
    }

    user.isBanned = false
    await user.save()

    await clerkClient.users.updateUser(userId, {
      publicMetadata: {
        role: user.role,
        isBanned: false,
      }
    })

    res.json({ success: true, message: 'Đã bỏ cấm tài khoản thành công' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Get all courses (admin view)
export const getAllCoursesAdmin = async (req, res) => {
  try {
    const { isPublished, search } = req.query
    const page = Math.max(1, Number(req.query.page || 1))
    const limit = Math.max(1, Number(req.query.limit || 10))
    const skip = (page - 1) * limit
    
    let filter = {}
    if (isPublished !== undefined && isPublished !== 'all') {
      filter.isPublished = isPublished === 'true'
    }
    if (search) {
      filter.courseTitle = { $regex: search, $options: 'i' }
    }

    // Visibility counts matching search filter
    let countsFilter = {}
    if (search) {
      countsFilter.courseTitle = { $regex: search, $options: 'i' }
    }
    const allMatchingCourses = await Course.find(countsFilter).select('isPublished')
    const visibilityCounts = { all: allMatchingCourses.length, true: 0, false: 0 }
    allMatchingCourses.forEach(c => {
      if (c.isPublished) visibilityCounts.true++
      else visibilityCounts.false++
    })

    const total = isPublished === 'all' ? visibilityCounts.all : (isPublished === 'true' ? visibilityCounts.true : visibilityCounts.false)
    const courses = await Course.find(filter)
      .populate('educator', 'name email imageUrl')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    res.json({
      success: true,
      courses,
      visibilityCounts,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Delete course (admin)
export const deleteCourseAdmin = async (req, res) => {
  try {
    const { courseId } = req.params

    const course = await Course.findById(courseId)
    if (!course) {
      return res.status(404).json({ success: false, message: 'Khóa học không tồn tại' })
    }

    // Remove course from all enrolled users
    await User.updateMany(
      { enrolledCourses: courseId },
      { $pull: { enrolledCourses: courseId } }
    )

    // Clean up related CourseProgress and Purchase records
    await CourseProgress.deleteMany({ courseId })
    await Purchase.deleteMany({ courseId })

    await Course.findByIdAndDelete(courseId)

    res.json({ success: true, message: 'Khóa học đã được xóa' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Toggle course visibility (admin)
export const toggleCourseVisibilityAdmin = async (req, res) => {
  try {
    const { courseId } = req.params

    const course = await Course.findById(courseId)
    if (!course) {
      return res.status(404).json({ success: false, message: 'Khóa học không tồn tại' })
    }

    course.isPublished = !course.isPublished
    await course.save()

    res.json({
      success: true,
      message: course.isPublished ? 'Đã bỏ ẩn khóa học' : 'Đã ẩn khóa học',
      isPublished: course.isPublished,
    })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
