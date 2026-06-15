import React, { useState, useContext } from 'react'
import { AppContext } from '../../context/AppContext'
import { toast } from 'react-toastify'

const cleanOptionText = (opt, optIdx) => {
  if (typeof opt !== 'string') return ''
  const upper = String.fromCharCode(65 + optIdx)
  const lower = String.fromCharCode(97 + optIdx)
  const regex = new RegExp(`^[${upper}${lower}][.)]\\s*`)
  return opt.replace(regex, '')
}

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

export const QuizPractice = ({ lecture, onClose }) => {
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
