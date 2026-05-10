import React from 'react';
import { Trash2, ChevronRight, ChevronDown, MoveHorizontal } from 'lucide-react';

const EstimateGrid = ({ items, onDelete, onUpdateQty }) => {
  return (
    <div className="w-full overflow-hidden border border-slate-800 rounded-2xl bg-slate-900/40">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-800/50">
            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-20">Sr. No</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Item Description</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-24">Qty</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-32 text-right">Rate (₹)</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-40 text-right">Amount (₹)</th>
            <th className="px-6 py-4 text-xs font-bold text-slate-400 uppercase tracking-wider w-20 text-center">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {items.map((item) => (
            <tr key={item.id} className="group hover:bg-slate-800/30 transition-colors">
              <td className="px-6 py-4 text-sm font-medium text-slate-500">{item.serial}</td>
              <td className="px-6 py-4">
                <div className="flex items-center gap-2" style={{ paddingLeft: `${item.depth * 24}px` }}>
                  {item.depth === 0 ? (
                    item.expanded ? <ChevronDown className="w-4 h-4 text-blue-400" /> : <ChevronRight className="w-4 h-4 text-slate-500" />
                  ) : (
                    <MoveHorizontal className="w-3 h-3 text-slate-700" />
                  )}
                  <span className={`text-sm ${item.depth === 0 ? 'font-semibold text-slate-200' : 'text-slate-400'}`}>
                    {item.description}
                  </span>
                </div>
              </td>
              <td className="px-6 py-4">
                <input 
                  type="number" 
                  value={item.qty} 
                  onChange={(e) => onUpdateQty(item.id, e.target.value)}
                  className="w-full bg-slate-800/50 border border-slate-700 rounded-lg px-2 py-1 text-sm text-slate-200 focus:outline-none focus:border-blue-500 transition-colors"
                />
              </td>
              <td className="px-6 py-4 text-sm text-slate-400 text-right font-mono">
                {item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-6 py-4 text-sm font-bold text-slate-200 text-right font-mono">
                {(item.qty * item.rate).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </td>
              <td className="px-6 py-4 text-center">
                <button 
                  onClick={() => onDelete(item.id)}
                  className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  title="Delete Item & Children"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      
      {items.length === 0 && (
        <div className="py-20 flex flex-col items-center justify-center text-slate-600">
          <Trash2 className="w-12 h-12 mb-4 opacity-20" />
          <p className="text-sm font-medium">No items in this estimate. Start by adding from library.</p>
        </div>
      )}
    </div>
  );
};

export default EstimateGrid;
