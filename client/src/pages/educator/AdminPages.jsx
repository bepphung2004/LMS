import React, { useContext, useEffect, useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { AppContext } from '../../context/AppContext'
import Loading from '../../components/student/Loading'
import axios from 'axios'
import { toast } from 'react-toastify'

// Admin Layout Component
const AdminLayout = () => {
  const { user } = useUser()
  const navigate = useNavigate()
  const location = useLocation()
  const { backendUrl, getToken } = useContext(AppContext)
  const [authorized, setAuthorized] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    if (user) {
      if (user.publicMetadata?.role === 'admin') {
        setAuthorized(true)
      } else {
        toast.error('Bạn không có quyền truy cập trang này')
        navigate('/')
      }
      setChecking(false)
    }
  }, [user])

  if (checking) return <Loading />
  if (!authorized) return null

  const menuItems = [
    { path: '/admin', label: 'Dashboard', icon: '📊', exact: true },
    { path: '/admin/applications', label: 'Duyệt giảng viên', icon: '👨‍🏫' },
    { path: '/admin/users', label: 'Quản lý người dùng', icon: '👥' },
    { path: '/admin/courses', label: 'Quản lý khóa học', icon: '📚' },
  ]

  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path
    return location.pathname.startsWith(path)
  }

  return (
    <div className='min-h-screen bg-gray-100'>
      {/* Header */}
      <header className='bg-white shadow-sm border-b'>
        <div className='flex items-center justify-between px-6 py-4'>
          <div className='flex items-center gap-4'>
            <Link to='/' className='text-xl font-bold text-blue-600'>LMS</Link>
            <span className='bg-red-100 text-red-600 px-2 py-1 rounded text-sm font-medium'>Admin Panel</span>
          </div>
          <div className='flex items-center gap-4'>
            <Link to='/' className='text-gray-500 hover:text-gray-700 text-sm'>
              ← Về trang chủ
            </Link>
            <span className='text-gray-600'>{user?.fullName}</span>
            <img 
              src={user?.imageUrl} 
              alt="" 
              className='w-8 h-8 rounded-full'
            />
          </div>
        </div>
      </header>

      <div className='flex'>
        {/* Sidebar */}
        <aside className='w-64 bg-white min-h-[calc(100vh-65px)] shadow-sm'>
          <nav className='p-4'>
            {menuItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg mb-1 transition-colors ${
                  isActive(item.path, item.exact)
                    ? 'bg-blue-50 text-blue-600 font-medium'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className='flex-1 p-6'>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

// Admin Dashboard Component
export const AdminDashboard = () => {
  const { backendUrl, getToken } = useContext(AppContext)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const token = await getToken()
        const { data: result } = await axios.get(`${backendUrl}/api/admin/dashboard`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (result.success) {
          setData(result.data)
        }
      } catch (error) {
        toast.error(error.response?.data?.message || error.message)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboard()
  }, [])

  if (loading) return <Loading />

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-6'>Dashboard</h1>
      
      {/* Stats Cards */}
      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8'>
        <div className='bg-white p-6 rounded-lg shadow-sm border'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-gray-500 text-sm'>Tổng người dùng</p>
              <p className='text-2xl font-bold text-gray-800'>{data?.totalUsers || 0}</p>
            </div>
            <span className='text-3xl'>👥</span>
          </div>
        </div>
        
        <div className='bg-white p-6 rounded-lg shadow-sm border'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-gray-500 text-sm'>Tổng khóa học</p>
              <p className='text-2xl font-bold text-gray-800'>{data?.totalCourses || 0}</p>
            </div>
            <span className='text-3xl'>📚</span>
          </div>
        </div>
        
        <div className='bg-white p-6 rounded-lg shadow-sm border'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-gray-500 text-sm'>Giảng viên</p>
              <p className='text-2xl font-bold text-gray-800'>{data?.totalEducators || 0}</p>
            </div>
            <span className='text-3xl'>👨‍🏫</span>
          </div>
        </div>
        
        <div className='bg-white p-6 rounded-lg shadow-sm border border-yellow-200 bg-yellow-50'>
          <div className='flex items-center justify-between'>
            <div>
              <p className='text-yellow-700 text-sm'>Đơn chờ duyệt</p>
              <p className='text-2xl font-bold text-yellow-800'>{data?.pendingApplications || 0}</p>
            </div>
            <Link to='/admin/applications' className='text-yellow-600 hover:text-yellow-700 text-sm'>
              Xem →
            </Link>
          </div>
        </div>
      </div>

      {/* Revenue */}
      <div className='bg-white p-6 rounded-lg shadow-sm border mb-8'>
        <h2 className='text-lg font-semibold mb-2'>Tổng doanh thu</h2>
        <p className='text-3xl font-bold text-green-600'>
          ${data?.totalRevenue?.toFixed(2) || '0.00'}
        </p>
      </div>

      {/* Recent Enrollments */}
      <div className='bg-white rounded-lg shadow-sm border'>
        <div className='p-4 border-b'>
          <h2 className='text-lg font-semibold'>Đăng ký gần đây</h2>
        </div>
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead className='bg-gray-50'>
              <tr>
                <th className='px-4 py-3 text-left text-sm font-medium text-gray-600'>Học viên</th>
                <th className='px-4 py-3 text-left text-sm font-medium text-gray-600'>Khóa học</th>
                <th className='px-4 py-3 text-left text-sm font-medium text-gray-600'>Ngày</th>
              </tr>
            </thead>
            <tbody className='divide-y'>
              {data?.recentEnrollments?.map((item, index) => (
                <tr key={index}>
                  <td className='px-4 py-3'>
                    <div className='flex items-center gap-2'>
                      <img src={item.userId?.imageUrl} alt="" className='w-8 h-8 rounded-full' />
                      <span className='text-sm'>{item.userId?.name}</span>
                    </div>
                  </td>
                  <td className='px-4 py-3 text-sm text-gray-600'>{item.courseId?.courseTitle}</td>
                  <td className='px-4 py-3 text-sm text-gray-500'>
                    {new Date(item.createdAt).toLocaleDateString('vi-VN')}
                  </td>
                </tr>
              ))}
              {(!data?.recentEnrollments || data.recentEnrollments.length === 0) && (
                <tr>
                  <td colSpan={3} className='px-4 py-8 text-center text-gray-500'>
                    Chưa có đăng ký nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// Applications Management
export const AdminApplications = () => {
  const { backendUrl, getToken } = useContext(AppContext)
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [selectedApp, setSelectedApp] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [processing, setProcessing] = useState(false)

  const fetchApplications = async () => {
    try {
      const token = await getToken()
      const { data } = await axios.get(`${backendUrl}/api/admin/applications?status=${filter}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (data.success) {
        setApplications(data.applications)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchApplications()
  }, [filter])

  const handleApprove = async (appId) => {
    if (!confirm('Bạn có chắc muốn duyệt đơn đăng ký này?')) return
    
    setProcessing(true)
    try {
      const token = await getToken()
      const { data } = await axios.post(`${backendUrl}/api/admin/applications/${appId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (data.success) {
        toast.success(data.message)
        fetchApplications()
        setSelectedApp(null)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    } finally {
      setProcessing(false)
    }
  }

  const handleReject = async (appId) => {
    if (!rejectionReason.trim()) {
      toast.error('Vui lòng nhập lý do từ chối')
      return
    }
    
    setProcessing(true)
    try {
      const token = await getToken()
      const { data } = await axios.post(`${backendUrl}/api/admin/applications/${appId}/reject`, 
        { reason: rejectionReason },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (data.success) {
        toast.success(data.message)
        fetchApplications()
        setSelectedApp(null)
        setRejectionReason('')
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    } finally {
      setProcessing(false)
    }
  }

  if (loading) return <Loading />

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-6'>Duyệt đơn đăng ký giảng viên</h1>
      
      {/* Filter Tabs */}
      <div className='flex gap-2 mb-6'>
        {[
          { value: 'pending', label: 'Chờ duyệt' },
          { value: 'approved', label: 'Đã duyệt' },
          { value: 'rejected', label: 'Đã từ chối' },
          { value: 'all', label: 'Tất cả' }
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => { setFilter(tab.value); setLoading(true) }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === tab.value
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-600 hover:bg-gray-50 border'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Applications List */}
      <div className='bg-white rounded-lg shadow-sm border'>
        <table className='w-full'>
          <thead className='bg-gray-50 border-b'>
            <tr>
              <th className='px-4 py-3 text-left text-sm font-medium text-gray-600'>Ứng viên</th>
              <th className='px-4 py-3 text-left text-sm font-medium text-gray-600'>Chuyên môn</th>
              <th className='px-4 py-3 text-left text-sm font-medium text-gray-600'>Ngày nộp</th>
              <th className='px-4 py-3 text-left text-sm font-medium text-gray-600'>Trạng thái</th>
              <th className='px-4 py-3 text-center text-sm font-medium text-gray-600'>Thao tác</th>
            </tr>
          </thead>
          <tbody className='divide-y'>
            {applications.map(app => (
              <tr key={app._id} className='hover:bg-gray-50'>
                <td className='px-4 py-3'>
                  <div className='flex items-center gap-3'>
                    <img src={app.userId?.imageUrl} alt="" className='w-10 h-10 rounded-full' />
                    <div>
                      <p className='font-medium text-gray-800'>{app.fullName}</p>
                      <p className='text-sm text-gray-500'>{app.email}</p>
                    </div>
                  </div>
                </td>
                <td className='px-4 py-3 text-sm text-gray-600'>{app.expertise}</td>
                <td className='px-4 py-3 text-sm text-gray-500'>
                  {new Date(app.createdAt).toLocaleDateString('vi-VN')}
                </td>
                <td className='px-4 py-3'>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    app.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    app.status === 'approved' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {app.status === 'pending' ? 'Chờ duyệt' :
                     app.status === 'approved' ? 'Đã duyệt' : 'Đã từ chối'}
                  </span>
                </td>
                <td className='px-4 py-3 text-center'>
                  <button
                    onClick={() => setSelectedApp(app)}
                    className='text-blue-600 hover:text-blue-700 text-sm font-medium'
                  >
                    Xem chi tiết
                  </button>
                </td>
              </tr>
            ))}
            {applications.length === 0 && (
              <tr>
                <td colSpan={5} className='px-4 py-8 text-center text-gray-500'>
                  Không có đơn đăng ký nào
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Application Detail Modal */}
      {selectedApp && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto'>
            <div className='p-6 border-b sticky top-0 bg-white'>
              <div className='flex items-center justify-between'>
                <h2 className='text-xl font-bold'>Chi tiết đơn đăng ký</h2>
                <button onClick={() => setSelectedApp(null)} className='text-gray-400 hover:text-gray-600'>
                  ✕
                </button>
              </div>
            </div>
            
            <div className='p-6 space-y-6'>
              {/* Personal Info */}
              <div>
                <h3 className='font-semibold text-gray-800 mb-3'>Thông tin cá nhân</h3>
                <div className='grid grid-cols-2 gap-4 text-sm'>
                  <div>
                    <p className='text-gray-500'>Họ tên</p>
                    <p className='font-medium'>{selectedApp.fullName}</p>
                  </div>
                  <div>
                    <p className='text-gray-500'>Email</p>
                    <p className='font-medium'>{selectedApp.email}</p>
                  </div>
                  <div>
                    <p className='text-gray-500'>Điện thoại</p>
                    <p className='font-medium'>{selectedApp.phone}</p>
                  </div>
                </div>
              </div>

              {/* Professional Info */}
              <div>
                <h3 className='font-semibold text-gray-800 mb-3'>Thông tin chuyên môn</h3>
                <div className='space-y-3 text-sm'>
                  <div>
                    <p className='text-gray-500'>Lĩnh vực chuyên môn</p>
                    <p className='font-medium'>{selectedApp.expertise}</p>
                  </div>
                  <div>
                    <p className='text-gray-500'>Kinh nghiệm</p>
                    <p className='whitespace-pre-wrap'>{selectedApp.experience}</p>
                  </div>
                  <div>
                    <p className='text-gray-500'>Bằng cấp / Chứng chỉ</p>
                    <p className='whitespace-pre-wrap'>{selectedApp.qualification}</p>
                  </div>
                  {selectedApp.linkedinUrl && (
                    <div>
                      <p className='text-gray-500'>LinkedIn</p>
                      <a href={selectedApp.linkedinUrl} target='_blank' className='text-blue-600 hover:underline'>
                        {selectedApp.linkedinUrl}
                      </a>
                    </div>
                  )}
                  {selectedApp.portfolioUrl && (
                    <div>
                      <p className='text-gray-500'>Portfolio</p>
                      <a href={selectedApp.portfolioUrl} target='_blank' className='text-blue-600 hover:underline'>
                        {selectedApp.portfolioUrl}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Teaching Info */}
              <div>
                <h3 className='font-semibold text-gray-800 mb-3'>Kế hoạch giảng dạy</h3>
                <div className='space-y-3 text-sm'>
                  <div>
                    <p className='text-gray-500'>Chủ đề muốn dạy</p>
                    <p className='whitespace-pre-wrap'>{selectedApp.courseTopics}</p>
                  </div>
                  <div>
                    <p className='text-gray-500'>Phương pháp giảng dạy</p>
                    <p className='whitespace-pre-wrap'>{selectedApp.teachingApproach}</p>
                  </div>
                  {selectedApp.sampleVideoUrl && (
                    <div>
                      <p className='text-gray-500'>Video mẫu</p>
                      <a href={selectedApp.sampleVideoUrl} target='_blank' className='text-blue-600 hover:underline'>
                        Xem video →
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Documents */}
              {(selectedApp.cvUrl || selectedApp.certificatesUrl?.length > 0) && (
                <div>
                  <h3 className='font-semibold text-gray-800 mb-3'>Tài liệu đính kèm</h3>
                  <div className='flex flex-wrap gap-2'>
                    {selectedApp.cvUrl && (
                      <a 
                        href={selectedApp.cvUrl} 
                        target='_blank'
                        className='px-3 py-1 bg-gray-100 rounded text-sm hover:bg-gray-200'
                      >
                        📄 CV
                      </a>
                    )}
                    {selectedApp.certificatesUrl?.map((url, idx) => (
                      <a 
                        key={idx}
                        href={url} 
                        target='_blank'
                        className='px-3 py-1 bg-gray-100 rounded text-sm hover:bg-gray-200'
                      >
                        📜 Chứng chỉ {idx + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions for pending applications */}
              {selectedApp.status === 'pending' && (
                <div className='border-t pt-6'>
                  <div className='mb-4'>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                      Lý do từ chối (nếu từ chối)
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={3}
                      className='w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500'
                      placeholder='Nhập lý do nếu muốn từ chối...'
                    />
                  </div>
                  <div className='flex gap-3'>
                    <button
                      onClick={() => handleApprove(selectedApp._id)}
                      disabled={processing}
                      className='flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:bg-green-400'
                    >
                      {processing ? 'Đang xử lý...' : '✓ Duyệt đơn'}
                    </button>
                    <button
                      onClick={() => handleReject(selectedApp._id)}
                      disabled={processing}
                      className='flex-1 bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 disabled:bg-red-400'
                    >
                      {processing ? 'Đang xử lý...' : '✕ Từ chối'}
                    </button>
                  </div>
                </div>
              )}

              {/* Show rejection reason for rejected applications */}
              {selectedApp.status === 'rejected' && selectedApp.rejectionReason && (
                <div className='bg-red-50 p-4 rounded-lg'>
                  <p className='font-medium text-red-800 mb-1'>Lý do từ chối:</p>
                  <p className='text-red-700'>{selectedApp.rejectionReason}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Users Management
export const AdminUsers = () => {
  const { backendUrl, getToken } = useContext(AppContext)
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const fetchUsers = async () => {
    try {
      const token = await getToken()
      const { data } = await axios.get(`${backendUrl}/api/admin/users?role=${filter}&search=${search}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (data.success) {
        setUsers(data.users)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [filter])

  const handleRoleChange = async (userId, newRole) => {
    if (!confirm(`Bạn có chắc muốn thay đổi vai trò người dùng này thành ${newRole}?`)) return
    
    try {
      const token = await getToken()
      const { data } = await axios.patch(`${backendUrl}/api/admin/users/${userId}/role`, 
        { role: newRole },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (data.success) {
        toast.success(data.message)
        fetchUsers()
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setLoading(true)
    fetchUsers()
  }

  if (loading) return <Loading />

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-6'>Quản lý người dùng</h1>
      
      {/* Filters */}
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
              onClick={() => { setFilter(tab.value); setLoading(true) }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === tab.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border'
              }`}
            >
              {tab.label}
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
          <button type='submit' className='px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200'>
            Tìm
          </button>
        </form>
      </div>

      {/* Users Table */}
      <div className='bg-white rounded-lg shadow-sm border'>
        <table className='w-full'>
          <thead className='bg-gray-50 border-b'>
            <tr>
              <th className='px-4 py-3 text-left text-sm font-medium text-gray-600'>Người dùng</th>
              <th className='px-4 py-3 text-left text-sm font-medium text-gray-600'>Email</th>
              <th className='px-4 py-3 text-left text-sm font-medium text-gray-600'>Vai trò</th>
              <th className='px-4 py-3 text-left text-sm font-medium text-gray-600'>Ngày tham gia</th>
              <th className='px-4 py-3 text-center text-sm font-medium text-gray-600'>Thao tác</th>
            </tr>
          </thead>
          <tbody className='divide-y'>
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
                    user.role === 'educator' ? 'bg-blue-100 text-blue-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {user.role === 'admin' ? 'Admin' :
                     user.role === 'educator' ? 'Giảng viên' : 'Học viên'}
                  </span>
                </td>
                <td className='px-4 py-3 text-sm text-gray-500'>
                  {new Date(user.createdAt).toLocaleDateString('vi-VN')}
                </td>
                <td className='px-4 py-3 text-center'>
                  <select
                    value={user.role || 'student'}
                    onChange={(e) => handleRoleChange(user._id, e.target.value)}
                    className='text-sm border rounded px-2 py-1'
                  >
                    <option value='student'>Học viên</option>
                    <option value='educator'>Giảng viên</option>
                    <option value='admin'>Admin</option>
                  </select>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className='px-4 py-8 text-center text-gray-500'>
                  Không tìm thấy người dùng
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// Courses Management
export const AdminCourses = () => {
  const { backendUrl, getToken, currency } = useContext(AppContext)
  const [courses, setCourses] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')

  const fetchCourses = async () => {
    try {
      const token = await getToken()
      const { data } = await axios.get(`${backendUrl}/api/admin/courses?isPublished=${filter}&search=${search}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (data.success) {
        setCourses(data.courses)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCourses()
  }, [filter])

  const handleDelete = async (courseId, courseTitle) => {
    if (!confirm(`Bạn có chắc muốn xóa khóa học "${courseTitle}"?\n\nHành động này không thể hoàn tác!`)) return
    
    try {
      const token = await getToken()
      const { data } = await axios.delete(`${backendUrl}/api/admin/courses/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (data.success) {
        toast.success(data.message)
        setCourses(courses.filter(c => c._id !== courseId))
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    }
  }

  const handleSearch = (e) => {
    e.preventDefault()
    setLoading(true)
    fetchCourses()
  }

  if (loading) return <Loading />

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-6'>Quản lý khóa học</h1>
      
      {/* Filters */}
      <div className='flex flex-wrap gap-4 mb-6'>
        <div className='flex gap-2'>
          {[
            { value: 'all', label: 'Tất cả' },
            { value: 'true', label: 'Đang hiển thị' },
            { value: 'false', label: 'Đã ẩn' }
          ].map(tab => (
            <button
              key={tab.value}
              onClick={() => { setFilter(tab.value); setLoading(true) }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === tab.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50 border'
              }`}
            >
              {tab.label}
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
          <button type='submit' className='px-4 py-2 bg-gray-100 rounded-lg hover:bg-gray-200'>
            Tìm
          </button>
        </form>
      </div>

      {/* Courses Table */}
      <div className='bg-white rounded-lg shadow-sm border'>
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
          <tbody className='divide-y'>
            {courses.map(course => (
              <tr key={course._id} className='hover:bg-gray-50'>
                <td className='px-4 py-3'>
                  <div className='flex items-center gap-3'>
                    <img src={course.courseThumbnail} alt="" className='w-16 h-10 object-cover rounded' />
                    <div>
                      <p className='font-medium text-gray-800 line-clamp-1'>{course.courseTitle}</p>
                      <p className='text-xs text-gray-500'>
                        {new Date(course.createdAt).toLocaleDateString('vi-VN')}
                      </p>
                    </div>
                  </div>
                </td>
                <td className='px-4 py-3'>
                  <div className='flex items-center gap-2'>
                    <img src={course.educator?.imageUrl} alt="" className='w-6 h-6 rounded-full' />
                    <span className='text-sm text-gray-600'>{course.educator?.name}</span>
                  </div>
                </td>
                <td className='px-4 py-3 text-sm'>
                  {course.discount > 0 ? (
                    <div>
                      <span className='text-gray-400 line-through'>{currency}{course.coursePrice}</span>
                      <span className='ml-2 text-green-600 font-medium'>
                        {currency}{(course.coursePrice - course.coursePrice * course.discount / 100).toFixed(0)}
                      </span>
                    </div>
                  ) : (
                    <span>{currency}{course.coursePrice}</span>
                  )}
                </td>
                <td className='px-4 py-3 text-sm text-gray-600'>
                  {course.enrolledStudents?.length || 0}
                </td>
                <td className='px-4 py-3'>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    course.isPublished ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {course.isPublished ? 'Đang hiển thị' : 'Đã ẩn'}
                  </span>
                </td>
                <td className='px-4 py-3 text-center'>
                  <button
                    onClick={() => handleDelete(course._id, course.courseTitle)}
                    className='text-red-600 hover:text-red-700 text-sm font-medium'
                  >
                    Xóa
                  </button>
                </td>
              </tr>
            ))}
            {courses.length === 0 && (
              <tr>
                <td colSpan={6} className='px-4 py-8 text-center text-gray-500'>
                  Không tìm thấy khóa học
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AdminLayout
