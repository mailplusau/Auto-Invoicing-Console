var ctx = nlapiGetContext();

var zee = 0;
var role = ctx.getRole();

if (role == 1000) {
    //Franchisee
    zee = ctx.getUser();
} else if (role == 3) { //Administrator
    zee = '6'; //test
} else if (role == 1032) { // System Support
    zee = '425904'; //test-AR
}

var baseURL = 'https://1048144.app.netsuite.com';
if (nlapiGetContext().getEnvironment() == "SANDBOX") {
    baseURL = 'https://1048144-sb3.app.netsuite.com';
}

function daily_revenue(request, response) {
    if (request.getMethod() === "GET") {
        var form = nlapiCreateForm('Daily Revenue :');

        var zee = request.getParameter('zee');
        var month = request.getParameter('month');
        var start_date = request.getParameter('start_date');
        var end_date = request.getParameter('end_date');

        nlapiLogExecution('DEBUG', 'start_date', start_date);

        var today = new Date();
        var today_day = today.getDate();
        var today_month = today.getMonth();
        var today_year = today.getYear();
        if (today_day < 10) {
            today = '' + today_date + '/' + today_month + '/' + today_year + '';
        }
        var start_date_array = start_date.split('/');

        nlapiLogExecution('DEBUG', 'today.start_date_array', start_date_array);
        nlapiLogExecution('DEBUG', 'today', today);

        if (today_month == start_date_array[1] && today_year == start_date_array[2]) {
            var start_date_dailyrevenue = start_date;
            var end_date_dailyrevenue = today;
        } else {
            var start_date_dailyrevenue = start_date;
            var end_date_dailyrevenue = end_date;
        }
        nlapiLogExecution('DEBUG', 'start_date_dailyrevenue', start_date_dailyrevenue);
        nlapiLogExecution('DEBUG', 'end_date_dailyrevenue', end_date_dailyrevenue);


        var inlinehtml = '<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js"><script src="//code.jquery.com/jquery-1.11.0.min.js"></script><link type="text/css" rel="stylesheet" href="https://cdn.datatables.net/1.10.13/css/jquery.dataTables.min.css"><link href="//netdna.bootstrapcdn.com/bootstrap/3.3.2/css/bootstrap.min.css" rel="stylesheet"><script src="//netdna.bootstrapcdn.com/bootstrap/3.3.2/js/bootstrap.min.js"></script><link rel="stylesheet" href="https://1048144.app.netsuite.com/core/media/media.nl?id=2060796&c=1048144&h=9ee6accfd476c9cae718&_xt=.css"/><script src="https://1048144.app.netsuite.com/core/media/media.nl?id=2060797&c=1048144&h=ef2cda20731d146b5e98&_xt=.js"></script><link type="text/css" rel="stylesheet" href="https://1048144.app.netsuite.com/core/media/media.nl?id=2090583&c=1048144&h=a0ef6ac4e28f91203dfe&_xt=.css">';

        var inlineQty = '<div><style>table#daily_revenue {font-size:12px; font-weight:bold; text-align:center; border-color: #24385b;} </style><table border="0" cellpadding="10" id="daily_revenue" cellspacing="0" class="table table-responsive table-striped"><thead style="color: white;background-color: #607799;"><tr><th style="text-align:left;"><b>Date</b></th>';

        var operatorSearch = nlapiLoadSearch('customrecord_operator', 'customsearch_rta_operator_load');
        var newFilters = new Array();
        newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_operator_franchisee', null, 'anyof', zee);
        operatorSearch.addFilters(newFilters);
        var operatorSet = operatorSearch.runSearch();

        var operator_array = [];
        operatorSet.forEachResult(function(operatorResult) {
            var operator_id = operatorResult.getValue("internalid", null, "GROUP");
            var operator_name = operatorResult.getValue("name", null, "GROUP");
            operator_array[operator_array.length] = operator_id;
            nlapiLogExecution('DEBUG', 'operator_name', operator_name);
            inlineQty += '<th style="text-align:left;" class="col-sm" data-id="' + operator_id + '" scope="col" colspan="2"><b>' + operator_name + '</b></th>';
            return true;
        });
        inlineQty += '</tr></thead>';
        inlineQty += '<body>'

        var jobgroupSearch = nlapiLoadSearch('customrecord_jobgroup', 'customsearch_job_group_completed');
        var newFilters = new Array();
        newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_jobgroup_franchisee', null, 'anyof', zee);
        newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', "CUSTRECORD_JOB_GROUP", 'onorafter', start_date_dailyrevenue);
        newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', 'CUSTRECORD_JOB_GROUP', 'onorbefore', end_date_dailyrevenue);

        jobgroupSearch.addFilters(newFilters);

        var jobgroupSet = jobgroupSearch.runSearch();

        var old_date_scheduled = '';
        var old_col = 0;
        var count = 0;

        jobgroupSet.forEachResult(function(jobgroupResult) {
            var date_scheduled = jobgroupResult.getValue('custrecord_job_date_scheduled', "CUSTRECORD_JOB_GROUP", "group");
            var operator = jobgroupResult.getValue('custrecord_job_operator_assigned', "CUSTRECORD_JOB_GROUP", "group");
            var revenue = jobgroupResult.getValue("custrecord_job_service_price", "CUSTRECORD_JOB_GROUP", "SUM");
            var service_count = jobgroupResult.getValue("internalid", null, "COUNT");
            var zee_comm = parseFloat(jobgroupResult.getValue("formulapercent", null, "GROUP"));
            nlapiLogExecution('DEBUG', 'date_scheduled', date_scheduled);
            nlapiLogExecution('DEBUG', 'old_date_scheduled', old_date_scheduled);
            nlapiLogExecution('DEBUG', 'operator', operator);
            nlapiLogExecution('DEBUG', 'zee_comm', zee_comm);

            var comm = revenue * zee_comm / 100;

            var col = 0;
            if (count == 0) {
                inlineQty += '<tr><td style="text-align:left;" class="col-sm" scope="row" rowspan="5">' + date_scheduled + '</td>';
            } else {
                if (old_date_scheduled != date_scheduled) {
                    old_col = 0;
                    inlineQty += '</tr><tr><td style="text-align:left"; class="col-sm" scope="row" rowspan="5">' + date_scheduled + '</td>';
                }
            }

            nlapiLogExecution('DEBUG', 'old_col', old_col);
            for (i = 0; i < operator_array.length; i++) {
                if (operator_array[i] == operator) {
                    col = i;
                    nlapiLogExecution('DEBUG', 'col', col);
                }
            }
            for (k = old_col; k < col; k++) {
                nlapiLogExecution('DEBUG', 'k', k);
                inlineQty += '<td style="text-align:left;" class="col-sm" data-id="' + operator_array[k] + '" colspan="2" rowspan="5"></td>';

            }
            inlineQty += '<tr><th style="text-align:center; font-size: xx-small; padding: 0px;" class="col-sm" data-id="' + operator + '" colspan="2">Number of services completed</th>'
            inlineQty += '<tr><td style="text-align:center;" class="col-sm" data-id="' + operator + '" colspan="2">' + service_count + '</td></tr>';
            inlineQty += '<tr><th style="text-align:center; font-size: xx-small; padding: 0px;" class="col-sm" data-id="' + operator + '">Revenue ($)</th>'
            inlineQty += '<th style="text-align:center; font-size: xx-small; padding: 0px;" class="col-sm" data-id="' + operator + '">Comission ($)</th></tr>'
            inlineQty += '<tr><td style="text-align:left;" class="col-sm" data-id="' + operator + '">' + revenue + '</td>';          
            inlineQty += '<td style="text-align:left;" class="col-sm" data-id="' + operator + '">' + comm + '</td></tr>';

            old_date_scheduled = date_scheduled;
            old_col = col;
            count++;
            return true;
        })
        inlineQty += '</body></table></div>';




        form.addButton('Back', 'BACK', 'onclick_back()');
        form.setScript('customscript_cl_daily_revenue');

        form.addField('start_date', 'text', 'start_date').setDisplayType('hidden').setDefaultValue(request.getParameter('start_date'));
        form.addField('end_date', 'text', 'end_date').setDisplayType('hidden').setDefaultValue(request.getParameter('end_date'));
        form.addField('zee', 'text', 'zee').setDisplayType('hidden').setDefaultValue(zee);

        form.addField('custpage_html2', 'inlinehtml').setPadding(1).setLayoutType('outsideabove').setDefaultValue(inlinehtml);
        form.addField('preview_table', 'inlinehtml', '').setLayoutType('outsidebelow', 'startrow').setDefaultValue(inlineQty);

        response.writePage(form);

    } else {

    }
}