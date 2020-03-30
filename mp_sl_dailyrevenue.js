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
        //var month = request.getParameter('month');
        var start_date = request.getParameter('start_date');
        var end_date = request.getParameter('end_date');

        nlapiLogExecution('DEBUG', 'start_date', start_date);

        var today = new Date();
        nlapiLogExecution('DEBUG', 'today', today);
        var today_day = today.getDate();
        var today_month = today.getMonth() + 1;
        var today_year = today.getYear() + 1900;
        today = '' + today_day + '/' + today_month + '/' + today_year + '';

        var start_date_array = start_date.split('/');

        nlapiLogExecution('DEBUG', 'start_date_array', start_date_array);
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

        var start_date_dailyrevenue_array = start_date_dailyrevenue.split('/');
        var end_date_dailyrevenue_array = end_date_dailyrevenue.split('/');

        var inlinehtml = '<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js"><script src="//code.jquery.com/jquery-1.11.0.min.js"></script><link type="text/css" rel="stylesheet" href="https://cdn.datatables.net/1.10.13/css/jquery.dataTables.min.css"><link href="//netdna.bootstrapcdn.com/bootstrap/3.3.2/css/bootstrap.min.css" rel="stylesheet"><script src="//netdna.bootstrapcdn.com/bootstrap/3.3.2/js/bootstrap.min.js"></script><link rel="stylesheet" href="https://1048144.app.netsuite.com/core/media/media.nl?id=2060796&c=1048144&h=9ee6accfd476c9cae718&_xt=.css"/><script src="https://1048144.app.netsuite.com/core/media/media.nl?id=2060797&c=1048144&h=ef2cda20731d146b5e98&_xt=.js"></script><link type="text/css" rel="stylesheet" href="https://1048144.app.netsuite.com/core/media/media.nl?id=2090583&c=1048144&h=a0ef6ac4e28f91203dfe&_xt=.css">';

        var inlineQty = '<div><style>table#daily_revenue {font-size:12px; font-weight:bold; text-align:center; border-color: #24385b;} </style><table border="0" cellpadding="10" id="daily_revenue" cellspacing="0" class="table table-responsive table-striped w-auto"><thead style="color: white;background-color: #607799;"><tr><th style="text-align:left;  width: 10%;"><b>Date</b></th>';

        var operatorSearch = nlapiLoadSearch('customrecord_operator', 'customsearch_rta_operator_load');
        var newFilters = new Array();
        newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_operator_franchisee', null, 'anyof', zee);
        operatorSearch.addFilters(newFilters);
        var operatorSet = operatorSearch.runSearch();

        var operator_array = [];
        operatorSet.forEachResult(function(operatorResult) {
            var operator_id = operatorResult.getValue("internalid", null, "GROUP");
            var operator_name = operatorResult.getValue("name", null, "GROUP");
            operator_array[operator_array.length] = operator_name;
            nlapiLogExecution('DEBUG', 'operator_name', operator_name);
            inlineQty += '<th style="text-align:center;" data-id="' + operator_id + '" scope="col" colspan="2"><b>' + operator_name + '</b></th>';
            return true;
        });
        inlineQty += '</tr></thead>';
        inlineQty += '<body>'

        nlapiLogExecution('DEBUG', 'operator_array', operator_array);


        //PACKAGES SECTION
        if (nlapiGetContext().getEnvironment() == "SANDBOX") {
            var searched_jobs = nlapiLoadSearch('customrecord_job', 'customsearch_job_completed_packages');
        } else {
            var searched_jobs = nlapiLoadSearch('customrecord_job', 'customsearch_job_completed_packages');
        }
        var newFilters = new Array();
        newFilters[newFilters.length] = new nlobjSearchFilter("custrecord_job_franchisee", null, 'anyof', zee);
        newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_service_package', null, 'noneof', '@NONE@');
        newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorafter', start_date_dailyrevenue);
        newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorbefore', end_date_dailyrevenue);
        searched_jobs.addFilters(newFilters);

        var resultSet = searched_jobs.runSearch();

        var date = start_date_dailyrevenue;

        var workingdays = getWorkDays(start_date_array[1], start_date_array[2]);
        var workingdays_count = workingdays.length;
        nlapiLogExecution('DEBUG', 'workingdays', workingdays);
        nlapiLogExecution('DEBUG', 'workingdays_count', workingdays_count);

        //VARIABLES INITIALIZATION FOR THE PACKAGE SECTION
        var package_revenue = 0;
        var package_monthly_revenue = 0; //revenue per day of the monthly packages
        var old_package;
        var old_fixed_rate_value;
        var old_discount_period;
        var old_date_scheduled;
        var count = 0;

        var package_date_sch_array = [];
        var package_revenue_array = [];
        var package_operator_array = [];

        resultSet.forEachResult(function(searchResult) {

                var package = searchResult.getValue('custrecord_job_service_package', null, 'group');
                //var service = searchResult.getValue('custrecord_job_service', null, 'group');
                var date_sch = searchResult.getValue('custrecord_job_date_scheduled', null, 'group');
                //var operator = searchResult.getValue('custrecord_job_operator_assigned', null, 'group');
                var operator = searchResult.getValue("formulatext", null, "GROUP");
                var fixed_rate_value = parseFloat(searchResult.getValue("custrecord_service_package_fix_mth_rate", "CUSTRECORD_JOB_SERVICE_PACKAGE", "GROUP"));
                var discount_period = searchResult.getValue("custrecord_service_package_disc_period", "CUSTRECORD_JOB_SERVICE_PACKAGE", "GROUP");

                nlapiLogExecution('DEBUG', 'package', package);
                nlapiLogExecution('DEBUG', 'discount_period', discount_period);
                nlapiLogExecution('DEBUG', 'fixed_rate_value', fixed_rate_value);

                if (discount_period == 3) { //Monthly
                    if (count == 0){
                        package_monthly_revenue = package_monthly_revenue + (fixed_rate_value / parseInt(workingdays_count));
                    } else if (old_package != package) {
                        package_monthly_revenue = package_monthly_revenue + (fixed_rate_value / parseInt(workingdays_count));
                        nlapiLogExecution('DEBUG', 'package_monthly_revenue', package_monthly_revenue);
                    }
                } else { //per day or per visit
                    if (count > 0) {
                        if (old_date_sch != date_sch || old_operator != operator) {
                            package_revenue = package_revenue + old_fixed_rate_value;
                            package_date_sch_array[package_date_sch_array.length] = old_date_sch;
                            package_operator_array[package_operator_array.length] = old_operator;
                            package_revenue_array[package_revenue_array.length] = package_revenue;

                            package_revenue = 0;
                        } else {
                            if (old_package != package) {
                                //nlapiLogExecution('DEBUG', 'old_package', old_package);
                                //nlapiLogExecution('DEBUG', 'date_sch', date_sch);
                                //nlapiLogExecution('DEBUG', 'old_fixed_rate_value', old_fixed_rate_value);
                                package_revenue = package_revenue + old_fixed_rate_value;
                                //nlapiLogExecution('DEBUG', 'package_revenue', package_revenue);

                            }
                        }

                    }
                }

                old_package = package;
                old_fixed_rate_value = fixed_rate_value;
                old_discount_period = discount_period;
                old_date_sch = date_sch;
                old_operator = operator;
                count++;
                return true;
            })
            //}
            //}


        //SERVICE SECTION
        //var jobgroupSearch = nlapiLoadSearch('customrecord_jobgroup', 'customsearch_job_group_completed');
        var jobgroupSearch = nlapiLoadSearch('customrecord_job', 'customsearch_job_completed');

        var newFilters = new Array();
        newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_franchisee', null, 'anyof', zee);
        newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorafter', start_date_dailyrevenue);
        newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorbefore', end_date_dailyrevenue);

        jobgroupSearch.addFilters(newFilters);

        var jobgroupSet = jobgroupSearch.runSearch();

        var old_date_scheduled = '';
        var zee_comm;
        var count = 0;
        var k = 0;

        var service_date_sch_array = [];
        var service_operator_array = [];
        var service_count_array = [];
        var service_revenue_array = [];


        jobgroupSet.forEachResult(function(jobgroupResult) {
            var date_scheduled = jobgroupResult.getValue('custrecord_job_date_scheduled', null, "group");
            //var operator = jobgroupResult.getValue('custrecord_job_operator_assigned', "CUSTRECORD_JOB_GROUP", "group");
            var operator = jobgroupResult.getValue("formulatext", null, "GROUP");
            var service_revenue = parseFloat(jobgroupResult.getValue("custrecord_job_service_price", null, "SUM"));
            var service_count = jobgroupResult.getValue("internalid", null, "COUNT");
            zee_comm = parseFloat(jobgroupResult.getValue("formulapercent", null, "GROUP"));
            /*            nlapiLogExecution('DEBUG', 'date_scheduled', date_scheduled);
                        nlapiLogExecution('DEBUG', 'old_date_scheduled', old_date_scheduled);
                        nlapiLogExecution('DEBUG', 'operator', operator);
                        nlapiLogExecution('DEBUG', 'zee_comm', zee_comm);*/

            /*            if (count == 0) {
            /*                for (i = service_operator_array.length; i < operator_array.length; i++) {
                                nlapiLogExecution('DEBUG', 'operator', operator);
                                nlapiLogExecution('DEBUG', 'operator_array[i]', operator_array[i]);
                                if (operator == operator_array[i]) {
                                    service_operator_array[service_operator_array.length] = operator;
                                    service_count_array[service_count_array.length] = service_count;
                                    service_revenue_array[service_revenue_array.length] = service_revenue;
                                    break;
                                } else {
                                    service_operator_array[service_operator_array.length] = '';
                                    service_count_array[service_count_array.length] = 0;
                                    service_revenue_array[service_revenue_array.length] = 0;
                                }
                            //}
                        } else if (count > 0) {
                            if (old_date_scheduled != date_scheduled) {
                            /*                    nlapiLogExecution('DEBUG', 'service_operator_array', service_operator_array);
                                                nlapiLogExecution('DEBUG', 'service_count_array', service_count_array);
                                                nlapiLogExecution('DEBUG', 'service_revenue_array', service_revenue_array);
                                                inlineQty += '<tr><td style="text-align:left; width: 10%;" scope="row" rowspan="5">' + old_date_scheduled + '</td>';
                                                inlineQty += '<tr>';


                                                for (k = 0; k < service_operator_array.length; k++) {
                                                    inlineQty += '<th style="text-align:center; font-size: xx-small; padding: 5px;" data-id="' + service_operator_array[k] + '" colspan="2">Number of services completed</th>';
                                                }
                                                inlineQty += '</tr>';
                                                inlineQty += '<tr>';
                                                for (k = 0; k < service_count_array.length; k++) {
                                                    inlineQty += '<td class="service_count_' + service_operator_array[k] + '" data-id="' + service_operator_array[k] + '" colspan="2" value=' + service_count_array[k] + '>' + service_count_array[k] + '</td>';
                                                }
                                                inlineQty += '</tr>';
                                                inlineQty += '<tr>';
                                                for (k = 0; k < service_revenue_array.length; k++) {
                                                    inlineQty += '<th style="text-align:center; font-size: xx-small; padding: 5px;">Revenue ($)</th>';
                                                    inlineQty += '<th style="text-align:center; font-size: xx-small; padding: 5px;">Distribution ($)</th>';
                                                }
                                                inlineQty += '</tr>';
                                                inlineQty += '<tr>';
                                                for (k = 0; k < service_revenue_array.length; k++) {
                                                    var package_revenue = 0;
                                                    for (y = 0; y < package_date_sch_array.length; y++) {
                                                        if (old_date_scheduled == package_date_sch_array[y] && service_operator_array[k] == package_operator_array[y]) {
                                                            nlapiLogExecution('DEBUG', 'PACKAGE');
                                                            package_revenue = parseFloat(package_revenue_array[y]);
                                                        }
                                                    }
                                                    var total_revenue = service_revenue_array[k] + package_revenue;
                                                    nlapiLogExecution('DEBUG', 'revenue', service_revenue_array[k]);
                                                    nlapiLogExecution('DEBUG', 'package_revenue', package_revenue);
                                                    nlapiLogExecution('DEBUG', 'total_revenue', total_revenue);
                                                    var comm = (service_revenue_array[k] + package_revenue) * zee_comm / 100;
                                                    inlineQty += '<td class="revenue_' + service_operator_array[k] + '" style="text-align:center;" data-id="' + service_operator_array[k] + '" data-package="' + package_revenue + '" data-revenue="' + service_revenue_array[k] + '" value=' + parseFloat(total_revenue).toFixed(2) + '>' + parseFloat(total_revenue).toFixed(2) + '</td>';
                                                    inlineQty += '<td class="distribution_' + service_operator_array[k] + '"style="text-align:center;" data-id="' + service_operator_array[k] + '" value=' + parseFloat(comm).toFixed(2) + '>' + parseFloat(comm).toFixed(2) + '</td>';
                                                }
                                                inlineQty += '</tr>';
                                                inlineQty += '</tr>'
                                                service_operator_array = [];
                                                service_count_array = [];
                                                service_revenue_array = [];

                                                for (i = service_operator_array.length; i < operator_array.length; i++) {
                                                    nlapiLogExecution('DEBUG', 'operator', operator);
                                                    nlapiLogExecution('DEBUG', 'operator_array[i]', operator_array[i]);
                                                    if (operator == operator_array[i]) {
                                                        service_operator_array[service_operator_array.length] = operator;
                                                        service_count_array[service_count_array.length] = service_count;
                                                        service_revenue_array[service_revenue_array.length] = service_revenue;
                                                        break;
                                                    } else {
                                                        service_operator_array[service_operator_array.length] = '';
                                                        service_count_array[service_count_array.length] = 0;
                                                        service_revenue_array[service_revenue_array.length] = 0;
                                                    }
                                                }

                                            } else {*/
            if (count > 0 && old_date_scheduled != date_scheduled) {
                k = 0;
            }
            for (i = k; i < operator_array.length; i++) {
                service_date_sch_array[service_date_sch_array.length] = date_scheduled;
                if (operator == operator_array[i]) {
                    service_operator_array[service_operator_array.length] = operator;
                    service_count_array[service_count_array.length] = service_count;
                    service_revenue_array[service_revenue_array.length] = service_revenue;
                    k = i + 1;
                    break;
                } else {
                    service_operator_array[service_operator_array.length] = '';
                    service_count_array[service_count_array.length] = 0;
                    service_revenue_array[service_revenue_array.length] = 0;
                }
            }


            //}

            //}
            old_date_scheduled = date_scheduled;
            count++;
            return true;
        })

        /*        if (count > 0) {
                    inlineQty += '<tr><td style="text-align:left; width: 10%;" scope="row" rowspan="5">' + old_date_scheduled + '</td>';
                    inlineQty += '<tr>';


                    for (k = 0; k < service_operator_array.length; k++) {
                        inlineQty += '<th style="text-align:center; font-size: xx-small; padding: 5px;" data-id="' + service_operator_array[k] + '" colspan="2">Number of services completed</th>';
                    }
                    inlineQty += '</tr>';
                    inlineQty += '<tr>';
                    for (k = 0; k < service_count_array.length; k++) {
                        inlineQty += '<td class="service_count_' + service_operator_array[k] + '" data-id="' + service_operator_array[k] + '" colspan="2" value=' + service_count_array[k] + '>' + service_count_array[k] + '</td>';
                    }
                    inlineQty += '</tr>';
                    inlineQty += '<tr>';
                    for (k = 0; k < service_revenue_array.length; k++) {
                        inlineQty += '<th style="text-align:center; font-size: xx-small; padding: 5px;">Revenue ($)</th>';
                        inlineQty += '<th style="text-align:center; font-size: xx-small; padding: 5px;">Distribution ($)</th>';
                    }
                    inlineQty += '</tr>';
                    inlineQty += '<tr>';
                    for (k = 0; k < service_revenue_array.length; k++) {
                        var package_revenue = 0;
                        for (y = 0; y < package_date_sch_array.length; y++) {
                            if (old_date_scheduled == package_date_sch_array[y] && service_operator_array[k] == package_operator_array[y]) {
                                nlapiLogExecution('DEBUG', 'PACKAGE');
                                package_revenue = parseFloat(package_revenue_array[y]);
                            }
                        }
                        var total_revenue = service_revenue_array[k] + package_revenue;
                        nlapiLogExecution('DEBUG', 'revenue', service_revenue_array[k]);
                        nlapiLogExecution('DEBUG', 'package_revenue', package_revenue);
                        nlapiLogExecution('DEBUG', 'total_revenue', total_revenue);
                        var comm = (service_revenue_array[k] + package_revenue) * zee_comm / 100;
                        inlineQty += '<td class="revenue_' + service_operator_array[k] + '" style="text-align:center;" data-id="' + service_operator_array[k] + '" data-package="' + package_revenue + '" data-revenue="' + service_revenue_array[k] + '" value=' + parseFloat(total_revenue).toFixed(2) + '>' + parseFloat(total_revenue).toFixed(2) + '</td>';
                        inlineQty += '<td class="distribution_' + service_operator_array[k] + '"style="text-align:center;" data-id="' + service_operator_array[k] + '" value=' + parseFloat(comm).toFixed(2) + '>' + parseFloat(comm).toFixed(2) + '</td>';
                    }
                    inlineQty += '</tr>';
                    inlineQty += '</tr>';
                }*/

        nlapiLogExecution('DEBUG', 'service_date_sch_array', service_date_sch_array);
        nlapiLogExecution('DEBUG', 'service_count_array', service_count_array);
        nlapiLogExecution('DEBUG', 'service_revenue_array', service_revenue_array);
        nlapiLogExecution('DEBUG', 'service_operator_array', service_operator_array);

        nlapiLogExecution('DEBUG', 'package_date_sch_array', package_date_sch_array);
        nlapiLogExecution('DEBUG', 'package_revenue_array', package_revenue_array);
        nlapiLogExecution('DEBUG', 'package_operator_array', package_operator_array);

        for (i = 0; i < workingdays_count; i++) {
            date = workingdays[i];
            inlineQty += '<tr><td style="text-align:left; width: 10%;" scope="row" rowspan="5">' + date + '</td>';
            inlineQty += '<tr>';
            var total_service_count = 0;
            var total_revenue = package_monthly_revenue;
            var service_count_html = '';
            var html = '';
            var revenue_html = '';
            for (y = 0; y < operator_array.length; y++) {
                operator = operator_array[y];
                inlineQty += '<th style="text-align:center; font-size: xx-small; padding: 5px;" data-id="' + operator + '" colspan="2">Number of services completed</th>';
                for (k = 0; k < service_date_sch_array.length; k++) {
                    if (date == service_date_sch_array[k] && operator == service_operator_array[k]) {
                        total_service_count = total_service_count + parseInt(service_count_array[k]);
                        nlapiLogExecution('DEBUG', 'service_revenue_array[k]', service_revenue_array[k]);
                        nlapiLogExecution('DEBUG', 'total_revenue', total_revenue);
                        total_revenue = total_revenue + parseFloat(service_revenue_array[k]);
                    }
                }
                for (k = 0; k < package_date_sch_array.length; k++) {
                    if (date == package_date_sch_array[k] && operator == package_operator_array[k]) {
                        total_service_count = total_service_count + package_count_array[k];
                        total_revenue = total_revenue + parseFloat(package_revenue_array[k]);
                    }
                }
                service_count_html += '<td class="service_count_' + operator + '" data-id="' + operator + '" colspan="2" value=' + total_service_count + '>' + total_service_count + '</td>';
                html += '<th style="text-align:center; font-size: xx-small; padding: 5px;">Revenue ($)</th><th style="text-align:center; font-size: xx-small; padding: 5px;">Distribution ($)</th>';
                /*                revenue_html += '<td class="revenue_' + operator + '" style="text-align:center;" data-id="' + operator + '" data-package="' + package_revenue_array[k] + '" data-revenue="' + service_revenue_array[k] + '" value=' + parseFloat(total_revenue).toFixed(2) + '>' + parseFloat(total_revenue).toFixed(2) + '</td>';*/
                var comm = total_revenue * zee_comm / 100;
                revenue_html += '<td class="revenue_' + operator + '" style="text-align:center;" data-id="' + operator + '" value=' + parseFloat(total_revenue).toFixed(2) + '>' + parseFloat(total_revenue).toFixed(2) + '</td>';
                revenue_html += '<td class="distribution_' + operator + '"style="text-align:center;" data-id="' + operator + '" value=' + parseFloat(comm).toFixed(2) + '>' + parseFloat(comm).toFixed(2) + '</td>';


            }

            inlineQty += '</tr>';
            inlineQty += '<tr>';
            inlineQty += service_count_html;
            inlineQty += '</tr>';
            inlineQty += '<tr>';
            inlineQty += html;
            inlineQty += '</tr>';
            inlineQty += '<tr>';
            inlineQty += revenue_html;
            inlineQty += '</tr>';
            inlineQty += '<tr>';


            /*            for (k = 0; k < service_operator_array.length; k++) {
                            inlineQty += '<th style="text-align:center; font-size: xx-small; padding: 5px;" data-id="' + service_operator_array[k] + '" colspan="2">Number of services completed</th>';
                        }
                        inlineQty += '</tr>';
                        inlineQty += '<tr>';
                        for (k = 0; k < service_count_array.length; k++) {
                            inlineQty += '<td class="service_count_' + service_operator_array[k] + '" data-id="' + service_operator_array[k] + '" colspan="2" value=' + service_count_array[k] + '>' + service_count_array[k] + '</td>';
                        }
                        inlineQty += '</tr>';
                        inlineQty += '<tr>';
                        for (k = 0; k < service_revenue_array.length; k++) {
                            inlineQty += '<th style="text-align:center; font-size: xx-small; padding: 5px;">Revenue ($)</th>';
                            inlineQty += '<th style="text-align:center; font-size: xx-small; padding: 5px;">Distribution ($)</th>';
                        }
                        inlineQty += '</tr>';
                        inlineQty += '<tr>';
                        for (k = 0; k < service_revenue_array.length; k++) {
                            var package_revenue = 0;
                            for (y = 0; y < package_date_sch_array.length; y++) {
                                if (old_date_scheduled == package_date_sch_array[y] && service_operator_array[k] == package_operator_array[y]) {
                                    nlapiLogExecution('DEBUG', 'PACKAGE');
                                    package_revenue = parseFloat(package_revenue_array[y]);
                                }
                            }
                            var total_revenue = service_revenue_array[k] + package_revenue;
                            nlapiLogExecution('DEBUG', 'revenue', service_revenue_array[k]);
                            nlapiLogExecution('DEBUG', 'package_revenue', package_revenue);
                            nlapiLogExecution('DEBUG', 'total_revenue', total_revenue);
                            var comm = (service_revenue_array[k] + package_revenue) * zee_comm / 100;
                            inlineQty += '<td class="revenue_' + service_operator_array[k] + '" style="text-align:center;" data-id="' + service_operator_array[k] + '" data-package="' + package_revenue + '" data-revenue="' + service_revenue_array[k] + '" value=' + parseFloat(total_revenue).toFixed(2) + '>' + parseFloat(total_revenue).toFixed(2) + '</td>';
                            inlineQty += '<td class="distribution_' + service_operator_array[k] + '"style="text-align:center;" data-id="' + service_operator_array[k] + '" value=' + parseFloat(comm).toFixed(2) + '>' + parseFloat(comm).toFixed(2) + '</td>';
                        }
                        inlineQty += '</tr>';
                        inlineQty += '</tr>';*/
        }

        inlineQty += '</tbody>';
        inlineQty += '<tfoot style="color: white;background-color: #607799;">';
        inlineQty += '<tr><td style="text-align:left; width: 10%;" scope="row" rowspan="5">TOTAL</td>';
        inlineQty += '<tr>';

        for (k = 0; k < operator_array.length; k++) {
            inlineQty += '<th style="text-align:center; font-size: xx-small; padding: 5px;" data-id="' + operator_array[k] + '" colspan="2">Number of services completed</th>';
        }
        inlineQty += '</tr>';
        inlineQty += '<tr>';
        for (k = 0; k < operator_array.length; k++) {
            inlineQty += '<td class="total_service_count_' + operator_array[k] + '" data-id="' + operator_array[k] + '" colspan="2"></td>';
        }
        inlineQty += '</tr>';
        inlineQty += '<tr>';
        for (k = 0; k < operator_array.length; k++) {
            inlineQty += '<th style="text-align:center; font-size: xx-small; padding: 5px;">Revenue ($)</th>';
            inlineQty += '<th style="text-align:center; font-size: xx-small; padding: 5px;">Distribution ($)</th>';
        }
        inlineQty += '</tr>';

        inlineQty += '<tr>';
        for (k = 0; k < operator_array.length; k++) {
            inlineQty += '<td class="total_revenue_' + operator_array[k] + '"" style="text-align:center;" data-id="' + operator_array[k] + '"></td>';
            inlineQty += '<td class="total_distribution_' + operator_array[k] + '"" style="text-align:center;" data-id="' + operator_array[k] + '"></td>';
        }
        inlineQty += '</tr>';

        inlineQty += '</tr>';
        inlineQty += '</tfoot></table></div>';



        form.addButton('Back', 'BACK', 'onclick_back()');
        form.setScript('customscript_cl_daily_revenue');

        form.addField('start_date', 'text', 'start_date').setDisplayType('hidden').setDefaultValue(request.getParameter('start_date'));
        form.addField('end_date', 'text', 'end_date').setDisplayType('hidden').setDefaultValue(request.getParameter('end_date'));
        form.addField('zee', 'text', 'zee').setDisplayType('hidden').setDefaultValue(zee);
        var operator_string = operator_array.join();
        nlapiLogExecution('DEBUG', 'operator_string', operator_string);
        form.addField('operator_string', 'text', 'operator_string').setDisplayType('hidden').setDefaultValue(operator_string);

        form.addField('custpage_html2', 'inlinehtml').setPadding(1).setLayoutType('outsideabove').setDefaultValue(inlinehtml);
        form.addField('preview_table', 'inlinehtml', '').setLayoutType('outsidebelow', 'startrow').setDefaultValue(inlineQty);

        response.writePage(form);

    } else {

    }
}

function getDaysInMonth(iMonth, iYear) {
    return 32 - new Date(iYear, iMonth, 32).getDate();
}

function isWorkDay(year, month, day) {
    var dayOfWeek = new Date(year, month - 1, day).getDay();
    return dayOfWeek >= 1 && dayOfWeek <= 5; // Sun = 0, Mon = 1, and so forth
}

function getWorkDays(month, year) {
    var days = getDaysInMonth(month, year);
    var workdays = [];
    for (var i = 0; i < days; i++) {
        if (isWorkDay(year, month, i + 1)) {
            date = new Date(year, month, i + 1);
            date_day = date.getDate();
            date_month = date.getMonth();
            date_year = date.getFullYear();
            workdays[workdays.length] = date_day + '/' + date_month + '/' + date_year;
        }
    }
    return workdays;
}