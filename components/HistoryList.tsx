import React from 'react';
import { Clock } from 'lucide-react';

interface HistoryListProps {
  history: string[];
  onSelect: (image: string) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({ history, onSelect }) => {
  if (history.length === 0) return null;

  return (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
        <Clock size={18} className="text-indigo-600" />
        <h3 className="text-md font-semibold text-slate-800">Recent History</h3>
        <span className="ml-auto text-xs text-slate-400 font-medium">{history.length} photos</span>
      </div>
      
      <div className="grid grid-cols-4 gap-3">
        {history.map((img, index) => (
          <button
            key={index}
            onClick={() => onSelect(img)}
            className="group relative aspect-[3/4] w-full rounded-lg overflow-hidden border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 hover:shadow-md transition-all bg-slate-100"
            title={`View generated photo ${history.length - index}`}
          >
            <img 
              src={img} 
              alt={`History ${index + 1}`} 
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" 
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          </button>
        ))}
      </div>
    </div>
  );
};