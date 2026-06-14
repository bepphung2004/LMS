import React, { useContext } from 'react'
import { assets } from '../../assets/assets'
import { AppContext } from '../../context/AppContext'
import { NavLink, useLocation } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'

const Sidebar = () => {

  const { isEducator, userData } = useContext(AppContext)
  const { user } = useUser()
  const location = useLocation()
  const hasEducatorAccess = Boolean(
    isEducator ||
    userData?.role === 'educator' ||
    userData?.role === 'admin' ||
    user?.publicMetadata?.role === 'educator' ||
    user?.publicMetadata?.role === 'admin'
  )

  const menuItems = [
    { name: 'Dashboard', path: '/educator', icon: assets.home_icon},
    { name: 'Quản lý khóa học', path: '/educator/my-courses', icon: assets.my_course_icon},
    { name: 'Quản lý bài thi', path: '/educator/manage-quizzes', icon: assets.appointments_icon},
    { name: 'Học viên đã đăng ký', path: '/educator/student-enrolled', icon: assets.person_tick_icon}
  ]

  const isItemActive = (item) => {
    if (item.path === '/educator') {
      return location.pathname === '/educator'
    }
    if (item.path === '/educator/my-courses') {
      return (
        location.pathname === '/educator/my-courses' ||
        location.pathname === '/educator/add-course' ||
        location.pathname.startsWith('/educator/edit-course')
      )
    }
    return location.pathname === item.path
  }

  return hasEducatorAccess &&  (
    <div className='md:w-64 w-16 border-r min-h-screen text-base border-gray-500 py-2 flex flex-col'>
      {menuItems.map((item) => {
        const active = isItemActive(item)
        return (
          <NavLink
          to={item.path}
          key={item.name}
          className={`flex items-center md:flex-row flex-col md:justify-start justify-center py-3.5 md:px-10 gap-3 ${active ? 'bg-blue-50 border-r-[6px] border-blue-500/90': 'hover:bg-gray-100/90 border-r-[6px] border-white hover:border-gray-100/90'}`}
          >
            <img src={item.icon} alt='' className='w-6 h-6' />
            <p className={`md:block hidden ${['Quản lý khóa học', 'Học viên đã đăng ký', 'Quản lý bài thi'].includes(item.name) ? 'text-left w-full' : 'text-center'}`}>{item.name}</p>
          </NavLink>
        )
      })}
    </div>
  )
}

export default Sidebar