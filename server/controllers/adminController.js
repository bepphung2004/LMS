import { clerkClient } from '@clerk/express'
import User from '../models/User.js'
import Course from '../models/Course.js'
import { Purchase } from '../models/Purchases.js'
import EducatorApplication from '../models/EducatorApplication.js'
import { sendEmail } from '../configs/email.js'

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
    
    let filter = {}
    if (status && status !== 'all') {
      filter.status = status
    }

    const applications = await EducatorApplication.find(filter)
      .sort({ createdAt: -1 })
      .populate('userId', 'name imageUrl email')
      .populate('reviewedBy', 'name')

    res.json({ success: true, applications })
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

    // Send approval email
    try {
      await sendEmail({
        to: application.email,
        subject: '🎉 Chúc mừng! Đơn đăng ký giảng viên đã được duyệt',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Chúc mừng ${application.fullName}!</h1>
            <p>Đơn đăng ký trở thành giảng viên của bạn đã được <strong style="color: #16a34a;">CHẤP THUẬN</strong>.</p>
            <p>Bạn có thể bắt đầu tạo khóa học ngay bây giờ bằng cách:</p>
            <ol>
              <li>Đăng nhập vào tài khoản của bạn</li>
              <li>Truy cập trang Giảng viên</li>
              <li>Nhấn "Thêm khóa học" để bắt đầu</li>
            </ol>
            <p>Chúc bạn thành công trên hành trình giảng dạy!</p>
            <hr style="margin: 20px 0;">
            <p style="color: #6b7280; font-size: 14px;">Đội ngũ LMS</p>
          </div>
        `
      })
    } catch (emailError) {
      console.error('Failed to send approval email:', emailError)
      // Don't fail the whole operation if email fails
    }

    res.json({ 
      success: true, 
      message: 'Đơn đăng ký đã được duyệt. Email thông báo đã được gửi đến ứng viên.' 
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

    // Send rejection email
    try {
      await sendEmail({
        to: application.email,
        subject: 'Thông báo về đơn đăng ký giảng viên',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #dc2626;">Thông báo</h1>
            <p>Xin chào ${application.fullName},</p>
            <p>Chúng tôi đã xem xét đơn đăng ký giảng viên của bạn. Rất tiếc, đơn của bạn chưa được chấp thuận lần này.</p>
            <p><strong>Lý do:</strong></p>
            <p style="background: #f3f4f6; padding: 15px; border-radius: 8px;">${reason}</p>
            <p>Bạn có thể nộp đơn đăng ký mới sau khi bổ sung các thông tin cần thiết.</p>
            <p>Nếu bạn có thắc mắc, vui lòng liên hệ với chúng tôi.</p>
            <hr style="margin: 20px 0;">
            <p style="color: #6b7280; font-size: 14px;">Đội ngũ LMS</p>
          </div>
        `
      })
    } catch (emailError) {
      console.error('Failed to send rejection email:', emailError)
    }

    res.json({ 
      success: true, 
      message: 'Đơn đăng ký đã bị từ chối. Email thông báo đã được gửi đến ứng viên.' 
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

    const users = await User.find(filter)
      .select('-enrolledCourses')
      .sort({ createdAt: -1 })

    res.json({ success: true, users })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Update user role
export const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params
    const { role } = req.body
    const adminId = req.auth.userId

    if (!['student', 'educator', 'admin'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Vai trò không hợp lệ' })
    }

    // Prevent admin from changing their own role
    if (userId === adminId) {
      return res.status(400).json({ success: false, message: 'Không thể thay đổi vai trò của chính mình' })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' })
    }

    // Update in database
    user.role = role
    await user.save()

    // Update in Clerk
    await clerkClient.users.updateUser(userId, {
      publicMetadata: { role }
    })

    res.json({ success: true, message: `Đã cập nhật vai trò thành ${role}` })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Get all courses (admin view)
export const getAllCoursesAdmin = async (req, res) => {
  try {
    const { isPublished, search } = req.query
    
    let filter = {}
    if (isPublished !== undefined && isPublished !== 'all') {
      filter.isPublished = isPublished === 'true'
    }
    if (search) {
      filter.courseTitle = { $regex: search, $options: 'i' }
    }

    const courses = await Course.find(filter)
      .populate('educator', 'name email imageUrl')
      .sort({ createdAt: -1 })

    res.json({ success: true, courses })
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

    await Course.findByIdAndDelete(courseId)

    res.json({ success: true, message: 'Khóa học đã được xóa' })
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}
