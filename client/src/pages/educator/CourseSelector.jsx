import React from 'react'

const CourseSelector = ({ courses, onSelectCourse }) => {
  return (
    <div className='space-y-6'>
      <div className='space-y-2'>
        <h2 className='text-lg font-medium text-gray-800'>Quản lý bài kiểm tra</h2>
        <p className='text-gray-500 text-sm'>
          Chọn một khóa học của bạn dưới đây để bắt đầu thiết kế các bài trắc nghiệm luyện tập và bài kiểm tra cuối khóa.
        </p>
      </div>

      {courses.length === 0 ? (
        <div className='bg-white p-12 text-center rounded-xl border border-gray-200 shadow-sm'>
          <div className='w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100'>
            <svg className='h-8 w-8 text-gray-400' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' />
            </svg>
          </div>
          <p className='text-gray-500 font-semibold mb-1'>Chưa có khóa học nào được tạo</p>
          <p className='text-gray-400 text-xs'>Vui lòng thêm khóa học trong menu trước.</p>
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'>
          {courses.map((course) => (
            <div
              key={course._id}
              onClick={() => onSelectCourse(course._id)}
              className='bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden cursor-pointer flex flex-col group hover:-translate-y-0.5'
            >
              <div className='h-44 bg-gray-50 relative overflow-hidden'>
                <img
                  src={course.courseThumbnail}
                  alt={course.courseTitle}
                  className='w-full h-full object-cover group-hover:scale-102 transition-transform duration-500'
                />
                <div className='absolute top-3 right-3 bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded shadow-sm'>
                  {course.courseTopic}
                </div>
              </div>
              <div className='p-5 flex-1 flex flex-col justify-between space-y-4'>
                <div className='space-y-1.5'>
                  <h3 className='font-bold text-gray-800 line-clamp-2 text-sm md:text-base group-hover:text-blue-600 transition-colors'>
                    {course.courseTitle}
                  </h3>
                  <p className='text-gray-400 text-xs'>
                    Trình độ: <span className='capitalize font-medium text-gray-600'>{course.courseLevel}</span>
                  </p>
                </div>
                <div className='pt-3 flex items-center justify-between border-t border-gray-100 text-xs font-semibold text-blue-600'>
                  <span>Bắt đầu thiết lập</span>
                  <svg className='h-4 w-4 transform group-hover:translate-x-1.5 transition-transform' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M9 5l7 7-7 7' />
                  </svg>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default CourseSelector
