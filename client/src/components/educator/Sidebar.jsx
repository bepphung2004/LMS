import React, { useContext } from 'react'
import { assets } from '../../assets/assets'
import { AppContext } from '../../context/AppContext'
import { NavLink } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'

const Sidebar = () => {

  const { isEducator, userData } = useContext(AppContext)
  const { user } = useUser()
  const hasEducatorAccess = Boolean(
    isEducator ||
    userData?.role === 'educator' ||
    userData?.role === 'admin' ||
    user?.publicMetadata?.role === 'educator' ||
    user?.publicMetadata?.role === 'admin'
  )

  const menuItems = [
    { name: 'Dashboard', path: '/educator', icon: assets.home_icon},
    { name: 'Thêm khóa học', path: '/educator/add-course', icon: assets.add_icon},
    { name: 'Khóa học của tôi', path: '/educator/my-courses', icon: assets.my_course_icon},
    { name: 'Quản lý bài thi', path: '/educator/manage-quizzes', icon: assets.appointments_icon},
    { name: 'Học viên đã đăng ký', path: '/educator/student-enrolled', icon: assets.person_tick_icon}
  ]

  return hasEducatorAccess &&  (
    <div className='md:w-64 w-16 border-r min-h-screen text-base border-gray-500 py-2 flex flex-col'>
      {menuItems.map((item) => (
        <NavLink
        to={item.path}
        key={item.name}
        end={item.path === '/educator'}
        className={({isActive}) => `flex items-center md:flex-row flex-col md:justify-start justify-center py-3.5 md:px-10 gap-3 ${isActive ? 'bg-blue-50 border-r-[6px] border-blue-500/90': 'hover:bg-gray-100/90 border-r-[6px] border-white hover:border-gray-100/90'}`}
        >
          <img src={item.icon} alt='' className='w-6 h-6' />
          <p className={`md:block hidden ${['Khóa học của tôi', 'Học viên đã đăng ký', 'Quản lý bài thi'].includes(item.name) ? 'text-left w-full' : 'text-center'}`}>{item.name}</p>
        </NavLink>
      ))}
    </div>
  )
}

export default Sidebar