import React from "react";
import { Play, Pause, Home, Search, Settings, Star, Heart, Music } from "lucide-react";

export function Rainbow() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Righteous&display=swap');
        .font-righteous {
          font-family: 'Righteous', cursive;
        }
        .rainbow-gradient {
          background: linear-gradient(90deg, #ef4444 0%, #facc15 25%, #22c55e 50%, #3b82f6 75%, #a855f7 100%);
        }
        /* Hide scrollbar for clean mockup */
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
      `}</style>
      
      {/* Mobile Device Container */}
      <div className="w-[390px] h-[844px] bg-white rounded-[40px] shadow-2xl overflow-hidden relative flex flex-col font-righteous border-[8px] border-gray-900">
        
        {/* Status Bar Area (Mock) */}
        <div className="h-12 w-full flex justify-between items-center px-6 pt-2 z-10">
          <span className="text-black text-sm font-sans font-bold">9:41</span>
          <div className="flex gap-1.5">
            <div className="w-4 h-4 bg-black rounded-full" />
            <div className="w-4 h-4 bg-black rounded-full" />
            <div className="w-6 h-4 bg-black rounded-sm" />
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-32">
          
          {/* Header */}
          <div className="px-6 pt-4 pb-2 flex justify-between items-center">
            <h1 className="text-5xl text-[#3B82F6] drop-shadow-sm tracking-wide">Storytime</h1>
            <div className="w-16 h-16 bg-[#FACC15] rounded-full flex justify-center items-center shadow-lg border-4 border-white">
              <span className="text-3xl">👦</span>
            </div>
          </div>

          {/* Currently Playing */}
          <div className="px-6 mt-6">
            <h2 className="text-3xl text-gray-800 mb-4 tracking-wide">Playing Now</h2>
            <div className="bg-[#EF4444] rounded-[32px] p-6 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 rounded-full -mr-10 -mt-10 blur-xl" />
              
              <div className="flex gap-4 items-center relative z-10">
                <div className="w-24 h-24 bg-white rounded-2xl flex justify-center items-center text-6xl shadow-inner">
                  🦁
                </div>
                <div className="flex-1">
                  <h3 className="text-white text-2xl leading-tight mb-1">The Sleepy Lion</h3>
                  <p className="text-white/80 text-lg font-sans font-bold">8 min</p>
                </div>
              </div>

              {/* Huge Play Button */}
              <div className="mt-8 flex justify-center relative">
                <div className="absolute inset-0 flex justify-center items-center">
                  <Star className="text-yellow-300 w-32 h-32 absolute animate-pulse opacity-50" fill="currentColor" />
                </div>
                <button className="w-[100px] h-[100px] bg-[#FACC15] rounded-full flex justify-center items-center shadow-[0_8px_0_#ca8a04] active:shadow-[0_0px_0_#ca8a04] active:translate-y-2 transition-all z-10 border-4 border-white">
                  <Pause className="w-12 h-12 text-[#EF4444]" fill="currentColor" />
                </button>
              </div>

              {/* Progress Bar */}
              <div className="mt-8">
                <div className="h-4 w-full bg-black/20 rounded-full overflow-hidden p-0.5">
                  <div className="h-full w-[40%] rainbow-gradient rounded-full" />
                </div>
                <div className="flex justify-between mt-2 px-1">
                  <span className="text-white/90 text-sm font-sans font-bold">3:12</span>
                  <span className="text-white/90 text-sm font-sans font-bold">8:00</span>
                </div>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="px-6 mt-10">
            <h2 className="text-3xl text-gray-800 mb-6 tracking-wide">Pick a Story</h2>
            <div className="grid grid-cols-2 gap-4">
              <button className="h-[120px] bg-[#3B82F6] rounded-[32px] flex flex-col justify-center items-center shadow-[0_6px_0_#2563eb] active:shadow-none active:translate-y-[6px] transition-all">
                <span className="text-5xl mb-2">🦁</span>
                <span className="text-white text-xl">Animals</span>
              </button>
              <button className="h-[120px] bg-[#A855F7] rounded-[32px] flex flex-col justify-center items-center shadow-[0_6px_0_#9333ea] active:shadow-none active:translate-y-[6px] transition-all">
                <span className="text-5xl mb-2">🚀</span>
                <span className="text-white text-xl">Space</span>
              </button>
              <button className="h-[120px] bg-[#FACC15] rounded-[32px] flex flex-col justify-center items-center shadow-[0_6px_0_#ca8a04] active:shadow-none active:translate-y-[6px] transition-all">
                <span className="text-5xl mb-2">🌙</span>
                <span className="text-white text-xl">Bedtime</span>
              </button>
              <button className="h-[120px] bg-[#22C55E] rounded-[32px] flex flex-col justify-center items-center shadow-[0_6px_0_#16a34a] active:shadow-none active:translate-y-[6px] transition-all">
                <span className="text-5xl mb-2">🐉</span>
                <span className="text-white text-xl">Adventure</span>
              </button>
            </div>
          </div>

          {/* Featured Stories */}
          <div className="mt-10 pl-6 mb-8">
            <h2 className="text-3xl text-gray-800 mb-6 tracking-wide">New Magic</h2>
            <div className="flex gap-4 overflow-x-auto pr-6 no-scrollbar snap-x">
              
              <div className="w-[200px] shrink-0 snap-start">
                <div className="h-[200px] bg-[#A855F7] rounded-[32px] flex justify-center items-center shadow-lg relative overflow-hidden mb-3">
                  <div className="absolute top-2 right-2 bg-white px-3 py-1 rounded-full">
                    <span className="text-[#A855F7] font-sans font-bold text-sm">12 min</span>
                  </div>
                  <span className="text-8xl transform hover:scale-110 transition-transform">🚀</span>
                </div>
                <h3 className="text-xl text-gray-800 leading-tight">Rocket to the Stars</h3>
              </div>

              <div className="w-[200px] shrink-0 snap-start">
                <div className="h-[200px] bg-[#22C55E] rounded-[32px] flex justify-center items-center shadow-lg relative overflow-hidden mb-3">
                  <div className="absolute top-2 right-2 bg-white px-3 py-1 rounded-full">
                    <span className="text-[#22C55E] font-sans font-bold text-sm">6 min</span>
                  </div>
                  <span className="text-8xl transform hover:scale-110 transition-transform">🐉</span>
                </div>
                <h3 className="text-xl text-gray-800 leading-tight">The Friendly Dragon</h3>
              </div>

              <div className="w-[200px] shrink-0 snap-start">
                <div className="h-[200px] bg-[#3B82F6] rounded-[32px] flex justify-center items-center shadow-lg relative overflow-hidden mb-3">
                  <div className="absolute top-2 right-2 bg-white px-3 py-1 rounded-full">
                    <span className="text-[#3B82F6] font-sans font-bold text-sm">10 min</span>
                  </div>
                  <span className="text-8xl transform hover:scale-110 transition-transform">🐋</span>
                </div>
                <h3 className="text-xl text-gray-800 leading-tight">Ocean Friends</h3>
              </div>

            </div>
          </div>

        </div>

        {/* Bottom Navigation */}
        <div className="absolute bottom-0 w-full h-[100px] bg-white rounded-b-[32px] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex justify-around items-center px-4 pb-4">
          <button className="w-[80px] h-[80px] bg-[#3B82F6] rounded-full flex justify-center items-center shadow-[0_6px_0_#2563eb] active:shadow-none active:translate-y-[6px] transition-all">
            <Home className="w-10 h-10 text-white" strokeWidth={3} />
          </button>
          
          <button className="w-[80px] h-[80px] bg-[#FACC15] rounded-full flex justify-center items-center shadow-[0_6px_0_#ca8a04] active:shadow-none active:translate-y-[6px] transition-all -mt-8 border-4 border-white">
            <Music className="w-10 h-10 text-white" strokeWidth={3} />
          </button>
          
          <button className="w-[80px] h-[80px] bg-[#EF4444] rounded-full flex justify-center items-center shadow-[0_6px_0_#dc2626] active:shadow-none active:translate-y-[6px] transition-all">
            <Heart className="w-10 h-10 text-white" strokeWidth={3} />
          </button>
        </div>

      </div>
    </div>
  );
}
