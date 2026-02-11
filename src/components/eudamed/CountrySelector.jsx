import React from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

// ISO 3166-1 alpha-2 country codes - EU + EEA + worldwide
const COUNTRIES = [
  // EU Member States (as of December 2025)
  { code: 'AT', name: 'Austria', region: 'EU' },
  { code: 'BE', name: 'Belgium', region: 'EU' },
  { code: 'BG', name: 'Bulgaria', region: 'EU' },
  { code: 'HR', name: 'Croatia', region: 'EU' },
  { code: 'CY', name: 'Cyprus', region: 'EU' },
  { code: 'CZ', name: 'Czech Republic', region: 'EU' },
  { code: 'DK', name: 'Denmark', region: 'EU' },
  { code: 'EE', name: 'Estonia', region: 'EU' },
  { code: 'FI', name: 'Finland', region: 'EU' },
  { code: 'FR', name: 'France', region: 'EU' },
  { code: 'DE', name: 'Germany', region: 'EU' },
  { code: 'GR', name: 'Greece', region: 'EU' },
  { code: 'HU', name: 'Hungary', region: 'EU' },
  { code: 'IE', name: 'Ireland', region: 'EU' },
  { code: 'IT', name: 'Italy', region: 'EU' },
  { code: 'LV', name: 'Latvia', region: 'EU' },
  { code: 'LT', name: 'Lithuania', region: 'EU' },
  { code: 'LU', name: 'Luxembourg', region: 'EU' },
  { code: 'MT', name: 'Malta', region: 'EU' },
  { code: 'NL', name: 'Netherlands', region: 'EU' },
  { code: 'PL', name: 'Poland', region: 'EU' },
  { code: 'PT', name: 'Portugal', region: 'EU' },
  { code: 'RO', name: 'Romania', region: 'EU' },
  { code: 'SK', name: 'Slovakia', region: 'EU' },
  { code: 'SI', name: 'Slovenia', region: 'EU' },
  { code: 'ES', name: 'Spain', region: 'EU' },
  { code: 'SE', name: 'Sweden', region: 'EU' },
  
  // EEA (non-EU)
  { code: 'IS', name: 'Iceland', region: 'EEA' },
  { code: 'LI', name: 'Liechtenstein', region: 'EEA' },
  { code: 'NO', name: 'Norway', region: 'EEA' },
  
  // Other European
  { code: 'CH', name: 'Switzerland', region: 'Europe' },
  { code: 'GB', name: 'United Kingdom', region: 'Europe' },
  { code: 'RS', name: 'Serbia', region: 'Europe' },
  { code: 'TR', name: 'Turkey', region: 'Europe' },
  { code: 'UA', name: 'Ukraine', region: 'Europe' },
  
  // Major Trading Partners
  { code: 'US', name: 'United States', region: 'Americas' },
  { code: 'CA', name: 'Canada', region: 'Americas' },
  { code: 'CN', name: 'China', region: 'Asia' },
  { code: 'JP', name: 'Japan', region: 'Asia' },
  { code: 'KR', name: 'South Korea', region: 'Asia' },
  { code: 'IN', name: 'India', region: 'Asia' },
  { code: 'SG', name: 'Singapore', region: 'Asia' },
  { code: 'TW', name: 'Taiwan', region: 'Asia' },
  { code: 'IL', name: 'Israel', region: 'Middle East' },
  { code: 'AU', name: 'Australia', region: 'Oceania' },
  { code: 'NZ', name: 'New Zealand', region: 'Oceania' },
  { code: 'BR', name: 'Brazil', region: 'Americas' },
  { code: 'MX', name: 'Mexico', region: 'Americas' },
  { code: 'ZA', name: 'South Africa', region: 'Africa' },
  { code: 'AE', name: 'United Arab Emirates', region: 'Middle East' },
  { code: 'SA', name: 'Saudi Arabia', region: 'Middle East' },
  { code: 'MY', name: 'Malaysia', region: 'Asia' },
  { code: 'TH', name: 'Thailand', region: 'Asia' },
  { code: 'VN', name: 'Vietnam', region: 'Asia' }
];

export default function CountrySelector({ value, onChange, required = false, label = "Country" }) {
  const selectedCountry = COUNTRIES.find(c => c.code === value);

  return (
    <div className="space-y-2">
      <Label>{label} {required && '*'}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger>
          <SelectValue placeholder="Select country">
            {selectedCountry ? `${selectedCountry.name} (${selectedCountry.code})` : 'Select country'}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-[300px]">
          {/* EU Member States */}
          <div className="px-2 py-1.5 text-xs font-bold text-slate-500 bg-slate-50 sticky top-0">
            🇪🇺 EU Member States
          </div>
          {COUNTRIES.filter(c => c.region === 'EU').map(country => (
            <SelectItem key={country.code} value={country.code}>
              {country.name} ({country.code})
            </SelectItem>
          ))}
          
          {/* EEA */}
          <div className="px-2 py-1.5 text-xs font-bold text-slate-500 bg-slate-50 sticky top-0 mt-2">
            🌍 EEA (non-EU)
          </div>
          {COUNTRIES.filter(c => c.region === 'EEA').map(country => (
            <SelectItem key={country.code} value={country.code}>
              {country.name} ({country.code})
            </SelectItem>
          ))}
          
          {/* Other Europe */}
          <div className="px-2 py-1.5 text-xs font-bold text-slate-500 bg-slate-50 sticky top-0 mt-2">
            🌍 Other Europe
          </div>
          {COUNTRIES.filter(c => c.region === 'Europe').map(country => (
            <SelectItem key={country.code} value={country.code}>
              {country.name} ({country.code})
            </SelectItem>
          ))}
          
          {/* Rest of World */}
          <div className="px-2 py-1.5 text-xs font-bold text-slate-500 bg-slate-50 sticky top-0 mt-2">
            🌏 Rest of World
          </div>
          {COUNTRIES.filter(c => !['EU', 'EEA', 'Europe'].includes(c.region)).map(country => (
            <SelectItem key={country.code} value={country.code}>
              {country.name} ({country.code}) - {country.region}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}