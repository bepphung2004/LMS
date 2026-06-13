import React from 'react'

const CertificateModal = ({ courseData, userData, progressData, onClose }) => {
  const graduationDate = progressData?.updatedAt 
    ? new Date(progressData.updatedAt).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    : new Date().toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })

  const scoreText = progressData?.finalExamScore !== undefined 
    ? `với điểm số tốt nghiệp ${progressData.finalExamScore}%` 
    : ''

  const handlePrint = () => {
    window.print()
  }

  const certId = `LMS-${courseData?._id?.substring(18, 24).toUpperCase() || 'GRAD'}-${userData?._id?.substring(18, 24).toUpperCase() || 'STUD'}`

  return (
    <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 overflow-y-auto no-print:animate-fadeIn print:p-0 print:bg-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Alex+Brush&family=Inter:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap');
        
        .font-serif-display {
          font-family: 'Playfair Display', Georgia, serif;
        }
        .font-sans-inter {
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
        }
        .font-signature {
          font-family: 'Alex Brush', cursive, serif;
        }

        @media print {
          /* Hide everything except the certificate print area */
          body * {
            visibility: hidden;
          }
          #certificate-print-area, #certificate-print-area * {
            visibility: visible;
          }
          #certificate-print-area {
            position: fixed;
            left: 0;
            top: 0;
            width: 100vw;
            height: 100vh;
            margin: 0;
            padding: 3rem;
            box-shadow: none !important;
            border: none !important;
            background: #faf8f5 !important; /* Force Cream Background */
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            display: flex !important;
            flex-direction: column !important;
            justify-content: space-between !important;
            align-items: stretch !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="w-full max-w-5xl bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col no-print">
        {/* Modal Header */}
        <div className="px-8 py-5 bg-white flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100">
              <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-lg text-slate-800 font-sans-inter">Chứng chỉ tốt nghiệp</h3>
              <p className="text-xs text-slate-500 font-sans-inter">Bản xem trước trực tuyến</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-xl transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Certificate Display Area */}
        <div className="p-8 flex justify-center bg-slate-50">
          {/* Certificate Container */}
          <div 
            id="certificate-print-area" 
            className="relative w-full aspect-[1.414/1] bg-[#faf8f5] text-slate-800 rounded-lg p-12 md:p-16 border-[16px] border-white overflow-hidden font-sans-inter flex flex-col justify-between"
            style={{
              boxShadow: '0 10px 30px -10px rgba(0, 0, 0, 0.08), inset 0 0 60px rgba(184, 151, 108, 0.03)'
            }}
          >
            {/* Elegant thin inner border */}
            <div className="absolute inset-6 border border-[#b8976c]/30 pointer-events-none rounded"></div>

            {/* Subtle Watermark Logo/Crest background */}
            <div className="absolute inset-0 flex items-center justify-center opacity-[0.015] pointer-events-none">
              <svg className="w-[300px] h-[300px] text-[#b8976c]" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L1 21h22L12 2zm0 4l7.5 13h-15L12 6z"/>
              </svg>
            </div>

            {/* Top Logo and Header */}
            <div className="text-center z-10">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-serif-display font-medium tracking-wide text-slate-900 uppercase">
                Chứng Chỉ Tốt Nghiệp
              </h1>
              <p className="text-[10px] md:text-xs font-sans-inter font-medium text-[#b8976c] tracking-[0.25em] mt-2 uppercase">
                Certificate of Graduation
              </p>
              <div className="w-12 h-[1px] bg-[#b8976c]/40 mx-auto mt-4"></div>
            </div>

            {/* Recipient Block */}
            <div className="text-center my-4 md:my-6 z-10">
              <p className="text-xs md:text-sm text-slate-500 font-serif-display italic tracking-wide">
                Trân trọng chứng nhận học viên
              </p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif-display text-slate-900 font-bold my-4 tracking-wide">
                {userData?.name || 'Tên Học Viên'}
              </h2>
              <p className="max-w-2xl mx-auto text-xs md:text-sm leading-relaxed text-slate-600 font-sans-inter font-light tracking-wide">
                Đã hoàn thành xuất sắc khóa học chuyên sâu <strong className="text-slate-800 font-semibold">"{courseData?.courseTitle || 'Tên Khóa Học'}"</strong> {scoreText} chứng minh năng lực chuyên môn và hoàn thành đầy đủ các yêu cầu của chương trình đào tạo.
              </p>
            </div>

            {/* Signatures & Seal Block */}
            <div className="grid grid-cols-3 items-end text-center z-10 mt-6">
              {/* Date */}
              <div className="flex flex-col items-center">
                <p className="text-[10px] text-slate-400 font-semibold tracking-widest font-sans-inter uppercase">Ngày Cấp</p>
                <div className="w-16 h-[1px] bg-slate-200 my-2"></div>
                <p className="text-xs md:text-sm text-slate-700 font-sans-inter font-medium">{graduationDate}</p>
              </div>

              {/* Minimalist Seal */}
              <div className="flex flex-col items-center justify-center">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-full border border-[#b8976c]/40 p-1 flex items-center justify-center">
                  <div className="w-full h-full rounded-full border border-dashed border-[#b8976c]/60 flex items-center justify-center">
                    <svg className="w-6 h-6 text-[#b8976c]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Educator Signature */}
              <div className="flex flex-col items-center">
                <p className="text-[10px] text-slate-400 font-semibold tracking-widest font-sans-inter uppercase">Giảng Viên</p>
                <div className="w-16 h-[1px] bg-slate-200 my-2"></div>
                <div className="h-8 flex flex-col justify-center">
                  <p className="text-xl md:text-2xl font-signature text-[#b8976c]">{courseData?.educator?.name || 'Giảng viên'}</p>
                </div>
                <p className="text-[9px] md:text-[10px] text-slate-500 font-sans-inter font-medium mt-1">{courseData?.educator?.name}</p>
              </div>
            </div>

            {/* Bottom Certificate Verification ID */}
            <div className="text-center z-10 -mb-2 mt-4 text-[9px] text-slate-400 font-mono tracking-widest flex items-center justify-center gap-1.5">
              <span>MÃ XÁC THỰC:</span>
              <span className="text-[#b8976c] font-semibold">{certId}</span>
            </div>
          </div>
        </div>

        {/* Action Footer */}
        <div className="px-8 py-5 bg-white border-t border-slate-100 flex justify-between gap-4">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-all font-sans-inter text-sm"
          >
            Đóng
          </button>
          <button
            onClick={handlePrint}
            className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl transition-all shadow-md font-sans-inter flex items-center gap-2 text-sm"
          >
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            In Chứng Chỉ / Tải PDF
          </button>
        </div>
      </div>
    </div>
  )
}

export default CertificateModal

