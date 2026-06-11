import React, { useContext } from 'react'
import { Navigate, Route, Routes, useLocation, useMatch } from 'react-router-dom'
import { useClerk, useUser } from '@clerk/clerk-react'
import Home from './pages/student/Home'
import CoursesList from './pages/student/CoursesList'
import CourseDetails from './pages/student/CourseDetails'
import MyEnrollments from './pages/student/MyEnrollments'
import Player from './pages/student/Player'
import Loading from './components/student/Loading'
import BecomeEducator from './pages/student/BecomeEducator'
import Educator from './pages/educator/Educator'
import Dashboard from './pages/educator/Dashboard'
import AddCourse from './pages/educator/AddCourse'
import MyCourses from './pages/educator/MyCourses'
import EditCourse from './pages/educator/EditCourse'
import StudentsEnrolled from './pages/educator/StudentsEnrolled'
import ManageQuizzes from './pages/educator/ManageQuizzes'
import Admin from './pages/admin/Admin'
import DashboardAdmin from './pages/admin/Dashboard'
import ManageApplication from './pages/admin/ManageApplication'
import ManageUser from './pages/admin/ManageUser'
import ManageCourse from './pages/admin/ManageCourse'
import Navbar from './components/student/Navbar'
import "quill/dist/quill.snow.css"
import { ToastContainer } from 'react-toastify'
import { AppContext } from './context/AppContext'

const DisabledAccountNotice = ({ onGoHome }) => {
  return (
    <div className='min-h-screen bg-slate-50 flex items-center justify-center p-4'>
      <div className='max-w-xl w-full bg-white border rounded-2xl shadow-sm p-8 text-center'>
        <div className='mx-auto mb-5 w-14 h-14 rounded-full bg-red-50 flex items-center justify-center'>
          <svg className='w-7 h-7 text-red-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 9v4m0 4h.01M22 12A10 10 0 112 12a10 10 0 0120 0z' />
          </svg>
        </div>
        <h1 className='text-2xl font-bold text-gray-800 mb-3'>Tài khoản đã bị vô hiệu hóa</h1>
        <p className='text-gray-600 leading-relaxed'>
          Tài khoản của bạn đã bị vô hiệu hóa do vi phạm điều khoản người dùng.
        </p>
        <button
          type='button'
          onClick={onGoHome}
          className='inline-flex items-center justify-center mt-6 px-5 py-2.5 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors'
        >
          Về trang chủ
        </button>
      </div>
    </div>
  )
}

const App = () => {
  const { signOut } = useClerk()
  const { user, isLoaded } = useUser()
  const { userData } = useContext(AppContext)
  const location = useLocation()

  const isEducatorRoute = useMatch('/educator/*')
  const isAdminRoute = useMatch('/admin/*')
  const isAdminUser = user?.publicMetadata?.role === 'admin'
  const isBannedUser = Boolean(user && userData?.isBanned)

  const handleBannedGoHome = async () => {
    try {
      await signOut({ redirectUrl: '/' })
    } catch {
      window.location.href = '/'
    }
  }

  if (isBannedUser) {
    return (
      <div className='text-default min-h-screen bg-white'>
        <ToastContainer />
        <DisabledAccountNotice onGoHome={handleBannedGoHome} />
      </div>
    )
  }

  if (isLoaded && isAdminUser && !location.pathname.startsWith('/admin')) {
    return (
      <div className='text-default min-h-screen bg-white'>
        <ToastContainer />
        <Loading />
        <Navigate to='/admin' replace />
      </div>
    )
  }

  return (
    <div className='text-default min-h-screen bg-white'>
      <ToastContainer />
      { !isEducatorRoute && !isAdminRoute && <Navbar /> }
      <Routes>
        <Route path='/' element={<Home />} />
        <Route path='/course-list' element={<CoursesList />} />
        <Route path='/course-list/:input' element={<CoursesList />} />
        <Route path='/course/:id' element={<CourseDetails />} />
        <Route path='/my-enrollments' element={<MyEnrollments />} />
        <Route path='/player/:courseId' element={<Player />} />
        <Route path='/loading/:path' element={<Loading />} />
        <Route path='/become-educator' element={<BecomeEducator />} />
        
        {/* Educator Routes */}
        <Route path='/educator' element={<Educator />}>
          <Route path='/educator' element={<Dashboard />} />
          <Route path='add-course' element={<AddCourse />} />
          <Route path='my-courses' element={<MyCourses />} />
          <Route path='edit-course/:courseId' element={<EditCourse />} />
          <Route path='manage-quizzes' element={<ManageQuizzes />} />
          <Route path='student-enrolled' element={<StudentsEnrolled />} />
        </Route>

        {/* Admin Routes */}
        <Route path='/admin' element={<Admin />}>
          <Route path='/admin' element={<DashboardAdmin />} />
          <Route path='applications' element={<ManageApplication />} />
          <Route path='users' element={<ManageUser />} />
          <Route path='courses' element={<ManageCourse />} />
        </Route>
      </Routes>
    </div>
  )
}

export default App
