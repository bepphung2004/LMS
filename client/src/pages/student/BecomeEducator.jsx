import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import Loading from '../../components/student/Loading'
import Footer from '../../components/student/Footer'

const BecomeEducator = () => {
  const { backendUrl, getToken, userData, navigate, isEducator } = useContext(AppContext)
  
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [applicationStatus, setApplicationStatus] = useState(null)
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    expertise: '',
    experience: '',
    qualification: '',
    linkedinUrl: '',
    portfolioUrl: '',
    courseTopics: '',
    teachingApproach: '',
    sampleVideoUrl: ''
  })
  
  const [files, setFiles] = useState({
    cv: null,
    certificates: []
  })

  // Check existing application status
  useEffect(() => {
    const checkApplicationStatus = async () => {
      if (!userData) return
      
      setLoading(true)
      try {
        const token = await getToken()
        const { data } = await axios.get(`${backendUrl}/api/educator/application-status`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        
        if (data.success && data.application) {
          setApplicationStatus(data.application)
        }
      } catch (error) {
        console.error('Error checking application status:', error)
      } finally {
        setLoading(false)
      }
    }
    
    checkApplicationStatus()
  }, [userData])

  // Redirect if already educator
  useEffect(() => {
    if (isEducator) {
      navigate('/educator')
    }
  }, [isEducator])

  // Pre-fill user data
  useEffect(() => {
    if (userData) {
      setFormData(prev => ({
        ...prev,
        fullName: userData.name || '',
        email: userData.email || ''
      }))
    }
  }, [userData])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e) => {
    const { name, files: selectedFiles } = e.target
    if (name === 'cv') {
      setFiles(prev => ({ ...prev, cv: selectedFiles[0] }))
    } else if (name === 'certificates') {
      setFiles(prev => ({ ...prev, certificates: Array.from(selectedFiles) }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Validation
    const required = ['fullName', 'email', 'phone', 'expertise', 'experience', 'qualification', 'courseTopics', 'teachingApproach']
    const missing = required.filter(field => !formData[field])
    
    if (missing.length > 0) {
      toast.error('Vui lòng điền đầy đủ các trường bắt buộc')
      return
    }

    setSubmitting(true)
    
    try {
      const token = await getToken()
      const submitData = new FormData()
      
      // Append form fields
      Object.keys(formData).forEach(key => {
        submitData.append(key, formData[key])
      })
      
      // Append files
      if (files.cv) {
        submitData.append('cv', files.cv)
      }
      files.certificates.forEach(cert => {
        submitData.append('certificates', cert)
      })

      const { data } = await axios.post(`${backendUrl}/api/educator/apply`, submitData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })

      if (data.success) {
        toast.success(data.message)
        setApplicationStatus(data.application)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <Loading />

  // Show application status if exists
  if (applicationStatus) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            <div className={`bg-white rounded-lg shadow-lg p-8 text-center ${
              applicationStatus.status === 'approved' ? 'border-t-4 border-green-500' :
              applicationStatus.status === 'rejected' ? 'border-t-4 border-red-500' :
              'border-t-4 border-yellow-500'
            }`}>
              {applicationStatus.status === 'pending' && (
                <>
                  <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">Đơn đang chờ xử lý</h2>
                  <p className="text-gray-600 mb-4">
                    Đơn đăng ký của bạn đã được gửi thành công và đang chờ admin xem xét.
                    Chúng tôi sẽ gửi email thông báo kết quả cho bạn.
                  </p>
                  <p className="text-sm text-gray-500">
                    Ngày nộp: {new Date(applicationStatus.createdAt).toLocaleDateString('vi-VN')}
                  </p>
                </>
              )}
              
              {applicationStatus.status === 'approved' && (
                <>
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-green-700 mb-2">Chúc mừng! Đơn đã được duyệt</h2>
                  <p className="text-gray-600 mb-6">
                    Bạn đã trở thành giảng viên. Hãy bắt đầu tạo khóa học đầu tiên!
                  </p>
                  <button 
                    onClick={() => navigate('/educator')}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
                  >
                    Đến trang giảng viên
                  </button>
                </>
              )}
              
              {applicationStatus.status === 'rejected' && (
                <>
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-red-700 mb-2">Đơn chưa được duyệt</h2>
                  <p className="text-gray-600 mb-4">
                    Rất tiếc, đơn đăng ký của bạn chưa được chấp thuận.
                  </p>
                  {applicationStatus.rejectionReason && (
                    <div className="bg-red-50 p-4 rounded-lg mb-4 text-left">
                      <p className="font-medium text-red-800 mb-1">Lý do:</p>
                      <p className="text-red-700">{applicationStatus.rejectionReason}</p>
                    </div>
                  )}
                  <button 
                    onClick={() => setApplicationStatus(null)}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
                  >
                    Nộp đơn mới
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  return (
    <>
      <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Đăng ký trở thành Giảng viên</h1>
            <p className="mt-2 text-gray-600">
              Chia sẻ kiến thức của bạn với hàng ngàn học viên trên nền tảng của chúng tôi
            </p>
          </div>

          <form onSubmit={handleSubmit} className="bg-white shadow-lg rounded-lg p-8">
            {/* Personal Information */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b">
                Thông tin cá nhân
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Họ và tên <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Professional Information */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b">
                Thông tin chuyên môn
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lĩnh vực chuyên môn <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="expertise"
                    value={formData.expertise}
                    onChange={handleChange}
                    placeholder="VD: Lập trình Web, Data Science, Marketing..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kinh nghiệm giảng dạy/làm việc <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Mô tả kinh nghiệm làm việc và giảng dạy của bạn..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Bằng cấp / Chứng chỉ <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="qualification"
                    value={formData.qualification}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Liệt kê các bằng cấp, chứng chỉ liên quan..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      LinkedIn Profile
                    </label>
                    <input
                      type="url"
                      name="linkedinUrl"
                      value={formData.linkedinUrl}
                      onChange={handleChange}
                      placeholder="https://linkedin.com/in/..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Portfolio / Website
                    </label>
                    <input
                      type="url"
                      name="portfolioUrl"
                      value={formData.portfolioUrl}
                      onChange={handleChange}
                      placeholder="https://..."
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Teaching Information */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b">
                Kế hoạch giảng dạy
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chủ đề muốn dạy <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="courseTopics"
                    value={formData.courseTopics}
                    onChange={handleChange}
                    rows={2}
                    placeholder="Liệt kê các chủ đề/khóa học bạn muốn tạo..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phương pháp giảng dạy <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    name="teachingApproach"
                    value={formData.teachingApproach}
                    onChange={handleChange}
                    rows={3}
                    placeholder="Mô tả cách bạn truyền đạt kiến thức, phong cách giảng dạy..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Link video mẫu (YouTube/Vimeo)
                  </label>
                  <input
                    type="url"
                    name="sampleVideoUrl"
                    value={formData.sampleVideoUrl}
                    onChange={handleChange}
                    placeholder="https://youtube.com/watch?v=..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Nếu có video giảng dạy mẫu, hãy chia sẻ để chúng tôi đánh giá kỹ năng của bạn
                  </p>
                </div>
              </div>
            </div>

            {/* File Uploads */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 pb-2 border-b">
                Tài liệu đính kèm
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CV / Resume
                  </label>
                  <input
                    type="file"
                    name="cv"
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">PDF, DOC, DOCX (Max 5MB)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Chứng chỉ (có thể chọn nhiều)
                  </label>
                  <input
                    type="file"
                    name="certificates"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.jpeg,.png"
                    multiple
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <p className="mt-1 text-xs text-gray-500">PDF, JPG, PNG (Max 5 files)</p>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div className="flex items-center justify-between pt-4 border-t">
              <p className="text-sm text-gray-500">
                <span className="text-red-500">*</span> Trường bắt buộc
              </p>
              <button
                type="submit"
                disabled={submitting}
                className="bg-blue-600 text-white px-8 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Đang gửi...
                  </>
                ) : (
                  'Gửi đơn đăng ký'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
      <Footer />
    </>
  )
}

export default BecomeEducator
