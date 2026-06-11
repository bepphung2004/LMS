import { createContext, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import humanizeDuration from "humanize-duration"
import { useAuth, useUser } from '@clerk/clerk-react'
import axios from "axios"
import { toast } from 'react-toastify'

export const AppContext = createContext()

export const AppContextProvider = (props) => {

  const rawBackendUrl = import.meta.env.VITE_BACKEND_URL
  const backendUrl = rawBackendUrl && rawBackendUrl.endsWith('/') ? rawBackendUrl.slice(0, -1) : rawBackendUrl
  const currency = import.meta.env.VITE_CURRENCY
  const normalizedCurrency = String(currency || 'VNĐ').toUpperCase()
  const navigate = useNavigate()

  const { getToken, sessionId } = useAuth()
  const { user } = useUser()

  const [allCourses, setAllCourses] = useState([])
  const [isEducator, setIsEducator] = useState(false)
  const [enrolledCourses, setEnrolledCourses] = useState([])
  const [userData, setUserData] = useState(null)

  // Fetch all courses
  const fetchAllCourses = async () => {
    try {
      const {data} = await axios.get(backendUrl + '/api/course/all')

      if (data.success) {
        setAllCourses(data.courses)
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  // Fetch user data
  const fetchUserData = async () => {
    const hasEducatorRole = user?.publicMetadata?.role === 'educator'
    setIsEducator(Boolean(hasEducatorRole))

    try {
      const token = await getToken()
      
      const { data } = await axios.get(backendUrl + '/api/user/data', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (data.success) {
        setUserData(data.user)
        return data.user
      } else {
        toast.error(data.message)
        return null
      }
    } catch (error) {
      if (error.response?.data?.isBanned) {
        setUserData({ isBanned: true })
        return { isBanned: true }
      }
      toast.error(error.message)
      return null
    }
  }

  // Function to calculate average rating
  const calculateRating = (course) => {
    const ratings = Array.isArray(course?.courseRatings) ? course.courseRatings : []
    if (ratings.length === 0) {
      return 0
    } 
    let totalRating = 0
    ratings.forEach((ratingItem) => {
      totalRating += Number(ratingItem?.rating ?? ratingItem?.Rating ?? 0)
    })
    return Math.floor(totalRating / ratings.length)
  }

  const viLang = {
    language: "vi",
    languages: {
      vi: {
        h: () => "giờ",
        m: () => "phút"
      }
    }
  }

  // Function to calculate course chapter time
  const calculateChapterTime = (chapter) => {
    let time = 0
    chapter.chapterContent.map((lecture) => time += lecture.lectureDuration)
    return humanizeDuration(time * 60 * 1000, {units: ["h", "m"], ...viLang})
  }

  // Function to calculate course duration
  const calculateCourseDuration = (course) => {
    let time = 0
    course.courseContent.map((chapter) => chapter.chapterContent.map(
      (lecture) => time += lecture.lectureDuration
      ))
    return humanizeDuration(time * 60 * 1000, {units: ["h", "m"], ...viLang})
  }

  // Function to calculate the number of lectures in a course
  const calculateNoOfLectures = (course) => {
    let totalLectures = 0
    course.courseContent.forEach(chapter => {
      if (Array.isArray(chapter.chapterContent)) {
        totalLectures += chapter.chapterContent.length
      }
    })
    return totalLectures
  }

  const formatCurrency = (amount = 0) => {
    const numericAmount = Number(amount)
    const safeAmount = Number.isFinite(numericAmount) ? numericAmount : 0
    const formattedNumber = new Intl.NumberFormat('vi-VN', {
      maximumFractionDigits: 0
    }).format(Math.round(safeAmount))

    if (normalizedCurrency === 'VND' || normalizedCurrency === 'VNĐ') {
      return `${formattedNumber} VNĐ`
    }

    return `${currency}${formattedNumber}`
  }

  // Fetch user's enrolled courses
  const fetchUserEnrolledCourses = async () => {
    try {
      const token = await getToken()
      const { data } = await axios.get(backendUrl + '/api/user/enrolled-courses', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (data.success) {
        setEnrolledCourses(data.enrolledCourses.reverse())
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(error.message)
    }
  }

  useEffect(() => {
    fetchAllCourses()
  }, [])

  useEffect(() => {
    if (!user) return
    const init = async () => {
      // fetch user data first, then enrolled courses
      const currentUserData = await fetchUserData()
      if (currentUserData?.isBanned) return
      await fetchUserEnrolledCourses()
    }
    init()
  }, [user, sessionId])

  const value = {
    currency, formatCurrency, allCourses, navigate, calculateRating, isEducator, setIsEducator, calculateChapterTime, calculateCourseDuration, calculateNoOfLectures, enrolledCourses, setEnrolledCourses, fetchUserEnrolledCourses, backendUrl, userData, fetchUserData, getToken, fetchAllCourses
  }

  return (
    <AppContext.Provider value={value}>
      {props.children}
    </AppContext.Provider>
  )

  
}
