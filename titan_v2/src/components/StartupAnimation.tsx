import React, { useState, useEffect } from 'react';

interface StartupAnimationProps {
  onLoadingComplete: () => void;
}

const StartupAnimation: React.FC<StartupAnimationProps> = ({ onLoadingComplete }) => {
  const [progress, setProgress] = useState(0);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // 2秒内完成加载动画
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(() => {
            onLoadingComplete();
          }, 200);
          return 100;
        }
        return prev + Math.random() * 12.5; // 调整为2秒的增量
      });
    }, 50);

    // 立即显示内容
    setTimeout(() => {
      setShowContent(true);
    }, 100);

    return () => clearInterval(timer);
  }, [onLoadingComplete]);

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center z-50">
      <div className={`text-center transition-all duration-1000 ${showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>


        {/* 标题 */}
        <h1 className="text-4xl font-bold text-zinc-900 mb-4">
          Titan V
        </h1>
        
        {/* 副标题 */}
        <p className="text-black text-lg mb-12">
          All Data Insights with Agents
        </p>

        {/* 进度条 */}
        <div className="w-64 mx-auto mb-4">
          <div className="h-1 bg-[#c0e8e8] rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-cyan-500 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${Math.min(progress, 100)}%` }}
            ></div>
          </div>
        </div>

        {/* 加载文字 */}
        <div className="text-zinc-700 text-xs space-y-1">
          <div className="animate-pulse">
            {progress < 30 && "Initializing..."}
            {progress >= 30 && progress < 60 && "Loading models..."}
            {progress >= 60 && progress < 90 && "Preparing data..."}
            {progress >= 90 && "Ready"}
          </div>
        </div>


      </div>
    </div>
  );
};

export default StartupAnimation;