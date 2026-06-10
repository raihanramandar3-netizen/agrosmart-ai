
let weatherApiKey = process.env.WEATHER_API_KEY || '';

export const setWeatherApiKey = (key: string) => {
  weatherApiKey = key;
};

export interface WeatherData {
  temp: number;
  humidity: number;
  windSpeed: number;
  condition: string;
  city: string;
}

export const fetchRealWeather = async (lat?: number, long?: number, city?: string): Promise<WeatherData | null> => {
  try {
    // If we have an API Key, use OpenWeatherMap
    if (weatherApiKey) {
      let url = `https://api.openweathermap.org/data/2.5/weather?appid=${weatherApiKey}&units=metric&lang=id`;
      if (lat && long) {
        url += `&lat=${lat}&lon=${long}`;
      } else if (city) {
        url += `&q=${city}`;
      } else {
        url += `&q=Surabaya`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error("OpenWeatherMap fetch failed");
      const data = await response.json();

      return {
        temp: Math.round(data.main.temp),
        humidity: data.main.humidity,
        windSpeed: Math.round(data.wind.speed * 3.6), // m/s to km/h
        condition: data.weather[0].description,
        city: data.name
      };
    }

    // Fallback to wttr.in if no API key is set
    let url = 'https://wttr.in/';
    if (lat && long) {
      url += `${lat},${long}`;
    } else if (city) {
      url += city;
    } else {
      url += 'Surabaya';
    }
    url += '?format=j1';

    const response = await fetch(url);
    if (!response.ok) return null;
    const data = await response.json();

    const current = data.current_condition[0];
    const cityData = data.nearest_area[0];

    return {
      temp: parseInt(current.temp_C),
      humidity: parseInt(current.humidity),
      windSpeed: parseInt(current.windspeedKmph),
      condition: current.weatherDesc[0].value,
      city: city || cityData.areaName[0].value
    };
  } catch (error) {
    console.error("Failed to fetch real weather:", error);
    return null;
  }
};
