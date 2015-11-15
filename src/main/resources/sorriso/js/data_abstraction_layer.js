;
(function (win) {
    const COMPONENT_ID_PRODUCTION = 13;
    const COMPONENT_ID_CONSUMPTION = 13;
    const MAXIMUM_POWER = 3000;
    const OAUTH_TOKEN = "wi4hj5qinQEnh19zSBPrH6ZJJTAa";
    
    class DataAbstractionLayer {
        constructor() {
            this.base_url = JEMMA_API_URL;
            if (this.base_url.substr(this.base_url.length - 1) !== '/')
                this.base_url += '/';

            this.onnews_callback = null;
            this._init_websocket(JEMMA_WSOCKET_URL);
            this._webSocket_ForeCast_Production();
            /* This is to generate random news, can be removed */
            setInterval(() => {
                this.wsock.send(JSON.stringify({
                    msg: 'HELLO',
                    date: '2015-01-01T18:17:30Z',
                    type: (Math.random() > 0.5 ? 'news' : 'alarm')
                }));
            }, 5000);
        }
        _webSocket_ForeCast_Production() {
            if(! "WebSocket" in window)
            return;
            var ws = new WebSocket(FORECAST_SOLAR_ENERGY_PRODUCTION);
            ws.onopen = function() {
                sorriso.log("WebSocket message", "Opening...");
            }
            ws.onmessage = function(evt) {
                let message = evt.data;
                sorriso.log("WebSocket message", message);
            }
            ws.onclose = function() {

            }
        }
        _init_websocket(endpoint) {
            this.wsock = new WebSocket(endpoint);
            this.wsock.onmessage = (msg) => {
                if (this.onnews_callback) {
                    let data = JSON.parse(msg.data);
                    this.onnews_callback(data);
                }
            };
            this.wsock.onerror = this.wsock.onclose = (wsock) => {
                this.wsock.onerror = this.wsock.onclose = null;
                setTimeout(() => {
                    this._init_websocket(endpoint);
                }, 15000);
            };
        }

        _ajax_call(api, params, type = 'GET') {
            return new Promise(
                (resolve, reject) => {
                    var api_url = this.base_url + api;
                    var api_params = JSON.stringify(params);

                    sorriso.log('DAL', `CALLING: ${api_url} : ${api_params}`);
                    $.ajax({
                        type: type,
                        url: api_url,
                        data: api_params,
                        dataType: "json",
                        processData: false,
                        contentType: 'application/json',
                    })
                        .done(response => {
                            sorriso.log('DAL', api + ` RES: ${JSON.stringify(response)}`);
                            if (response.code != 200)
                                reject({
                                    code: response.code,
                                    message: response.message,
                                    error: response
                                });
                            else
                                resolve(response.result);
                        })
                        .fail(response => {
                            reject({
                                code: -1,
                                message: 'Unable to contact server',
                                error: response
                            });
                        })
                });
        }

        _yucca_call(url, params, type = 'GET') {
            return new Promise(
                (resolve, reject) => {


                    sorriso.log('DAL', `CALLING: ${url} : ${params}`);
                    $.ajax({
                        type: type,
                        url: url,
                        data: jQuery.param(params),
                        dataType: 'json',

                        headers:
                        {
                            "Authorization" : `Bearer ${OAUTH_TOKEN}`,
                             "Accept": "application/json"
                        }
                    })
                        .done(response => {
                            sorriso.log('DAL', url + ` RES: ${JSON.stringify(response)}`);
                                resolve(response.d.results);
                        })
                        .fail(response => {
                            reject({
                                code: -1,
                                message: 'Unable to contact server',
                                error: response
                            });
                        })
                });
        }

        _yucca_utils_recordNumber(url, params, type = 'GET') {
            return new Promise(
                (resolve, reject) => {


                    sorriso.log('DAL', `CALLING: ${url} : ${params}`);
                    $.ajax({
                        type: type,
                        url: url,
                        data: jQuery.param(params),
                        dataType: 'json',

                        headers:
                        {
                            "Authorization" : `Bearer ${OAUTH_TOKEN}`,
                            "Accept": "application/json"
                        }
                    })
                        .done(response => {
                            sorriso.log('DAL', url + ` RES: ${JSON.stringify(response)}`);
                            resolve(response.d.__count);
                        })
                        .fail(response => {
                            reject({
                                code: -1,
                                message: 'Unable to contact server',
                                error: response
                            });
                        })
                });
        }


        _call_function(device_dal_uid, type, action) {
            return this._ajax_call(`devices/${device_dal_uid}/functions`).then(result => {
                for (let function_type of result) {
                    if (_contains(function_type["dal.function.property.names"], action)) {
                        return this._ajax_call(`functions/${function_type['dal.function.UID']}`,
                            {operation: action},
                            'POST'
                        );
                    }
                }
                throw {code: -2, message: 'Unable to find device function type', error: {}};
            });
        }

        _stub_data(device) {
            device.level = Math.ceil(Math.random() * 1000);
            device.location = "STUB LOCATION";
            return device;
        }

        _contains(a, value) {
            for(let i = 0; i < a.length; i++)
                if (a[i] === value)
                    return true;
            return false;
        }

        get_devices() {
            /**
             * Base Call used to retrieve list of devices and their functions, used by get_pvmeter_data()
             * and get_devices_with_consumption() to retrieve devices and get their consumption.
             *
             * Status: OK
             */
            return this._ajax_call('devices').then(devices => {
                let promises = [];
                for (let device of devices)
                    promises.push(
                        this._ajax_call(`devices/${device['dal.device.UID']}/functions`)
                            .then(resp => {
                                return {
                                    name: device['dal.device.name'],
                                    device: device,
                                    functions: resp
                                };
                            }
                        )
                    );
                return Promise.all(promises);
            }).then(results => {
                return results;
            });
        }

        get_pvmeter_data() {
            /**
             * Used to populate HOME page diagram with current data.
             *
             * Status: HALF -> Lucciola and Energy values are fakes.
             */
            return this.get_devices().then(resp => {
                let production = null;
                let consumption = null;

                for (let device of resp) {
                    if (device.device['ah.category.pid'] === COMPONENT_ID_CONSUMPTION && device.device['dal.device.name'].toString().indexOf('Lucciola') > - 1)
                        consumption = device.device;
                    if (device.device['ah.category.pid'] === COMPONENT_ID_PRODUCTION && device.device['dal.device.name'].toString().indexOf('Lucciola') > - 1)
                        production = device.device;
                }

                if (production === null || consumption === null)
                    throw {
                        code: -1001,
                        message: 'PVMeter and Production devices not found',
                        error: resp
                    };

                return {'production': production, 'consumption': consumption};
            }).then((devices) => {
                let power_production = this._call_function(devices.production['dal.device.UID'], 'power', 'getLucciolaPowerProduction')
                    .then(resp => {
                        return {
                            production: {
                                level: resp.level,
                                unit: resp.unit,
                                percentage: Math.ceil(resp.level / MAXIMUM_POWER * 100)
                            }
                        };
                    }
                );
                let power_consumption = this._call_function(devices.consumption['dal.device.UID'], 'power', 'getLucciolaPowerConsumption')
                    .then(resp => {
                        return {
                            consumption: {
                                level: resp.level,
                                unit: resp.unit,
                                percentage: Math.ceil(resp.level / MAXIMUM_POWER * 100)
                            }
                        };
                    }
                );
                let energy_level = 1000; //power_production.level - power_consumption.level;
                let energy = {
                    level: energy_level,
                    unit: 'W',
                    percentage: Math.ceil(energy_level / MAXIMUM_POWER * 100)
                };
                let lucciola = {
                    level: 100,
                    unit: '%',
                    percentage: 100
                };

                return Promise.all([power_production, power_consumption]).then(devicesinfos => {
                    var result = {energy: energy, lucciola: lucciola};
                    for (let deviceinfo of devicesinfos) {
                        Object.assign(result, deviceinfo);
                    }
                    return result;
                });
            });
        }

        get_weekly_consume() {
            /**
             * Used to populate HOME value box with current week self-consumption.
             * The returned value is expected to be a PERCENTAGE.
             *
             * Status: STUB
             */

            return new Promise((resolve, reject) => {
                //Chiamata fittizia per avere il count dei record
                this._yucca_utils_recordNumber(AUTOCONSUMPTION_WEEKLY, {"$top": 1}).then(count => {
                    this._yucca_call(AUTOCONSUMPTION_WEEKLY, {"$skip": count -1, "$top": 1}).then(response =>{
                        //Take first element array
                        console.log("Autoconsumo settimanale", JSON.stringify(response[0].autoconsumo));
                        resolve ({value: (parseFloat(response[0].autoconsumo).toFixed())});
                    });
                });

            });
        }

        get_weekly_expense() {
            /**
             * Used to populate HOME value box with current week cost.
             * The returned value is expected to be a EUROS.
             *
             * Status: STUB
             */
            return new Promise((resolve, reject) => {
                this._yucca_utils_recordNumber(CONSUMPTION_WEEKLY_DATA_URL, {"$top":1}).then(count => {
                    this._yucca_call(CONSUMPTION_WEEKLY_DATA_URL, {"$skip": count -1, "$top": 1}).then(response => {
                        resolve({value: parseFloat(response[0].Spesa).toFixed(2)});
                    })
                });

                //resolve({value: 4.23});
            });
        }

        get_weekly_prevision_comparison() {
            /**
             * Used to draw HOME expected/actual solar production graph.
             * The returned value is expected to be a LIST OF PERCENTAGES.
             *
             * Status: STUB
             */
            return new Promise((resolve, reject) => {
                this._yucca_utils_recordNumber(FORECAST_SOLAR_ENERGY_PRODUCTION, {"$top": 1}).then(count_forecast => {
                    sorriso.log("Number forecast records", count_forecast);
                    this._yucca_utils_recordNumber(SOLAR_ENERGY_PRODUCTION, {"$top": 1}).then(count_solar => {
                        let prevision = [];
                        let actual = [];
                        //if(count_forecast == count_solar) {
                            this._yucca_call(FORECAST_SOLAR_ENERGY_PRODUCTION, {"$skip": count_forecast - 8, "$top": 7}).then(forecast_prevision => {
                                sorriso.log("SORRISO FORECAST", JSON.stringify(forecast_prevision[0]));
                                for(let values of forecast_prevision)
                                    prevision.push(values.power);
                            });
                            this._yucca_call(SOLAR_ENERGY_PRODUCTION, {"$skip": count_solar - 8, "$top": 7}).then(solar_production => {
                                for(let values of solar_production)
                                    actual.push(values.power);
                            });
                        //} else
                        //sorriso.log("NOT EQUALS", false);
                        resolve({
                            /* Those are percentages */
                            prevision: prevision,
                            actual: actual
                        });
                    })
                });

            });
        }

        get_energy_flow() {
            /**
             * Used to draw flow of energy in HOME energy diagram.
             * The returned value is expected to be an OBJECT with BOOL values
             * pointing which energy flows are active and which disabled.
             *
             * Status: STUB
             */
            return new Promise((resolve, reject) => {
                resolve({
                    lucciola_draining: Math.random() < 0.5,
                    producing_energy: Math.random() < 0.5,
                    lucciola_recharging: Math.random() < 0.5,
                    direct_consumption: Math.random() < 0.5,
                    consuming_energy: Math.random() < 0.5
                });
            });
        }

        listen_for_news(onnews_callback) {
            /**
             * Used to listen for news in HOME.
             * The returned value is expected to be an object in the form
             * { date: DATE, msg: TEXT, type: [news|alarm] }
             *
             * Status: HALF -> Listens on a websocket where fake data is injected.
             */
            for (let i = 0; i < 5; i++) {
                onnews_callback({
                    date: new Date(),
                    msg: 'NEWS! ' + i,
                    type: (Math.random() > 0.5 ? 'news' : 'alarm')
                });
            }
            this.onnews_callback = onnews_callback;
        }

        get_consumption_instant_data() {
            /**
             * Used to draw main diagram in CONSUMPTION page.
             * The returned value is expected to be an OBJECT which contains
             * the consumption values and percentages for others, devices and total consumption.
             *
             * Status: STUB
             */
            return this.get_devices().then(response => {
                    let devices = 0;
                    let others = 0;
                    let total = 0;
                    for(let device of response) {
                        switch (device.device["ah.category.pid"]) {
                             case 12:
                                try {
                                        this._call_function(device.device['dal.device.UID'], 'power', 'getCurrent').then(resp=> {
                                	        total += resp.level;
					                      });
                                } catch (error) {
                                    sorriso.log("DEVICES: ", error.message);
                                }
                            break;
                            default:
                                try {
                                        this._call_function(device.device['dal.device.UID'], 'power', 'getCurrent').then(resp=> {
                                	        devices += resp.level;
					                      });
                                } catch (error) {
                                    sorriso.log("DEVICES: ", error.message);
                                }
                            break;
                        }
                    }
                    if(total == 0)
                      for(let device of response) {
                        if(device.device['ah.category.pid'] == 13 && device.device["dal.device.name"].toString().indexOf('Lucciola') > -1)
                          this._call_function(device.device['dal.device.UID'], 'power', 'getPowerConsumption').then(resp=> {
                            total = resp.level;
                          });
                      }
                    return new Promise((resolve, reject) => {
                        if (total - devices < 0)
                            others = 0;
                        if(total = 0)
                            total = devices;
                        resolve({
                            others: {percentage: others, level: others},
                            devices: {percentage: devices, level: devices},
                            total: {percentage: total, level: total}
                        });
                    });
                });
        }

        get_consumption_weekly_data() {
            /**
             * Used to fill CONSUMPTION expenses section and draw weekly graph.
             * The returned value is expected to be an OBJECT with
             * totals and daily data.
             *
             * TOTALS are expected to contain expenses, weekly_expense
             * and weekly_saving data. Which reports the level and percentage.
             *
             * DAILY is expected to contain lists of PAST and CURRENT percentages
             * of expenses.
             *
             * Status: STUB
             */
            return new Promise((resolve, reject) => {
                let expense = (Math.random() * 10).toFixed(2);
                let weekly_expense = (expense * 6 + Math.random() * 10).toFixed(2);
                let weekly_saving = (Math.random() * 15).toFixed(2);
                this._yucca_utils_recordNumber(CONSUMPTION_WEEKLY_DATA_URL, {"$top":1}).then(count => {
                    sorriso.log("CONSUMPTION_WEEKLY_DATA_URL", count);
                    let temp_past = [];
                    let temp_current = [];
                    if(count < parseInt(8)) {
                        for(let i = 0; i < 8; i++)
                            temp_past.push(0);
                        this._yucca_call(CONSUMPTION_WEEKLY_DATA_URL, {"$top":count}).then(response => {
                            for(let values of response)
                                temp_current.push(values.Spesa);
                        });

                    } else if(count => parseInt(8) && count < parseInt(15)) {
                        this._yucca_call(CONSUMPTION_WEEKLY_DATA_URL, {"$top":count}).then(response =>{
                            for (let i = 0; i < 8; i++)
                                temp_past.push(response[i].Spesa);
                            for(let i = 8; i < count; i++)
                                temp_current.push(response[i].Spesa);
                        });

                    } else  {
                        this._yucca_call(CONSUMPTION_WEEKLY_DATA_URL, {"$skip":count - 15, "$top": 14}).then(response => {
                           for(let i = 0; i < 8; i++)
                               temp_past.push(response[i].Spesa);
                           for(let i = 8; i < 15; i++)
                                temp_current.push(response[i].Spesa);
                        });
                    }
                    resolve({
                        totals: {
                            expense: {level: expense, percentage: expense / 10 * 100},
                            weekly_expense: {
                                level: weekly_expense,
                                percentage: weekly_expense / 70 * 100
                            },
                            weekly_saving: {level: weekly_saving, percentage: weekly_saving / 15 * 100}
                        },
                        daily: {
                            /* Those are percentages */
                            past: temp_past,
                            current: temp_current
                        }
                    })
                });

            });
        }

        get_device_sevendays_history(device) {
            /**
             * Used to draw HISTORY graph for a single device.
             * The returned value is expected to be a LIST of 7 PERCENTAGE.
             *
             * Status: STUB
             */
            let duration_days = 7;

            return new Promise((resolve, reject) => {
                let values = [];
                for (let i = 0; i < duration_days; i++) {
                    values.push(Math.random() * 100);
                }
                resolve(values);
            });
        }

        get_history(start_date, end_date) {
            /**
             * Used to draw HISTORY graph of energy consumption and production.
             * The returned value is expected to be an object with production, consumption and
             * selfusage, each key have a list of VALUES.
             * Each object should contain production and consumption as W/h,
             * while the selfusage field should contain the PERCENTAGE.
             *
             * Status: STUB
             */
            let duration = moment(end_date).diff(start_date);
            let duration_days = duration / (24 * 3600 * 1000);

            return new Promise((resolve, reject) => {
                let recap = [];
                let production = [];
                let consumption = [];
                for (let i = 0; i < duration_days; i++) {
                    production.push(Math.random() * MAXIMUM_POWER);
                    consumption.push(Math.random() * MAXIMUM_POWER);
                    recap.push({
                        production: Math.ceil(production[i]),
                        consumption: Math.ceil(consumption[i]),
                        selfusage: Math.ceil(Math.random() * 100)
                    });
                }
                resolve({
                    production: production,
                    consumption: consumption,
                    recap: recap
                });
            });
        }

        get_lucciola_history(start_date, end_date) {
            /**
             * Used to draw HISTORY graph of lucciola charge.
             * The returned value is expected to be a LIST OF PERCENTAGES.
             *
             * Status: STUB
             */
            let duration = moment(end_date).diff(start_date);
            let duration_days = duration / (24 * 3600 * 1000);

            return new Promise((resolve, reject) => {
                let values = [];
                for (let i = 0; i < duration_days; i++) {
                    values.push(Math.random() * 100);
                }
                resolve(values);
            });
        }

        get_devices_with_consumption() {
            /**
             * Used to fill DEVICES page with actual devices.
             * The returned value is expected to be a LIST OF DEVICES where
             * each device should have level, unit, percentage, location and type_label values added
             * to the get_devices() response.
             *
             * Status: HALF -> Device type is currently fake and _stub_data is used to fill data.
             */
            const TYPE_MAP = {
                'smart_plug': 1,
                'counter': 2,
                'battery': 3
            };
            return this.get_devices()
                .then(response => {
                    let promises = [];
                    for (let device of response) {
                        switch (device.device["ah.category.pid"]) {

                            case 13:
                                device.type = TYPE_MAP['smart_plug'];
                                promises.push(this._call_function(device.device['dal.device.UID'], 'power', 'getCurrent').then(resp=> {
                                    device.level = resp.level;
                                    device = this._stub_data(device); //JUST FOR TESTING PURPOSE
                                    device.unit = resp.unit;
                                    device.percentage = Math.ceil(device.level / MAXIMUM_POWER * 100);
                                    device.type_label = "SMART PLUG";
                                    device.active = Math.random() >= 0.5;
                                    return device
                                }));
                                break;

                            case 12:
                                device.type = TYPE_MAP['counter'];
                                promises.push(this._call_function(device.device['dal.device.UID'], 'power', 'getCurrent').then(resp=> {
                                    device.level = resp.level;
                                    device = this._stub_data(device); //JUST FOR TESTING PURPOSE
                                    device.unit = resp.unit;
                                    device.percentage = Math.ceil(device.level / MAXIMUM_POWER * 100);
                                    device.type_label = "CONTATORE";
                                    return device

                                }));
                                break;

                            case 34:
                            case 11: //just for testing purpose, remove when api give lucciola
                                device.type = TYPE_MAP['battery'];
                                promises.push(this._call_function(device.device['dal.device.UID'], 'power', 'getCurrent').then(resp=> {
                                    resp = {level: 100, unit: '%', percentage: 100};
                                    device = this._stub_data(device); //JUST FOR TESTING PURPOSE
                                    device.level = resp.level;
                                    device.unit = resp.unit;
                                    device.percentage = resp.percentage;
                                    device.type_label = "LUCCIOLA";
                                    return device

                                }));
                                break;

                            default:
                                promises.push(
                                    new Promise((resolve, reject) => {
                                        device.type = 4;
                                        device.type_label = "SCONOSCIUTO";
                                        resolve(device);
                                    }));
                                break;
                        }
                    }

                    return Promise.all(promises);
                });
        }
    }
    win.DataAbstractionLayer = DataAbstractionLayer;
})(window);
