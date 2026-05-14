import React, { useState } from 'react';
import { Play, Pause, Home, BookOpen, User, ChevronRight, Heart } from 'lucide-react';

export function Storybook() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeTab, setActiveTab] = useState('home');

  return (
    <div 
      className="relative w-[390px] h-[844px] bg-[#FDF6E3] overflow-hidden rounded-[40px] shadow-2xl border-[8px] border-white mx-auto"
      style={{ fontFamily: "'Nunito', 'Fredoka One', sans-serif" }}
    >
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Fredoka+One&family=Nunito:wght@400;600;700;800;900&display=swap');
          
          .font-chunky {
            font-family: 'Fredoka One', cursive;
          }
          .font-rounded {
            font-family: 'Nunito', sans-serif;
          }
          
          /* Hide scrollbar */
          ::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>

      {/* Main Content Scroll Area */}
      <div className="h-full overflow-y-auto pb-[120px] px-6 pt-12 font-rounded">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-black text-[#84CC16]">Good Morning,</h1>
            <h2 className="text-4xl font-chunky text-[#F59E0B] tracking-wide">Leo! 🐻</h2>
          </div>
          <button className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center border-4 border-[#FDF6E3]">
            <span className="text-3xl">👶</span>
          </button>
        </div>

        {/* Categories */}
        <div className="flex gap-4 overflow-x-auto -mx-6 px-6 pb-4 mb-6 snap-x">
          {[
            { id: 'animals', emoji: '🦁', color: 'bg-[#FDA4AF]/20', textColor: 'text-[#FDA4AF]' },
            { id: 'space', emoji: '🚀', color: 'bg-[#84CC16]/20', textColor: 'text-[#84CC16]' },
            { id: 'bedtime', emoji: '🌙', color: 'bg-[#F59E0B]/20', textColor: 'text-[#F59E0B]' },
            { id: 'adventure', emoji: '🐉', color: 'bg-[#F97316]/20', textColor: 'text-[#F97316]' },
          ].map((cat) => (
            <button 
              key={cat.id}
              className={`flex flex-col items-center justify-center min-w-[100px] h-[100px] rounded-3xl ${cat.color} snap-start active:scale-95 transition-transform`}
            >
              <span className="text-4xl mb-1">{cat.emoji}</span>
            </button>
          ))}
        </div>

        {/* Featured Stories Section */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[28px] font-black text-slate-800">New Stories</h3>
            <ChevronRight className="w-8 h-8 text-slate-400" />
          </div>

          <div className="grid grid-cols-2 gap-5">
            {[
              { title: "Rocket to the Stars", duration: "12 min", emoji: "🚀", bg: "bg-[#84CC16]" },
              { title: "The Friendly Dragon", duration: "6 min", emoji: "🐉", bg: "bg-[#F97316]" },
              { title: "Ocean Friends", duration: "10 min", emoji: "🐋", bg: "bg-[#60A5FA]" },
              { title: "Magic Forest", duration: "8 min", emoji: "🌲", bg: "bg-[#A78BFA]" },
            ].map((story, i) => (
              <button 
                key={i} 
                className="relative flex flex-col items-start p-4 bg-white rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] active:scale-95 transition-transform overflow-hidden min-h-[220px]"
              >
                <div className={`w-full aspect-square rounded-[24px] ${story.bg} flex items-center justify-center mb-4 relative overflow-hidden`}>
                  <div className="absolute inset-0 bg-black/10 mix-blend-overlay"></div>
                  <span className="text-6xl filter drop-shadow-md z-10 relative transform hover:scale-110 transition-transform">{story.emoji}</span>
                </div>
                <h4 className="font-black text-xl text-slate-800 text-left leading-tight mb-2">{story.title}</h4>
                <div className="bg-slate-100 px-3 py-1.5 rounded-full mt-auto">
                  <span className="text-sm font-bold text-slate-500">{story.duration}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Now Playing Bar - Huge target */}
      <div className="absolute bottom-[110px] left-4 right-4 bg-white rounded-[40px] p-4 shadow-[0_10px_40px_rgba(245,158,11,0.2)] border-2 border-[#FDF6E3] flex items-center gap-4 z-20">
        <div className="w-[80px] h-[80px] rounded-[24px] bg-[#F59E0B] flex items-center justify-center flex-shrink-0 relative overflow-hidden">
          <div className="absolute inset-0 bg-white/20 mix-blend-overlay"></div>
          <span className="text-4xl">🦁</span>
        </div>
        
        <div className="flex-1 min-w-0">
          <h4 className="font-chunky text-xl text-slate-800 truncate mb-1">The Sleepy Lion</h4>
          <p className="font-bold text-slate-400 text-sm mb-3">8 min</p>
          
          {/* Progress bar */}
          <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-[#F59E0B] rounded-full w-[40%]"></div>
          </div>
        </div>

        <button 
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-[100px] h-[100px] rounded-full bg-[#F59E0B] flex items-center justify-center shadow-[0_8px_20px_rgba(245,158,11,0.4)] flex-shrink-0 active:scale-90 transition-transform"
        >
          {isPlaying ? (
            <Pause className="w-12 h-12 text-white fill-white" />
          ) : (
            <Play className="w-12 h-12 text-white fill-white ml-2" />
          )}
        </button>
      </div>

      {/* Bottom Navigation */}
      <div className="absolute bottom-0 left-0 right-0 h-[120px] bg-white rounded-b-[40px] shadow-[0_-10px_40px_rgba(0,0,0,0.05)] px-8 flex items-center justify-between pb-6 z-10">
        <button 
          onClick={() => setActiveTab('home')}
          className={`relative w-[100px] h-[80px] flex items-center justify-center rounded-[32px] transition-all ${activeTab === 'home' ? 'bg-[#F59E0B]/10' : ''}`}
        >
          <Home className={`w-10 h-10 ${activeTab === 'home' ? 'text-[#F59E0B] fill-[#F59E0B]' : 'text-slate-300'}`} />
          {activeTab === 'home' && (
            <div className="absolute -bottom-2 w-2 h-2 rounded-full bg-[#F59E0B]"></div>
          )}
        </button>
        
        <button 
          onClick={() => setActiveTab('library')}
          className={`relative w-[100px] h-[80px] flex items-center justify-center rounded-[32px] transition-all ${activeTab === 'library' ? 'bg-[#F59E0B]/10' : ''}`}
        >
          <BookOpen className={`w-10 h-10 ${activeTab === 'library' ? 'text-[#F59E0B] fill-[#F59E0B]' : 'text-slate-300'}`} />
          {activeTab === 'library' && (
            <div className="absolute -bottom-2 w-2 h-2 rounded-full bg-[#F59E0B]"></div>
          )}
        </button>

        <button 
          onClick={() => setActiveTab('profile')}
          className={`relative w-[100px] h-[80px] flex items-center justify-center rounded-[32px] transition-all ${activeTab === 'profile' ? 'bg-[#F59E0B]/10' : ''}`}
        >
          <User className={`w-10 h-10 ${activeTab === 'profile' ? 'text-[#F59E0B] fill-[#F59E0B]' : 'text-slate-300'}`} />
          {activeTab === 'profile' && (
            <div className="absolute -bottom-2 w-2 h-2 rounded-full bg-[#F59E0B]"></div>
          )}
        </button>
      </div>
    </div>
  );
}

export default Storybook;
