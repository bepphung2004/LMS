import React, { useState, useContext } from 'react'
import { AppContext } from '../../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { formatAiTextToHtml } from './aiTextFormatter'

const cleanOptionText = (opt, optIdx) => {
  if (typeof opt !== 'string') return ''
  const upper = String.fromCharCode(65 + optIdx)
  const lower = String.fromCharCode(97 + optIdx)
  const regex = new RegExp(`^[${upper}${lower}][.)]\\s*`)
  return opt.replace(regex, '')
}

// Lesson Summary Component
export const AILessonSummary = ({ courseId, chapterIndex, lectureIndex, lectureId, onClose }) => {
  const { backendUrl, getToken } = useContext(AppContext)
  const [summary, setSummary] = useState(null)
  const [loading, setLoading] = useState(false)

  const generateSummary = async () => {
    setLoading(true)
    try {
      const token = await getToken()
      const { data } = await axios.post(`${backendUrl}/api/ai/summarize`, {
        courseId,
        chapterIndex,
        lectureIndex,
        lectureId
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      
      if (data.success) {
        setSummary(data)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi tóm tắt bài học')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden'>
        <div className='p-6 border-b bg-linear-to-r from-purple-600 to-purple-700 text-white'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center'>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h3 className='font-semibold text-lg'>Tóm tắt bài học</h3>
                <p className='text-sm text-purple-100'>Được tạo bởi AI</p>
              </div>
            </div>
            <button onClick={onClose} className='p-2 hover:bg-white/20 rounded-lg transition-colors'>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className='p-6 overflow-y-auto max-h-[60vh]'>
          {!summary && !loading && (
            <div className='text-center py-12'>
              <div className='w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                <svg className="w-10 h-10 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h4 className='text-lg font-semibold text-gray-800 mb-2'>Tóm tắt nội dung bài học</h4>
              <p className='text-gray-500 mb-6'>AI sẽ phân tích và tóm tắt các ý chính của bài học</p>
              <button
                onClick={generateSummary}
                className='bg-purple-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-purple-700 transition-colors'
              >
                Tạo tóm tắt
              </button>
            </div>
          )}
          
          {loading && (
            <div className='text-center py-12'>
              <div className='w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4'></div>
              <p className='text-gray-600'>Đang tạo tóm tắt...</p>
            </div>
          )}
          
          {summary && (
            <div className='ai-rich-text'>
              <h4 className='text-lg font-semibold text-gray-800 mb-4'>
                {summary.chapterTitle} - {summary.lectureTitle}
              </h4>
              <div 
                className='text-gray-700 leading-relaxed'
                dangerouslySetInnerHTML={{ __html: formatAiTextToHtml(summary.summary) }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Helper to normalize quizzes
const normalizeQuizzes = (lectureQuiz) => {
  if (!Array.isArray(lectureQuiz) || lectureQuiz.length === 0) return []
  if (lectureQuiz[0] && Array.isArray(lectureQuiz[0].questions)) {
    return lectureQuiz
  }
  return [{
    title: 'Quiz 1',
    questions: lectureQuiz
  }]
}

// Quiz Generator Component
export const AIQuizGenerator = ({ lecture, onClose }) => {
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [score, setScore] = useState(null)
  const [selectedQuizIdx, setSelectedQuizIdx] = useState(null)

  const rawQuiz = lecture?.lectureQuiz || []
  const quizzes = normalizeQuizzes(rawQuiz)
  const isPublished = quizzes.length > 0

  const activeQuiz = selectedQuizIdx !== null ? quizzes[selectedQuizIdx] : null
  const quiz = activeQuiz?.questions || []

  const handleQuizChange = (idx) => {
    setSelectedQuizIdx(idx)
    setAnswers({})
    setSubmitted(false)
    setScore(null)
  }

  const handleAnswer = (questionIdx, answerIdx) => {
    if (submitted) return
    setAnswers(prev => ({ ...prev, [questionIdx]: answerIdx }))
  }

  const submitQuiz = () => {
    if (Object.keys(answers).length < quiz.length) {
      toast.warning('Vui lòng trả lời tất cả câu hỏi')
      return
    }
    
    let correct = 0
    quiz.forEach((q, idx) => {
      if (answers[idx] === q.correctAnswer) correct++
    })
    
    setScore({ correct, total: quiz.length })
    setSubmitted(true)
  }

  const resetQuiz = () => {
    setAnswers({})
    setSubmitted(false)
    setScore(null)
  }

  const downloadQuizResult = () => {
    if (!submitted || !quiz || !score) return

    const timestamp = new Date().toLocaleString('vi-VN')
    const rows = []

    rows.push('KET QUA LUYEN TAP CAU HOI')
    rows.push(`Bai hoc: ${lecture?.lectureTitle || ''}`)
    rows.push(`Bo de: ${activeQuiz?.title || 'Quiz'}`)
    rows.push(`Thoi gian: ${timestamp}`)
    rows.push(`Tong diem: ${score.correct}/${score.total}`)
    rows.push('')

    quiz.forEach((q, qIdx) => {
      const selectedIndex = answers[qIdx]
      const selectedText = selectedIndex !== undefined ? q.options[selectedIndex] : 'Chua tra loi'
      const correctText = q.options[q.correctAnswer]
      const isCorrect = selectedIndex === q.correctAnswer

      rows.push(`Cau ${qIdx + 1}: ${q.question}`)
      q.options.forEach((opt, oIdx) => {
        rows.push(`  ${oIdx + 1}. ${opt}`)
      })
      rows.push(`Tra loi cua ban: ${selectedText}`)
      rows.push(`Dap an dung: ${correctText}`)
      rows.push(`Ket qua: ${isCorrect ? 'Dung' : 'Sai'}`)
      if (q.explanation) {
        rows.push(`Giai thich: ${q.explanation}`)
      }
      rows.push('')
    })

    const fileContent = rows.join('\n')
    const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `ket-qua-quiz-bai-${lecture?.lectureTitle?.replace(/\s+/g, '-') || 'hoc'}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  if (!isPublished) {
    return (
      <div className='fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn'>
        <div className='bg-white rounded-2xl max-w-md w-full overflow-hidden shadow-2xl border border-gray-100'>
          <div className='p-6 border-b bg-gradient-to-r from-green-600 to-emerald-600 text-white flex justify-between items-center'>
            <h3 className='font-semibold text-lg'>Luyện tập bài học</h3>
            <button onClick={onClose} className='p-2 hover:bg-white/20 rounded-lg transition-colors'>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className='p-8 text-center'>
            <div className='w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-100'>
              <svg className="w-8 h-8 text-amber-500 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h4 className='text-lg font-bold text-gray-800 mb-2'>Chưa có Quiz</h4>
            <p className='text-gray-500 mb-6 px-4 text-sm'>Giảng viên chưa tạo bài tập trắc nghiệm cho bài học này.</p>
            <button
              onClick={onClose}
              className='w-full py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-all'
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (selectedQuizIdx === null) {
    return (
      <div className='fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn'>
        <div className='bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl border border-gray-100 flex flex-col'>
          <div className='p-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white'>
            <div className='flex items-center justify-between'>
              <div className='flex items-center gap-3'>
                <div className='w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shadow-inner'>
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <div>
                  <h3 className='font-bold text-lg font-cinzel'>Danh sách bài ôn luyện</h3>
                  <p className='text-xs text-green-100'>{lecture?.lectureTitle}</p>
                </div>
              </div>
              <button onClick={onClose} className='p-2 hover:bg-white/20 rounded-lg transition-colors cursor-pointer'>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className='p-6 overflow-y-auto flex-1 space-y-4 bg-slate-50/50'>
            <div className='text-center py-2'>
              <h4 className='text-base font-bold text-slate-800 mb-1'>Luyện tập củng cố kiến thức</h4>
              <p className='text-xs text-slate-500'>Hãy chọn một bài trắc nghiệm dưới đây do giảng viên thiết kế để bắt đầu ôn tập.</p>
            </div>
            <div className='grid grid-cols-1 gap-3.5'>
              {quizzes.map((q, idx) => (
                <div key={idx} className='bg-white hover:bg-slate-50/30 border border-slate-200/80 rounded-2xl p-5 transition-all flex items-center justify-between shadow-2xs hover:shadow-xs group'>
                  <div className='space-y-1.5 flex-1 min-w-0 pr-4'>
                    <h5 className='font-bold text-slate-800 text-sm truncate group-hover:text-green-700 transition-colors'>
                      {q.title || `Bài ôn luyện ${idx + 1}`}
                    </h5>
                    <div className='flex items-center gap-3 text-xs text-slate-500'>
                      <span className='inline-flex items-center gap-1 bg-green-50 text-green-700 px-2.5 py-0.5 rounded-full font-semibold border border-green-100/50'>
                        {q.questions?.length || 0} câu hỏi
                      </span>
                      <span>•</span>
                      <span>Thời gian: Tự do</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleQuizChange(idx)}
                    className='px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white text-xs font-bold rounded-xl shadow-md shadow-green-600/10 hover:shadow-green-600/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shrink-0'
                  >
                    <span>Làm bài</span>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
          
          <div className='p-6 border-t bg-slate-50 flex justify-end'>
            <button
              onClick={onClose}
              className='px-6 py-3 bg-white border hover:bg-slate-50 text-slate-700 font-semibold rounded-xl shadow-2xs active:scale-95 transition-all cursor-pointer'
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='fixed inset-0 bg-black/55 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fadeIn'>
      <div className='bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden shadow-2xl border flex flex-col'>
        <div className='p-6 bg-gradient-to-r from-green-600 to-emerald-600 text-white'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shadow-inner'>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
              <div>
                <h3 className='font-semibold text-lg font-cinzel'>Luyện tập câu hỏi</h3>
                <p className='text-xs text-green-100'>{lecture?.lectureTitle}</p>
              </div>
            </div>
            <button onClick={onClose} className='p-2 hover:bg-white/20 rounded-lg transition-colors'>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        
        <div className='p-6 overflow-y-auto flex-1 space-y-6'>
          <div className='p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 shadow-2xs'>
            <div className='space-y-0.5'>
              <span className='text-xs text-slate-400 font-medium'>Đang làm bài trắc nghiệm:</span>
              <p className='text-sm font-bold text-slate-800'>{activeQuiz?.title || `Quiz ${selectedQuizIdx + 1}`}</p>
            </div>
            <button
              onClick={() => setSelectedQuizIdx(null)}
              className='inline-flex items-center gap-1.5 px-3.5 py-2 border border-slate-250 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-800 text-xs font-bold rounded-xl shadow-2xs active:scale-95 transition-all cursor-pointer'
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
              </svg>
              Quay lại danh sách
            </button>
          </div>
          {/* Score display */}
          {score && (
            <div className={`p-5 rounded-2xl border text-center transition-all ${
              score.correct >= score.total * 0.7 
                ? 'bg-green-50 border-green-200 text-green-800' 
                : 'bg-amber-50 border-amber-200 text-amber-800'
            }`}>
              <p className='text-xl font-bold'>
                Kết quả: {score.correct}/{score.total} câu đúng ({Math.round(score.correct/score.total*100)}%)
              </p>
              <p className='text-sm mt-1'>
                {score.correct >= score.total * 0.7 
                  ? '🎉 Tuyệt vời! Bạn đã nắm rất vững kiến thức bài học!' 
                  : '💡 Hãy ôn tập lại bài học và thử sức lại nhé!'}
              </p>
            </div>
          )}
          
          {quiz.map((q, qIdx) => (
            <div key={qIdx} className='bg-slate-50 border border-slate-100 rounded-2xl p-6 hover:shadow-xs transition-all duration-200'>
              <p className='font-semibold text-slate-800 mb-4 flex items-start'>
                <span className='inline-flex items-center justify-center w-7 h-7 shrink-0 bg-green-100 text-green-700 rounded-lg mr-3 text-sm font-bold shadow-xs'>
                  {qIdx + 1}
                </span>
                <span className="pt-0.5">{q.question}</span>
              </p>
              <div className='space-y-2.5 ml-10'>
                {q.options.map((opt, oIdx) => {
                  const isSelected = answers[qIdx] === oIdx
                  const isCorrect = q.correctAnswer === oIdx
                  
                  let optionClass = 'border-slate-200 bg-white text-slate-700 hover:border-green-300 hover:bg-green-50/50'
                  if (submitted) {
                    if (isCorrect) {
                      optionClass = 'border-green-500 bg-green-50 text-green-900 font-medium shadow-xs shadow-green-100/50'
                    } else if (isSelected && !isCorrect) {
                      optionClass = 'border-red-400 bg-red-50 text-red-900'
                    } else {
                      optionClass = 'border-slate-200 bg-white text-slate-400 opacity-80'
                    }
                  } else if (isSelected) {
                    optionClass = 'border-green-500 bg-green-50 text-green-800 font-semibold ring-2 ring-green-500/20'
                  }
                  
                  return (
                    <button
                      key={oIdx}
                      onClick={() => handleAnswer(qIdx, oIdx)}
                      disabled={submitted}
                      className={`w-full text-left p-3.5 rounded-xl border-2 transition-all cursor-pointer ${optionClass}`}
                    >
                      {String.fromCharCode(65 + oIdx)}. {cleanOptionText(opt, oIdx)}
                    </button>
                  )
                })}
              </div>
              {submitted && q.explanation && (
                <div className='mt-4 ml-10 p-4 bg-blue-50/70 border border-blue-100 rounded-xl text-sm text-blue-900 leading-relaxed'>
                  <strong className="text-blue-950 font-bold block mb-1">💡 Giải thích đáp án:</strong> {q.explanation}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className='p-6 border-t bg-slate-50 flex justify-end gap-3'>
          <button
            onClick={onClose}
            className='px-6 py-3 bg-white border hover:bg-slate-50 text-slate-700 font-medium rounded-xl transition-all'
          >
            Đóng
          </button>
          {!submitted ? (
            <button
              onClick={submitQuiz}
              className='bg-green-600 text-white px-8 py-3 rounded-xl font-medium hover:bg-green-700 transition-colors shadow-lg shadow-green-600/20'
            >
              Nộp bài
            </button>
          ) : (
            <>
              <button
                onClick={downloadQuizResult}
                className='bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-emerald-700 transition-colors'
              >
                Tải kết quả
              </button>
              <button
                onClick={resetQuiz}
                className='bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors'
              >
                Làm lại Quiz
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// Final Exam Modal Component
export const AIFinalExam = ({ courseId, courseTitle, finalExam, onClose, onSuccess }) => {
  const { backendUrl, getToken } = useContext(AppContext)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null) // { success, scorePercent, passed, correctCount, totalQuestions, results }

  const questions = finalExam?.questions || []
  const requiredScorePercent = finalExam?.requiredScorePercent || 70

  const handleAnswer = (questionIdx, answerIdx) => {
    if (submitted) return
    setAnswers(prev => ({ ...prev, [questionIdx]: answerIdx }))
  }

  const submitExam = async () => {
    if (Object.keys(answers).length < questions.length) {
      toast.warning(`Vui lòng trả lời đầy đủ ${questions.length} câu hỏi trước khi nộp bài!`)
      return
    }

    setLoading(true)
    try {
      const token = await getToken()
      const { data } = await axios.post(`${backendUrl}/api/user/submit-final-exam`, {
        courseId,
        answers
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (data.success) {
        setResult(data)
        setSubmitted(true)
        if (data.passed) {
          toast.success('Chúc mừng! Bạn đã thi đỗ kỳ thi tốt nghiệp!')
          if (onSuccess) onSuccess()
        } else {
          toast.warning('Rất tiếc! Điểm số của bạn chưa đạt yêu cầu.')
        }
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Lỗi khi nộp bài thi kết khóa')
    } finally {
      setLoading(false)
    }
  }

  const resetExam = () => {
    setAnswers({})
    setSubmitted(false)
    setResult(null)
  }

  return (
    <div className='fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto animate-fadeIn'>
      <div className='bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col'>
        
        {/* Exam Header */}
        <div className='p-6 bg-slate-950 border-b border-slate-800 flex justify-between items-center'>
          <div className='flex items-center gap-3.5'>
            <div className='w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20 shadow-inner'>
              <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
              </svg>
            </div>
            <div>
              <h3 className='font-bold text-xl text-amber-400 uppercase tracking-wider font-cinzel'>Kỳ Thi Tốt Nghiệp Khóa Học</h3>
              <p className='text-xs text-slate-400 mt-0.5'>{courseTitle}</p>
            </div>
          </div>
          <button onClick={onClose} disabled={loading} className='p-2 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl transition-colors'>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Area */}
        <div className='p-6 overflow-y-auto flex-1 space-y-6 bg-slate-900/60'>
          
          {/* Instructions Card / Result Card */}
          {!submitted ? (
            <div className='bg-slate-950/40 border border-slate-800 p-5 rounded-2xl text-slate-300 text-sm leading-relaxed'>
              <h4 className='font-bold text-amber-400/90 mb-2 flex items-center gap-2'>
                <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                HƯỚNG DẪN LÀM BÀI THI KẾT KHÓA
              </h4>
              <ul className='list-disc list-inside space-y-1.5 text-slate-400'>
                <li>Bài thi gồm <strong className='text-amber-500'>{questions.length} câu hỏi</strong> trắc nghiệm chuyên sâu bao quát toàn bộ nội dung khóa học.</li>
                <li>Bạn cần đạt tối thiểu <strong className='text-amber-500'>{requiredScorePercent}%</strong> số điểm ({Math.ceil(questions.length * requiredScorePercent / 100)} câu đúng) để được cấp chứng chỉ.</li>
                <li>Hệ thống không giới hạn thời gian và số lần thi lại. Tuy nhiên hãy tập trung cao độ để đạt kết quả xuất sắc nhất!</li>
              </ul>
            </div>
          ) : (
            <div className={`p-6 rounded-2xl border text-center transition-all ${
              result?.passed 
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-200' 
                : 'bg-rose-950/40 border-rose-800/60 text-rose-200'
            }`}>
              <h4 className='text-2xl font-black font-cinzel mb-2 uppercase tracking-wide'>
                {result?.passed ? '🏆 ĐÃ ĐẠT TỐT NGHIỆP!' : '❌ CHƯA ĐẠT KẾT QUẢ!'}
              </h4>
              <p className='text-lg font-medium'>
                Điểm số của bạn: <strong className='text-3xl font-black text-amber-400 mx-1'>{result?.scorePercent}%</strong> ({result?.correctCount}/{result?.totalQuestions} câu đúng)
              </p>
              <p className='text-sm mt-2 text-slate-300 max-w-xl mx-auto'>
                {result?.passed 
                  ? 'Chúc mừng bạn đã xuất sắc vượt qua kỳ thi tốt nghiệp này! Khóa học đã chính thức hoàn thành và bạn đã nhận được Chứng Chỉ Tốt Nghiệp Hoàng Gia!'
                  : `Yêu cầu đạt tối thiểu ${requiredScorePercent}%. Hãy tiếp tục ôn tập kỹ lại các kiến thức bài học và thi lại để nhận chứng chỉ nhé!`}
              </p>
            </div>
          )}

          {/* Question List */}
          <div className='space-y-6'>
            {questions.map((q, qIdx) => {
              const scoredInfo = result?.results?.[qIdx]
              const isCorrect = scoredInfo?.isCorrect

              return (
                <div key={qIdx} className='bg-slate-950/40 border border-slate-800/80 rounded-2xl p-6'>
                  <p className='font-bold text-slate-100 mb-4 flex items-start text-base'>
                    <span className='inline-flex items-center justify-center w-7 h-7 shrink-0 bg-slate-800 border border-slate-700 text-amber-400 rounded-lg mr-3 text-sm font-black shadow-xs font-cinzel'>
                      {qIdx + 1}
                    </span>
                    <span className="pt-0.5">{q.question}</span>
                  </p>
                  <div className='space-y-2.5 ml-10'>
                    {q.options.map((opt, oIdx) => {
                      const isSelected = answers[qIdx] === oIdx
                      const isCorrectAnswer = q.correctAnswer === oIdx
                      
                      let optionClass = 'border-slate-800 bg-slate-900/60 text-slate-300 hover:border-slate-700 hover:bg-slate-800/50'
                      if (submitted) {
                        if (isCorrectAnswer) {
                          optionClass = 'border-emerald-500 bg-emerald-950/40 text-emerald-200 font-semibold ring-2 ring-emerald-500/30'
                        } else if (isSelected && !isCorrectAnswer) {
                          optionClass = 'border-rose-500 bg-rose-950/40 text-rose-200'
                        } else {
                          optionClass = 'border-slate-850 bg-slate-900/30 text-slate-500 opacity-60'
                        }
                      } else if (isSelected) {
                        optionClass = 'border-amber-500 bg-amber-500/5 text-amber-300 font-semibold ring-2 ring-amber-500/30'
                      }
                      
                      return (
                        <button
                          key={oIdx}
                          onClick={() => handleAnswer(qIdx, oIdx)}
                          disabled={submitted || loading}
                          className={`w-full text-left p-3.5 rounded-xl border transition-all cursor-pointer ${optionClass}`}
                        >
                          {String.fromCharCode(65 + oIdx)}. {cleanOptionText(opt, oIdx)}
                        </button>
                      )
                    })}
                  </div>
                  {submitted && q.explanation && (
                    <div className='mt-4 ml-10 p-4 bg-slate-900 border border-slate-800 rounded-xl text-sm text-slate-400 leading-relaxed'>
                      <strong className="text-amber-400 font-bold block mb-1 font-cinzel">💡 Giải thích chi tiết:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Footer actions */}
        <div className='p-6 bg-slate-950 border-t border-slate-800 flex justify-end gap-3.5'>
          <button
            onClick={onClose}
            disabled={loading}
            className='px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-all'
          >
            Đóng
          </button>
          {!submitted ? (
            <button
              onClick={submitExam}
              disabled={loading}
              className='bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold px-8 py-3 rounded-xl transition-all shadow-[0_4px_14px_rgba(245,158,11,0.2)] font-cinzel flex items-center gap-2'
            >
              {loading ? (
                <>
                  <div className='w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin'></div>
                  Đang chấm điểm...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 text-slate-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Nộp Bài Thi
                </>
              )}
            </button>
          ) : (
            <>
              {!result?.passed && (
                <button
                  onClick={resetExam}
                  className='bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-3 rounded-xl transition-colors'
                >
                  Làm lại Bài thi
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default { AILessonSummary, AIQuizGenerator, AIFinalExam }
