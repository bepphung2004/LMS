import React, { useEffect, useState, useContext } from 'react'
import { dummyStudentEnrolled } from '../../assets/assets'
import Loading from '../../components/student/Loading'
import { AppContext } from '../../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import Pagination from '../../components/Pagination'

const StudentsEnrolled = () => {

  const { backendUrl, getToken, isEducator, userData } = useContext(AppContext)
  const hasEducatorAccess = Boolean(isEducator || userData?.role === 'educator' || userData?.role === 'admin')

  const [enrolledStudents, setEnrolledStudents] = useState(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  
  const fetchEnrolledStudents = async () => {
    try {
      const token = await getToken()
      const { data } = await axios.get(`${backendUrl}/api/educator/enrolled-students?page=${page}&limit=10`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      if (data.success) {
        setEnrolledStudents(data.enrolledStudents)
        setTotalPages(data.pagination.totalPages)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(() => {
    if (hasEducatorAccess) {
      fetchEnrolledStudents()
    }  
  }, [hasEducatorAccess, page])

  return enrolledStudents ? (
    <div className='md:p-8 p-4 pt-8 pb-0'>
      <div className='w-full max-w-5xl text-gray-700 space-y-6 pb-8'>
        <h2 className='text-lg font-medium text-gray-800'>Học viên đã đăng ký</h2>
        <div className='w-full overflow-hidden rounded-xl bg-white border border-gray-200 shadow-sm'>
          <table className='table-fixed md:table-auto w-full overflow-hidden pb-4'>
            <thead className='text-gray-900 border-b border-gray-200 text-sm text-left bg-gray-50'>
              <tr>
                <th className='px-4 py-3 font-semibold text-center hidden sm:table-cell'>#</th>
                <th className='px-4 py-3 font-semibold'>Tên học viên</th>
                <th className='px-4 py-3 font-semibold'>Tên khóa học</th>
                <th className='px-4 py-3 font-semibold hidden sm:table-cell'>Ngày đăng ký</th>
              </tr>
            </thead>
            <tbody className='text-sm text-gray-500'>
              {enrolledStudents.map((item, index) => (
                <tr key={index} className='border-b border-gray-500/20'>
                  <td className='px-4 py-3 text-center hidden sm:table-cell'>{(page - 1) * 10 + index + 1}</td>
                  <td className='md:px-4 px-2 py-3 flex items-center space-x-3'>
                    <img src={item.student?.imageUrl} alt="" className='w-9 h-9 rounded-full'/>
                    <span className='truncate'>{item.student?.name}</span>
                  </td>
                  <td className='px-4 py-3 truncate'>{item.courseTitle}</td>
                  <td className='px-4 py-3 hidden sm:table-cell'>{new Date(item.purchaseDate).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
      </div>
    </div>
  ) : <Loading />
}

export default StudentsEnrolled
