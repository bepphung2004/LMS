import React, { useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import QuestionsEditor from '../../components/educator/QuestionsEditor'

const FinalExamEditor = ({
  courseId,
  initialQuestions,
  initialScore,
  onSave,
  onCancel,
  backendUrl,
  getToken,
  saving
}) => {
  const [requiredScorePercent, setRequiredScorePercent] = useState(initialScore ?? 70)
  const [generating, setGenerating] = useState(false)

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
    onSave(requiredScorePercent, questions)
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
    >
      {/* Score Threshold Setup */}
      <div className='bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col sm:flex-row items-center gap-4 justify-between'>
        <div className='space-y-1.5 w-full sm:w-auto'>
          <h3 className='font-bold text-gray-800 text-base'>Điểm số tối thiểu để đạt</h3>
          <p className='text-xs text-gray-400'>Học viên phải đạt đúng bao nhiêu % câu trả lời để được công nhận hoàn thành khóa học.</p>
        </div>
        <div className='flex items-center gap-3 w-full sm:w-auto justify-end'>
          <input
            type='number'
            min='0'
            max='100'
            value={requiredScorePercent}
            onChange={(e) => setRequiredScorePercent(Math.min(100, Math.max(0, Number(e.target.value))))}
            className='outline-none w-20 px-3 py-2 border border-gray-300 rounded text-center font-bold text-gray-800 focus:border-blue-500 bg-white shadow-2xs'
          />
          <span className='font-extrabold text-gray-400'>%</span>
        </div>
      </div>
    </QuestionsEditor>
  )
}

export default FinalExamEditor
