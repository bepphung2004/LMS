import React from 'react'
import { assets } from '../../assets/assets'

const Hero = () => {
  return (
    <div className='flex flex-col items-center justify-center w-full md:pt-36 pt-20 px-7 md:px-0 space-y-7 text-center bg-linear-to-b from-cyan-100/70'>

      <h1 className='md:text-home-heading-large text-home-heading-small relative font-bold text-gray-800 max-w-3xl mx-auto'>Mở ra tương lai của bạn với những khóa học được thiết kế <span className='text-blue-600'> theo chính lựa chọn của bạn.</span><img src={assets.sketch} alt="sketch" className='md:block hidden absolute -bottom-7 right-0' /></h1>

      <p className='md:block hidden text-gray-500 max-w-2xl mx-auto'>Chúng tôi mang đến đội ngũ giảng viên hàng đầu, nội dung học tập sinh động cùng một cộng đồng luôn sẵn sàng đồng hành, giúp bạn chinh phục mọi mục tiêu cá nhân và sự nghiệp.</p>

      <p className='md:hidden text-gray-500 max-w-sm mx-auto'>Chúng tôi kết nối đội ngũ giảng viên hàng đầu, đồng hành cùng bạn chinh phục mục tiêu nghề nghiệp.</p>
    </div>
  )
}

export default Hero