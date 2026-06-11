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
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center z-50 p-4 overflow-y-auto animate-fadeIn print:p-0 print:bg-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;700;800;900&family=Great+Vibes&family=Montserrat:wght@400;500;600&display=swap');
        
        .font-cinzel {
          font-family: 'Cinzel', Georgia, serif;
        }
        .font-cursive {
          font-family: 'Great Vibes', cursive, serif;
        }
        .font-montserrat {
          font-family: 'Montserrat', sans-serif;
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
            padding: 2.5rem;
            box-shadow: none !important;
            border: none !important;
            background: #0f172a !important; /* Force Navy Background */
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            display: flex !important;
            align-items: center;
            justify-content: center;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="w-full max-w-5xl bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-850 flex flex-col no-print">
        {/* Modal Header */}
        <div className="px-8 py-5 bg-slate-950 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center border border-amber-500/20">
              <svg className="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-lg text-slate-100 font-cinzel">Chứng chỉ tốt nghiệp</h3>
              <p className="text-xs text-amber-500/80 font-montserrat">Phong cách Royal Navy & Gold Premium</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Certificate Display Area */}
        <div className="p-8 flex justify-center bg-slate-950/40">
          {/* Certificate Container */}
          <div 
            id="certificate-print-area" 
            className="relative w-full aspect-[1.414/1] bg-slate-900 text-white rounded-2xl p-8 md:p-12 shadow-inner border-[12px] border-amber-600/30 overflow-hidden font-montserrat flex flex-col justify-between"
            style={{
              backgroundImage: 'radial-gradient(circle at center, #1e293b 0%, #0f172a 100%)'
            }}
          >
            {/* Elegant Double Border Frame */}
            <div className="absolute inset-2 border border-amber-400/20 pointer-events-none rounded-lg"></div>
            <div className="absolute inset-4 border-2 border-amber-500/40 pointer-events-none rounded-lg"></div>
            <div className="absolute inset-5 border border-amber-400/20 pointer-events-none rounded-lg"></div>

            {/* Corner Ornaments */}
            <div className="absolute top-6 left-6 w-12 h-12 border-t-2 border-l-2 border-amber-500 pointer-events-none"></div>
            <div className="absolute top-6 right-6 w-12 h-12 border-t-2 border-r-2 border-amber-500 pointer-events-none"></div>
            <div className="absolute bottom-6 left-6 w-12 h-12 border-b-2 border-l-2 border-amber-500 pointer-events-none"></div>
            <div className="absolute bottom-6 right-6 w-12 h-12 border-b-2 border-r-2 border-amber-500 pointer-events-none"></div>

            {/* Subtle Watermark Logo/Crest background */}
            <div className="absolute inset-0 flex items-center justify-center opacity-3 pointer-events-none">
              <svg className="w-[400px] h-[400px] text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L1 21h22L12 2zm0 4l7.5 13h-15L12 6z"/>
              </svg>
            </div>

            {/* Top Logo and Header */}
            <div className="text-center z-10">
              <div className="inline-flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                <span className="text-amber-500 font-bold uppercase tracking-[0.3em] text-xs font-cinzel">Antigravity Academy</span>
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              </div>
              <h1 className="text-2xl md:text-4xl lg:text-5xl font-cinzel font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-amber-200 via-amber-400 to-amber-200 uppercase drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
                Chứng Chỉ Tốt Nghiệp
              </h1>
              <p className="text-xs md:text-sm font-light text-amber-200/60 font-cinzel tracking-widest mt-1 md:mt-2 uppercase">
                Royal Academic Certificate of Excellence
              </p>
            </div>

            {/* Recipient Block */}
            <div className="text-center my-4 md:my-6 z-10">
              <p className="text-xs md:text-sm font-light text-slate-300 font-cinzel tracking-wide italic">
                Trân trọng chứng nhận học viên
              </p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-cursive text-amber-300 my-2 drop-shadow-md">
                {userData?.name || 'Tên Học Viên'}
              </h2>
              <div className="w-48 h-[1px] bg-gradient-to-r from-transparent via-amber-400 to-transparent mx-auto my-3"></div>
              <p className="max-w-2xl mx-auto text-xs md:text-sm leading-relaxed text-slate-200 font-montserrat font-light">
                Đã hoàn thành xuất sắc khóa học chuyên sâu <strong className="text-white font-medium">"{courseData?.courseTitle || 'Tên Khóa Học'}"</strong> {scoreText} cùng các thử thách chuyên môn và bài kiểm tra tốt nghiệp của học viện Antigravity.
              </p>
            </div>

            {/* Signatures & Seal Block */}
            <div className="grid grid-cols-3 items-end text-center z-10 mt-2 md:mt-6">
              {/* Date */}
              <div className="flex flex-col items-center">
                <p className="text-xs text-slate-400 uppercase tracking-widest font-montserrat">Ngày Cấp</p>
                <div className="w-24 h-[1px] bg-amber-500/30 my-2"></div>
                <p className="text-xs md:text-sm text-amber-100 font-cinzel font-semibold">{graduationDate}</p>
              </div>

              {/* Gold Crest/Seal */}
              <div className="flex flex-col items-center justify-center relative">
                {/* Decorative Ribbons behind seal */}
                <div className="absolute -bottom-4 flex gap-4 w-16 h-12 justify-center pointer-events-none opacity-80">
                  <div className="w-4 h-16 bg-amber-600/60 transform rotate-12 rounded-b"></div>
                  <div className="w-4 h-16 bg-amber-600/60 transform -rotate-12 rounded-b"></div>
                </div>
                <div className="relative w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-amber-300 via-amber-500 to-amber-600 p-[2px] shadow-[0_4px_12px_rgba(0,0,0,0.5)] border border-amber-300/40 flex items-center justify-center z-20">
                  <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center border-2 border-dashed border-amber-400">
                    <svg className="w-8 h-8 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M2.166 4.9L10 1.154l7.834 3.746v6.239A8.017 8.017 0 0110 19.338a8.017 8.017 0 01-7.834-8.203V4.9zM10 3.327L4.167 6.13v4.463c0 3.428 1.954 6.444 5.833 7.848 3.879-1.404 5.833-4.42 5.833-7.848V6.13L10 3.327zM9 11V7a1 1 0 112 0v4a1 1 0 11-2 0zm1 4a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Educator Signature */}
              <div className="flex flex-col items-center">
                <p className="text-xs text-slate-400 uppercase tracking-widest font-montserrat">Giảng Viên</p>
                <div className="w-24 h-[1px] bg-amber-500/30 my-2"></div>
                <p className="text-xs md:text-sm font-cursive text-amber-200 text-lg">{courseData?.educator?.name || 'Antigravity Board'}</p>
              </div>
            </div>

            {/* Bottom Certificate Verification ID */}
            <div className="text-center z-10 -mb-2 mt-4 text-[9px] text-slate-500 font-mono tracking-widest flex items-center justify-center gap-2">
              <span>MÃ XÁC MINH:</span>
              <span className="text-amber-500/70 font-semibold">{certId}</span>
            </div>
          </div>
        </div>

        {/* Print & Action Footer */}
        <div className="px-8 py-5 bg-slate-950 border-t border-slate-800 flex justify-between gap-4">
          <button
            onClick={onClose}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium rounded-xl transition-all font-montserrat text-sm"
          >
            Đóng
          </button>
          <button
            onClick={handlePrint}
            className="px-8 py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl transition-all shadow-[0_4px_14px_rgba(245,158,11,0.2)] font-cinzel flex items-center gap-2 text-sm"
          >
            <svg className="w-5 h-5 text-slate-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
