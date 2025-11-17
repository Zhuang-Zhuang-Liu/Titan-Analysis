import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidViewerProps {
  mmdContent: string;
  className?: string;
  onError?: (error: string) => void;
}

const MermaidViewer: React.FC<MermaidViewerProps> = ({
  mmdContent,
  className = '',
  onError
}) => {
  const [svg, setSvg] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'default',
      themeVariables: {
        primaryColor: '#3b82f6',
        primaryTextColor: '#ffffff',
        primaryBorderColor: '#2563eb',
        lineColor: '#6b7280',
        secondaryColor: '#f3f4f6',
        tertiaryColor: '#ffffff'
      },
      flowchart: {
        useMaxWidth: true,
        htmlLabels: true,
        curve: 'basis'
      },
      sequence: {
        diagramMarginX: 50,
        diagramMarginY: 10,
        actorMargin: 50,
        width: 150,
        height: 65,
        boxMargin: 10,
        boxTextMargin: 5,
        noteMargin: 10,
        messageMargin: 35
      }
    });
  }, []);

  useEffect(() => {
    if (!mmdContent) return;

    const renderDiagram = async () => {
      setIsLoading(true);
      setError('');
      
      try {
        const { svg } = await mermaid.render(
          `mermaid-${Date.now()}`,
          mmdContent
        );
        setSvg(svg);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '渲染失败';
        setError(errorMessage);
        onError?.(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    renderDiagram();
  }, [mmdContent, onError]);

  const handleZoomIn = () => {
    if (containerRef.current) {
      const svgElement = containerRef.current.querySelector('svg');
      if (svgElement) {
        const currentScale = svgElement.style.transform.match(/scale\(([^)]+)\)/);
        const scale = currentScale ? parseFloat(currentScale[1]) : 1;
        svgElement.style.transform = `scale(${scale * 1.2})`;
        svgElement.style.transformOrigin = 'center';
        svgElement.style.transition = 'transform 0.3s ease';
      }
    }
  };

  const handleZoomOut = () => {
    if (containerRef.current) {
      const svgElement = containerRef.current.querySelector('svg');
      if (svgElement) {
        const currentScale = svgElement.style.transform.match(/scale\(([^)]+)\)/);
        const scale = currentScale ? parseFloat(currentScale[1]) : 1;
        svgElement.style.transform = `scale(${Math.max(scale * 0.8, 0.5)})`;
        svgElement.style.transformOrigin = 'center';
        svgElement.style.transition = 'transform 0.3s ease';
      }
    }
  };

  const handleReset = () => {
    if (containerRef.current) {
      const svgElement = containerRef.current.querySelector('svg');
      if (svgElement) {
        svgElement.style.transform = 'scale(1)';
      }
    }
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center h-64 ${className}`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">加载图表中...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-lg ${className}`}>
        <div className="flex items-center">
          <svg className="w-5 h-5 text-red-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span className="text-red-700 font-medium">图表渲染错误</span>
        </div>
        <p className="mt-2 text-sm text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className={`relative w-full h-full bg-white ${className}`}>
      <div className="absolute top-2 right-2 z-10 flex space-x-2">
        <button
          onClick={handleZoomIn}
          className="p-2 bg-white rounded-md shadow-md hover:bg-gray-50 transition-colors"
          title="放大"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
          </svg>
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 bg-white rounded-md shadow-md hover:bg-gray-50 transition-colors"
          title="缩小"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
          </svg>
        </button>
        <button
          onClick={handleReset}
          className="p-2 bg-white rounded-md shadow-md hover:bg-gray-50 transition-colors"
          title="重置"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
      
      <div className="w-full h-full overflow-auto bg-white">
        <div 
          ref={containerRef}
          className="mermaid-container min-w-full min-h-full p-4 bg-white rounded-lg border border-gray-200"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    </div>
  );
};

export default MermaidViewer;