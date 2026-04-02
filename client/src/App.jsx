import React from 'react'
import { Route, Routes, useMatch } from 'react-router-dom'
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
import AdminLayout, { AdminDashboard, AdminApplications, AdminUsers, AdminCourses } from './pages/educator/AdminPages'
import Navbar from './components/student/Navbar'
import "quill/dist/quill.snow.css"
import { ToastContainer } from 'react-toastify'

const App = () => {

  const isEducatorRoute = useMatch('/educator/*')
  const isAdminRoute = useMatch('/admin/*')

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
          <Route path='student-enrolled' element={<StudentsEnrolled />} />
        </Route>

        {/* Admin Routes */}
        <Route path='/admin' element={<AdminLayout />}>
          <Route path='/admin' element={<AdminDashboard />} />
          <Route path='applications' element={<AdminApplications />} />
          <Route path='users' element={<AdminUsers />} />
          <Route path='courses' element={<AdminCourses />} />
        </Route>
      </Routes>
    </div>
  )
}

export default App