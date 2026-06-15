import React, { useContext, useEffect, useState, useRef } from 'react'
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
import { AILessonSummary, QuizPractice, FinalExam } from '../../components/student/AITools'
import CertificateModal from '../../components/student/CertificateModal'

const Player = () => {

  const { enrolledCourses, calculateChapterTime, backendUrl, getToken, userData, fetchUserEnrolledCourses, fetchAllCourses } = useContext(AppContext)

  const { courseId } = useParams()
  const [courseData, setCourseData] = useState(null)
  const [openSections, setOpenSections] = useState({})
  const [playerData, setPlayerData] = useState(null)
  const [progressData, setProgressData] = useState(null)
  const [initialRating, setInitialRating] = useState(0)
  
  // AI and Exam features state
  const [showAIChat, setShowAIChat] = useState(false)
  const [showAISummary, setShowAISummary] = useState(false)
  const [showAIQuiz, setShowAIQuiz] = useState(false)
  const [showFinalExam, setShowFinalExam] = useState(false)
  const [showCertificate, setShowCertificate] = useState(false)
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0)
  const [currentLectureIndex, setCurrentLectureIndex] = useState(0)

  // Youtube Player and Anti-cheat state refs
  const [ytPlayer, setYtPlayer] = useState(null)
  const maxTimeWatchedRef = useRef(0)
  const intervalRef = useRef(null)
  const isMarkingRef = useRef(false)

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
        
        // Auto-expand all chapters
        if (course.courseContent) {
          const initialOpen = {}
          course.courseContent.forEach((_, idx) => {
            initialOpen[idx] = true
          })
          setOpenSections(initialOpen)
        }

        course.courseRatings.map((item) => {
          if (item.userId === userData._id){
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

  // Track maxTimeWatched when lecture changes
  useEffect(() => {
    maxTimeWatchedRef.current = 0
    isMarkingRef.current = false
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }, [playerData?.lectureId])

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

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
        // Refresh both user enrolled list and active progress data
        await Promise.all([
          fetchUserEnrolledCourses(),
          getCourseProgress()
        ])
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

  // Anti-cheat and progress tracking handler functions
  const onPlayerReady = (event) => {
    setYtPlayer(event.target)
  }

  const handlePlay = (event) => {
    const player = event.target
    if (intervalRef.current) clearInterval(intervalRef.current)

    intervalRef.current = setInterval(() => {
      if (player && typeof player.getCurrentTime === 'function' && typeof player.getDuration === 'function') {
        const currentTime = player.getCurrentTime()
        const duration = player.getDuration()
        const isCompleted = progressData?.lectureCompleted?.includes(playerData?.lectureId)

        if (duration > 0) {
          // Block seeking forward past watched limit (with 2 seconds tolerance)
          if (!isCompleted && currentTime > maxTimeWatchedRef.current + 2) {
            player.seekTo(maxTimeWatchedRef.current, true)
            toast.warn('⚠️ Vui lòng không tua nhanh video bài giảng! Hãy học qua phần này.')
          } else {
            maxTimeWatchedRef.current = Math.max(maxTimeWatchedRef.current, currentTime)
          }

          // Auto-mark completed at >= 90%
          if (!isCompleted && !isMarkingRef.current && (currentTime / duration) >= 0.90) {
            isMarkingRef.current = true
            markLectureAsCompleted(playerData.lectureId)
          }
        }
      }
    }, 500)
  }

  const handlePause = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
  }

  // Calculate lecture totals and completeness
  let totalCourseLectures = 0
  if (courseData && courseData.courseContent) {
    courseData.courseContent.forEach(chapter => {
      if (chapter.chapterContent) {
        totalCourseLectures += chapter.chapterContent.length
      }
    })
  }

  const isFinalExamUnlocked = progressData && Array.isArray(progressData.lectureCompleted) && progressData.lectureCompleted.length >= totalCourseLectures

  return courseData ? (
    <div className='min-h-[calc(100vh-72px)] flex flex-col'>
      <div className='p-4 sm:p-10 flex-1 flex flex-col-reverse md:grid md:grid-cols-2 gap-10 md:px-36'>
        {/* left column */}
        <div className='text-gray-800'>
          <h2 className='text-xl font-semibold'>Cấu trúc khóa học</h2>

          <div className='pt-5'>
            {(() => {
              let runningLectureIndex = 0;
              return courseData && courseData.courseContent.map((chapter, index) => (
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
                      <p className='font-medium md:text-base text-sm'>Chương {index + 1}: {chapter.chapterTitle}</p>
                    </div>
                    <p className='text-sm md:text-default'>
                      {chapter.chapterContent.length} bài giảng - {calculateChapterTime(chapter)}
                    </p>
                  </div>
                  <div
                    className={`overflow-hidden transition-all duration-300 ${openSections[index] ? 'max-h-96' : 'max-h-0'}`}
                  >
                    <ul className='list-disc md:pl-10 pl-4 pr-4 py-2 text-gray-600 border-t border-gray-300'>
                      {chapter.chapterContent.map((lecture, i) => {
                        runningLectureIndex++;
                        return (
                          <li key={i} className='flex items-start gap-2 py-1'>
                            <img src={progressData && progressData.lectureCompleted.includes(lecture.lectureId) ? assets.blue_tick_icon : assets.play_icon} alt="play icon" className='w-4 h-4 mt-1 flex-shrink-0' />
                            <div className='flex items-center justify-between w-full text-gray-800 text-xs md:text-default min-w-0'>
                              <p className='pr-6 break-words leading-relaxed'>Bài {runningLectureIndex}: {lecture.lectureTitle}</p>
                              <div className='flex items-center gap-5 flex-shrink-0 text-gray-500 ml-auto'>
                                {lecture.lectureUrl && (
                                  <p
                                    onClick={() => handleSelectLecture(lecture, index, i)}
                                    className='text-blue-500 cursor-pointer hover:underline whitespace-nowrap'
                                  >
                                    Xem
                                  </p>
                                )}
                                <p className='whitespace-nowrap'>{humanizeDuration(lecture.lectureDuration * 60 * 1000, { units: ['h', 'm'], language: 'vi', languages: { vi: { h: () => 'giờ', m: () => 'phút' } } })}</p>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              ));
            })()}

            {/* Always visible at the bottom of the curriculum list */}
            {courseData && (
              <div className='mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap gap-3 items-center justify-start shadow-xs'>
                <button
                  disabled={!isFinalExamUnlocked || !courseData.finalExam?.isPublished || !courseData.finalExam?.questions?.length || progressData?.finalExamPassed}
                  onClick={() => {
                    setShowFinalExam(true)
                  }}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all text-xs sm:text-sm font-bold shadow-xs ${
                    (!isFinalExamUnlocked || !courseData.finalExam?.isPublished || !courseData.finalExam?.questions?.length || progressData?.finalExamPassed)
                      ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/10 cursor-pointer'
                  }`}
                >
                  <svg className="w-4 h-4 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                  </svg>
                  Thi Hết Khóa {progressData?.finalExamPassed ? '(Đã Đạt)' : ''}
                </button>

                <button
                  disabled={!progressData?.finalExamPassed}
                  onClick={() => {
                    setShowCertificate(true)
                  }}
                  className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all text-xs sm:text-sm font-bold shadow-xs ${
                    progressData?.finalExamPassed
                      ? 'bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 hover:to-emerald-600 text-white shadow-md shadow-emerald-500/10 cursor-pointer'
                      : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="8" r="6" strokeWidth={2} />
                    <path d="M8.21 13.89L7 23l5-3 5 3-1.21-9.12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
                  </svg>
                  Nhận Chứng Chỉ
                </button>
              </div>
            )}
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
              <Youtube 
                key={playerData.instanceKey} 
                videoId={playerData.videoId} 
                iframeClassName='w-full aspect-video'
                onReady={onPlayerReady}
                onPlay={handlePlay}
                onPause={handlePause}
                onEnd={handlePause}
              />
              
              {/* Premium Progress / State Indicator */}
              <div className='flex justify-between items-center mt-2.5 p-3.5 bg-slate-50 border border-slate-100 rounded-xl shadow-xs'>
                <p className='font-bold text-slate-800 text-sm md:text-base'>{playerData.chapter}.{playerData.lecture} {playerData.lectureTitle}</p>
                {progressData && progressData.lectureCompleted.includes(playerData.lectureId) ? (
                  <span className='inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-full text-xs font-bold shadow-xs animate-fadeIn whitespace-nowrap flex-shrink-0'>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                    Đã hoàn thành
                  </span>
                ) : (
                  <span className='inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-full text-xs font-bold shadow-xs whitespace-nowrap flex-shrink-0'>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Đang học
                  </span>
                )}
              </div>
              
              {/* AI Tools Bar */}
              <div className='flex flex-wrap gap-2.5 mt-4 p-4 bg-linear-to-r from-gray-50 to-blue-50 rounded-2xl border border-blue-100/50 shadow-xs'>
                <span className='text-xs text-gray-500 w-full mb-1 uppercase font-bold tracking-wider font-montserrat'>Bảng Công Cụ Học Tập & AI:</span>
                <button
                  onClick={() => {
                    setCurrentChapterIndex(playerData.chapter - 1)
                    setCurrentLectureIndex(playerData.lecture - 1)
                    setShowAISummary(true)
                  }}
                  className='inline-flex items-center gap-2 px-4 py-2.5 bg-purple-100/80 hover:bg-purple-200 text-purple-700 rounded-xl transition-all text-sm font-semibold cursor-pointer'
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Tóm tắt bài học
                </button>
                <button
                  onClick={() => {
                    setShowAIQuiz(true)
                  }}
                  className='inline-flex items-center gap-2 px-4 py-2.5 bg-green-100/80 hover:bg-green-200 text-green-700 rounded-xl transition-all text-sm font-semibold cursor-pointer'
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Luyện tập câu hỏi
                </button>
                <button
                  onClick={() => setShowAIChat(true)}
                  className='inline-flex items-center gap-2 px-4 py-2.5 bg-blue-100/80 hover:bg-blue-200 text-blue-700 rounded-xl transition-all text-sm font-semibold cursor-pointer'
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
      
      {/* Quiz Practice Modal */}
      {showAIQuiz && (
        <QuizPractice
          lecture={playerData}
          onClose={() => setShowAIQuiz(false)}
        />
      )}

      {/* Final Graduation Exam Modal */}
      {showFinalExam && (
        <FinalExam
          courseId={courseId}
          courseTitle={courseData.courseTitle}
          finalExam={courseData.finalExam}
          onClose={() => setShowFinalExam(false)}
          onSuccess={getCourseProgress}
        />
      )}

      {/* Graduation Royal Certificate Modal */}
      {showCertificate && (
        <CertificateModal
          courseData={courseData}
          userData={userData}
          progressData={progressData}
          onClose={() => setShowCertificate(false)}
        />
      )}
      
      {/* Floating AI Button */}
      {!showAIChat && <AIFloatingButton onClick={() => setShowAIChat(true)} />}
      
      <Footer />
    </div>
  ) : <Loading />
}

export default Player
