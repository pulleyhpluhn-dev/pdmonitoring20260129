
import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import DigitalTwin from './components/DigitalTwin';
import TrendAnalysis from './components/TrendAnalysis';
import Dashboard from './components/Dashboard';
import FloatingAssistant from './components/FloatingAssistant';
import StatusOverview from './components/StatusOverview';
import AccessConfig from './components/AccessConfig';
import DataExport from './components/DataExport';
import SystemSettings from './components/SystemSettings';
import Login from './components/Login';
import { Theme, ViewMode, PDSource, SensorData, DeviceSummary, Project, ConfigDevice, ConfigSensor, IPC, User, PrdMarker } from './types';
import { MOCK_DEVICES, MOCK_PROJECTS, getDeviceSimulation } from './constants';
import { GripHorizontal, StickyNote, Plus, X, Trash2, Save, MousePointer2, Crosshair, Pin, Download, Upload, FileJson, Lock, Eye } from 'lucide-react';

const DEFAULT_PRD_MARKER: PrdMarker = {
    id: '',
    contextId: 'dashboard', // Default context if missing
    x: 50,
    y: 50,
    title: 'New Feature',
    userStory: '',
    acceptanceCriteria: '',
    priority: 'Medium'
};

const PRD_PASSWORD = 'Hj123456';

// --- PRD Tool Panel Component ---
const PrdToolPanel: React.FC<{
    isDark: boolean;
    isPrdMode: boolean;
    setPrdMode: (mode: boolean) => void;
    interactionMode: 'view' | 'create';
    setInteractionMode: (mode: 'view' | 'create') => void;
    onExport: () => void;
    onImportRef: React.RefObject<HTMLInputElement>;
}> = ({ isDark, isPrdMode, setPrdMode, interactionMode, setInteractionMode, onExport, onImportRef }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    // Auth State
    const [showAuth, setShowAuth] = useState(false);
    const [authPassword, setAuthPassword] = useState('');
    const [authError, setAuthError] = useState(false);

    const handleToggle = () => {
        if (isOpen) {
            setIsOpen(false);
        } else {
            // Only require password if NOT in PRD mode (Icon is inactive/gray)
            if (!isPrdMode) {
                setShowAuth(true);
            } else {
                setIsOpen(true);
            }
        }
    };

    const handleAuthSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (authPassword === PRD_PASSWORD) {
            setPrdMode(true); // Activate Mode
            setInteractionMode('view'); // Default to View Mode for safety
            setIsOpen(true);  // Open Panel
            setShowAuth(false);
            setAuthPassword('');
            setAuthError(false);
        } else {
            setAuthError(true);
        }
    };

    const handleAuthClose = () => {
        setShowAuth(false);
        setAuthPassword('');
        setAuthError(false);
    };

    return (
        <>
            {/* Auth Modal */}
            {showAuth && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                    <div className={`w-full max-w-sm rounded-2xl shadow-2xl p-6 border flex flex-col gap-4 animate-scaleIn ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`} onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-3 rounded-full ${isDark ? 'bg-pink-500/20 text-pink-500' : 'bg-pink-100 text-pink-600'}`}>
                                <Lock size={24} />
                            </div>
                            <div>
                                <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-800'}`}>
                                    管理员验证
                                </h3>
                                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                    开启 PRD 标注模式需要权限验证
                                </p>
                            </div>
                        </div>
                        
                        <form onSubmit={handleAuthSubmit} className="flex flex-col gap-4">
                            <div>
                                <input 
                                    type="password" 
                                    autoFocus
                                    value={authPassword}
                                    onChange={(e) => { setAuthPassword(e.target.value); setAuthError(false); }}
                                    className={`w-full px-4 py-3 rounded-xl border outline-none font-bold tracking-widest text-center transition-all 
                                        ${isDark 
                                            ? 'bg-slate-800 border-slate-600 text-white focus:border-pink-500' 
                                            : 'bg-gray-50 border-gray-200 text-slate-800 focus:border-pink-500'} 
                                        ${authError ? 'border-red-500 ring-1 ring-red-500' : ''}
                                    `}
                                    placeholder="请输入密码"
                                />
                                {authError && <p className="text-red-500 text-xs font-bold mt-2 text-center flex items-center justify-center gap-1"><X size={12}/> 密码错误</p>}
                            </div>
                            
                            <div className="flex gap-3 mt-2">
                                <button 
                                    type="button" 
                                    onClick={handleAuthClose} 
                                    className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors ${isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-gray-100'}`}
                                >
                                    取消
                                </button>
                                <button 
                                    type="submit" 
                                    className="flex-1 py-2.5 bg-pink-600 text-white rounded-xl text-sm font-bold hover:bg-pink-700 shadow-lg shadow-pink-500/20 active:scale-95 transition-all"
                                >
                                    解锁并进入
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Panel & FAB */}
            <div className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-2">
                {isOpen && (
                    <div className={`p-4 rounded-xl shadow-2xl border mb-2 w-64 animate-slideInUp backdrop-blur-md ${isDark ? 'bg-slate-900/95 border-slate-700 text-white' : 'bg-white/95 border-gray-200 text-slate-800'}`}>
                        <div className="flex justify-between items-center mb-4">
                            <span className="font-bold text-sm flex items-center gap-2"><StickyNote size={16} className="text-pink-500" /> PRD 工具箱</span>
                            <button onClick={() => setIsOpen(false)} className={`opacity-50 hover:opacity-100 p-1 rounded-full ${isDark ? 'hover:bg-slate-800' : 'hover:bg-gray-100'}`}><X size={16}/></button>
                        </div>
                        
                        {/* Mode Switcher */}
                        <div className={`flex p-1 rounded-lg border mb-4 ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-gray-100 border-gray-200'}`}>
                            <button
                                onClick={() => setInteractionMode('view')}
                                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-bold transition-all
                                    ${interactionMode === 'view' 
                                        ? (isDark ? 'bg-slate-700 text-white shadow' : 'bg-white text-slate-800 shadow') 
                                        : 'opacity-60 hover:opacity-100'}
                                `}
                            >
                                <MousePointer2 size={14} /> 浏览
                            </button>
                            <button
                                onClick={() => setInteractionMode('create')}
                                className={`flex-1 flex items-center justify-center gap-2 py-1.5 rounded-md text-xs font-bold transition-all
                                    ${interactionMode === 'create' 
                                        ? 'bg-pink-600 text-white shadow' 
                                        : 'opacity-60 hover:opacity-100'}
                                `}
                            >
                                <Plus size={14} /> 添加
                            </button>
                        </div>

                        {/* Global Toggle */}
                        <div className={`flex items-center justify-between mb-4 p-3 rounded-lg border ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-50/50 border-gray-100'}`}>
                            <span className="text-xs font-bold opacity-80">PRD 模式总开关</span>
                            <button 
                                onClick={() => setPrdMode(!isPrdMode)}
                                className={`w-10 h-5 rounded-full p-0.5 transition-colors duration-300 relative ${isPrdMode ? 'bg-pink-600' : 'bg-slate-400'}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-300 ${isPrdMode ? 'translate-x-5' : 'translate-x-0'}`}></div>
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={onExport} className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-bold transition-all ${isDark ? 'hover:bg-slate-800 active:bg-slate-700' : 'hover:bg-gray-100 active:bg-gray-200'}`}>
                                <Download size={14} /> 导出数据
                            </button>
                            <button onClick={() => onImportRef.current?.click()} className={`flex items-center justify-center gap-2 py-2 rounded-lg border text-xs font-bold transition-all ${isDark ? 'hover:bg-slate-800 active:bg-slate-700' : 'hover:bg-gray-100 active:bg-gray-200'}`}>
                                <Upload size={14} /> 导入数据
                            </button>
                        </div>
                    </div>
                )}

                {/* Main Toggle / FAB */}
                <button
                    onClick={handleToggle}
                    className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 border-2
                        ${isPrdMode 
                            ? 'bg-pink-600 text-white shadow-pink-500/30 border-pink-400 animate-pulse-slow' 
                            : (isDark ? 'bg-slate-800 text-slate-400 border-slate-600' : 'bg-white text-slate-600 border-gray-200')
                        }
                    `}
                    title={isPrdMode ? "打开 PRD 工具箱" : "解锁 PRD 模式"}
                >
                    {isOpen ? <X size={24} /> : (isPrdMode ? <StickyNote size={24} /> : <Lock size={20} />)}
                    {isPrdMode && !isOpen && (
                        <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                    )}
                </button>
            </div>
        </>
    );
};

// --- PRD Edit Modal ---
const PrdEditModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    marker: PrdMarker;
    onSave: (updatedMarker: PrdMarker) => void;
    onDelete: (id: string) => void;
    isDark: boolean;
}> = ({ isOpen, onClose, marker, onSave, onDelete, isDark }) => {
    const [localMarker, setLocalMarker] = useState<PrdMarker>(marker);

    useEffect(() => {
        if (isOpen) {
            setLocalMarker(marker);
        }
    }, [isOpen, marker]);

    if (!isOpen) return null;

    const inputClass = `w-full px-3 py-2 rounded-lg border outline-none text-sm transition-all ${isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-pink-500' : 'bg-gray-50 border-gray-300 text-slate-800 focus:border-pink-600'}`;
    const labelClass = `block text-xs font-bold mb-1 uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn" onClick={(e) => e.stopPropagation()}>
            <div className={`w-full max-w-lg rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slideInUp border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className={`px-6 py-4 border-b flex justify-between items-center ${isDark ? 'border-slate-700 bg-slate-900' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-center gap-2">
                        <StickyNote className="text-pink-500" size={20} />
                        <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-800'}`}>
                            PRD 需求标注
                        </h3>
                    </div>
                    <button onClick={onClose} className={`p-1 rounded-full transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-200 text-slate-500'}`}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh] custom-scrollbar">
                    <div>
                        <label className={labelClass}>标题 / 摘要</label>
                        <input 
                            className={inputClass} 
                            value={localMarker.title} 
                            onChange={e => setLocalMarker({...localMarker, title: e.target.value})}
                            placeholder="功能名称"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className={labelClass}>用户故事 (User Story)</label>
                        <textarea 
                            className={`${inputClass} min-h-[100px] resize-y`}
                            value={localMarker.userStory}
                            onChange={e => setLocalMarker({...localMarker, userStory: e.target.value})}
                            placeholder="作为一个用户，我想要..."
                        />
                    </div>

                    <div>
                        <label className={labelClass}>验收标准 (Acceptance Criteria)</label>
                        <textarea 
                            className={`${inputClass} min-h-[100px] resize-y font-mono text-xs`}
                            value={localMarker.acceptanceCriteria}
                            onChange={e => setLocalMarker({...localMarker, acceptanceCriteria: e.target.value})}
                            placeholder="- 场景 1..."
                        />
                    </div>
                    
                    <div className="text-[10px] opacity-40 font-mono text-right">
                        Context: {localMarker.contextId} | ID: {localMarker.id.slice(-6)}
                    </div>
                </div>

                {/* Footer */}
                <div className={`px-6 py-4 border-t flex justify-between items-center ${isDark ? 'border-slate-700 bg-slate-900' : 'border-gray-100 bg-gray-50'}`}>
                    <button 
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            onDelete(localMarker.id);
                        }}
                        className="bg-red-500 hover:bg-red-600 text-white text-xs font-bold flex items-center gap-1 px-4 py-2 rounded transition-colors shadow-sm"
                        type="button" 
                    >
                        <Trash2 size={14} /> 删除
                    </button>
                    <div className="flex gap-3">
                        <button onClick={onClose} className={`px-4 py-2 rounded-lg text-sm font-bold ${isDark ? 'text-slate-400 hover:bg-slate-800' : 'text-slate-600 hover:bg-gray-200'}`}>
                            取消
                        </button>
                        <button 
                            onClick={() => onSave(localMarker)} 
                            className="px-6 py-2 bg-pink-600 text-white rounded-lg text-sm font-bold hover:bg-pink-700 shadow-lg shadow-pink-500/20 transition-all active:scale-95 flex items-center gap-2"
                        >
                            <Save size={16} /> 保存
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

function App() {
  const [theme, setTheme] = useState<Theme>('dark');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [statusCollapsed, setStatusCollapsed] = useState(false); 
  
  // -- Auth State --
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard'); 
  
  // -- AI Chat State --
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);

  // -- PRD Feature State --
  const [isPrdMode, setIsPrdMode] = useState(false);
  const [interactionMode, setInteractionMode] = useState<'view' | 'create'>('view'); // New Interaction State
  
  // Lazy Initialization with Error Handling
  const [prdMarkers, setPrdMarkers] = useState<PrdMarker[]>(() => {
      try {
          const saved = localStorage.getItem('prd-annotations-data');
          return saved ? JSON.parse(saved) : [];
      } catch (e) {
          console.error("Failed to parse saved markers", e);
          return [];
      }
  });
  
  // State for Editing Existing Marker
  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null);
  
  // State for New Marker Draft (Ghost Logic Fix)
  const [tempMarker, setTempMarker] = useState<PrdMarker | null>(null);

  const importFileRef = useRef<HTMLInputElement>(null);

  // -- Device State with Persistence --
  const [devices, setDevices] = useState<DeviceSummary[]>(() => {
    const saved = localStorage.getItem('pd_dashboard_devices');
    return saved ? JSON.parse(saved) : MOCK_DEVICES;
  });

  const [currentDeviceId, setCurrentDeviceId] = useState(devices[0]?.id || MOCK_DEVICES[0].id);

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('pd_dashboard_devices', JSON.stringify(devices));
  }, [devices]);

  useEffect(() => {
      localStorage.setItem('prd-annotations-data', JSON.stringify(prdMarkers));
  }, [prdMarkers]);

  // -- Config Persistence --
  const [configProjects, setConfigProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('pd_config_v5_projects');
    return saved ? JSON.parse(saved) : MOCK_PROJECTS;
  });
  const [configDevices, setConfigDevices] = useState<ConfigDevice[]>(() => {
    const saved = localStorage.getItem('pd_config_v5_devices');
    return saved ? JSON.parse(saved) : [];
  });
  const [configIpcs, setConfigIpcs] = useState<IPC[]>(() => {
    const saved = localStorage.getItem('pd_config_v5_ipcs');
    return saved ? JSON.parse(saved) : [];
  });
  const [configSensors, setConfigSensors] = useState<ConfigSensor[]>(() => {
    const saved = localStorage.getItem('pd_config_v5_sensors');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => { localStorage.setItem('pd_config_v5_projects', JSON.stringify(configProjects)); }, [configProjects]);
  useEffect(() => { localStorage.setItem('pd_config_v5_devices', JSON.stringify(configDevices)); }, [configDevices]);
  useEffect(() => { localStorage.setItem('pd_config_v5_ipcs', JSON.stringify(configIpcs)); }, [configIpcs]);
  useEffect(() => { localStorage.setItem('pd_config_v5_sensors', JSON.stringify(configSensors)); }, [configSensors]);

  const [simulationState, setSimulationState] = useState<{ sensors: SensorData[], pdSource: PDSource | null }>({
    sensors: [],
    pdSource: null
  });

  const handleUpdateDeviceImage = (deviceId: string, imageData: string) => {
    setDevices(prev => prev.map(d => d.id === deviceId ? { ...d, customImage: imageData } : d));
  };

  useEffect(() => {
    const simData = getDeviceSimulation(currentDeviceId);
    setSimulationState(simData);
  }, [currentDeviceId]);

  const [activeSensorId, setActiveSensorId] = useState<string>('node-0');
  const [activeSensorName, setActiveSensorName] = useState<string>('GIS本体综合监测终端');
  const [activeSensorSn, setActiveSensorSn] = useState<string>('S-01');

  const [splitRatio, setSplitRatio] = useState(50); 
  const [isResizingSplit, setIsResizingSplit] = useState(false);
  
  // Refs for layout handling
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1280) {
        setSidebarCollapsed(true);
      }
    };
    if (window.innerWidth < 1280) {
        setSidebarCollapsed(true);
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const startResizingSplit = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizingSplit(true);
  };

  const stopResizing = () => {
    setIsResizingSplit(false);
    document.body.style.cursor = 'default';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isResizingSplit && contentRef.current) {
        // NOTE: In diagnosis mode, contentRef is the container.
        const rect = contentRef.current.getBoundingClientRect();
        const relativeY = e.clientY - rect.top;
        const rawPercentage = (relativeY / rect.height) * 100;
        setSplitRatio(Math.min(Math.max(rawPercentage, 20), 80));
    }
  };

  useEffect(() => {
    if (isResizingSplit) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', stopResizing);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizingSplit]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  const isDark = theme === 'dark';

  const handleSensorSelect = (id: string, name?: string, sn?: string) => {
      setActiveSensorId(id);
      if (name) {
          setActiveSensorName(name);
      }
      if (sn) {
          setActiveSensorSn(sn);
      }
  };

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    if (user.permissions.length > 0 && !user.permissions.includes('dashboard')) {
        setCurrentView(user.permissions[0] as ViewMode);
    } else {
        setCurrentView('dashboard');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  // --- PRD Interaction Logic (Anchored to Content) ---
  const handleContentClick = (e: React.MouseEvent) => {
      // Only allow creation if in Create Mode and content exists
      if (!isPrdMode || interactionMode !== 'create' || !contentRef.current) return;
      
      // Calculate coordinates relative to the SCROLLABLE content container (contentRef)
      // This ensures markers stay pinned to components even when scrolled
      const rect = contentRef.current.getBoundingClientRect();
      const relativeX = e.clientX - rect.left;
      const relativeY = e.clientY - rect.top;
      
      const x = (relativeX / rect.width) * 100;
      const y = (relativeY / rect.height) * 100;
      
      // Create a temporary draft marker
      const draftMarker: PrdMarker = {
          ...DEFAULT_PRD_MARKER,
          id: `temp-${Date.now()}`, 
          contextId: currentView,
          x,
          y,
      };
      
      setTempMarker(draftMarker);
  };

  const handleSaveMarker = (updatedMarker: PrdMarker) => {
      if (tempMarker) {
          // Case 1: Saving a new draft
          const permanentMarker = { ...updatedMarker, id: Date.now().toString() };
          setPrdMarkers(prev => [...prev, permanentMarker]);
          setTempMarker(null); // Clear draft
      } else {
          // Case 2: Updating an existing marker
          setPrdMarkers(prev => prev.map(m => m.id === updatedMarker.id ? updatedMarker : m));
          setEditingMarkerId(null);
      }
  };

  const handleCancelEdit = () => {
      // Clear both draft and editing states
      setTempMarker(null);
      setEditingMarkerId(null);
  };

  const handleDeleteMarker = (id: string, requireConfirmation: boolean = true) => {
      if (tempMarker && tempMarker.id === id) {
          setTempMarker(null);
          return;
      }
      if (!id) return;
      if (requireConfirmation && !window.confirm('确定要删除这条 PRD 需求标注吗？')) {
          return;
      }
      setPrdMarkers(currentMarkers => {
          const newMarkers = currentMarkers.filter(m => m.id !== id);
          localStorage.setItem('prd-annotations-data', JSON.stringify(newMarkers));
          return newMarkers;
      });
      if (editingMarkerId === id) {
          setEditingMarkerId(null);
      }
  };

  const handleExportPrdData = () => {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(prdMarkers, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `prd_backup_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };

  const handleImportPrdData = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const json = JSON.parse(event.target?.result as string);
              if (Array.isArray(json)) {
                  const migratedMarkers: PrdMarker[] = json.map((item: any) => ({
                      ...DEFAULT_PRD_MARKER,
                      ...item,
                      id: item.id || `migrated-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`
                  }));
                  setPrdMarkers(migratedMarkers);
                  setTempMarker(null);
                  setEditingMarkerId(null);
                  localStorage.setItem('prd-annotations-data', JSON.stringify(migratedMarkers));
                  alert(`成功导入 ${migratedMarkers.length} 条标注数据`);
              } else {
                  alert('无效的文件格式：期望标注数组');
              }
          } catch (err) {
              console.error(err);
              alert('解析 JSON 文件失败');
          }
      };
      reader.readAsText(file);
      e.target.value = '';
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  const savedMarkers = prdMarkers.filter(m => m.contextId === currentView);
  const markersToRender = tempMarker && tempMarker.contextId === currentView 
      ? [...savedMarkers, tempMarker] 
      : savedMarkers;

  const activeMarker = tempMarker || (editingMarkerId ? prdMarkers.find(m => m.id === editingMarkerId) : null);

  // Layout Logic:
  // For 'dashboard', 'config', 'export', 'settings', the page should scroll naturally.
  // For 'diagnosis', it requires a fixed viewport for 3D and charts.
  const isScrollableView = currentView !== 'diagnosis';

  return (
    <div className={`${isDark ? 'dark' : ''} h-screen w-screen overflow-hidden flex flex-col relative`}>
      {isPrdMode && activeMarker && (
          <PrdEditModal 
            isOpen={true}
            onClose={handleCancelEdit}
            marker={activeMarker}
            onSave={handleSaveMarker}
            onDelete={handleDeleteMarker}
            isDark={isDark}
          />
      )}

      <PrdToolPanel 
          isDark={isDark}
          isPrdMode={isPrdMode}
          setPrdMode={setIsPrdMode}
          interactionMode={interactionMode}
          setInteractionMode={setInteractionMode}
          onExport={handleExportPrdData}
          onImportRef={importFileRef}
      />

      <input type="file" ref={importFileRef} className="hidden" accept=".json" onChange={handleImportPrdData} />

      <div className={`flex flex-1 overflow-hidden transition-colors duration-300 ${isDark ? 'bg-tech-dark text-slate-200' : 'bg-slate-50 text-slate-800'}`}>
        {/* Left Sidebar */}
        <div className="flex-shrink-0 z-20">
          <Sidebar 
            theme={theme} 
            toggleTheme={toggleTheme} 
            collapsed={sidebarCollapsed}
            toggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            currentView={currentView} 
            onNavigate={setCurrentView}
            currentUser={currentUser}
            onLogout={handleLogout}
            onOpenAiChat={() => setIsAiChatOpen(true)}
          />
        </div>

        {/* Middle Content Area - SCROLL CONTAINER */}
        <div 
            ref={scrollContainerRef} 
            id="app-main-content-area" 
            className={`flex-1 flex flex-col min-w-0 relative transition-colors duration-300 
                ${isScrollableView ? 'overflow-y-auto overflow-x-hidden' : 'overflow-hidden'}
            `}
        >
          {/* Inner Content Wrapper - EXPANDS WITH CONTENT */}
          <div 
            ref={contentRef}
            className={`relative w-full ${isScrollableView ? 'min-h-full h-fit' : 'h-full'} p-4 flex flex-col`}
          >
              {/* PRD Click Overlay */}
              {isPrdMode && interactionMode === 'create' && (
                  <div 
                    className="absolute inset-0 z-40 cursor-crosshair"
                    onClick={handleContentClick}
                    style={{ backgroundColor: 'rgba(236, 72, 153, 0.05)' }}
                  >
                      <div className={`absolute top-4 left-1/2 transform -translate-x-1/2 bg-pink-600 text-white px-4 py-2 rounded-full shadow-lg font-bold text-sm pointer-events-none animate-bounce flex items-center gap-2 ${isScrollableView ? 'sticky top-4' : ''}`}>
                          <Plus size={16} /> 点击屏幕添加标注 (上下文: {currentView})
                      </div>
                  </div>
              )}

              {/* PRD Markers */}
              {isPrdMode && markersToRender.map(marker => (
                  <div
                    key={marker.id}
                    className="absolute z-50 transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                    style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (marker.id !== tempMarker?.id) setEditingMarkerId(marker.id);
                    }}
                  >
                      <div className={`
                          w-8 h-8 rounded-full flex items-center justify-center shadow-xl border-2 border-white transition-transform hover:scale-125
                          ${marker.priority === 'High' ? 'bg-red-500' : marker.priority === 'Medium' ? 'bg-orange-500' : 'bg-blue-500'}
                          ${marker.id === tempMarker?.id ? 'animate-pulse ring-4 ring-pink-400/50' : ''}
                      `}>
                          <Pin size={14} className="text-white fill-current" />
                      </div>
                      
                      {marker.id !== tempMarker?.id && (
                          <button
                              onClick={(e) => {
                                  e.preventDefault(); e.stopPropagation();
                                  handleDeleteMarker(marker.id, false);
                              }}
                              onMouseDown={(e) => e.stopPropagation()} 
                              className="absolute -top-3 -right-3 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg border-2 border-white hover:bg-red-700 hover:scale-110 z-[60]"
                              title="删除标注"
                          >
                              <X size={12} strokeWidth={3} />
                          </button>
                      )}

                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-black/80 text-white text-xs px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-0">
                          {marker.title || '未命名需求'}
                      </div>
                  </div>
              ))}

              {currentView === 'dashboard' ? (
                 <div className={`w-full rounded-xl shadow-sm border transition-colors duration-300 ${isDark ? 'bg-tech-card border-slate-700' : 'bg-white border-gray-200'}`}>
                    <Dashboard 
                      devices={devices} 
                      projects={configProjects}
                      isDark={isDark} 
                      onDeviceSelect={(id) => { setCurrentDeviceId(id); setCurrentView('diagnosis'); }} 
                      onUpdateDeviceImage={handleUpdateDeviceImage} 
                    />
                 </div>
              ) : currentView === 'config' ? (
                <div className={`w-full rounded-xl shadow-sm border transition-colors duration-300 ${isDark ? 'bg-tech-card border-slate-700' : 'bg-white border-gray-200'}`}>
                   <AccessConfig 
                      isDark={isDark} 
                      projects={configProjects} setProjects={setConfigProjects}
                      devices={configDevices} setDevices={setConfigDevices}
                      ipcs={configIpcs} setIpcs={setConfigIpcs}
                      sensors={configSensors} setSensors={setConfigSensors}
                   />
                </div>
              ) : currentView === 'export' ? (
                <div className={`w-full rounded-xl shadow-sm border transition-colors duration-300 ${isDark ? 'bg-tech-card border-slate-700' : 'bg-white border-gray-200'}`}>
                   <DataExport 
                      isDark={isDark} 
                      projects={configProjects} 
                      devices={configDevices} 
                      sensors={configSensors} 
                   />
                </div>
              ) : currentView === 'settings' ? (
                <div className={`w-full rounded-xl shadow-sm border transition-colors duration-300 ${isDark ? 'bg-tech-card border-slate-700' : 'bg-white border-gray-200'}`}>
                   <SystemSettings isDark={isDark} />
                </div>
              ) : (
                <>
                  <div className="w-full min-h-0 transition-[height] duration-75 ease-linear" style={{ height: `${splitRatio}%` }}>
                    <DigitalTwin 
                      sensors={simulationState.sensors} 
                      pdSource={simulationState.pdSource} 
                      isDark={isDark} 
                      activeSensorId={activeSensorId} 
                      onSensorSelect={handleSensorSelect} 
                      devices={devices} 
                      projects={configProjects}
                      currentDeviceId={currentDeviceId} 
                      onDeviceChange={setCurrentDeviceId}
                    />
                  </div>
                  <div className={`w-full h-3 cursor-row-resize flex items-center justify-center z-30 flex-shrink-0 group hover:scale-y-110 transition-transform my-1 ${isResizingSplit ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`} onMouseDown={startResizingSplit}>
                      <div className={`w-32 h-1.5 rounded-full flex items-center justify-center transition-colors ${isDark ? 'bg-slate-700 group-hover:bg-blue-500' : 'bg-gray-300 group-hover:bg-blue-400'}`}>
                          <GripHorizontal size={12} className={`opacity-50 ${isDark ? 'text-slate-400' : 'text-slate-600'}`} />
                      </div>
                  </div>
                  <div className="flex-1 min-h-0 w-full overflow-hidden">
                    <TrendAnalysis isDark={isDark} sensorName={activeSensorName} sensorId={activeSensorId} sensorSn={activeSensorSn} />
                  </div>
                </>
              )}
          </div>
        </div>

        {/* Right Sidebar (Status Overview) */}
        <div className="flex-shrink-0 z-20">
            <StatusOverview 
                isDark={isDark} 
                devices={devices} 
                collapsed={statusCollapsed}
                toggleCollapse={() => setStatusCollapsed(!statusCollapsed)}
            />
        </div>
      </div>

      {/* Central Draggable AI Assistant Window */}
      <FloatingAssistant 
        isDark={isDark} 
        isOpen={isAiChatOpen} 
        onClose={() => setIsAiChatOpen(false)} 
      />
    </div>
  );
}

export default App;
