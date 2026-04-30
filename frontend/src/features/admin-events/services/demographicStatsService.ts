import { getAuthSession } from '../../auth/utils/authStorage';

export interface DemographicStatsResponse {
  totalBuyers: number;
  genderDistribution: Record<string, number>;
  maleCount: number;
  femaleCount: number;
  otherCount: number;
  unknownGenderCount: number;
  ageGroupDistribution: Record<string, number>;
  age0_17: number;
  age18_24: number;
  age25_34: number;
  age35_44: number;
  age45_54: number;
  age55_64: number;
  age65Plus: number;
  unknownAgeCount: number;
  genderAgeBreakdown: {
    gender: string;
    ageGroup: string;
    count: number;
  }[];
}

export async function fetchDemographicStats(eventId?: number): Promise<DemographicStatsResponse> {
  const { token } = getAuthSession();
  const url = eventId ? `/api/admin/statistics/demographics?eventId=${eventId}` : '/api/admin/statistics/demographics';
  
  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('Không thể tải dữ liệu thống kê khán giả');
  }
  return response.json();
}