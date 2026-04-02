import mongoose from 'mongoose'

const educatorApplicationSchema = new mongoose.Schema({
  userId: { type: String, required: true, ref: 'User' },
  
  // Personal Information
  fullName: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  
  // Professional Information
  expertise: { type: String, required: true }, // Lĩnh vực chuyên môn
  experience: { type: String, required: true }, // Kinh nghiệm giảng dạy
  qualification: { type: String, required: true }, // Bằng cấp/chứng chỉ
  linkedinUrl: { type: String }, // LinkedIn profile
  portfolioUrl: { type: String }, // Portfolio/Website
  
  // Teaching Information
  courseTopics: { type: String, required: true }, // Chủ đề muốn dạy
  teachingApproach: { type: String, required: true }, // Phương pháp giảng dạy
  sampleVideoUrl: { type: String }, // Link video mẫu
  
  // Documents
  cvUrl: { type: String }, // CV upload
  certificatesUrl: [{ type: String }], // Chứng chỉ uploads
  
  // Application Status
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected'], 
    default: 'pending' 
  },
  reviewedBy: { type: String, ref: 'User' }, // Admin who reviewed
  reviewedAt: { type: Date },
  rejectionReason: { type: String },
  
}, { timestamps: true })

// Index for quick lookup
educatorApplicationSchema.index({ userId: 1 })
educatorApplicationSchema.index({ status: 1 })

const EducatorApplication = mongoose.model('EducatorApplication', educatorApplicationSchema)

export default EducatorApplication
