import React, { useState } from 'react';
import { 
  FileSpreadsheet, 
  Plus, 
  Trash2, 
  Download, 
  Search, 
  ChevronRight, 
  ChevronDown, 
  Layers, 
  Printer,
  History,
  FileSearch,
  Settings,
  FolderPlus
} from 'lucide-react';
import EstimateGrid from './components/EstimateGrid';
import sampleData from './seed/sample_estimates.json';

function App() {
  const [selectedProject, setSelectedProject] = useState("COURT_BLDG_NTD");
  const [sections, setSections] = useState(sampleData[selectedProject] || {});

  const handleProjectChange = (projectName) => {
    setSelectedProject(projectName);
    setSections(sampleData[projectName] || {});
  };

  const [activeTab, setActiveTab] = useState('workbench');
  const [isExporting, setIsExporting] = useState(false);

  const handleDelete = (sectionName, id) => {
    setSections({
      ...sections,
      [sectionName]: sections[sectionName].filter(item => !item.id.startsWith(id))
    });
  };

  const handleUpdateQty = (sectionName, id, newQty) => {
    setSections({
      ...sections,
      [sectionName]: sections[sectionName].map(item => 
        item.id === id ? { ...item, qty: parseFloat(newQty) || 0 } : item
      )
    });
  };

  const handleAddSection = () => {
    const name = prompt("Enter Component Name (e.g. Sanitary, Road, etc.)");
    if (name && !sections[name]) {
      setSections({ ...sections, [name]: [] });
    }
  };

  const handleGenerateExcel = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sections) // Send the sections object directly
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Estimate_Report_${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error generating Excel:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const getSectionTotal = (items) => {
    return items.reduce((sum, item) => item.depth === 0 ? sum + (item.qty * item.rate) : sum, 0);
  };

  const grandTotal = Object.values(sections).reduce((sum, items) => sum + getSectionTotal(items), 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#0f172a]">
      {/* Header */}
      <header className="h-16 glass-card rounded-none border-t-0 border-x-0 px-8 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 rounded-xl px-3 py-1.5">
            <Layers className="w-4 h-4 text-blue-400" />
            <select 
              value={selectedProject} 
              onChange={(e) => handleProjectChange(e.target.value)}
              className="bg-transparent text-sm font-semibold text-slate-200 focus:outline-none cursor-pointer"
            >
              {Object.keys(sampleData).map(name => (
                <option key={name} value={name} className="bg-slate-900">{name.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
          <button className="p-2 hover:bg-slate-800 rounded-full transition-colors">
            <FileSpreadsheet className="w-6 h-6 text-white" />
          </button>
          <div>
            <h1 className="text-xl font-bold gradient-text">Engineering Estimate Workbench</h1>
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">Multi-Component Suite v2.1</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={handleGenerateExcel}
            disabled={isExporting}
            className={`flex items-center gap-2 px-6 py-2 rounded-xl btn-primary text-white font-medium shadow-lg shadow-blue-500/20 ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isExporting ? 'Processing...' : <><Download className="w-4 h-4" /> Export All Sheets</>}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 border-r border-slate-800 flex flex-col bg-slate-900/50">
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Components</h3>
                <button onClick={handleAddSection} className="p-1 hover:bg-slate-800 rounded-md text-blue-400">
                  <FolderPlus className="w-4 h-4" />
                </button>
              </div>
              <nav className="space-y-1">
                {Object.keys(sections).map((name, idx) => (
                  <button key={idx} className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-800 transition-colors group">
                    <div className="flex items-center gap-3">
                      <Layers className="w-4 h-4 text-slate-400 group-hover:text-blue-400" />
                      <span className="text-sm font-medium text-slate-300 group-hover:text-white">{name}</span>
                    </div>
                    <span className="text-[10px] bg-slate-800 text-slate-500 px-2 py-1 rounded-md">₹{getSectionTotal(sections[name]).toLocaleString()}</span>
                  </button>
                ))}
              </nav>
            </div>
          </div>
        </aside>

        {/* Workspace */}
        <section className="flex-1 flex flex-col bg-slate-950/50 overflow-auto">
          <div className="p-8 space-y-8">
            <div className="glass-card p-8">
              <div className="flex justify-between items-start mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Project Estimate Summary</h2>
                  <p className="text-sm text-slate-400">Infrastructure Project | Consolidated Overview</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-bold mb-1">Total Project Cost</p>
                  <p className="text-3xl font-bold gradient-text">₹ {grandTotal.toLocaleString('en-IN')}</p>
                </div>
              </div>

              <div className="space-y-12">
                {Object.entries(sections).map(([name, items]) => (
                  <div key={name} className="space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <h3 className="text-lg font-bold text-blue-400">{name}</h3>
                      <p className="text-sm font-semibold text-slate-400">Section Total: ₹{getSectionTotal(items).toLocaleString()}</p>
                    </div>
                    <EstimateGrid 
                      items={items} 
                      onDelete={(id) => handleDelete(name, id)}
                      onUpdateQty={(id, qty) => handleUpdateQty(name, id, qty)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;
