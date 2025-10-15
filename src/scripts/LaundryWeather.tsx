import { useEffect, useState } from "react";
import { fetchWeatherApi } from "openmeteo";
import { find_best_drying_hours } from "./DryingScore";
interface WeatherData {
	time: Date[];
	temperature_2m: Float32Array | null;
	precipitation_probability: Float32Array | null;
	wind_speed_10m: Float32Array | null;
	precipitation: Float32Array | null;
	relative_humidity_2m: Float32Array | null;
	cloud_cover: Float32Array | null;
	is_day: Float32Array | null;
}

function LaundryWeather() {
	const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
	const [locationStatus, setLocationStatus] = useState<string>(
		"Getting location..."
	);
	const [userLocation, setUserLocation] = useState<{
		lat: number;
		lon: number;
	} | null>(null);

	function getLocation(): Promise<GeolocationPosition> {
		return new Promise((resolve, reject) => {
			if (!navigator.geolocation) {
				reject(new Error("Geolocation is not supported by this browser"));
				return;
			}

			const options = {
				enableHighAccuracy: true,
				timeout: 10000, // 10 seconds
				maximumAge: 300000, // 5 minutes cache
			};

			navigator.geolocation.getCurrentPosition(
				(position) => {
					console.log(
						"Location found:",
						position.coords.latitude,
						position.coords.longitude
					);
					resolve(position);
				},
				(error) => {
					let errorMessage;
					switch (error.code) {
						case error.PERMISSION_DENIED:
							errorMessage = "User denied location access";
							break;
						case error.POSITION_UNAVAILABLE:
							errorMessage = "Location information unavailable";
							break;
						case error.TIMEOUT:
							errorMessage = "Location request timed out";
							break;
						default:
							errorMessage = "Unknown location error";
					}
					console.error("Location error:", errorMessage);
					reject(new Error(errorMessage));
				},
				options
			);
		});
	}

	useEffect(() => {
		async function fetchWeatherData() {
			let position;

			try {
				setLocationStatus("Getting your location...");
				position = await getLocation();
				setUserLocation({
					lat: position.coords.latitude,
					lon: position.coords.longitude,
				});
				setLocationStatus("Location found! Fetching weather...");
			} catch (error) {
				console.error("Location error:", error);
				setLocationStatus("Using default location (Manila)");
				// Fallback to Manila coordinates
				position = {
					coords: {
						latitude: 14.5995,
						longitude: 120.9842,
					},
				} as GeolocationPosition;
			}

			try {
				const params = {
					latitude: position.coords.latitude,
					longitude: position.coords.longitude,
					hourly: [
						"precipitation_probability",
						"precipitation",
						"temperature_2m",
						"wind_speed_10m",
						"relative_humidity_2m",
						"cloud_cover",
						"is_day",
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
					precipitation_probability: hourly.variables(0)?.valuesArray() || null,
					precipitation: hourly.variables(1)?.valuesArray() || null,
					temperature_2m: hourly.variables(2)?.valuesArray() || null,
					wind_speed_10m: hourly.variables(3)?.valuesArray() || null,
					relative_humidity_2m: hourly.variables(4)?.valuesArray() || null,
					cloud_cover: hourly.variables(5)?.valuesArray() || null,
					is_day: hourly.variables(6)?.valuesArray() || null,
				};

				setWeatherData(processedData);
			} catch (error) {
				console.error("Weather API error:", error);
			}

			setLocationStatus("");
		}

		fetchWeatherData();
	}, []);

	if (!weatherData) return <p>Loading weather...</p>;
	console.table(weatherData);

	const { score, bestHoursList, neutralHoursList } =
		find_best_drying_hours(weatherData);

	// Calculate overall score (average of all hourly scores)
	const averageScore =
		score.length > 0
			? Math.round((score.reduce((sum, s) => sum + s, 0) / score.length) * 10) /
			  10
			: 0;

	return (
		<div style={{ color: "black" }}>
			<h2>🧺 Laundry Weather Forecast</h2>

			{/* Location Status */}
			{locationStatus && (
				<p style={{ fontStyle: "italic", color: "#666" }}>
					📍 {locationStatus}
				</p>
			)}

			{/* Current Location */}
			{userLocation && (
				<p style={{ fontSize: "0.9em", color: "#666" }}>
					📍 Location: {userLocation.lat.toFixed(4)},{" "}
					{userLocation.lon.toFixed(4)}
				</p>
			)}

			{/* Drying Score Summary */}
			<div
				style={{
					backgroundColor: "#f0f8ff",
					padding: "15px",
					borderRadius: "8px",
					marginBottom: "20px",
				}}
			>
				<h3>📊 Today's Laundry Recommendations</h3>

				{/* Overall Drying Score */}
				<div
					style={{
						marginBottom: "15px",
						padding: "10px",
						backgroundColor: "#e8f5e8",
						borderRadius: "5px",
					}}
				>
					<h4 style={{ margin: "0 0 5px 0", color: "#2d5a2d" }}>
						🎯 Overall Drying Score: <strong>{averageScore}/10</strong>
					</h4>
					<p style={{ margin: "0", fontSize: "0.9em", color: "#555" }}>
						{averageScore >= 8
							? "🟢 Excellent drying conditions!"
							: averageScore >= 6
							? "🟡 Good drying conditions"
							: averageScore >= 4
							? "🟠 Fair drying conditions"
							: "🔴 Poor drying conditions"}
					</p>
				</div>

				{/* Best Hours */}
				{bestHoursList.length > 0 ? (
					<div style={{ marginBottom: "10px" }}>
						<h4 style={{ color: "green" }}>
							✅ Best Times to Hang Laundry Today:
						</h4>
						<ul>
							{bestHoursList
								.filter((item) => {
									const today = new Date();
									return item.time.toDateString() === today.toDateString();
								})
								.map((item, index) => (
									<li
										key={index}
										style={{ color: "green", fontWeight: "bold" }}
									>
										{item.time.toLocaleTimeString()} (Score: {item.score}/10)
									</li>
								))}
						</ul>
						{bestHoursList.filter((item) => {
							const today = new Date();
							return item.time.toDateString() === today.toDateString();
						}).length === 0 && (
							<p style={{ color: "orange" }}>⚠️ No ideal drying times today</p>
						)}
					</div>
				) : (
					<p style={{ color: "orange" }}>⚠️ No ideal drying times today</p>
				)}

				{/* Neutral Hours */}
				{neutralHoursList.length > 0 && (
					<div>
						<h4 style={{ color: "orange" }}>
							⚠️ Okay Times Today (Not Ideal):
						</h4>
						<ul>
							{neutralHoursList
								.filter((item) => {
									const today = new Date();
									return item.time.toDateString() === today.toDateString();
								})
								.map((item, index) => (
									<li key={index} style={{ color: "orange" }}>
										{item.time.toLocaleTimeString()} (Score: {item.score}/10)
									</li>
								))}
						</ul>
					</div>
				)}

				{/* No good times message */}
				{bestHoursList.filter((item) => {
					const today = new Date();
					return item.time.toDateString() === today.toDateString();
				}).length === 0 &&
					neutralHoursList.filter((item) => {
						const today = new Date();
						return item.time.toDateString() === today.toDateString();
					}).length === 0 && (
						<p style={{ color: "red", fontWeight: "bold" }}>
							❌ Not recommended to hang laundry today - poor drying conditions
						</p>
					)}
			</div>

			{/* Today's Detailed Weather Data with Individual Scores */}
			<h3>🌤️ Today's Detailed Weather & Drying Scores</h3>
			<ul>
				{weatherData.time
					.map((time, i) => ({ time, index: i }))
					.filter(({ time }) => {
						const today = new Date();
						return time.toDateString() === today.toDateString();
					})
					.map(({ time, index: i }) => {
						const hourScore = score[i] || 0;
						const scoreColor =
							hourScore >= 8 ? "green" : hourScore >= 5 ? "orange" : "red";
						const scoreEmoji =
							hourScore >= 8 ? "🟢" : hourScore >= 5 ? "🟡" : "🔴";

						return (
							<li key={i} style={{ marginBottom: "8px" }}>
								<strong style={{ color: scoreColor }}>
									{scoreEmoji} {time.toLocaleTimeString()} - Score: {hourScore}
									/10
								</strong>
								<br />
								<span style={{ fontSize: "0.9em", color: "#666" }}>
									{weatherData.is_day?.[i] === 1 ? "☀️" : "🌙"}{" "}
									{weatherData.is_day?.[i] === 1 ? "Day" : "Night"} | 🌧️ Rain:{" "}
									{weatherData.precipitation_probability?.[i] ?? "N/A"}% | 💧
									Precip: {weatherData.precipitation?.[i] ?? "N/A"}mm | 🌡️ Temp:{" "}
									{weatherData.temperature_2m?.[i] ?? "N/A"}°C | 💨 Wind:{" "}
									{weatherData.wind_speed_10m?.[i] ?? "N/A"} km/h | 💧 Humidity:{" "}
									{weatherData.relative_humidity_2m?.[i] ?? "N/A"}% | ☁️ Cloud:{" "}
									{weatherData.cloud_cover?.[i] ?? "N/A"}%
								</span>
							</li>
						);
					})}
			</ul>
		</div>
	);
}

export default LaundryWeather;
