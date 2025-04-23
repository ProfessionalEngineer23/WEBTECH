const API_URL = 'http://localhost:3000'; //connect to local server

let selectedHouse = "Seaview1";
let obj; //obj variable used to hold parsed json
let text; //Raw json string storage

//this functin collects the json and stores it into parses into a obj variable
async function fetchDatabaseData() {
    const response = await fetch('/api/full-database');
    text = await response.text(); 
    obj = JSON.parse(text);       
    console.log("Data fetched:", obj);
}

// SETUP CHARTS
const sensorCtx = document.getElementById("sensorGraph").getContext("2d");
const sensorChart = new Chart(sensorCtx, {
    type: "line",
    data: { labels: [], datasets: [{ label: "", data: [], borderColor: "blue", fill: false, tension: 0.4 }] },
    options: { responsive: true, plugins: { title: { display: true, text: "Sensor Data" } } }
});

const compareCtx = document.getElementById("comparisonChart").getContext("2d");
const compareChart = new Chart(compareCtx, {
    type: "line",
    data: { labels: [], datasets: [] },
    options: { responsive: true, plugins: { title: { display: true, text: "Compare Houses" } } }
});

//collects building id by name 
function getBuildingIdByName(name) {
    const building = obj.buildings.find(b => b.Name == name);
    
    if (building) {
    return building.Building_ID; //return the ID if the building is found
    } else {
    return null; //return null if no building matches
    }
}

// This code updates the readings on the top of the website, you can see the readings of seven different sensors from the selected house
function updateSensorCards() {
    //stores full sensors data and recentreadings from sensors into variables
    const sensors = obj.sensors;
    const readings = obj.recentReadings;

    //Filter sensors and readings by selected house
    const houseSensors = sensors.filter(s => s.Building_ID == getBuildingIdByName(selectedHouse)); //stores sensors of the selected house
    const latestReadings = {}; //stores all readings in array

    //Get latest reading for each sensor type
    readings.forEach(r => {
    const sensor_value = sensors.find(s => s.Sensor_ID == r.Sensor_ID); //looks at what the sensor value is where the sensor id in sensor table matchs sensor id in recentreadings table
    if (sensor_value && sensor_value.Building_ID == getBuildingIdByName(selectedHouse)){ //now you have to check if sensor value of the specific building id is the same as the selected building
        if (!latestReadings[sensor_value.Sensor_Type]) {
        latestReadings[sensor_value.Sensor_Type] = r.Reading_Value;
        }
    }
    });

    //updates the value of each sensor with value from database
    //If the value is found then it will display that value, if no value is stored for that sensor then it will display N/A
    document.getElementById("coSensor").innerHTML = `CO:<br>${latestReadings["CO"] || "N/A"} PPM`;
    document.getElementById("smokeSensor").innerHTML = `Smoke:<br>${latestReadings["Smoke"] || "N/A"}`;
    document.getElementById("tempSensor").innerHTML = `Temp:<br>${latestReadings["Temperature"] || "N/A"}°C`;
    document.getElementById("humiditySensor").innerHTML = `Humidity:<br>${latestReadings["Humidity"] || "N/A"}%`;
    document.getElementById("lightSensor").innerHTML = `Light:<br>${latestReadings["Light"] || "N/A"} Lux`;
    document.getElementById("motionSensor").innerHTML = `Motion:<br>${latestReadings["Motion"] || "Detected" || "None"}`;
    document.getElementById("waterSensor").innerHTML = `Water:<br>${latestReadings["Water"] || "No leak"}`;
}

//function for generating a graph for the selected house
function updateSensorGraph() {
    const sensorType = document.getElementById("sensorSelect").value; //gets the type of sensor selected by user

    // Filter recent readings to include only relevant ones
    const filteredReadings = obj.recentReadings
        .filter(r => {
            //Find the sensor matching the Sensor_ID from readings
            const sensor_ID = obj.sensors.find(s => s.Sensor_ID == r.Sensor_ID);

            //Check if sensor exists and its type matches the selected type
            if (sensor_ID && sensor_ID.Sensor_Type == sensorType) {
                //Check if the sensor's building matches the selected house
                if (sensor_ID.Building_ID == getBuildingIdByName(selectedHouse)) {
                    return true; //Include reading if all conditions are met
                }
            }
            else{
            return false; //Exclude reading if any condition is not met
            }
        })
        .slice(0, 7).reverse(); //Take only the first weeks readings and most recent data at the end

    const labels = filteredReadings.map(r => new Date(r.Reading_Date_Time).toLocaleDateString('en-US', { weekday: 'short' }));
    const values = filteredReadings.map(r => r.Reading_Value);

    //update the graphs, add labels to axis, 
    sensorChart.data.labels = labels;
    sensorChart.data.datasets[0].label = `${sensorType} - ${selectedHouse}`; //displays selected sensor type and house
    sensorChart.data.datasets[0].data = values; //represent sensor reading values on y-axis
    sensorChart.update(); //updates graph to represent new data
}

//Will compare the readings from two different houses when user clicks button
document.getElementById("compareGraph").addEventListener("click", () => {
    //will retrieve the two houses selected and sensor type
    const h1 = document.getElementById("compareHouse1").value;
    const h2 = document.getElementById("compareHouse2").value;
    const sensorType = document.getElementById("compareSensor").value;

    //this function will do all the work in order to collect the house data
    const getHouseData = (houseName) => {
    const buildingId = getBuildingIdByName(houseName); //collects the building
    //filtered reading values
    const filtered = obj.recentReadings.filter(r => {
        //find the sensor matching the sensor_ID from readings
        const sensor_ID = obj.sensors.find(s => s.Sensor_ID == r.Sensor_ID);

        //check if sensor exists and matches the selected type
        if(sensor_ID && sensor_ID.Sensor_Type == sensorType) {
        //check if sensor's building matches selected house
        if(sensor_ID.Building_ID == buildingId) {
            return true; //include reading if conditions matched
        }
        }
        else {
        return false; //conditions not matched
        }
    }).slice(0, 7).reverse(); //takes only first days readings and most recent data at the end

    return {
        labels: filtered.map(r => new Date(r.Reading_Date_Time).toLocaleDateString('en-US', { weekday: 'short' })),
        values: filtered.map(r => r.Reading_Value)
    };
    };

    //collects the data of both houses and stores in variables
    const data1 = getHouseData(h1);
    const data2 = getHouseData(h2);

    //produces graph with both datasets included then updates compare chart
    compareChart.data.labels = data1.labels;
    compareChart.data.datasets = [
    { label: `${sensorType} - ${h1}`, data: data1.values, borderColor: "red", fill: false },
    { label: `${sensorType} - ${h2}`, data: data2.values, borderColor: "green", fill: false }
    ];
    compareChart.update();
});


//this code is for assigning the value of the house button (seaview1, seaview2 or seaview3) to the variable 'selectedHouse'
document.querySelectorAll(".house-button").forEach(btn => {
    btn.addEventListener("click", () => {
    selectedHouse = btn.dataset.house;
    document.getElementById("houseTitle").textContent = `Overview: ${selectedHouse}`; //this code here changes the title of the page to represent the selected house
    //updates the values on top and graphs in relation to selected house
    updateSensorCards();
    updateSensorGraph();
    });
});

document.getElementById("generateGraph").addEventListener("click", updateSensorGraph); //generates a graph when generate button clicked

//code for the sidebar at the left hand side to function properly
document.getElementById("toggleSidebar").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("hidden");
});

//code for generating the readings on top and graphs after the database data has been fetched by client-side code
(async () => {
    await fetchDatabaseData(); 
    updateSensorCards();
    updateSensorGraph();
})();