import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../../context/AppContext'
import Loading from '../../components/student/Loading'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'

const MyCourses = () => {

  const { currency, backendUrl, isEducator, getToken } = useContext(AppContext)
  const navigateTo = useNavigate()

  const [courses, setCourses] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const fetchEducatorCourses = async () => {
    try {
      const token = await getToken()
      const { data } = await axios.get(backendUrl + '/api/educator/courses', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      data.success && setCourses(data.courses)
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleDelete = async (courseId, courseTitle) => {
    if (!confirm(`Bạn có chắc muốn xóa khóa học "${courseTitle}"?\n\nLưu ý: Không thể xóa khóa học đã có học viên đăng ký.`)) {
      return
    }

    setDeleting(courseId)
    try {
      const token = await getToken()
      const { data } = await axios.delete(`${backendUrl}/api/educator/course/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (data.success) {
        toast.success(data.message)
        setCourses(courses.filter(c => c._id !== courseId))
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    } finally {
      setDeleting(null)
    }
  }

  const handleTogglePublish = async (courseId) => {
    try {
      const token = await getToken()
      const { data } = await axios.patch(`${backendUrl}/api/educator/course/${courseId}/toggle-publish`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (data.success) {
        toast.success(data.message)
        setCourses(courses.map(c => 
          c._id === courseId ? { ...c, isPublished: data.isPublished } : c
        ))
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    }
  }

  useEffect(() => {
    if ( isEducator ) {
      fetchEducatorCourses()
    }
  }, [isEducator])

  return  courses ? (
    <div className='h-screen flex flex-col items-start justify-between md:p-8 md:pb-0 pt-8 pb-0'>
      <div className='w-full'>
        <div className='flex items-center justify-between mb-4'>
          <h2 className='text-lg font-medium'>Khóa học của tôi</h2>
          <button 
            onClick={() => navigateTo('/educator/add-course')}
            className='bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700'
          >
            + Thêm khóa học
          </button>
        </div>
        <div className='flex flex-col items-center max-w-4xl w-full overflow-hidden rounded-md bg-white border border-gray-500/20'>
          <table className='md:table-auto table-fixed w-full overflow-hidden'>
            <thead className='text-gray-900 border-b boder-gray-500/20 text-sm text-left'>
              <tr>
                <th className='px-4 py-3 font-semibold truncate'>Tên khóa học</th>
                <th className='px-4 py-3 font-semibold truncate'>Doanh thu</th>
                <th className='px-4 py-3 font-semibold truncate'>Học viên</th>
                <th className='px-4 py-3 font-semibold truncate'>Trạng thái</th>
                <th className='px-4 py-3 font-semibold truncate text-center'>Thao tác</th>
              </tr>
            </thead>
            <tbody className='text-sm text-gray-500'>
              {courses.map((course) => (
                <tr key={course._id} className='border-b border-gray-500/20'>
                  <td className='md:px-4 pl-2 md:pl-4 py-3 flex items-center space-x-3 truncate'>
                    <img src={course.courseThumbnail} alt="Course Image" className='w-16 rounded' />
                    <div>
                      <span className='truncate hidden md:block font-medium text-gray-700'>{course.courseTitle}</span>
                      <span className='text-xs text-gray-400'>
                        {new Date(course.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  </td>
                  <td className='px-4 py-3'>
                    {currency} {Math.floor(course.enrolledStudents.length * (course.coursePrice - course.discount * course.coursePrice / 100))}
                  </td>
                  <td className='px-4 py-3'>{course.enrolledStudents.length}</td>
                  <td className='px-4 py-3'>
                    <button
                      onClick={() => handleTogglePublish(course._id)}
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        course.isPublished 
                          ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {course.isPublished ? 'Đang hiển thị' : 'Đã ẩn'}
                    </button>
                  </td>
                  <td className='px-4 py-3'>
                    <div className='flex items-center justify-center gap-2'>
                      <button
                        onClick={() => navigateTo(`/educator/edit-course/${course._id}`)}
                        className='px-3 py-1 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 text-xs font-medium'
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleDelete(course._id, course.courseTitle)}
                        disabled={deleting === course._id || course.enrolledStudents.length > 0}
                        className={`px-3 py-1 rounded text-xs font-medium ${
                          course.enrolledStudents.length > 0
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-red-100 text-red-600 hover:bg-red-200'
                        }`}
                        title={course.enrolledStudents.length > 0 ? 'Không thể xóa khóa học đã có học viên' : 'Xóa khóa học'}
                      >
                        {deleting === course._id ? '...' : 'Xóa'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {courses.length === 0 && (
            <div className='py-10 text-center text-gray-500'>
              <p>Bạn chưa có khóa học nào.</p>
              <button 
                onClick={() => navigateTo('/educator/add-course')}
                className='mt-4 text-blue-600 hover:underline'
              >
                Tạo khóa học đầu tiên →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  ) : <Loading />
}

export default MyCourses