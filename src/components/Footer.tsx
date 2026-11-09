import React from 'react';
import { Repeat, Mail, Phone, MapPin, Heart, Shield } from 'lucide-react';

interface FooterProps {
  onNavigate: (page: string) => void;
  contactEmail?: string;
  contactPhone?: string;
}

export const Footer: React.FC<FooterProps> = ({ 
  onNavigate, 
  contactEmail = 'mekong@ueh.edu.vn', 
  contactPhone = '(0270) 3823443' 
}) => {
  return (
    <footer className="bg-[#173B65] text-white pt-14 pb-8 border-t border-blue-900/40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#3478C8] to-[#63C7A5] flex items-center justify-center text-white font-bold shadow-md">
                <Repeat className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-extrabold text-xl text-white tracking-tight">SkillSwap UEH Mekong</span>
                <span className="block text-xs text-blue-200">Dự án cộng đồng học tập ngang hàng (Peer-to-Peer Learning)</span>
              </div>
            </div>

            <p className="text-sm text-slate-300 max-w-md leading-relaxed">
              Slogan: <strong className="text-white">"Share What You Know. Learn What You Need."</strong>
              <br />
              Nền tảng kết nối sinh viên UEH Phân hiệu Vĩnh Long cùng trao đổi kỹ năng, ôn luyện chứng chỉ, làm đồ án và xây dựng mạng lưới bạn bè chất lượng.
            </p>

            <div className="flex items-center gap-2 text-xs text-emerald-300 font-medium bg-emerald-950/40 border border-emerald-500/20 px-3 py-1.5 rounded-lg w-fit">
              <Shield className="w-4 h-4 text-emerald-400" />
              Dự án học tập phi thương mại – Miễn phí 100% cho sinh viên UEH
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-blue-200 mb-4">Điều hướng</h4>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>
                <button onClick={() => onNavigate('home')} className="hover:text-emerald-300 transition-colors">
                  Trang chủ
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('explore')} className="hover:text-emerald-300 transition-colors">
                  Khám phá kỹ năng
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('match')} className="hover:text-emerald-300 transition-colors">
                  Ghép cặp 1–1
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('groups')} className="hover:text-emerald-300 transition-colors">
                  Nhóm học tập
                </button>
              </li>
              <li>
                <button onClick={() => onNavigate('schedule')} className="hover:text-emerald-300 transition-colors">
                  Lịch trao đổi
                </button>
              </li>
            </ul>
          </div>

          {/* Contact / Campus Info */}
          <div>
            <h4 className="text-sm font-bold uppercase tracking-wider text-blue-200 mb-4">Thông tin liên hệ</h4>
            <ul className="space-y-3 text-xs text-slate-300">
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <span>Số 1B, Nguyễn Trung Trực, Phường Bến Tre (TP. Vĩnh Long), Tỉnh Vĩnh Long</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-blue-400 shrink-0" />
                <span>{contactEmail}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 text-blue-400 shrink-0" />
                <span>{contactPhone}</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom copyright */}
        <div className="pt-8 border-t border-blue-900/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© {new Date().getFullYear()} SkillSwap UEH Mekong. Xây dựng cho sinh viên UEH.</p>
          <div className="flex items-center gap-1">
            <span>Phát triển với tinh thần chia sẻ</span>
            <Heart className="w-3.5 h-3.5 text-rose-400 inline fill-rose-400" />
            <span>tại Vĩnh Long</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
