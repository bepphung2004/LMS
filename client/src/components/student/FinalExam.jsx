import React, { useState, useContext } from 'react'
import { AppContext } from '../../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'

const cleanOptionText = (opt, optIdx) => {
  if (typeof opt !== 'string') return ''
  const upper = String.fromCharCode(65 + optIdx)
  const lower = String.fromCharCode(97 + optIdx)
  const regex = new RegExp(`^[${upper}${lower}][.)]\\s*`)
  return opt.replace(regex, '')
}

export const FinalExam = ({ courseId, courseTitle, finalExam, onClose, onSuccess }) => {
  const { backendUrl, getToken } = useContext(AppContext)
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null) // { success, scorePercent, passed, correctCount, totalQuestions, results }

  // States for Start Screen and Timer
  const [examStarted, setExamStarted] = useState(false)
  const [timeLeft, setTimeLeft] = useState((finalExam?.durationMins || 30) * 60)

  const questions = finalExam?.questions || []
  const requiredScorePercent = finalExam?.requiredScorePercent || 70

  const answersRef = React.useRef(answers)
  const submitExamRef = React.useRef(null)

  React.useEffect(() => {
    answersRef.current = answers
  }, [answers])

  const handleAnswer = (questionIdx, answerIdx) => {
    if (submitted) return
    setAnswers(prev => ({ ...prev, [questionIdx]: answerIdx }))
  }

  const submitExam = async (isAutoSubmit = false) => {
    const activeAnswers = answersRef.current
    if (!isAutoSubmit && Object.keys(activeAnswers).length < questions.length) {
      toast.warning(`Vui lòng trả lời đầy đủ ${questions.length} câu hỏi trước khi nộp bài!`)
      return
    }

    setLoading(true)
    try {
      const token = await getToken()
      const { data } = await axios.post(`${backendUrl}/api/user/submit-final-exam`, {
        courseId,
        answers: activeAnswers
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
          if (isAutoSubmit) {
            toast.error('Hết giờ! Bài thi đã tự động nộp và bạn chưa đạt yêu cầu.')
          } else {
            toast.warning('Rất tiếc! Điểm số của bạn chưa đạt yêu cầu.')
          }
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

  React.useEffect(() => {
    submitExamRef.current = submitExam
  })

  // Timer Countdown Effect
  React.useEffect(() => {
    let timer
    if (examStarted && !submitted && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(timer)
            if (submitExamRef.current) {
              submitExamRef.current(true)
            }
            return 0
          }
          return prev - 1
        })
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [examStarted, submitted])

  const resetExam = () => {
    setAnswers({})
    setSubmitted(false)
    setResult(null)
    setExamStarted(false)
    setTimeLeft((finalExam?.durationMins || 30) * 60)
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // SCREEN 3: Exam Results Layout (Submitted)
  if (submitted) {
    return (
      <div className='fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto animate-fadeIn'>
        <div className='bg-white border border-slate-200 text-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col'>
          
          {/* Header */}
          <div className='p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center'>
            <div className='flex items-center gap-3.5'>
              <div className='w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100 shadow-inner'>
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className='font-bold text-lg text-slate-800 uppercase tracking-wider'>Kết quả kỳ thi tốt nghiệp</h3>
                <p className='text-xs text-slate-500 mt-0.5'>{courseTitle}</p>
              </div>
            </div>
            <button onClick={onClose} className='p-2 hover:bg-slate-200/80 text-slate-400 hover:text-slate-650 rounded-xl transition-colors'>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className='p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50/50'>
            <div className={`p-6 rounded-2xl border text-center transition-all ${
              result?.passed 
                ? 'bg-emerald-50 border-emerald-250 text-emerald-900' 
                : 'bg-rose-50 border-rose-250 text-rose-900'
            }`}>
              <h4 className='text-2xl font-black mb-2 uppercase tracking-wide'>
                {result?.passed ? '🏆 ĐÃ ĐẠT TỐT NGHIỆP!' : '❌ CHƯA ĐẠT KẾT QUẢ!'}
              </h4>
              <p className='text-lg font-medium text-slate-700'>
                Điểm số của bạn: <strong className='text-3xl font-black text-blue-600 mx-1'>{result?.scorePercent}%</strong> ({result?.correctCount}/{result?.totalQuestions} câu đúng)
              </p>
              <p className='text-sm mt-2 text-slate-600 max-w-xl mx-auto leading-relaxed'>
                {result?.passed 
                  ? 'Chúc mừng bạn đã xuất sắc vượt qua kỳ thi tốt nghiệp này! Khóa học đã chính thức hoàn thành và bạn đã nhận được Chứng Chỉ Tốt Nghiệp!'
                  : `Yêu cầu đạt tối thiểu ${requiredScorePercent}%. Hãy tiếp tục ôn tập kỹ lại các kiến thức bài học và thi lại để nhận chứng chỉ nhé!`}
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className='p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3.5 flex-shrink-0'>
            <button
              onClick={onClose}
              className='px-6 py-3 bg-white border border-slate-250 hover:bg-slate-50 text-slate-700 font-semibold rounded-xl transition-all shadow-2xs cursor-pointer'
            >
              Đóng
            </button>
            {!result?.passed && (
              <button
                onClick={resetExam}
                className='bg-blue-600 hover:bg-blue-750 text-white font-bold px-8 py-3 rounded-xl transition-all shadow-md shadow-blue-500/10 cursor-pointer'
              >
                Thi lại bài thi
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // SCREEN 2: Active Locked Fullscreen Exam (Exam Started & Not Submitted)
  if (examStarted && !submitted) {
    return (
      <div className='fixed inset-0 w-screen h-screen z-50 bg-slate-50 flex flex-col animate-fadeIn select-none'>
        {/* Header containing details & timer */}
        <div className='px-6 py-4 bg-white border-b border-slate-200 flex justify-between items-center shadow-xs flex-shrink-0'>
          <div className='min-w-0 pr-4'>
            <h3 className='font-extrabold text-sm sm:text-base text-slate-800 uppercase tracking-wider truncate'>Kỳ thi tốt nghiệp</h3>
            <p className='text-[10px] sm:text-xs text-slate-500 mt-0.5 truncate'>{courseTitle}</p>
          </div>

          <div className='flex items-center gap-4 flex-shrink-0'>
            {/* Timer Display */}
            <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-mono text-sm sm:text-base font-bold border transition-colors ${
              timeLeft <= 60 
                ? 'bg-red-50 border-red-200 text-red-600 animate-pulse' 
                : 'bg-blue-50 border-blue-100 text-blue-700'
            }`}>
              <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${timeLeft <= 60 ? 'text-red-500' : 'text-blue-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{formatTime(timeLeft)}</span>
            </div>

            {/* Submit Button */}
            <button
              onClick={() => submitExam(false)}
              disabled={loading}
              className='bg-blue-600 hover:bg-blue-750 text-white font-bold px-5 py-2.5 rounded-xl transition-all shadow-md shadow-blue-500/10 active:scale-95 flex items-center gap-1.5 cursor-pointer text-xs sm:text-sm disabled:opacity-50'
            >
              {loading ? (
                <>
                  <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin'></div>
                  Đang nộp...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Nộp Bài
                </>
              )}
            </button>
          </div>
        </div>

        {/* Scrollable exam questions */}
        <div className='flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 space-y-6 max-w-4xl w-full mx-auto pb-24'>
          {questions.map((q, qIdx) => {
            return (
              <div key={qIdx} className='bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 md:p-8 shadow-2xs'>
                <p className='font-bold text-slate-800 mb-5 flex items-start text-sm sm:text-base leading-relaxed'>
                  <span className='inline-flex items-center justify-center w-7 h-7 shrink-0 bg-blue-50 border border-blue-100 text-blue-600 rounded-lg mr-3 text-xs font-bold shadow-2xs'>
                    {qIdx + 1}
                  </span>
                  <span className="pt-0.5">{q.question}</span>
                </p>
                <div className='space-y-3.5 ml-0 sm:ml-10'>
                  {q.options.map((opt, oIdx) => {
                    const isSelected = answers[qIdx] === oIdx
                    let optionClass = 'border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/30'
                    if (isSelected) {
                      optionClass = 'border-blue-600 bg-blue-50 text-blue-800 font-semibold ring-2 ring-blue-500/20'
                    }
                    return (
                      <button
                        key={oIdx}
                        onClick={() => handleAnswer(qIdx, oIdx)}
                        disabled={loading}
                        className={`w-full text-left p-3.5 rounded-xl border-2 transition-all cursor-pointer text-xs sm:text-sm flex items-center ${optionClass}`}
                      >
                        <span className={`inline-flex items-center justify-center w-5.5 h-5.5 rounded-full text-[10px] font-bold mr-3 shrink-0 ${
                          isSelected ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {String.fromCharCode(65 + oIdx)}
                        </span>
                        <span>{cleanOptionText(opt, oIdx)}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  // SCREEN 1: Ready / Instructions Screen (examStarted = false, submitted = false)
  return (
    <div className='fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 overflow-y-auto animate-fadeIn'>
      <div className='bg-white border border-slate-200 text-slate-800 rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-hidden shadow-2xl flex flex-col'>
        
        {/* Header */}
        <div className='p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center flex-shrink-0'>
          <div className='flex items-center gap-3.5'>
            <div className='w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center border border-blue-100 shadow-inner flex-shrink-0'>
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
              </svg>
            </div>
            <div>
              <h3 className='font-bold text-base sm:text-lg text-slate-800 uppercase tracking-wider'>Thông tin kỳ thi tốt nghiệp</h3>
              <p className='text-[10px] sm:text-xs text-slate-500 mt-0.5'>{courseTitle}</p>
            </div>
          </div>
          <button onClick={onClose} className='p-2 hover:bg-slate-200/80 text-slate-400 hover:text-slate-650 rounded-xl transition-colors'>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className='p-6 overflow-y-auto flex-1 space-y-6'>
          
          <div className='bg-blue-50/50 border border-blue-100 p-5 rounded-2xl text-slate-700 text-xs sm:text-sm leading-relaxed'>
            <h4 className='font-bold text-blue-800 mb-2.5 flex items-center gap-2'>
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              HƯỚNG DẪN LÀM BÀI THI KẾT KHÓA
            </h4>
            <ul className='list-disc list-inside space-y-2 text-slate-650'>
              <li>Bài thi tốt nghiệp bao gồm các câu hỏi trắc nghiệm khách quan bao quát toàn bộ nội dung chương trình học.</li>
              <li>Bạn phải đạt mức điểm yêu cầu để được công nhận hoàn thành khóa học và được cấp chứng chỉ.</li>
              <li>Sau khi bấm nút <strong className='text-slate-900'>Bắt đầu làm bài</strong> bên dưới, bài thi sẽ phóng to toàn màn hình và hệ thống sẽ bắt đầu đếm ngược thời gian.</li>
              <li>Trong thời gian thi, bạn không thể đóng bài thi. Bạn chỉ được rời đi sau khi bấm nộp bài thi hoặc khi hết giờ làm bài.</li>
            </ul>
          </div>

          {/* Exam configuration values */}
          <div className='grid grid-cols-3 gap-3.5 sm:gap-4'>
            <div className='bg-slate-50 border border-slate-200/85 p-3.5 sm:p-4 rounded-2xl text-center shadow-2xs'>
              <span className='block text-[10px] sm:text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1'>Số câu hỏi</span>
              <strong className='text-base sm:text-xl text-blue-600 font-black'>{questions.length} câu</strong>
            </div>
            <div className='bg-slate-50 border border-slate-200/85 p-3.5 sm:p-4 rounded-2xl text-center shadow-2xs'>
              <span className='block text-[10px] sm:text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1'>Yêu cầu đạt</span>
              <strong className='text-base sm:text-xl text-amber-600 font-black'>{requiredScorePercent}%</strong>
            </div>
            <div className='bg-slate-50 border border-slate-200/85 p-3.5 sm:p-4 rounded-2xl text-center shadow-2xs'>
              <span className='block text-[10px] sm:text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1'>Thời gian</span>
              <strong className='text-base sm:text-xl text-emerald-600 font-black'>{finalExam?.durationMins || 30} phút</strong>
            </div>
          </div>

        </div>

        {/* Footer actions */}
        <div className='p-6 bg-slate-50 border-t border-slate-200 flex justify-end gap-3 flex-shrink-0'>
          <button
            onClick={onClose}
            className='px-5 py-3 bg-white border border-slate-250 hover:bg-slate-50 text-slate-650 font-bold rounded-xl transition-all shadow-2xs active:scale-95 cursor-pointer text-xs sm:text-sm'
          >
            Đóng
          </button>
          <button
            onClick={() => {
              setExamStarted(true)
              setTimeLeft((finalExam?.durationMins || 30) * 60)
            }}
            className='px-6 sm:px-8 py-3 bg-blue-600 hover:bg-blue-750 text-white font-bold rounded-xl transition-all shadow-md shadow-blue-500/10 hover:scale-[1.02] active:scale-98 cursor-pointer flex items-center gap-1.5 text-xs sm:text-sm'
          >
            Bắt đầu làm bài
          </button>
        </div>

      </div>
    </div>
  )
}
