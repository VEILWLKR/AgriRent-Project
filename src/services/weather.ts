import { STATE_COORDINATES } from '../utils/location';

export interface WeatherData {
  temperature: number; // in Celsius
  condition: string;
  fieldAdvice: string;
  windSpeedKmH: number;
  locationName: string;
  isRealTime: boolean;
}

/**
 * Translates WMO weather codes to agronomic conditions
 */
function interpretWmoCode(code: number): { condition: string; advice: string } {
  if (code === 0) {
    return { condition: 'Clear Sky', advice: 'Ideal for field work & spraying' };
  } else if (code <= 3) {
    return { condition: 'Partly Cloudy', advice: 'Good to plough & harrow' };
  } else if (code >= 45 && code <= 48) {
    return { condition: 'Hazy / Harmattan', advice: 'Moderate visibility for field haulage' };
  } else if (code >= 51 && code <= 55) {
    return { condition: 'Light Drizzle', advice: 'Adequate seedbed moisture' };
  } else if (code >= 61 && code <= 65) {
    return { condition: 'Moderate Rain', advice: 'Hold heavy tillage; soil saturation check' };
  } else if (code >= 80 && code <= 82) {
    return { condition: 'Rain Showers', advice: 'Field work paused temporarily' };
  } else if (code >= 95) {
    return { condition: 'Thunderstorm', advice: 'Shelter tractors & operators' };
  }
  return { condition: 'Fair Weather', advice: 'Optimal for tractor operations' };
}

/**
 * Fetches real-time weather from Open-Meteo for the farmer's registered location,
 * with resilient agricultural fallback if offline or during network latency.
 */
export async function getRealtimeFarmWeather(
  farmState?: string,
  farmLGA?: string,
  farmLocation?: string
): Promise<WeatherData> {
  const stateKey = farmState || 'Oyo State';
  const coords = STATE_COORDINATES[stateKey] || STATE_COORDINATES['Oyo State'] || { lat: 7.3775, lon: 3.9470 };
  const locationLabel = farmLGA ? `${farmLGA}, ${stateKey}` : farmLocation || stateKey;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current_weather=true`;
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.current_weather) {
        const temp = Math.round(data.current_weather.temperature);
        const wmo = data.current_weather.weathercode ?? 1;
        const wind = Math.round(data.current_weather.windspeed ?? 12);
        const { condition, advice } = interpretWmoCode(wmo);

        return {
          temperature: temp,
          condition,
          fieldAdvice: advice,
          windSpeedKmH: wind,
          locationName: locationLabel,
          isRealTime: true,
        };
      }
    }
  } catch {
    // Network or abort fallback
  }

  // Realistic climatological fallback based on Nigerian current hour
  const currentHour = new Date().getHours();
  const baseTemp = currentHour >= 11 && currentHour <= 16 ? 32 : currentHour >= 17 && currentHour <= 21 ? 28 : 25;
  return {
    temperature: baseTemp,
    condition: 'Sunny',
    fieldAdvice: 'Good to plough',
    windSpeedKmH: 14,
    locationName: locationLabel,
    isRealTime: false,
  };
}
