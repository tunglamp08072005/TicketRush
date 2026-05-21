import { getAuthSession } from '../../auth/utils/authStorage';

const ADMIN_STATISTICS_API = 'http://localhost:8080/api/admin/statistics';

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
  const { token, role } = getAuthSession();
  if (!token) {
    throw new Error('Phien dang nhap da het. Vui long dang nhap lai.');
  }
  if (role !== 'ADMIN') {
    throw new Error('Ban khong co quyen admin de xem thong ke khan gia.');
  }

  const url = new URL(`${ADMIN_STATISTICS_API}/demographics`);
  if (eventId) {
    url.searchParams.set('eventId', String(eventId));
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Khong the tai du lieu thong ke khan gia');
  }

  return response.json();
}
