import React, { useState, useContext } from 'react'
import { AppContext } from '../../context/AppContext'
import axios from 'axios'
import { toast } from 'react-toastify'
import { formatAiTextToHtml } from './aiTextFormatter'

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
