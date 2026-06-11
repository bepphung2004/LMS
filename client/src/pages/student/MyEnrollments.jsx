import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../../context/AppContext'
import { Line } from 'rc-progress'
import Footer from '../../components/student/Footer'
import axios from 'axios'
import { toast } from 'react-toastify'
import CertificateModal from '../../components/student/CertificateModal'

const MyEnrollments = () => {

  const { enrolledCourses, calculateCourseDuration, navigate, userData, fetchUserEnrolledCourses, backendUrl, getToken, calculateNoOfLectures } = useContext(AppContext)

  const [progressArray, setProgressArray] = useState([])
  
  // Certificate states
  const [showCertificate, setShowCertificate] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState(null)
  const [selectedProgress, setSelectedProgress] = useState(null)

  const getCourseProgress = async () => {
    try {
      const token = await getToken()
      const tempProgressArray = await Promise.all(
        enrolledCourses.map( async (course) => {
          const { data } = await axios.post(`${backendUrl}/api/user/get-course-progress`, { courseId: course._id }, {
            headers: {
              Authorization: `Bearer ${token}`
            }
          })
          let totalLectures = calculateNoOfLectures(course)
          const lectureCompleted = data.progressData ? data.progressData.lectureCompleted.length : 0
          const progressDataObj = data.progressData || null
          return { totalLectures, lectureCompleted, progressData: progressDataObj }
        })
      )
      setProgressArray(tempProgressArray)
    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(() => {
    if ( userData ) {
      fetchUserEnrolledCourses()
    }
  }, [userData])

  useEffect(() => {
    if ( enrolledCourses.length > 0 ) {
      getCourseProgress()
    }
  }, [enrolledCourses])

  return (
    <div className='min-h-[calc(100vh-72px)] flex flex-col'>
      <div className='md:px-36 px-8 pt-10 flex-1'>
        <div className='flex items-center justify-between mb-6'>
          <h1 className='text-2xl font-bold font-montserrat text-slate-800'>Khóa học của tôi</h1>
        </div>
        <table className='md:table-auto table-fixed w-full overflow-hidden border mt-4 rounded-xl shadow-xs'>
          <thead className='text-slate-900 bg-slate-50 border-b border-gray-200 text-sm text-left max-sm:hidden'>
            <tr>
              <th className='px-4 py-4 font-semibold truncate'>Khóa học</th>
              <th className='px-4 py-4 font-semibold truncate'>Thời lượng</th>
              <th className='px-4 py-4 font-semibold truncate'>Tiến độ</th>
              <th className='px-4 py-4 font-semibold truncate text-center'>Hành động</th>
            </tr>
          </thead>
          <tbody className='text-gray-700'>
            { enrolledCourses.map((course, index) => {
              const totalLectures = progressArray[index]?.totalLectures || 0
              const lectureCompleted = progressArray[index]?.lectureCompleted || 0
              const isFinishedLectures = totalLectures > 0 && lectureCompleted === totalLectures
              
              return (
                <tr key={index} className='border-b border-gray-150 hover:bg-slate-50/50 transition-colors'>
                  <td className='md:px-4 pl-2 md:pl-4 py-4 flex items-center space-x-3'>
                    <img src={course.courseThumbnail} alt="" className='w-14 sm:w-24 md:w-28 rounded-lg shadow-xs' />
                    <div className='flex-1 min-w-0'>
                      <p className='mb-2 max-sm:text-sm font-semibold text-slate-800 truncate'>{course.courseTitle}</p>
                      <div className='w-full max-w-xs'>
                        <Line 
                          strokeWidth={2} 
                          percent={totalLectures > 0 ? (lectureCompleted / totalLectures) * 100 : 0} 
                          strokeColor={isFinishedLectures ? '#10b981' : '#2563eb'}
                          trailColor='#e2e8f0'
                          className='rounded-full'
                        />
                      </div>
                    </div>
                  </td>
                  <td className='px-4 py-4 max-sm:hidden text-slate-600 font-medium'>
                    {calculateCourseDuration(course)}
                  </td>
                  <td className='px-4 py-4 max-sm:hidden text-slate-600 font-semibold'>
                    {lectureCompleted} / {totalLectures} <span className='font-normal text-slate-400'>bài giảng</span>
                  </td>
                  <td className='px-4 py-4 max-sm:text-right'>
                    <div className='flex flex-wrap justify-end sm:justify-center items-center gap-2'>
                      <button 
                        onClick={() => navigate('/player/' + course._id)} 
                        className={`px-4 py-2 text-xs sm:text-sm font-bold text-white rounded-lg transition-colors shadow-xs ${
                          isFinishedLectures ? 'bg-slate-700 hover:bg-slate-800' : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {isFinishedLectures ? 'Xem bài học' : 'Tiếp tục học'}
                      </button>
                      
                      {isFinishedLectures && (
                        <>
                          {course.finalExam?.isPublished ? (
                            progressArray[index]?.progressData?.finalExamPassed ? (
                              <button
                                onClick={() => {
                                  setSelectedCourse(course)
                                  setSelectedProgress(progressArray[index].progressData)
                                  setShowCertificate(true)
                                }}
                                className='px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-xs sm:text-sm text-white font-bold rounded-lg transition-all shadow-md shadow-emerald-500/10 flex items-center gap-1'
                              >
                                🎓 Nhận Chứng Chỉ
                              </button>
                            ) : (
                              <button
                                onClick={() => navigate('/player/' + course._id)}
                                className='px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-xs sm:text-sm text-slate-950 font-black rounded-lg transition-all shadow-md shadow-amber-500/20 animate-pulse'
                              >
                                🏆 Thi hết khóa
                              </button>
                            )
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedCourse(course)
                                setSelectedProgress(progressArray[index].progressData)
                                setShowCertificate(true)
                              }}
                              className='px-4 py-2 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-xs sm:text-sm text-white font-bold rounded-lg transition-all shadow-md shadow-emerald-500/10 flex items-center gap-1'
                            >
                              🎓 Nhận Chứng Chỉ
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      
      {showCertificate && (
        <CertificateModal
          courseData={selectedCourse}
          userData={userData}
          progressData={selectedProgress}
          onClose={() => setShowCertificate(false)}
        />
      )}
      
      <Footer />
    </div>
  )
}

export default MyEnrollments