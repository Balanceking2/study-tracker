import React, { useState, useEffect } from 'react';
import { 
  BookOpen, CheckCircle, Circle, Flame, Timer, Plus, Trash2, 
  Download, Upload, Calendar, Tag, AlertCircle, Play, Pause, RotateCcw, Award 
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

  const [newCatName, setNewCatName] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [newSubCatId, setNewSubCatId] = useState('');
  const [newSubExamDate, setNewSubExamDate] = useState('');
  const [rawSyllabusText, setRawSyllabusText] = useState('');
  const [targetSubIdForImport, setTargetSubIdForImport] = useState('');

  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [timerMode, setTimerMode] = useState('work');

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
      alert(timerMode === 'work' ? 'Focus session complete! Take a break.' : 'Break over! Back to studying.');
      if (timerMode === 'work') {
        recordActivity();
      }
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, timerSeconds, timerMode]);

  const recordActivity = () => {
    const today = new Date().toISOString().split('T')[0];
    const lastActive = streakData.lastActiveDate;
    
    if (lastActive === today) return;

    let newStreak = streakData.currentStreak;
    if (!lastActive) {
      newStreak = 1;
    } else {
      const lastDate = new Date(lastActive);
      const currentDate = new Date(today);
      const diffTime = Math.abs(currentDate - lastDate);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays > 1) {
        newStreak = 1;
      }
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
    const newCat = { id: 'cat-' + Date.now(), name: newCatName.trim() };
    setCategories([...categories, newCat]);
    setNewCatName('');
  };

  const handleDeleteCategory = (catId) => {
    setCategories(categories.filter(c => c.id !== catId));
    setSubjects(subjects.map(s => s.categoryId === catId ? { ...s, categoryId: '' } : s));
  };

  const handleAddSubject = (e) => {
    e.preventDefault();
    if (!newSubName.trim()) return;
    const newSubject = {
      id: 'sub-' + Date.now(),
      name: newSubName.trim(),
      categoryId: newSubCatId || (categories[0] ? categories[0].id : ''),
      examDate: newSubExamDate || '',
      topics: []
    };
    setSubjects([...subjects, newSubject]);
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
        const isAHL = /AHL/i.test(content);

        const parts = code.split('.');
        let parentCode = parts.slice(0, 2).join('.');

        if (!topicsMap[parentCode]) {
          topicsMap[parentCode] = {
            id: 'top-' + Math.random().toString(36).substring(2, 9),
            title: `Topic ${parentCode}`,
            subtopics: []
          };
        }

        topicsMap[parentCode].subtopics.push({
          id: 'subtop-' + Math.random().toString(36).substring(2, 9),
          code: code,
          text: content,
          ahl: isAHL,
          completed: false
        });
      } else {
        const defaultTopKey = 'General';
        if (!topicsMap[defaultTopKey]) {
          topicsMap[defaultTopKey] = {
            id: 'top-gen',
            title: 'General Topics',
            subtopics: []
          };
        }
        topicsMap[defaultTopKey].subtopics.push({
          id: 'subtop-' + Math.random().toString(36).substring(2, 9),
          code: '',
          text: trimmed,
          ahl: /AHL/i.test(trimmed),
          completed: false
        });
      }
    });

    const generatedTopics = Object.values(topicsMap);

    setSubjects(subjects.map(sub => {
      if (sub.id === targetSubIdForImport) {
        return {
          ...sub,
          topics: [...sub.topics, ...generatedTopics]
        };
      }
      return sub;
    }));

    setRawSyllabusText('');
    alert('Syllabus successfully parsed and imported!');
  };

  const toggleSubtopic = (subId, topicId, subtopicId) => {
    recordActivity();
    setSubjects(subjects.map(sub => {
      if (sub.id !== subId) return sub;
      const updatedTopics = sub.topics.map(top => {
        if (top.id !== topicId) return top;
        const updatedSubtopics = top.subtopics.map(st => {
          if (st.id === subtopicId) {
            return { ...st, completed: !st.completed };
          }
          return st;
        });
        return { ...top, subtopics: updatedSubtopics };
      });
      return { ...sub, topics: updatedTopics };
    }));
  };

  const calculateProgress = (subject) => {
    let total = 0;
    let completed = 0;
    subject.topics.forEach(t => {
      t.subtopics.forEach(st => {
        total++;
        if (st.completed) completed++;
      });
    });
    return total === 0 ? 0 : Math.round((completed / total) * 100);
  };

  const getCountdown = (dateString) => {
    if (!dateString) return null;
    const diff = new Date(dateString) - new Date();
    if (diff <= 0) return 'Exam Date Reached!';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    return `${days}d ${hours}h remaining`;
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-600 p-2 rounded-xl text-white">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">IB Study Command Center</h1>
            <p className="text-xs text-slate-400">Syllabus Checklists, Countdowns & Streaks</p>
          </div>
        </div>

        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2 bg-orange-500/10 border border-orange-500/30 px-3 py-1.5 rounded-full">
            <Flame className="w-5 h-5 text-orange-500 animate-pulse" />
            <span className="text-sm font-semibold text-orange-400">{streakData.currentStreak} Day Streak!</span>
          </div>

          <div className="flex items-center space-x-3 bg-slate-800/80 px-4 py-1.5 rounded-xl border border-slate-700">
            <Timer className="w-4 h-4 text-indigo-400" />
            <span className="font-mono font-bold text-sm">
              {Math.floor(timerSeconds / 60).toString().padStart(2, '0')}:
              {(timerSeconds % 60).toString().padStart(2, '0')}
            </span>
            <button 
              onClick={() => setIsTimerRunning(!isTimerRunning)} 
              className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-2.5 py-1 rounded-lg font-medium transition"
            >
              {isTimerRunning ? 'Pause' : 'Start'}
            </button>
            <button 
              onClick={() => { setIsTimerRunning(false); setTimerSeconds(timerMode === 'work' ? 25*60 : 5*60); }} 
              className="text-slate-400 hover:text-white"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      <nav className="bg-slate-900/50 border-b border-slate-800 px-6 flex space-x-6">
        <button 
          onClick={() => { setActiveTab('dashboard'); setSelectedSubjectId(null); }}
          className={`py-3 border-b-2 font-medium text-sm transition ${activeTab === 'dashboard' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          Dashboard & Exam Sections
        </button>
        <button 
          onClick={() => setActiveTab('import')}
          className={`py-3 border-b-2 font-medium text-sm transition ${activeTab === 'import' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          Syllabus Parser & Import
        </button>
        <button 
          onClick={() => setActiveTab('backup')}
          className={`py-3 border-b-2 font-medium text-sm transition ${activeTab === 'backup' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-400 hover:text-slate-200'}`}
        >
          Backup & Cloud Save (.json)
        </button>
      </nav>

      <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
        {activeTab === 'dashboard' && !selectedSubjectId && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-900/80 p-6 rounded-2xl border border-slate-800">
              <form onSubmit={handleAddCategory} className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <Tag className="w-4 h-4 text-indigo-400" /> Add Exam Section / Category
                </h3>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="e.g. End of Term Examination, SA..." 
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  />
                  <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl text-sm font-semibold transition">
                    Add Section
                  </button>
                </div>
              </form>

              <form onSubmit={handleAddSubject} className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-400" /> Add Subject & Exam Date
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input 
                    type="text" 
                    placeholder="Subject Name (e.g. IB Biology HL)" 
                    value={newSubName}
                    onChange={(e) => setNewSubName(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500"
                  />
                  <select 
                    value={newSubCatId}
                    onChange={(e) => setNewSubCatId(e.target.value)}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-slate-300"
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
                    className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-indigo-500 text-slate-300"
                  />
                </div>
                <button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 py-2 rounded-xl text-sm font-semibold transition">
                  Create Subject
                </button>
              </form>
            </div>

            {categories.map(cat => {
              const catSubjects = subjects.filter(s => s.categoryId === cat.id);
              return (
                <div key={cat.id} className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h2 className="text-lg font-bold text-indigo-400 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
                      {cat.name}
                    </h2>
                    <button 
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="text-slate-500 hover:text-rose-400 text-xs transition"
                    >
                      Delete Section
                    </button>
                  </div>

                  {catSubjects.length === 0 ? (
                    <p className="text-sm text-slate-500 italic py-2">No subjects added under this section yet.</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {catSubjects.map(sub => {
                        const progress = calculateProgress(sub);
                        const countdown = getCountdown(sub.examDate);
                        return (
                          <div 
                            key={sub.id} 
                            onClick={() => setSelectedSubjectId(sub.id)}
                            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-indigo-500/50 transition cursor-pointer flex flex-col justify-between group shadow-lg"
                          >
                            <div>
                              <div className="flex justify-between items-start mb-3">
                                <h3 className="font-bold text-lg group-hover:text-indigo-400 transition">{sub.name}</h3>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleDeleteSubject(sub.id); }}
                                  className="text-slate-600 hover:text-rose-400 transition"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>

                              {sub.examDate && (
                                <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-lg w-fit mb-4">
                                  <Calendar className="w-3.5 h-3.5" />
                                  <span>{countdown}</span>
                                </div>
                              )}
                            </div>

                            <div className="space-y-2 mt-4">
                              <div className="flex justify-between text-xs text-slate-400 font-medium">
                                <span>Mastery Progress</span>
                                <span className="text-slate-200">{progress}%</span>
                              </div>
                              <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-slate-800">
                                <div 
                                  className="bg-gradient-to-r from-indigo-500 to-emerald-400 h-full transition-all duration-500" 
                                  style={{ width: `${progress}%` }}
                                ></div>
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
            <div className="flex items-center justify-between bg-slate-900 p-6 rounded-2xl border border-slate-800">
              <div>
                <button 
                  onClick={() => setSelectedSubjectId(null)}
                  className="text-xs text-indigo-400 hover:underline mb-2 inline-block"
                >
                  &larr; Back to Dashboard
                </button>
                <h2 className="text-2xl font-bold">{selectedSubject.name}</h2>
                {selectedSubject.examDate && (
                  <p className="text-sm text-amber-400 mt-1 flex items-center gap-1">
                    <Calendar className="w-4 h-4" /> Exam Date: {selectedSubject.examDate} ({getCountdown(selectedSubject.examDate)})
                  </p>
                )}
              </div>
              <button 
                onClick={() => setActiveTab('import')}
                className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl text-sm font-semibold transition"
              >
                + Bulk Add Syllabus Topics
              </button>
            </div>

            {selectedSubject.topics.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
                <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-400 font-medium">No checklist topics found for this subject yet.</p>
                <button 
                  onClick={() => setActiveTab('import')}
                  className="mt-4 text-indigo-400 hover:underline text-sm font-semibold"
                >
                  Go to Syllabus Parser to paste your IB syllabus &rarr;
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {selectedSubject.topics.map(topic => (
                  <div key={topic.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
                    <h3 className="font-bold text-lg text-indigo-300 border-b border-slate-800 pb-2">{topic.title}</h3>
                    <div className="space-y-2.5">
                      {topic.subtopics.map(st => (
                        <div 
                          key={st.id} 
                          onClick={() => toggleSubtopic(selectedSubject.id, topic.id, st.id)}
                          className={`flex items-start gap-3 p-3 rounded-xl border transition cursor-pointer ${st.completed ? 'bg-emerald-950/20 border-emerald-900/50 text-slate-400 line-through' : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-200'}`}
                        >
                          <div className="mt-0.5">
                            {st.completed ? (
                              <CheckCircle className="w-5 h-5 text-emerald-500" />
                            ) : (
                              <Circle className="w-5 h-5 text-slate-600" />
                            )}
                          </div>
                          <div className="flex-1 flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <span className="font-mono font-semibold text-indigo-400 mr-2">{st.code}</span>
                              <span>{st.text.replace(/^[A-Z]\.?\d+(?:\.\d+)*\s*/, '')}</span>
                            </div>
                            {st.ahl && (
                              <span className="bg-purple-500/10 text-purple-400 border border-purple-500/30 text-xs px-2 py-0.5 rounded-md font-mono">
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
          <div className="max-w-3xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6">
            <div>
              <h2 className="text-xl font-bold mb-1">IB Syllabus Smart Parser</h2>
              <p className="text-sm text-slate-400">
                Paste your IB syllabus notes below. The system automatically detects topic codes (e.g. A1.1.1), groups them, and highlights AHL badges!
              </p>
            </div>

            <form onSubmit={handleImportSyllabus} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Select Target Subject</label>
                <select 
                  value={targetSubIdForImport}
                  onChange={(e) => setTargetSubIdForImport(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 text-slate-300"
                  required
                >
                  <option value="">-- Choose Subject --</option>
                  {subjects.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Paste Syllabus Raw Text</label>
                <textarea 
                  rows="10"
                  placeholder="A1.1.1 Water as the medium for life&#10;A1.1.2 Hydrogen bonds as a consequence..."
                  value={rawSyllabusText}
                  onChange={(e) => setRawSyllabusText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm font-mono focus:outline-none focus:border-indigo-500 text-slate-200"
                  required
                ></textarea>
              </div>

              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 py-3 rounded-xl font-semibold transition">
                Parse & Generate Checklists
              </button>
            </form>
          </div>
        )}

        {activeTab === 'backup' && (
          <div className="max-w-xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-8 space-y-6 text-center">
            <div className="bg-indigo-600/10 text-indigo-400 w-12 h-12 rounded-2xl flex items-center justify-center mx-auto">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-1">Cloud Backup & Data Safety</h2>
              <p className="text-sm text-slate-400">
                Download your study progress, custom subjects, and streaks as a backup file. You can restore it anytime or transfer to another device.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <button 
                onClick={exportBackup}
                className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 px-6 py-3 rounded-xl font-semibold transition text-sm"
              >
                <Download className="w-4 h-4" /> Download Backup (.json)
              </button>
              
              <label className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 px-6 py-3 rounded-xl font-semibold transition text-sm cursor-pointer border border-slate-700">
                <Upload className="w-4 h-4" /> Restore Backup
                <input type="file" accept=".json" onChange={importBackup} className="hidden" />
              </label>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}