import React, { useContext, useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { AppContext } from '../../context/AppContext'
import Loading from '../../components/student/Loading'
import Pagination from '../../components/Pagination'

const AdminCourses = () => {
  const { backendUrl, getToken, formatCurrency } = useContext(AppContext)
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [visibilityCounts, setVisibilityCounts] = useState({ all: 0, true: 0, false: 0 })
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchCourses = async () => {
    try {
      const token = await getToken()
      const { data } = await axios.get(
        `${backendUrl}/api/admin/courses?isPublished=${filter}&search=${search}&page=${page}&limit=10`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (data.success) {
        setCourses(data.courses)
        setTotalPages(data.pagination.totalPages)
        setVisibilityCounts(data.visibilityCounts)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCourses()
  }, [filter, page])

  const handleDelete = async (courseId, courseTitle) => {
    if (!confirm(`Bạn có chắc muốn xóa khóa học "${courseTitle}"?\n\nHành động này không thể hoàn tác!`)) return
    try {
      const token = await getToken()
      const { data } = await axios.delete(`${backendUrl}/api/admin/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (data.success) {
        toast.success(data.message)
        setCourses(prev => {
          const deletedCourse = prev.find(c => c._id === courseId)
          if (deletedCourse) {
            setVisibilityCounts(counts => ({
              ...counts,
              all: counts.all - 1,
              true: deletedCourse.isPublished ? counts.true - 1 : counts.true,
              false: !deletedCourse.isPublished ? counts.false - 1 : counts.false
            }))
          }
          return prev.filter(c => c._id !== courseId)
        })
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    }
  }

  const handleToggleVisibility = async (courseId, isPublished, courseTitle) => {
    const actionLabel = isPublished ? 'ẩn' : 'bỏ ẩn'
    if (!confirm(`Bạn có chắc muốn ${actionLabel} khóa học "${courseTitle}"?`)) return
    try {
      const token = await getToken()
      const { data } = await axios.patch(
        `${backendUrl}/api/admin/courses/${courseId}/toggle-visibility`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (data.success) {
        toast.success(data.message)
        setCourses(prev => {
          const updated = prev.map(course => (course._id === courseId ? { ...course, isPublished: data.isPublished } : course))
          if (filter !== 'all' && String(data.isPublished) !== filter) {
            return updated.filter(c => c._id !== courseId)
          }
          return updated
        })
        setVisibilityCounts(counts => ({
          ...counts,
          true: data.isPublished ? counts.true + 1 : counts.true - 1,
          false: data.isPublished ? counts.false - 1 : counts.false + 1
        }))
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setLoading(true)
    if (page === 1) {
      fetchCourses()
    } else {
      setPage(1)
    }
  }

  if (loading) return <Loading />

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-6'>Quản lý khóa học</h1>

      <div className='flex flex-wrap gap-4 mb-6'>
        <div className='flex gap-2'>
          {[
            { value: 'all', label: 'Tất cả' },
            { value: 'true', label: 'Đang hiển thị' },
            { value: 'false', label: 'Đã ẩn' }
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => { setFilter(tab.value); setPage(1); setLoading(true) }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === tab.value ? 'bg-blue-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <span className='inline-flex items-center gap-2'>
                {tab.label}
                <span className={`px-1.5 py-0.5 rounded-md text-[11px] ${filter === tab.value ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                  {visibilityCounts[tab.value] ?? 0}
                </span>
              </span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSearch} className='flex gap-2'>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder='Tìm kiếm theo tên khóa học...'
            className='px-4 py-2 border rounded-lg w-64'
          />
          <button type='submit' className='px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200'>Tìm</button>
        </form>
      </div>

      <div className='bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden'>
        <div className='overflow-x-auto rounded-xl'>
        <table className='w-full'>
          <thead className='bg-gray-50 border-b'>
            <tr>
              <th className='px-4 py-3 text-left text-sm font-medium text-gray-600'>Khóa học</th>
              <th className='px-4 py-3 text-left text-sm font-medium text-gray-600'>Giảng viên</th>
              <th className='px-4 py-3 text-left text-sm font-medium text-gray-600'>Giá</th>
              <th className='px-4 py-3 text-left text-sm font-medium text-gray-600'>Học viên</th>
              <th className='px-4 py-3 text-left text-sm font-medium text-gray-600'>Trạng thái</th>
              <th className='px-4 py-3 text-center text-sm font-medium text-gray-600'>Thao tác</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-100'>
            {courses.map(course => (
              <tr key={course._id} className='hover:bg-gray-50'>
                <td className='px-4 py-3'>
                  <div className='flex items-center gap-3'>
                    <img src={course.courseThumbnail} alt="" className='w-16 h-10 object-cover rounded' />
                    <div>
                      <p className='font-medium text-gray-800 line-clamp-1'>{course.courseTitle}</p>
                      <p className='text-xs text-gray-500'>{new Date(course.createdAt).toLocaleDateString('vi-VN')}</p>
                    </div>
                  </div>
                </td>
                <td className='px-4 py-3'>
                  <div className='flex items-center gap-2'>
                    <img src={course.educator?.imageUrl} alt="" className='w-6 h-6 rounded-full' />
                    <span className='text-sm text-gray-600'>{course.educator?.name}</span>
                  </div>
                </td>
                <td className='px-4 py-3 text-sm font-medium'>
                  {formatCurrency(course.coursePrice - course.coursePrice * (course.discount || 0) / 100)}
                </td>
                <td className='px-4 py-3 text-sm text-gray-600'>{course.enrolledStudents?.length || 0}</td>
                <td className='px-4 py-3'>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    course.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {course.isPublished ? 'Hiển thị' : 'Đã ẩn'}
                  </span>
                </td>
                <td className='px-4 py-3 text-center'>
                  <div className='flex items-center justify-center gap-3'>
                    <button onClick={() => handleToggleVisibility(course._id, course.isPublished, course.courseTitle)} className='text-sm font-medium text-amber-600 hover:text-amber-700'>
                      {course.isPublished ? 'Ẩn' : 'Bỏ ẩn'}
                    </button>
                    <button onClick={() => handleDelete(course._id, course.courseTitle)} className='text-red-600 hover:text-red-700 text-sm font-medium'>
                      Xóa
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {courses.length === 0 && (
              <tr>
                <td colSpan={6} className='px-4 py-8 text-center text-gray-500'>Không tìm thấy khóa học</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </div>
  )
}

export default AdminCourses
