import React, { useState, useRef, useEffect, useContext } from 'react'
import { AppContext } from '../../context/AppContext'
import axios from 'axios'
import { formatAiTextToHtml } from './aiTextFormatter'

const AIChatbot = ({ courseId, lectureId, lessonContext, isOpen, onClose }) => {
  const { backendUrl, getToken } = useContext(AppContext)
  const [messages, setMessages] = useState([
    { 
      role: 'assistant', 
      content: 'Xin chào! Tôi là trợ lý học tập AI. Bạn có thể hỏi tôi bất kỳ điều gì về nội dung bài học. 📚' 
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setLoading(true)

    try {
      const token = await getToken()
      const { data } = await axios.post(`${backendUrl}/api/ai/chat`, {
        message: userMessage,
        courseId,
        lectureId,
        lessonContext
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (data.success) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
      } else {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: 'Xin lỗi, có lỗi xảy ra. Vui lòng thử lại sau.' 
        }])
      }
    } catch (error) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: error.response?.data?.message || 'Không thể kết nối với AI. Vui lòng kiểm tra cấu hình.' 
      }])
    } finally {
      setLoading(false)
    }
  }

  const quickQuestions = [
    'Giải thích khái niệm này',
    'Cho ví dụ minh họa',
    'Tóm tắt nội dung chính',
    'Hướng dẫn thực hành'
  ]

  if (!isOpen) return null

  return (
    <div className='fixed bottom-4 right-4 w-96 h-[600px] bg-white rounded-3xl shadow-[0_12px_40px_rgba(30,41,59,0.16)] border border-slate-200/80 flex flex-col z-50 overflow-hidden animate-fadeIn'>
      {/* Header */}
      <div className='bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 text-white p-4 flex items-center justify-between shadow-md'>
        <div className='flex items-center gap-3'>
          <div className='w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shadow-inner'>
            <svg className="w-5.5 h-5.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <div>
            <h3 className='font-bold text-sm font-cinzel tracking-wide'>Trợ lý học tập AI</h3>
            <span className='inline-flex items-center gap-1.5 text-xs text-blue-100 font-medium'>
              <span className='w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse'></span>
              Sẵn sàng hỗ trợ bạn
            </span>
          </div>
        </div>
        <button 
          onClick={onClose}
          className='w-8 h-8 rounded-lg hover:bg-white/20 flex items-center justify-center transition-colors cursor-pointer'
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className='flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 scrollbar-thin'>
        {messages.map((msg, idx) => {
          const isUser = msg.role === 'user';
          return (
            <div 
              key={idx} 
              className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
            >
              {!isUser && (
                <div className='w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0 self-start mt-0.5'>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                </div>
              )}
              <div className={`max-w-[75%] rounded-2xl px-4 py-3 shadow-3xs border text-sm ${
                isUser 
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white border-transparent rounded-tr-none' 
                  : 'bg-white text-gray-800 border-gray-100 rounded-tl-none'
              }`}>
                {isUser ? (
                  <p className='whitespace-pre-wrap leading-relaxed'>{msg.content}</p>
                ) : (
                  <div
                    className='ai-chat-rich-text leading-relaxed'
                    dangerouslySetInnerHTML={{ __html: formatAiTextToHtml(msg.content) }}
                  />
                )}
              </div>
              {isUser && (
                <div className='w-8 h-8 rounded-xl bg-slate-200 text-slate-600 border border-slate-300/30 flex items-center justify-center shadow-inner shrink-0 self-start mt-0.5 font-bold text-xs uppercase'>
                  U
                </div>
              )}
            </div>
          )
        })}
        {loading && (
          <div className='flex gap-2.5 justify-start'>
            <div className='w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-xs shrink-0 self-start mt-0.5 animate-pulse'>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            </div>
            <div className='bg-white text-gray-800 rounded-2xl rounded-tl-none px-4 py-3 shadow-3xs border border-gray-100'>
              <div className='flex items-center gap-2'>
                <div className='flex gap-1'>
                  <span className='w-2 h-2 bg-indigo-500 rounded-full animate-bounce' style={{animationDelay: '0ms'}}></span>
                  <span className='w-2 h-2 bg-indigo-500 rounded-full animate-bounce' style={{animationDelay: '150ms'}}></span>
                  <span className='w-2 h-2 bg-indigo-500 rounded-full animate-bounce' style={{animationDelay: '300ms'}}></span>
                </div>
                <span className='text-xs text-gray-400 font-medium'>AI đang suy nghĩ...</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick questions */}
      <div className='px-4 py-2.5 bg-white border-t flex gap-2 overflow-x-auto scrollbar-none'>
        {quickQuestions.map((q, idx) => (
          <button
            key={idx}
            onClick={() => setInput(q)}
            className='whitespace-nowrap px-3.5 py-2 text-xs border border-violet-100 bg-violet-50/50 text-violet-750 rounded-full hover:bg-violet-100/80 active:scale-95 transition-all font-semibold shadow-3xs cursor-pointer'
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <form onSubmit={sendMessage} className='p-4 bg-white border-t'>
        <div className='flex gap-2'>
          <input
            type='text'
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Nhập câu hỏi của bạn...'
            className='flex-1 px-4 py-3 bg-slate-50 border border-slate-200/60 rounded-xl focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/25 text-sm transition-all'
            disabled={loading}
          />
          <button
            type='submit'
            disabled={loading || !input.trim()}
            className='w-12 h-12 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl flex items-center justify-center hover:scale-[1.03] active:scale-95 disabled:scale-100 disabled:opacity-50 transition-all shadow-md shadow-indigo-600/10 cursor-pointer shrink-0'
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </form>
    </div>
  )
}

// Floating AI Button
export const AIFloatingButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className='fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-tr from-violet-600 via-indigo-600 to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl shadow-indigo-600/20 hover:scale-[1.08] active:scale-95 transition-all flex items-center justify-center z-40 cursor-pointer group'
      title='Trợ lý AI'
    >
      <svg className="w-7 h-7 transform group-hover:rotate-12 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    </button>
  )
}

export default AIChatbot
