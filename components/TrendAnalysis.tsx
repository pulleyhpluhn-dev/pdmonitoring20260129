
import React, { useState, useMemo, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, LineChart, Line, Brush, ScatterChart, Scatter, ZAxis, Cell
} from 'recharts';
import { ChartDataPoint, AlarmLevel } from '../types';
import { 
  Calendar, Thermometer, Zap, ChevronDown, Clock, X, Info, Settings2, Save, 
  ChevronRight, ArrowLeft, Sliders, Activity, Scale, Wifi, BarChart3, Waves,
  List, Filter, Search, Download, CheckCircle2, AlertCircle, AlertTriangle,
  RotateCcw, FileText, Plus, Trash2, Layout, Maximize2, Grid, Layers, ZapOff, Radio, BarChart, Droplets, Check, FileDown, ListFilter, Eye, HelpCircle,
  Percent, AlertOctagon, RefreshCw, FileInput, Upload, Network, BrainCircuit, ScanSearch, FolderTree, HardDrive, Database, ShieldCheck, HardDriveDownload,
  Siren, Settings, SlidersHorizontal, Hash, FileJson
} from 'lucide-react';

interface TrendAnalysisProps {
  data?: ChartDataPoint[]; 
  isDark: boolean;
  sensorName: string;
  sensorId: string;
  sensorSn?: string;
  deviceName?: string;
  projectName?: string;
}

type AnalysisMode = 'elec' | 'env';
type ChannelType = 'UHF' | 'TEV' | 'HFCT' | 'AE';
type TimeRange = '24h' | '7d' | '1m' | 'custom';
type ChartTab = 'PRPD' | 'PRPS' | 'PULSE' | 'CORRELATION';

interface PointDetailModalProps {
  data: ChartDataPoint | null;
  onClose: () => void;
  isDark: boolean;
}

interface SensorSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  sensorName: string;
  sensorSn?: string;
}

interface DataDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDark: boolean;
  sensorName: string;
  sensorSn?: string;
  deviceName?: string;
  projectName?: string;
}

interface DataListModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ChartDataPoint[];
  isDark: boolean;
  sensorName: string;
  sensorId: string;
  timeRange: TimeRange;
  onTimeRangeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  showDatePicker: boolean;
  setShowDatePicker: (show: boolean) => void;
  customStart: string;
  setCustomStart: (val: string) => void;
  customEnd: string;
  setCustomEnd: (val: string) => void;
  onViewDetail: (point: ChartDataPoint) => void;
}

interface TimeSelectorProps {
  timeRange: TimeRange;
  onTimeRangeChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  showDatePicker: boolean;
  setShowDatePicker: (show: boolean) => void;
  customStart: string;
  setCustomStart: (val: string) => void;
  customEnd: string;
  setCustomEnd: (val: string) => void;
  isDark: boolean;
}

const CHANNEL_CONFIG: Record<ChannelType, { color: string, ampKey: keyof ChartDataPoint, freqKey: keyof ChartDataPoint, label: string }> = {
  UHF: { color: '#38BDF8', ampKey: 'uhf_amp', freqKey: 'uhf_freq', label: 'UHF' },    
  TEV: { color: '#C084FC', ampKey: 'tev_amp', freqKey: 'tev_freq', label: 'TEV' },    
  HFCT: { color: '#2563EB', ampKey: 'hfct_amp', freqKey: 'hfct_freq', label: 'HFCT' }, 
  AE: { color: '#EC4899', ampKey: 'ae_amp', freqKey: 'ae_freq', label: 'AE' }       
};

// --- Alarm Logic Rules ---
const ALARM_RULES = {
    UHF: {
        [AlarmLevel.CRITICAL]: { freq: 150, amp: 66.0 },
        [AlarmLevel.DANGER]: { freq: 90, amp: 55.0 },
        [AlarmLevel.WARNING]: { freq: 30, amp: 40.0 }
    },
    TEV: {
        [AlarmLevel.CRITICAL]: { freq: 150, amp: 70.0 },
        [AlarmLevel.DANGER]: { freq: 90, amp: 54.0 },
        [AlarmLevel.WARNING]: { freq: 30, amp: 40.0 }
    },
    AE: {
        [AlarmLevel.CRITICAL]: { freq: 150, amp: 50.0 },
        [AlarmLevel.DANGER]: { freq: 90, amp: 40.0 },
        [AlarmLevel.WARNING]: { freq: 30, amp: 30.0 }
    },
    HFCT: {
        [AlarmLevel.CRITICAL]: { freq: 150, amp: 60.0 },
        [AlarmLevel.DANGER]: { freq: 90, amp: 50.0 },
        [AlarmLevel.WARNING]: { freq: 30, amp: 35.0 }
    }
};

// Helper function to calculate alarm level based on channel rules
const getPointAlarmLevel = (channel: ChannelType, amp: number, freq: number): AlarmLevel => {
    const rules = ALARM_RULES[channel as keyof typeof ALARM_RULES];
    
    if (!rules) return AlarmLevel.NORMAL;

    // Check from highest severity to lowest
    if (freq > rules[AlarmLevel.CRITICAL].freq && amp > rules[AlarmLevel.CRITICAL].amp) {
        return AlarmLevel.CRITICAL;
    }
    if (freq > rules[AlarmLevel.DANGER].freq && amp > rules[AlarmLevel.DANGER].amp) {
        return AlarmLevel.DANGER;
    }
    if (freq > rules[AlarmLevel.WARNING].freq && amp > rules[AlarmLevel.WARNING].amp) {
        return AlarmLevel.WARNING;
    }

    return AlarmLevel.NORMAL;
};

// Custom Dot Component for Recharts to highlight alarm points
const CustomizedDot = (props: any) => {
    const { cx, cy, payload, channelType } = props;
    
    // Only render for valid coordinates
    if (!cx || !cy) return null;

    const config = CHANNEL_CONFIG[channelType as ChannelType];
    const amp = payload[config.ampKey] as number;
    const freq = payload[config.freqKey] as number;

    const status = getPointAlarmLevel(channelType as ChannelType, amp, freq);

    if (status === AlarmLevel.NORMAL || status === AlarmLevel.NO_DATA) {
        return null; // Don't show dot for normal points to keep chart clean
    }

    let fill = '#eab308'; // Default Warning Yellow
    let stroke = '#fff';
    let r = 4;

    if (status === AlarmLevel.DANGER) {
        fill = '#f97316'; // Orange
        r = 5;
    } else if (status === AlarmLevel.CRITICAL) {
        fill = '#ef4444'; // Red
        r = 6;
        stroke = '#fee2e2';
    }

    return (
        <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={1} className="animate-pulse" />
    );
};

const generateData = (range: TimeRange, sensorId: string, customStart?: Date, customEnd?: Date): ChartDataPoint[] => {
  // Data generation logic (unchanged)
  const now = new Date();
  let startTime = new Date();
  let points = 0;
  const intervalMinutes = 15;

  switch (range) {
    case '24h': startTime.setHours(now.getHours() - 24); points = (24 * 60) / intervalMinutes; break;
    case '7d': startTime.setDate(now.getDate() - 7); points = (7 * 24 * 60) / intervalMinutes; break;
    case '1m': startTime.setMonth(now.getMonth() - 1); points = (30 * 24 * 60) / intervalMinutes; break;
    case 'custom':
      if (customStart && customEnd) {
        startTime = new Date(customStart);
        const diffMs = customEnd.getTime() - customStart.getTime();
        points = Math.max(4, Math.floor(diffMs / (1000 * 60 * 15)));
      } else {
        startTime.setHours(now.getHours() - 24);
        points = 96;
      }
      break;
  }

  const data: ChartDataPoint[] = [];
  const seed = sensorId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  let uhf = 20 + (seed % 15), tev = 25 + (seed % 20), hfct = 30 + (seed % 10), ae = 8 + (seed % 5);
  let uhf_f = 40 + (seed % 30), tev_f = 80 + (seed % 50), hfct_f = 15 + (seed % 10), ae_f = 2 + (seed % 3);

  for (let i = 0; i < points; i++) {
    const time = new Date(startTime.getTime() + i * intervalMinutes * 60 * 1000);
    const walk = (val: number, min: number, max: number, vol: number) => {
      let change = (Math.random() - 0.5) * vol;
      let newVal = val + change;
      return Math.max(min, Math.min(max, newVal));
    };

    uhf = walk(uhf, 15, 65, 5);
    tev = walk(tev, 20, 80, 10);
    hfct = walk(hfct, 30, 60, 4);
    ae = walk(ae, 5, 20, 2);

    uhf_f = walk(uhf_f, 20, 150, 20);
    tev_f = walk(tev_f, 50, 300, 40);
    hfct_f = walk(hfct_f, 10, 50, 10);
    ae_f = walk(ae_f, 0, 20, 3);

    const isDangerSensor = sensorId.toLowerCase().includes('s-203') || sensorId.includes('s3');
    const spikeChance = isDangerSensor ? 0.85 : 0.98;
    const isSpike = Math.random() > spikeChance;

    if (isSpike && isDangerSensor) {
        const severity = Math.random();
        if (severity > 0.7) {
            uhf = 68 + Math.random() * 5; uhf_f = 160 + Math.random() * 50;
            tev = 72 + Math.random() * 5; tev_f = 160 + Math.random() * 50;
            ae = 52 + Math.random() * 5; ae_f = 160 + Math.random() * 50;
        } else if (severity > 0.4) {
            uhf = 58 + Math.random() * 5; uhf_f = 100 + Math.random() * 40;
            tev = 56 + Math.random() * 5; tev_f = 100 + Math.random() * 40;
            ae = 42 + Math.random() * 5; ae_f = 100 + Math.random() * 40;
        } else {
            uhf = 42 + Math.random() * 5; uhf_f = 40 + Math.random() * 40;
            tev = 42 + Math.random() * 5; tev_f = 40 + Math.random() * 40;
            ae = 32 + Math.random() * 5; ae_f = 40 + Math.random() * 40;
        }
    }

    data.push({
      time: time.toISOString(),
      uhf_amp: uhf + (isSpike && !isDangerSensor ? Math.random() * 15 : 0),
      tev_amp: tev + (isSpike && !isDangerSensor ? Math.random() * 25 : 0),
      hfct_amp: hfct,
      ae_amp: ae,
      uhf_freq: uhf_f,
      tev_freq: tev_f + (isSpike && !isDangerSensor ? 150 : 0),
      hfct_freq: hfct_f,
      ae_freq: ae_f,
      temperature: 20 + Math.sin(i / points * Math.PI * 2) * 5 + Math.random(),
      humidity: 50 + Math.cos(i / points * Math.PI * 2) * 10 + Math.random(),
      isAlarm: isSpike 
    });
  }
  return data;
};

// ... Chart Generation Functions (PRPD, PRPS, Pulse, Correlation) are unchanged ...
const generatePRPDData = (channel: ChannelType) => {
  const points = [];
  const clusters = [
    { center: 45, spread: 30, ampBase: 30 },
    { center: 225, spread: 30, ampBase: 30 }
  ];
  for (let i = 0; i < 600; i++) {
    const cluster = Math.random() > 0.5 ? clusters[0] : clusters[1];
    const phase = (cluster.center + (Math.random() - 0.5) * cluster.spread * 2 + 360) % 360;
    const ampMod = Math.abs(Math.sin((phase * Math.PI) / 180));
    const amp = cluster.ampBase * ampMod + Math.random() * 20 + 10;
    points.push({ x: phase, y: amp, z: Math.random() }); 
  }
  return points;
};

const generatePRPSData = (channel: ChannelType) => {
    const points = [];
    const cycles = 50; 
    for (let c = 0; c < cycles; c++) {
        const pulsesInCycle = Math.floor(Math.random() * 5) + 2; 
        for (let p = 0; p < pulsesInCycle; p++) {
            const center = Math.random() > 0.5 ? 45 : 225;
            const phase = (center + (Math.random() - 0.5) * 40 + 360) % 360;
            const amp = Math.random() * 50 + 10;
            points.push({
                phase: Math.round(phase),
                cycle: c,
                amp: amp
            });
        }
    }
    return points;
}

const generatePulseData = () => {
  const points = [];
  for (let i = 0; i < 100; i++) {
    const t = i;
    let amp = 0;
    if (i > 20) {
      const decay = Math.exp(-(i - 20) * 0.1);
      amp = 80 * decay * Math.sin((i - 20) * 0.5);
    }
    amp += (Math.random() - 0.5) * 5;
    points.push({ time: t, value: amp });
  }
  return points;
};

const generateCorrelationData = () => {
    const points = [];
    for (let i = 0; i < 100; i++) {
        points.push({ 
            index: i, 
            value: (Math.sin(i * 0.2) * 0.5 + 0.5) * (i === 37 || i === 73 ? 0.9 : Math.random() * 0.2)
        });
    }
    return points;
};

const formatDate = (isoString: string) => {
  const d = new Date(isoString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
};

const getLevelInfo = (point: ChartDataPoint) => {
  let maxStatus = AlarmLevel.NORMAL;
  (['UHF', 'TEV', 'AE'] as ChannelType[]).forEach(type => {
      const status = getPointAlarmLevel(type, point[CHANNEL_CONFIG[type].ampKey] as number, point[CHANNEL_CONFIG[type].freqKey] as number);
      if (status === AlarmLevel.CRITICAL) maxStatus = AlarmLevel.CRITICAL;
      else if (status === AlarmLevel.DANGER && maxStatus !== AlarmLevel.CRITICAL) maxStatus = AlarmLevel.DANGER;
      else if (status === AlarmLevel.WARNING && maxStatus === AlarmLevel.NORMAL) maxStatus = AlarmLevel.WARNING;
  });

  if (maxStatus === AlarmLevel.NORMAL) return { label: '正常', color: 'text-green-500', icon: CheckCircle2 };
  if (maxStatus === AlarmLevel.CRITICAL) return { label: '三级', color: 'text-red-500', icon: AlertCircle };
  if (maxStatus === AlarmLevel.DANGER) return { label: '二级', color: 'text-orange-500', icon: AlertTriangle };
  return { label: '一级', color: 'text-yellow-500', icon: Info };
};

// --- Mock AI Diagnosis ---
const getAIDiagnosis = (channel: ChannelType, val: number, freq: number) => {
    if (val < 25) return { type: '背景噪声', confidence: 0.98, color: 'text-gray-500', desc: '信号特征符合环境白噪声分布' };
    
    // Deterministic simulation based on value ranges for demo consistency
    const seed = Math.floor(val * freq);
    
    if (val > 55) {
        // High amplitude: Critical types
        const types = [
            { type: '尖端放电', color: 'text-red-500', desc: '波形特征显示典型的相位固定脉冲序列' },
            { type: '悬浮放电', color: 'text-orange-500', desc: '放电脉冲幅值分散，相位分布较宽' },
            { type: '绝缘子沿面放电', color: 'text-red-600', desc: '高能放电脉冲，伴随爬电特征' }
        ];
        return { ...types[seed % types.length], confidence: 0.85 + (seed % 15) / 100 };
    } else {
        // Lower amplitude: Warning types
        const types = [
            { type: '自由颗粒放电', color: 'text-yellow-500', desc: '随机性较强，相位相关性弱' },
            { type: '微弱尖端放电', color: 'text-yellow-600', desc: '早期尖端缺陷特征' },
            { type: '外部干扰', color: 'text-blue-500', desc: '疑似通信信号或雷达干扰' }
        ];
        return { ...types[seed % types.length], confidence: 0.75 + (seed % 20) / 100 };
    }
};

// ... Data Download Modal ... (Unchanged)
const STATUS_OPTIONS = [
  { level: AlarmLevel.NORMAL, label: '正常', color: '#22c55e' },
  { level: AlarmLevel.WARNING, label: '一级', color: '#facc15' },
  { level: AlarmLevel.DANGER, label: '二级', color: '#f97316' },
  { level: AlarmLevel.CRITICAL, label: '三级', color: '#ef4444' },
  { level: AlarmLevel.NO_DATA, label: '无数据', color: '#94a3b8' },
];

const AVAILABLE_CHANNELS = ['UHF', 'TEV', 'HFCT', 'AE', '温度', '湿度'];

const DataDownloadModal: React.FC<DataDownloadModalProps> = ({ 
    isOpen, onClose, isDark, sensorName, sensorSn, deviceName, projectName 
}) => {
    // ... DataDownloadModal Implementation (Unchanged)
    const [selectedStatuses, setSelectedStatuses] = useState<AlarmLevel[]>(STATUS_OPTIONS.map(o => o.level));
    const [selectedChannels, setSelectedChannels] = useState<string[]>(['UHF', 'TEV', 'HFCT', 'AE', '温度', '湿度']);
    const [timeRange, setTimeRange] = useState({ start: '', end: '' });
    const [isExporting, setIsExporting] = useState(false);
    const [exportProgress, setExportProgress] = useState(0);
    const [estimatedSize, setEstimatedSize] = useState<string>('0 B');

    // Calculate Estimated Size
    useEffect(() => {
        if (!timeRange.start || !timeRange.end) {
            setEstimatedSize('0 B');
            return;
        }
        const start = new Date(timeRange.start).getTime();
        const end = new Date(timeRange.end).getTime();
        if (isNaN(start) || isNaN(end) || start > end) {
            setEstimatedSize('0 B');
            return;
        }
        const diffDays = Math.floor((end - start) / (1000 * 3600 * 24)) + 1;
        const channelFactor = selectedChannels.length;
        const baseSize = diffDays * channelFactor * 2 * 1024 * 1024;
        
        let statusFactor = selectedStatuses.length / 5;
        const totalBytes = baseSize * statusFactor;

        if (totalBytes < 1024) setEstimatedSize(`${totalBytes.toFixed(0)} B`);
        else if (totalBytes < 1024 * 1024) setEstimatedSize(`${(totalBytes / 1024).toFixed(1)} KB`);
        else if (totalBytes < 1024 * 1024 * 1024) setEstimatedSize(`${(totalBytes / (1024 * 1024)).toFixed(2)} MB`);
        else setEstimatedSize(`${(totalBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`);
    }, [selectedChannels, timeRange, selectedStatuses]);

    const handleStatusToggle = (level: AlarmLevel) => {
        setSelectedStatuses(prev => 
          prev.includes(level) ? prev.filter(l => l !== level) : [...prev, level]
        );
    };

    const handleChannelToggle = (channel: string) => {
        setSelectedChannels(prev => 
            prev.includes(channel) ? prev.filter(c => c !== channel) : [...prev, channel]
        );
    };

    const handlePresetTime = (days: number) => {
        const end = new Date();
        const start = new Date();
        if (days === 1) {
            // 24h
        } else {
            start.setDate(end.getDate() - (days - 1));
        }
        const formatDate = (d: Date) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };
        setTimeRange({ start: formatDate(start), end: formatDate(end) });
    };

    const triggerExport = () => {
        if (selectedChannels.length === 0 || selectedStatuses.length === 0 || !timeRange.start || !timeRange.end) return;
        setIsExporting(true);
        setExportProgress(0);
        const interval = setInterval(() => {
            setExportProgress(prev => {
                if (prev >= 100) {
                    clearInterval(interval);
                    setTimeout(() => {
                        setIsExporting(false);
                        alert(`数据下载已完成！\n共 ${estimatedSize}。`);
                        onClose();
                    }, 500);
                    return 100;
                }
                return prev + 10;
            });
        }, 150);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn" onClick={onClose}>
            <div className={`w-full max-w-5xl h-[750px] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slideInUp border ${isDark ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-gray-200'}`} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className={`px-6 py-4 border-b flex justify-between items-center ${isDark ? 'border-slate-800 bg-slate-900' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                            <Download size={20} />
                        </div>
                        <div>
                            <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-800'}`}>传感节点数据下载</h3>
                            <p className="text-xs opacity-50 font-mono mt-0.5">{sensorName} | {sensorSn}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className={`p-2 rounded-full hover:bg-opacity-20 transition-colors ${isDark ? 'hover:bg-white text-slate-400' : 'hover:bg-black text-slate-500'}`}>
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 flex gap-6 p-6 overflow-hidden">
                    {/* Left Column: Asset & Channels */}
                    <div className={`w-1/2 flex flex-col rounded-xl border overflow-hidden ${isDark ? 'bg-slate-900/40 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
                        <div className={`px-4 py-3 border-b flex items-center gap-2 ${isDark ? 'bg-slate-800/50 border-slate-700' : 'bg-gray-50 border-gray-100'}`}>
                            <Database size={16} className="text-blue-500" />
                            <span className="text-xs font-black uppercase tracking-widest">组织机构与资产选择</span>
                        </div>
                        
                        <div className="p-5 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                            {/* Static Tree View */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-3 opacity-80">
                                    <FolderTree size={18} className="text-slate-500" />
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-bold opacity-50 uppercase">当前项目</span>
                                        <span className="text-sm font-bold">{projectName || '未知项目'}</span>
                                    </div>
                                </div>
                                <div className="ml-2 pl-4 border-l-2 border-dashed border-slate-500/20 py-1 space-y-4">
                                    <div className="flex items-center gap-3 opacity-90">
                                        <HardDrive size={18} className="text-slate-500" />
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold opacity-50 uppercase">所属设备</span>
                                            <span className="text-sm font-bold">{deviceName || '未知设备'}</span>
                                        </div>
                                    </div>
                                    <div className="ml-2 pl-4 border-l-2 border-dashed border-slate-500/20 py-1">
                                        <div className={`flex items-center gap-3 p-3 rounded-lg border ${isDark ? 'bg-blue-600/10 border-blue-500/30' : 'bg-blue-50 border-blue-200'}`}>
                                            <Radio size={18} className="text-blue-500" />
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-blue-500 uppercase">当前节点</span>
                                                <span className="text-sm font-black">{sensorName}</span>
                                            </div>
                                            <Check size={16} className="ml-auto text-blue-500" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr className={`border-dashed ${isDark ? 'border-slate-700' : 'border-gray-200'}`} />

                            {/* Channel Selection */}
                            <div>
                                <h4 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Waves size={16} className="text-blue-500" /> 模态通道选择
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    {AVAILABLE_CHANNELS.map(ch => {
                                        const isSelected = selectedChannels.includes(ch);
                                        return (
                                            <button
                                                key={ch}
                                                onClick={() => handleChannelToggle(ch)}
                                                className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-all ${isSelected ? (isDark ? 'bg-blue-600/20 border-blue-500 text-blue-300' : 'bg-blue-50 border-blue-400 text-blue-700') : (isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-gray-200 hover:bg-gray-50')}`}
                                            >
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${isSelected ? 'bg-blue-500 border-blue-500 text-white' : 'border-slate-400'}`}>
                                                    {isSelected && <Check size={10} />}
                                                </div>
                                                <span className="text-xs font-bold">{ch}</span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Filters & Config */}
                    <div className="w-1/2 flex flex-col gap-6">
                        
                        {/* Status Filter */}
                        <div className={`p-5 rounded-xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
                            <h3 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                                <ShieldCheck size={16} className="text-blue-500" /> 设备状态筛选
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                {STATUS_OPTIONS.map(opt => {
                                    const isSelected = selectedStatuses.includes(opt.level);
                                    return (
                                        <button
                                            key={opt.level}
                                            onClick={() => handleStatusToggle(opt.level)}
                                            className={`px-4 py-3 rounded-lg text-xs font-bold transition-all border flex items-center gap-3
                                                ${isSelected 
                                                    ? (isDark ? 'bg-blue-600/20 border-blue-500 text-blue-400' : 'bg-blue-50 border-blue-600 text-blue-700') 
                                                    : (isDark ? 'bg-slate-900 border-slate-700 opacity-40 hover:opacity-100' : 'bg-white border-gray-200 opacity-60 hover:opacity-100')
                                                }`}
                                        >
                                            <div className="relative flex items-center justify-center w-3 h-3">
                                                <div className={`absolute w-full h-full rounded-full opacity-30 ${isSelected && opt.level !== AlarmLevel.NO_DATA ? 'animate-pulse' : ''}`} style={{ backgroundColor: opt.color }}></div>
                                                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: opt.color }}></div>
                                            </div>
                                            <span className="flex-1 text-left">{opt.label}</span>
                                            {isSelected && <Check size={14} className="opacity-70" />}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Time Config */}
                        <div className={`p-5 rounded-xl border flex-1 flex flex-col ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
                            <h3 className="text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                                <Clock size={16} className="text-blue-500" /> 数据时段配置
                            </h3>
                            <div className="space-y-4 flex-1">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] opacity-40 font-black uppercase tracking-tighter">开始日期</label>
                                        <div className="relative">
                                            <Calendar size={14} className="absolute left-3 top-3 opacity-30" />
                                            <input type="date" value={timeRange.start} onChange={(e) => setTimeRange(prev => ({ ...prev, start: e.target.value }))} className={`w-full pl-10 pr-4 py-2 rounded-lg text-xs border outline-none cursor-pointer ${isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-300 text-slate-800'}`} />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] opacity-40 font-black uppercase tracking-tighter">结束日期</label>
                                        <div className="relative">
                                            <Calendar size={14} className="absolute left-3 top-3 opacity-30" />
                                            <input type="date" value={timeRange.end} onChange={(e) => setTimeRange(prev => ({ ...prev, end: e.target.value }))} className={`w-full pl-10 pr-4 py-2 rounded-lg text-xs border outline-none cursor-pointer ${isDark ? 'bg-slate-900 border-slate-700 text-white focus:border-blue-500' : 'bg-gray-50 border-gray-300 text-slate-800'}`} />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {[{ label: '过去24h', days: 1 }, { label: '最近7天', days: 7 }, { label: '最近30天', days: 30 }].map(btn => (
                                        <button key={btn.label} onClick={() => handlePresetTime(btn.days)} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold border transition-colors ${isDark ? 'bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-400 hover:text-white' : 'bg-gray-100 border-gray-200 hover:bg-gray-200 text-slate-600 hover:text-black'}`}>{btn.label}</button>
                                    ))}
                                </div>
                                <div className={`mt-auto p-3 rounded-lg flex items-center justify-between border ${isDark ? 'bg-blue-500/10 border-blue-500/20' : 'bg-blue-50 border-blue-100'}`}>
                                    <div className="flex items-center gap-2">
                                        <HardDriveDownload size={14} className="text-blue-500" />
                                        <span className="text-xs font-bold opacity-80">预估数据量</span>
                                    </div>
                                    <span className={`text-sm font-black font-mono ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>{estimatedSize}</span>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={triggerExport}
                            disabled={isExporting || selectedChannels.length === 0 || selectedStatuses.length === 0 || !timeRange.start || !timeRange.end}
                            className={`w-full py-4 rounded-xl font-black text-white flex items-center justify-center gap-3 transition-all relative overflow-hidden shadow-xl
                                ${isExporting ? 'bg-slate-700 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.98] shadow-blue-500/20'}
                                ${(selectedChannels.length === 0 || selectedStatuses.length === 0 || !timeRange.start) ? 'opacity-50 grayscale cursor-not-allowed' : ''}
                            `}
                        >
                            {isExporting && <div className="absolute inset-0 bg-blue-400/20 h-full transition-all duration-300" style={{ width: `${exportProgress}%` }}></div>}
                            <div className="relative z-10 flex items-center gap-3">
                                {isExporting ? <Clock size={20} className="animate-spin" /> : <Download size={20} />}
                                {isExporting ? `正在生成下载包 (${exportProgress}%)` : '开始数据下载'}
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

const SensorSettingsModal: React.FC<SensorSettingsModalProps> = ({ 
    isOpen, onClose, isDark, sensorName, sensorSn 
}) => {
    const [activeTab, setActiveTab] = useState<'alarm' | 'correlation' | 'threshold' | 'basic'>('basic');
    const [weights, setWeights] = useState({ uhf: 0.3, tev: 0.5, ae: 0.2 });
    const [basicParams, setBasicParams] = useState({ 
        ip: '192.168.1.100', 
        duration: 5,
        intervals: { uhf: 30, tev: 30, hfct: 60, ae: 60 }
    });

    if (!isOpen) return null;

    const sidebarItems = [
        { id: 'basic', label: '基本参数设置', sub: '采集与传输策略', icon: SlidersHorizontal },
        { id: 'threshold', label: '通道阈值设置', sub: '各级告警触发条件', icon: AlertCircle },
        { id: 'correlation', label: '工频相关性设置', sub: '相位与频率特征匹配', icon: Waves },
        { id: 'alarm', label: '实时报警设置', sub: '系数、权重与阈值', icon: Zap },
    ];

    const inputClass = `w-full px-3 py-2 rounded-lg border outline-none text-center font-mono text-sm font-bold transition-all ${isDark ? 'bg-slate-900 border-slate-600 text-white focus:border-blue-500' : 'bg-white border-gray-300 focus:border-blue-600'}`;

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6 animate-fadeIn" onClick={onClose}>
            <div className={`w-full max-w-5xl h-[800px] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slideInUp border ${isDark ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-gray-200'}`} onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className={`px-6 py-4 border-b flex justify-between items-center ${isDark ? 'border-slate-800 bg-slate-900' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                            <Settings2 size={24} />
                        </div>
                        <div>
                            <h3 className={`font-bold text-xl ${isDark ? 'text-white' : 'text-slate-800'}`}>传感节点参数/阈值设置</h3>
                            <p className="text-xs opacity-50 font-mono mt-0.5">GIS本体综合监测终端 | {sensorSn || 'UNKNOWN'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className={`px-4 py-2 rounded-lg border text-xs font-bold flex items-center gap-2 transition-all ${isDark ? 'border-slate-600 hover:bg-slate-800 text-slate-300' : 'border-gray-300 hover:bg-gray-100 text-slate-600'}`}>
                            <Upload size={14} /> 加载配置模板...
                        </button>
                        <button className={`px-4 py-2 rounded-lg border text-xs font-bold flex items-center gap-2 transition-all ${isDark ? 'border-green-600/50 text-green-400 hover:bg-green-900/20' : 'border-green-600 text-green-700 hover:bg-green-50'}`}>
                            <Plus size={14} /> 存为模板
                        </button>
                        <button onClick={onClose} className={`p-2 rounded-full hover:bg-opacity-20 transition-colors ml-2 ${isDark ? 'hover:bg-white text-slate-400' : 'hover:bg-black text-slate-500'}`}>
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Sidebar */}
                    <div className={`w-72 flex-shrink-0 border-r p-4 space-y-2 overflow-y-auto ${isDark ? 'border-slate-800 bg-slate-900/50' : 'border-gray-200 bg-gray-50'}`}>
                        {sidebarItems.map(item => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id as any)}
                                className={`w-full flex items-start gap-4 p-4 rounded-xl text-left transition-all group
                                    ${activeTab === item.id 
                                        ? (isDark ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'bg-blue-600 text-white shadow-lg shadow-blue-200') 
                                        : (isDark ? 'text-slate-400 hover:bg-slate-800 hover:text-slate-200' : 'text-slate-500 hover:bg-white hover:shadow-sm')
                                    }
                                `}
                            >
                                <item.icon size={24} className={`mt-1 flex-shrink-0 ${activeTab === item.id ? 'opacity-100' : 'opacity-50 group-hover:opacity-100'}`} />
                                <div>
                                    <div className="font-bold text-sm mb-1">{item.label}</div>
                                    <div className={`text-[10px] ${activeTab === item.id ? 'opacity-80' : 'opacity-50'}`}>{item.sub}</div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Content Area */}
                    <div className={`flex-1 p-8 overflow-y-auto custom-scrollbar relative ${isDark ? 'bg-[#0f172a]' : 'bg-white'}`}>
                        
                        {/* Tab: Alarm */}
                        {activeTab === 'alarm' && (
                            <div className="space-y-8 animate-fadeIn">
                                <h2 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    <Zap className="text-blue-500" /> 实时报警设置
                                </h2>

                                <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                                    <div className="text-xs font-bold opacity-60 mb-4 flex items-center gap-2">
                                        <List size={14} /> 报警系数定义
                                    </div>
                                    <div className="grid grid-cols-4 gap-4">
                                        {[{l:'正常',v:0,c:'green'},{l:'一级',v:1,c:'yellow'},{l:'二级',v:2,c:'orange'},{l:'三级',v:3,c:'red'}].map(lvl => (
                                            <div key={lvl.l} className={`p-4 rounded-xl border text-center ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-300'}`}>
                                                <div className={`text-xs font-bold mb-2 text-${lvl.c}-500`}>{lvl.l}</div>
                                                <div className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{lvl.v}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="text-xs font-bold opacity-60 flex items-center gap-2"><Scale size={14} /> 权重设置</div>
                                        <div className="text-xs font-mono px-2 py-1 rounded bg-green-500/20 text-green-500 border border-green-500/30">总和: 1 (目标: 1.0)</div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-6">
                                        {['UHF', 'TEV', 'AE'].map(ch => (
                                            <div key={ch}>
                                                <div className="text-xs font-bold mb-2 opacity-70">{ch}</div>
                                                <input className={inputClass} defaultValue={ch === 'UHF' ? 0.3 : ch === 'TEV' ? 0.5 : 0.2} />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                                    <div className="text-xs font-bold opacity-60 mb-2 flex items-center gap-2"><AlertOctagon size={14} /> 实时报警判断阈值</div>
                                    <div className="text-[10px] opacity-40 mb-6">报警阈值 X = UHF*系数*权重 + TEV*系数*权重 + AE*系数*权重</div>
                                    
                                    <div className="grid grid-cols-3 gap-4 mb-8">
                                        <div className={`p-4 rounded-xl border relative overflow-hidden ${isDark ? 'bg-green-500/5 border-green-500/20' : 'bg-green-50 border-green-200'}`}>
                                            <div className="text-green-500 font-bold text-lg mb-2">正常</div>
                                            <div className="text-xs opacity-60 mb-2">0 ≤ X &lt;</div>
                                            <input className="w-16 px-2 py-1 rounded bg-transparent border border-green-500/50 text-green-500 font-mono text-center font-bold" defaultValue="0.5" />
                                        </div>
                                        <div className={`p-4 rounded-xl border relative overflow-hidden ${isDark ? 'bg-yellow-500/5 border-yellow-500/20' : 'bg-yellow-50 border-yellow-200'}`}>
                                            <div className="text-yellow-500 font-bold text-lg mb-2">一级</div>
                                            <div className="flex items-center gap-2 text-xs opacity-60 mb-2">
                                                <span>0.5 ≤ X &lt;</span>
                                                <input className="w-12 px-1 py-0.5 rounded bg-transparent border border-yellow-500/50 text-yellow-500 font-mono text-center" defaultValue="1.4" />
                                            </div>
                                        </div>
                                        <div className={`p-4 rounded-xl border relative overflow-hidden ${isDark ? 'bg-orange-500/5 border-orange-500/20' : 'bg-orange-50 border-orange-200'}`}>
                                            <div className="text-orange-500 font-bold text-lg mb-2">二级</div>
                                            <div className="flex items-center gap-2 text-xs opacity-60 mb-2">
                                                <span>1.4 ≤ X &lt;</span>
                                                <input className="w-12 px-1 py-0.5 rounded bg-transparent border border-orange-500/50 text-orange-500 font-mono text-center" defaultValue="2.1" />
                                            </div>
                                        </div>
                                        <div className={`p-4 rounded-xl border relative overflow-hidden ${isDark ? 'bg-red-500/5 border-red-500/20' : 'bg-red-50 border-red-200'}`}>
                                            <div className="text-red-500 font-bold text-lg mb-2">三级</div>
                                            <div className="text-xs opacity-60 mb-2">2.1 ≤ X</div>
                                        </div>
                                    </div>

                                    {/* Gradient Bar */}
                                    <div className="relative h-2 rounded-full w-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"></div>
                                    <div className="flex justify-between text-[10px] font-mono mt-2 opacity-50 px-1">
                                        <span>0</span><span>0.5</span><span>1.4</span><span>2.1</span><span>MAX</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Tab: Correlation */}
                        {activeTab === 'correlation' && (
                            <div className="space-y-6 animate-fadeIn">
                                <h2 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    <Waves className="text-blue-500" /> 工频相关性设置
                                </h2>
                                <p className="text-xs opacity-50 mb-6">针对不同通道设置相位窗口与频率相关性阈值，用于特征识别与干扰过滤。</p>

                                {['UHF', 'TEV', 'HFCT'].map(ch => (
                                    <div key={ch} className={`p-6 rounded-2xl border mb-4 ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                                        <div className="flex items-center gap-3 mb-6 border-b border-dashed border-gray-500/20 pb-4">
                                            <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-bold">{ch}</div>
                                            <span className="text-xs font-bold opacity-60">通道参数配置</span>
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-12">
                                            <div>
                                                <div className={`text-xs font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-800'}`}><Activity size={14} /> 相位相关性 (Phase)</div>
                                                <div className="space-y-4 pl-4">
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-mono text-sm font-bold opacity-70">36 ±</span>
                                                        <div className="flex items-center gap-2">
                                                            <input className="w-16 px-2 py-1.5 rounded border bg-transparent text-center font-bold outline-none border-gray-500/30 focus:border-blue-500" defaultValue="2" />
                                                            <span className="text-xs opacity-50">deg</span>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-mono text-sm font-bold opacity-70">72 ±</span>
                                                        <div className="flex items-center gap-2">
                                                            <input className="w-16 px-2 py-1.5 rounded border bg-transparent text-center font-bold outline-none border-gray-500/30 focus:border-blue-500" defaultValue="2" />
                                                            <span className="text-xs opacity-50">deg</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            
                                            <div>
                                                <div className={`text-xs font-bold mb-4 flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-800'}`}><Waves size={14} /> 工频相关性 (Corr)</div>
                                                <div className="pl-4 pt-4">
                                                    <div className="flex items-center gap-4">
                                                        <span className="font-mono text-sm font-bold opacity-70">≥</span>
                                                        <input className={`flex-1 px-4 py-2 rounded-lg border bg-transparent text-center font-bold font-mono outline-none ${isDark ? 'border-slate-600 focus:border-blue-500' : 'border-gray-300 focus:border-blue-600'}`} defaultValue="0.8" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Tab: Threshold */}
                        {activeTab === 'threshold' && (
                            <div className="space-y-6 animate-fadeIn">
                                <h2 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    <AlertCircle className="text-blue-500" /> 通道阈值设置
                                </h2>
                                <div className="text-xs opacity-50 mb-6 bg-blue-500/10 p-3 rounded-lg border border-blue-500/20 flex items-center gap-2">
                                    <Info size={14} className="text-blue-500" />
                                    设置各监测通道触发不同告警等级的阈值条件。当实测值超过设定值时，系统将自动产生告警事件。
                                </div>

                                {[{l:'一级',c:'yellow'}, {l:'二级',c:'orange'}, {l:'三级',c:'red'}].map(level => (
                                    <div key={level.l} className={`p-6 rounded-2xl border mb-6 ${isDark ? 'bg-slate-900/50 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                                        <div className={`text-sm font-black mb-6 flex items-center gap-2 text-${level.c}-500`}>
                                            <div className={`w-2 h-2 rounded-full bg-${level.c}-500`}></div> {level.l}
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-12">
                                            <div>
                                                <div className="text-xs font-bold opacity-40 uppercase tracking-widest mb-4 border-b border-dashed border-gray-500/20 pb-2">幅值阈值</div>
                                                <div className="space-y-3">
                                                    {[{n:'TEV',v: level.l==='一级'?35:46}, {n:'HFCT',v: level.l==='一级'?37:47}, {n:'AE',v: level.l==='一级'?39:47}].map(item => (
                                                        <div key={item.n} className="flex items-center justify-between group">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-2 h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-300'}`}></div>
                                                                <span className="font-bold text-sm w-12">{item.n}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <input className={`w-32 px-3 py-2 rounded border bg-transparent text-center font-bold font-mono outline-none ${isDark ? 'border-slate-600 focus:border-blue-500' : 'border-gray-300 focus:border-blue-600'}`} defaultValue={item.v} />
                                                                <span className="text-xs opacity-50 w-8">dBmV</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs font-bold opacity-40 uppercase tracking-widest mb-4 border-b border-dashed border-gray-500/20 pb-2">频次阈值</div>
                                                <div className="space-y-3">
                                                    {[{n:'TEV',v: level.l==='一级'?302:500}, {n:'HFCT',v: level.l==='一级'?301:502}, {n:'AE',v: level.l==='一级'?302:503}].map(item => (
                                                        <div key={item.n} className="flex items-center justify-between group">
                                                            <div className="flex items-center gap-2">
                                                                <div className={`w-2 h-2 rounded-full ${isDark ? 'bg-slate-700' : 'bg-gray-300'}`}></div>
                                                                <span className="font-bold text-sm w-12">{item.n}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <input className={`w-32 px-3 py-2 rounded border bg-transparent text-center font-bold font-mono outline-none ${isDark ? 'border-slate-600 focus:border-blue-500' : 'border-gray-300 focus:border-blue-600'}`} defaultValue={item.v} />
                                                                <span className="text-xs opacity-50 w-8">次/秒</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Tab: Basic */}
                        {activeTab === 'basic' && (
                            <div className="space-y-8 animate-fadeIn">
                                <h2 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                    <SlidersHorizontal className="text-blue-500" /> 基本参数设置
                                </h2>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400"><Network size={20} /></div>
                                            <span className="font-bold">传感节点 IP 地址</span>
                                        </div>
                                        <p className="text-xs opacity-50 mb-4 h-8">用于网络通信的静态 IP 配置</p>
                                        <input 
                                            className={`w-full text-center font-mono text-lg font-bold py-3 rounded-xl border outline-none focus:border-blue-500 ${isDark ? 'bg-slate-900 border-slate-600 text-white' : 'bg-white border-gray-300'}`}
                                            value={basicParams.ip}
                                            onChange={(e) => setBasicParams({...basicParams, ip: e.target.value})}
                                        />
                                    </div>

                                    <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400"><Clock size={20} /></div>
                                            <span className="font-bold">采集时长</span>
                                        </div>
                                        <p className="text-xs opacity-50 mb-4 h-8">单次采样持续的时间窗口</p>
                                        <div className="flex items-center gap-3">
                                            <input 
                                                type="number" 
                                                className={`flex-1 text-center font-mono text-lg font-bold py-2 rounded-lg border outline-none focus:border-blue-500 ${isDark ? 'bg-slate-900 border-slate-600 text-white' : 'bg-white border-gray-300'}`}
                                                value={basicParams.duration}
                                                onChange={(e) => setBasicParams({...basicParams, duration: Number(e.target.value)})}
                                            />
                                            <span className="font-bold opacity-50">秒 (s)</span>
                                        </div>
                                    </div>
                                </div>

                                <div className={`p-6 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-gray-50 border-gray-200'}`}>
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 rounded-lg bg-purple-500/20 text-purple-400"><Wifi size={20} /></div>
                                        <span className="font-bold">各通道传输间隔 (分钟)</span>
                                    </div>
                                    <p className="text-xs opacity-50 mb-6">设置不同模态通道数据上传至服务器的周期。</p>
                                    
                                    <div className="grid grid-cols-2 gap-6">
                                        {['UHF', 'TEV', 'HFCT', 'AE'].map(ch => (
                                            <div key={ch} className="flex items-center justify-between">
                                                <span className="font-bold text-sm">{ch}</span>
                                                <div className="flex items-center gap-2">
                                                    <input 
                                                        type="number"
                                                        className={`w-24 px-3 py-2 rounded border text-center font-bold font-mono outline-none ${isDark ? 'bg-slate-900 border-slate-600 focus:border-blue-500' : 'bg-white border-gray-300 focus:border-blue-600'}`}
                                                        defaultValue={ch === 'HFCT' || ch === 'AE' ? 60 : 30}
                                                    />
                                                    <span className="text-xs opacity-50">min</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className={`p-4 rounded-xl border text-xs flex items-center gap-3 ${isDark ? 'bg-blue-500/10 border-blue-500/20 text-blue-300' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                                    <Info size={16} />
                                    注意：传输间隔设置会显著影响网络带宽占用和设备功耗。建议根据项目场景进行适配调整。
                                </div>
                            </div>
                        )}

                    </div>
                </div>

                {/* Footer */}
                <div className={`px-8 py-5 border-t flex justify-between items-center ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="text-xs opacity-40">更改将在保存后立即生效</div>
                    <div className="flex gap-4">
                        <button 
                            onClick={onClose}
                            className={`px-6 py-2 rounded-xl font-bold text-sm transition-all ${isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-gray-200 text-slate-600'}`}
                        >
                            取消
                        </button>
                        <button 
                            onClick={onClose}
                            className="px-8 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-500/30 hover:bg-blue-700 active:scale-95 transition-all flex items-center gap-2"
                        >
                            <Save size={16} /> 应用配置
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ... PointDetailModal ... (Unchanged)
const PointDetailModal: React.FC<PointDetailModalProps> = ({ data, onClose, isDark }) => {
  const [activeTab, setActiveTab] = useState<ChartTab>('PRPD');
  const [activeChannel, setActiveChannel] = useState<ChannelType>('UHF');
  
  const prpdData = useMemo(() => generatePRPDData(activeChannel), [activeChannel, data]);
  const prpsData = useMemo(() => generatePRPSData(activeChannel), [activeChannel, data]);
  const pulseData = useMemo(() => generatePulseData(), [activeChannel, data]);
  const corrData = useMemo(() => generateCorrelationData(), [activeChannel, data]);

  if (!data) return null;

  const dateStr = formatDate(data.time);
  const config = CHANNEL_CONFIG[activeChannel];
  
  // Calculate diagnosis based on current point data and active channel
  const ampValue = data[config.ampKey] as number;
  const freqValue = data[config.freqKey] as number;
  const diagnosis = getAIDiagnosis(activeChannel, ampValue, freqValue);

  const getPRPSColor = (amp: number) => {
      if (amp < 20) return '#38BDF8'; 
      if (amp < 40) return '#22D3EE'; 
      if (amp < 60) return '#FACC15'; 
      return '#EF4444'; 
  };

  const renderChart = () => {
      switch (activeTab) {
        case 'PRPD':
            return (
                <div className="w-full h-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} />
                            <XAxis type="number" dataKey="x" name="Phase" unit="°" domain={[0, 360]} tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10 }} />
                            <YAxis type="number" dataKey="y" name="Amp" unit="dBmV" domain={[-10, 80]} tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10 }} />
                            <ZAxis type="number" dataKey="z" range={[20, 100]} />
                            <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#fff', borderColor: isDark ? '#334155' : '#e2e8f0' }} />
                            <Scatter name="Discharge" data={prpdData} fill={config.color} shape="circle" />
                        </ScatterChart>
                    </ResponsiveContainer>
                </div>
            );
         case 'PRPS':
             return (
                 <div className="w-full h-full relative">
                     <div className="absolute top-0 right-4 z-10 text-[10px] opacity-60 flex gap-2">
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-400"></div> Low</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-400"></div> Med</span>
                        <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500"></div> High</span>
                     </div>
                     <ResponsiveContainer width="100%" height="100%">
                         <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 0 }}>
                             <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} opacity={0.3} />
                             <XAxis type="number" dataKey="phase" name="Phase" unit="°" domain={[0, 360]} tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10 }} />
                             <YAxis type="number" dataKey="cycle" name="Cycle" unit="" domain={[0, 50]} tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10 }} reversed />
                             <ZAxis range={[60, 60]} /> 
                             <Tooltip 
                                cursor={{ strokeDasharray: '3 3' }} 
                                contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#fff', borderColor: isDark ? '#334155' : '#e2e8f0' }}
                                formatter={(value: any, name: any, props: any) => {
                                    if (name === 'Cycle') return [value, 'Cycle'];
                                    if (name === 'Phase') return [value, 'Phase'];
                                    if (props && props.payload) return [`${props.payload.amp.toFixed(1)} dBmV`, 'Amplitude'];
                                    return [value, name];
                                }}
                             />
                             <Scatter name="Pulse Sequence" data={prpsData} shape="square">
                                {prpsData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={getPRPSColor(entry.amp)} />
                                ))}
                             </Scatter>
                         </ScatterChart>
                     </ResponsiveContainer>
                 </div>
             );
         case 'PULSE':
             return (
                <div className="w-full h-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={pulseData} margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} opacity={0.5} />
                            <XAxis dataKey="time" type="number" domain={[0, 100]} tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10 }} />
                            <YAxis domain={[-100, 100]} tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10 }} />
                            <Tooltip contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#fff', borderColor: isDark ? '#334155' : '#e2e8f0' }} />
                            <Line type="monotone" dataKey="value" stroke={config.color} strokeWidth={2} dot={false} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
             );
         case 'CORRELATION':
              return (
                <div className="w-full h-full relative">
                    <ResponsiveContainer width="100%" height="100%">
                         <LineChart data={corrData} margin={{ top: 20, right: 20, bottom: 20, left: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} opacity={0.5} />
                            <XAxis dataKey="index" tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10 }} />
                            <YAxis domain={[-0.2, 1]} tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10 }} />
                            <Tooltip contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#fff', borderColor: isDark ? '#334155' : '#e2e8f0' }} />
                            <Line type="monotone" dataKey="value" stroke={config.color} strokeWidth={2} dot={{ r: 2 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            );
      }
  };

  return (
    <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn" onClick={(e) => e.target === e.currentTarget && onClose()}>
       <div className={`relative w-[95vw] h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slideInUp border ${isDark ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-gray-200'}`}>
          <div className={`px-6 py-3 border-b flex justify-between items-center flex-shrink-0 ${isDark ? 'border-slate-800 bg-slate-900' : 'bg-gray-50 border-gray-100'}`}>
             <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}><Activity size={20} /></div>
                <div>
                   <h3 className={`font-bold text-lg flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                      图谱详情分析 <span className={`text-xs px-2 py-0.5 rounded border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-gray-200'}`}>{activeChannel} 通道</span>
                   </h3>
                   <div className="flex items-center gap-3 text-xs opacity-60 font-mono">
                      <span className="flex items-center gap-1"><Clock size={12}/> {dateStr}</span>
                   </div>
                </div>
             </div>
             <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-200 text-slate-500'}`}><X size={24} /></button>
          </div>
          <div className="flex flex-1 overflow-hidden">
             <div className={`w-20 flex flex-col items-center py-6 gap-4 border-r ${isDark ? 'bg-slate-900/50 border-slate-800' : 'bg-gray-50 border-gray-100'}`}>
                 {(['UHF', 'TEV', 'AE', 'HFCT'] as ChannelType[]).map(type => (
                     <button key={type} onClick={() => setActiveChannel(type)} className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center gap-1 transition-all ${activeChannel === type ? `bg-slate-800 border-2 border-[${CHANNEL_CONFIG[type].color}] shadow-lg` : 'opacity-50 hover:opacity-100'}`} style={{ borderColor: activeChannel === type ? CHANNEL_CONFIG[type].color : 'transparent' }}>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHANNEL_CONFIG[type].color }}></div>
                        <span className={`text-[10px] font-bold ${activeChannel === type ? 'text-white' : ''}`}>{type}</span>
                     </button>
                 ))}
             </div>
             <div className="flex-1 flex flex-col min-w-0 bg-opacity-50" style={{ backgroundColor: isDark ? '#020617' : '#ffffff' }}>
                 <div className={`flex border-b px-4 ${isDark ? 'border-slate-800' : 'border-gray-100'}`}>
                     {[
                         { id: 'PRPD', label: 'PRPD 图谱', icon: Grid },
                         { id: 'PRPS', label: 'PRPS 三维图', icon: Layers },
                         { id: 'PULSE', label: '放电脉冲', icon: Activity },
                         { id: 'CORRELATION', label: '工频相关性', icon: BarChart }
                     ].map(tab => (
                         <button key={tab.id} onClick={() => setActiveTab(tab.id as ChartTab)} className={`px-6 py-4 text-sm font-bold flex items-center gap-2 border-b-2 transition-all ${activeTab === tab.id ? `border-blue-500 ${isDark ? 'text-blue-400 bg-blue-500/5' : 'text-blue-600 bg-blue-50'}` : 'border-transparent opacity-50 hover:opacity-100'}`}>
                             <tab.icon size={16} />{tab.label}
                         </button>
                     ))}
                 </div>
                 
                 {/* AI Diagnosis Result Banner */}
                 <div className={`px-6 py-3 border-b flex items-center justify-between ${isDark ? 'bg-slate-800/30 border-slate-800' : 'bg-blue-50/50 border-blue-100'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-md ${isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-indigo-100 text-indigo-600'}`}>
                            <BrainCircuit size={18} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold opacity-60 uppercase">AI 识别结果</span>
                                <span className={`text-sm font-black ${diagnosis.color}`}>{diagnosis.type}</span>
                            </div>
                            <div className={`text-[10px] truncate max-w-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                {diagnosis.desc}
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col items-end">
                        <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold opacity-60">置信度</span>
                            <span className={`font-mono font-black text-lg ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {(diagnosis.confidence * 100).toFixed(1)}%
                            </span>
                        </div>
                        <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden dark:bg-slate-700">
                            <div 
                                className={`h-full rounded-full transition-all duration-500 ${diagnosis.confidence > 0.9 ? 'bg-green-500' : diagnosis.confidence > 0.8 ? 'bg-blue-500' : 'bg-yellow-500'}`} 
                                style={{ width: `${diagnosis.confidence * 100}%` }}
                            ></div>
                        </div>
                    </div>
                 </div>

                 <div className="flex-1 p-6 relative">
                     {renderChart()}
                 </div>
             </div>
          </div>
       </div>
    </div>
  );
};

const TimeSelector: React.FC<TimeSelectorProps> = ({ 
    timeRange, onTimeRangeChange, showDatePicker, setShowDatePicker,
    customStart, setCustomStart, customEnd, setCustomEnd, isDark
}) => {
    return (
        <div className="flex items-center gap-2">
            <div className="relative group">
               <select 
                  className={`pl-8 pr-8 py-1.5 rounded-lg text-xs font-bold border outline-none appearance-none cursor-pointer transition-all ${isDark ? 'bg-slate-900 border-slate-600 text-slate-300 hover:border-slate-500' : 'bg-white border-gray-300 text-slate-700 hover:border-gray-400'}`}
                  value={timeRange}
                  onChange={onTimeRangeChange}
               >
                   <option value="24h">最近 24 小时</option>
                   <option value="7d">最近 7 天</option>
                   <option value="1m">最近 1 个月</option>
                   <option value="custom">自定义时间段</option>
               </select>
               <Clock size={14} className={`absolute left-2.5 top-2 pointer-events-none ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
               <ChevronDown size={12} className={`absolute right-2.5 top-2 pointer-events-none opacity-50`} />
            </div>

            {showDatePicker && (
                <div className={`flex items-center gap-2 text-xs animate-fadeIn ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    <input type="datetime-local" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className={`px-2 py-1.5 rounded border outline-none ${isDark ? 'bg-slate-900 border-slate-600' : 'bg-white border-gray-300'}`} />
                    <span>至</span>
                    <input type="datetime-local" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className={`px-2 py-1.5 rounded border outline-none ${isDark ? 'bg-slate-900 border-slate-600' : 'bg-white border-gray-300'}`} />
                </div>
            )}
        </div>
    )
}

const DataListModal: React.FC<DataListModalProps> = ({ 
  isOpen, onClose, data, isDark, sensorName, sensorId,
  timeRange, onTimeRangeChange, showDatePicker, setShowDatePicker,
  customStart, setCustomStart, customEnd, setCustomEnd, onViewDetail
}) => {
    // Data list implementation remains unchanged
    const [statusFilter, setStatusFilter] = useState<AlarmLevel[]>([
      AlarmLevel.NORMAL, AlarmLevel.WARNING, AlarmLevel.DANGER, AlarmLevel.CRITICAL
    ]);
    const sn = sensorId ? `SF-UHF-${sensorId.split('-')[1] || '001'}` : 'SF-UNKNOWN';
    
    const getPointStatus = (point: ChartDataPoint): AlarmLevel => {
        let maxLevel = AlarmLevel.NORMAL;
        (['UHF', 'TEV', 'AE'] as ChannelType[]).forEach(type => {
            const level = getPointAlarmLevel(type, point[CHANNEL_CONFIG[type].ampKey] as number, point[CHANNEL_CONFIG[type].freqKey] as number);
            if (level === AlarmLevel.CRITICAL) maxLevel = AlarmLevel.CRITICAL;
            else if (level === AlarmLevel.DANGER && maxLevel !== AlarmLevel.CRITICAL) maxLevel = AlarmLevel.DANGER;
            else if (level === AlarmLevel.WARNING && maxLevel === AlarmLevel.NORMAL) maxLevel = AlarmLevel.WARNING;
        });
        return maxLevel;
    };

    const toggleStatus = (status: AlarmLevel) => {
        setStatusFilter(prev => prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]);
    };
    const filteredData = useMemo(() => {
        return data.filter(point => statusFilter.includes(getPointStatus(point)));
    }, [data, statusFilter]);

    const handleDownloadCSV = () => {
        // ... CSV download logic unchanged
        const headers = ["时间戳", "名称", "SN号", "状态", "UHF幅值(dBmV)", "TEV幅值(dBmV)", "HFCT幅值(dBmV)", "AE幅值(dBmV)", "温度(°C)", "湿度(%)"];
        const rows = filteredData.map(d => [
            d.time.replace('T', ' '), sensorName, sn, getPointStatus(d), d.uhf_amp.toFixed(2), d.tev_amp.toFixed(2), d.hfct_amp.toFixed(2), d.ae_amp.toFixed(2), d.temperature.toFixed(1), d.humidity.toFixed(1)
        ]);
        const csvContent = "\uFEFF" + [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `${sensorName}_data.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
            <div className={`w-full max-w-7xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slideInUp border ${isDark ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-gray-200'}`}>
                {/* Header */}
                <div className={`px-6 py-4 border-b flex justify-between items-center ${isDark ? 'border-slate-800 bg-slate-800' : 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}><List size={20} /></div>
                        <div>
                            <h3 className={`font-bold text-lg ${isDark ? 'text-white' : 'text-slate-800'}`}>数据列表</h3>
                            <p className="text-xs opacity-50 flex items-center gap-2">{sensorName} <span className="px-1.5 py-0.5 rounded bg-gray-500/10 border border-gray-500/20 font-mono">{sn}</span></p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Filters */}
                         <div className={`hidden md:flex items-center gap-1 mr-2 pr-4 border-r ${isDark ? 'border-slate-700' : 'border-gray-200'}`}>
                            {[
                                { level: AlarmLevel.NORMAL, label: '正常', color: '#22c55e' },
                                { level: AlarmLevel.WARNING, label: '一级', color: '#eab308' },
                                { level: AlarmLevel.DANGER, label: '二级', color: '#f97316' },
                                { level: AlarmLevel.CRITICAL, label: '三级', color: '#ef4444' }
                            ].map(opt => {
                                const isActive = statusFilter.includes(opt.level);
                                return (
                                    <button
                                        key={opt.level}
                                        onClick={() => toggleStatus(opt.level)}
                                        className={`px-2 py-1 rounded text-[10px] font-bold border transition-all flex items-center gap-1.5
                                            ${isActive 
                                                ? 'bg-opacity-10 border-opacity-30' 
                                                : 'opacity-40 hover:opacity-100 grayscale border-transparent'
                                            }
                                        `}
                                        style={{
                                            backgroundColor: isActive ? opt.color + '20' : (isDark ? '#1e293b' : '#f1f5f9'),
                                            borderColor: isActive ? opt.color : 'transparent',
                                            color: isActive ? opt.color : (isDark ? '#94a3b8' : '#64748b')
                                        }}
                                    >
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: opt.color }}></div>
                                        {opt.label}
                                    </button>
                                )
                            })}
                         </div>

                         <TimeSelector timeRange={timeRange} onTimeRangeChange={onTimeRangeChange} showDatePicker={showDatePicker} setShowDatePicker={setShowDatePicker} customStart={customStart} setCustomStart={setCustomStart} customEnd={customEnd} setCustomEnd={setCustomEnd} isDark={isDark} />
                        <button onClick={handleDownloadCSV} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold border transition-all ${isDark ? 'bg-green-600/20 border-green-600/50 text-green-400' : 'bg-green-50 border-green-200 text-green-600'}`}><FileDown size={14} /> 导出 CSV</button>
                        <button onClick={onClose} className={`p-2 rounded-full hover:bg-opacity-20 ${isDark ? 'hover:bg-white text-slate-400' : 'hover:bg-black text-slate-500'}`}><X size={24} /></button>
                    </div>
                </div>
                {/* Table */}
                <div className="flex-1 overflow-auto custom-scrollbar">
                    <table className="w-full text-left text-xs border-collapse">
                        <thead className={`sticky top-0 z-10 ${isDark ? 'bg-slate-900 text-slate-400 shadow-md' : 'bg-gray-50 text-slate-500 border-b border-gray-200'}`}>
                            <tr>
                                <th className="px-4 py-3 whitespace-nowrap">时间戳</th>
                                <th className="px-4 py-3 whitespace-nowrap text-center">状态</th>
                                <th className="px-4 py-3 whitespace-nowrap text-right text-blue-500">UHF 幅值</th>
                                <th className="px-4 py-3 whitespace-nowrap text-right text-purple-500">TEV 幅值</th>
                                <th className="px-4 py-3 whitespace-nowrap text-right text-indigo-500">HFCT 幅值</th>
                                <th className="px-4 py-3 whitespace-nowrap text-right text-pink-500">AE 幅值</th>
                                <th className="px-4 py-3 whitespace-nowrap text-right text-orange-500">温度 (°C)</th>
                                <th className="px-4 py-3 whitespace-nowrap text-right text-cyan-500">湿度 (%)</th>
                                <th className="px-4 py-3 whitespace-nowrap text-center">操作</th>
                            </tr>
                        </thead>
                        <tbody className={`divide-y divide-gray-500/10 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                            {filteredData.map((row, i) => {
                                const status = getPointStatus(row);
                                return (
                                    <tr key={i} className={`hover:bg-black/5 transition-colors ${isDark ? 'hover:bg-white/5' : ''}`}>
                                        <td className="px-4 py-2 font-mono opacity-80">{row.time.replace('T', ' ').substring(0, 19)}</td>
                                        <td className="px-4 py-2 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border inline-flex items-center gap-1 ${status === AlarmLevel.NORMAL ? 'bg-green-500/10 text-green-500 border-green-500/20' : status === AlarmLevel.WARNING ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : status === AlarmLevel.DANGER ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                                {status === AlarmLevel.NORMAL ? '正常' : status === AlarmLevel.WARNING ? '一级' : status === AlarmLevel.DANGER ? '二级' : '三级'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-right font-mono">{row.uhf_amp.toFixed(1)}</td>
                                        <td className="px-4 py-2 text-right font-mono">{row.tev_amp.toFixed(1)}</td>
                                        <td className="px-4 py-2 text-right font-mono">{row.hfct_amp.toFixed(1)}</td>
                                        <td className="px-4 py-2 text-right font-mono">{row.ae_amp.toFixed(1)}</td>
                                        <td className="px-4 py-2 text-right font-mono border-l border-dashed border-gray-500/10 text-orange-500/90">{row.temperature.toFixed(1)}</td>
                                        <td className="px-4 py-2 text-right font-mono text-cyan-500/90">{row.humidity.toFixed(1)}</td>
                                        <td className="px-4 py-2 text-center">
                                            <button 
                                                onClick={() => onViewDetail(row)}
                                                className={`p-1.5 rounded-lg transition-colors flex items-center justify-center mx-auto ${isDark ? 'hover:bg-blue-500/20 text-blue-400' : 'hover:bg-blue-100 text-blue-600'}`}
                                                title="查看图谱详情"
                                            >
                                                <Eye size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

const TrendAnalysis: React.FC<TrendAnalysisProps> = ({ isDark, sensorName, sensorId, sensorSn, deviceName, projectName }) => {
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showDataList, setShowDataList] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [selectedPoint, setSelectedPoint] = useState<ChartDataPoint | null>(null);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('elec');
  const [selectedChannels, setSelectedChannels] = useState<ChannelType[]>(['UHF', 'TEV']);
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);
  const sn = sensorSn || (sensorId ? `SF-UHF-${sensorId.split('-')[1] || '001'}` : 'SF-UNKNOWN');

  useEffect(() => {
    const dStart = customStart ? new Date(customStart) : undefined;
    const dEnd = customEnd ? new Date(customEnd) : undefined;
    setChartData(generateData(timeRange, sensorId, dStart, dEnd));
  }, [timeRange, sensorId, customStart, customEnd]);

  const handleTimeRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      const val = e.target.value as TimeRange;
      setTimeRange(val);
      setShowDatePicker(val === 'custom');
  };

  const toggleChannel = (channel: ChannelType) => {
      setSelectedChannels(prev => prev.includes(channel) ? prev.filter(c => c !== channel) : [...prev, channel]);
  };

  const handleChartClick = (e: any) => {
    // Robust check for payload presence
    if (e && e.activePayload && e.activePayload.length > 0) {
        setSelectedPoint(e.activePayload[0].payload);
    }
  };

  return (
    <div className={`relative w-full h-full flex flex-col rounded-xl border transition-colors duration-300 overflow-hidden ${isDark ? 'bg-tech-card border-slate-700' : 'bg-white border-gray-200 shadow-sm'}`}>
      {/* Header */}
      <div className={`px-4 py-3 flex justify-between items-center z-10 ${isDark ? 'bg-slate-900/30' : 'bg-gray-50/70 border-b border-gray-100'}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isDark ? 'bg-blue-600/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}><BarChart3 size={20} /></div>
          <div>
              <h2 className={`text-base font-bold flex items-center gap-2 leading-none ${isDark ? 'text-white' : 'text-slate-800'}`}>{sensorName} - 趋势分析</h2>
              <span className={`text-[10px] font-mono opacity-50 mt-1 block ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>SN: {sn}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <TimeSelector timeRange={timeRange} onTimeRangeChange={handleTimeRangeChange} showDatePicker={showDatePicker} setShowDatePicker={setShowDatePicker} customStart={customStart} setCustomStart={setCustomStart} customEnd={customEnd} setCustomEnd={setCustomEnd} isDark={isDark} />
            <div className={`w-px h-6 mx-1 ${isDark ? 'bg-slate-700' : 'bg-gray-300'}`}></div>
            <button onClick={() => setShowDataList(true)} className={`p-1.5 rounded-lg transition-all ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-200 text-slate-500'}`} title="查看数据列表"><List size={18} /></button>
            <button onClick={() => setShowDownloadModal(true)} className={`p-1.5 rounded-lg transition-all ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-200 text-slate-500'}`} title="数据下载"><Download size={18} /></button>
            <button onClick={() => setShowSettingsModal(true)} className={`p-1.5 rounded-lg transition-all ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-200 text-slate-500'}`} title="参数设置"><Settings size={18} /></button>
        </div>
      </div>

      {/* Toolbar */}
      <div className={`px-4 py-2 border-b flex justify-between items-center gap-4 ${isDark ? 'bg-slate-800/20 border-slate-800' : 'bg-gray-50/50 border-gray-100'}`}>
          <div className={`flex p-1 rounded-lg border ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
              <button onClick={() => setAnalysisMode('elec')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${analysisMode === 'elec' ? (isDark ? 'bg-blue-600 text-white shadow' : 'bg-blue-100 text-blue-700') : 'opacity-60 hover:opacity-100'}`}><Zap size={14} /> 电磁和声学</button>
              <button onClick={() => setAnalysisMode('env')} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${analysisMode === 'env' ? (isDark ? 'bg-blue-600 text-white shadow' : 'bg-blue-100 text-blue-700') : 'opacity-60 hover:opacity-100'}`}><Thermometer size={14} /> 温湿度</button>
          </div>
          {analysisMode === 'elec' && (
              <div className="flex items-center gap-2">
                  {(['UHF', 'TEV', 'HFCT', 'AE'] as ChannelType[]).map(type => {
                      const isActive = selectedChannels.includes(type);
                      const config = CHANNEL_CONFIG[type];
                      return (
                          <button key={type} onClick={() => toggleChannel(type)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-bold transition-all ${isActive ? `bg-opacity-20 border-opacity-50` : `opacity-50 grayscale border-transparent hover:opacity-100 hover:grayscale-0 hover:bg-white/5`}`} style={{ backgroundColor: isActive ? config.color + '20' : 'transparent', borderColor: isActive ? config.color : isDark ? '#475569' : '#cbd5e1', color: isActive ? config.color : (isDark ? '#94a3b8' : '#64748b') }}>
                              <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: config.color }}></div>{type}{isActive && <Check size={10} strokeWidth={4} />}
                          </button>
                      );
                  })}
              </div>
          )}
      </div>

      {/* Main Chart Area */}
      <div className="flex-1 w-full min-h-0 relative p-4 flex flex-col gap-2">
         {/* Chart 1 */}
         <div className="flex-1 w-full min-h-0 relative cursor-pointer">
            <div className={`absolute top-2 left-10 z-10 text-[10px] font-bold flex items-center gap-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{analysisMode === 'elec' ? '放电幅值 (dBmV)' : '环境温度 (°C)'}</div>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                    data={chartData} 
                    syncId="trendSync" 
                    margin={{ top: 20, right: 10, left: -20, bottom: 5 }} 
                    onClick={handleChartClick}
                >
                    <defs>
                        {Object.entries(CHANNEL_CONFIG).map(([key, cfg]) => (
                            <linearGradient key={key} id={`color${key}`} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={cfg.color} stopOpacity={0.3}/><stop offset="95%" stopColor={cfg.color} stopOpacity={0}/></linearGradient>
                        ))}
                        <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#FB923C" stopOpacity={0.3}/><stop offset="95%" stopColor="#FB923C" stopOpacity={0}/></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} opacity={0.5} vertical={false} />
                    <XAxis dataKey="time" hide />
                    <YAxis tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} wrapperStyle={{ pointerEvents: 'none' }} labelFormatter={(label) => formatDate(label)} formatter={(value: number) => value.toFixed(1)} />
                    {analysisMode === 'elec' ? selectedChannels.map(ch => (
                        <Area 
                            key={ch} 
                            type="monotone" 
                            dataKey={CHANNEL_CONFIG[ch].ampKey} 
                            stroke={CHANNEL_CONFIG[ch].color} 
                            fill={`url(#color${ch})`} 
                            name={`${ch} (dBmV)`} 
                            strokeWidth={2} 
                            activeDot={{ r: 6, strokeWidth: 0, cursor: 'pointer', onClick: (_: any, e: any) => setSelectedPoint(e.payload) }} 
                            dot={<CustomizedDot channelType={ch} />}
                        />
                    )) : (
                        <Area 
                            type="monotone" 
                            dataKey="temperature" 
                            stroke="#FB923C" 
                            fill="url(#colorTemp)" 
                            name="温度 (°C)" 
                            strokeWidth={2} 
                            activeDot={{ r: 6, strokeWidth: 0, cursor: 'pointer', onClick: (_: any, e: any) => setSelectedPoint(e.payload) }} 
                        />
                    )}
                </AreaChart>
            </ResponsiveContainer>
         </div>

         {/* Chart 2 */}
         <div className="flex-1 w-full min-h-0 relative cursor-pointer">
            <div className={`absolute top-2 left-10 z-10 text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{analysisMode === 'elec' ? '放电频次 (次/秒)' : '环境湿度 (%)'}</div>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart 
                    data={chartData} 
                    syncId="trendSync" 
                    margin={{ top: 20, right: 10, left: -20, bottom: 0 }} 
                    onClick={handleChartClick}
                >
                    <defs><linearGradient id="colorHum" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22D3EE" stopOpacity={0.3}/><stop offset="95%" stopColor="#22D3EE" stopOpacity={0}/></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#334155' : '#e2e8f0'} opacity={0.5} vertical={false} />
                    <XAxis dataKey="time" tickFormatter={(tick) => { const d = new Date(tick); return `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; }} tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: isDark ? '#94a3b8' : '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} domain={[0, 'auto']} />
                    <Tooltip contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#ffffff', borderColor: isDark ? '#334155' : '#e2e8f0', borderRadius: '12px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} wrapperStyle={{ pointerEvents: 'none' }} labelFormatter={(label) => formatDate(label)} formatter={(value: number, name: string) => { if (String(name).includes('湿度')) return value.toFixed(1); return value.toFixed(0); }} />
                    {analysisMode === 'elec' ? selectedChannels.map(ch => (
                        <Area 
                            key={ch} 
                            type="monotone" 
                            dataKey={CHANNEL_CONFIG[ch].freqKey} 
                            stroke={CHANNEL_CONFIG[ch].color} 
                            fill={`url(#color${ch})`} 
                            fillOpacity={0.2} 
                            name={`${ch} (次/秒)`} 
                            strokeWidth={2} 
                            strokeDasharray="3 3" 
                            activeDot={{ r: 6, strokeWidth: 0, cursor: 'pointer', onClick: (_: any, e: any) => setSelectedPoint(e.payload) }} 
                            dot={<CustomizedDot channelType={ch} />}
                        />
                    )) : (
                        <Area 
                            type="monotone" 
                            dataKey="humidity" 
                            stroke="#22D3EE" 
                            fill="url(#colorHum)" 
                            name="湿度 (%)" 
                            strokeWidth={2} 
                            activeDot={{ r: 6, strokeWidth: 0, cursor: 'pointer', onClick: (_: any, e: any) => setSelectedPoint(e.payload) }} 
                        />
                    )}
                </AreaChart>
            </ResponsiveContainer>
         </div>
      </div>

      <DataDownloadModal isOpen={showDownloadModal} onClose={() => setShowDownloadModal(false)} isDark={isDark} sensorName={sensorName} sensorSn={sn} deviceName={deviceName} projectName={projectName} />
      <SensorSettingsModal isOpen={showSettingsModal} onClose={() => setShowSettingsModal(false)} isDark={isDark} sensorName={sensorName} sensorSn={sn} />
      <DataListModal 
        isOpen={showDataList} 
        onClose={() => setShowDataList(false)} 
        data={chartData} 
        isDark={isDark} 
        sensorName={sensorName} 
        sensorId={sensorId} 
        timeRange={timeRange} 
        onTimeRangeChange={handleTimeRangeChange} 
        showDatePicker={showDatePicker} 
        setShowDatePicker={setShowDatePicker} 
        customStart={customStart} 
        setCustomStart={setCustomStart} 
        customEnd={customEnd} 
        setCustomEnd={setCustomEnd} 
        onViewDetail={(point) => setSelectedPoint(point)} 
      />
      <PointDetailModal data={selectedPoint} onClose={() => setSelectedPoint(null)} isDark={isDark} />
    </div>
  );
};

export default TrendAnalysis;
