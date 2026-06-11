import React, { useState } from 'react'

const CourseDashboard = ({
  selectedCourse,
  courses,
  selectedCourseId,
  setSelectedCourseId,
  onBack,
  onAddQuiz,
  onEditQuiz,
  onDeleteQuiz,
  onAddFinalExam,
  onEditFinalExam,
  onDeleteFinalExam
}) => {
  const [activeTab, setActiveTab] = useState('lecture')
  const [openSections, setOpenSections] = useState({ 0: true }) // first chapter expanded by default

  const toggleSection = (index) => {
    setOpenSections((prev) => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  const getLectureQuizzes = (lecture) => {
    const rawQuiz = lecture?.lectureQuiz || []
    if (!Array.isArray(rawQuiz) || rawQuiz.length === 0) return []
    if (rawQuiz[0] && Array.isArray(rawQuiz[0].questions)) {
      return rawQuiz
    }
    return [{
      title: 'Quiz 1',
      questions: rawQuiz
    }]
  }

  const getLecturesList = () => {
    if (!selectedCourse || !selectedCourse.courseContent) return []
    const list = []
    selectedCourse.courseContent.forEach((chapter, cIdx) => {
      if (chapter.chapterContent) {
        chapter.chapterContent.forEach((lecture, lIdx) => {
          list.push({
            ...lecture,
            chapterTitle: chapter.chapterTitle,
            chapterIndex: cIdx + 1,
            lectureIndex: lIdx + 1,
          })
        })
      }
    })
    return list
  }

  const finalExamExists = selectedCourse.finalExam && selectedCourse.finalExam.questions && selectedCourse.finalExam.questions.length > 0
  const lecturesList = getLecturesList()

  return (
    <div className='space-y-6'>
      {/* Header navigation */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-250 pb-5'>
        <div className='space-y-1.5'>
          <button
            onClick={onBack}
            className='inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors uppercase tracking-wider'
          >
            <svg className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M10 19l-7-7m0 0l7-7m-7 7h18' />
            </svg>
            <span>Quay lại danh sách khóa học</span>
          </button>
          <h2 className='text-lg font-medium text-gray-800'>
            Tạo quizz luyện tập và bài kiểm tra cuối khóa
          </h2>
          <p className='text-gray-500 text-sm'>
            Khóa học hiện tại: <span className='font-semibold text-gray-750'>{selectedCourse.courseTitle}</span>
          </p>
        </div>

        {/* Quick switcher */}
        {/* <div className='w-full sm:w-64 flex flex-col gap-1'>
          <label className='text-xs font-semibold text-gray-400 uppercase tracking-wider'>Đổi khóa học nhanh</label>
          <select
            value={selectedCourseId}
            onChange={(e) => setSelectedCourseId(e.target.value)}
            className='outline-none w-full px-3 py-2 border border-gray-300 rounded focus:border-blue-500 bg-white font-medium text-gray-700 shadow-2xs text-xs'
          >
            {courses.map((course) => (
              <option key={course._id} value={course._id}>
                {course.courseTitle}
              </option>
            ))}
          </select>
        </div> */}
      </div>

      {/* Tab Selection */}
      <div className='flex border-b border-gray-200 gap-6'>
        <button
          onClick={() => setActiveTab('lecture')}
          className={`pb-3 text-sm font-semibold transition-all border-b-2 ${
            activeTab === 'lecture'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Quizz luyện tập
        </button>
        <button
          onClick={() => setActiveTab('final')}
          className={`pb-3 text-sm font-semibold transition-all border-b-2 ${
            activeTab === 'final'
              ? 'border-blue-600 text-blue-600 font-bold'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Bài kiểm tra cuối khóa
        </button>
      </div>

      {/* TAB 1: Lecture Quiz Management */}
      {activeTab === 'lecture' && (
        <div className='space-y-4'>
          {(!selectedCourse.courseContent || selectedCourse.courseContent.length === 0) ? (
            <div className='text-center py-16 bg-white border border-gray-200 rounded-xl text-gray-400 space-y-2 shadow-sm'>
              <p className='text-base font-semibold text-gray-750'>Khóa học này chưa có chương/bài giảng nào</p>
              <p className='text-sm text-gray-400'>Vui lòng thêm chương và bài giảng vào chương trình học trước.</p>
            </div>
          ) : (
            <div className='space-y-3.5'>
              {selectedCourse.courseContent.map((chapter, cIdx) => (
                <div key={chapter.chapterId || cIdx} className='border border-gray-200 bg-white rounded-xl shadow-sm overflow-hidden'>
                  {/* Chapter Accordion Header */}
                  <div
                    className='flex items-center justify-between px-5 py-4 cursor-pointer select-none bg-gray-50/70 hover:bg-gray-100/40 transition-colors'
                    onClick={() => toggleSection(cIdx)}
                  >
                    <div className='flex items-center gap-2.5 min-w-0'>
                      <svg className={`h-4.5 w-4.5 text-gray-500 transform transition-transform duration-200 ${openSections[cIdx] ? 'rotate-180' : ''}`} fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M19 9l-7 7-7-7' />
                      </svg>
                      <p className='font-semibold text-gray-800 text-sm md:text-base truncate'>
                        Chương {cIdx + 1}: {chapter.chapterTitle}
                      </p>
                    </div>
                    <p className='text-xs text-blue-650 bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full font-bold flex-shrink-0'>
                      {chapter.chapterContent?.length || 0} bài giảng
                    </p>
                  </div>

                  {/* Chapter Accordion Content */}
                  {openSections[cIdx] && (
                    <div className='border-t border-gray-200 p-4 space-y-3 bg-white animate-fadeIn'>
                      {(!chapter.chapterContent || chapter.chapterContent.length === 0) ? (
                        <div className='text-gray-400 text-xs italic py-2 text-center'>
                          Chương này chưa có bài giảng nào.
                        </div>
                      ) : (
                        chapter.chapterContent.map((lecture, lIdx) => {
                          const quizzes = getLectureQuizzes(lecture)
                          return (
                            <div key={lecture.lectureId} className='border border-gray-200 rounded-lg p-4 bg-gray-50/30 hover:bg-gray-50/80 transition-colors space-y-3'>
                              <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
                                <div className='flex items-center gap-2.5 min-w-0'>
                                  <svg className='h-4.5 w-4.5 text-blue-600 flex-shrink-0' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z' />
                                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
                                  </svg>
                                  <h4 className='font-bold text-gray-800 text-sm truncate'>
                                    Bài {cIdx + 1}.{lIdx + 1}: {lecture.lectureTitle}
                                  </h4>
                                  <span className='text-[10px] text-gray-400 font-bold bg-gray-100 border border-gray-200 px-2 py-0.5 rounded flex-shrink-0'>
                                    {quizzes.length} bộ đề
                                  </span>
                                </div>
                                
                                <button
                                  onClick={() => onAddQuiz({ ...lecture, chapterIndex: cIdx + 1, lectureIndex: lIdx + 1, chapterTitle: chapter.chapterTitle })}
                                  className='self-start sm:self-center px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-655 rounded text-xs font-semibold transition-all flex items-center gap-1 shadow-2xs'
                                >
                                  <svg className='h-3.5 w-3.5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M12 4v16m8-8H4' />
                                  </svg>
                                  <span>Thêm Quiz</span>
                                </button>
                              </div>

                              {/* Quizzes nested */}
                              {quizzes.length > 0 && (
                                <div className='pl-6 grid grid-cols-1 gap-2 border-l border-gray-200 ml-2'>
                                  {quizzes.map((quiz, quizIdx) => (
                                    <div key={quizIdx} className='flex items-center justify-between bg-white px-3.5 py-2 rounded-lg border border-gray-200 hover:border-blue-400 transition-colors shadow-2xs'>
                                      <div className='flex items-center gap-2.5 min-w-0'>
                                        <div className='w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0' />
                                        <span className='font-semibold text-gray-750 text-xs md:text-sm truncate'>{quiz.title || `Quiz ${quizIdx + 1}`}</span>
                                        <span className='text-[10px] text-gray-400 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded font-semibold flex-shrink-0'>
                                          {quiz.questions?.length || 0} câu hỏi
                                        </span>
                                      </div>
                                      <div className='flex items-center gap-2 flex-shrink-0'>
                                        <button
                                          onClick={() => onEditQuiz({ ...lecture, chapterIndex: cIdx + 1, lectureIndex: lIdx + 1, chapterTitle: chapter.chapterTitle }, quizIdx)}
                                          className='p-1 hover:bg-blue-50 text-blue-600 rounded transition-colors text-xs font-medium flex items-center gap-0.5'
                                        >
                                          <svg className='h-3.5 w-3.5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' />
                                          </svg>
                                          <span>Sửa</span>
                                        </button>
                                        <button
                                          onClick={() => onDeleteQuiz({ ...lecture, chapterIndex: cIdx + 1, lectureIndex: lIdx + 1, chapterTitle: chapter.chapterTitle }, quizIdx)}
                                          className='p-1 hover:bg-red-50 text-red-600 rounded transition-colors text-xs font-medium flex items-center gap-0.5'
                                        >
                                          <svg className='h-3.5 w-3.5' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' />
                                          </svg>
                                          <span>Xóa</span>
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Final Exam Management */}
      {activeTab === 'final' && (
        <div className='space-y-6'>
          {!finalExamExists ? (
            <div className='bg-white rounded-xl border border-gray-200 p-8 shadow-sm text-center space-y-5 max-w-md mx-auto'>
              <div className='w-16 h-16 bg-blue-50 rounded-full border border-blue-100 flex items-center justify-center mx-auto shadow-2xs'>
                <svg className='h-8 w-8 text-blue-550' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222' />
                </svg>
              </div>
              <div className='space-y-2'>
                <h3 className='font-bold text-gray-800 text-base'>Chưa có đề thi cuối khóa</h3>
                <p className='text-gray-400 text-xs px-4'>
                  Thiết lập bài kiểm tra tốt nghiệp để học viên hoàn thành khóa học và được cấp chứng nhận.
                </p>
              </div>
              <button
                onClick={onAddFinalExam}
                className='w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold transition-all shadow-sm'
              >
                + Tạo bài kiểm tra cuối khóa
              </button>
            </div>
          ) : (
            <div className='bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-5 max-w-xl mx-auto'>
              <div className='flex items-center gap-4'>
                <div className='w-12 h-12 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center shadow-2xs'>
                  <svg className='h-6 w-6 text-blue-650' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' />
                  </svg>
                </div>
                <div>
                  <h3 className='font-bold text-gray-850 text-base'>Bài kiểm tra tốt nghiệp cuối khóa</h3>
                  <p className='text-gray-400 text-xs mt-0.5'>Đã cấu hình và sẵn sàng cho học viên thi.</p>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-150'>
                <div>
                  <span className='text-xs text-gray-405 font-bold block'>Số câu hỏi đề thi</span>
                  <span className='text-sm font-extrabold text-gray-750'>{selectedCourse.finalExam.questions?.length || 0} câu hỏi</span>
                </div>
                <div>
                  <span className='text-xs text-gray-405 font-bold block'>Điểm đạt tối thiểu</span>
                  <span className='text-sm font-extrabold text-gray-750'>{selectedCourse.finalExam.requiredScorePercent ?? 70}%</span>
                </div>
              </div>

              <div className='flex items-center gap-3 pt-2 border-t border-gray-100'>
                <button
                  onClick={onEditFinalExam}
                  className='flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm font-semibold transition-all flex items-center justify-center gap-1.5 shadow-2xs'
                >
                  <svg className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' />
                  </svg>
                  <span>Sửa cấu hình bài thi</span>
                </button>
                <button
                  onClick={onDeleteFinalExam}
                  className='py-2 px-4 border border-red-200 text-red-600 hover:bg-red-50 rounded text-sm font-medium transition-all flex items-center justify-center gap-1.5'
                >
                  <svg className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' />
                  </svg>
                  <span>Xóa</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default CourseDashboard
