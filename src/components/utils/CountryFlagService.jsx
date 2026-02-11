import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// Hook to get all country flags
export function useCountryFlags() {
  return useQuery({
    queryKey: ['country-flags'],
    queryFn: () => base44.entities.CountryFlag.list(),
    staleTime: Infinity, // Country flags rarely change
    cacheTime: Infinity
  });
}

// Get flag emoji for a country name or code
export function getFlagEmoji(countryNameOrCode, countryFlags = []) {
  if (!countryNameOrCode) return '🏳️';
  
  const country = countryFlags.find(
    c => c.country_name === countryNameOrCode || 
         c.country_code === countryNameOrCode ||
         c.country_name.toLowerCase() === countryNameOrCode.toLowerCase()
  );
  
  return country?.flag_emoji || '🏳️';
}

// Component to display flag with country name
export function CountryFlag({ country, showName = false, size = 'md' }) {
  const { data: countryFlags = [] } = useCountryFlags();
  
  const countryData = countryFlags.find(
    c => c.country_name === country || 
         c.country_code === country ||
         c.country_name.toLowerCase() === country?.toLowerCase()
  );
  
  const countryCode = countryData?.country_code?.toLowerCase();
  
  const sizeMap = {
    sm: 'w-4 h-3',
    md: 'w-6 h-4',
    lg: 'w-8 h-6',
    xl: 'w-12 h-9'
  };
  
  return (
    <div className="flex items-center gap-2">
      {countryCode ? (
        <img 
          src={`https://flagcdn.com/${countryCode}.svg`}
          alt={`${country} flag`}
          className={`${sizeMap[size]} object-cover rounded shadow-sm`}
          onError={(e) => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'inline';
          }}
        />
      ) : null}
      <span className="text-lg" style={{ display: 'none' }}>{countryData?.flag_emoji || '🏳️'}</span>
      {showName && <span className="text-sm text-slate-700">{country}</span>}
    </div>
  );
}

// Initialize country flags in database (call once)
export async function initializeCountryFlags() {
  const countries = [
    { country_code: 'CN', country_name: 'China', flag_emoji: '🇨🇳', region: 'Asia', is_eu_member: false },
    { country_code: 'IN', country_name: 'India', flag_emoji: '🇮🇳', region: 'Asia', is_eu_member: false },
    { country_code: 'TR', country_name: 'Turkey', flag_emoji: '🇹🇷', region: 'Asia', is_eu_member: false },
    { country_code: 'US', country_name: 'USA', flag_emoji: '🇺🇸', region: 'Americas', is_eu_member: false },
    { country_code: 'BR', country_name: 'Brazil', flag_emoji: '🇧🇷', region: 'Americas', is_eu_member: false },
    { country_code: 'RU', country_name: 'Russia', flag_emoji: '🇷🇺', region: 'Europe', is_eu_member: false },
    { country_code: 'VN', country_name: 'Vietnam', flag_emoji: '🇻🇳', region: 'Asia', is_eu_member: false },
    { country_code: 'KR', country_name: 'South Korea', flag_emoji: '🇰🇷', region: 'Asia', is_eu_member: false },
    { country_code: 'JP', country_name: 'Japan', flag_emoji: '🇯🇵', region: 'Asia', is_eu_member: false },
    { country_code: 'MX', country_name: 'Mexico', flag_emoji: '🇲🇽', region: 'Americas', is_eu_member: false },
    { country_code: 'ID', country_name: 'Indonesia', flag_emoji: '🇮🇩', region: 'Asia', is_eu_member: false },
    { country_code: 'TH', country_name: 'Thailand', flag_emoji: '🇹🇭', region: 'Asia', is_eu_member: false },
    { country_code: 'MY', country_name: 'Malaysia', flag_emoji: '🇲🇾', region: 'Asia', is_eu_member: false },
    { country_code: 'PH', country_name: 'Philippines', flag_emoji: '🇵🇭', region: 'Asia', is_eu_member: false },
    { country_code: 'PK', country_name: 'Pakistan', flag_emoji: '🇵🇰', region: 'Asia', is_eu_member: false },
    { country_code: 'BD', country_name: 'Bangladesh', flag_emoji: '🇧🇩', region: 'Asia', is_eu_member: false },
    { country_code: 'EG', country_name: 'Egypt', flag_emoji: '🇪🇬', region: 'Africa', is_eu_member: false },
    { country_code: 'ZA', country_name: 'South Africa', flag_emoji: '🇿🇦', region: 'Africa', is_eu_member: false },
    { country_code: 'NG', country_name: 'Nigeria', flag_emoji: '🇳🇬', region: 'Africa', is_eu_member: false },
    { country_code: 'SA', country_name: 'Saudi Arabia', flag_emoji: '🇸🇦', region: 'Asia', is_eu_member: false },
    { country_code: 'AE', country_name: 'UAE', flag_emoji: '🇦🇪', region: 'Asia', is_eu_member: false },
    { country_code: 'UA', country_name: 'Ukraine', flag_emoji: '🇺🇦', region: 'Europe', is_eu_member: false },
    { country_code: 'AR', country_name: 'Argentina', flag_emoji: '🇦🇷', region: 'Americas', is_eu_member: false },
    { country_code: 'CL', country_name: 'Chile', flag_emoji: '🇨🇱', region: 'Americas', is_eu_member: false },
    { country_code: 'CO', country_name: 'Colombia', flag_emoji: '🇨🇴', region: 'Americas', is_eu_member: false },
    { country_code: 'PE', country_name: 'Peru', flag_emoji: '🇵🇪', region: 'Americas', is_eu_member: false },
    { country_code: 'AU', country_name: 'Australia', flag_emoji: '🇦🇺', region: 'Oceania', is_eu_member: false },
    { country_code: 'NZ', country_name: 'New Zealand', flag_emoji: '🇳🇿', region: 'Oceania', is_eu_member: false },
    { country_code: 'SG', country_name: 'Singapore', flag_emoji: '🇸🇬', region: 'Asia', is_eu_member: false },
    { country_code: 'CH', country_name: 'Switzerland', flag_emoji: '🇨🇭', region: 'Europe', is_eu_member: false },
    { country_code: 'NO', country_name: 'Norway', flag_emoji: '🇳🇴', region: 'Europe', is_eu_member: false },
    { country_code: 'GB', country_name: 'United Kingdom', flag_emoji: '🇬🇧', region: 'Europe', is_eu_member: false },
    { country_code: 'CA', country_name: 'Canada', flag_emoji: '🇨🇦', region: 'Americas', is_eu_member: false },
    { country_code: 'IL', country_name: 'Israel', flag_emoji: '🇮🇱', region: 'Asia', is_eu_member: false },
    { country_code: 'KE', country_name: 'Kenya', flag_emoji: '🇰🇪', region: 'Africa', is_eu_member: false },
    { country_code: 'MA', country_name: 'Morocco', flag_emoji: '🇲🇦', region: 'Africa', is_eu_member: false },
    { country_code: 'TN', country_name: 'Tunisia', flag_emoji: '🇹🇳', region: 'Africa', is_eu_member: false },
    { country_code: 'DZ', country_name: 'Algeria', flag_emoji: '🇩🇿', region: 'Africa', is_eu_member: false },
    { country_code: 'RS', country_name: 'Serbia', flag_emoji: '🇷🇸', region: 'Europe', is_eu_member: false },
    { country_code: 'BA', country_name: 'Bosnia', flag_emoji: '🇧🇦', region: 'Europe', is_eu_member: false },
    { country_code: 'AL', country_name: 'Albania', flag_emoji: '🇦🇱', region: 'Europe', is_eu_member: false },
    { country_code: 'BY', country_name: 'Belarus', flag_emoji: '🇧🇾', region: 'Europe', is_eu_member: false },
    { country_code: 'KZ', country_name: 'Kazakhstan', flag_emoji: '🇰🇿', region: 'Asia', is_eu_member: false },
    { country_code: 'UZ', country_name: 'Uzbekistan', flag_emoji: '🇺🇿', region: 'Asia', is_eu_member: false },
    { country_code: 'IQ', country_name: 'Iraq', flag_emoji: '🇮🇶', region: 'Asia', is_eu_member: false },
    { country_code: 'IR', country_name: 'Iran', flag_emoji: '🇮🇷', region: 'Asia', is_eu_member: false },
    { country_code: 'MM', country_name: 'Myanmar', flag_emoji: '🇲🇲', region: 'Asia', is_eu_member: false },
    { country_code: 'LK', country_name: 'Sri Lanka', flag_emoji: '🇱🇰', region: 'Asia', is_eu_member: false },
    { country_code: 'NP', country_name: 'Nepal', flag_emoji: '🇳🇵', region: 'Asia', is_eu_member: false },
    { country_code: 'KH', country_name: 'Cambodia', flag_emoji: '🇰🇭', region: 'Asia', is_eu_member: false },
    { country_code: 'LA', country_name: 'Laos', flag_emoji: '🇱🇦', region: 'Asia', is_eu_member: false },
    // EU Members
    { country_code: 'DE', country_name: 'Germany', flag_emoji: '🇩🇪', region: 'Europe', is_eu_member: true },
    { country_code: 'FR', country_name: 'France', flag_emoji: '🇫🇷', region: 'Europe', is_eu_member: true },
    { country_code: 'IT', country_name: 'Italy', flag_emoji: '🇮🇹', region: 'Europe', is_eu_member: true },
    { country_code: 'ES', country_name: 'Spain', flag_emoji: '🇪🇸', region: 'Europe', is_eu_member: true },
    { country_code: 'PL', country_name: 'Poland', flag_emoji: '🇵🇱', region: 'Europe', is_eu_member: true },
    { country_code: 'NL', country_name: 'Netherlands', flag_emoji: '🇳🇱', region: 'Europe', is_eu_member: true },
    { country_code: 'BE', country_name: 'Belgium', flag_emoji: '🇧🇪', region: 'Europe', is_eu_member: true },
    { country_code: 'SE', country_name: 'Sweden', flag_emoji: '🇸🇪', region: 'Europe', is_eu_member: true },
    { country_code: 'AT', country_name: 'Austria', flag_emoji: '🇦🇹', region: 'Europe', is_eu_member: true },
    { country_code: 'DK', country_name: 'Denmark', flag_emoji: '🇩🇰', region: 'Europe', is_eu_member: true },
    { country_code: 'FI', country_name: 'Finland', flag_emoji: '🇫🇮', region: 'Europe', is_eu_member: true },
    { country_code: 'PT', country_name: 'Portugal', flag_emoji: '🇵🇹', region: 'Europe', is_eu_member: true },
    { country_code: 'GR', country_name: 'Greece', flag_emoji: '🇬🇷', region: 'Europe', is_eu_member: true },
    { country_code: 'CZ', country_name: 'Czechia', flag_emoji: '🇨🇿', region: 'Europe', is_eu_member: true },
    { country_code: 'RO', country_name: 'Romania', flag_emoji: '🇷🇴', region: 'Europe', is_eu_member: true },
    { country_code: 'HU', country_name: 'Hungary', flag_emoji: '🇭🇺', region: 'Europe', is_eu_member: true },
    { country_code: 'BG', country_name: 'Bulgaria', flag_emoji: '🇧🇬', region: 'Europe', is_eu_member: true },
    { country_code: 'HR', country_name: 'Croatia', flag_emoji: '🇭🇷', region: 'Europe', is_eu_member: true },
    { country_code: 'SK', country_name: 'Slovakia', flag_emoji: '🇸🇰', region: 'Europe', is_eu_member: true },
    { country_code: 'SI', country_name: 'Slovenia', flag_emoji: '🇸🇮', region: 'Europe', is_eu_member: true },
    { country_code: 'LT', country_name: 'Lithuania', flag_emoji: '🇱🇹', region: 'Europe', is_eu_member: true },
    { country_code: 'LV', country_name: 'Latvia', flag_emoji: '🇱🇻', region: 'Europe', is_eu_member: true },
    { country_code: 'EE', country_name: 'Estonia', flag_emoji: '🇪🇪', region: 'Europe', is_eu_member: true },
    { country_code: 'IE', country_name: 'Ireland', flag_emoji: '🇮🇪', region: 'Europe', is_eu_member: true },
    { country_code: 'LU', country_name: 'Luxembourg', flag_emoji: '🇱🇺', region: 'Europe', is_eu_member: true },
    { country_code: 'MT', country_name: 'Malta', flag_emoji: '🇲🇹', region: 'Europe', is_eu_member: true },
    { country_code: 'CY', country_name: 'Cyprus', flag_emoji: '🇨🇾', region: 'Europe', is_eu_member: true }
  ];

  try {
    await base44.entities.CountryFlag.bulkCreate(countries);
    return { success: true, count: countries.length };
  } catch (error) {
    console.error('Failed to initialize country flags:', error);
    return { success: false, error };
  }
}