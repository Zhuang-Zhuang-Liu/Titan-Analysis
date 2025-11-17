import React, { useState, useEffect } from 'react';
import { getFileContent, FileContent } from '../utils/fileSystem';
import Papa from 'papaparse';

interface FileViewerProps {
  filePath?: string;
  onClose: () => void;
  isDarkMode: boolean;
}

const FileViewer: React.FC<FileViewerProps> = ({ filePath, onClose, isDarkMode }) => {
  const [fileContent, setFileContent] = useState<FileContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);

  useEffect(() => {
    if (!filePath) {
      setFileContent(null);
      setError(null);
      setCsvData([]);
      setCsvHeaders([]);
      return;
    }

    const loadFileContent = async () => {
      setLoading(true);
      setError(null);
      setCsvData([]);
      setCsvHeaders([]);
      try {
        const content = await getFileContent(filePath);
        setFileContent(content);
        
        // 如果是CSV文件，解析CSV数据
        if (content.extension === 'csv') {
          Papa.parse(content.content, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
              if (results.data && results.data.length > 0) {
                setCsvData(results.data as any[]);
                setCsvHeaders(results.meta.fields || []);
              }
            },
            error: (error: Error) => {
              setError(`CSV解析错误: ${error.message}`);
            }
          });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load file');
      } finally {
        setLoading(false);
      }
    };

    loadFileContent();
  }, [filePath]);

  const CSVTable: React.FC<{ data: any[]; headers: string[] }> = ({ data, headers }) => {
    if (!data || data.length === 0) {
      return (
      <div className="flex items-center justify-center h-full text-gray-500 dark:text-zinc-400">
        <p>没有数据可显示</p>
      </div>
    );
    }

    return (
      <div className="h-full overflow-auto">
        <div className="inline-block min-w-full">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-zinc-700">
              <thead className="bg-gray-50 dark:bg-zinc-800 sticky top-0">
                <tr>
                  {headers.map((header, index) => (
                    <th
                      key={index}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-700 dark:text-zinc-300 uppercase tracking-wider whitespace-nowrap"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-zinc-900 divide-y divide-gray-200 dark:divide-zinc-800">
                {data.map((row, rowIndex) => (
                  <tr
                    key={rowIndex}
                    className={rowIndex % 2 === 0 ? 'bg-white dark:bg-zinc-900' : 'bg-gray-50 dark:bg-zinc-800'}
                  >
                    {headers.map((header, colIndex) => (
                      <td
                        key={colIndex}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-zinc-300"
                      >
                        {row[header] !== null && row[header] !== undefined ? String(row[header]) : ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const getFileIcon = (extension: string) => {
    switch (extension) {
      case '.py':
        return (
          <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        );
      case '.txt':
        return (
          <svg className="w-5 h-5 text-gray-500 dark:text-zinc-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-5L9 2H4z" clipRule="evenodd" />
          </svg>
        );
      case '.csv':
      case '.xlsx':
      case '.xls':
        return (
          <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-5L9 2H4z" clipRule="evenodd" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5 text-gray-500 dark:text-zinc-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-5L9 2H4z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  if (!filePath) {
    return null;
  }

  const fileName = filePath.split('/').pop() || '';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-11/12 h-5/6 max-w-4xl flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-zinc-700 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            {getFileIcon(fileContent?.extension || '')}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{fileName}</h2>
              <p className="text-sm text-gray-600 dark:text-zinc-400">{filePath}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {fileContent && (
              <span className="text-xs text-gray-500 dark:text-zinc-500">
                {fileContent.size} bytes • {fileContent.lastModified.toLocaleString()}
              </span>
            )}
            <button
              onClick={onClose}
              className="p-2 text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-white transition-colors"
              title="Close file viewer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-500 dark:text-zinc-400">Loading file...</div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="text-red-500 dark:text-red-400 text-center">
                <svg className="w-12 h-12 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">Error Loading File</p>
                <p className="text-sm text-gray-700 dark:text-gray-300">{error}</p>
              </div>
            </div>
          )}

          {fileContent && !loading && !error && (
            <div className="h-full overflow-auto">
              {fileContent.extension === 'csv' && csvData.length > 0 ? (
                <CSVTable data={csvData} headers={csvHeaders} />
              ) : (
                <pre className="p-4 text-sm text-gray-900 dark:text-zinc-200 font-mono whitespace-pre-wrap">
                  {fileContent.content}
                </pre>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileViewer;