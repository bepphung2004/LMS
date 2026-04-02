import express from 'express'
import { 
  addCourse, 
  updateRoleEducator, 
  getEducatorCourses, 
  educatorDashboardData, 
  getEnrolledStudentsData,
  submitEducatorApplication,
  getApplicationStatus,
  updateCourse,
  deleteCourse,
  getCourseById,
  toggleCoursePublish
} from '../controllers/educatorControllers.js'
import upload from '../configs/multer.js'
import { protectEducator, requireAuth } from './../middlewares/authMiddleware.js'

const educatorRouter = express.Router()

// Educator Application Routes (requires auth but not educator role)
educatorRouter.post('/apply', 
  upload.fields([
    { name: 'cv', maxCount: 1 },
    { name: 'certificates', maxCount: 5 }
  ]), 
  submitEducatorApplication
)
educatorRouter.get('/application-status', getApplicationStatus)

// Legacy route - now redirects to apply
educatorRouter.get('/update-role', updateRoleEducator)

// Protected Educator Routes
educatorRouter.post('/add-course', upload.single('image'), protectEducator, addCourse)
educatorRouter.put('/course/:courseId', upload.single('image'), protectEducator, updateCourse)
educatorRouter.delete('/course/:courseId', protectEducator, deleteCourse)
educatorRouter.get('/course/:courseId', protectEducator, getCourseById)
educatorRouter.patch('/course/:courseId/toggle-publish', protectEducator, toggleCoursePublish)
educatorRouter.get('/courses', protectEducator, getEducatorCourses)
educatorRouter.get('/dashboard', protectEducator, educatorDashboardData)
educatorRouter.get('/enrolled-students', protectEducator, getEnrolledStudentsData)

export default educatorRouter