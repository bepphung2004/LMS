import { clerkClient } from "@clerk/express"

// Middleware to protect routes for educators only
export const protectEducator = async (req, res, next) => {
  try {
    const userId = req.auth.userId
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Please login.' })
    }
    
    const response = await clerkClient.users.getUser(userId)
    if (response.publicMetadata.role !== 'educator' && response.publicMetadata.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Educators only.' })
    }
    next()
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Middleware to protect routes for admin only
export const protectAdmin = async (req, res, next) => {
  try {
    const userId = req.auth.userId
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Please login.' })
    }
    
    const response = await clerkClient.users.getUser(userId)
    if (response.publicMetadata.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Access denied. Admins only.' })
    }
    next()
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}

// Middleware to check if user is authenticated
export const requireAuth = async (req, res, next) => {
  try {
    const userId = req.auth.userId
    if (!userId) {
      return res.status(401).json({ success: false, message: 'Unauthorized. Please login.' })
    }
    next()
  } catch (error) {
    res.status(500).json({ success: false, message: error.message })
  }
}