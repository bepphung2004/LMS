import React, { useContext, useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import { AppContext } from '../../context/AppContext'
import Loading from '../../components/student/Loading'

const AdminApplications = () => {
  const { backendUrl, getToken } = useContext(AppContext)
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('pending')
  const [statusCounts, setStatusCounts] = useState({ all: 0, pending: 0, approved: 0, rejected: 0 })
  const [selectedApp, setSelectedApp] = useState(null)
  const [rejectionReason, setRejectionReason] = useState('')
  const [processing, setProcessing] = useState(false)

  const toStatusCounts = (items = []) => {
    const counts = { all: items.length, pending: 0, approved: 0, rejected: 0 }
    items.forEach((item) => {
      if (item.status === 'pending') counts.pending += 1
      if (item.status === 'approved') counts.approved += 1
      if (item.status === 'rejected') counts.rejected += 1
    })
    return counts
  }

  const fetchApplications = async () => {
    try {
      const token = await getToken()
      const [listResponse, countsResponse] = await Promise.all([
        axios.get(`${backendUrl}/api/admin/applications?status=${filter}`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        axios.get(`${backendUrl}/api/admin/applications?status=all`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ])

      if (listResponse.data.success) setApplications(listResponse.data.applications)
      if (countsResponse.data.success) setStatusCounts(toStatusCounts(countsResponse.data.applications))
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
        setApplications(prev => {
          const updated = prev.map(app => app._id === appId ? { ...app, status: 'approved' } : app)
          if (filter !== 'all' && filter !== 'approved') {
            return updated.filter(app => app._id !== appId)
          }
          return updated
        })
        setStatusCounts(counts => ({
          ...counts,
          pending: counts.pending - 1,
          approved: counts.approved + 1
        }))
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
      const { data } = await axios.post(
        `${backendUrl}/api/admin/applications/${appId}/reject`,
        { reason: rejectionReason },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (data.success) {
        toast.success(data.message)
        setApplications(prev => {
          const updated = prev.map(app => app._id === appId ? { ...app, status: 'rejected', rejectionReason } : app)
          if (filter !== 'all' && filter !== 'rejected') {
            return updated.filter(app => app._id !== appId)
          }
          return updated
        })
        setStatusCounts(counts => ({
          ...counts,
          pending: counts.pending - 1,
          rejected: counts.rejected + 1
        }))
        setSelectedApp(null)
        setRejectionReason('')
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    } finally {
      setProcessing(false)
    }
  }

  const handleDownloadCv = async (appId) => {
    try {
      const token = await getToken()
      const response = await axios.get(`${backendUrl}/api/admin/applications/${appId}/cv-download`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      })

      const contentDisposition = response.headers?.['content-disposition'] || ''
      const fileNameFromHeaderMatch = contentDisposition.match(/filename="?([^";]+)"?/i)
      const fileNameFromHeader = fileNameFromHeaderMatch?.[1]

      const mimeType = response.data?.type || ''
      const extensionByMime = mimeType.includes('pdf')
        ? 'pdf'
        : mimeType.includes('wordprocessingml')
          ? 'docx'
          : mimeType.includes('msword')
            ? 'doc'
            : 'pdf'

      const objectUrl = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = fileNameFromHeader || `cv-${appId}.${extensionByMime}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(objectUrl)
    } catch (error) {
      if (error.response?.data instanceof Blob) {
        const reader = new FileReader()
        reader.onload = () => {
          try {
            const errData = JSON.parse(reader.result)
            toast.error(errData.message || 'Không thể tải CV')
          } catch (e) {
            toast.error('Không thể tải CV')
          }
        }
        reader.readAsText(error.response.data)
      } else {
        toast.error(error.response?.data?.message || error.message || 'Không thể tải CV')
      }
    }
  }

  if (loading) return <Loading />

  return (
    <div>
      <h1 className='text-2xl font-bold text-gray-800 mb-6'>Duyệt đơn đăng ký giảng viên</h1>

      <div className='flex flex-wrap gap-2 mb-6'>
        {[
          { value: 'pending', label: 'Chờ duyệt' },
          { value: 'approved', label: 'Đã duyệt' },
          { value: 'rejected', label: 'Đã từ chối' },
          { value: 'all', label: 'Tất cả' }
        ].map(tab => (
          <button
            key={tab.value}
            onClick={() => { setFilter(tab.value); setLoading(true) }}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
              filter === tab.value
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
                : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 hover:border-gray-300'
            }`}
          >
            <span className='inline-flex items-center gap-2'>
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-md text-[11px] ${filter === tab.value ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                {statusCounts[tab.value] ?? 0}
              </span>
            </span>
          </button>
        ))}
      </div>

      <div className='bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden'>
        <div className='overflow-x-auto rounded-xl'>
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
          <tbody className='divide-y divide-gray-100'>
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
                <td className='px-4 py-3 text-sm text-gray-500'>{new Date(app.createdAt).toLocaleDateString('vi-VN')}</td>
                <td className='px-4 py-3'>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    app.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    app.status === 'approved' ? 'bg-green-100 text-green-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {app.status === 'pending' ? 'Chờ duyệt' : app.status === 'approved' ? 'Đã duyệt' : 'Đã từ chối'}
                  </span>
                </td>
                <td className='px-4 py-3 text-center'>
                  <button onClick={() => setSelectedApp(app)} className='text-blue-600 hover:text-blue-700 text-sm font-medium'>
                    Xem chi tiết
                  </button>
                </td>
              </tr>
            ))}
            {applications.length === 0 && (
              <tr>
                <td colSpan={5} className='px-4 py-8 text-center text-gray-500'>Không có đơn đăng ký nào</td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {selectedApp && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto'>
            <div className='p-6 border-b sticky top-0 bg-white'>
              <div className='flex items-center justify-between'>
                <h2 className='text-xl font-bold'>Chi tiết đơn đăng ký</h2>
                <button onClick={() => setSelectedApp(null)} className='text-gray-400 hover:text-gray-600'>✕</button>
              </div>
            </div>

            <div className='p-6 space-y-6'>
              <div>
                <h3 className='font-semibold text-gray-800 mb-3'>Thông tin cá nhân</h3>
                <div className='grid grid-cols-2 gap-4 text-sm'>
                  <div><p className='text-gray-500'>Họ tên</p><p className='font-medium'>{selectedApp.fullName}</p></div>
                  <div><p className='text-gray-500'>Email</p><p className='font-medium'>{selectedApp.email}</p></div>
                  <div><p className='text-gray-500'>Điện thoại</p><p className='font-medium'>{selectedApp.phone}</p></div>
                </div>
              </div>

              <div>
                <h3 className='font-semibold text-gray-800 mb-3'>Thông tin chuyên môn</h3>
                <div className='space-y-3 text-sm'>
                  <div><p className='text-gray-500'>Lĩnh vực chuyên môn</p><p className='font-medium'>{selectedApp.expertise}</p></div>
                  <div><p className='text-gray-500'>Kinh nghiệm</p><p className='whitespace-pre-wrap'>{selectedApp.experience}</p></div>
                  <div><p className='text-gray-500'>Bằng cấp / Chứng chỉ</p><p className='whitespace-pre-wrap'>{selectedApp.qualification}</p></div>
                  {selectedApp.linkedinUrl && <div><p className='text-gray-500'>LinkedIn</p><a href={selectedApp.linkedinUrl} target='_blank' className='text-blue-600 hover:underline'>{selectedApp.linkedinUrl}</a></div>}
                  {selectedApp.portfolioUrl && <div><p className='text-gray-500'>Portfolio</p><a href={selectedApp.portfolioUrl} target='_blank' className='text-blue-600 hover:underline'>{selectedApp.portfolioUrl}</a></div>}
                </div>
              </div>

              <div>
                <h3 className='font-semibold text-gray-800 mb-3'>Kế hoạch giảng dạy</h3>
                <div className='space-y-3 text-sm'>
                  <div><p className='text-gray-500'>Chủ đề muốn dạy</p><p className='whitespace-pre-wrap'>{selectedApp.courseTopics}</p></div>
                  <div><p className='text-gray-500'>Phương pháp giảng dạy</p><p className='whitespace-pre-wrap'>{selectedApp.teachingApproach}</p></div>
                  {selectedApp.sampleVideoUrl && <div><p className='text-gray-500'>Video mẫu</p><a href={selectedApp.sampleVideoUrl} target='_blank' className='text-blue-600 hover:underline'>Xem video →</a></div>}
                </div>
              </div>

              {(selectedApp.cvUrl || selectedApp.certificatesUrl?.length > 0) && (
                <div>
                  <h3 className='font-semibold text-gray-800 mb-3'>Tài liệu đính kèm</h3>
                  <div className='flex flex-wrap gap-2'>
                    {selectedApp.cvUrl && (
                      <button type='button' onClick={() => handleDownloadCv(selectedApp._id)} className='inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition-colors'>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Tải CV
                      </button>
                    )}
                    {selectedApp.certificatesUrl?.map((url, idx) => (
                      <a key={idx} href={url} target='_blank' className='inline-flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-sm hover:bg-gray-200 transition-colors'>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                        </svg>
                        Chứng chỉ {idx + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {selectedApp.status === 'pending' && (
                <div className='border-t pt-6'>
                  <div className='mb-4'>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>Lý do từ chối (nếu từ chối)</label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      rows={3}
                      className='w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                      placeholder='Nhập lý do nếu muốn từ chối...'
                    />
                  </div>
                  <div className='flex gap-3'>
                    <button
                      onClick={() => handleApprove(selectedApp._id)}
                      disabled={processing}
                      className='flex-1 inline-flex items-center justify-center gap-2 bg-green-600 text-white py-3 rounded-xl font-medium hover:bg-green-700 disabled:bg-green-400 transition-colors'
                    >
                      {processing ? <span className='animate-pulse'>Đang xử lý...</span> : 'Duyệt đơn'}
                    </button>
                    <button
                      onClick={() => handleReject(selectedApp._id)}
                      disabled={processing}
                      className='flex-1 inline-flex items-center justify-center gap-2 bg-red-600 text-white py-3 rounded-xl font-medium hover:bg-red-700 disabled:bg-red-400 transition-colors'
                    >
                      {processing ? <span className='animate-pulse'>Đang xử lý...</span> : 'Từ chối'}
                    </button>
                  </div>
                </div>
              )}

              {selectedApp.status === 'rejected' && selectedApp.rejectionReason && (
                <div className='bg-red-50 p-4 rounded-xl border border-red-100'>
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

export default AdminApplications
