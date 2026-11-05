import React, { useState, useEffect } from 'react';
import { 
  BookOpen, CheckCircle, Circle, Flame, Timer, Trash2, 
  Download, Upload, Calendar, Tag, AlertCircle, RotateCcw, Check 
} from 'lucide-react';

export default function StudyApp() {
  const [categories, setCategories] = useState(() => {
    const saved = localStorage.getItem('ib_study_categories');
    return saved ? JSON.parse(saved) : [
      { id: 'cat-1', name: 'End of Term Examinations' },
      { id: 'cat-2', name: 'SA (Summative Assessments)' }
    ];
  });

  const [subjects, setSubjects] = useState(() => {
    const saved = localStorage.getItem('ib_study_subjects');
    return saved ? JSON.parse(saved) : [];
  });

  const [streakData, setStreakData] = useState(() => {
    const saved = localStorage.getItem('ib_study_streak');
    return saved ? JSON.parse(saved) : { currentStreak: 0, lastActiveDate: null, history: {} };
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedSubjectId, setSelectedSubjectId] = useState(null);

  // Form states
  const [newCatName, setNewCatName] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [newSubCatId, setNewSubCatId] = useState('');
  const [newSubExamDate, setNewSubExamDate] = useState('');
  
  // Syllabus Adder Form State (Section chosen first)
  const [targetCatIdForImport, setTargetCatIdForImport] = useState('');
  const [targetSubIdForImport, setTargetSubIdForImport] = useState('');
  const [rawSyllabusText, setRawSyllabusText] = useState('');

  // Editable Timer State
  const [timerMinutes, setTimerMinutes] = useState(25);
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [isEditingTimer, setIsEditingTimer] = useState(false);
  const [customMinutesInput, setCustomMinutesInput] = useState('25');

  useEffect(() => {
    localStorage.setItem('ib_study_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('ib_study_subjects', JSON.stringify(subjects));
  }, [subjects]);

  useEffect(() => {
    localStorage.setItem('ib_study_streak', JSON.stringify(streakData));
  }, [streakData]);

  useEffect(() => {
    let interval = null;
    if (isTimerRunning && timerSeconds > 0) {
      interval = setInterval(() => {
        setTimerSeconds(s => s - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setIsTimerRunning(false);
      alert('Focus session complete!');
      recordActivity();
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds]);

  const recordActivity = () => {
    const today = new Date().toISOString().split('T')[0];
    const lastActive = streakData.lastActiveDate;
    if (lastActive === today) return;

    let newStreak = streakData.currentStreak;
    if (!lastActive) {
      newStreak = 1;
    } else {
      const diffDays = Math.ceil(Math.abs(new Date(today) - new Date(lastActive)) / (1000 * 60 * 60 * 24));
      if (diffDays === 1) newStreak += 1;
      else if (diffDays > 1) newStreak = 1;
    }

    setStreakData({
      currentStreak: newStreak,
      lastActiveDate: today,
      history: { ...streakData.history, [today]: true }
    });
  };

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setCategories([...categories, { id: 'cat-' + Date.now(), name: newCatName.trim() }]);
    setNewCatName('');
  };

  const handleDeleteCategory = (catId) => {
    setCategories(categories.filter(c => c.id !== catId));
    setSubjects(subjects.map(s => s.categoryId === catId ? { ...s, categoryId: '' } : s));
  };

  const handleAddSubject = (e) => {
    e.preventDefault();
    if (!newSubName.trim() || !newSubCatId) return;
    setSubjects([...subjects, {
      id: 'sub-' + Date.now(),
      name: newSubName.trim(),
      categoryId: newSubCatId,
      examDate: newSubExamDate || '',
      topics: []
    }]);
    setNewSubName('');
    setNewSubExamDate('');
  };

  const handleDeleteSubject = (subId) => {
    setSubjects(subjects.filter(s => s.id !== subId));
    if (selectedSubjectId === subId) setSelectedSubjectId(null);
  };

  const handleImportSyllabus = (e) => {
    e.preventDefault();
    if (!targetSubIdForImport || !rawSyllabusText.trim()) return;

    const lines = rawSyllabusText.split('\n');
    const topicsMap = {};

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const match = trimmed.match(/^([A-Z]\.?\d+(?:\.\d+)*)\s+(.*)$/i);
      
      if (match) {
        const code = match[1];
        const content = match[2];
        const parentCode = code.split('.').slice(0, 2).join('.');

        if (!topicsMap[parentCode]) {
          topicsMap[parentCode] = { id: 'top-' + Math.random(), title: `Topic ${parentCode}`, subtopics: [] };
        }
        topicsMap[parentCode].subtopics.push({
          id: 'subtop-' + Math.random(),
          code,
          text: content,
          ahl: /AHL/i.test(content),
          completed: false
        });
      }
    });

    setSubjects(subjects.map(sub => {
      if (sub.id === targetSubIdForImport) {
        return { ...sub, topics: [...sub.topics, ...Object.values(topicsMap)] };
      }
      return sub;
    }));

    setRawSyllabusText('');
    alert('Syllabus checklists generated successfully.');
  };

  const toggleSubtopic = (subId, topicId, subtopicId) => {
    recordActivity();
    setSubjects(subjects.map(sub => {
      if (sub.id !== subId) return sub;
      return {
        ...sub,
        topics: sub.topics.map(top => {
          if (top.id !== topicId) return top;
          return {
            ...top,
            subtopics: top.subtopics.map(st => st.id === subtopicId ? { ...st, completed: !st.completed } : st)
          };
        })
      };
    }));
  };

  const calculateProgress = (subject) => {
    let total = 0, completed = 0;
    subject.topics.forEach(t => t.subtopics.forEach(st => { total++; if (st.completed) completed++; }));
    return total === 0 ? 0 : Math.round((completed / total) * 100);
  };

  const getCountdown = (dateString) => {
    if (!dateString) return null;
    const diff = new Date(dateString) - new Date();
    if (diff <= 0) return 'Exam Reached';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    return `${days} days remaining`;
  };

  const exportBackup = () => {
    const data = { categories, subjects, streakData };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ib-study-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const importBackup = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (parsed.categories) setCategories(parsed.categories);
        if (parsed.subjects) setSubjects(parsed.subjects);
        if (parsed.streakData) setStreakData(parsed.streakData);
        alert('Backup restored successfully!');
      } catch (err) {
        alert('Invalid backup file format.');
      }
    };
    reader.readAsText(file);
  };

  const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
  const filteredSubjectsForImport = targetCatIdForImport 
    ? subjects.filter(s => s.categoryId === targetCatIdForImport) 
    : subjects;

  return (
    <div className="min-h-screen bg-[#FAFAFA] text-[#111111] flex flex-col font-serif selection:bg-[#111111] selection:text-[#FAFAFA]">
      {/* Header */}
      <header className="border-b border-[#E5E5E5] px-8 py-5 flex flex-wrap items-center justify-between gap-4 bg-white">
        <div className="flex items-center space-x-3">
          <div className="bg-[#111111] text-white p-2 rounded-lg">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight font-sans">IB Study Command Center</h1>
            <p className="text-xs text-[#666666] font-sans">Monochrome Academic Workspace</p>
          </div>
        </div>

        <div className="flex items-center space-x-6 font-sans">
          <div className="flex items-center space-x-2 border border-[#E5E5E5] px-3.5 py-1.5 rounded-full bg-[#FAFAFA]">
            <Flame className="w-4 h-4 text-[#111111]" />
            <span className="text-xs font-semibold">{streakData.currentStreak} Day Streak</span>
          </div>

          <div className="flex items-center space-x-3 border border-[#E5E5E5] px-3.5 py-1.5 rounded-lg bg-white">
            <Timer className="w-4 h-4 text-[#666666]" />
            {isEditingTimer ? (
              <div className="flex items-center space-x-1">
                <input 
                  type="number" 
                  value={customMinutesInput} 
                  onChange={(e) => setCustomMinutesInput(e.target.value)}
                  className="w-12 border border-[#111111] text-xs px-1 py-0.5 rounded text-center font-mono"
                />
                <button 
                  onClick={() => {
                    const mins = parseInt(customMinutesInput) || 25;
                    setTimerMinutes(mins);
                    setTimerSeconds(mins * 60);
                    setIsEditingTimer(false);
                  }}
                  className="bg-[#111111] text-white p-1 rounded hover:bg-black"
                >
                  <Check className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <span 
                onClick={() => setIsEditingTimer(true)} 
                className="font-mono font-semibold text-xs cursor-pointer hover:underline"
                title="Click to edit timer minutes"
              >
                {Math.floor(timerSeconds / 60).toString().padStart(2, '0')}:
                {(timerSeconds % 60).toString().padStart(2, '0')}
              </span>
            )}
            <button 
              onClick={() => setIsTimerRunning(!isTimerRunning)} 
              className="text-xs bg-[#111111] text-white px-2.5 py-1 rounded font-medium hover:bg-[#333333] transition"
            >
              {isTimerRunning ? 'Pause' : 'Start'}
            </button>
            <button 
              onClick={() => { setIsTimerRunning(false); setTimerSeconds(timerMinutes * 60); }} 
              className="text-[#666666] hover:text-[#111111]"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b border-[#E5E5E5] px-8 flex space-x-8 bg-white font-sans text-sm">
        <button 
          onClick={() => { setActiveTab('dashboard'); setSelectedSubjectId(null); }}
          className={`py-3.5 border-b-2 font-medium transition ${activeTab === 'dashboard' ? 'border-[#111111] text-[#111111]' : 'border-transparent text-[#666666] hover:text-[#111111]'}`}
        >
          Dashboard & Overview
        </button>
        <button 
          onClick={() => setActiveTab('import')}
          className={`py-3.5 border-b-2 font-medium transition ${activeTab === 'import' ? 'border-[#111111] text-[#111111]' : 'border-transparent text-[#666666] hover:text-[#111111]'}`}
        >
          Syllabus Adder
        </button>
        <button 
          onClick={() => setActiveTab('backup')}
          className={`py-3.5 border-b-2 font-medium transition ${activeTab === 'backup' ? 'border-[#111111] text-[#111111]' : 'border-transparent text-[#666666] hover:text-[#111111]'}`}
        >
          Data Backup
        </button>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-8 max-w-7xl w-full mx-auto font-sans">
        {activeTab === 'dashboard' && !selectedSubjectId && (
          <div className="space-y-10">
            {/* Control Panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-6 rounded-xl border border-[#E5E5E5]">
              <form onSubmit={handleAddCategory} className="space-y-3">
                <h3 className="text-xs font-semibold text-[#666666] uppercase tracking-wider">1. Add Exam Section</h3>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="e.g. End of Term, Summative..." 
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="flex-1 border border-[#E5E5E5] rounded-lg px-3.5 py-2 text-sm focus:outline-none focus:border-[#111111]"
                  />
                  <button type="submit" className="bg-[#111111] hover:bg-[#333333] text-white px-4 py-2 rounded-lg text-sm font-medium transition">
                    Add
                  </button>
                </div>
              </form>

              <form onSubmit={handleAddSubject} className="space-y-3">
                <h3 className="text-xs font-semibold text-[#666666] uppercase tracking-wider">2. Add Subject & Exam Date</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input 
                    type="text" 
                    placeholder="Subject Name" 
                    value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value)}
                    className="border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#111111]"
                  />
                  <select 
                    value={newSubCatId}
                    onChange={(e) => setNewSubCatId(e.target.value)}
                    className="border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#111111] bg-white text-[#111111]"
                  >
                    <option value="">Select Section</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  <input 
                    type="date" 
                    value={newSubExamDate}
                    onChange={(e) => setNewSubExamDate(e.target.value)}
                    className="border border-[#E5E5E5] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#111111] text-[#666666]"
                  />
                </div>
                <button type="submit" className="w-full bg-[#222222] hover:bg-[#111111] text-white py-2 rounded-lg text-sm font-medium transition">
                  Create Subject
                </button>
              </form>
            </div>

            {/* Categories & Subjects List */}
            {categories.map(cat => {
              const catSubjects = subjects.filter(s => s.categoryId === cat.id);
              return (
                <div key={cat.id} className="space-y-4">
                  <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-2">
                    <h2 className="text-base font-bold text-[#111111] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#111111]"></span>
                      {cat.name}
                    </h2>
                    <button 
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="text-[#666666] hover:text-[#111111] text-xs transition"
                    >
                      Delete Section
                    </button>
                  </div>

                  {catSubjects.length === 0 ? (
                    <p className="text-xs text-[#888888] italic py-2">No subjects added under this section yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {catSubjects.map(sub => {
                        const progress = calculateProgress(sub);
                        const countdown = getCountdown(sub.examDate);
                        return (
                          <div 
                            key={sub.id} 
                            onClick={() => setSelectedSubjectId(sub.id)}
                            className="bg-white border border-[#E5E5E5] rounded-xl p-5 hover:border-[#111111] transition cursor-pointer flex flex-col justify-between shadow-sm group"
                          >
                            <div>
                              <div className="flex justify-between items-start mb-3">
                                <h3 className="font-bold text-base group-hover:underline">{sub.name}</h3>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleDeleteSubject(sub.id); }}
                                  className="text-[#888888] hover:text-[#111111] transition"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              {sub.examDate && (
                                <div className="flex items-center gap-1.5 text-xs text-[#666666] bg-[#FAFAFA] border border-[#E5E5E5] px-2.5 py-1 rounded-md w-fit mb-4">
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span>{countdown}</span>
                                </div>
                              )}
                            </div>

                            <div className="space-y-2 mt-4">
                              <div className="flex justify-between text-xs text-[#666666]">
                                <span>Mastery Progress</span>
                                <span className="font-semibold text-[#111111]">{progress}%</span>
                              </div>
                              <div className="w-full bg-[#E5E5E5] h-1.5 rounded-full overflow-hidden">
                                <div className="bg-[#111111] h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {selectedSubject && (
          <div className="space-y-6">
            <div className="flex items-center justify-between bg-white p-6 rounded-xl border border-[#E5E5E5]">
              <div>
                <button 
                  onClick={() => setSelectedSubjectId(null)}
                  className="text-xs text-[#666666] hover:text-[#111111] mb-2 inline-block"
                >
                  &larr; Back to Dashboard
                </button>
                <h2 className="text-xl font-bold">{selectedSubject.name}</h2>
                {selectedSubject.examDate && (
                  <p className="text-xs text-[#666666] mt-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Exam Date: {selectedSubject.examDate} ({getCountdown(selectedSubject.examDate)})
                  </p>
                )}
              </div>
              <button 
                onClick={() => setActiveTab('import')}
                className="bg-[#111111] hover:bg-[#333333] text-white px-4 py-2 rounded-lg text-sm font-medium transition"
              >
                + Add Syllabus Topics
              </button>
            </div>

            {selectedSubject.topics.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-xl border border-dashed border-[#E5E5E5]">
                <AlertCircle className="w-8 h-8 text-[#888888] mx-auto mb-3" />
                <p className="text-xs text-[#666666]">No checklist topics found for this subject yet.</p>
                <button 
                  onClick={() => setActiveTab('import')}
                  className="mt-3 text-xs text-[#111111] font-semibold underline"
                >
                  Go to Syllabus Adder &rarr;
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {selectedSubject.topics.map(topic => (
                  <div key={topic.id} className="bg-white border border-[#E5E5E5] rounded-xl p-6 space-y-4 shadow-sm">
                    <h3 className="font-bold text-sm border-b border-[#E5E5E5] pb-2 text-[#111111]">{topic.title}</h3>
                    <div className="space-y-2">
                      {topic.subtopics.map(st => (
                        <div 
                          key={st.id} 
                          onClick={() => toggleSubtopic(selectedSubject.id, topic.id, st.id)}
                          className={`flex items-start gap-3 p-3 rounded-lg border transition cursor-pointer ${st.completed ? 'bg-[#FAFAFA] border-[#E5E5E5] text-[#888888] line-through' : 'bg-white border-[#E5E5E5] hover:border-[#111111] text-[#111111]'}`}
                        >
                          <div className="mt-0.5">
                            {st.completed ? <CheckCircle className="w-4 h-4 text-[#111111]" /> : <Circle className="w-4 h-4 text-[#CCCCCC]" />}
                          </div>
                          <div className="flex-1 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div>
                              <span className="font-mono font-semibold text-[#111111] mr-2">{st.code}</span>
                              <span>{st.text.replace(/^[A-Z]\.?\d+(?:\.\d+)*\s*/, '')}</span>
                            </div>
                            {st.ahl && (
                              <span className="border border-[#111111] text-[#111111] text-[10px] px-1.5 py-0.5 rounded font-mono">
                                AHL
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'import' && (
          <div className="max-w-2xl mx-auto bg-white border border-[#E5E5E5] rounded-xl p-8 space-y-6 shadow-sm">
            <div>
              <h2 className="text-lg font-bold mb-1">Syllabus Adder</h2>
              <p className="text-xs text-[#666666]">
                First select your Exam Section, then choose the Target Subject, and paste your syllabus raw text.
              </p>
            </div>

            <form onSubmit={handleImportSyllabus} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[#666666] mb-1.5">1. Select Section First</label>
                  <select 
                    value={targetCatIdForImport}
                    onChange={(e) => {
                      setTargetCatIdForImport(e.target.value);
                      setTargetSubIdForImport('');
                    }}
                    className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#111111] bg-white text-[#111111]"
                  >
                    <option value="">-- Choose Section --</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#666666] mb-1.5">2. Select Subject</label>
                  <select 
                    value={targetSubIdForImport}
                    onChange={(e) => setTargetSubIdForImport(e.target.value)}
                    className="w-full border border-[#E5E5E5] rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-[#111111] bg-white text-[#111111]"
                    required
                  >
                    <option value="">-- Choose Subject --</option>
                    {filteredSubjectsForImport.map(sub => (
                      <option key={sub.id} value={sub.id}>{sub.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#666666] mb-1.5">3. Paste Syllabus Raw Text</label>
                <textarea 
                  rows="8"
                  placeholder="A1.1.1 Water as the medium for life&#10;A1.1.2 Hydrogen bonds as a consequence..."
                  value={rawSyllabusText}
                  onChange={(e) => setRawSyllabusText(e.target.value)}
                  className="w-full border border-[#E5E5E5] rounded-lg p-3 text-xs font-mono focus:outline-none focus:border-[#111111]"
                  required
                ></textarea>
              </div>

              <button type="submit" className="w-full bg-[#111111] hover:bg-[#333333] text-white py-2.5 rounded-lg text-xs font-medium transition">
                Generate Checklists
              </button>
            </form>
          </div>
        )}

        {activeTab === 'backup' && (
          <div className="max-w-md mx-auto bg-white border border-[#E5E5E5] rounded-xl p-8 space-y-6 text-center shadow-sm">
            <div className="border border-[#E5E5E5] text-[#111111] w-10 h-10 rounded-lg flex items-center justify-center mx-auto">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold mb-1">Data Backup & Recovery</h2>
              <p className="text-xs text-[#666666]">
                Download your study progress as a JSON file or restore an existing backup.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
              <button 
                onClick={exportBackup}
                className="flex items-center justify-center gap-2 bg-[#111111] hover:bg-[#333333] text-white px-4 py-2.5 rounded-lg text-xs font-medium transition"
              >
                <Download className="w-3.5 h-3.5" /> Download (.json)
              </button>
              
              <label className="flex items-center justify-center gap-2 border border-[#E5E5E5] hover:border-[#111111] px-4 py-2.5 rounded-lg text-xs font-medium transition cursor-pointer bg-white">
                <Upload className="w-3.5 h-3.5" /> Restore Backup
                <input type="file" accept=".json" onChange={importBackup} className="hidden" />
              </label>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
