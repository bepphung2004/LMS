import React, { useEffect, useRef, useState, useContext } from 'react'
import Quill from 'quill'
import { assets } from '../../assets/assets'
import { AppContext } from '../../context/AppContext'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import axios from 'axios'
import AIDescriptionGenerator from '../../components/educator/AIDescriptionGenerator'


const generateId = () =>
  (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

const AddCourse = () => {

  const { backendUrl, getToken, formatCurrency, fetchAllCourses } = useContext(AppContext)
  const navigate = useNavigate()
  const quillRef = useRef(null)
  const editorRef = useRef(null)

  const [courseTitle, setCourseTitle] = useState('')
  const [courseTopic, setCourseTopic] = useState('Tổng quát')
  const [courseLevel, setCourseLevel] = useState('beginner')
  const [courseTags, setCourseTags] = useState('')
  const [coursePrice, setCoursePrice] = useState(0)
  const [discount, setDiscount] = useState(0)
  const [image, setImage] = useState(null)
  const [chapters, setChapters] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [showPopup, setShowPopup] = useState(false)
  const [currentChapterId, setCurrentChapterId] = useState(null)
  const [lectureDetails, setLectureDetails] = useState({
    lectureTitle: '',
    lectureDuration: '',
    lectureUrl: '',
    isPreviewFree: false
  })

  const handleChapter = (action, chapterId) => {
    if (action === 'add') {
      const title = prompt('Nhập tên chương:')
      if (title) {
      const newChapter = {
        chapterId: generateId(),
        chapterTitle: title,
        chapterContent: [],
        collapsed: false,
        chapterOrder: chapters.length > 0 ? chapters.slice(-1)[0].chapterOrder + 1 : 1,
      };
      setChapters([...chapters, newChapter])
      }
    } else if (action === 'remove') {
      setChapters(chapters.filter((chapter) => chapter.chapterId !== chapterId))
    } else if (action === 'toggle') {
      setChapters(
        chapters.map((chapter) => chapter.chapterId === chapterId ?
          { ...chapter, collapsed: !chapter.collapsed } : chapter
        )
      )
    }
  }

  const handleLecture = (action, chapterId, lectureIndex) => {
    if (action === 'add') {
      setCurrentChapterId(chapterId)
      setShowPopup(true)
    } else if ( action === 'remove' ) {
      setChapters(
        chapters.map((chapter) => {
          if (chapter.chapterId === chapterId) {
            chapter.chapterContent.splice(lectureIndex, 1)
          }
          return chapter
        })
      )
    }
  }

  const addLecture = () => {
    setChapters(
      chapters.map((chapter) => {
        if (chapter.chapterId === currentChapterId) {
          const newLecture = {
            ...lectureDetails,
            lectureOrder: chapter.chapterContent.length > 0 ? chapter.chapterContent.slice(-1)[0].lectureOrder + 1 : 1,
            lectureId: generateId()
          }
          chapter.chapterContent.push(newLecture)
        }
        return chapter
      })
    )
    setShowPopup(false)
    setLectureDetails({
      lectureTitle: '',
      lectureDuration: '',
      lectureUrl: '',
      isPreviewFree: false
    })
  }

  const handleSubmit = async (e) => {
    try {
      e.preventDefault()
      if (submitting) return
      if (!image) {
        toast.error('Please upload course thumbnail')
        return
      }
      setSubmitting(true)

      const courseData = {
        courseTitle,
        courseDescription: quillRef.current.root.innerHTML,
        courseTopic,
        courseLevel,
        courseTags,
        coursePrice: Number(coursePrice),
        discount: Number(discount),
        courseContent: chapters
      }

      const formData = new FormData()
      formData.append('courseData', JSON.stringify(courseData))
      formData.append('image', image)

      const token = await getToken()

      const { data } = await axios.post(backendUrl + '/api/educator/add-course', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`
        }
      })

      if (data.success) {
        void fetchAllCourses()
        toast.success('Course added successfully')
        setCourseTitle('')
        setCourseTopic('Tổng quát')
        setCourseLevel('beginner')
        setCourseTags('')
        quillRef.current.root.innerHTML = ''
        setCoursePrice(0)
        setDiscount(0)
        setImage(null)
        setChapters([])
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    } finally {
      setSubmitting(false)
    }
    
  }

  useEffect(() => {
    // Initialize Quill only once
    if (!quillRef.current && editorRef.current) {
      quillRef.current = new Quill(editorRef.current, {
        theme: 'snow',
      })
    }
  }, [])

  const numericCoursePrice = Number(coursePrice) || 0
  const numericDiscount = Number(discount) || 0
  const finalCoursePrice = Math.max(0, numericCoursePrice - (numericCoursePrice * numericDiscount / 100))

  return (
    <div className='md:p-8 p-4 pt-8 pb-0 relative'>
      <form onSubmit={handleSubmit} className='w-full max-w-5xl text-gray-700 space-y-6 pb-8'>
        <div className='bg-white border border-gray-200 rounded-xl p-5 md:p-6 shadow-sm space-y-5'>
          <div className='flex items-center gap-3'>
            <button
              type='button'
              onClick={() => navigate('/educator/my-courses')}
              className='p-1.5 hover:bg-gray-100 text-gray-600 hover:text-gray-900 rounded-lg transition-colors border border-gray-200 cursor-pointer flex items-center justify-center'
              title='Quay lại quản lý khóa học'
            >
              <svg className='w-5 h-5' fill='none' stroke='currentColor' strokeWidth='2' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' d='M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18' />
              </svg>
            </button>
            <h1 className='text-2xl font-semibold text-gray-900'>Thêm khóa học mới</h1>
          </div>

          <div className='flex flex-col gap-1.5'>
            <p className='text-sm font-medium'>Tên khóa học</p>
            <input
              onChange={e => setCourseTitle(e.target.value)}
              value={courseTitle}
              type='text'
              placeholder='Nhập tên khóa học'
              className='outline-none md:py-2.5 py-2 px-3 rounded border border-gray-300 focus:border-blue-500'
              required
            />
          </div>

          <div className='flex flex-col gap-1.5'>
            <div className='flex items-center justify-between gap-3 flex-wrap'>
              <p className='text-sm font-medium'>Mô tả khóa học</p>
              <AIDescriptionGenerator
                currentTitle={courseTitle}
                onGenerate={(description) => {
                  if (quillRef.current) {
                    quillRef.current.setText(description || '')
                  }
                }}
              />
            </div>
            <div ref={editorRef} className='border border-gray-300 rounded min-h-44'></div>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='flex flex-col gap-1.5'>
              <p className='text-sm font-medium'>Chủ đề</p>
              <input
                onChange={e => setCourseTopic(e.target.value)}
                value={courseTopic}
                type='text'
                placeholder='Ví dụ: Lập trình web'
                className='outline-none md:py-2.5 py-2 px-3 rounded border border-gray-300 focus:border-blue-500'
              />
            </div>

            <div className='flex flex-col gap-1.5'>
              <p className='text-sm font-medium'>Trình độ</p>
              <select
                onChange={e => setCourseLevel(e.target.value)}
                value={courseLevel}
                className='outline-none md:py-2.5 py-2 px-3 rounded border border-gray-300 focus:border-blue-500'
              >
                <option value='beginner'>Cơ bản</option>
                <option value='intermediate'>Trung cấp</option>
                <option value='advanced'>Nâng cao</option>
                <option value='all-levels'>Mọi trình độ</option>
              </select>
            </div>

            <div className='md:col-span-2 flex flex-col gap-1.5'>
              <p className='text-sm font-medium'>Từ khóa (phân tách bằng dấu phẩy)</p>
              <input
                onChange={e => setCourseTags(e.target.value)}
                value={courseTags}
                type='text'
                placeholder='react, frontend, javascript'
                className='outline-none md:py-2.5 py-2 w-full px-3 rounded border border-gray-300 focus:border-blue-500'
              />
            </div>
          </div>

          <div className='grid grid-cols-1 md:grid-cols-3 gap-4 items-start'>
            <div className='flex flex-col gap-1.5'>
              <p className='text-sm font-medium'>Giá khóa học (VNĐ)</p>
              <div className='relative'>
                <input
                  onChange={e => setCoursePrice(e.target.value)}
                  value={coursePrice}
                  type='number'
                  min={0}
                  step={1000}
                  placeholder='0'
                  className='outline-none md:py-2.5 py-2 pl-3 pr-14 rounded border border-gray-300 focus:border-blue-500 w-full'
                  required
                />
                <span className='absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500'>VNĐ</span>
              </div>
            </div>

            <div className='flex flex-col gap-1.5'>
              <p className='text-sm font-medium'>Giảm giá (%)</p>
              <div className='relative'>
                <input
                  onChange={e => setDiscount(e.target.value)}
                  value={discount}
                  type='number'
                  min={0}
                  max={100}
                  placeholder='0'
                  className='outline-none md:py-2.5 py-2 pl-3 pr-10 rounded border border-gray-300 focus:border-blue-500 w-full'
                  required
                />
                <span className='absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500'>%</span>
              </div>
              <p className='text-xs text-gray-500'>Giá sau giảm: <span className='font-medium text-gray-700'>{formatCurrency(finalCoursePrice)}</span></p>
            </div>

            <div className='flex flex-col gap-1.5'>
              <p className='text-sm font-medium'>Ảnh đại diện khóa học</p>
              <label htmlFor='thumbnailImage' className='border border-dashed border-gray-300 rounded-lg p-3 flex items-center justify-between gap-3 cursor-pointer hover:border-blue-400 transition-colors'>
                <div className='flex items-center gap-3'>
                  <img src={assets.file_upload_icon} alt="" className='p-2.5 bg-blue-500 rounded' />
                  <div className='text-sm text-gray-600'>
                    <p>{image ? image.name : 'Chọn ảnh thumbnail'}</p>
                    <p className='text-xs text-gray-400'>PNG, JPG, WEBP</p>
                  </div>
                </div>
                {image && <img src={URL.createObjectURL(image)} alt="" className='w-14 h-10 object-cover rounded' />}
                <input type='file' id='thumbnailImage' onChange={e => setImage(e.target.files[0])} accept='image/*' hidden />
              </label>
            </div>
          </div>
        </div>

        {/* Adding Chapter & Lectures */}
        <div className='bg-white border border-gray-200 rounded-xl p-5 md:p-6 shadow-sm'>
          <p className='text-lg font-semibold text-gray-900 mb-4'>Nội dung khóa học</p>
          {chapters.map((chapter, chapterIndex) => (
            <div key={chapterIndex} className='bg-white border rounded-lg mb-4'>
              <div className='flex justify-between items-center p-4 border-b'>
                <div className='flex items-center'>
                  <img onClick={() => handleChapter('toggle', chapter.chapterId)} src={assets.dropdown_icon} width={14} alt="" className={`mr-2 cursor-pointer transition-all ${chapter.collapsed && 'rotate-90'}`} />
                  <span className='font-semibold'>{chapterIndex + 1}. {chapter.chapterTitle}</span>
                </div>
                <span className='text-gray-500 text-sm'>{chapter.chapterContent.length} bài giảng</span>
                <img className='cursor-pointer' src={assets.cross_icon} alt="" onClick={() => handleChapter('remove', chapter.chapterId)} />
              </div>
              {!chapter.collapsed && (
                <div className='p-4'>
                  {chapter.chapterContent.map((lecture, lectureIndex) => (
                    <div key={lectureIndex} className='flex justify-between items-center mb-2 text-sm'>
                      <span>{lectureIndex + 1} - {lecture.lectureTitle} - {lecture.lectureDuration} phút - <a href={lecture.lectureUrl} className='text-blue-600 hover:underline'>Liên kết</a> - {lecture.isPreviewFree ? 'Xem thử miễn phí' : 'Trả phí'}</span>
                      <img className='cursor-pointer' src={assets.cross_icon} alt="" onClick={() => handleLecture('remove', chapter.chapterId, lectureIndex)} />
                    </div>
                  ))}
                  <div className='inline-flex bg-gray-100 px-3 py-2 rounded cursor-pointer mt-2 text-sm hover:bg-gray-200' onClick={() => handleLecture('add', chapter.chapterId)}>+ Thêm bài giảng</div>
                </div>
              )}
            </div>
          ))}
          <div className='flex justify-center items-center bg-blue-100 p-2.5 rounded-lg cursor-pointer hover:bg-blue-200 font-medium' onClick={() => handleChapter('add')}>+ Thêm chương</div>

          {showPopup && (
            <div className='fixed inset-0 flex items-center justify-center z-50 bg-black/30'>
              <div className='bg-white text-gray-700 p-4 rounded relative w-full max-w-80'>
                <h2 className='text-lg font-semibold mb-4'>Thêm bài giảng</h2>

                <div className='mb-2'>
                  <p>Tên bài giảng</p>
                  <input
                    type="text"
                    className='mt-1 block w-full border rounded py-1 px-2'
                    value={lectureDetails.lectureTitle}
                    onChange={(e) => setLectureDetails({ ...lectureDetails, lectureTitle: e.target.value })}
                  />
                </div>

                <div className='mb-2'>
                  <p>Thời lượng (phút)</p>
                  <input
                    type="number"
                    className='mt-1 block w-full border rounded py-1 px-2'
                    value={lectureDetails.lectureDuration}
                    onChange={(e) => setLectureDetails({ ...lectureDetails, lectureDuration: e.target.value })}
                  />
                </div>

                <div className='mb-2'>
                  <p>Liên kết bài giảng</p>
                  <input
                    type="text"
                    className='mt-1 block w-full border rounded py-1 px-2'
                    value={lectureDetails.lectureUrl}
                    onChange={(e) => setLectureDetails({ ...lectureDetails, lectureUrl: e.target.value })}
                  />
                </div>

                <div className='mb-2 flex items-center gap-2'>
                  <label htmlFor='isPreviewFree' className='select-none'>Xem thử miễn phí?</label>
                  <input
                    id='isPreviewFree'
                    type="checkbox"
                    className='scale-125 accent-blue-500'
                    checked={lectureDetails.isPreviewFree}
                    onChange={(e) => setLectureDetails({ ...lectureDetails, isPreviewFree: e.target.checked })}
                  />
                </div>

                <button type='button' className='w-full bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded' onClick={addLecture}>Thêm</button>

                <img onClick={() => setShowPopup(false)} src={assets.cross_icon} alt="" className='absolute top-4 right-4 w-4 cursor-pointer' />
              </div>
            </div>
          )}
        </div>

        <div className='flex justify-end'>
          <button
            type='submit'
            disabled={submitting}
            className='bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white py-2.5 px-8 rounded'
          >
            {submitting ? 'ĐANG LƯU...' : 'THÊM KHÓA HỌC'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddCourse
