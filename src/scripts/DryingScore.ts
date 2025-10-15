//This file contains the logic for calculationg the drying score

interface HourlyWeatherData {
	time: Date;
	precipitation_probability: number;
	precipitation: number;
	relative_humidity_2m: number;
	temperature_2m: number;
	wind_speed_10m: number;
	cloud_cover: number;
	is_day: number;
}

interface WeatherData {
	time: Date[];
	precipitation_probability: Float32Array | null;
	precipitation: Float32Array | null;
	relative_humidity_2m: Float32Array | null;
	temperature_2m: Float32Array | null;
	wind_speed_10m: Float32Array | null;
	cloud_cover: Float32Array | null;
	is_day: Float32Array | null;
}

function calculateDryingScore(hourly_forecast: HourlyWeatherData) {
	const {
		precipitation_probability,
		precipitation,
		relative_humidity_2m,
		temperature_2m,
		wind_speed_10m,
		cloud_cover,
		is_day,
	} = hourly_forecast;

	let score = 0;

	//Rain check
	if (precipitation_probability > 50 && precipitation < 0.2) {
		score = 0;
		return score;
	}

	//Day/Night check - daylight is much better for drying
	if (is_day === 1) {
		score += 2; // Bonus points for daylight
	} else {
		score -= 1; // Penalty for nighttime
	}

	//Humidity check
	if (relative_humidity_2m < 60) {
		score += 3;
	} else if (relative_humidity_2m <= 80 && relative_humidity_2m > 60) {
		score += 2;
	}

	//Temp check
	if (temperature_2m < 35 && temperature_2m > 25) {
		score += 3;
	} else if (temperature_2m < 25 && temperature_2m > 20) {
		score += 3;
	} else if (temperature_2m < 20 || temperature_2m > 25) {
		score += 1;
	}

	//Wind speed check
	if (wind_speed_10m < 20 && wind_speed_10m > 5) {
		score += 2;
	} else if (wind_speed_10m > 30) {
		score += 1;
	}

	//Sunlight/Cloud cover check
	if (cloud_cover >= 0 && cloud_cover <= 20) {
		score += 3; // Clear to mostly clear skies - excellent for drying
	} else if (cloud_cover > 20 && cloud_cover <= 50) {
		score += 2; // Partly cloudy - still good for drying
	} else if (cloud_cover > 50 && cloud_cover <= 80) {
		score += 1; // Mostly cloudy - some sun still gets through
	}
	// 80-100% cloud cover gets no bonus points (overcast conditions)

	return score;
}

export function find_best_drying_hours(weatherData: WeatherData) {
	const bestHoursList: { time: Date; score: number }[] = [];
	const neutralHoursList: { time: Date; score: number }[] = [];
	const dryingScore: number[] = [];

	for (let i = 0; i < weatherData.time.length; i++) {
		const hourData = {
			time: weatherData.time[i],
			precipitation_probability:
				weatherData.precipitation_probability?.[i] ?? 0,
			precipitation: weatherData.precipitation?.[i] ?? 0,
			relative_humidity_2m: weatherData.relative_humidity_2m?.[i] ?? 0,
			temperature_2m: weatherData.temperature_2m?.[i] ?? 0,
			wind_speed_10m: weatherData.wind_speed_10m?.[i] ?? 0,
			cloud_cover: weatherData.cloud_cover?.[i] ?? 0,
			is_day: weatherData.is_day?.[i] ?? 0,
		};

		const score = calculateDryingScore(hourData);
		dryingScore.push(score);

		if (score >= 8) {
			bestHoursList.push({ time: hourData.time, score });
		} else if (score >= 5) {
			neutralHoursList.push({ time: hourData.time, score });
		}
	}

	return { score: dryingScore, bestHoursList, neutralHoursList };
}
