import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../../context/AppContext'
import { useParams } from 'react-router-dom'
import { assets } from '../../assets/assets'
import humanizeDuration from 'humanize-duration'
import Youtube from 'react-youtube'
import Footer from '../../components/student/Footer'
import Rating from '../../components/student/Rating'
import axios from 'axios'
import { toast } from 'react-toastify'
import Loading from '../../components/student/Loading'
import AIChatbot, { AIFloatingButton } from '../../components/student/AIChatbot'
import { AILessonSummary, AIQuizGenerator } from '../../components/student/AITools'

const Player = () => {

  const { enrolledCourses, calculateChapterTime, backendUrl, getToken, userData, fetchUserEnrolledCourses, fetchAllCourses } = useContext(AppContext)

  const { courseId } = useParams()
  const [courseData, setCourseData] = useState(null)
  const [openSections, setOpenSections] = useState({})
  const [playerData, setPlayerData] = useState(null)
  const [progressData, setProgressData] = useState(null)
  const [initialRating, setInitialRating] = useState(0)
  
  // AI features state
  const [showAIChat, setShowAIChat] = useState(false)
  const [showAISummary, setShowAISummary] = useState(false)
  const [showAIQuiz, setShowAIQuiz] = useState(false)
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0)
  const [currentLectureIndex, setCurrentLectureIndex] = useState(0)

  const extractYouTubeVideoId = (url = '') => {
    const normalized = String(url).trim()
    if (!normalized) return ''

    if (/^[a-zA-Z0-9_-]{11}$/.test(normalized)) {
      return normalized
    }

    try {
      const parsed = new URL(normalized)
      const host = parsed.hostname.replace('www.', '')

      if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
        return (
          parsed.searchParams.get('v')
          || parsed.pathname.split('/').filter(Boolean).pop()
          || ''
        )
      }

      if (host === 'youtu.be' || host === 'youtube-nocookie.com') {
        return parsed.pathname.split('/').filter(Boolean)[0] || ''
      }
    } catch {
      return normalized.split('/').pop()?.split('?')[0] || ''
    }

    return ''
  }

  const handleSelectLecture = (lecture, chapterIndex, lectureIndex) => {
    const videoId = extractYouTubeVideoId(lecture.lectureUrl)
    if (!videoId) {
      toast.error('Liên kết bài giảng không hợp lệ')
      return
    }

    setPlayerData({
      ...lecture,
      chapter: chapterIndex + 1,
      lecture: lectureIndex + 1,
      videoId,
      instanceKey: `${lecture.lectureId}-${videoId}`
    })
  }

  const getCourseData = () => {
    enrolledCourses.map((course) => {
      if (course._id === courseId) {
        setCourseData(course)
        course.courseRatings.map((item) => {
          if (item.userId === userData._id){
            // support rating stored as `rating` or `Rating`
            setInitialRating(item.rating ?? item.Rating ?? 0)
          }
        })
      }
    })
  }

  const toggleSection = (index) => {
    setOpenSections((prev) => (
      {...prev,
        [index]: !prev[index]
      }
    ))
  }

  useEffect(() => {
    if (enrolledCourses.length > 0 ){
      getCourseData()
    }
  }, [courseId, enrolledCourses])


  const markLectureAsCompleted = async (lectureId) => {
    try {
      const token = await getToken()
      const { data } = await axios.post(backendUrl + '/api/user/update-course-progress', {courseId, lectureId}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      if (data.success) {
        toast.success(data.message)
        getCourseProgress()
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const getCourseProgress = async () => {
    try {
      const token = await getToken()
      const { data } = await axios.post(backendUrl + '/api/user/get-course-progress', {courseId}, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })
      if (data.success) {
        setProgressData(data.progressData)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  const handleRate = async (rating) => {
    try {
      const token = await getToken()
      const { data } = await axios.post(backendUrl + '/api/user/add-rating', {
        courseId,
        rating
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (data.success) {
        toast.success(data.message)
        const numericRating = Number(rating)
        setInitialRating(numericRating)
        setCourseData((prev) => {
          if (!prev) return prev
          const currentUserId = String(userData?._id || '')
          const currentRatings = Array.isArray(prev.courseRatings) ? prev.courseRatings : []
          const existingIndex = currentRatings.findIndex((item) => String(item.userId) === currentUserId)

          if (existingIndex > -1) {
            const updatedRatings = [...currentRatings]
            updatedRatings[existingIndex] = {
              ...updatedRatings[existingIndex],
              rating: numericRating
            }
            return { ...prev, courseRatings: updatedRatings }
          }

          return {
            ...prev,
            courseRatings: [...currentRatings, { userId: currentUserId, rating: numericRating }]
          }
        })

        await Promise.all([
          fetchUserEnrolledCourses(),
          fetchAllCourses()
        ])
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(() => {
    getCourseProgress()
  }, [])

  return courseData ? (
    <div className='min-h-[calc(100vh-72px)] flex flex-col'>
      <div className='p-4 sm:p-10 flex-1 flex flex-col-reverse md:grid md:grid-cols-2 gap-10 md:px-36'>
        {/* left column */}
        <div className='text-gray-800'>
          <h2 className='text-xl font-semibold'>Cấu trúc khóa học</h2>

          <div className='pt-5'>
            {courseData && courseData.courseContent.map((chapter, index) => (
              <div key={index} className='border border-gray-300 bg-white mb-2 rounded'>
                <div
                  className='flex items-center justify-between px-4 py-3 cursor-pointer select-none'
                  onClick={() => toggleSection(index)}
                >
                  <div className='flex items-center gap-2'>
                    <img
                      className={`transform transition-transform ${openSections[index] ? 'rotate-180' : ''}`}
                      src={assets.down_arrow_icon}
                      alt="arrow icon"
                    />
                    <p className='font-medium md:text-base text-sm'>{chapter.chapterTitle}</p>
                  </div>
                  <p className='text-sm md:text-default'>
                    {chapter.chapterContent.length} bài giảng - {calculateChapterTime(chapter)}
                  </p>
                </div>
                <div
                  className={`overflow-hidden transition-all duration-300 ${openSections[index] ? 'max-h-96' : 'max-h-0'}`}
                >
                  <ul className='list-disc md:pl-10 pl-4 pr-4 py-2 text-gray-600 border-t border-gray-300'>
                    {chapter.chapterContent.map((lecture, i) => (
                      <li key={i} className='flex items-start gap-2 py-1'>
                        <img src={progressData && progressData.lectureCompleted.includes(lecture.lectureId) ? assets.blue_tick_icon : assets.play_icon} alt="play icon" className='w-4 h-4 mt-1' />
                        <div className='flex items-center justify-between w-full text-gray-800 text-xs md:text-default'>
                          <p>{lecture.lectureTitle}</p>
                          <div className='flex gap-2'>
                            {lecture.lectureUrl && (
                              <p
                                onClick={() => handleSelectLecture(lecture, index, i)}
                                className='text-blue-500 cursor-pointer'
                              >
                                Xem
                              </p>
                            )}
                            <p>{humanizeDuration(lecture.lectureDuration * 60 * 1000, { units: ['h', 'm'], language: 'vi', languages: { vi: { h: () => 'giờ', m: () => 'phút' } } })}</p>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>

          <div className='flex items-center gap-2 py-3 mt-10'>
            <h1 className='text-xl font-bold'>Đánh giá khóa học:</h1>
            <Rating initialRating={initialRating} onRate={handleRate} />
          </div>
        </div>
        {/* right column */}
        <div className='md:mt-10'>
          { playerData ? (
            <div>
              <Youtube key={playerData.instanceKey} videoId={playerData.videoId} iframeClassName='w-full aspect-video'/>
              <div className='flex justify-between items-center mt-1'>
                <p>{playerData.chapter}.{playerData.lecture} {playerData.lectureTitle}</p>
                <button onClick={() => markLectureAsCompleted(playerData.lectureId)} className='text-blue-600'>{progressData && progressData.lectureCompleted.includes(playerData.lectureId) ? 'Đã hoàn thành' : 'Đánh dấu đã hoàn thành'}</button>
              </div>
              
              {/* AI Tools Bar */}
              <div className='flex flex-wrap gap-2 mt-4 p-4 bg-linear-to-r from-gray-50 to-blue-50 rounded-xl border'>
                <span className='text-sm text-gray-500 w-full mb-2'>Công cụ AI:</span>
                <button
                  onClick={() => {
                    setCurrentChapterIndex(playerData.chapter - 1)
                    setCurrentLectureIndex(playerData.lecture - 1)
                    setShowAISummary(true)
                  }}
                  className='inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm'
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Tóm tắt bài học
                </button>
                <button
                  onClick={() => {
                    setCurrentChapterIndex(playerData.chapter - 1)
                    setShowAIQuiz(true)
                  }}
                  className='inline-flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors text-sm'
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Luyện tập câu hỏi
                </button>
                <button
                  onClick={() => setShowAIChat(true)}
                  className='inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors text-sm'
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                  Hỏi AI
                </button>
              </div>
            </div>
          ) 
          :
          <img src={courseData ? courseData.courseThumbnail : ''} alt="" />
          }
          
        </div>
      </div>
      
      {/* AI Chatbot */}
      <AIChatbot 
        courseId={courseId} 
        lectureId={playerData?.lectureId}
        lessonContext={playerData?.lectureTitle}
        isOpen={showAIChat} 
        onClose={() => setShowAIChat(false)} 
      />
      
      {/* AI Summary Modal */}
      {showAISummary && (
        <AILessonSummary
          courseId={courseId}
          chapterIndex={currentChapterIndex}
          lectureIndex={currentLectureIndex}
          lectureId={playerData?.lectureId}
          onClose={() => setShowAISummary(false)}
        />
      )}
      
      {/* AI Quiz Modal */}
      {showAIQuiz && (
        <AIQuizGenerator
          courseId={courseId}
          chapterIndex={currentChapterIndex}
          onClose={() => setShowAIQuiz(false)}
        />
      )}
      
      {/* Floating AI Button */}
      {!showAIChat && <AIFloatingButton onClick={() => setShowAIChat(true)} />}
      
      <Footer />
    </div>
  ) : <Loading />
}

export default Player
