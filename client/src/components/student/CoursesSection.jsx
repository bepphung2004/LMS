import React, { useContext } from 'react'
import { Link } from 'react-router-dom'
import CourseCard from './CourseCard'
import { AppContext } from '../../context/AppContext'


const CoursesSection = () => {

  const { allCourses } = useContext(AppContext)

  return (
    <div className='py-16 md:px-40 px-8'>
      <h2 className='text-3xl font-medium text-gray-800'>Học hỏi từ những chuyên gia hàng đầu</h2>
      <p className='text-sm md:text-base text-gray-500 mt-3'>Khám phá các khóa học được đánh giá cao nhất thuộc nhiều lĩnh vực khác nhau. Từ lập trình, thiết kế đến kinh doanh và phát triển bản thân, các khóa học của chúng tôi được xây dựng để mang lại hiệu quả thực tiễn.</p>

      <div className='grid grid-cols-auto px-4 md:px-0 md:my-16 my-10 gap-4'>
        {allCourses.slice(0, 4).map((course, index) => <CourseCard key={index} course={course}/> )}
      </div>

      <Link to={'/course-list'} onClick={() => scrollTo(0,0)} className='text-gray-500 border border-gray-500/30 px-10 py-3 rounded'>Xem tất cả khóa học</Link>

    </div>
  )
}

export default CoursesSection