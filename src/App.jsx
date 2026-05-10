import React, { useState } from 'react';
import EstimateGrid from './components/EstimateGrid';

function App() {
  const [items, setItems] = useState([
    { id: 'BSR001', serial: 1, description: 'Earthwork in excavation', qty: 100, rate: 150, depth: 0 },
    { id: 'BSR002', serial: 2, description: 'Plain cement concrete', qty: 50, rate: 3500, depth: 0 },
    { id: 'BSR003', serial: 3, description: 'Reinforced cement concrete', qty: 25, rate: 5500, depth: 0 }
  ]);

  const handleDelete = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleUpdateQty = (id, newQty) => {
    setItems(items.map(item => 
      item.id === id ? { ...item, qty: parseFloat(newQty) || 0 } : item
    ));
  };

  const handleGenerateExcel = async () => {
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Estimate_Project.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error generating Excel:', error);
    }
  };

  const total = items.reduce((sum, item) => sum + (item.qty * item.rate), 0);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Engineering Estimate Workbench</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Project Estimate</h2>
            <button 
              onClick={handleGenerateExcel}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Generate Excel
            </button>
          </div>
          
          <EstimateGrid 
            items={items} 
            onDelete={handleDelete}
            onUpdateQty={handleUpdateQty}
          />
          
          <div className="mt-6 text-right">
            <div className="text-2xl font-bold text-gray-900">
              Total: ₹{total.toLocaleString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
