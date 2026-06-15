import React, { useContext, useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { AppContext } from '../../context/AppContext'
import Loading from '../../components/student/Loading'
import Pagination from '../../components/Pagination'

const AdminUsers = () => {
  const { backendUrl, getToken } = useContext(AppContext)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [roleCounts, setRoleCounts] = useState({ all: 0, student: 0, educator: 0, admin: 0 })
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchUsers = async () => {
    try {
      const token = await getToken()
      const { data } = await axios.get(
        `${backendUrl}/api/admin/users?role=${filter}&search=${search}&page=${page}&limit=10`,
        { headers: { Authorization: `Bearer ${token}` } }
      )

      if (data.success) {
        setUsers(data.users)
        setTotalPages(data.pagination.totalPages)
        setRoleCounts(data.roleCounts)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [filter, page])

  const handleUnbanUser = async (userId, userName) => {
    if (!confirm(`Bạn có chắc muốn bỏ khóa tài khoản "${userName}"?`)) return
    try {
      const token = await getToken()
      const { data } = await axios.patch(`${backendUrl}/api/admin/users/${userId}/unban`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (data.success) {
        toast.success(data.message)
        setUsers(prev => prev.map(user => user._id === userId ? { ...user, isBanned: false } : user))
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    }
  }

  const handleBanUser = async (userId, userName) => {
    if (!confirm(`Bạn có chắc muốn khóa tài khoản "${userName}"?`)) return
    try {
      const token = await getToken()
      const { data } = await axios.patch(`${backendUrl}/api/admin/users/${userId}/ban`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (data.success) {
        toast.success(data.message)
        setUsers(prev => prev.map(user => user._id === userId ? { ...user, isBanned: true } : user))
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setLoading(true)
    if (page === 1) {
      fetchUsers()
    } else {
      setPage(1)
    }
  }

  if (loading) return <Loading />

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-6'>Quản lý người dùng</h1>

      <div className='flex flex-wrap gap-4 mb-6'>
        <div className='flex gap-2'>
          {[
            { value: 'all', label: 'Tất cả' },
            { value: 'student', label: 'Học viên' },
            { value: 'educator', label: 'Giảng viên' },
            { value: 'admin', label: 'Admin' }
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
                  {roleCounts[tab.value] ?? 0}
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
            placeholder='Tìm kiếm theo tên hoặc email...'
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
              <th className='px-4 py-3 text-left text-sm font-medium text-gray-600'>Người dùng</th>
              <th className='px-4 py-3 text-left text-sm font-medium text-gray-600'>Email</th>
              <th className='px-4 py-3 text-left text-sm font-medium text-gray-600'>Vai trò</th>
              <th className='px-4 py-3 text-left text-sm font-medium text-gray-600'>Trạng thái</th>
              <th className='px-4 py-3 text-left text-sm font-medium text-gray-600'>Ngày tham gia</th>
              <th className='px-4 py-3 text-center text-sm font-medium text-gray-600'>Thao tác</th>
            </tr>
          </thead>
          <tbody className='divide-y divide-gray-100'>
            {users.map(user => (
              <tr key={user._id} className='hover:bg-gray-50'>
                <td className='px-4 py-3'>
                  <div className='flex items-center gap-3'>
                    <img src={user.imageUrl} alt="" className='w-10 h-10 rounded-full' />
                    <span className='font-medium text-gray-800'>{user.name}</span>
                  </div>
                </td>
                <td className='px-4 py-3 text-sm text-gray-600'>{user.email}</td>
                <td className='px-4 py-3'>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    user.role === 'admin' ? 'bg-red-100 text-red-700' :
                    user.role === 'educator' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {user.role === 'admin' ? 'Admin' : user.role === 'educator' ? 'Giảng viên' : 'Học viên'}
                  </span>
                </td>
                <td className='px-4 py-3'>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    user.isBanned ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {user.isBanned ? 'Đã bị khóa' : 'Đang hoạt động'}
                  </span>
                </td>
                <td className='px-4 py-3 text-sm text-gray-500'>{new Date(user.createdAt).toLocaleDateString('vi-VN')}</td>
                <td className='px-4 py-3 text-center'>
                  {['student', 'educator'].includes(user.role) ? (
                    user.isBanned ? (
                       <button onClick={() => handleUnbanUser(user._id, user.name)} className='text-sm font-medium px-3 py-1.5 rounded-lg transition-colors bg-emerald-50 text-emerald-700 hover:bg-emerald-100'>
                        Bỏ khóa
                      </button>
                    ) : (
                      <button onClick={() => handleBanUser(user._id, user.name)} className='text-sm font-medium px-3 py-1.5 rounded-lg transition-colors bg-red-50 text-red-600 hover:bg-red-100'>
                        Khóa tài khoản
                      </button>
                    )
                  ) : (
                    <span className='text-sm text-gray-400'>Không áp dụng</span>
                  )}
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={6} className='px-4 py-8 text-center text-gray-500'>Không tìm thấy người dùng</td>
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

export default AdminUsers
