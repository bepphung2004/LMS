import React, { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AppContext } from '../../context/AppContext'
import SearchBar from '../../components/student/SearchBar'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import CourseCard from '../../components/student/CourseCard'
import { assets } from '../../assets/assets'
import Footer from '../../components/student/Footer'
import axios from 'axios'
import { toast } from 'react-toastify'
import Pagination from '../../components/Pagination'

const DEBOUNCE_MS = 500

const SkeletonCard = () => (
  <div className='bg-white border border-gray-100 rounded-lg p-3 animate-pulse'>
    <div className='w-full h-24 bg-gray-200 rounded-md mb-2' />
    <div className='h-3 bg-gray-200 rounded w-3/4 mb-2' />
    <div className='h-2 bg-gray-100 rounded w-1/2' />
  </div>
)

const SkeletonOverview = () => (
  <div className='mt-8 border rounded-2xl bg-linear-to-r from-cyan-50 to-blue-50 p-6 animate-pulse'>
    <div className='flex items-center gap-3 mb-5'>
      <div className='h-7 bg-gray-200 rounded w-40' />
    </div>
    <div className='bg-white border border-blue-100 rounded-xl p-5'>
      <div className='space-y-3'>
        <div className='h-4 bg-gray-200 rounded w-full' />
        <div className='h-4 bg-gray-200 rounded w-5/6' />
        <div className='h-4 bg-gray-100 rounded w-2/3' />
      </div>
      <div className='mt-6 border-t border-blue-50 pt-4'>
        <div className='h-3 bg-gray-200 rounded w-48 mb-4' />
        <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4'>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  </div>
)

const CoursesList = () => {

  const { navigate, allCourses, backendUrl, fetchAllCourses } = useContext(AppContext)
  const { input } = useParams()
  const [searchParams, setSearchParams] = useSearchParams()
  const keyword = (searchParams.get('q') || input || '').trim()
  const [filteredCourse, setFilteredCourse] = useState([])
  const [aiAdvice, setAiAdvice] = useState(null)
  const [aiRecommendations, setAiRecommendations] = useState([])
  const [searchMeta, setSearchMeta] = useState(null)
  const [overviewLoading, setOverviewLoading] = useState(false)
  const debounceRef = useRef(null)

  const [priceRange, setPriceRange] = useState({ min: '', max: '' })
  const [topicFilter, setTopicFilter] = useState('all')
  const [durationFilter, setDurationFilter] = useState('all')
  const [levelFilter, setLevelFilter] = useState('all')
  const [page, setPage] = useState(1)
  const limit = 8

  const hasAiOverview = (typeof aiAdvice === 'string' && aiAdvice.trim().length > 0) || aiRecommendations.length > 0

  // Collect AI recommendation IDs for badge display
  const aiRecommendedIds = useMemo(() => {
    return new Set(aiRecommendations.map(c => c._id))
  }, [aiRecommendations])

  // Show AI recommendations first, then normal keyword/filter results (deduplicated by _id)
  const prioritizedCourses = useMemo(() => {
    const aiTop = aiRecommendations.slice(0, 3)
    const merged = [...aiTop]
    const existingIds = new Set(aiTop.map(course => String(course._id)))

    filteredCourse.forEach((course) => {
      const id = String(course._id)
      if (!existingIds.has(id)) {
        merged.push(course)
      }
    })

    return merged
  }, [aiRecommendations, filteredCourse])

  const availableTopics = useMemo(() => {
    const topics = allCourses.map(course => course.courseTopic).filter(Boolean)
    return [...new Set(topics)].sort((a, b) => a.localeCompare(b, 'vi'))
  }, [allCourses])

  const normalizeText = (value = '') => {
    return String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
  }

  const matchDuration = (hours) => {
    if (durationFilter === 'all') return true
    const duration = Number(hours || 0)
    if (durationFilter === 'short') return duration > 0 && duration <= 4
    if (durationFilter === 'medium') return duration > 4 && duration <= 10
    if (durationFilter === 'long') return duration > 10
    return true
  }

  const matchKeyword = (course, searchKeyword) => {
    if (!searchKeyword) return true
    const key = normalizeText(searchKeyword)

    const haystacks = [
      course.courseTitle,
      course.courseDescription,
      course.courseTopic,
      course.courseLevel,
      ...(course.courseTags || [])
    ]

    return haystacks.some(item => normalizeText(item).includes(key))
  }

  const discountedPrice = (course) => {
    return Number((course.coursePrice - (course.discount * course.coursePrice) / 100).toFixed(2))
  }

  useEffect(() => {
    void fetchAllCourses()
  }, [])

  useEffect(() => {
    if (!allCourses || allCourses.length === 0) return

    const minPrice = Number(priceRange.min || 0)
    const maxPrice = Number(priceRange.max || Number.MAX_SAFE_INTEGER)

    const filtered = allCourses.filter((course) => {
      if (!matchKeyword(course, keyword)) return false
      if (topicFilter !== 'all' && course.courseTopic !== topicFilter) return false
      if (levelFilter !== 'all' && (course.courseLevel || 'beginner') !== levelFilter) return false
      if (!matchDuration(course.estimatedDurationHours)) return false

      const finalPrice = discountedPrice(course)
      if (Number.isFinite(minPrice) && finalPrice < minPrice) return false
      if (Number.isFinite(maxPrice) && finalPrice > maxPrice) return false

      return true
    })

    setFilteredCourse(filtered)
  }, [allCourses, keyword, topicFilter, levelFilter, durationFilter, priceRange])

  useEffect(() => {
    setPage(1)
  }, [keyword, topicFilter, levelFilter, durationFilter, priceRange])

  const totalPages = Math.max(1, Math.ceil(prioritizedCourses.length / limit))

  const paginatedCourses = useMemo(() => {
    const startIndex = (page - 1) * limit
    return prioritizedCourses.slice(startIndex, startIndex + limit)
  }, [prioritizedCourses, page, limit])

  const handlePageChange = (newPage) => {
    setPage(newPage)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
      debounceRef.current = null
    }

    if (!keyword) {
      setAiAdvice(null)
      setAiRecommendations([])
      setSearchMeta(null)
      setOverviewLoading(false)
      return
    }

    // Show skeleton immediately
    setOverviewLoading(true)
    setAiAdvice(null)
    setAiRecommendations([])
    setSearchMeta(null)

    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await axios.post(`${backendUrl}/api/course/semantic-overview`, {
          query: keyword,
          limit: 5
        })
        if (data.success) {
          const safeAdvice = typeof data.advice === 'string'
            ? data.advice.replace(/\*/g, '').trim()
            : null
          setAiAdvice(safeAdvice)
          setAiRecommendations(data.recommendations || [])
          setSearchMeta(data.meta || null)
        } else {
          setAiAdvice(null)
          setAiRecommendations([])
          setSearchMeta(null)
          toast.error(data.message || 'Không thể tạo AI Overview')
        }
      } catch (error) {
        setAiAdvice(null)
        setAiRecommendations([])
        setSearchMeta(null)
        toast.error(error.response?.data?.message || error.message)
      } finally {
        setOverviewLoading(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [backendUrl, keyword])

  const clearKeyword = () => {
    setSearchParams({})
  }

  const resetFilters = () => {
    setPriceRange({ min: '', max: '' })
    setTopicFilter('all')
    setDurationFilter('all')
    setLevelFilter('all')
  }

  return (
    <>
    <div className='relative md:px-36 px-8 pt-20 text-left min-h-[calc(100vh-72px)]'>
      <div className='flex md:flex-row flex-col gap-6 items-start justify-between w-full'>
        <div>
          <h1 className='text-4xl font-semibold text-gray-800'>Danh sách khóa học</h1>
          <p className='text-gray-500'>
          <span className='text-blue-600 cursor-pointer' onClick={() => navigate('/')}>Trang chủ </span> / <span>Danh sách khóa học</span></p>
        </div>
        <SearchBar data={keyword}/>
      </div>
      { keyword && <div className='inline-flex items-center gap-4 px-4 py-2 border mt-8 text-gray-600 bg-white rounded'>
        <p>Từ khóa: <span className='font-medium'>{keyword}</span></p>
        <img src={assets.cross_icon} alt="" className='cursor-pointer' onClick={clearKeyword} />
      </div>
      }

      {/* AI Overview — Skeleton while loading */}
      {keyword && overviewLoading && <SkeletonOverview />}

      {/* AI Overview — Results */}
      {keyword && !overviewLoading && hasAiOverview && (
        <div className='mt-8 border rounded-2xl bg-linear-to-r from-cyan-50 to-blue-50 p-6'>
          <div className='flex items-center justify-between gap-4 flex-wrap'>
            <div className='flex items-center gap-3'>
              <h2 className='text-2xl font-semibold text-gray-800'>✨ AI Overview</h2>
            </div>
            {searchMeta && (
              <span className='text-xs text-gray-500'>
                {searchMeta.totalMatches} khóa học phù hợp{searchMeta.embeddingCached ? ' • Cache ✓' : ''}
              </span>
            )}
          </div>

          <div className='mt-5 grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='col-span-full bg-white border border-blue-100 rounded-xl p-5'>
              {aiAdvice && (
                <p className='text-md md:text-lg text-gray-700 leading-relaxed whitespace-pre-line'>{aiAdvice}</p>
              )}

              {aiRecommendations.length > 0 && (
                <div className={aiAdvice ? 'mt-6 border-t border-blue-50 pt-4' : ''}>
                  <h4 className="text-sm font-bold text-gray-800 mb-4">Top courses to get started:</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {aiRecommendations.slice(0, 3).map((course) => (
                      <Link
                        to={`/course/${course._id}`}
                        key={course._id}
                        onClick={() => window.scrollTo(0, 0)}
                        className="group bg-white border border-gray-100 rounded-lg p-3 hover:shadow-lg hover:-translate-y-1 transition-all cursor-pointer"
                      >
                        <img src={course.courseThumbnail} className="w-full h-24 object-cover rounded-md mb-2" alt="" />
                        <h5 className="text-xs font-bold text-gray-900 line-clamp-2 group-hover:text-blue-600">{course.courseTitle}</h5>
                        <div className='flex items-center gap-2 mt-2'>
                          <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
                            {course.courseLevel}
                          </span>
                          {(course.courseTags || []).slice(0, 2).map((tag) => (
                            <span key={tag} className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Search filters */}
      <div className='mt-8 border rounded-2xl bg-white p-5'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-xl font-semibold text-gray-800'>Bộ lọc tìm kiếm</h3>
          <button type='button' onClick={resetFilters} className='text-sm text-blue-600 hover:text-blue-700'>Đặt lại bộ lọc</button>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          <div>
            <p className='text-sm text-gray-600 mb-1'>Giá từ</p>
            <input type='number' min='0' value={priceRange.min} onChange={(e) => setPriceRange(prev => ({ ...prev, min: e.target.value }))} className='w-full border rounded-lg px-3 py-2 outline-none' placeholder='0' />
          </div>
          <div>
            <p className='text-sm text-gray-600 mb-1'>Giá đến</p>
            <input type='number' min='0' value={priceRange.max} onChange={(e) => setPriceRange(prev => ({ ...prev, max: e.target.value }))} className='w-full border rounded-lg px-3 py-2 outline-none' placeholder='Không giới hạn' />
          </div>
          <div>
            <p className='text-sm text-gray-600 mb-1'>Chủ đề</p>
            <select value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)} className='w-full border rounded-lg px-3 py-2 outline-none'>
              <option value='all'>Tất cả chủ đề</option>
              {availableTopics.map(topic => <option key={topic} value={topic}>{topic}</option>)}
            </select>
          </div>
          <div>
            <p className='text-sm text-gray-600 mb-1'>Trình độ</p>
            <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)} className='w-full border rounded-lg px-3 py-2 outline-none'>
              <option value='all'>Tất cả trình độ</option>
              <option value='beginner'>Cơ bản</option>
              <option value='intermediate'>Trung cấp</option>
              <option value='advanced'>Nâng cao</option>
              <option value='all-levels'>Mọi trình độ</option>
            </select>
          </div>
        </div>

        <div className='mt-4'>
          <p className='text-sm text-gray-600 mb-1'>Thời lượng</p>
          <div className='flex flex-wrap gap-3'>
            <button type='button' onClick={() => setDurationFilter('all')} className={`px-3 py-1.5 rounded-full border text-sm ${durationFilter === 'all' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600'}`}>Tất cả</button>
            <button type='button' onClick={() => setDurationFilter('short')} className={`px-3 py-1.5 rounded-full border text-sm ${durationFilter === 'short' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600'}`}>Dưới 4 giờ</button>
            <button type='button' onClick={() => setDurationFilter('medium')} className={`px-3 py-1.5 rounded-full border text-sm ${durationFilter === 'medium' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600'}`}>4 - 10 giờ</button>
            <button type='button' onClick={() => setDurationFilter('long')} className={`px-3 py-1.5 rounded-full border text-sm ${durationFilter === 'long' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600'}`}>Trên 10 giờ</button>
          </div>
        </div>
      </div>

      <div className='mt-8 mb-2 text-sm text-gray-600'>
        Tìm thấy <span className='font-semibold text-gray-800'>{prioritizedCourses.length}</span> khóa học phù hợp.
      </div>

      <div className='grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 my-16 gap-3 px-2 md:p-0'>
        {paginatedCourses.map((course, index) => <CourseCard key={index} course={course} isAiRecommended={aiRecommendedIds.has(course._id)} />)}
        {prioritizedCourses.length === 0 && (
          <div className='col-span-full py-12 text-center text-gray-500 border rounded-xl'>
            Không tìm thấy khóa học phù hợp với tiêu chí hiện tại.
          </div>
        )}
      </div>
      <Pagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
    </div>
    <Footer />
    </>
  )
}

export default CoursesList
