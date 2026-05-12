import React from 'react'
import { assets } from '../../assets/assets'
import { AppContext } from '../../context/AppContext'
import { useContext } from 'react'
import { Link } from 'react-router-dom'

const CourseCard = ({ course, isAiRecommended = false }) => {

  const { calculateRating, formatCurrency } = useContext(AppContext)

  // Handle missing educator (deleted user)
  if (!course || !course.educator) {
    return null // Don't render card if educator is missing
  }

  return (
    <Link to={'/course/' + course._id} onClick={() => scrollTo(0, 0)} className={`border pb-6 overflow-hidden rounded-lg transition-all hover:shadow-md ${isAiRecommended ? 'border-blue-300 ring-1 ring-blue-100' : 'border-gray-500/30'}`}>
      <div className='relative'>
        <img className='w-full' src={course.courseThumbnail} alt='' />
        {isAiRecommended && (
          <span className='absolute top-2 right-2 text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-full font-medium shadow-sm'>
            ✨ AI Đề xuất
          </span>
        )}
      </div>
      <div className='p-3 text-left'>
        <h3 className='text-base font-semibold'>{course.courseTitle}</h3>
        <p className='text-gray-500'>{course.educator?.name || 'Unknown Educator'}</p>
        <div className='flex items-center space-x-2'>
          <p>{calculateRating(course)}</p>
          <div className='flex'>
            {[...Array(5)].map((_, i) => (<img className='w-3.5 h-3.5' key={i} src={i < Math.floor(calculateRating(course)) ? assets.star : assets.star_blank} alt='' />))}
          </div>
          <p className='text-gray-500'>{course.courseRatings?.length || 0} đánh giá</p>
        </div>
        <p className='text-base font-semibold text-gray-800'>{formatCurrency(course.coursePrice - course.discount * course.coursePrice / 100)}</p>
      </div>
    </Link>
  )
}

export default CourseCard
