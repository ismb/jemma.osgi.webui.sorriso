// global values
JEMMA_API_URL = "http://127.0.0.1:8888/api";
JEMMA_WSOCKET_URL = "ws://127.0.0.1:8888/ws";

//JEMMA_API_URL = "http://rtsm-local-hag:8080/api";
//JEMMA_WSOCKET_URL = "ws://rtsm-local-hag:8080/ws";

//JEMMA_API_URL = "http://axantlabs.com:8080/api";
//JEMMA_WSOCKET_URL = "ws://echo.websocket.org";


DEBUG = true;
SMARTDATANET_TOKEN="wi4hj5qinQEnh19zSBPrH6ZJJTAa"

// feeds

FEED_BATTERY = {
	"url":"http://api.smartdatanet.it:80/api/ds_Final_soc_1111",
	"paramname":"soc",
	"unit": "%",
	"max_feed_value": 8000 //useful for percentage
	}
	
FEED_PRODUCTION = {
	"url":"http://api.smartdatanet.it:80/api/ds_Final_pv_1110",
	"paramname":"power",
	"unit": "w",
	"max_feed_value": 5000 //useful for percentage
	}	

FEED_LOAD = {
	"url":"http://api.smartdatanet.it:80/api/ds_Final_load_1114",
	"paramname":"power",
	"unit": "w",
	"max_feed_value": 8000 //useful for percentage
	}
	
FEED_GRID = {
	"url":"http://api.smartdatanet.it:80/api/ds_Final_grid_1113",
	"paramname":"power",
	"unit": "w",
	"max_feed_value": 8000 //useful for percentage
	}			

FEED_SELFCONSUMPTION = {
	"url":"http://api.smartdatanet.it:80/api/ds_Final_selfco_1112",
	"paramname":"selfconsumption",
	"unit": "%",
	"max_feed_value": 8000 //useful for percentage
	}	

FEED_INSTANTCOST = {
	"url":"http://api.smartdatanet.it:80/api/ds_Final_instan_1115",
	"paramname":"instantcost",
	"unit": "",
	"max_feed_value": 8000 //useful for percentage
	}	
	
	
// constants

SUFFIX_LATEST = '/Measures?$format=json&$top=1&$orderby=time%20desc'
SUFFIX_LATESTN = '/Measures?$format=json&$top=N&$orderby=time%20desc'
SUFFIX_FROMTO = '/Measures?$format=json&$filter=time%20le%20datetimeoffset\'DATETO\'%20and%20time%20ge%20datetimeoffset\'DATEFROM\'&$skip=0&$top=1000&$orderby=time%20desc'

/*
 *	Authorization: Bearer wi4hj5qinQEnh19zSBPrH6ZJJTAa
	Accept: application/json
 * 
 *  
 * 
 * 
- Già esistenti
        SmartPlug 01 (power/W) - http://api.smartdatanet.it:80/api/ds_Smartplug01_925/
        SmartPlug 02 (power/W) - http://api.smartdatanet.it:80/api/ds_Smartplug02_927/
        SmartPlug 03 (power/W) - http://api.smartdatanet.it:80/api/ds_Smartplug03_929/
        SmartPlug 04 (power/W) --> sarà lo SmartInfo - http://api.smartdatanet.it:80/api/ds_Smartplug04_930/

 * 
 * 
