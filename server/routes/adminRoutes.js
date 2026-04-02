import express from 'express'
import {
  getAdminDashboard,
  getEducatorApplications,
  getApplicationDetails,
  approveApplication,
  rejectApplication,
  getAllUsers,
  updateUserRole,
  getAllCoursesAdmin,
  deleteCourseAdmin
} from '../controllers/adminController.js'
import { protectAdmin } from '../middlewares/authMiddleware.js'

const adminRouter = express.Router()

// All admin routes require admin role
adminRouter.use(protectAdmin)

// Dashboard
adminRouter.get('/dashboard', getAdminDashboard)

// Educator Applications
adminRouter.get('/applications', getEducatorApplications)
adminRouter.get('/applications/:applicationId', getApplicationDetails)
adminRouter.post('/applications/:applicationId/approve', approveApplication)
adminRouter.post('/applications/:applicationId/reject', rejectApplication)

// User Management
adminRouter.get('/users', getAllUsers)
adminRouter.patch('/users/:userId/role', updateUserRole)

// Course Management
adminRouter.get('/courses', getAllCoursesAdmin)
adminRouter.delete('/courses/:courseId', deleteCourseAdmin)

export default adminRouter
