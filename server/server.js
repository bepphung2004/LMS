import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import connectDB from './configs/mongodb.js'
import { clerkWebhooks } from './controllers/webhooks.js'
import { clerkMiddleware } from '@clerk/express'
import educatorRouter from './routes/educatorRoutes.js'
import connectCloudinary from './configs/cloudinary.js'
import courseRouter from './routes/courseRoute.js'
import userRouter from './routes/userRoute.js'
import adminRouter from './routes/adminRoutes.js'
import { stripeWebhooks } from './controllers/webhooks.js'

// Initialize Express app
const app = express()

// Connect to Database
await connectDB()
await connectCloudinary()

// Middleware
app.use(cors())
app.use(clerkMiddleware())

// Routes
app.get('/', (req, res) => res.send('API Working'))
app.post('/clerk', express.json(), clerkWebhooks)
app.use('/api/educator', express.json(), educatorRouter)
app.use('/api/course', express.json(),  courseRouter)
app.use('/api/user', express.json(),  userRouter)
app.use('/api/admin', express.json(), adminRouter)
app.post('/stripe', express.raw({ type: 'application/json' }), stripeWebhooks)

// Port
const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})

