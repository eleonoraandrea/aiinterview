import React, { useState } from 'react';
import { AnalysisResult } from '../types';
import { Check, Plus, X } from 'lucide-react';

interface EditorProps {
  initialData: AnalysisResult;
  onSave: (data: AnalysisResult) => void;
  onCancel: () => void;
}

export const Editor: React.FC<EditorProps> = ({ initialData, onSave, onCancel }) => {
  const [data, setData] = useState<AnalysisResult>(initialData);
  const [newHardSkill, setNewHardSkill] = useState('');
  const [newSoftSkill, setNewSoftSkill] = useState('');
  const [newTag, setNewTag] = useState('');

  // Generic array helpers
  const removeItem = (key: keyof AnalysisResult, index: number) => {
    setData(prev => ({
      ...prev,
      [key]: (prev[key] as string[]).filter((_, i) => i !== index)
    }));
  };

  const addItem = (key: 'hardSkills' | 'softSkills' | 'tags', value: string, setter: (v: string) => void) => {
    if (!value.trim()) return;
    setData(prev => ({
      ...prev,
      [key]: [...prev[key], value.trim()]
    }));
    setter('');
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white rounded-2xl shadow-lg overflow-hidden border border-slate-200">
      <div className="bg-indigo-600 px-8 py-6">
        <h2 className="text-2xl font-bold text-white">Review & Edit Profile</h2>
        <p className="text-indigo-100 text-sm mt-1">AI has extracted this information. Make it perfect.</p>
      </div>

      <div className="p-8 space-y-8">
        
        {/* Personal Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Candidate Name</label>
            <input
              type="text"
              value={data.candidateName}
              onChange={(e) => setData({ ...data, candidateName: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
            />
          </div>
        </div>

        {/* Summary */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Professional Summary</label>
          <textarea
            rows={3}
            value={data.professionalSummary}
            onChange={(e) => setData({ ...data, professionalSummary: e.target.value })}
            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
          />
        </div>

        {/* Transcript */}
        <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Interview Transcript (Editable)</label>
            <textarea
                rows={6}
                value={data.transcript}
                onChange={(e) => setData({ ...data, transcript: e.target.value })}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all font-mono text-sm text-slate-600"
            />
        </div>

        {/* Skills Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Hard Skills */}
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
            <label className="block text-sm font-bold text-slate-800 mb-3">Hard Skills</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {data.hardSkills.map((skill, idx) => (
                <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {skill}
                  <button onClick={() => removeItem('hardSkills', idx)} className="ml-2 hover:text-blue-900"><X size={14} /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newHardSkill}
                onChange={(e) => setNewHardSkill(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addItem('hardSkills', newHardSkill, setNewHardSkill)}
                placeholder="Add skill..."
                className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-blue-500"
              />
              <button onClick={() => addItem('hardSkills', newHardSkill, setNewHardSkill)} className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700"><Plus size={18} /></button>
            </div>
          </div>

          {/* Soft Skills */}
          <div className="bg-slate-50 p-5 rounded-xl border border-slate-100">
            <label className="block text-sm font-bold text-slate-800 mb-3">Soft Skills</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {data.softSkills.map((skill, idx) => (
                <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-emerald-100 text-emerald-800">
                  {skill}
                  <button onClick={() => removeItem('softSkills', idx)} className="ml-2 hover:text-emerald-900"><X size={14} /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newSoftSkill}
                onChange={(e) => setNewSoftSkill(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addItem('softSkills', newSoftSkill, setNewSoftSkill)}
                placeholder="Add skill..."
                className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg outline-none focus:border-emerald-500"
              />
              <button onClick={() => addItem('softSkills', newSoftSkill, setNewSoftSkill)} className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700"><Plus size={18} /></button>
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="border-t border-slate-200 pt-6">
            <label className="block text-sm font-medium text-slate-700 mb-2">System Tags</label>
            <div className="flex flex-wrap items-center gap-2">
                {data.tags.map((tag, idx) => (
                    <span key={idx} className="inline-flex items-center px-3 py-1 rounded-md text-xs font-bold uppercase tracking-wider bg-slate-200 text-slate-600">
                    #{tag}
                    <button onClick={() => removeItem('tags', idx)} className="ml-2 hover:text-slate-900"><X size={12} /></button>
                    </span>
                ))}
                <div className="flex items-center gap-2">
                    <input 
                        type="text" 
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && addItem('tags', newTag, setNewTag)}
                        placeholder="New tag..."
                        className="px-2 py-1 text-xs border-b border-slate-300 focus:border-indigo-500 outline-none bg-transparent w-24"
                    />
                    <button onClick={() => addItem('tags', newTag, setNewTag)} className="text-slate-400 hover:text-indigo-600"><Plus size={16} /></button>
                </div>
            </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-slate-50 px-8 py-6 border-t border-slate-200 flex justify-end gap-4">
        <button 
          onClick={onCancel}
          className="px-6 py-2 text-slate-600 font-medium hover:text-slate-900 transition-colors"
        >
          Discard Changes
        </button>
        <button 
          onClick={() => onSave(data)}
          className="flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-md hover:bg-indigo-700 hover:shadow-lg transition-all transform active:scale-95"
        >
          <Check size={20} />
          Confirm & Save Profile
        </button>
      </div>
    </div>
  );
};
