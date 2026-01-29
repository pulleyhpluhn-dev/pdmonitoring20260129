
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { DeviceSummary, AlarmLevel, Project } from '../types';
import { 
  Search, ArrowUpRight, Thermometer, Droplets, 
  Zap, Waves, SortAsc, SortDesc, Upload, 
  ChevronDown, FolderTree, LayoutGrid, ListFilter,
  AlertOctagon, AlertTriangle, CheckCircle2, Info, Activity, HelpCircle,
  FileText, Printer, X, TrendingUp, TrendingDown, Minus, BarChart2, ArrowLeft,
  PieChart as PieIcon, Layers
} from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer, PieChart, Pie, Cell, Legend, Tooltip as RechartsTooltip, LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

interface DashboardProps {
  devices: DeviceSummary[];
  projects: Project[];
  isDark: boolean;
  onDeviceSelect: (id: string) => void;
  onUpdateDeviceImage?: (deviceId: string, imageData: string) => void;
}

// --- Report Modal Component ---
interface ReportModalProps {
  device: DeviceSummary;
  allDevices: DeviceSummary[];
  onClose: () => void;
  isOpen: boolean;
}

const ReportModal: React.FC<ReportModalProps> = ({ device, allDevices, onClose, isOpen }) => {
  if (!isOpen) return null;

  // Calculate Station Stats
  const stats = useMemo(() => {
    const counts = {
      [AlarmLevel.NORMAL]: 0,
      [AlarmLevel.WARNING]: 0,
      [AlarmLevel.DANGER]: 0,
      [AlarmLevel.CRITICAL]: 0,
      [AlarmLevel.NO_DATA]: 0,
    };
    allDevices.forEach(d => {
      if (counts[d.status] !== undefined) counts[d.status]++;
    });
    return counts;
  }, [allDevices]);

  const totalDevices = allDevices.length;
  
  const chartData = [
    { name: '正常', value: stats[AlarmLevel.NORMAL], color: '#22c55e' },
    { name: '一级告警', value: stats[AlarmLevel.WARNING], color: '#eab308' },
    { name: '二级告警', value: stats[AlarmLevel.DANGER], color: '#f97316' },
    { name: '三级告警', value: stats[AlarmLevel.CRITICAL], color: '#ef4444' },
    { name: '无数据', value: stats[AlarmLevel.NO_DATA], color: '#94a3b8' },
  ].filter(d => d.value > 0);

  // Generate Mock 90-Day History & Moving Averages based on current Status
  const { historyData, trendMetrics } = useMemo(() => {
    const data = [];
    const today = new Date();
    // Base parameters based on device status for realistic simulation
    let baseAmp = 15;
    let trendFactor = 0;
    let noise = 5;

    if (device.status === AlarmLevel.CRITICAL) {
        baseAmp = 45;
        trendFactor = 0.4; // Strong growth
        noise = 12;
    } else if (device.status === AlarmLevel.DANGER) {
        baseAmp = 35;
        trendFactor = 0.15; // Moderate growth
        noise = 8;
    } else if (device.status === AlarmLevel.WARNING) {
        baseAmp = 25;
        trendFactor = 0.05; // Slight growth
        noise = 6;
    }

    // Generate 90 days data
    for (let i = 89; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        // Linear trend + some curve acceleration if critical
        const x = 90 - i; // 1 to 90
        let val = baseAmp + (Math.random() - 0.5) * noise;
        
        if (trendFactor > 0) {
            val += trendFactor * x;
            if (device.status === AlarmLevel.CRITICAL) {
                val += (x * x) / 250; // Exponential-ish component
            }
        }

        data.push({
            date: date.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' }),
            fullDate: date.toISOString(),
            value: Math.max(0, parseFloat(val.toFixed(1))),
            ma7: 0, 
            ma30: 0,
            ma90: 0
        });
    }

    // Calculate Moving Averages
    for (let i = 0; i < data.length; i++) {
        const getSliceAvg = (days: number) => {
            if (i < days - 1) return null; // Not enough data for full window
            // Use available data for partial average at start, or null? Let's use partial.
            const startIdx = Math.max(0, i - days + 1);
            const slice = data.slice(startIdx, i + 1);
            const sum = slice.reduce((acc, cur) => acc + cur.value, 0);
            return parseFloat((sum / slice.length).toFixed(1));
        };
        data[i].ma7 = getSliceAvg(7) || data[i].value;
        data[i].ma30 = getSliceAvg(30) || data[i].value;
        data[i].ma90 = getSliceAvg(90) || data[i].value;
    }

    // Metrics for Cards
    const calcGrowth = (currentMA: number, pastMA: number) => {
        if (pastMA === 0) return 0;
        return ((currentMA - pastMA) / pastMA) * 100;
    };

    const lastIdx = data.length - 1;
    const currentMA7 = data[lastIdx].ma7;
    const currentMA30 = data[lastIdx].ma30;
    const currentMA90 = data[lastIdx].ma90;

    const metrics = {
        d7: { value: currentMA7, growth: calcGrowth(currentMA7, data[Math.max(0, lastIdx - 7)].ma7) },
        d30: { value: currentMA30, growth: calcGrowth(currentMA30, data[Math.max(0, lastIdx - 30)].ma30) },
        d90: { value: currentMA90, growth: calcGrowth(currentMA90, data[0].ma90) }
    };

    return { historyData: data, trendMetrics: metrics };
  }, [device.status]);

  const handlePrint = () => {
    window.print();
  };

  const getStatusDisplay = (status: AlarmLevel) => {
      switch (status) {
        case AlarmLevel.NORMAL: return { label: '正常', desc: '绝缘状态良好' };
        case AlarmLevel.WARNING: return { label: '一级', desc: '检测到轻度局放信号，无需动作' };
        case AlarmLevel.DANGER: return { label: '二级', desc: '局放信号持续增强，建议关注并计划消缺' };
        case AlarmLevel.CRITICAL: return { label: '三级', desc: '局放信号增强加速，建议尽快检修' };
        default: return { label: '无数据', desc: '暂无实时监测数据' };
      }
  };

  const getDiagnosisText = (status: AlarmLevel) => {
      switch(status) {
          case AlarmLevel.NORMAL: return "当前设备运行状态良好。各项监测指标（UHF, TEV, HFCT, AE）均在正常范围内。环境温湿度适宜。建议继续保持周期性巡检。";
          case AlarmLevel.WARNING: return "监测到轻微局部放电信号特征。虽然尚未达到危险阈值，但趋势显示绝缘性能可能存在轻微劣化。建议缩短巡检周期，密切关注信号变化趋势。";
          case AlarmLevel.DANGER: return "检测到显著的局部放电信号！TEV或UHF幅值已超过二级告警阈值。这通常指示设备内部存在绝缘缺陷或悬浮电位放电。建议立即安排带电检测复核，并制定检修计划。";
          case AlarmLevel.CRITICAL: return "【严重警告】监测数据表明设备存在极高风险的绝缘故障！多种监测手段均显示异常，且信号强度极大。存在发生绝缘击穿的紧迫风险。建议立即停电检修！";
          default: return "设备处于离线状态或数据传输中断，无法进行有效诊断。请检查传感器连接、供电及网络通信状态。";
      }
  };

  const GrowthIndicator = ({ value }: { value: number }) => {
    const absVal = Math.abs(value);
    if (absVal < 2) return <span className="text-slate-400 flex items-center text-xs font-bold gap-1 bg-slate-100 px-2 py-0.5 rounded-full"><Minus size={12}/> 持平</span>;
    if (value > 0) return <span className="text-red-600 flex items-center text-xs font-bold gap-1 bg-red-50 px-2 py-0.5 rounded-full border border-red-100"><TrendingUp size={12}/> +{value.toFixed(1)}%</span>;
    return <span className="text-green-600 flex items-center text-xs font-bold gap-1 bg-green-50 px-2 py-0.5 rounded-full border border-green-100"><TrendingDown size={12}/> {value.toFixed(1)}%</span>;
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      {/* Print Styles Injection */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-content, .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            height: auto;
            margin: 0;
            padding: 20px;
            background: white !important;
            color: black !important;
            overflow: visible !important;
            box-shadow: none !important;
            border: none !important;
            transform: none !important;
          }
          .no-print {
            display: none !important;
          }
          /* Ensure charts render */
          .recharts-responsive-container {
            width: 100% !important;
            height: 300px !important;
          }
        }
      `}</style>

      <div className="relative w-full max-w-[210mm] h-[90vh] bg-white text-slate-800 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Toolbar (No Print) */}
        <div className="px-6 py-4 border-b flex justify-between items-center bg-slate-50 no-print flex-shrink-0">
            <h3 className="font-bold text-lg flex items-center gap-2">
                <FileText className="text-blue-600" /> 诊断报告预览
            </h3>
            <div className="flex gap-3">
                <button 
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-lg active:scale-95 transition-all"
                >
                    <Printer size={16} /> 打印 / 导出 PDF
                </button>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-200 text-slate-500 transition-colors">
                    <X size={20} />
                </button>
            </div>
        </div>

        {/* Report Content (Print Target) */}
        <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-100 p-8 print-content">
            <div className="w-full min-h-[297mm] bg-white shadow-sm p-10 mx-auto flex flex-col gap-8 print:shadow-none print:p-0">
                
                {/* 1. Header */}
                <div className="border-b-2 border-slate-800 pb-4 mb-2 flex justify-between items-end">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 mb-2">GIS 局放监测诊断报告</h1>
                        <div className="text-sm font-bold text-slate-500">生成时间: {new Date().toLocaleString()}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-xl font-bold text-slate-800">{device.station}</div>
                        {/* Device ID removed as per request */}
                    </div>
                </div>

                {/* 2. Station Overview */}
                <section className="bg-slate-50 rounded-xl p-6 border border-slate-100 print:bg-transparent print:border-slate-200">
                    <h2 className="text-lg font-bold border-l-4 border-blue-600 pl-3 mb-6 flex items-center gap-2">
                        <LayoutGrid size={18} /> 全站设备状态总览
                    </h2>
                    <div className="flex flex-row items-center gap-8">
                        <div className="w-1/3 h-48 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={chartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={40}
                                        outerRadius={70}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                        ))}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="text-center">
                                    <div className="text-2xl font-black text-slate-800">{totalDevices}</div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase">设备总数</div>
                                </div>
                            </div>
                        </div>
                        <div className="flex-1 grid grid-cols-2 gap-4">
                            {chartData.map(item => (
                                <div key={item.name} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 bg-white">
                                    <div className="flex items-center gap-2">
                                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                                        <span className="text-sm font-bold text-slate-700">{item.name}</span>
                                    </div>
                                    <span className="text-lg font-mono font-black text-slate-900">{item.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* 3. Current Device Detail */}
                <section>
                    <h2 className="text-lg font-bold border-l-4 border-blue-600 pl-3 mb-6 flex items-center gap-2">
                        <Activity size={18} /> 当前设备监测详情
                    </h2>
                    
                    <div className="mb-6 flex gap-6">
                        <div className="w-32 h-32 bg-slate-100 rounded-lg border border-slate-200 flex items-center justify-center overflow-hidden">
                             {device.customImage ? (
                                 <img src={device.customImage} className="w-full h-full object-cover" alt="Device" />
                             ) : (
                                 <Activity size={40} className="text-slate-300" />
                             )}
                        </div>
                        <div className="flex-1 space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="text-xs text-slate-400 font-bold uppercase mb-1">设备名称</div>
                                    <div className="font-bold text-slate-900">{device.name}</div>
                                </div>
                                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <div className="text-xs text-slate-400 font-bold uppercase mb-1">所属变电站</div>
                                    <div className="font-bold text-slate-900">{device.station}</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="text-xs text-slate-400 font-bold uppercase whitespace-nowrap">当前状态:</div>
                                <div className="flex flex-col gap-1">
                                    <div className={`w-fit px-3 py-1 rounded-md text-xs font-black text-white ${
                                        device.status === AlarmLevel.CRITICAL ? 'bg-red-600' : 
                                        device.status === AlarmLevel.DANGER ? 'bg-orange-500' :
                                        device.status === AlarmLevel.WARNING ? 'bg-yellow-500' :
                                        device.status === AlarmLevel.NORMAL ? 'bg-green-500' : 'bg-slate-400'
                                    }`}>
                                        {getStatusDisplay(device.status).label}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-medium">{getStatusDisplay(device.status).desc}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border rounded-xl overflow-hidden border-slate-200">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                                <tr>
                                    <th className="px-4 py-3">监测指标</th>
                                    <th className="px-4 py-3">当前数值</th>
                                    <th className="px-4 py-3">频次/单位</th>
                                    <th className="px-4 py-3">状态评价</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-slate-700">
                                <tr>
                                    <td className="px-4 py-3 font-bold">UHF 特高频</td>
                                    <td className="px-4 py-3 font-mono">{device.status !== AlarmLevel.NO_DATA ? device.uhf_amp : '--'} dBmV</td>
                                    <td className="px-4 py-3 font-mono">{device.status !== AlarmLevel.NO_DATA ? device.uhf_freq : '--'} 次/秒</td>
                                    <td className="px-4 py-3"><span className="text-green-600 font-bold">正常</span></td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 font-bold">TEV 暂态地电压</td>
                                    <td className="px-4 py-3 font-mono">{device.status !== AlarmLevel.NO_DATA ? device.tev_amp : '--'} dBmV</td>
                                    <td className="px-4 py-3 font-mono">{device.status !== AlarmLevel.NO_DATA ? device.tev_freq : '--'} 次/秒</td>
                                    <td className="px-4 py-3">
                                        {device.status === AlarmLevel.CRITICAL || device.status === AlarmLevel.DANGER ? (
                                            <span className="text-red-500 font-bold">异常</span>
                                        ) : (
                                            <span className="text-green-600 font-bold">正常</span>
                                        )}
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 font-bold">HFCT 高频电流</td>
                                    <td className="px-4 py-3 font-mono">{device.status !== AlarmLevel.NO_DATA ? device.hfct_amp : '--'} dBmV</td>
                                    <td className="px-4 py-3 font-mono">{device.status !== AlarmLevel.NO_DATA ? device.hfct_freq : '--'} 次/秒</td>
                                    <td className="px-4 py-3"><span className="text-green-600 font-bold">正常</span></td>
                                </tr>
                                <tr>
                                    <td className="px-4 py-3 font-bold">环境温湿度</td>
                                    <td className="px-4 py-3 font-mono">{device.status !== AlarmLevel.NO_DATA ? device.temp : '--'} °C</td>
                                    <td className="px-4 py-3 font-mono">{device.status !== AlarmLevel.NO_DATA ? device.humidity : '--'} %</td>
                                    <td className="px-4 py-3"><span className="text-green-600 font-bold">适宜</span></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* 4. Insulation Degradation Analysis (NEW SECTION) */}
                <section className="bg-slate-50 rounded-xl p-6 border border-slate-100 print:bg-transparent print:border-slate-200">
                    <h2 className="text-lg font-bold border-l-4 border-blue-600 pl-3 mb-6 flex items-center gap-2">
                        <BarChart2 size={18} /> 绝缘劣化态势分析
                    </h2>
                    
                    <div className="flex flex-col gap-6">
                        {/* Metrics Cards */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">7日移动平均 (MA7)</div>
                                <div className="flex items-baseline justify-between">
                                    <span className="text-xl font-black text-slate-800">{trendMetrics.d7.value} <span className="text-xs font-normal text-slate-400">dBmV</span></span>
                                    <GrowthIndicator value={trendMetrics.d7.growth} />
                                </div>
                                <div className="mt-2 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${trendMetrics.d7.growth > 5 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: '40%' }}></div>
                                </div>
                            </div>
                            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">30日移动平均 (MA30)</div>
                                <div className="flex items-baseline justify-between">
                                    <span className="text-xl font-black text-slate-800">{trendMetrics.d30.value} <span className="text-xs font-normal text-slate-400">dBmV</span></span>
                                    <GrowthIndicator value={trendMetrics.d30.growth} />
                                </div>
                                <div className="mt-2 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${trendMetrics.d30.growth > 5 ? 'bg-red-500' : 'bg-purple-500'}`} style={{ width: '60%' }}></div>
                                </div>
                            </div>
                            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm">
                                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-2">90日长期趋势 (MA90)</div>
                                <div className="flex items-baseline justify-between">
                                    <span className="text-xl font-black text-slate-800">{trendMetrics.d90.value} <span className="text-xs font-normal text-slate-400">dBmV</span></span>
                                    <GrowthIndicator value={trendMetrics.d90.growth} />
                                </div>
                                <div className="mt-2 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full ${trendMetrics.d90.growth > 5 ? 'bg-red-500' : 'bg-cyan-500'}`} style={{ width: '80%' }}></div>
                                </div>
                            </div>
                        </div>

                        {/* Chart */}
                        <div className="h-64 w-full bg-white rounded-xl border border-slate-200 p-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={historyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                    <XAxis dataKey="date" tick={{fontSize: 10, fill: '#64748b'}} tickLine={false} axisLine={false} minTickGap={30} />
                                    <YAxis tick={{fontSize: 10, fill: '#64748b'}} tickLine={false} axisLine={false} unit=" dB" domain={['auto', 'auto']} />
                                    <RechartsTooltip 
                                        contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                        labelStyle={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}
                                    />
                                    <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                    <Line type="monotone" dataKey="value" stroke="#94a3b8" strokeWidth={1} dot={false} name="原始幅值" opacity={0.3} />
                                    <Line type="monotone" dataKey="ma7" stroke="#3b82f6" strokeWidth={2} dot={false} name="MA7 (短期)" />
                                    <Line type="monotone" dataKey="ma30" stroke="#8b5cf6" strokeWidth={2} dot={false} name="MA30 (中期)" />
                                    <Line type="monotone" dataKey="ma90" stroke="#06b6d4" strokeWidth={2} strokeDasharray="5 5" dot={false} name="MA90 (长期)" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="text-xs text-slate-500 leading-relaxed text-justify px-2">
                            <strong>分析说明：</strong> 
                            {trendMetrics.d30.growth > 10 
                                ? "MA30中期趋势显示明显上升迹象，表明设备绝缘性能正在加速劣化。建议立即结合TEV与超声波进行综合定位分析。" 
                                : trendMetrics.d90.growth > 5 
                                    ? "MA90长期趋势呈现缓慢上升，虽短期波动较小，但需关注绝缘老化累积效应。建议缩短巡检周期。" 
                                    : "各周期移动平均曲线平稳，短期波动在正常范围内，未发现明显的绝缘劣化趋势。"}
                        </div>
                    </div>
                </section>

                {/* 5. Conclusion */}
                <section className="mt-4 p-6 bg-blue-50 border border-blue-100 rounded-xl print:bg-transparent print:border-slate-300 print:border">
                    <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                        <Info size={18} className="text-blue-600" /> 智能诊断结论与建议
                    </h3>
                    <p className="text-sm leading-relaxed text-slate-700 text-justify">
                        {getDiagnosisText(device.status)}
                    </p>
                </section>

                <div className="mt-auto pt-8 border-t border-slate-200 text-center text-xs text-slate-400 font-mono">
                    System generated report. Powered by 500kV GIS Diagnosis System.
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

// --- MA Analysis Modal Component ---
interface MAAnalysisModalProps {
  isOpen: boolean;
  onClose: () => void;
  device: DeviceSummary;
  isDark: boolean;
}

const MAAnalysisModal: React.FC<MAAnalysisModalProps> = ({ isOpen, onClose, device, isDark }) => {
  if (!isOpen) return null;

  // Generate Mock 90-Day History & Moving Averages (Similar to ReportModal)
  const { historyData, trendMetrics } = useMemo(() => {
    const data = [];
    const today = new Date();
    // Base parameters based on device status for realistic simulation
    let baseAmp = 15;
    let trendFactor = 0;
    let noise = 5;

    if (device.status === AlarmLevel.CRITICAL) {
        baseAmp = 45;
        trendFactor = 0.4; // Strong growth
        noise = 12;
    } else if (device.status === AlarmLevel.DANGER) {
        baseAmp = 35;
        trendFactor = 0.15; // Moderate growth
        noise = 8;
    } else if (device.status === AlarmLevel.WARNING) {
        baseAmp = 25;
        trendFactor = 0.05; // Slight growth
        noise = 6;
    }

    // Generate 90 days data
    for (let i = 89; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        
        // Linear trend + some curve acceleration if critical
        const x = 90 - i; // 1 to 90
        let val = baseAmp + (Math.random() - 0.5) * noise;
        
        if (trendFactor > 0) {
            val += trendFactor * x;
            if (device.status === AlarmLevel.CRITICAL) {
                val += (x * x) / 250; // Exponential-ish component
            }
        }

        data.push({
            date: date.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' }),
            fullDate: date.toISOString(),
            value: Math.max(0, parseFloat(val.toFixed(1))),
            ma7: 0, 
            ma30: 0,
            ma90: 0
        });
    }

    // Calculate Moving Averages
    for (let i = 0; i < data.length; i++) {
        const getSliceAvg = (days: number) => {
            if (i < days - 1) return null; // Not enough data for full window
            const startIdx = Math.max(0, i - days + 1);
            const slice = data.slice(startIdx, i + 1);
            const sum = slice.reduce((acc, cur) => acc + cur.value, 0);
            return parseFloat((sum / slice.length).toFixed(1));
        };
        data[i].ma7 = getSliceAvg(7) || data[i].value;
        data[i].ma30 = getSliceAvg(30) || data[i].value;
        data[i].ma90 = getSliceAvg(90) || data[i].value;
    }

    // Metrics for Cards
    const calcGrowth = (currentMA: number, pastMA: number) => {
        if (pastMA === 0) return 0;
        return ((currentMA - pastMA) / pastMA) * 100;
    };

    const lastIdx = data.length - 1;
    const currentMA7 = data[lastIdx].ma7;
    const currentMA30 = data[lastIdx].ma30;
    const currentMA90 = data[lastIdx].ma90;

    const metrics = {
        d7: { value: currentMA7, growth: calcGrowth(currentMA7, data[Math.max(0, lastIdx - 7)].ma7) },
        d30: { value: currentMA30, growth: calcGrowth(currentMA30, data[Math.max(0, lastIdx - 30)].ma30) },
        d90: { value: currentMA90, growth: calcGrowth(currentMA90, data[0].ma90) }
    };

    return { historyData: data, trendMetrics: metrics };
  }, [device.status]);

  const GrowthIndicator = ({ value }: { value: number }) => {
    const absVal = Math.abs(value);
    if (absVal < 2) return <span className={`flex items-center text-xs font-bold gap-1 px-2 py-0.5 rounded-full ${isDark ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-400'}`}><Minus size={12}/> 持平</span>;
    if (value > 0) return <span className={`flex items-center text-xs font-bold gap-1 px-2 py-0.5 rounded-full border ${isDark ? 'bg-red-900/30 text-red-400 border-red-500/30' : 'bg-red-50 text-red-600 border-red-100'}`}><TrendingUp size={12}/> +{value.toFixed(1)}%</span>;
    return <span className={`flex items-center text-xs font-bold gap-1 px-2 py-0.5 rounded-full border ${isDark ? 'bg-green-900/30 text-green-400 border-green-500/30' : 'bg-green-50 text-green-600 border-green-100'}`}><TrendingDown size={12}/> {value.toFixed(1)}%</span>;
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn" onClick={onClose}>
        <div 
            className={`w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-slideInUp border ${isDark ? 'bg-[#0f172a] border-slate-700' : 'bg-white border-gray-200'}`} 
            onClick={e => e.stopPropagation()}
        >
            {/* Header */}
            <div className={`px-6 py-4 border-b flex justify-between items-center ${isDark ? 'border-slate-800 bg-slate-800/50' : 'bg-gray-50 border-gray-100'}`}>
                <div>
                    <h3 className={`font-bold text-lg flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-800'}`}>
                        <BarChart2 className="text-blue-500" size={20} /> 趋势与移动平均 (MA) 分析
                    </h3>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                        设备: {device.name} ({device.station})
                    </p>
                </div>
                <button onClick={onClose} className={`p-2 rounded-full transition-colors ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-200 text-slate-500'}`}>
                    <X size={24} />
                </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
                 {/* Metrics */}
                 <div className="grid grid-cols-3 gap-4">
                    <div className={`p-4 rounded-xl border shadow-sm ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-gray-200'}`}>
                        <div className="text-[10px] opacity-40 font-bold uppercase tracking-wider mb-2">MA7 (短期趋势)</div>
                        <div className="flex items-baseline justify-between">
                            <span className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>{trendMetrics.d7.value} <span className="text-xs font-normal opacity-50">dBmV</span></span>
                            <GrowthIndicator value={trendMetrics.d7.growth} />
                        </div>
                    </div>
                    <div className={`p-4 rounded-xl border shadow-sm ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-gray-200'}`}>
                        <div className="text-[10px] opacity-40 font-bold uppercase tracking-wider mb-2">MA30 (中期趋势)</div>
                        <div className="flex items-baseline justify-between">
                            <span className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>{trendMetrics.d30.value} <span className="text-xs font-normal opacity-50">dBmV</span></span>
                            <GrowthIndicator value={trendMetrics.d30.growth} />
                        </div>
                    </div>
                    <div className={`p-4 rounded-xl border shadow-sm ${isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-gray-200'}`}>
                        <div className="text-[10px] opacity-40 font-bold uppercase tracking-wider mb-2">MA90 (长期趋势)</div>
                        <div className="flex items-baseline justify-between">
                            <span className={`text-xl font-black ${isDark ? 'text-white' : 'text-slate-800'}`}>{trendMetrics.d90.value} <span className="text-xs font-normal opacity-50">dBmV</span></span>
                            <GrowthIndicator value={trendMetrics.d90.growth} />
                        </div>
                    </div>
                 </div>

                 {/* Chart */}
                 <div className={`h-80 w-full rounded-xl border p-4 ${isDark ? 'bg-slate-800/20 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={historyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#e2e8f0'} opacity={0.5} />
                            <XAxis dataKey="date" tick={{fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b'}} tickLine={false} axisLine={false} minTickGap={30} />
                            <YAxis tick={{fontSize: 10, fill: isDark ? '#94a3b8' : '#64748b'}} tickLine={false} axisLine={false} unit=" dB" domain={['auto', 'auto']} />
                            <RechartsTooltip 
                                contentStyle={{ backgroundColor: isDark ? '#0f172a' : '#fff', borderRadius: '8px', border: isDark ? '1px solid #334155' : '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                                labelStyle={{ fontSize: '12px', color: isDark ? '#94a3b8' : '#64748b', marginBottom: '4px' }}
                            />
                            <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                            <Line type="monotone" dataKey="value" stroke={isDark ? '#64748b' : '#94a3b8'} strokeWidth={1} dot={false} name="原始幅值" opacity={0.3} />
                            <Line type="monotone" dataKey="ma7" stroke="#3b82f6" strokeWidth={2} dot={false} name="MA7 (短期)" />
                            <Line type="monotone" dataKey="ma30" stroke="#8b5cf6" strokeWidth={2} dot={false} name="MA30 (中期)" />
                            <Line type="monotone" dataKey="ma90" stroke="#06b6d4" strokeWidth={2} strokeDasharray="5 5" dot={false} name="MA90 (长期)" />
                        </LineChart>
                    </ResponsiveContainer>
                 </div>
                 
                 {/* Analysis Text */}
                 <div className={`p-4 rounded-xl border text-sm leading-relaxed ${isDark ? 'bg-blue-500/10 border-blue-500/20 text-blue-200' : 'bg-blue-50 border-blue-100 text-slate-700'}`}>
                    <strong>分析说明：</strong>
                    {trendMetrics.d30.growth > 10 
                        ? "MA30中期趋势显示明显上升迹象，表明设备绝缘性能正在加速劣化。建议立即结合TEV与超声波进行综合定位分析。" 
                        : trendMetrics.d90.growth > 5 
                            ? "MA90长期趋势呈现缓慢上升，虽短期波动较小，但需关注绝缘老化累积效应。建议缩短巡检周期。" 
                            : "各周期移动平均曲线平稳，短期波动在正常范围内，未发现明显的绝缘劣化趋势。"}
                 </div>
            </div>
        </div>
    </div>
  );
};

const Dashboard: React.FC<DashboardProps> = ({ devices, projects, isDark, onDeviceSelect, onUpdateDeviceImage }) => {
  const [viewLevel, setViewLevel] = useState<'projects' | 'devices'>('projects');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<AlarmLevel[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [reportDevice, setReportDevice] = useState<DeviceSummary | null>(null);
  const [maAnalysisDevice, setMaAnalysisDevice] = useState<DeviceSummary | null>(null); // New state for MA Modal
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  
  // -- Project View Filtering & Sorting State --
  const [projectFilterStatus, setProjectFilterStatus] = useState<AlarmLevel[]>([]);
  const [projectSortOrder, setProjectSortOrder] = useState<'asc' | 'desc'>('desc');

  // -- Dropdown State --
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] = useState(false);
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(event.target as Node)) {
        setIsProjectDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [projectDropdownRef]);

  const GIS_EQUIPMENT_FALLBACK = "https://images.unsplash.com/photo-1518152006812-edab29b069ac?auto=format&fit=crop&q=80&w=200";

  // Configuration for card styling based on alarm level
  const getStatusConfig = (status: AlarmLevel) => {
    switch (status) {
      case AlarmLevel.CRITICAL:
        return { 
          color: '#ef4444', // Red-500
          label: '三级',
          icon: AlertOctagon,
          containerClass: isDark 
            ? 'border-red-500 bg-red-950/20 shadow-[0_0_20px_rgba(239,68,68,0.3)]' 
            : 'border-red-500 bg-red-50 shadow-lg shadow-red-200',
          headerClass: 'bg-red-600 text-white',
          pulse: true
        };
      case AlarmLevel.DANGER:
        return { 
          color: '#f97316', // Orange-500
          label: '二级',
          icon: AlertTriangle,
          containerClass: isDark 
            ? 'border-orange-500 bg-orange-950/20 shadow-[0_0_15px_rgba(249,115,22,0.2)]' 
            : 'border-orange-500 bg-orange-50 shadow-md shadow-orange-200',
          headerClass: 'bg-orange-500 text-white',
          pulse: true
        };
      case AlarmLevel.WARNING:
        return { 
          color: '#eab308', // Yellow-500
          label: '一级',
          icon: Info,
          containerClass: isDark 
            ? 'border-yellow-500/50 bg-yellow-900/10' 
            : 'border-yellow-400 bg-yellow-50',
          headerClass: isDark ? 'bg-yellow-500/20 text-yellow-400' : 'bg-yellow-100 text-yellow-700',
          pulse: false
        };
      case AlarmLevel.NO_DATA:
        return { 
          color: '#94a3b8', // Slate-400
          label: '无数据',
          icon: HelpCircle,
          containerClass: isDark 
            ? 'border-slate-700 bg-slate-800/40 opacity-70' 
            : 'border-gray-200 bg-gray-50 opacity-70',
          headerClass: isDark ? 'bg-slate-700 text-slate-300' : 'bg-gray-300 text-slate-600',
          pulse: false
        };
      default: // NORMAL
        return { 
          color: '#22c55e', // Green-500
          label: '正常',
          icon: CheckCircle2,
          containerClass: isDark 
            ? 'border-slate-700 bg-slate-800/40 hover:border-blue-500/50' 
            : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-md',
          // Updated: Normal header is now Green
          headerClass: 'bg-green-600 text-white',
          pulse: false
        };
    }
  };

  const toggleStatusFilter = (status: AlarmLevel) => {
    setFilterStatus(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const toggleProjectStatusFilter = (status: AlarmLevel) => {
    setProjectFilterStatus(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const filteredDevices = useMemo(() => {
    let filtered = devices.filter(d => {
      const matchesSearch = d.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            d.station.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus.length === 0 || filterStatus.includes(d.status);
      const matchesProject = selectedProjectId === 'all' || d.projectId === selectedProjectId;
      return matchesSearch && matchesStatus && matchesProject;
    });

    return filtered.sort((a, b) => {
        const order = sortOrder === 'asc' ? 1 : -1;
        // Primary sort by status severity (Critical > Danger > Warning > Normal > NoData)
        const severity = { 
          [AlarmLevel.CRITICAL]: 4, 
          [AlarmLevel.DANGER]: 3, 
          [AlarmLevel.WARNING]: 2, 
          [AlarmLevel.NORMAL]: 1,
          [AlarmLevel.NO_DATA]: 0
        };
        
        if (severity[a.status] !== severity[b.status]) {
            // Descending: High Severity (4) to Low (0)
            return (severity[a.status] - severity[b.status]) * order; 
        }
        return 0;
    });
  }, [devices, searchTerm, filterStatus, selectedProjectId, sortOrder]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, deviceId: string) => {
      const file = e.target.files?.[0];
      if (file && onUpdateDeviceImage) {
          const reader = new FileReader();
          reader.onloadend = () => {
              onUpdateDeviceImage(deviceId, reader.result as string);
          };
          reader.readAsDataURL(file);
      }
  };

  const projectOptions = useMemo(() => {
      return [{ id: 'all', name: '全部项目' }, ...projects];
  }, [projects]);

  // --- Project Overview Logic ---
  const projectStats = useMemo(() => {
      return projects.map(project => {
          const associatedDevices = devices.filter(d => d.projectId === project.id);
          
          const counts = {
              [AlarmLevel.NORMAL]: 0,
              [AlarmLevel.WARNING]: 0,
              [AlarmLevel.DANGER]: 0,
              [AlarmLevel.CRITICAL]: 0,
              [AlarmLevel.NO_DATA]: 0,
          };
          
          let maxSeverity = 0;
          let overallStatus = AlarmLevel.NORMAL;

          const severityMap = {
              [AlarmLevel.NO_DATA]: 0,
              [AlarmLevel.NORMAL]: 1,
              [AlarmLevel.WARNING]: 2,
              [AlarmLevel.DANGER]: 3,
              [AlarmLevel.CRITICAL]: 4
          };

          if (associatedDevices.length === 0) {
              overallStatus = AlarmLevel.NO_DATA;
          } else {
              associatedDevices.forEach(d => {
                  if (counts[d.status] !== undefined) counts[d.status]++;
                  const sev = severityMap[d.status];
                  if (sev > maxSeverity) {
                      maxSeverity = sev;
                      overallStatus = d.status;
                  }
              });
              // Handle case where devices exist but maybe all are NO_DATA or mixed
              if (maxSeverity === 0 && associatedDevices.length > 0) overallStatus = AlarmLevel.NO_DATA;
          }

          return {
              ...project,
              deviceCount: associatedDevices.length,
              statusCounts: counts,
              overallStatus
          };
      });
  }, [devices, projects]);

  const filteredProjects = useMemo(() => {
      let result = projectStats;

      // Filter by status
      if (projectFilterStatus.length > 0) {
          result = result.filter(p => projectFilterStatus.includes(p.overallStatus));
      }

      // Sort
      return result.sort((a, b) => {
          const order = projectSortOrder === 'asc' ? 1 : -1;
          const severity = {
            [AlarmLevel.CRITICAL]: 4,
            [AlarmLevel.DANGER]: 3,
            [AlarmLevel.WARNING]: 2,
            [AlarmLevel.NORMAL]: 1,
            [AlarmLevel.NO_DATA]: 0
          };
          
          if (severity[a.overallStatus] !== severity[b.overallStatus]) {
              return (severity[a.overallStatus] - severity[b.overallStatus]) * order;
          }
          return 0;
      });
  }, [projectStats, projectFilterStatus, projectSortOrder]);

  if (viewLevel === 'projects') {
      return (
        <div className={`w-full flex flex-col p-6 h-full overflow-hidden ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            <div className="flex flex-col gap-6 mb-6 flex-shrink-0">
                <div className="flex justify-between items-end">
                    <div>
                        <h1 className={`text-2xl font-black mb-1 flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            <LayoutGrid className="text-blue-500" /> 项目状态总览
                        </h1>
                        <p className="text-sm opacity-60 font-medium">所有项目状态汇总及统计</p>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <div className="flex gap-2 items-center">
                        {[AlarmLevel.NORMAL, AlarmLevel.WARNING, AlarmLevel.DANGER, AlarmLevel.CRITICAL, AlarmLevel.NO_DATA].map(status => {
                            const isActive = projectFilterStatus.includes(status);
                            const config = getStatusConfig(status);
                            return (
                                <button 
                                    key={status}
                                    onClick={() => toggleProjectStatusFilter(status)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5
                                        ${isActive 
                                            ? `bg-opacity-20 border-opacity-50` 
                                            : `opacity-50 grayscale border-transparent hover:opacity-100 hover:grayscale-0 hover:bg-white/5`
                                        }
                                    `}
                                    style={{ 
                                        backgroundColor: isActive ? config.color + '20' : 'transparent',
                                        borderColor: isActive ? config.color : 'transparent',
                                        color: isActive ? config.color : (isDark ? '#94a3b8' : '#64748b')
                                    }}
                                >
                                    <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: config.color }}></div>
                                    {config.label}
                                </button>
                            )
                        })}
                    </div>

                    <button 
                        onClick={() => setProjectSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                        className={`p-2 rounded-lg transition-all ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-slate-600'}`}
                        title={projectSortOrder === 'asc' ? "当前：低到高 (No Data -> Critical)" : "当前：高到低 (Critical -> No Data)"}
                    >
                        {projectSortOrder === 'asc' ? <SortAsc size={18} /> : <SortDesc size={18} />}
                    </button>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredProjects.map(project => {
                        const statusConfig = getStatusConfig(project.overallStatus);
                        return (
                            <div 
                                key={project.id}
                                onClick={() => {
                                    setSelectedProjectId(project.id);
                                    setViewLevel('devices');
                                }}
                                className={`group relative rounded-2xl border-2 overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1 cursor-pointer
                                    ${statusConfig.containerClass}
                                `}
                            >
                                {/* Header */}
                                <div className={`px-4 py-3 flex justify-between items-center relative ${statusConfig.headerClass}`}>
                                    <div className="min-w-0 flex-1 pr-2">
                                        <div className="text-base font-black truncate" title={project.name}>
                                            {project.name}
                                        </div>
                                    </div>
                                    <div className={`flex flex-col items-end gap-0.5 flex-shrink-0 ${statusConfig.pulse ? 'animate-pulse' : ''}`}>
                                        <div className="flex items-center gap-2">
                                            <statusConfig.icon size={20} strokeWidth={3} />
                                            <span className="text-xs font-black uppercase">{statusConfig.label}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Body */}
                                <div className="p-5 flex-1 flex flex-col gap-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] opacity-50 font-bold uppercase">关联设备</span>
                                            <span className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>{project.deviceCount}</span>
                                        </div>
                                        <div className={`p-3 rounded-xl ${isDark ? 'bg-black/20' : 'bg-gray-100'}`}>
                                            <Layers size={24} className={isDark ? 'text-slate-400' : 'text-slate-500'} />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex justify-between text-[10px] font-bold opacity-60">
                                            <span>状态统计 (共 {project.deviceCount} 台)</span>
                                        </div>
                                        <div className="flex gap-1 h-2 rounded-full overflow-hidden bg-slate-500/10">
                                            {project.statusCounts[AlarmLevel.CRITICAL] > 0 && <div style={{width: `${(project.statusCounts[AlarmLevel.CRITICAL] / project.deviceCount) * 100}%`}} className="bg-red-500"></div>}
                                            {project.statusCounts[AlarmLevel.DANGER] > 0 && <div style={{width: `${(project.statusCounts[AlarmLevel.DANGER] / project.deviceCount) * 100}%`}} className="bg-orange-500"></div>}
                                            {project.statusCounts[AlarmLevel.WARNING] > 0 && <div style={{width: `${(project.statusCounts[AlarmLevel.WARNING] / project.deviceCount) * 100}%`}} className="bg-yellow-500"></div>}
                                            {project.statusCounts[AlarmLevel.NORMAL] > 0 && <div style={{width: `${(project.statusCounts[AlarmLevel.NORMAL] / project.deviceCount) * 100}%`}} className="bg-green-500"></div>}
                                            {project.statusCounts[AlarmLevel.NO_DATA] > 0 && <div style={{width: `${(project.statusCounts[AlarmLevel.NO_DATA] / project.deviceCount) * 100}%`}} className="bg-slate-400"></div>}
                                        </div>
                                        <div className="grid grid-cols-5 gap-1 text-center pt-2">
                                            <div className="flex flex-col"><span className="text-[10px] text-red-500 font-bold">三级</span><span className="text-xs font-mono">{project.statusCounts[AlarmLevel.CRITICAL]}</span></div>
                                            <div className="flex flex-col"><span className="text-[10px] text-orange-500 font-bold">二级</span><span className="text-xs font-mono">{project.statusCounts[AlarmLevel.DANGER]}</span></div>
                                            <div className="flex flex-col"><span className="text-[10px] text-yellow-500 font-bold">一级</span><span className="text-xs font-mono">{project.statusCounts[AlarmLevel.WARNING]}</span></div>
                                            <div className="flex flex-col"><span className="text-[10px] text-green-500 font-bold">正常</span><span className="text-xs font-mono">{project.statusCounts[AlarmLevel.NORMAL]}</span></div>
                                            <div className="flex flex-col"><span className="text-[10px] text-slate-400 font-bold">无数据</span><span className="text-xs font-mono">{project.statusCounts[AlarmLevel.NO_DATA]}</span></div>
                                        </div>
                                    </div>
                                    
                                    <div className={`mt-auto pt-3 border-t border-dashed ${isDark ? 'border-slate-700' : 'border-gray-200'} flex justify-between items-center text-[10px] opacity-50`}>
                                        <span>查看设备详情</span>
                                        <ArrowUpRight size={14} />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
      );
  }

  // --- Device List View (Existing View) ---
  return (
    <div className={`w-full flex flex-col p-6 overflow-hidden ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
      
      {/* Report Modal */}
      {reportDevice && (
        <ReportModal 
            isOpen={true}
            onClose={() => setReportDevice(null)}
            device={reportDevice}
            allDevices={devices}
        />
      )}

      {/* MA Analysis Modal */}
      {maAnalysisDevice && (
        <MAAnalysisModal 
            isOpen={true} 
            onClose={() => setMaAnalysisDevice(null)} 
            device={maAnalysisDevice} 
            isDark={isDark} 
        />
      )}

      {/* Header & Filters */}
      <div className="flex flex-col gap-6 mb-6 flex-shrink-0">
        <div className="flex justify-between items-end">
            <div>
                <div className="flex items-center gap-4 mb-1">
                    <h1 className={`text-2xl font-black flex items-center gap-3 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        <LayoutGrid className="text-blue-500" /> 设备概览仪表盘
                    </h1>
                    <button 
                        onClick={() => {
                            setViewLevel('projects');
                            setSelectedProjectId('all'); // Optional: reset filter when going back
                        }}
                        className={`flex items-center gap-2 text-xs font-bold transition-colors w-fit px-3 py-1.5 rounded-lg border ${isDark ? 'text-slate-400 hover:text-white border-slate-700 hover:bg-slate-800' : 'text-slate-500 hover:text-slate-900 border-gray-200 hover:bg-gray-100'}`}
                    >
                        <ArrowLeft size={14} /> 返回项目状态总览
                    </button>
                </div>
                <p className="text-sm opacity-60 font-medium">实时监控全站 GIS 设备局放状态与环境参数</p>
            </div>
            
            <div className="flex gap-2">
                <div className={`flex items-center px-3 py-2 rounded-lg border w-64 ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
                    <Search size={16} className="opacity-40 mr-2" />
                    <input 
                        type="text" 
                        placeholder="搜索设备名称或变电站..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-transparent outline-none text-xs w-full"
                    />
                </div>
            </div>
        </div>

        <div className="flex items-center justify-between">
            <div className="flex gap-2 items-center">
               {/* Click-based Dropdown */}
               <div className="relative z-20" ref={projectDropdownRef}>
                   <button 
                       onClick={() => setIsProjectDropdownOpen(!isProjectDropdownOpen)}
                       className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${isDark ? 'bg-slate-800 border-slate-600 hover:bg-slate-700' : 'bg-white border-gray-300 hover:bg-gray-50'}`}
                   >
                       <FolderTree size={14} className="text-blue-500" />
                       <span>{projectOptions.find(p => p.id === selectedProjectId)?.name || '选择项目'}</span>
                       <ChevronDown size={12} className={`opacity-50 transition-transform ${isProjectDropdownOpen ? 'rotate-180' : ''}`} />
                   </button>
                   
                   {isProjectDropdownOpen && (
                       <div className={`absolute top-full left-0 mt-1 w-48 rounded-xl border shadow-xl overflow-hidden animate-fadeIn ${isDark ? 'bg-slate-900 border-slate-700' : 'bg-white border-gray-200'}`}>
                           {projectOptions.map(p => (
                               <button 
                                    key={p.id}
                                    onClick={() => { setSelectedProjectId(p.id); setIsProjectDropdownOpen(false); }}
                                    className={`w-full text-left px-4 py-2 text-xs font-medium hover:bg-blue-500 hover:text-white transition-colors ${selectedProjectId === p.id ? 'bg-blue-500/10 text-blue-500' : ''}`}
                               >
                                   {p.name}
                               </button>
                           ))}
                       </div>
                   )}
               </div>

               <div className="h-6 w-px bg-gray-500/20 mx-1"></div>

               {[AlarmLevel.NORMAL, AlarmLevel.WARNING, AlarmLevel.DANGER, AlarmLevel.CRITICAL, AlarmLevel.NO_DATA].map(status => {
                   const isActive = filterStatus.includes(status);
                   const config = getStatusConfig(status);
                   return (
                       <button 
                          key={status}
                          onClick={() => toggleStatusFilter(status)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5
                            ${isActive 
                                ? `bg-opacity-20 border-opacity-50` 
                                : `opacity-50 grayscale border-transparent hover:opacity-100 hover:grayscale-0 hover:bg-white/5`
                            }
                          `}
                          style={{ 
                              backgroundColor: isActive ? config.color + '20' : 'transparent',
                              borderColor: isActive ? config.color : 'transparent',
                              color: isActive ? config.color : (isDark ? '#94a3b8' : '#64748b')
                          }}
                       >
                           <div className={`w-2 h-2 rounded-full`} style={{ backgroundColor: config.color }}></div>
                           {config.label}
                       </button>
                   )
               })}
            </div>

            <button 
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className={`p-2 rounded-lg transition-all ${isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-gray-100 text-slate-600'}`}
                title={sortOrder === 'asc' ? "当前：低到高 (No Data -> Critical)" : "当前：高到低 (Critical -> No Data)"}
            >
                {sortOrder === 'asc' ? <SortAsc size={18} /> : <SortDesc size={18} />}
            </button>
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-6">
         {filteredDevices.length === 0 ? (
             <div className="h-full flex flex-col items-center justify-center opacity-30">
                 <ListFilter size={48} className="mb-4" />
                 <p className="text-lg font-bold">没有找到匹配的设备</p>
                 <p className="text-sm">请尝试调整筛选条件或搜索关键词</p>
             </div>
         ) : (
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                 {filteredDevices.map(device => {
                     const statusConfig = getStatusConfig(device.status);
                     const project = projects.find(p => p.id === device.projectId);
                     const hasData = device.status !== AlarmLevel.NO_DATA;
                     
                     return (
                         <div 
                            key={device.id}
                            className={`group relative rounded-2xl border-2 overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1
                                ${statusConfig.containerClass}
                            `}
                            onClick={() => onDeviceSelect(device.id)}
                         >
                             {/* Header Section - Status Driven */}
                             <div className={`px-4 py-3 flex justify-between items-center relative ${statusConfig.headerClass}`}>
                                 <div className="min-w-0 flex-1 pr-2">
                                     <div className="text-[10px] opacity-80 uppercase tracking-wider font-bold mb-0.5 truncate">
                                        {device.station}
                                     </div>
                                     <div className="text-base font-black truncate" title={device.name}>
                                        {device.name}
                                     </div>
                                 </div>
                                 <div className={`flex flex-col items-end gap-0.5 flex-shrink-0 ${statusConfig.pulse ? 'animate-pulse' : ''}`}>
                                     <div className="flex items-center gap-2">
                                         <statusConfig.icon size={20} strokeWidth={3} />
                                         <span className="text-xs font-black uppercase">{statusConfig.label}</span>
                                     </div>
                                     <span className="text-[9px] opacity-70 font-mono tracking-tight" title="基于7天历史数据的状态判定">
                                         {device.lastUpdated.split(' ')[0]}
                                     </span>
                                 </div>
                             </div>

                             {/* Content Section */}
                             <div className="p-4 flex-1 flex flex-col relative">
                                 {/* Image Thumbnail */}
                                 <div className="absolute top-4 right-4 z-10">
                                     <div 
                                        className={`w-12 h-12 rounded-lg overflow-hidden border-2 border-white/20 shadow-sm bg-gray-900 group-hover:scale-110 transition-transform cursor-pointer relative ${!hasData ? 'grayscale opacity-50' : ''}`}
                                        onClick={(e) => { e.stopPropagation(); fileInputRefs.current[device.id]?.click(); }}
                                        title="点击更新图片"
                                     >
                                        <img 
                                            src={device.customImage || GIS_EQUIPMENT_FALLBACK} 
                                            className="w-full h-full object-cover opacity-80" 
                                            alt="Thumbnail" 
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 bg-black/40 transition-opacity">
                                            <Upload size={12} className="text-white"/>
                                        </div>
                                     </div>
                                     <input 
                                        type="file" 
                                        className="hidden" 
                                        accept="image/*"
                                        ref={(el) => { fileInputRefs.current[device.id] = el; }}
                                        onChange={(e) => handleImageUpload(e, device.id)}
                                        onClick={(e) => e.stopPropagation()}
                                     />
                                 </div>

                                 {/* Metrics Grid */}
                                 <div className={`grid grid-cols-2 gap-y-4 gap-x-2 mb-4 pr-14 ${!hasData ? 'opacity-30 grayscale' : ''}`}>
                                     <div className="flex flex-col">
                                         <span className="text-[10px] opacity-50 font-bold uppercase mb-0.5">UHF 局放</span>
                                         <div className="flex items-baseline gap-1">
                                            <Waves size={12} className="text-blue-500" />
                                            <span className="text-sm font-black font-mono">{hasData ? device.uhf_amp : '--'}</span>
                                            <span className="text-[9px] opacity-50">dBmV</span>
                                         </div>
                                     </div>
                                     <div className="flex flex-col">
                                         <span className="text-[10px] opacity-50 font-bold uppercase mb-0.5">TEV 局放</span>
                                         <div className="flex items-baseline gap-1">
                                            <Zap size={12} className="text-purple-500" />
                                            <span className="text-sm font-black font-mono">{hasData ? device.tev_amp : '--'}</span>
                                            <span className="text-[9px] opacity-50">dBmV</span>
                                         </div>
                                     </div>
                                     <div className="flex flex-col">
                                         <span className="text-[10px] opacity-50 font-bold uppercase mb-0.5">环境温度</span>
                                         <div className="flex items-baseline gap-1">
                                            <Thermometer size={12} className="text-orange-500" />
                                            <span className="text-sm font-black font-mono">{hasData ? device.temp : '--'}</span>
                                            <span className="text-[9px] opacity-50">°C</span>
                                         </div>
                                     </div>
                                     <div className="flex flex-col">
                                         <span className="text-[10px] opacity-50 font-bold uppercase mb-0.5">环境湿度</span>
                                         <div className="flex items-baseline gap-1">
                                            <Droplets size={12} className="text-cyan-500" />
                                            <span className="text-sm font-black font-mono">{hasData ? device.humidity : '--'}</span>
                                            <span className="text-[9px] opacity-50">%</span>
                                         </div>
                                     </div>
                                 </div>

                                 {/* Mini Trend Chart */}
                                 <div 
                                    className="h-10 w-full opacity-60 hover:opacity-100 transition-opacity mt-auto mb-3 cursor-pointer relative group/chart"
                                    onClick={(e) => { e.stopPropagation(); if (hasData) setMaAnalysisDevice(device); }}
                                    title={hasData ? "点击查看详细 MA 趋势分析" : ""}
                                 >
                                     {hasData ? (
                                         <>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <AreaChart data={device.trend.map((v, i) => ({ v, i }))}>
                                                    <defs>
                                                        <linearGradient id={`grad-${device.id}`} x1="0" y1="0" x2="0" y2="1">
                                                            <stop offset="5%" stopColor={statusConfig.color} stopOpacity={0.3}/>
                                                            <stop offset="95%" stopColor={statusConfig.color} stopOpacity={0}/>
                                                        </linearGradient>
                                                    </defs>
                                                    <Area 
                                                        type="monotone" 
                                                        dataKey="v" 
                                                        stroke={statusConfig.color} 
                                                        strokeWidth={2} 
                                                        fill={`url(#grad-${device.id})`} 
                                                        isAnimationActive={false}
                                                    />
                                                </AreaChart>
                                            </ResponsiveContainer>
                                            
                                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/chart:opacity-100 transition-opacity bg-black/5 pointer-events-none">
                                                <div className="bg-black/70 text-white text-[10px] px-2 py-1 rounded backdrop-blur-sm shadow-sm flex items-center gap-1">
                                                    <TrendingUp size={10} /> MA 分析
                                                </div>
                                            </div>
                                         </>
                                     ) : (
                                        <div className="w-full h-full flex items-center justify-center border-t border-dashed border-gray-500/20">
                                            <span className="text-[10px] opacity-40">暂无趋势数据</span>
                                        </div>
                                     )}
                                 </div>
                                 
                                 {/* Footer */}
                                 <div className="flex justify-between items-center pt-3 border-t border-dashed border-gray-500/10">
                                     <button 
                                        onClick={(e) => { e.stopPropagation(); setReportDevice(device); }}
                                        className="text-xs font-bold flex items-center gap-1 transition-colors opacity-60 hover:opacity-100 hover:text-blue-500 bg-gray-500/5 px-2 py-1 rounded-md"
                                     >
                                         <FileText size={12} /> 报告
                                     </button>
                                     
                                     <button className={`text-xs font-bold flex items-center gap-1 transition-colors hover:text-blue-500 opacity-60 hover:opacity-100 bg-gray-500/5 px-2 py-1 rounded-md`}>
                                         详情诊断 <ArrowUpRight size={12} />
                                     </button>
                                 </div>
                             </div>
                         </div>
                     );
                 })}
             </div>
         )}
      </div>
    </div>
  );
};

export default Dashboard;
