import React, { useCallback, useContext, useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { AppContext } from '../../context/AppContext'
import Loading from '../../components/student/Loading'
import { assets } from '../../assets/assets'
import humanizeDuration from 'humanize-duration'
import Footer from '../../components/student/Footer'
import Youtube from 'react-youtube'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useClerk } from '@clerk/clerk-react'

const CourseDetails = () => {

  const PREVIEW_DURATION_SECONDS = 4 * 60 + 11

  const { id } = useParams()
  const navigate = useNavigate()

  const [courseData, setCourseData] = useState(null)
  const [openSections, setOpenSections] = useState({})
  const [playerData, setPlayerData] = useState(null)
  const [previewRemainingSeconds, setPreviewRemainingSeconds] = useState(PREVIEW_DURATION_SECONDS)
  const { openSignIn } = useClerk()
  const previewTimerRef = useRef(null)
  const previewLimitNotifiedRef = useRef(false)

  const { calculateRating, calculateCourseDuration, calculateNoOfLectures, calculateChapterTime, formatCurrency, backendUrl, userData, getToken } = useContext(AppContext)
  const isAlreadyEnrolled = Boolean(
    userData &&
    courseData &&
    Array.isArray(userData.enrolledCourses) &&
    userData.enrolledCourses.includes(courseData._id)
  )

  const fetchCourseData = useCallback(async () => {
    try {
      const { data } = await axios.get(backendUrl + '/api/course/' + id)
      if (data.success) {
        setCourseData(data.courseData)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }, [backendUrl, id])

  const clearPreviewTimer = () => {
    if (previewTimerRef.current) {
      clearInterval(previewTimerRef.current)
      previewTimerRef.current = null
    }
  }

  const extractYouTubeVideoId = (url = '') => {
    const normalized = String(url).trim()
    if (!normalized) return ''

    // Raw youtube id support
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
      // Best-effort fallback for malformed URLs
      return normalized.split('/').pop()?.split('?')[0] || ''
    }

    return ''
  }

  const handlePreviewLecture = (lectureUrl) => {
    const videoId = extractYouTubeVideoId(lectureUrl)
    if (!videoId) {
      toast.error('Liên kết xem thử không hợp lệ')
      return
    }

    clearPreviewTimer()
    previewLimitNotifiedRef.current = false
    setPreviewRemainingSeconds(PREVIEW_DURATION_SECONDS)
    setPlayerData({
      videoId,
      isPreview: true,
      instanceKey: `${videoId}-${lectureUrl}`
    })
  }

  const handlePlayerStateChange = (event) => {
    if (!playerData?.isPreview) return

    // 1 = PLAYING, 2 = PAUSED, 0 = ENDED
    if (event.data === 1) {
      clearPreviewTimer()
      previewTimerRef.current = setInterval(() => {
        const currentTime = event.target.getCurrentTime()
        const remaining = Math.max(0, PREVIEW_DURATION_SECONDS - Math.floor(currentTime))
        setPreviewRemainingSeconds(remaining)

        if (currentTime >= PREVIEW_DURATION_SECONDS) {
          event.target.pauseVideo()
          event.target.seekTo(PREVIEW_DURATION_SECONDS, true)
          clearPreviewTimer()
          setPreviewRemainingSeconds(0)

          if (!previewLimitNotifiedRef.current) {
            previewLimitNotifiedRef.current = true
            toast.warning('Đã hết thời gian xem thử. Vui lòng đăng ký để xem toàn bộ bài giảng.')
          }
        }
      }, 300)
      return
    }

    clearPreviewTimer()
  }

  useEffect(() => {
    return () => {
      clearPreviewTimer()
    }
  }, [])

  const enrollCourse = async () => {
    try {
      if ( !userData ) {
        openSignIn()
        return
      }
      if ( isAlreadyEnrolled ) {
        navigate(`/player/${courseData._id}`)
        return
      }

      const token = await getToken()

      const { data } = await axios.post(backendUrl + '/api/user/purchase', {
        courseId: courseData._id
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (data.success) {
        const { session_url } = data
        window.location.replace(session_url)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(() => {
    fetchCourseData()
  }, [fetchCourseData])

  useEffect(() => {
    const refreshOnReturn = () => {
      fetchCourseData()
    }

    window.addEventListener('focus', refreshOnReturn)
    window.addEventListener('pageshow', refreshOnReturn)

    return () => {
      window.removeEventListener('focus', refreshOnReturn)
      window.removeEventListener('pageshow', refreshOnReturn)
    }
  }, [fetchCourseData])

  const toggleSection = (index) => {
    setOpenSections((prev) => (
      {...prev,
        [index]: !prev[index]
      }
    ))
  }

  return courseData ? (
    <>
    <div className='flex md:flex-row flex-col-reverse gap-10 relative items-start justify-between md:px-36 px-8 md:pt-30 pt-20 text-left'>

      <div className='absolute top-0 left-0 w-full h-section-height -z-1 bg-linear-to-b from-cyan-100/70'></div>

      {/* left column */}
      <div className='max-w-xl z-10 text-gray-500'>
        <h1 className='md:text-course-details-heading-large text-course-details-heading-small font-semibold text-gray-800
        '>{courseData.courseTitle}</h1>
        
        {/* <p className='pt-4 md:text-base text-sm' 
        dangerouslySetInnerHTML={{__html : courseData.courseDescription.slice(0, 200)}}></p> */}

      {/* review and rating */}
      <div className='flex items-center space-x-2 pt-3 pb-1 text-sm'>
        <p>{calculateRating(courseData)}</p>
        <div className='flex'>
          {[...Array(5)].map((_, i) => (<img className='w-3.5 h-3.5' key={i} src={i < Math.floor(calculateRating(courseData)) ? assets.star : assets.star_blank} alt='' />))}
        </div>
        <p className='text-gray-500'> ({courseData.courseRatings.length} {courseData.courseRatings.length > 1 ? 'đánh giá' : 'đánh giá'}) </p>

        <p>{courseData.enrolledStudents.length} {courseData.enrolledStudents.length > 1 ? 'học viên' : 'học viên'}</p>
      </div>

      <p className='text-sm'>Giảng viên: <span className='text-blue-600 underline'>{courseData.educator.name}</span></p>

      <div className='pt-8 text-gray-800'>
        <h2 className='text-xl font-semibold'>Cấu trúc khóa học</h2>

        <div className='pt-5'>
          {courseData.courseContent.map((chapter, index) => (
            <div key={index} className='border border-gray-300 bg-white mb-2 rounded'>
              <div className='flex items-center justify-between px-4 py-3 cursor-pointer select-none' onClick={() => toggleSection(index)}>
                <div className='flex items-center gap-2'>
                  <img className={`transform transition-transform ${openSections[index] ? 'rotate-180' : ''}`} 
                  src={assets.down_arrow_icon} alt="arrow icon" />
                  <p className='font-medium md:text-base text-sm'>{chapter.chapterTitle}</p>
                </div>
                <p className='text-sm md:text-default'>{chapter.chapterContent.length} bài giảng - {calculateChapterTime(chapter)}</p>
              </div>

              <div className={`overflow-hidden transition-all duration-300 ${openSections[index] ? 'max-h-96' : 'max-h-0'}`}>
                <ul className='list-disc md:pl-10 pl-4 pr-4 py-2 text-gray-600 border-t border-gray-300'>
                  {chapter.chapterContent.map((lecture, i) => (
                    <li key={i} className='flex items-start gap-2 py-1'>
                      <img src={assets.play_icon} alt="play icon" className='w-4 h-4 mt-1 flex-shrink-0' />
                      <div className='flex items-center justify-between w-full text-gray-800 text-xs md:text-default min-w-0'>
                        <p className='pr-6 break-words leading-relaxed'>{lecture.lectureTitle}</p>
                        <div className='flex items-center gap-5 flex-shrink-0 text-gray-500 ml-auto'>
                          {lecture.isPreviewFree && (
                            <p
                              onClick={() => handlePreviewLecture(lecture.lectureUrl)}
                              className='text-blue-500 cursor-pointer hover:underline whitespace-nowrap'
                            >
                              Xem thử
                            </p>
                          )}
                          <p className='whitespace-nowrap'>
                            {humanizeDuration(lecture.lectureDuration * 60 * 1000, {
                              units: ['h', 'm'],
                              language: 'vi',
                              languages: { vi: { h: () => 'giờ', m: () => 'phút' } }
                            })}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className='py-20 text-sm md:text-default'>
        <h3 className='text-xl font-semibold text-gray-800'>Mô tả khóa học</h3>
        <p className='pt-3 rich-text' 
        dangerouslySetInnerHTML={{__html : courseData.courseDescription}}></p>
      </div>

      </div>

      {/* right column */}
      <div className='max-w-course-card z-10 shadow-custom-card rounded-t md:rounded-none overflow-hidden bg-white win-w-[300px] sm:min-w-105'>

        {
          playerData ? 
                <div className='relative'>
                  <Youtube
                    key={playerData.instanceKey}
                    videoId={playerData.videoId}
                    opts={{
                      playerVars: {
                        autoplay: 1,
                        start: 0,
                        end: PREVIEW_DURATION_SECONDS,
                        rel: 0,
                        modestbranding: 1,
                      }
                    }}
                    onStateChange={handlePlayerStateChange}
                    iframeClassName='w-full aspect-video'
                  />

                  {playerData.isPreview && (
                    <>
                      <div className='absolute top-3 left-3 bg-black/75 text-white px-3 py-1.5 rounded-full text-xs font-medium'>
                        Xem thử tối đa 04:11
                      </div>
                      <div className='absolute bottom-0 left-0 right-0 p-3 bg-linear-to-t from-black/70 to-transparent'>
                        <p className='text-white text-xs mb-1.5'>
                          Xem thử đến 4:11. Hãy đăng ký để xem toàn bộ nội dung khóa học.
                        </p>
                        <div className='h-1.5 w-full rounded-full bg-white/30 overflow-hidden'>
                          <div
                            className='h-full bg-blue-500 rounded-full transition-all duration-300'
                            style={{ width: `${Math.min(100, Math.max(0, ((PREVIEW_DURATION_SECONDS - previewRemainingSeconds) / PREVIEW_DURATION_SECONDS) * 100))}%` }}
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              : <img src={courseData.courseThumbnail} alt="" />
        }
        
        <div className='p-5'>
          <div className='flex items-center gap-2'>
            <img className='w-3.5' src={assets.time_left_clock_icon} alt="time left clock icon" />
            <p className='text-red-500'><span className='font-medium'>Còn 5 ngày</span> với mức giá ưu đãi này</p>
          </div>

          <div className='flex gap-3 items-center pt-2'>
            <p className='text-gray-800 md:text-4xl text-2xl font-semibold'>{formatCurrency(courseData.coursePrice - courseData.discount * courseData.coursePrice / 100)}</p>
            <p className='md:text-lg text-gray-500 line-through'>{formatCurrency(courseData.coursePrice)}</p>
            <p className='md:text-lg text-gray-500'>Giảm {courseData.discount}%</p>
          </div>

          <div className='flex items-center text-sm md:text-default gap-4 pt-2 md:pt-4 text-gray-500'>
            <div className='flex items-center gap-1'>
              <img src={assets.star} alt="star icon" />
              <p>{calculateRating(courseData)}</p>
            </div>

            <div className='h-4 w-px bg-gray-500/40'></div>

            <div className='flex items-center gap-1'>
              <img src={assets.time_clock_icon} alt="time clock icon" />
              <p>{calculateCourseDuration(courseData)}</p>
            </div>

            <div className='h-4 w-px bg-gray-500/40'></div>

            <div className='flex items-center gap-1'>
              <img src={assets.lesson_icon} alt="lesson icon" />
              <p>{calculateNoOfLectures(courseData)} bài giảng</p>
            </div>
            
          </div>

          <button onClick={enrollCourse} className='md:mt-5 mt-4 w-full py-3 rounded bg-blue-600 text-white font-medium'>{isAlreadyEnrolled ? 'Truy cập bài giảng' : 'Đăng ký ngay'}</button>

          <div className='pt-6'>
            <p className='md:text-xl text-lg font-medium text-gray-800'>Bạn nhận được gì từ khóa học?</p>
            <ul className='ml-4 pt-2 text-sm md:text-default list-disc text-gray-500'>
              <li>Truy cập trọn đời và cập nhật miễn phí.</li>
              <li>Hướng dẫn thực hành từng bước qua dự án.</li>
              <li>Tài nguyên và mã nguồn có thể tải về.</li>
              <li>Bài kiểm tra đánh giá kiến thức.</li>
              <li>Cấp chứng nhận hoàn thành khóa học.</li>
            </ul>
          </div>

        </div>
      </div>
    </div>
    <Footer />
    </>
  ) : <Loading />
}

export default CourseDetails
