// Weather API Configuration
const WEATHER_API_KEY = 'b6fd43b195410c8396be642ca8a137fa'; // Using free OpenWeatherMap API
const GEOCODING_API = 'https://api.openweathermap.org/geo/1.0/direct';
const WEATHER_API = 'https://api.openweathermap.org/data/2.5/weather';
const FORECAST_API = 'https://api.openweathermap.org/data/2.5/forecast';

// State Management
let currentWeather = null;
let currentForecast = null;
let currentLocation = null;
let isCelsius = true;
let searchHistory = [];

// DOM Elements
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const geoBtn = document.getElementById('geoBtn');
const suggestions = document.getElementById('suggestions');
const errorMessage = document.getElementById('errorMessage');
const loading = document.getElementById('loading');
const weatherContent = document.getElementById('weatherContent');
const welcomeSection = document.getElementById('welcomeSection');
const tempToggle = document.getElementById('tempToggle');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadSearchHistory();
    addEventListeners();
});

// Event Listeners
function addEventListeners() {
    searchBtn.addEventListener('click', () => searchWeather(searchInput.value));
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchWeather(searchInput.value);
    });
    searchInput.addEventListener('input', handleSearchInput);
    geoBtn.addEventListener('click', getUserLocation);
    tempToggle.addEventListener('change', toggleTemperatureUnit);
}

// Search Weather
async function searchWeather(query) {
    if (!query.trim()) {
        showError('Please enter a city name');
        return;
    }

    showLoading(true);
    hideError();

    try {
        // Get coordinates from city name
        const geoResponse = await fetch(
            `${GEOCODING_API}?q=${query}&limit=1&appid=${WEATHER_API_KEY}`
        );

        if (!geoResponse.ok) {
            throw new Error('City not found');
        }

        const geoData = await geoResponse.json();

        if (geoData.length === 0) {
            throw new Error('City not found');
        }

        const { lat, lon, name, country } = geoData[0];

        // Fetch weather data
        await fetchWeatherData(lat, lon, name, country);
        
        // Add to search history
        addToSearchHistory(name, country);
        
        // Hide suggestions
        suggestions.classList.remove('show');
        searchInput.value = '';

    } catch (error) {
        console.error('Error:', error);
        showError('Failed to fetch weather data. Please try again.');
    } finally {
        showLoading(false);
    }
}

// Fetch Weather Data
async function fetchWeatherData(lat, lon, cityName, countryName) {
    try {
        // Fetch current weather
        const weatherRes = await fetch(
            `${WEATHER_API}?lat=${lat}&lon=${lon}&units=metric&appid=${WEATHER_API_KEY}`
        );

        // Fetch forecast data
        const forecastRes = await fetch(
            `${FORECAST_API}?lat=${lat}&lon=${lon}&units=metric&appid=${WEATHER_API_KEY}`
        );

        if (!weatherRes.ok || !forecastRes.ok) {
            throw new Error('Failed to fetch weather data');
        }

        const weatherData = await weatherRes.json();
        const forecastData = await forecastRes.json();

        currentWeather = weatherData;
        currentForecast = forecastData;
        currentLocation = { lat, lon, name: cityName, country: countryName };

        displayWeather(weatherData, forecastData);
        showWeatherContent();

    } catch (error) {
        console.error('Error fetching weather:', error);
        showError('Failed to load weather data');
    }
}

// Display Weather
function displayWeather(weather, forecast) {
    // Update location
    document.getElementById('locationName').textContent = 
        `${currentLocation.name}, ${currentLocation.country}`;
    document.getElementById('updateTime').textContent = 
        `Last updated: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    // Current weather
    const temp = isCelsius ? weather.main.temp : celsiusToFahrenheit(weather.main.temp);
    const feelsLike = isCelsius ? weather.main.feels_like : celsiusToFahrenheit(weather.main.feels_like);
    
    document.getElementById('temperature').textContent = Math.round(temp) + '°';
    document.getElementById('tempUnit').textContent = isCelsius ? 'C' : 'F';
    document.getElementById('weatherDesc').textContent = weather.weather[0].main;
    document.getElementById('feelsLike').textContent = 
        `Feels like: ${Math.round(feelsLike)}°`;

    // Weather icon
    const iconCode = weather.weather[0].icon;
    document.getElementById('weatherIcon').src = 
        `https://openweathermap.org/img/wn/${iconCode}@4x.png`;

    // Weather details
    document.getElementById('humidity').textContent = `${weather.main.humidity}%`;
    document.getElementById('windSpeed').textContent = `${weather.wind.speed.toFixed(1)} m/s`;
    document.getElementById('pressure').textContent = `${weather.main.pressure} hPa`;
    document.getElementById('visibility').textContent = `${(weather.visibility / 1000).toFixed(1)} km`;
    document.getElementById('clouds').textContent = `${weather.clouds.all}%`;

    // Sunrise and Sunset
    const sunrise = new Date(weather.sys.sunrise * 1000).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    const sunset = new Date(weather.sys.sunset * 1000).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    document.getElementById('sunrise').textContent = sunrise;
    document.getElementById('sunset').textContent = sunset;

    // Location details
    document.getElementById('latitude').textContent = weather.coord.lat.toFixed(4);
    document.getElementById('longitude').textContent = weather.coord.lon.toFixed(4);

    // Timezone
    const timezoneOffset = weather.timezone;
    const tzHours = Math.floor(Math.abs(timezoneOffset) / 3600);
    const tzMinutes = Math.floor((Math.abs(timezoneOffset) % 3600) / 60);
    const tzSign = timezoneOffset >= 0 ? '+' : '-';
    document.getElementById('timezone').textContent = 
        `UTC ${tzSign}${String(tzHours).padStart(2, '0')}:${String(tzMinutes).padStart(2, '0')}`;

    // Current time
    updateCurrentTime();

    // 5-Day Forecast
    displayForecast(forecast);

    // Hourly Forecast
    displayHourlyForecast(forecast);
}

// Display 5-Day Forecast
function displayForecast(forecast) {
    const forecastGrid = document.getElementById('forecastGrid');
    const dailyForecasts = {};

    // Group by day
    forecast.list.forEach(item => {
        const date = new Date(item.dt * 1000).toLocaleDateString();
        if (!dailyForecasts[date]) {
            dailyForecasts[date] = [];
        }
        dailyForecasts[date].push(item);
    });

    // Get one forecast per day (5 days)
    const days = Object.entries(dailyForecasts).slice(0, 5);
    
    forecastGrid.innerHTML = days.map(([date, forecasts]) => {
        const midDay = forecasts[Math.floor(forecasts.length / 2)];
        const temps = forecasts.map(f => f.main.temp);
        const high = Math.max(...temps);
        const low = Math.min(...temps);
        const icon = midDay.weather[0].icon;
        const condition = midDay.weather[0].main;

        const displayDate = new Date(midDay.dt * 1000);
        const dayName = displayDate.toLocaleDateString('en-US', { weekday: 'short' });
        const dateStr = displayDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

        return `
            <div class="forecast-card">
                <div class="date">${dayName}<br>${dateStr}</div>
                <img src="https://openweathermap.org/img/wn/${icon}@2x.png" 
                     alt="Weather icon" class="icon">
                <div class="condition">${condition}</div>
                <div class="temp">${Math.round(isCelsius ? high : celsiusToFahrenheit(high))}°</div>
                <div class="high-low">
                    Low: ${Math.round(isCelsius ? low : celsiusToFahrenheit(low))}°
                </div>
            </div>
        `;
    }).join('');
}

// Display Hourly Forecast
function displayHourlyForecast(forecast) {
    const hourlyForecast = document.getElementById('hourlyForecast');
    
    hourlyForecast.innerHTML = forecast.list.slice(0, 8).map(item => {
        const time = new Date(item.dt * 1000).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        const temp = isCelsius ? item.main.temp : celsiusToFahrenheit(item.main.temp);
        const icon = item.weather[0].icon;
        const condition = item.weather[0].main;

        return `
            <div class="hourly-card">
                <div class="time">${time}</div>
                <img src="https://openweathermap.org/img/wn/${icon}@2x.png" 
                     alt="Weather icon" class="icon">
                <div class="temp">${Math.round(temp)}°</div>
                <div class="condition">${condition}</div>
            </div>
        `;
    }).join('');
}

// Temperature Conversion
function celsiusToFahrenheit(celsius) {
    return (celsius * 9/5) + 32;
}

// Toggle Temperature Unit
function toggleTemperatureUnit() {
    isCelsius = !isCelsius;
    if (currentWeather && currentForecast) {
        displayWeather(currentWeather, currentForecast);
    }
}

// Geolocation
function getUserLocation() {
    if ('geolocation' in navigator) {
        showLoading(true);
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                
                try {
                    // Reverse geocode to get city name
                    const geoRes = await fetch(
                        `https://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${WEATHER_API_KEY}`
                    );
                    const geoData = await geoRes.json();
                    
                    if (geoData.length > 0) {
                        const { name, country } = geoData[0];
                        await fetchWeatherData(latitude, longitude, name, country);
                        showWeatherContent();
                    }
                } catch (error) {
                    console.error('Error getting location:', error);
                    showError('Failed to get your location');
                } finally {
                    showLoading(false);
                }
            },
            (error) => {
                showLoading(false);
                showError('Unable to access your location. Please enable location services.');
                console.error('Geolocation error:', error);
            }
        );
    } else {
        showError('Geolocation is not supported by your browser');
    }
}

// Search Input Handler
async function handleSearchInput(e) {
    const query = e.target.value.trim();

    if (query.length < 2) {
        suggestions.classList.remove('show');
        return;
    }

    try {
        const response = await fetch(
            `${GEOCODING_API}?q=${query}&limit=5&appid=${WEATHER_API_KEY}`
        );
        const data = await response.json();

        if (data.length > 0) {
            suggestions.innerHTML = data.map(location => `
                <div class="suggestion-item" onclick="selectSuggestion('${location.name}', '${location.country}')">
                    ${location.name}, ${location.country}
                </div>
            `).join('');
            suggestions.classList.add('show');
        } else {
            suggestions.classList.remove('show');
        }
    } catch (error) {
        console.error('Error fetching suggestions:', error);
    }
}

function selectSuggestion(name, country) {
    searchInput.value = `${name}, ${country}`;
    suggestions.classList.remove('show');
    searchWeather(`${name}, ${country}`);
}

// Search History
function addToSearchHistory(city, country) {
    const entry = {
        city,
        country,
        timestamp: new Date().toLocaleTimeString()
    };

    // Remove duplicate
    searchHistory = searchHistory.filter(item => item.city !== city);
    
    // Add to front
    searchHistory.unshift(entry);
    
    // Keep only last 10
    if (searchHistory.length > 10) {
        searchHistory.pop();
    }

    saveSearchHistory();
    renderSearchHistory();
}

function renderSearchHistory() {
    const historyContainer = document.getElementById('searchHistory');

    if (searchHistory.length === 0) {
        historyContainer.innerHTML = '<p class="empty-message">No recent searches</p>';
        return;
    }

    historyContainer.innerHTML = searchHistory.map((item, index) => `
        <div class="history-item" onclick="searchWeather('${item.city}')">
            <div class="city">${item.city}</div>
            <div class="time">${item.timestamp}</div>
        </div>
    `).join('');
}

function saveSearchHistory() {
    localStorage.setItem('weatherSearchHistory', JSON.stringify(searchHistory));
}

function loadSearchHistory() {
    const stored = localStorage.getItem('weatherSearchHistory');
    if (stored) {
        searchHistory = JSON.parse(stored);
        renderSearchHistory();
    }
}

// Update current time
function updateCurrentTime() {
    const updateTime = () => {
        const now = new Date();
        document.getElementById('currentTime').textContent = 
            now.toLocaleTimeString();
    };

    updateTime();
    setInterval(updateTime, 1000);
}

// UI Helpers
function showLoading(show) {
    loading.classList.toggle('active', show);
}

function showWeatherContent() {
    welcomeSection.style.display = 'none';
    weatherContent.style.display = 'block';
}

function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.add('show');
    setTimeout(() => {
        errorMessage.classList.remove('show');
    }, 5000);
}

function hideError() {
    errorMessage.classList.remove('show');
}

// Make functions globally available
window.searchWeather = searchWeather;
window.selectSuggestion = selectSuggestion;

console.log('Weather Dashboard initialized! 🌤️');
