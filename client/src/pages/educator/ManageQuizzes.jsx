import React, { useContext, useEffect, useState } from 'react'
import { AppContext } from '../../context/AppContext'
import Loading from '../../components/student/Loading'
import axios from 'axios'
import { toast } from 'react-toastify'
import CourseSelector from './CourseSelector'
import CourseDashboard from './CourseDashboard'
import QuizEditor from './QuizEditor'
import FinalExamEditor from './FinalExamEditor'

const ManageQuizzes = () => {
  const { backendUrl, getToken, isEducator, userData } = useContext(AppContext)
  const hasEducatorAccess = Boolean(isEducator || userData?.role === 'educator' || userData?.role === 'admin')

  const [courses, setCourses] = useState([])
  const [selectedCourseId, setSelectedCourseId] = useState('')
  const [selectedCourse, setSelectedCourse] = useState(null)
  
  // Navigation & View State
  const [currentView, setCurrentView] = useState('dashboard') // 'dashboard', 'quiz-editor', 'final-editor'
  
  // Lecture quiz editor context states
  const [editingLectureId, setEditingLectureId] = useState('')
  const [editingLecture, setEditingLecture] = useState(null)
  const [editingQuizIdx, setEditingQuizIdx] = useState(null)

  // Loading states
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [savingLectureQuiz, setSavingLectureQuiz] = useState(false)
  const [savingFinalExam, setSavingFinalExam] = useState(false)

  // Fetch educator courses
  const fetchCourses = async () => {
    try {
      setLoadingCourses(true)
      const token = await getToken()
      const { data } = await axios.get(`${backendUrl}/api/educator/courses`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (data.success) {
        setCourses(data.courses)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    } finally {
      setLoadingCourses(false)
    }
  }

  // Fetch full details of the selected course
  const fetchCourseDetails = async (courseId) => {
    if (!courseId) return
    try {
      const token = await getToken()
      const { data } = await axios.get(`${backendUrl}/api/educator/course/${courseId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (data.success) {
        setSelectedCourse(data.course)
      }
    } catch (error) {
      console.error(error)
      toast.error('Không thể tải chi tiết khóa học')
    }
  }

  // Effect to load courses
  useEffect(() => {
    if (hasEducatorAccess) {
      fetchCourses()
    }
  }, [hasEducatorAccess])

  // Effect to load selected course details
  useEffect(() => {
    if (selectedCourseId) {
      fetchCourseDetails(selectedCourseId)
      setCurrentView('dashboard')
    } else {
      setSelectedCourse(null)
    }
  }, [selectedCourseId])

  // Helper to get normalized quizzes list
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

  // Save Lecture Quiz callback
  const handleSaveLectureQuiz = async (quizTitle, quizQuestions) => {
    if (!selectedCourseId || !editingLectureId) return
    setSavingLectureQuiz(true)
    try {
      const currentQuizzes = getLectureQuizzes(editingLecture)
      let updatedQuizzes = []

      if (editingQuizIdx === null) {
        updatedQuizzes = [...currentQuizzes, { title: quizTitle, questions: quizQuestions }]
      } else {
        updatedQuizzes = currentQuizzes.map((q, idx) => 
          idx === editingQuizIdx ? { title: quizTitle, questions: quizQuestions } : q
        )
      }

      const token = await getToken()
      const { data } = await axios.post(`${backendUrl}/api/educator/save-lecture-quiz`, {
        courseId: selectedCourseId,
        lectureId: editingLectureId,
        quizzes: updatedQuizzes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (data.success) {
        toast.success('Đã lưu bài trắc nghiệm thành công!')
        await fetchCourseDetails(selectedCourseId)
        setCurrentView('dashboard')
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    } finally {
      setSavingLectureQuiz(false)
    }
  }

  // Delete a Lecture Quiz callback
  const handleDeleteQuiz = async (lecture, quizIdx) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa Quiz này?')) return
    try {
      const currentQuizzes = getLectureQuizzes(lecture)
      const updatedQuizzes = currentQuizzes.filter((_, idx) => idx !== quizIdx)

      const token = await getToken()
      const { data } = await axios.post(`${backendUrl}/api/educator/save-lecture-quiz`, {
        courseId: selectedCourseId,
        lectureId: lecture.lectureId,
        quizzes: updatedQuizzes
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (data.success) {
        toast.success('Đã xóa Quiz thành công!')
        fetchCourseDetails(selectedCourseId)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    }
  }

  // Save Final Exam callback
  const handleSaveFinalExam = async (requiredScorePercent, durationMins, finalExamQuestions) => {
    if (!selectedCourseId) return
    setSavingFinalExam(true)
    try {
      const token = await getToken()
      const { data } = await axios.post(`${backendUrl}/api/educator/save-final-exam`, {
        courseId: selectedCourseId,
        requiredScorePercent: Number(requiredScorePercent),
        durationMins: Number(durationMins),
        questions: finalExamQuestions
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (data.success) {
        toast.success('Đã lưu bài thi hết khóa thành công!')
        await fetchCourseDetails(selectedCourseId)
        setCurrentView('dashboard')
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    } finally {
      setSavingFinalExam(false)
    }
  }

  // Delete Final Exam callback
  const handleDeleteFinalExam = async () => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa đề thi cuối khóa này?')) return
    try {
      const token = await getToken()
      const { data } = await axios.post(`${backendUrl}/api/educator/save-final-exam`, {
        courseId: selectedCourseId,
        requiredScorePercent: 70,
        durationMins: 30,
        questions: []
      }, {
        headers: { Authorization: `Bearer ${token}` }
      })

      if (data.success) {
        toast.success('Đã xóa đề thi cuối khóa thành công!')
        fetchCourseDetails(selectedCourseId)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.response?.data?.message || error.message)
    }
  }

  // UI Navigation Helpers
  const handleAddQuiz = (lecture) => {
    setEditingLectureId(lecture.lectureId)
    setEditingLecture(lecture)
    setEditingQuizIdx(null)
    setCurrentView('quiz-editor')
  }

  const handleEditQuiz = (lecture, quizIdx) => {
    setEditingLectureId(lecture.lectureId)
    setEditingLecture(lecture)
    setEditingQuizIdx(quizIdx)
    setCurrentView('quiz-editor')
  }

  if (loadingCourses) {
    return <Loading />
  }

  return (
    <div className='md:p-8 p-4 pt-8 pb-0'>
      <div className='w-full max-w-5xl text-gray-700 space-y-6 pb-8'>
        {/* VIEW 1: Course Selector Grid */}
        {!selectedCourse && (
          <CourseSelector
            courses={courses}
            onSelectCourse={setSelectedCourseId}
          />
        )}

        {/* VIEW 2: Course Dashboard */}
        {selectedCourse && currentView === 'dashboard' && (
          <CourseDashboard
            selectedCourse={selectedCourse}
            courses={courses}
            selectedCourseId={selectedCourseId}
            setSelectedCourseId={setSelectedCourseId}
            onBack={() => {
              setSelectedCourseId('')
              setSelectedCourse(null)
            }}
            onAddQuiz={handleAddQuiz}
            onEditQuiz={handleEditQuiz}
            onDeleteQuiz={handleDeleteQuiz}
            onAddFinalExam={() => setCurrentView('final-editor')}
            onEditFinalExam={() => setCurrentView('final-editor')}
            onDeleteFinalExam={handleDeleteFinalExam}
          />
        )}

        {/* VIEW 3A: Quiz Editor */}
        {selectedCourse && currentView === 'quiz-editor' && (
          <QuizEditor
            courseId={selectedCourseId}
            lectureId={editingLectureId}
            lectureTitle={editingLecture?.lectureTitle}
            initialTitle={
              editingQuizIdx !== null
                ? getLectureQuizzes(editingLecture)[editingQuizIdx]?.title
                : ''
            }
            initialQuestions={
              editingQuizIdx !== null
                ? getLectureQuizzes(editingLecture)[editingQuizIdx]?.questions
                : []
            }
            onSave={handleSaveLectureQuiz}
            onCancel={() => setCurrentView('dashboard')}
            backendUrl={backendUrl}
            getToken={getToken}
            saving={savingLectureQuiz}
          />
        )}

        {/* VIEW 3B: Final Exam Editor */}
        {selectedCourse && currentView === 'final-editor' && (
          <FinalExamEditor
            courseId={selectedCourseId}
            initialQuestions={selectedCourse.finalExam?.questions || []}
            initialScore={selectedCourse.finalExam?.requiredScorePercent ?? 70}
            initialDuration={selectedCourse.finalExam?.durationMins ?? 30}
            onSave={handleSaveFinalExam}
            onCancel={() => setCurrentView('dashboard')}
            backendUrl={backendUrl}
            getToken={getToken}
            saving={savingFinalExam}
          />
        )}
      </div>
    </div>
  )
}

export default ManageQuizzes
