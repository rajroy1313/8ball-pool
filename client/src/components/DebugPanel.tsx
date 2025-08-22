import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface DebugLog {
  timestamp: number;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
  message: string;
  data?: any;
}

export default function DebugPanel() {
  const [isVisible, setIsVisible] = useState(false);
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    // Override console methods to capture logs
    const originalLog = console.log;
    const originalWarn = console.warn;
    const originalError = console.error;

    console.log = (...args) => {
      originalLog(...args);
      if (args[0]?.startsWith?.('[DEBUG]')) {
        addLog('DEBUG', args.join(' '));
      } else {
        addLog('INFO', args.join(' '));
      }
    };

    console.warn = (...args) => {
      originalWarn(...args);
      addLog('WARN', args.join(' '));
    };

    console.error = (...args) => {
      originalError(...args);
      addLog('ERROR', args.join(' '));
    };

    return () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    };
  }, []);

  const addLog = (level: DebugLog['level'], message: string, data?: any) => {
    const newLog: DebugLog = {
      timestamp: Date.now(),
      level,
      message,
      data
    };

    setLogs(prev => {
      const newLogs = [...prev, newLog];
      // Keep only last 100 logs
      return newLogs.slice(-100);
    });
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString() + '.' + date.getMilliseconds().toString().padStart(3, '0');
  };

  const getLevelColor = (level: DebugLog['level']) => {
    switch (level) {
      case 'DEBUG': return 'text-blue-400';
      case 'INFO': return 'text-green-400';
      case 'WARN': return 'text-yellow-400';
      case 'ERROR': return 'text-red-400';
      default: return 'text-white';
    }
  };

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsVisible(true)}
          className="bg-discord-primary hover:bg-blue-600 text-white"
          data-testid="debug-toggle"
        >
          <i className="fas fa-bug mr-2"></i>
          Debug
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-96 h-64">
      <Card className="bg-black bg-opacity-95 border-discord-primary p-2 h-full flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <i className="fas fa-bug text-discord-primary"></i>
            <span className="text-white font-medium text-sm">Debug Console</span>
            <span className="text-discord-gray text-xs">({logs.length})</span>
          </div>
          <div className="flex items-center space-x-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setAutoScroll(!autoScroll)}
              className="text-xs h-6 px-2"
              data-testid="debug-autoscroll"
            >
              <i className={`fas fa-arrow-down ${autoScroll ? 'text-green-400' : 'text-gray-400'}`}></i>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={clearLogs}
              className="text-xs h-6 px-2"
              data-testid="debug-clear"
            >
              <i className="fas fa-trash text-red-400"></i>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsVisible(false)}
              className="text-xs h-6 px-2"
              data-testid="debug-close"
            >
              <i className="fas fa-times text-white"></i>
            </Button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto font-mono text-xs bg-black bg-opacity-50 rounded p-2">
          {logs.map((log, index) => (
            <div key={index} className="mb-1 flex">
              <span className="text-discord-gray mr-2 flex-shrink-0">
                {formatTime(log.timestamp)}
              </span>
              <span className={`mr-2 flex-shrink-0 ${getLevelColor(log.level)}`}>
                {log.level}
              </span>
              <span className="text-white break-all">
                {log.message}
              </span>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-discord-gray text-center py-4">
              No debug logs yet...
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}