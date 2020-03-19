var baseURL = 'https://1048144.app.netsuite.com';
if (nlapiGetContext().getEnvironment() == "SANDBOX") {
    baseURL = 'https://1048144-sb3.app.netsuite.com';
}

function pageInit() {

}

function onclick_back() {
    var zee = parseInt(nlapiGetFieldValue('zee'));
    var start_date = nlapiGetFieldValue('start_date');
	var end_date = nlapiGetFieldValue('end_date');

	console.log('zee', zee);
	console.log('start_date', start_date);
	console.log('end_date', end_date);
	
    var url = baseURL + "/app/site/hosting/scriptlet.nl?script=592&deploy=1";
    url += "&start_date=" + start_date + "&end_date=" + end_date + "&zee=" + zee;
    window.location.href = url;
}