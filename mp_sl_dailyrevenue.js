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

        var inlineQty = '<div><style>table#daily_revenue {font-size:12px; font-weight:bold; text-align:center; border-color: #24385b;} </style><table border="0" cellpadding="10" id="daily_revenue" cellspacing="0" class="table table-responsive table-striped table-bordered w-auto"><thead style="color: white;background-color: #607799;"><tr><th style="text-align:left;  width: 10%;"><b>Date</b></th>';

        var operatorSearch = nlapiLoadSearch('customrecord_operator', 'customsearch_rta_operator_load');
        var newFilters = new Array();
        newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_operator_franchisee', null, 'anyof', zee);
        operatorSearch.addFilters(newFilters);
        var operatorSet = operatorSearch.runSearch();

        var operator_array = [];
        var operator_id_array = [];
        operatorSet.forEachResult(function(operatorResult) {
            var operator_id = operatorResult.getValue("internalid", null, "GROUP");
            var operator_name = operatorResult.getValue("name", null, "GROUP");
            operator_array[operator_array.length] = operator_name;
            operator_id_array[operator_id_array.length] = operator_id;
            nlapiLogExecution('DEBUG', 'operator_name', operator_name);
            inlineQty += '<th style="text-align:center;" data-op="' + operator_id + '"><b>' + operator_name + '</b></th>';
            return true;
        });
        inlineQty += '</tr></thead>';
        inlineQty += '<body>'

        nlapiLogExecution('DEBUG', 'operator_array', operator_array);


        //PACKAGES SECTION
        var start_time = Date.now();
        if (nlapiGetContext().getEnvironment() == "SANDBOX") {
            var package_jobSearch = nlapiLoadSearch('customrecord_job', 'customsearch_job_completed_packages');
        } else {
            var package_jobSearch = nlapiLoadSearch('customrecord_job', 'customsearch_job_completed_packages');
        }
        var newFilters = new Array();
        newFilters[newFilters.length] = new nlobjSearchFilter("custrecord_job_franchisee", null, 'anyof', zee);
        newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_service_package', null, 'noneof', '@NONE@');
        newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorafter', start_date_dailyrevenue);
        newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorbefore', end_date_dailyrevenue);
        package_jobSearch.addFilters(newFilters);

        var package_jobSet = package_jobSearch.runSearch();

        var date = start_date_dailyrevenue;

        var workingdays = getWorkDays(start_date_array[1], start_date_array[2]);
        var workingdays_count = workingdays.length;
        nlapiLogExecution('DEBUG', 'workingdays', workingdays);
        nlapiLogExecution('DEBUG', 'workingdays_count', workingdays_count);

        var zee_comm = 1;

        //VARIABLES INITIALIZATION FOR THE PACKAGE SECTION
        var package_revenue = 0;
        var package_monthly_revenue = 0; //revenue per day of the monthly packages
        var package_service_count = 0;
        var old_package;
        var old_fixed_rate_value;
        var old_discount_period;
        var old_date_scheduled;
        var monthly_count = 0;
        var perday_count = 0;

        var package_date_sch_array = [];
        var package_revenue_array = [];
        var package_operator_array = [];
        var package_service_count_array = [];

        var date_sch_package_revenue_array = new Array(operator_array.length);
        var date_sch_package_service_count_array = new Array(operator_array.length);

        var package_monthly_revenue_array = new Array(operator_array.length);

        var package_operator_count_array = new Array(operator_array.length);
        var package_monthly_service_count_array = new Array(operator_array.length);
        for (i = 0; i < operator_array.length; i++) {
            package_monthly_revenue_array[i] = 0;
            package_monthly_service_count_array[i] = 0;
            date_sch_package_revenue_array[i] = 0;
            date_sch_package_service_count_array[i] = 0;
        }
        var package_operator_count = 1;

        package_jobSet.forEachResult(function(searchResult) {

            var package = searchResult.getValue('custrecord_job_service_package', null, 'group');
            var date_sch = searchResult.getValue('custrecord_job_date_scheduled', null, 'group');
            var operator = searchResult.getValue("formulatext", null, "GROUP");
            var fixed_rate_value = parseFloat(searchResult.getValue("custrecord_service_package_fix_mth_rate", "CUSTRECORD_JOB_SERVICE_PACKAGE", "GROUP"));
            var discount_period = searchResult.getValue("custrecord_service_package_disc_period", "CUSTRECORD_JOB_SERVICE_PACKAGE", "GROUP");
            var package_count = parseInt(searchResult.getValue("custrecord_job_service", null, "COUNT"));
            zee_comm = parseFloat(searchResult.getValue("formulapercent", null, "GROUP"));

            /*                nlapiLogExecution('DEBUG', 'package', package);
                            nlapiLogExecution('DEBUG', 'discount_period', discount_period);
                            nlapiLogExecution('DEBUG', 'fixed_rate_value', fixed_rate_value);*/

            if (discount_period == 3) { //Monthly
                if (monthly_count == 0) {
                    package_operator_count_array[operator_array.indexOf(operator)] = operator;
                    package_monthly_service_count_array[operator_array.indexOf(operator)] += package_count;

                } else if (old_package == package && old_operator != operator) { //DIFFERENT OPERATORS ARE COMPLETED THE SERVICES OF THE SAME PACKAGE
                    package_operator_count += 1;
                    nlapiLogExecution('DEBUG', 'package_operator_count 155', package_operator_count);
                    package_operator_count_array[operator_array.indexOf(operator)] = operator;
                    package_monthly_service_count_array[operator_array.indexOf(operator)] += package_count;

                } else if (old_package != package) {
                    package_monthly_revenue = old_fixed_rate_value / parseInt(workingdays_count) / parseInt(package_operator_count); //RATE IS SPLITTED AMONG THE DIFF OPERATORS OF THAT PACKAGE
                    nlapiLogExecution('DEBUG', 'old_fixed_rate_value', old_fixed_rate_value);
                    nlapiLogExecution('DEBUG', 'workingdays_count', workingdays_count);
                    nlapiLogExecution('DEBUG', 'package_operator_count', package_operator_count);
                    nlapiLogExecution('DEBUG', 'package_monthly_revenue', package_monthly_revenue);
                    for (i = 0; i < package_operator_count_array.length; i++) {
                        if (!isNullorEmpty(package_operator_count_array[i])) {
                            package_monthly_revenue_array[i] = package_monthly_revenue_array[i] + package_monthly_revenue;
                        }
                    }
                    nlapiLogExecution('DEBUG', 'package_monthly_revenue_array', package_monthly_revenue_array);
                    package_operator_count = 1;
                    package_operator_count_array = [];

                    package_operator_count_array[operator_array.indexOf(operator)] = operator;
                    package_monthly_service_count_array[operator_array.indexOf(operator)] += package_count;
                }
                monthly_count++;
            } else if (discount_period == 1 || discount_period == 2) { //per day or per visit
                nlapiLogExecution('DEBUG', 'package', package);
                nlapiLogExecution('DEBUG', 'old_package', old_package);
                nlapiLogExecution('DEBUG', 'date_sch', date_sch);
                nlapiLogExecution('DEBUG', 'old_date_sch', old_date_sch);
                if (old_discount_period == 3) { //save the last monthly package
                    package_monthly_revenue = old_fixed_rate_value / parseInt(workingdays_count) / parseInt(package_operator_count);
                    nlapiLogExecution('DEBUG', 'LAST old_fixed_rate_value', old_fixed_rate_value);
                    nlapiLogExecution('DEBUG', 'LAST workingdays_count', workingdays_count);
                    nlapiLogExecution('DEBUG', 'LAST package_operator_count', package_operator_count);
                    nlapiLogExecution('DEBUG', 'LAST package_monthly_revenue', package_monthly_revenue);
                    for (i = 0; i < package_operator_count_array.length; i++) {
                        if (!isNullorEmpty(package_operator_count_array[i])) {
                            package_monthly_revenue_array[i] = package_monthly_revenue_array[i] + package_monthly_revenue;
                        }
                    }
                    package_operator_count = 1;
                    monthly_count++;
                }
                if (perday_count == 0) {
                } else if (old_date_sch == date_sch) {
                    nlapiLogExecution('DEBUG', 'same date');
                    if (old_package == package && old_operator != operator) {
                        package_operator_count += 1;
                    } else if (old_package != package) {
                        for (i = 0; i < operator_array.length; i++) {
                            //nlapiLogExecution('DEBUG', 'package_operator_count_array)', package_operator_count_array);
                            //nlapiLogExecution('DEBUG', 'package_operator_count_array[operator_array.indexOf(operator)]', package_operator_count_array[operator_array.indexOf(operator)]);
                            if (!isNullorEmpty(package_operator_count_array[operator_array.indexOf(operator_array[i])])) {
                                nlapiLogExecution('DEBUG', 'old_fixed_rate_value', old_fixed_rate_value);
                                nlapiLogExecution('DEBUG', 'package_operator_count', package_operator_count);
                                nlapiLogExecution('DEBUG', 'revenue', old_fixed_rate_value / package_operator_count);
                                date_sch_package_revenue_array[operator_array.indexOf(operator_array[i])] += old_fixed_rate_value / package_operator_count;
                            }
                        }
                        nlapiLogExecution('DEBUG', 'date_sch_package_revenue_array', date_sch_package_revenue_array);

                        package_operator_count = 1;
                        package_operator_count_array = [];

                    }
                } else if (old_date_sch != date_sch) {
                    for (i = 0; i < operator_array.length; i++) {
                        //nlapiLogExecution('DEBUG', 'package_operator_count_array)', package_operator_count_array);
                        //nlapiLogExecution('DEBUG', 'package_operator_count_array[operator_array.indexOf(operator)]', package_operator_count_array[operator_array.indexOf(operator)]);
                        if (!isNullorEmpty(package_operator_count_array[operator_array.indexOf(operator_array[i])])) {
                            nlapiLogExecution('DEBUG', 'old_fixed_rate_value', old_fixed_rate_value);
                            nlapiLogExecution('DEBUG', 'package_operator_count', package_operator_count);
                            nlapiLogExecution('DEBUG', 'revenue', old_fixed_rate_value / package_operator_count);
                            date_sch_package_revenue_array[operator_array.indexOf(operator_array[i])] += old_fixed_rate_value / package_operator_count;
                        }
                    }
                    nlapiLogExecution('DEBUG', 'date_sch_package_revenue_array', date_sch_package_revenue_array);
                    nlapiLogExecution('DEBUG', 'date_sch_package_service_count_array', date_sch_package_service_count_array);
                    for (i = 0; i < operator_array.length; i++) {
                        package_date_sch_array[package_date_sch_array.length] = old_date_sch;
                        package_operator_array[package_operator_array.length] = operator_array[i];
                        package_revenue_array[package_revenue_array.length] = date_sch_package_revenue_array[i];
                        package_service_count_array[package_service_count_array.length] = date_sch_package_service_count_array[i];

                        date_sch_package_revenue_array[i] = 0;
                        date_sch_package_service_count_array[i] = 0;
                    }
                    package_operator_count_array = [];
                }
                package_operator_count_array[operator_array.indexOf(operator)] = operator;
                date_sch_package_service_count_array[operator_array.indexOf(operator)] += package_count;
                perday_count++;
            }


            old_package = package;
            old_fixed_rate_value = fixed_rate_value;
            old_package_count = package_count;
            old_discount_period = discount_period;
            old_date_sch = date_sch;
            old_operator = operator;
            return true;
        })

        if (monthly_count > 0 || perday_count > 0) {
            if (old_discount_period == 3) { //Monthly
                package_monthly_revenue = old_fixed_rate_value / parseInt(workingdays_count) / parseInt(package_operator_count); //RATE IS SPLITTED AMONG THE DIFF OPERATORS OF THAT PACKAGE
                nlapiLogExecution('DEBUG', 'old_fixed_rate_value', old_fixed_rate_value);
                nlapiLogExecution('DEBUG', 'workingdays_count', workingdays_count);
                nlapiLogExecution('DEBUG', 'package_operator_count', package_operator_count);
                nlapiLogExecution('DEBUG', 'package_monthly_revenue', package_monthly_revenue);
                for (i = 0; i < package_operator_count_array.length; i++) {
                    if (!isNullorEmpty(package_operator_count_array[i])) {
                        package_monthly_revenue_array[i] = package_monthly_revenue_array[i] + package_monthly_revenue;
                    }
                }
                nlapiLogExecution('DEBUG', 'package_monthly_revenue_array', package_monthly_revenue_array);
            } else if (old_discount_period == 1 || old_discount_period == 2) { //per day or per visit
                for (i = 0; i < operator_array.length; i++) {
                    //nlapiLogExecution('DEBUG', 'package_operator_count_array)', package_operator_count_array);
                    //nlapiLogExecution('DEBUG', 'package_operator_count_array[operator_array.indexOf(operator)]', package_operator_count_array[operator_array.indexOf(operator)]);
                    if (!isNullorEmpty(package_operator_count_array[operator_array.indexOf(operator_array[i])])) {
                        nlapiLogExecution('DEBUG', 'old_fixed_rate_value', old_fixed_rate_value);
                        nlapiLogExecution('DEBUG', 'package_operator_count', package_operator_count);
                        nlapiLogExecution('DEBUG', 'revenue', old_fixed_rate_value / package_operator_count);
                        date_sch_package_revenue_array[operator_array.indexOf(operator_array[i])] += old_fixed_rate_value / package_operator_count;
                    }
                    package_date_sch_array[package_date_sch_array.length] = old_date_sch;
                    package_operator_array[package_operator_array.length] = operator_array[i];
                    package_revenue_array[package_revenue_array.length] = date_sch_package_revenue_array[i];
                    package_service_count_array[package_service_count_array.length] = date_sch_package_service_count_array[i];
                }
            }
        }
        nlapiLogExecution('DEBUG', 'monthly_count', monthly_count);
        nlapiLogExecution('DEBUG', 'perday_count', perday_count);

        nlapiLogExecution('DEBUG', 'package_time', Date.now() - start_time)
        start_time = Date.now();

        //SERVICE & EXTRAS SECTION
        var jobSearch = nlapiLoadSearch('customrecord_job', 'customsearch_job_completed');

        var newFilters = new Array();
        newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_franchisee', null, 'anyof', zee);
        newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorafter', start_date_dailyrevenue);
        newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorbefore', end_date_dailyrevenue);

        jobSearch.addFilters(newFilters);
        var jobSet = jobSearch.runSearch();

        var old_date_scheduled = '';
        var count = 0;

        var service_date_sch_array = [];
        var service_operator_array = [];
        var service_count_array = [];
        var service_revenue_array = [];

        var extra_date_sch_array = [];
        var extra_operator_array = [];
        var extra_count_array = [];
        var extra_revenue_array = [];


        jobSet.forEachResult(function(jobResult) {
            var date_scheduled = jobResult.getValue('custrecord_job_date_scheduled', null, "group");
            var operator = jobResult.getValue("formulatext", null, "GROUP");
            service_category = jobResult.getValue("formulacurrency", null, "GROUP");
            var service_revenue = parseFloat(jobResult.getValue("formulanumeric", null, "SUM"));
            var service_count = jobResult.getValue("internalid", null, "COUNT");
            zee_comm = parseFloat(jobResult.getValue("formulapercent", null, "GROUP"));


            if (count > 0 && old_date_scheduled != date_scheduled) {
                k = 0;
                l = 0;
            }
            if (service_category == 1.00) { //Services
                service_date_sch_array[service_date_sch_array.length] = date_scheduled;
                service_operator_array[service_operator_array.length] = operator;
                service_count_array[service_count_array.length] = service_count;
                service_revenue_array[service_revenue_array.length] = service_revenue;
            } else if (service_category == 2.00) { //Extras
                extra_date_sch_array[extra_date_sch_array.length] = date_scheduled;
                extra_operator_array[extra_operator_array.length] = operator;
                extra_count_array[extra_count_array.length] = service_count;
                extra_revenue_array[extra_revenue_array.length] = service_revenue;
            }

            old_date_scheduled = date_scheduled;
            count++;
            return true;
        })
        nlapiLogExecution('DEBUG', 'service_time', Date.now() - start_time);

        nlapiLogExecution('DEBUG', 'service_date_sch_array', service_date_sch_array);
        nlapiLogExecution('DEBUG', 'service_count_array', service_count_array);
        nlapiLogExecution('DEBUG', 'service_revenue_array', service_revenue_array);
        nlapiLogExecution('DEBUG', 'service_operator_array', service_operator_array);

        nlapiLogExecution('DEBUG', 'extra_date_sch_array', extra_date_sch_array);
        nlapiLogExecution('DEBUG', 'extra_count_array', extra_count_array);
        nlapiLogExecution('DEBUG', 'extra_revenue_array', extra_revenue_array);
        nlapiLogExecution('DEBUG', 'extra_operator_array', extra_operator_array);
        var extra_sum = sum(extra_revenue_array);
        nlapiLogExecution('DEBUG', 'extra_sum', extra_sum);

        nlapiLogExecution('DEBUG', 'package_date_sch_array', package_date_sch_array);
        nlapiLogExecution('DEBUG', 'package_service_count_array', package_service_count_array);
        nlapiLogExecution('DEBUG', 'package_revenue_array', package_revenue_array);
        nlapiLogExecution('DEBUG', 'package_operator_array', package_operator_array);

        nlapiLogExecution('DEBUG', 'package_monthly_service_count_array', package_monthly_service_count_array);
        nlapiLogExecution('DEBUG', 'package_monthly_revenue_array', package_monthly_revenue_array);
        nlapiLogExecution('DEBUG', 'package_operator_count_array', package_operator_count_array);

        start_time = Date.now();
        for (i = 0; i < workingdays_count; i++) {
            date = workingdays[i];

            inlineQty += '<tr><td style="font-size:small">' + date + '</td>';
            var total_service_count = 0;
            var total_revenue = 0.00;
            var total_service_count_service = 0;
            var total_service_count_extra = 0;
            var total_service_count_package = 0;
            var total_service_count_monthly_package = 0;
            var total_revenue_service = 0;
            var total_revenue_extra = 0;
            var total_revenue_package = 0;
            var total_revenue_monthly_package = 0;


            var service_count_html = '';
            var html = '';
            var revenue_html = '';
            for (y = 0; y < operator_array.length; y++) {
                operator = operator_array[y];
                total_service_count = 0;
                total_revenue = 0.00;

                //SERVICES
                for (k = 0; k < service_date_sch_array.length; k++) {
                    if (date == service_date_sch_array[k] && operator == service_operator_array[k]) {
                        total_service_count_service = parseInt(service_count_array[k]);
                        total_service_count = total_service_count + total_service_count_service;

                        total_revenue_service = parseFloat(service_revenue_array[k]);
                        total_revenue = total_revenue + total_revenue_service;
                    }
                }
                //PACKAGES
                for (k = 0; k < package_date_sch_array.length; k++) {
                    if (date == package_date_sch_array[k] && operator == package_operator_array[k]) {
                        total_service_count_package = parseInt(package_service_count_array[k]);
                        total_service_count = total_service_count + total_service_count_package;

                        total_revenue_package = parseFloat(package_revenue_array[k]);
                        total_revenue = total_revenue + total_revenue_package;
                    }
                }
                //EXTRAS
                for (k = 0; k < extra_date_sch_array.length; k++) {
                    if (date == extra_date_sch_array[k] && operator == extra_operator_array[k]) {
                        total_service_count_extra = parseInt(extra_count_array[k]);

                        total_revenue_extra = parseFloat(extra_revenue_array[k]);
                        total_revenue = total_revenue + total_revenue_extra;
                    }
                }

                total_service_count_monthly_package = parseInt(package_monthly_service_count_array[operator_array.indexOf(operator)]);
                total_service_count = total_service_count + total_service_count_monthly_package;

                total_revenue_monthly_package = parseFloat(package_monthly_revenue_array[operator_array.indexOf(operator)]);
                total_revenue = total_revenue + total_revenue_monthly_package;

                var comm = total_revenue * zee_comm / 100;
                inlineQty += '<td><div class="col-sm-3"><label for="service_count_' + operator_id_array[y] + '" style="display:block;">SERVICES</label><button type="button" class="btn btn-lg btn-primary service_count_' + operator_id_array[y] + '" id="service_count_' + operator_id_array[y] + '" style="text-align:center;" data-op="' + operator_array[y] + '" data-service="' + total_service_count_service + '" data-package="' + total_service_count_package + '" data-monthly-package="' + total_service_count_monthly_package + '" value="' + total_service_count + '" disabled>' + total_service_count + '</button></div>';
                inlineQty += '<div class="col-sm-3"><label for="service_count_' + operator_id_array[y] + '" style="display:block;">EXTRAS</label><button type="button" class="btn btn-lg btn-info extra_count_' + operator_id_array[y] + '" id="extra_count_' + operator_id_array[y] + '" style="text-align:center;" data-op="' + operator_array[y] + '" data-extra="' + total_service_count_extra + '" value="' + total_service_count_extra + '" disabled>' + total_service_count_extra + '</button></div>';
                inlineQty += '<div class="col-sm-6"><div class="input-group" style="width:100%;"><span class="input-group-addon" style="width:45%;">Revenue ($)</span><input type="button" class="form-control revenue_' + operator_id_array[y] + '" style="text-align:center; background-color: white;" data-op="' + operator_array[y] + '" data-service="' + total_revenue_service.toFixed(2) + '" data-package="' + total_revenue_package + '" data-monthly-package="' + total_revenue_monthly_package.toFixed(2) + '" data-extra="' + total_revenue_extra + '" value="' + parseFloat(total_revenue).toFixed(2) + '" disabled /></div>'
                inlineQty += '</br><div class="input-group" style="width:100%;"><span class="input-group-addon" style="width:45%;">Distribution ($)</span><input type="button" class="form-control distribution_' + operator_id_array[y] + '" style="text-align:center; background-color:white;" data-op="' + operator_array[y] + '" value="' + parseFloat(comm).toFixed(2) + '" disabled /></div></div></td>';

            }
            inlineQty += '</tr>';
            if (date == today) {
                break;
            }
        }

        inlineQty += '</tbody>';
        inlineQty += '<tfoot style="color: white;background-color: #607799;">';
        inlineQty += '<tr><td style="text-align:center; font-size:medium; vertical-align:middle;">TOTAL</td>';

        for (y = 0; y < operator_array.length; y++) {
            inlineQty += '<td><div class="col-sm-3"><label for="total_service_count_' + operator_id_array[y] + '" style="display:block;">SERVICES</label><button type="button" class="btn btn-lg total_service_count_' + operator_id_array[y] + '" id="total_service_count_' + operator_id_array[y] + '" style="text-align:center; background-color: white;color: #607799" data-op="' + operator_array[y] + '" disabled></button></div>';
            inlineQty += '<div class="col-sm-3"><label for="total_extra_count_' + operator_id_array[y] + '" style="display:block;">EXTRAS</label><button type="button" class="btn btn-lg total_extra_count_' + operator_id_array[y] + '" id="total_extra_count_' + operator_id_array[y] + '" style="text-align:center; background-color: white;color: #607799" data-op="' + operator_array[y] + '" disabled></button></div>';
            inlineQty += '<div class="col-sm-6"><div class="input-group" style="width:100%;"><span class="input-group-addon" style="width:45%;">Revenue ($)</span><input type="button" class="form-control total_revenue_' + operator_id_array[y] + '" style="text-align:center; background-color: white;" data-op="' + operator_array[y] + '" disabled /></div>'
            inlineQty += '</br><div class="input-group" style="width:100%;"><span class="input-group-addon" style="width:45%;">Distribution ($)</span><input type="button" class="form-control total_distribution_' + operator_id_array[y] + '" style="text-align:center; background-color:white;" data-op="' + operator_array[y] + '" disabled /></div></div></td>';
        }


        inlineQty += '</tr>';
        inlineQty += '</tfoot></table></div>';

        nlapiLogExecution('DEBUG', 'display time', Date.now() - start_time);

        form.addButton('Back', 'BACK', 'onclick_back()');
        form.setScript('customscript_cl_daily_revenue');

        form.addField('start_date', 'text', 'start_date').setDisplayType('hidden').setDefaultValue(request.getParameter('start_date'));
        form.addField('end_date', 'text', 'end_date').setDisplayType('hidden').setDefaultValue(request.getParameter('end_date'));
        form.addField('zee', 'text', 'zee').setDisplayType('hidden').setDefaultValue(zee);
        var operator_id_string = operator_id_array.join();
        nlapiLogExecution('DEBUG', 'operator_string', operator_id_string);
        form.addField('operator_string', 'text', 'operator_string').setDisplayType('hidden').setDefaultValue(operator_id_string);

        form.addField('custpage_html2', 'inlinehtml').setPadding(1).setLayoutType('outsideabove').setDefaultValue(inlinehtml);
        form.addField('preview_table', 'inlinehtml', '').setLayoutType('outsidebelow', 'startrow').setDefaultValue(inlineQty);

        response.writePage(form);

    } else {

    }
}

function getDaysInMonth(iMonth, iYear) {
    return 32 - new Date(iYear, iMonth - 1, 32).getDate();
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
            date = new Date(year, month - 1, i + 1);
            //nlapiLogExecution('DEBUG', 'date', date);
            date_day = date.getDate();
            date_month = date.getMonth() + 1;
            date_year = date.getFullYear();
            workdays[workdays.length] = date_day + '/' + date_month + '/' + date_year;
        }
    }
    return workdays;
}

function sum(array){
    var sum = 0;
    for (i = 0; i < array.length; i++){
        sum += array[i];
    }
    return sum;
}