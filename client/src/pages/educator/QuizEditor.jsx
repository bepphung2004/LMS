import React, { useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'

const cleanOptionText = (opt, optIdx) => {
  if (typeof opt !== 'string') return ''
  const upper = String.fromCharCode(65 + optIdx)
  const lower = String.fromCharCode(97 + optIdx)
  const regex = new RegExp(`^[${upper}${lower}][.)]\\s*`)
  return opt.replace(regex, '')
}

const cleanQuestions = (questions) => {
  if (!Array.isArray(questions)) return []
  return questions.map(q => ({
    ...q,
    options: Array.isArray(q.options)
      ? q.options.map((opt, oIdx) => cleanOptionText(opt, oIdx))
      : ['', '', '', '']
  }))
}

const QuizEditor = ({
  courseId,
  lectureId,
  lectureTitle,
  initialTitle,
  initialQuestions,
  onSave,
  onCancel,
  backendUrl,
  getToken,
  saving
}) => {
  const [quizTitle, setQuizTitle] = useState(initialTitle || '')
  const [quizQuestions, setQuizQuestions] = useState(() => {
    const raw = JSON.parse(JSON.stringify(initialQuestions || []))
    return cleanQuestions(raw)
  })
  const [lectureActiveIdx, setLectureActiveIdx] = useState(0)
  const [expandedLectureIdx, setExpandedLectureIdx] = useState(null)
  const [generating, setGenerating] = useState(false)

  // Helpers for Quiz editing inputs
  const updateQuizQuestionText = (index, val) => {
    const updated = [...quizQuestions]
    updated[index].question = val
    setQuizQuestions(updated)
  }

  const updateQuizChoiceText = (qIdx, optIdx, val) => {
    const updated = [...quizQuestions]
    updated[qIdx].options[optIdx] = val
    setQuizQuestions(updated)
  }

  const updateQuizCorrectAnswer = (qIdx, val) => {
    const updated = [...quizQuestions]
    updated[qIdx].correctAnswer = Number(val)
    setQuizQuestions(updated)
  }

  const updateQuizExplanationText = (qIdx, val) => {
    const updated = [...quizQuestions]
    updated[qIdx].explanation = val
    setQuizQuestions(updated)
  }

  const handleAddQuizQuestion = () => {
    const blank = {
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: ''
    }
    const newQuestions = [...quizQuestions, blank]
    setQuizQuestions(newQuestions)
    setLectureActiveIdx(newQuestions.length - 1)
  }

  const handleRemoveQuizQuestion = (idx) => {
    const newQuestions = quizQuestions.filter((_, i) => i !== idx)
    setQuizQuestions(newQuestions)
    if (lectureActiveIdx >= newQuestions.length) {
      setLectureActiveIdx(Math.max(0, newQuestions.length - 1))
    }
  }

  // AI Generation
  const handleGenerateAI = async () => {
    if (!courseId || !lectureId) return
    setGenerating(true)
    try {
      const token = await getToken()
      const { data } = await axios.post(`${backendUrl}/api/ai/generate-quiz`, {
        courseId,
        lectureId,
        numberOfQuestions: 5
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (data.success && data.quiz && data.quiz.length > 0) {
        setQuizQuestions(cleanQuestions(data.quiz))
        setLectureActiveIdx(0)
        setExpandedLectureIdx(null)
        toast.success(`Đã tạo câu hỏi thành công bằng AI! (${data.hasTranscript ? 'Dựa trên transcript' : 'Dựa trên ngữ cảnh dự phòng'})`)
      } else {
        toast.error('AI không thể tạo quiz cho bài giảng này')
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi khi gọi AI tạo quiz')
    } finally {
      setGenerating(false)
    }
  }

  const handleSaveClick = () => {
    if (!quizTitle.trim()) {
      toast.warning('Vui lòng nhập tiêu đề Quiz')
      return
    }
    if (quizQuestions.length === 0) {
      toast.warning('Vui lòng thêm ít nhất một câu hỏi')
      return
    }
    onSave(quizTitle.trim(), quizQuestions)
  }

  return (
    <div className='space-y-6'>
      {/* Editor Header */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-250 pb-5'>
        <div className='space-y-1.5 flex-1'>
          <button
            onClick={onCancel}
            className='inline-flex items-center gap-1.5 text-xs font-bold text-gray-500 hover:text-gray-800 transition-colors uppercase tracking-wider'
          >
            <svg className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M10 19l-7-7m0 0l7-7m-7 7h18' />
            </svg>
            <span>Quay lại trang quản lý</span>
          </button>
          <div className='flex flex-wrap items-center gap-3'>
            <h2 className='text-lg font-medium text-gray-800'>
              {initialTitle ? 'Cập Nhật Quiz' : 'Tạo Quiz Mới'}
            </h2>
            <span className='text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-100/50 px-2.5 py-0.5 rounded'>
              Bài giảng: {lectureTitle}
            </span>
          </div>
        </div>

        <div className='flex items-center gap-2.5'>
          {/* AI Generator Button */}
          <button
            onClick={handleGenerateAI}
            disabled={generating}
            className='inline-flex items-center justify-center gap-1.5 bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 hover:from-violet-700 hover:via-purple-700 hover:to-fuchsia-700 text-white text-xs font-bold px-4 py-2.5 rounded-lg shadow-[0_2px_8px_rgba(124,58,237,0.3)] hover:shadow-[0_4px_12px_rgba(124,58,237,0.45)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50'
          >
            {generating ? (
              <>
                <svg className='animate-spin h-3.5 w-3.5 text-white' fill='none' viewBox='0 0 24 24'>
                  <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
                  <path className='opacity-75' fill='currentColor' d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z' />
                </svg>
                <span>Đang tạo bằng AI...</span>
              </>
            ) : (
              <span>✨ Tạo đề bằng AI</span>
            )}
          </button>
          
          <button
            onClick={handleSaveClick}
            disabled={saving}
            className='px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow transition-all text-xs disabled:opacity-50'
          >
            {saving ? 'Đang lưu...' : 'Lưu Quiz'}
          </button>
        </div>
      </div>

      {/* Title configuration */}
      <div className='bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col gap-2'>
        <label className='text-xs font-semibold text-blue-600 uppercase tracking-wider block'>Tiêu đề Quiz</label>
        <input
          type='text'
          value={quizTitle}
          onChange={(e) => setQuizTitle(e.target.value)}
          className='outline-none w-full px-4 py-2.5 border border-gray-300 rounded focus:border-blue-500 bg-white font-bold text-gray-800 shadow-2xs text-sm'
          placeholder='Ví dụ: Quiz luyện tập chương 1...'
        />
      </div>

      {/* 2-Column Editor Layout */}
      <div className='grid grid-cols-1 xl:grid-cols-5 gap-6 items-start'>
        {/* Left Column: Question Builder */}
        <div className='xl:col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6'>
          <div className='flex items-center justify-between border-b border-gray-100 pb-4'>
            <h3 className='font-bold text-gray-800 text-base'>
              {quizQuestions.length > 0
                ? `Soạn câu hỏi ${lectureActiveIdx + 1}`
                : 'Chưa có câu hỏi'}
            </h3>
            <span className='text-xs font-semibold text-gray-550 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded'>
              Tổng cộng: {quizQuestions.length} câu
            </span>
          </div>

          {quizQuestions.length > 0 && quizQuestions[lectureActiveIdx] ? (
            <div className='space-y-5'>
              {/* Question Text */}
              <div className='space-y-2'>
                <label className='text-xs font-semibold text-gray-500 uppercase tracking-wider block'>Nội dung câu hỏi</label>
                <textarea
                  value={quizQuestions[lectureActiveIdx].question || ''}
                  onChange={(e) => updateQuizQuestionText(lectureActiveIdx, e.target.value)}
                  className='outline-none w-full px-4 py-3 border border-gray-350 rounded focus:border-blue-500 bg-gray-50/20 hover:bg-white focus:bg-white text-gray-800 text-sm transition-all h-24 resize-none'
                  placeholder='Nhập nội dung câu hỏi trắc nghiệm...'
                />
              </div>

              {/* Options */}
              <div className='space-y-3.5'>
                <label className='text-xs font-semibold text-gray-555 uppercase tracking-wider block'>Các phương án </label>
                {quizQuestions[lectureActiveIdx].options.map((opt, optIdx) => (
                  <div key={optIdx} className='flex items-center gap-3'>
                    <input
                      type='radio'
                      name={`correctAnswer-lecture-quiz-${lectureActiveIdx}`}
                      checked={quizQuestions[lectureActiveIdx].correctAnswer === optIdx}
                      onChange={() => updateQuizCorrectAnswer(lectureActiveIdx, optIdx)}
                      className='h-5 w-5 text-blue-600 border-gray-300 focus:ring-blue-500 cursor-pointer accent-blue-600'
                    />
                    <div className='flex-1 flex items-center gap-2'>
                      <span className='font-extrabold text-gray-400 text-sm w-4'>{String.fromCharCode(65 + optIdx)}</span>
                      <input
                        type='text'
                        value={opt}
                        onChange={(e) => updateQuizChoiceText(lectureActiveIdx, optIdx, e.target.value)}
                        onBlur={(e) => {
                          const cleaned = cleanOptionText(e.target.value, optIdx)
                          if (cleaned !== e.target.value) {
                            updateQuizChoiceText(lectureActiveIdx, optIdx, cleaned)
                          }
                        }}
                        className='outline-none flex-1 px-4 py-2 border border-gray-300 rounded focus:border-blue-500 bg-white text-gray-855 text-sm transition-all'
                        placeholder={`Nhập phương án ${String.fromCharCode(65 + optIdx)}...`}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Explanation */}
              <div className='space-y-2'>
                <label className='text-xs font-semibold text-gray-500 uppercase tracking-wider block'>Giải thích đáp án</label>
                <input
                  type='text'
                  value={quizQuestions[lectureActiveIdx].explanation || ''}
                  onChange={(e) => updateQuizExplanationText(lectureActiveIdx, e.target.value)}
                  className='outline-none w-full px-4 py-2.5 border border-gray-300 rounded focus:border-blue-500 bg-white text-gray-850 text-sm transition-all'
                  placeholder='Lý giải vì sao đáp án này đúng...'
                />
              </div>
            </div>
          ) : (
            <div className='text-center py-10 border border-dashed border-gray-250 rounded-lg text-gray-400 text-sm'>
              Chưa có câu hỏi nào trong Quiz.
            </div>
          )}

          <button
            type='button'
            onClick={handleAddQuizQuestion}
            className='w-full py-2.5 bg-gray-50 hover:bg-gray-100 text-gray-800 border border-gray-200 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2'
          >
            + Thêm câu hỏi mới
          </button>
        </div>

        {/* Right Column: Live Quiz Preview */}
        <div className='xl:col-span-2 space-y-4'>
          <div className='flex items-center justify-between border-b border-gray-200 pb-3'>
            <h3 className='font-bold text-gray-800 text-sm md:text-base'>Danh sách câu hỏi</h3>
            <span className='text-xs text-gray-400'>Bấm vào câu hỏi để xem chi tiết</span>
          </div>

          <div className='space-y-3 max-h-[550px] overflow-y-auto pr-1'>
            {quizQuestions.length > 0 ? (
              quizQuestions.map((q, qIdx) => {
                const isActive = lectureActiveIdx === qIdx;
                const isExpanded = expandedLectureIdx === qIdx;
                return (
                  <div
                    key={qIdx}
                    className={`bg-white rounded-xl transition-all duration-200 overflow-hidden ${
                      isActive
                        ? 'border-l-4 border-l-blue-600 border border-gray-200 shadow-sm ring-1 ring-blue-500/5'
                        : 'border border-gray-200 shadow-2xs hover:border-gray-350'
                    }`}
                  >
                    {/* Card Header */}
                    <div
                      onClick={() => setExpandedLectureIdx(isExpanded ? null : qIdx)}
                      className='p-4 flex items-center justify-between cursor-pointer select-none gap-3 hover:bg-gray-50/20'
                    >
                      <div className='flex items-center gap-3 min-w-0 flex-1'>
                        <span className={`text-xs font-bold px-2.5 py-0.5 rounded flex-shrink-0 ${
                          isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'
                        }`}>
                          Câu {qIdx + 1}
                        </span>
                        <p className='font-semibold text-gray-850 text-xs md:text-sm truncate'>
                          {q.question || <span className='text-gray-400 italic font-normal'>Chưa nhập nội dung...</span>}
                        </p>
                      </div>
                      <div className='flex items-center gap-2 flex-shrink-0' onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => {
                            setLectureActiveIdx(qIdx)
                            setExpandedLectureIdx(qIdx)
                          }}
                          className={`px-2.5 py-1 rounded text-xs font-medium border transition-all ${
                            isActive
                              ? 'bg-blue-600 text-white border-transparent'
                              : 'bg-white text-blue-600 border-blue-100 hover:bg-blue-50'
                          }`}
                        >
                          Sửa
                        </button>
                        <button
                          onClick={() => {
                            if (window.confirm(`Xóa câu hỏi thứ ${qIdx + 1}?`)) {
                              handleRemoveQuizQuestion(qIdx)
                            }
                          }}
                          className='px-2.5 py-1 rounded text-xs font-medium bg-white text-red-650 border border-red-100 hover:bg-red-50 transition-all'
                        >
                          Xóa
                        </button>
                        <span className='text-gray-400 p-0.5'>
                          <svg
                            className={`h-4 w-4 transform transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                            fill='none'
                            viewBox='0 0 24 24'
                            stroke='currentColor'
                          >
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M19 9l-7 7-7-7' />
                          </svg>
                        </span>
                      </div>
                    </div>

                    {/* Card Body */}
                    {isExpanded && (
                      <div className='px-4 pb-4 pt-1.5 border-t border-gray-100 bg-gray-50/30 text-sm space-y-3.5'>
                        <div className='grid grid-cols-1 sm:grid-cols-2 gap-2.5'>
                          {q.options.map((opt, optIdx) => {
                            const isCorrect = q.correctAnswer === optIdx;
                            return (
                              <div
                                key={optIdx}
                                className={`flex items-start gap-2.5 p-2.5 rounded-lg border ${
                                  isCorrect
                                    ? 'bg-green-50 border-green-200 text-green-800 font-semibold'
                                    : 'bg-white border-gray-100 text-gray-655'
                                }`}
                              >
                                <span className={`inline-flex items-center justify-center h-5 w-5 rounded-full text-xs font-bold flex-shrink-0 ${
                                  isCorrect ? 'bg-green-500 text-white' : 'bg-gray-150 text-gray-400'
                                }`}>
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                <span className='break-words mt-0.5'>{opt || <span className='text-gray-350 italic'>Chưa nhập...</span>}</span>
                              </div>
                               )
                          })}
                        </div>
                        {q.explanation && (
                          <div className='p-3 bg-blue-50/50 rounded-lg border border-blue-100/50 text-xs text-blue-900'>
                            <strong className='font-semibold block mb-0.5'>Giải thích:</strong>
                            {q.explanation}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            ) : (
              <div className='text-center py-20 bg-white border border-gray-200 rounded-xl text-gray-400 text-sm'>
                Xem trước trống.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default QuizEditor
