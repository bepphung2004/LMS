import React, { useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import QuestionsEditor from '../../components/educator/QuestionsEditor'

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
  const [generating, setGenerating] = useState(false)

  // AI Generation
  const handleGenerateAI = async () => {
    if (!courseId || !lectureId) return []
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
        toast.success(`Đã tạo câu hỏi thành công bằng AI! (${data.hasTranscript ? 'Dựa trên transcript' : 'Dựa trên ngữ cảnh dự phòng'})`)
        return data.quiz
      } else {
        toast.error('AI không thể tạo quiz cho bài giảng này')
        return []
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Có lỗi khi gọi AI tạo quiz')
      return []
    } finally {
      setGenerating(false)
    }
  }

  const handleSaveClick = (questions) => {
    if (!quizTitle.trim()) {
      toast.warning('Vui lòng nhập tiêu đề Quiz')
      return
    }
    if (questions.length === 0) {
      toast.warning('Vui lòng thêm ít nhất một câu hỏi')
      return
    }
    onSave(quizTitle.trim(), questions)
  }

  return (
    <QuestionsEditor
      initialQuestions={initialQuestions}
      onSave={handleSaveClick}
      onCancel={onCancel}
      saving={saving}
      onGenerateAI={handleGenerateAI}
      generating={generating}
      headerTitle={initialTitle ? 'Cập Nhật Quiz' : 'Tạo Quiz Mới'}
      lectureTitle={lectureTitle}
      saveButtonText='Lưu Quiz'
      questionPlaceholder='Nhập nội dung câu hỏi trắc nghiệm...'
      deleteConfirmText='Xóa câu hỏi thứ'
    >
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
    </QuestionsEditor>
  )
}

export default QuizEditor
