import { useEffect, useState } from "react";
import { fetchWeatherApi } from "openmeteo";

interface WeatherData {
	time: Date[];
	temperature_2m: Float32Array | null;
	precipitation_probability: Float32Array | null;
	wind_speed_10m: Float32Array | null;
	precipitation: Float32Array | null;
	relative_humidity_2m: Float32Array | null;
	cloud_cover: Float32Array | null;
}

function LaundryWeather() {
	const [weatherData, setWeatherData] = useState<WeatherData | null>(null);


	function getLocation() {
		return new Promise((success, error) => {
		navigator.geolocation.getCurrentPosition(success, error)});
	}

	useEffect(() => {
		async function getWeather() {

			try {
				const position = await getLocation();
			} catch (error) {
				console
			}
			const params = {
				latitude: position.coords.latitude, // Example: Manila
				longitude: position.coords.longitude,
				hourly: [
					"temperature_2m",
					"precipitation_probability",
					"wind_speed_10m",
					"precipitation",
					"relative_humidity_2m",
					"cloud_cover",
				],
			};

			const url = "https://api.open-meteo.com/v1/forecast";
			const responses = await fetchWeatherApi(url, params);
			const response = responses[0];

			const utcOffsetSeconds = response.utcOffsetSeconds();
			const hourly = response.hourly();

			if (!hourly) {
				console.error("No hourly data available");
				return;
			}

			const processedData: WeatherData = {
				time: [
					...Array(
						(Number(hourly.timeEnd()) - Number(hourly.time())) /
							hourly.interval()
					),
				].map(
					(_, i) =>
						new Date(
							(Number(hourly.time()) +
								i * hourly.interval() +
								utcOffsetSeconds) *
								1000
						)
				),
				temperature_2m: hourly.variables(0)?.valuesArray() || null,
				precipitation_probability: hourly.variables(1)?.valuesArray() || null,
				wind_speed_10m: hourly.variables(2)?.valuesArray() || null,
				precipitation: hourly.variables(3)?.valuesArray() || null,
				relative_humidity_2m: hourly.variables(4)?.valuesArray() || null,
				cloud_cover: hourly.variables(5)?.valuesArray() || null,
			};

			setWeatherData(processedData);
		}

		getWeather();
	}, []);

	if (!weatherData) return <p>Loading weather...</p>;
	console.table(weatherData);

	return (
		<div>
			<h2>Weather Data</h2>
			<ul>
				{weatherData.time.map((time, i) => (
					<li key={i}>
						{time.toLocaleString()} → 🌧️ Rain Chance:{" "}
						{weatherData.precipitation_probability?.[i] ?? "N/A"}% | 💧
						Precipitation: {weatherData.precipitation?.[i] ?? "N/A"}mm
					</li>
				))}
			</ul>
		</div>
	);
}

export default LaundryWeather;
