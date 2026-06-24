import React, { useContext, useEffect, useRef, useState } from 'react'
import { useUser, SignInButton } from '@clerk/clerk-react'
import { AppContext } from '../../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import Loading from '../../components/student/Loading'
import Footer from '../../components/student/Footer'

const BecomeEducator = () => {
  const { backendUrl, getToken, userData, navigate } = useContext(AppContext)
  const { isSignedIn, isLoaded, user } = useUser()
  
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
  const certificateInputRef = useRef(null)

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
        
        if (data.success) {
          setApplicationStatus(data.application || null)
        }
      } catch (error) {
        console.error('Error checking application status:', error)
      } finally {
        setLoading(false)
      }
    }
    
    checkApplicationStatus()
  }, [userData])

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

  useEffect(() => {
    if (applicationStatus?.status === 'approved') {
      navigate('/')
    }
  }, [applicationStatus, navigate])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e) => {
    const { name, files: selectedFiles } = e.target
    if (name === 'cv') {
      setFiles(prev => ({ ...prev, cv: selectedFiles[0] }))
    } else if (name === 'certificates') {
      const incomingFile = selectedFiles?.[0]
      if (!incomingFile) return

      setFiles(prev => {
        const merged = [...prev.certificates, incomingFile]
        if (merged.length > 5) {
          toast.warning('Bạn chỉ có thể tải lên tối đa 5 chứng chỉ')
        }
        return { ...prev, certificates: merged.slice(0, 5) }
      })
      // Allow selecting the same file again in subsequent picks.
      e.target.value = ''
    }
  }

  const removeCertificate = (indexToRemove) => {
    setFiles(prev => ({
      ...prev,
      certificates: prev.certificates.filter((_, index) => index !== indexToRemove)
    }))
  }

  const openCertificatePicker = () => {
    certificateInputRef.current?.click()
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // Check if user is signed in
    if (!isSignedIn) {
      toast.error('Vui lòng đăng nhập để gửi đơn')
      return
    }
    
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
      if (!token) {
        toast.error('Không thể xác thực. Vui lòng đăng nhập lại.')
        setSubmitting(false)
        return
      }
      
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

  if (loading || !isLoaded) return <Loading />
  
  // Show login prompt if not signed in
  if (!isSignedIn) {
    return (
      <>
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Đăng nhập để tiếp tục</h2>
            <p className="text-gray-600 mb-6">
              Bạn cần đăng nhập để gửi đơn đăng ký trở thành giảng viên
            </p>
            <SignInButton mode="modal">
              <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700">
                Đăng nhập ngay
              </button>
            </SignInButton>
          </div>
        </div>
        <Footer />
      </>
    )
  }

  // Show application status if exists
  if (applicationStatus) {
    if (applicationStatus.status === 'approved') {
      return null
    }

    return (
      <>
        <div className="min-h-screen bg-linear-to-br from-gray-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto">
            {/* Pending Status */}
            {applicationStatus.status === 'pending' && (
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-linear-to-r from-amber-400 to-orange-500 h-2"></div>
                <div className="p-8 text-center">
                  <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-gray-800 mb-3">Đơn đang được xét duyệt</h2>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Đơn đăng ký của bạn đã được gửi thành công và đang chờ admin xem xét.
                    Vui lòng chờ trong khi hệ thống xử lý đơn của bạn.
                    Sau khi đơn được duyệt, khi bạn truy cập lại vào trang web sẽ thấy lựa chọn đi đến trang giảng viên.
                  </p>
                  
                  {/* Status Info Card */}
                  <div className="bg-amber-50 rounded-xl p-5 mb-6 text-left border border-amber-100">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></div>
                      <span className="font-semibold text-amber-800">Trạng thái: Đang chờ duyệt</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Ngày nộp đơn</p>
                        <p className="font-medium text-gray-700">
                          {new Date(applicationStatus.createdAt).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit', 
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Họ tên</p>
                        <p className="font-medium text-gray-700">{applicationStatus.fullName}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Email</p>
                        <p className="font-medium text-gray-700">{applicationStatus.email}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Chuyên môn</p>
                        <p className="font-medium text-gray-700">{applicationStatus.expertise}</p>
                      </div>
                    </div>
                  </div>

                  <button 
                    onClick={() => navigate('/')}
                    className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    Quay lại trang chủ
                  </button>
                </div>
              </div>
            )}
            
            {/* Rejected Status */}
            {applicationStatus.status === 'rejected' && (
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-linear-to-r from-red-400 to-rose-500 h-2"></div>
                <div className="p-8 text-center">
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h2 className="text-2xl font-bold text-red-700 mb-3">Đơn chưa được duyệt</h2>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Rất tiếc, đơn đăng ký của bạn chưa được chấp thuận. 
                    Vui lòng xem lý do bên dưới và cân nhắc nộp đơn mới.
                  </p>
                  
                  {/* Rejection Reason Card */}
                  {applicationStatus.rejectionReason && (
                    <div className="bg-red-50 rounded-xl p-5 mb-6 text-left border border-red-100">
                      <div className="flex items-center gap-3 mb-3">
                        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="font-semibold text-red-800">Lý do từ chối:</span>
                      </div>
                      <p className="text-red-700 whitespace-pre-wrap">{applicationStatus.rejectionReason}</p>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button 
                      onClick={() => navigate('/')}
                      className="inline-flex items-center justify-center gap-2 bg-gray-100 text-gray-700 px-6 py-3 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                      </svg>
                      Về trang chủ
                    </button>
                    <button 
                      onClick={() => setApplicationStatus(null)}
                      className="inline-flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Nộp đơn mới
                    </button>
                  </div>
                </div>
              </div>
            )}
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
                    Chứng chỉ (chọn từng ảnh)
                  </label>
                  <div className="border border-gray-300 rounded-lg p-3 bg-gray-50">
                    <input
                      ref={certificateInputRef}
                      type="file"
                      name="certificates"
                      onChange={handleFileChange}
                      accept=".jpg,.jpeg,.png,.webp"
                      className="hidden"
                    />

                    <button
                      type="button"
                      onClick={openCertificatePicker}
                      disabled={files.certificates.length >= 5}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-blue-200 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-50 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Thêm ảnh chứng chỉ
                    </button>

                    <p className="mt-2 text-xs text-gray-500">Mỗi lần chọn 1 ảnh, tối đa 5 ảnh (JPG, PNG, WEBP).</p>

                    {files.certificates.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {files.certificates.map((certificate, index) => (
                          <div key={`${certificate.name}-${index}`} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-3 py-2">
                            <span className="text-sm text-gray-700 truncate pr-3">{index + 1}. {certificate.name}</span>
                            <button
                              type="button"
                              onClick={() => removeCertificate(index)}
                              className="text-red-600 hover:text-red-700 text-sm font-medium"
                            >
                              Gỡ
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
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
