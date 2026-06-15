import React, { useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import QuestionsEditor from '../../components/educator/QuestionsEditor'

const FinalExamEditor = ({
  courseId,
  initialQuestions,
  initialScore,
  initialDuration,
  onSave,
  onCancel,
  backendUrl,
  getToken,
  saving
}) => {
  const [requiredScorePercent, setRequiredScorePercent] = useState(initialScore ?? 70)
  const [durationMins, setDurationMins] = useState(initialDuration ?? 30)
  const [generating, setGenerating] = useState(false)

  // Input Sanitization
  const handleScoreChange = (val) => {
    if (val === '') {
      setRequiredScorePercent('')
      return
    }
    const num = Number(val)
    if (!isNaN(num)) {
      setRequiredScorePercent(Math.min(100, Math.max(0, num)))
    }
  }

  const handleScoreBlur = () => {
    if (requiredScorePercent === '' || isNaN(Number(requiredScorePercent))) {
      setRequiredScorePercent(70)
    }
  }

  const handleDurationChange = (val) => {
    if (val === '') {
      setDurationMins('')
      return
    }
    const num = Number(val)
    if (!isNaN(num)) {
      setDurationMins(num)
    }
  }

  const handleDurationBlur = () => {
    if (durationMins === '' || isNaN(Number(durationMins)) || Number(durationMins) < 1) {
      setDurationMins(30)
    }
  }

  // AI Generation
  const handleGenerateAI = async () => {
    if (!courseId) return []
    setGenerating(true)
    try {
      const token = await getToken()
      const { data } = await axios.post(`${backendUrl}/api/ai/generate-final-exam`, {
        courseId,
        numberOfQuestions: 10
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (data.success && data.questions && data.questions.length > 0) {
        toast.success('Đã tạo đề thi hết khóa 10 câu hỏi bằng AI thành công!')
        return data.questions
      } else {
        toast.error('AI không thể tạo đề thi tốt nghiệp cho khóa học này')
        return []
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi khi gọi AI tạo đề thi')
      return []
    } finally {
      setGenerating(false)
    }
  }

  const handleSaveClick = (questions) => {
    if (questions.length === 0) {
      toast.warning('Vui lòng thêm ít nhất một câu hỏi')
      return
    }
    const finalScore = requiredScorePercent === '' ? 70 : Number(requiredScorePercent)
    const finalDuration = durationMins === '' || Number(durationMins) < 1 ? 30 : Number(durationMins)
    onSave(finalScore, finalDuration, questions)
  }

  return (
    <QuestionsEditor
      initialQuestions={initialQuestions}
      onSave={handleSaveClick}
      onCancel={onCancel}
      saving={saving}
      onGenerateAI={handleGenerateAI}
      generating={generating}
      headerTitle='Tạo bài kiểm tra cuối khóa'
      saveButtonText='Lưu Đề Thi'
      questionLabel='Nội dung câu hỏi tốt nghiệp'
      questionPlaceholder='Nhập câu hỏi tốt nghiệp tại đây...'
      optionsLabel='Các phương án và đáp án đúng'
      radioGroupName='correctAnswer-final'
      deleteConfirmText='Xóa câu hỏi tốt nghiệp thứ'
      showExplanation={false}
    >
      <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
        {/* Score Threshold Setup */}
        <div className='bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row items-center gap-4 justify-between'>
          <div className='space-y-1.5 w-full sm:w-auto flex-1'>
            <h3 className='font-bold text-gray-800 text-base'>Điểm số tối thiểu để đạt</h3>
            <p className='text-xs text-gray-400'>Học viên phải đạt đúng bao nhiêu % câu trả lời để hoàn thành.</p>
          </div>
          <div className='flex items-center gap-3 w-full sm:w-auto justify-end flex-shrink-0'>
            <input
              type='number'
              min='0'
              max='100'
              value={requiredScorePercent}
              onChange={(e) => handleScoreChange(e.target.value)}
              onBlur={handleScoreBlur}
              className='outline-none w-20 px-3 py-2 border border-gray-300 rounded text-center font-bold text-gray-800 focus:border-blue-500 bg-white shadow-2xs'
            />
            <span className='font-extrabold text-gray-400'>%</span>
          </div>
        </div>

        {/* Exam Duration Setup */}
        <div className='bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row items-center gap-4 justify-between'>
          <div className='space-y-1.5 w-full sm:w-auto flex-1'>
            <h3 className='font-bold text-gray-800 text-base'>Thời gian làm bài</h3>
            <p className='text-xs text-gray-400'>Thời gian tối đa để học viên hoàn thành bài thi (phút).</p>
          </div>
          <div className='flex items-center gap-3 w-full sm:w-auto justify-end flex-shrink-0'>
            <input
              type='number'
              min='1'
              value={durationMins}
              onChange={(e) => handleDurationChange(e.target.value)}
              onBlur={handleDurationBlur}
              className='outline-none w-20 px-3 py-2 border border-gray-300 rounded text-center font-bold text-gray-800 focus:border-blue-500 bg-white shadow-2xs'
            />
            <span className='font-extrabold text-gray-400'>phút</span>
          </div>
        </div>
      </div>
    </QuestionsEditor>
  )
}

export default FinalExamEditor
