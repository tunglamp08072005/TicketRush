import { BarChart3, Users, PieChart, Filter, TrendingUp, AlertCircle, Info } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { fetchDemographicStats, type DemographicStatsResponse } from '../services/demographicStatsService';
import { fetchAdminEvents, type AdminEvent } from '../../events/services/eventApi';

function formatNumber(value: number): string {
  return value.toLocaleString('vi-VN');
}

function calculatePercentage(count: number, total: number): string {
  if (total === 0) return '0%';
  return ((count / total) * 100).toFixed(1) + '%';
}

// Simple Pie Chart Component
interface PieChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
}

function SimplePieChart({ data, size = 120 }: PieChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  if (total === 0) return <div className="flex items-center justify-center text-sm text-slate-400">Không có dữ liệu</div>;

  let cumulativePercent = 0;
  const slices = data.map((item) => {
    const percent = (item.value / total) * 100;
    const startAngle = cumulativePercent * 3.6;
    cumulativePercent += percent;
    return { ...item, percent, startAngle };
  });

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox="0 0 100 100" className="transform -rotate-90">
        {slices.map((slice, index) => {
          const radius = 40;
          const circumference = 2 * Math.PI * radius;
          const strokeDasharray = (slice.percent / 100) * circumference;
          const strokeDashoffset = -((slice.startAngle / 360) * circumference);
          return (
            <circle
              key={index}
              cx="50"
              cy="50"
              r={radius}
              fill="none"
              stroke={slice.color}
              strokeWidth="20"
              strokeDasharray={`${strokeDasharray} ${circumference - strokeDasharray}`}
              strokeDashoffset={strokeDashoffset}
            />
          );
        })}
      </svg>
      <div className="space-y-1">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-slate-600">{item.label}:</span>
            <span className="font-medium text-slate-900">{formatNumber(item.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Bar Chart Component
interface BarChartProps {
  data: { label: string; value: number; color: string }[];
  title: string;
}

function SimpleBarChart({ data, title }: BarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="mb-4 text-base font-semibold text-slate-700">{title}</h3>
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="flex items-center gap-3">
            <span className="w-16 text-sm text-slate-600">{item.label}</span>
            <div className="flex-1">
              <div className="h-6 w-full overflow-hidden rounded-md bg-slate-100">
                <div
                  className="h-full rounded-md transition-all duration-500"
                  style={{
                    width: `${(item.value / maxValue) * 100}%`,
                    backgroundColor: item.color,
                  }}
                />
              </div>
            </div>
            <span className="w-20 text-right text-sm font-medium text-slate-700">
              {formatNumber(item.value)}
            </span>
            <span className="w-14 text-right text-xs text-slate-500">
              {calculatePercentage(item.value, maxValue)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface DemographicChartProps {
  data: Record<string, number>;
  title: string;
  colorScheme: 'gender' | 'age';
}

function DemographicChart({ data, title, colorScheme }: DemographicChartProps) {
  const entries = Object.entries(data).filter(([_, v]) => v > 0);
  
  const genderColors: Record<string, string> = {
    MALE: '#3b82f6',
    FEMALE: '#ec4899',
    OTHER: '#8b5cf6',
    UNKNOWN: '#6b7280',
  };
  
  const ageColors: Record<string, string> = {
    '0-17': '#ef4444',
    '18-24': '#f97316',
    '25-34': '#eab308',
    '35-44': '#22c55e',
    '45-54': '#14b8a6',
    '55-64': '#3b82f6',
    '65+': '#6366f1',
    UNKNOWN: '#6b7280',
  };
  
  const labels: Record<string, string> = {
    MALE: 'Nam',
    FEMALE: 'Nữ',
    OTHER: 'Khác',
    UNKNOWN: 'Chưa xác định',
    '0-17': 'Dưới 18',
    '18-24': '18-24',
    '25-34': '25-34',
    '35-44': '35-44',
    '45-54': '45-54',
    '55-64': '55-64',
    '65+': '65+',
  };
  
  const colors = colorScheme === 'gender' ? genderColors : ageColors;
  const chartData = entries.map(([key, value]) => ({
    label: labels[key] || key,
    value,
    color: colors[key] || '#6b7280',
  }));

  if (colorScheme === 'gender') {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-4 text-base font-semibold text-slate-700">{title}</h3>
        <SimplePieChart data={chartData} />
      </div>
    );
  }

  return <SimpleBarChart data={chartData} title={title} />;
}

export default function AdminDemographicsPage() {
  const [stats, setStats] = useState<DemographicStatsResponse | null>(null);
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [statsData, eventData] = await Promise.all([
          fetchDemographicStats(selectedEventId),
          fetchAdminEvents(),
        ]);
        setStats(statsData);
        setEvents(eventData);
        setError('');
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message || 'Không thể tải thống kê');
        } else {
          setError('Không thể tải thống kê');
        }
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [selectedEventId]);

  const genderData = useMemo((): Record<string, number> => {
    if (!stats) return { MALE: 0, FEMALE: 0, OTHER: 0, UNKNOWN: 0 };
    return {
      MALE: stats.maleCount,
      FEMALE: stats.femaleCount,
      OTHER: stats.otherCount,
      UNKNOWN: stats.unknownGenderCount,
    };
  }, [stats]);

  const ageData = useMemo((): Record<string, number> => {
    if (!stats) return { '0-17': 0, '18-24': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55-64': 0, '65+': 0, UNKNOWN: 0 };
    return {
      '0-17': stats.age0_17,
      '18-24': stats.age18_24,
      '25-34': stats.age25_34,
      '35-44': stats.age35_44,
      '45-54': stats.age45_54,
      '55-64': stats.age55_64,
      '65+': stats.age65Plus,
      UNKNOWN: stats.unknownAgeCount,
    };
  }, [stats]);

  const genderAgeMatrix = useMemo((): Record<string, Record<string, number>> => {
    if (!stats?.genderAgeBreakdown) {
      const emptyMatrix: Record<string, Record<string, number>> = {};
      const genders = ['MALE', 'FEMALE', 'OTHER', 'UNKNOWN'];
      const ageGroups = ['0-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
      for (const gender of genders) {
        emptyMatrix[gender] = {};
        for (const age of ageGroups) {
          emptyMatrix[gender][age] = 0;
        }
      }
      return emptyMatrix;
    }
    
    const matrix: Record<string, Record<string, number>> = {};
    const genders = ['MALE', 'FEMALE', 'OTHER', 'UNKNOWN'];
    const ageGroups = ['0-17', '18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
    
    for (const gender of genders) {
      matrix[gender] = {};
      for (const age of ageGroups) {
        matrix[gender][age] = 0;
      }
    }
    
    for (const item of stats.genderAgeBreakdown) {
      if (matrix[item.gender]) {
        matrix[item.gender][item.ageGroup] = item.count;
      }
    }
    
    return matrix;
  }, [stats]);

  const genderLabels: Record<string, string> = {
    MALE: 'Nam',
    FEMALE: 'Nữ',
    OTHER: 'Khác',
    UNKNOWN: 'Chưa xác định',
  };

  const ageLabels: Record<string, string> = {
    '0-17': 'Dưới 18',
    '18-24': '18-24',
    '25-34': '25-34',
    '35-44': '35-44',
    '45-54': '45-54',
    '55-64': '55-64',
    '65+': '65+',
  };

  // Auto-generated Insights
  const totalKnownAge = (stats?.age0_17 || 0) + (stats?.age18_24 || 0) + (stats?.age25_34 || 0) + 
    (stats?.age35_44 || 0) + (stats?.age45_54 || 0) + (stats?.age55_64 || 0) + (stats?.age65Plus || 0);
  
  const ageGroups = [
    { key: '0-17', label: 'Dưới 18', count: stats?.age0_17 || 0 },
    { key: '18-24', label: '18-24', count: stats?.age18_24 || 0 },
    { key: '25-34', label: '25-34', count: stats?.age25_34 || 0 },
    { key: '35-44', label: '35-44', count: stats?.age35_44 || 0 },
    { key: '45-54', label: '45-54', count: stats?.age45_54 || 0 },
    { key: '55-64', label: '55-64', count: stats?.age55_64 || 0 },
    { key: '65+', label: '65+', count: stats?.age65Plus || 0 },
  ];
  
  const dominantAge = ageGroups.reduce((max, group) => group.count > max.count ? group : max, ageGroups[0]);
  const ageDominant = dominantAge.label;
  const ageMaxCount = dominantAge.count;
  const isYoungDominant = ['18-24', '25-34'].includes(ageDominant);
  
  const maleCount = stats?.maleCount || 0;
  const femaleCount = stats?.femaleCount || 0;
  const otherCount = stats?.otherCount || 0;
  const totalGender = maleCount + femaleCount + otherCount;
  
  const genderDominant = maleCount >= femaleCount && maleCount >= otherCount ? 'MALE' :
    femaleCount > otherCount ? 'FEMALE' :
    otherCount > 0 ? 'OTHER' : 'UNKNOWN';
  const genderPercent = calculatePercentage(
    genderDominant === 'MALE' ? maleCount : genderDominant === 'FEMALE' ? femaleCount : otherCount,
    totalGender || 1
  );
  
  const malePercent = calculatePercentage(maleCount, totalGender || 1);
  const femalePercent = calculatePercentage(femaleCount, totalGender || 1);
  const maleRatio = totalGender > 0 ? ((maleCount / totalGender) * 10).toFixed(1) : '0';
  const femaleRatio = totalGender > 0 ? ((femaleCount / totalGender) * 10).toFixed(1) : '0';
  
  const youngCount = (stats?.age18_24 || 0) + (stats?.age25_34 || 0);
  const middleCount = (stats?.age35_44 || 0) + (stats?.age45_54 || 0);
  const seniorCount = (stats?.age55_64 || 0) + (stats?.age65Plus || 0);
  
  let targetAudience = 'Đa dạng';
  let trendInsight = '';
  
  if (youngCount > middleCount && youngCount > seniorCount) {
    targetAudience = 'Thanh thiếu niên & Người trẻ (18-34 tuổi)';
    trendInsight = 'Khán giả chủ yếu là người trẻ. Nên tập trung vào các sự kiện giải trí, âm nhạc và công nghệ. Chiến lược marketing nên nhắm đến các kênh mạng xã hội và nền tảng trực tuyến.';
  } else if (middleCount > youngCount && middleCount > seniorCount) {
    targetAudience = 'Trung niên (35-54 tuổi)';
    trendInsight = 'Khán giả chủ yếu là người trung niên có thu nhập ổn định. Phù hợp với các sự kiện văn hóa, nghệ thuật và kinh doanh. Nên tập trung vào chất lượng và trải nghiệm cao cấp.';
  } else if (seniorCount > 0) {
    targetAudience = 'Người cao tuổi (55+ tuổi)';
    trendInsight = 'Có sự quan tâm từ nhóm khán giả cao tuổi. Nên thiết kế sự kiện phù hợp với đối tượng này (thời gian, địa điểm, tiện nghi).';
  } else {
    targetAudience = 'Đa dạng độ tuổi';
    trendInsight = 'Phân bố khán giả đa dạng across các nhóm tuổi. Nên đa dạng hóa danh mục sự kiện để phục vụ tất cả đối tượng.';
  }

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Thống kê khán giả</h1>
          <p className="text-sm text-slate-600">Phân tích demography của khách hàng</p>
        </div>
        
        {/* Event Filter */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-500" />
          <select
            value={selectedEventId || ''}
            onChange={(e) => setSelectedEventId(e.target.value ? Number(e.target.value) : undefined)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-slate-500 focus:outline-none"
          >
            <option value="">Tất cả sự kiện</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards - Total Audience */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Tổng số khán giả đã mua vé</p>
              <p className="text-xl font-bold text-slate-900">{formatNumber(stats?.totalBuyers || 0)}</p>
            </div>
          </div>
        </div>
        
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <PieChart className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Nam giới</p>
              <p className="text-xl font-bold text-slate-900">{formatNumber(stats?.maleCount || 0)}</p>
              <p className="text-xs text-slate-500">{malePercent}</p>
            </div>
          </div>
        </div>
        
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-pink-100 p-2">
              <PieChart className="h-5 w-5 text-pink-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Nữ giới</p>
              <p className="text-xl font-bold text-slate-900">{formatNumber(stats?.femaleCount || 0)}</p>
              <p className="text-xs text-slate-500">{femalePercent}</p>
            </div>
          </div>
        </div>
        
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-2">
              <BarChart3 className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-slate-600">Nhóm tuổi phổ biến nhất</p>
              <p className="text-xl font-bold text-slate-900">{ageDominant}</p>
              <p className="text-xs text-slate-500">{calculatePercentage(ageMaxCount, totalKnownAge)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <DemographicChart data={genderData} title="Phân bố giới tính" colorScheme="gender" />
        <DemographicChart data={ageData} title="Phân bố độ tuổi" colorScheme="age" />
      </div>

      {/* Gender-Age Matrix */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-4 text-base font-semibold text-slate-700">Ma trận giới tính - độ tuổi</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="pb-2 text-left font-medium text-slate-600">Giới tính</th>
                {Object.keys(ageLabels).map((age) => (
                  <th key={age} className="pb-2 text-center font-medium text-slate-600">
                    {ageLabels[age]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(genderLabels).map(([gender, label]) => (
                <tr key={gender} className="border-b border-slate-100">
                  <td className="py-2 font-medium text-slate-700">{label}</td>
                  {Object.keys(ageLabels).map((age) => (
                    <td key={age} className="py-2 text-center text-slate-600">
                      {genderAgeMatrix[gender]?.[age] ?? 0}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Insights - Auto Analysis */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-indigo-600" />
          <h3 className="text-base font-semibold text-slate-700">Insights tự động - Phân tích xu hướng</h3>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* Gender Insight */}
          <div className="rounded-lg bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              {genderDominant === 'MALE' ? (
                <TrendingUp className="h-4 w-4 text-blue-600" />
              ) : genderDominant === 'FEMALE' ? (
                <TrendingUp className="h-4 w-4 text-pink-600" />
              ) : (
                <Info className="h-4 w-4 text-purple-600" />
              )}
              <span className="text-sm font-medium text-slate-700">Phân tích giới tính</span>
            </div>
            <p className="text-sm text-slate-600">
              {genderDominant === 'MALE' && (
                <>Nam giới chiếm ưu thế với <strong>{genderPercent}</strong> tổng số khán giả đã mua vé.</>
              )}
              {genderDominant === 'FEMALE' && (
                <>Nữ giới chiếm ưu thế với <strong>{genderPercent}</strong> tổng số khán giả đã mua vé.</>
              )}
              {genderDominant === 'OTHER' && (
                <>Nhóm giới tính khác chiếm <strong>{genderPercent}</strong>. Cần theo dõi xu hướng này.</>
              )}
              {genderDominant === 'UNKNOWN' && (
                <>Chưa có thông tin giới tính cho <strong>{genderPercent}</strong> khán giả. Cần thu thập thêm dữ liệu.</>
              )}
            </p>
          </div>

          {/* Age Insight */}
          <div className="rounded-lg bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-slate-700">Phân tích độ tuổi</span>
            </div>
            <p className="text-sm text-slate-600">
              Nhóm tuổi <strong>{ageDominant}</strong> chiếm tỷ trọng cao nhất (
              {calculatePercentage(ageMaxCount, totalKnownAge)}). 
              {isYoungDominant && ' Đây là nhóm khán giả trẻ, phù hợp với xu hướng giải trí hiện đại.'}
              {!isYoungDominant && ageDominant !== '65+' && ' Đây là nhóm khán giả có thu nhập ổn định.'}
              {ageDominant === '65+' && ' Đây là nhóm khán giả cao tuổi, cần thiết kế sự kiện phù hợp.'}
            </p>
          </div>

          {/* Trend Insight */}
          <div className="rounded-lg bg-slate-50 p-4">
            <div className="mb-2 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-medium text-slate-700">Xu hướng & Khuyến nghị</span>
            </div>
            <p className="text-sm text-slate-600">
              {trendInsight}
            </p>
          </div>
        </div>

        {/* Detailed Insights List */}
        <div className="mt-4 border-t border-slate-200 pt-4">
          <h4 className="mb-3 text-sm font-medium text-slate-700">Chi tiết phân tích:</h4>
          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500" />
              <span>Tổng số khán giả đã mua vé: <strong className="text-slate-900">{formatNumber(stats?.totalBuyers || 0)}</strong></span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-pink-500" />
              <span>Tỷ lệ Nam/Nữ: {maleRatio}:{femaleRatio} (Nam {malePercent}, Nữ {femalePercent})</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-green-500" />
              <span>Nhóm tuổi phổ biến: <strong className="text-slate-900">{ageDominant}</strong> ({calculatePercentage(ageMaxCount, totalKnownAge)})</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-purple-500" />
              <span>Đối tượng mục tiêu chính: <strong className="text-slate-900">{targetAudience}</strong></span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}