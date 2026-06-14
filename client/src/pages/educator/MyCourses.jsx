import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../../context/AppContext'
import Loading from '../../components/student/Loading'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useNavigate } from 'react-router-dom'
import Pagination from '../../components/Pagination'

const MyCourses = () => {

  const { formatCurrency, backendUrl, isEducator, getToken, userData } = useContext(AppContext)
  const hasEducatorAccess = Boolean(isEducator || userData?.role === 'educator' || userData?.role === 'admin')
  const navigateTo = useNavigate()

  const [courses, setCourses] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchEducatorCourses = async () => {
    try {
      const token = await getToken()
      const { data } = await axios.get(`${backendUrl}/api/educator/courses?page=${page}&limit=10`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      if (data.success) {
        setCourses(data.courses)
        setTotalPages(data.pagination.totalPages)
      }
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
    if ( hasEducatorAccess ) {
      fetchEducatorCourses()
    }
  }, [hasEducatorAccess, page])

  return  courses ? (
    <div className='md:p-8 p-4 pt-8 pb-0'>
      <div className='w-full max-w-5xl text-gray-700 space-y-6 pb-8'>
        <div className='flex items-center justify-between'>
          <h2 className='text-lg font-medium text-gray-800'>Quản lý khóa học</h2>
          <button
            onClick={() => navigateTo('/educator/add-course')}
            className='bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700'
          >
            + Thêm khóa học
          </button>
        </div>
        <div className='w-full overflow-x-auto rounded-xl bg-white border border-gray-200 shadow-sm'>
          <table className='w-full table-auto'>
            <thead className='text-gray-900 border-b border-gray-200 text-sm text-left bg-gray-50'>
              <tr>
                <th className='px-4 py-3 font-semibold whitespace-nowrap'>Tên khóa học</th>
                <th className='px-4 py-3 font-semibold whitespace-nowrap'>Doanh thu</th>
                <th className='px-4 py-3 font-semibold whitespace-nowrap'>Học viên</th>
                <th className='px-4 py-3 font-semibold whitespace-nowrap'>Trạng thái</th>
                <th className='px-4 py-3 font-semibold whitespace-nowrap text-center'>Thao tác</th>
              </tr>
            </thead>
            <tbody className='text-sm text-gray-500'>
              {courses.map((course) => (
                <tr key={course._id} className='border-b border-gray-500/20 hover:bg-gray-50/50 transition-colors'>
                  <td className='md:px-4 pl-2 md:pl-4 py-3 flex items-center space-x-3 min-w-[220px] md:min-w-[300px]'>
                    <img src={course.courseThumbnail} alt="Course Image" className='w-16 h-10 object-cover rounded flex-shrink-0' />
                    <div>
                      <span className='font-medium text-gray-700 block text-sm leading-snug break-words'>{course.courseTitle}</span>
                      <span className='text-xs text-gray-400 block mt-0.5'>
                        {new Date(course.createdAt).toLocaleDateString('vi-VN')}
                      </span>
                    </div>
                  </td>
                  <td className='px-4 py-3 whitespace-nowrap'>
                    {formatCurrency(course.enrolledStudents.length * (course.coursePrice - course.discount * course.coursePrice / 100))}
                  </td>
                  <td className='px-4 py-3 whitespace-nowrap'>{course.enrolledStudents.length}</td>
                  <td className='px-4 py-3 whitespace-nowrap'>
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
                  <td className='px-4 py-3 whitespace-nowrap'>
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
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  ) : <Loading />
}

export default MyCourses
