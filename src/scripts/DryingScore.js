//This file contains the logic for calculationg the drying score
function calculateDryingScore(hourly_forecast){
    const {
    precipitation_probability, relative_humidity_2m, 
    temperature_2m, wind_speed_10m, cloud_cover } 
    = hourly_forecast;
    
    let score = 0; 

    //Rain check
    if (precipitation_probability > 50 && precipitation < 0.2){
        score = 0;
        return;
    } 

    //Humidity check
    if (relative_humidity_2m < 60) {
        score += 3;
    } else if (relative_humidity_2m <= 80 && relative_humidity_2m > 60){
        score += 2;
    } 

    //Temp check
    if (temperature_2m < 35 && temperature_2m > 25){
        score +=3;
    } else if (temperature_2m < 25 && temperature_2m > 20){
        score +=3;
    } else if (temperature_2m < 20 || temperature_2m > 25){
        score +=1;
    }

    //Wind speed check
    if (wind_speed_10m < 20 && wind_speed_10m > 5){
        score += 2;
    } else if (wind_speed_10m > 30){
        score += 1;
    }

    //Sunlight
    if (cloud_cover > 0 && cloud_cover < 30){
        score += 2;
    } else if (cloud_cover > 30 && cloud_cover < 60){
        score += 1;
    }



    return score;
}

function find_best_drying_hours(hourly_forecast){
    let bestHoursList = [];
    let neutralHoursList = [];
    let dryingScore = 0;

    for (const hour of hourly_forecast){
        dryingScore = calculateDryingScore(hour);

        if (dryingScore >= 8){
            bestHoursList.append(hour.time);
        } else if (dryingScore >= 5){
            neutralHoursList.append(hour.time);
        }
    }

    return bestHoursList, neutralHoursList;
}