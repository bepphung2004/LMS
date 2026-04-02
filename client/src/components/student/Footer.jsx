import React from 'react'
import { assets } from '../../assets/assets'

const Footer = () => {
  return (
    <footer className='bg-gray-900 md:px-36 text-left w-full mt-10'>
      <div className='flex flex-col md:flex-row items-start px-8 md:px-0 justify-center gap-10 md:gap-32 py-10 border-b border-white/30'>
        <div className='flex flex-col md:items-start items-center w-full'>
          <img src={assets.logo_dark} alt="logo" />
          <p className='mt-6 text-center md:text-left text-sm text-white/80 '>Edemy - Nền tảng học tập trực tuyến hiện đại, kết nối giảng viên và học viên, đồng hành cùng bạn trên hành trình phát triển tri thức.</p>
        </div>
        <div className='flex flex-col md:items-start items-center w-full'>
          <h2 className='font-semibold text-white mb-5'>Công ty</h2>
          <ul className='flex md:flex-col w-full justify-between text-sm text-white/80 md:space-y-2'>
            <li><a href="#">Trang chủ</a></li>
            <li><a href="#">Về chúng tôi</a></li>
            <li><a href="#">Liên hệ</a></li>
            <li><a href="#">Chính sách bảo mật</a></li>
          </ul>
        </div>
        <div className='hidden md:flex flex-col items-start w-full'>
          <h2 className='font-semibold text-white mb-5'>Đăng ký nhận bản tin</h2>
          <p className='text-sm text-white/80'>Nhận tin tức, bài viết và tài nguyên mới nhất được gửi tới email của bạn hàng tuần.</p>
          <div className='flex items-center gap-2 pt-4'>
            <input type="email" placeholder='Nhập email của bạn' className='border border-gray-500/30 bg-gray-800 text-gray-500 placeholder-gray-500 outline-none w-64 h-9 rounded px-2 text-sm'/>
            <button className='bg-blue-600 w-24 h-9 text-white rounded'>Đăng ký</button>
          </div>
        </div>
      </div>
      <p className='py-4 text-center text-xs md:text-sm text-white/60'>Copyright 2025 © Edemy. All rights reserved.</p>
    </footer>
  )
}

export default Footer