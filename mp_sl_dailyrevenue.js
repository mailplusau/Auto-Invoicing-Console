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
    if (request.getMethod() == "GET") {
        var zee = request.getParameter('zee');
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

        var same_month = false;
        if (today_month == start_date_array[1] && today_year == start_date_array[2]) { //if looking at current month, show from 1st day to today
            var start_date_dailyrevenue = start_date;
            var end_date_dailyrevenue = today;
            same_month = true;
        } else { //if looking at previous month, show the entire month
            var start_date_dailyrevenue = start_date;
            var end_date_dailyrevenue = end_date;
        }
        nlapiLogExecution('DEBUG', 'start_date_dailyrevenue', start_date_dailyrevenue);
        nlapiLogExecution('DEBUG', 'end_date_dailyrevenue', end_date_dailyrevenue);

        var start_date_dailyrevenue_array = start_date_dailyrevenue.split('/');
        var end_date_dailyrevenue_array = end_date_dailyrevenue.split('/');

        var month = getMonthName(start_date_array[1]);

        var form = nlapiCreateForm('Daily Revenue for ' + month + ' ' + start_date_array[2]);

        var inlinehtml = '<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js"><script src="//code.jquery.com/jquery-1.11.0.min.js"></script><link type="text/css" rel="stylesheet" href="https://cdn.datatables.net/1.10.13/css/jquery.dataTables.min.css"><link href="//netdna.bootstrapcdn.com/bootstrap/3.3.2/css/bootstrap.min.css" rel="stylesheet"><script src="//netdna.bootstrapcdn.com/bootstrap/3.3.2/js/bootstrap.min.js"></script><link rel="stylesheet" href="https://1048144.app.netsuite.com/core/media/media.nl?id=2060796&c=1048144&h=9ee6accfd476c9cae718&_xt=.css"/><script src="https://1048144.app.netsuite.com/core/media/media.nl?id=2060797&c=1048144&h=ef2cda20731d146b5e98&_xt=.js"></script><link type="text/css" rel="stylesheet" href="https://1048144.app.netsuite.com/core/media/media.nl?id=2090583&c=1048144&h=a0ef6ac4e28f91203dfe&_xt=.css">';

        inlinehtml += '<div><b><u>Notes:</u></b><ul><li>The Daily Revenue is based on services completed via the app only.</li><li>For services completed by several operators, the service price and count are distributed over the operators.</li><li>For packages, the package rate is distributed over the operators that complete the different services.</li><li>For monthly packages, the monthly rate is  distributed over the working days of the month.</li><li><div class="input-group input-group-sm" style="display: inline-flex; padding:2px;"><span class="input-group-addon" style="width:40%; font-weight:bold">R ($)</span><input type="button" class="form-control" style="text-align:center; background-color: white;" value="Revenue" disabled /></div><div class="input-group input-group-sm" style="display: inline-flex; padding:2px;"><span class="input-group-addon" style="width:40%; font-weight:bold">D ($)</span><input type="button" class="form-control" style="text-align:center; background-color: white;" value="Distribution" disabled /></div></li></ul>';

        var inlineQty = '<div><style>table#daily_revenue {font-size:12px; font-weight:bold; text-align:center; border-color:#24385b; display:block; overflow-x:auto; white-space:nowrap;}</style><table border="0" cellpadding="10" id="daily_revenue" cellspacing="0" class="table table-responsive table-striped table-bordered"><thead style="color: white;background-color: #607799;"><tr><th class="cell" style="text-align:left;"><b>Date</b></th>';


        //Get the list of all operators of the zee
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
            inlineQty += '<th class="op" style="text-align:center;" data-op="' + operator_id + '"><b>' + operator_name + '</b></th>';
            return true;
        });
        inlineQty += '</tr></thead>';
        inlineQty += '<body>';

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
        newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorafter', start_date_dailyrevenue);
        newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorbefore', end_date_dailyrevenue);
        package_jobSearch.addFilters(newFilters);

        var package_jobSet = package_jobSearch.runSearch();

        var date = start_date_dailyrevenue;

        var workingdays = getWorkDays(start_date_array[1], start_date_array[2]);
        var workingdays_count = workingdays.length;

        var zee_comm = 1;

        //VARIABLES INITIALIZATION FOR THE PACKAGE SECTION
        var package_revenue = 0;
        var package_monthly_revenue = 0; //revenue per day of the monthly packages
        var package_service_count = 0;
        var old_package;
        var old_service;
        var old_fixed_rate_value;
        var old_discount_period;
        var old_date_scheduled;
        var monthly_count = 0;
        var perday_count = 0;
        var multiOp_count = 0;
        var services_number = 0;

        //PERDAY OR PERVISIT PACKAGES - Arrays that will contains the revenue and service count per day for each operator
        var package_date_sch_array = [];
        var package_revenue_array = [];
        var package_operator_array = [];
        var package_service_count_array = [];

        //MULTI OPERATORS SERVICES (NOT PACKAGES) - Arrays that will contains the revenue and service count per day for each operator
        var multiOp_date_sch_array = [];
        var multiOp_revenue_array = [];
        var multiOp_operator_array = [];
        var multiOp_service_count_array = [];

        //Arrays with the revenue and service count for each operator for the day and package given. Those arrays are reset everytime the search is looking into another package or another date
        var date_sch_revenue_array = new Array(operator_array.length);
        var date_sch_service_count_array = new Array(operator_array.length);

        //MONTHLY PACKAGES - Revenue and service count for each operator for one day - will appear everyday of the month
        var package_monthly_revenue_array = new Array(operator_array.length);
        var package_monthly_service_count_array = new Array(operator_array.length);

        for (i = 0; i < operator_array.length; i++) {
            package_monthly_revenue_array[i] = 0;
            package_monthly_service_count_array[i] = 0;
            date_sch_revenue_array[i] = 0;
            date_sch_service_count_array[i] = 0;
        }
        var package_operator_count = 1;

        var package_array = new Array(); //for each service of the package, gives the list of operators [service1, opA, opB, service 2, opA]
        var service_array = new Array(); //list of operators for the service [service1, opA, opB]

        package_jobSet.forEachResult(function(searchResult) {
            var package = searchResult.getValue('custrecord_job_service_package', null, 'group');
            var service = searchResult.getValue('custrecord_job_service', null, 'group');
            var date_sch = searchResult.getValue('custrecord_job_date_scheduled', null, 'group');
            var operator = searchResult.getValue("formulatext", null, "GROUP");
            var fixed_rate_value = parseFloat(searchResult.getValue("custrecord_service_package_fix_mth_rate", "CUSTRECORD_JOB_SERVICE_PACKAGE", "GROUP"));
            var service_price = parseFloat(searchResult.getValue("custrecord_job_service_price", null, "GROUP"));
            var discount_period = searchResult.getValue("custrecord_service_package_disc_period", "CUSTRECORD_JOB_SERVICE_PACKAGE", "GROUP");
            zee_comm = parseFloat(searchResult.getValue("formulapercent", null, "GROUP"));

            if (discount_period == 3) { //Monthly
                if (monthly_count == 0) { //create the first package array
                    nlapiLogExecution('DEBUG', 'service', service);
                    package_array[package_array.length] = [service, operator];
                    services_number += 1;
                } else if (old_package == package && old_service != service) { //same package but different service
                    package_array[package_array.length] = [service, operator];
                    services_number += 1;
                } else if (old_package == package && old_service == service && old_operator != operator) { //same package, same service but different op
                    service_array = package_array[package_array.length - 1];
                    service_array[service_array.length] = operator;
                } else if (old_package != package) { //calculate and store the revenue & service count per op for that package
                    nlapiLogExecution('DEBUG', 'monthly package', old_package);
                    nlapiLogExecution('DEBUG', 'monthly package_array', package_array);
                    var package_revenue_per_operator = getPackageRevenuePerOp(operator_array, package_array, old_fixed_rate_value, services_number)[0];
                    var package_service_count_per_operator = getPackageRevenuePerOp(operator_array, package_array, old_fixed_rate_value, services_number)[1];
                    nlapiLogExecution('DEBUG', 'monthly package_revenue_per_operator', package_revenue_per_operator);
                    nlapiLogExecution('DEBUG', 'monthly package_service_count_per_operator', package_service_count_per_operator);
                    for (i = 0; i < operator_array.length; i++) {
                        package_monthly_revenue_array[i] = package_monthly_revenue_array[i] + package_revenue_per_operator[i];
                        package_monthly_service_count_array[i] = package_monthly_service_count_array[i] + package_service_count_per_operator[i];
                    }

                    //reset the package array for the next package
                    package_array = [];
                    package_array[package_array.length] = [service, operator];
                    services_number = 1;
                }
                monthly_count++;
            } else if (discount_period == 1 || discount_period == 2) { //per day or per visit
                if (perday_count == 0) {
                    if (old_discount_period == 3) { //save the last monthly package
                        nlapiLogExecution('DEBUG', 'LAST MONTHLY package', old_package);
                        nlapiLogExecution('DEBUG', 'package_array', package_array);
                        var package_revenue_per_operator = getPackageRevenuePerOp(operator_array, package_array, old_fixed_rate_value, services_number)[0];
                        var package_service_count_per_operator = getPackageRevenuePerOp(operator_array, package_array, old_fixed_rate_value, services_number)[1];
                        nlapiLogExecution('DEBUG', 'package_revenue_per_operator', package_revenue_per_operator);
                        for (i = 0; i < operator_array.length; i++) {
                            package_monthly_revenue_array[i] += package_revenue_per_operator[i];
                            package_monthly_service_count_array[i] += package_service_count_per_operator[i];
                        }
                        package_array = [];
                        monthly_count++;
                    }
                    package_array[package_array.length] = [service, operator]; //create the first package array
                    services_number = 1;
                } else if (old_date_sch == date_sch) {
                    if (old_package == package && old_service != service) { //same package but different service
                        package_array[package_array.length] = [service, operator];
                        services_number += 1;
                    } else if (old_package == package && old_service == service && old_operator != operator) { //same package, same service but different op
                        service_array = package_array[package_array.length - 1];
                        service_array[service_array.length] = operator;
                    } else if (old_package != package) { //calculate and store the revenue & service count per op for that package
                        //Get the revenue/service count per operator for that package
                        nlapiLogExecution('DEBUG', 'package', old_package);
                        nlapiLogExecution('DEBUG', 'package_array', package_array);
                        nlapiLogExecution('DEBUG', 'services_number', services_number);
                        var package_revenue_per_operator = getPackageRevenuePerOp(operator_array, package_array, old_fixed_rate_value, services_number)[0];
                        var package_service_count_per_operator = getPackageRevenuePerOp(operator_array, package_array, old_fixed_rate_value, services_number)[1];
                        nlapiLogExecution('DEBUG', 'package_revenue_per_operator', package_revenue_per_operator);
                        nlapiLogExecution('DEBUG', 'package_service_count_per_operator', package_service_count_per_operator);
                        //Add this revenue/service count to the total of revenue/service count for that day
                        for (i = 0; i < operator_array.length; i++) {
                            date_sch_revenue_array[i] = date_sch_revenue_array[i] + package_revenue_per_operator[i];
                            date_sch_service_count_array[i] = date_sch_service_count_array[i] + package_service_count_per_operator[i];
                        }

                        //reset the package array for the next package
                        package_array = [];
                        package_array[package_array.length] = [service, operator];
                        services_number = 1;
                    }
                } else if (old_date_sch != date_sch) {
                    //Get the revenue/service count per operator for that package
                    nlapiLogExecution('DEBUG', 'package', old_package);
                    nlapiLogExecution('DEBUG', 'package_array', package_array);
                    nlapiLogExecution('DEBUG', 'services_number', services_number);
                    var package_revenue_per_operator = getPackageRevenuePerOp(operator_array, package_array, old_fixed_rate_value, services_number)[0];
                    var package_service_count_per_operator = getPackageRevenuePerOp(operator_array, package_array, old_fixed_rate_value, services_number)[1];
                    nlapiLogExecution('DEBUG', 'package_revenue_per_operator', package_revenue_per_operator);
                    nlapiLogExecution('DEBUG', 'package_service_count_per_operator', package_service_count_per_operator);
                    //Add this revenue/service count to the total of revenue/service count for that day
                    for (i = 0; i < operator_array.length; i++) {
                        date_sch_revenue_array[i] = date_sch_revenue_array[i] + package_revenue_per_operator[i];
                        date_sch_service_count_array[i] = date_sch_service_count_array[i] + package_service_count_per_operator[i];
                    }

                    package_array = [];
                    package_array[package_array.length] = [service, operator];
                    services_number = 1;

                    //When all the packages for the day have been counted, store the values for each operator in the packages array
                    for (i = 0; i < operator_array.length; i++) {
                        package_date_sch_array[package_date_sch_array.length] = old_date_sch;
                        package_operator_array[package_operator_array.length] = operator_array[i];
                        package_revenue_array[package_revenue_array.length] = date_sch_revenue_array[i];
                        package_service_count_array[package_service_count_array.length] = date_sch_service_count_array[i];

                        //Reset the revenue and service count per day
                        date_sch_revenue_array[i] = 0;
                        date_sch_service_count_array[i] = 0;
                    }
                }
                perday_count++;
            } else { //no package but multiple operators
                if (multiOp_count == 0) {
                    if (old_discount_period == 3) { //save the last monthly package
                        nlapiLogExecution('DEBUG', 'LAST MONTHLY package', package);
                        nlapiLogExecution('DEBUG', 'monthly package_array', package_array);
                        var package_revenue_per_operator = getPackageRevenuePerOp(operator_array, package_array, old_fixed_rate_value, services_number)[0];
                        var package_service_count_per_operator = getPackageRevenuePerOp(operator_array, package_array, old_fixed_rate_value, services_number)[1];
                        nlapiLogExecution('DEBUG', 'monthly package_revenue_per_operator', package_revenue_per_operator);
                        nlapiLogExecution('DEBUG', 'monthly package_service_count_per_operator', package_service_count_per_operator);
                        for (i = 0; i < operator_array.length; i++) {
                            package_monthly_revenue_array[i] += package_revenue_per_operator[i];
                            package_monthly_service_count_array[i] += package_service_count_per_operator[i];
                        }
                        package_array = [];
                        monthly_count++;
                    } else if (old_discount_period == 1 || old_discount_period == 2) { //save the last perday package
                        nlapiLogExecution('DEBUG', 'LAST package', old_package);
                        nlapiLogExecution('DEBUG', 'package_array', package_array);
                        nlapiLogExecution('DEBUG', 'services_number', services_number);
                        var package_revenue_per_operator = getPackageRevenuePerOp(operator_array, package_array, old_fixed_rate_value, services_number)[0];
                        var package_service_count_per_operator = getPackageRevenuePerOp(operator_array, package_array, old_fixed_rate_value, services_number)[1];
                        nlapiLogExecution('DEBUG', 'package_revenue_per_operator', package_revenue_per_operator);
                        nlapiLogExecution('DEBUG', 'package_service_count_per_operator', package_service_count_per_operator);
                        for (i = 0; i < operator_array.length; i++) {
                            date_sch_revenue_array[i] = date_sch_revenue_array[i] + package_revenue_per_operator[i];
                            date_sch_service_count_array[i] = date_sch_service_count_array[i] + package_service_count_per_operator[i];
                        }
                        for (i = 0; i < operator_array.length; i++) {
                            package_date_sch_array[package_date_sch_array.length] = old_date_sch;
                            package_operator_array[package_operator_array.length] = operator_array[i];
                            package_revenue_array[package_revenue_array.length] = date_sch_revenue_array[i];
                            package_service_count_array[package_service_count_array.length] = date_sch_service_count_array[i];
                        }
                    }
                    nlapiLogExecution('DEBUG', 'FIRST service', service);
                    service_array = [service, operator]; //create the first service array
                } else if (old_date_sch == date_sch) {
                    if (old_service == service && old_operator != operator) { //same service but different op
                        service_array[service_array.length] = operator;
                    } else if (old_service != service) { //calculate and store the revenue & service count for that service
                        //Get the revenue/service count per operator for that service
                        nlapiLogExecution('DEBUG', 'service_array', service_array);
                        var service_revenue_per_operator = getServiceRevenuePerOp(operator_array, service_array, old_service_price)[0];
                        var service_count_per_operator = getServiceRevenuePerOp(operator_array, service_array, old_service_price)[1];
                        nlapiLogExecution('DEBUG', 'service_revenue_per_operator', service_revenue_per_operator);
                        nlapiLogExecution('DEBUG', 'service_count_per_operator', service_count_per_operator);
                        //Add this revenue/service count to the total of revenue/service count for that day
                        for (i = 0; i < operator_array.length; i++) {
                            date_sch_revenue_array[i] = date_sch_revenue_array[i] + service_revenue_per_operator[i];
                            date_sch_service_count_array[i] = date_sch_service_count_array[i] + service_count_per_operator[i];
                        }

                        //reset the service array for next service
                        service_array = [service, operator];
                    }
                } else if (old_date_sch != date_sch) {
                    //Get the revenue/service count per operator for that service
                    nlapiLogExecution('DEBUG', 'service_array', service_array);
                    var service_revenue_per_operator = getServiceRevenuePerOp(operator_array, service_array, old_service_price)[0];
                    var service_count_per_operator = getServiceRevenuePerOp(operator_array, service_array, old_service_price)[1];
                    nlapiLogExecution('DEBUG', 'service_revenue_per_operator', service_revenue_per_operator);
                    nlapiLogExecution('DEBUG', 'service_count_per_operator', service_count_per_operator);
                    //Add this revenue/service count to the total of revenue/service count for that day
                    for (i = 0; i < operator_array.length; i++) {
                        date_sch_revenue_array[i] = date_sch_revenue_array[i] + service_revenue_per_operator[i];
                        date_sch_service_count_array[i] = date_sch_service_count_array[i] + service_count_per_operator[i];
                    }
                    //When all the multiOp services for the day have been counted, store the values for each operator in the multiOp arrays
                    for (i = 0; i < operator_array.length; i++) {
                        multiOp_date_sch_array[multiOp_date_sch_array.length] = old_date_sch;
                        multiOp_operator_array[multiOp_operator_array.length] = operator_array[i];
                        multiOp_revenue_array[multiOp_revenue_array.length] = date_sch_revenue_array[i];
                        multiOp_service_count_array[multiOp_service_count_array.length] = date_sch_service_count_array[i];

                        date_sch_revenue_array[i] = 0;
                        date_sch_service_count_array[i] = 0;
                    }

                    service_array = [service, operator];
                }
                multiOp_count++;
            }

            old_package = package;
            old_service = service;
            old_fixed_rate_value = fixed_rate_value;
            old_service_price = service_price;
            old_discount_period = discount_period;
            old_date_sch = date_sch;
            old_operator = operator;
            return true;
        })


        if (monthly_count > 0 || perday_count > 0 || multiOp_count > 0) {
            if (old_discount_period == 3) { //Monthly
                nlapiLogExecution('DEBUG', 'LAST monthly package', old_package);
                nlapiLogExecution('DEBUG', 'monthly package_array', package_array);
                nlapiLogExecution('DEBUG', 'services_number', services_number);
                var package_revenue_per_operator = getPackageRevenuePerOp(operator_array, package_array, old_fixed_rate_value, services_number)[0];
                var package_service_count_per_operator = getPackageRevenuePerOp(operator_array, package_array, old_fixed_rate_value, services_number)[1];
                nlapiLogExecution('DEBUG', 'package_revenue_per_operator', package_revenue_per_operator);
                nlapiLogExecution('DEBUG', 'package_service_count_per_operator', package_service_count_per_operator);
                for (i = 0; i < operator_array.length; i++) {
                    package_monthly_revenue_array[i] = package_monthly_revenue_array[i] + package_revenue_per_operator[i];
                    package_monthly_service_count_array[i] = package_monthly_service_count_array[i] + package_service_count_per_operator[i];
                }
            } else if (old_discount_period == 1 || old_discount_period == 2) { //per day or per visit
                nlapiLogExecution('DEBUG', 'LAST package', old_package);
                nlapiLogExecution('DEBUG', 'package_array', package_array);
                nlapiLogExecution('DEBUG', 'services_number', services_number);
                var package_revenue_per_operator = getPackageRevenuePerOp(operator_array, package_array, old_fixed_rate_value, services_number)[0];
                var package_service_count_per_operator = getPackageRevenuePerOp(operator_array, package_array, old_fixed_rate_value, services_number)[1];
                nlapiLogExecution('DEBUG', 'package_revenue_per_operator', package_revenue_per_operator);
                nlapiLogExecution('DEBUG', 'package_service_count_per_operator', package_service_count_per_operator);
                for (i = 0; i < operator_array.length; i++) {
                    date_sch_revenue_array[i] = date_sch_revenue_array[i] + package_revenue_per_operator[i];
                    date_sch_service_count_array[i] = date_sch_service_count_array[i] + package_service_count_per_operator[i];
                }
                for (i = 0; i < operator_array.length; i++) {
                    package_date_sch_array[package_date_sch_array.length] = old_date_sch;
                    package_operator_array[package_operator_array.length] = operator_array[i];
                    package_revenue_array[package_revenue_array.length] = date_sch_revenue_array[i];
                    package_service_count_array[package_service_count_array.length] = date_sch_service_count_array[i];
                }
            } else { //no package but multiple operators
                nlapiLogExecution('DEBUG', 'LAST service', old_service);
                nlapiLogExecution('DEBUG', 'service_array', service_array);
                var service_revenue_per_operator = getServiceRevenuePerOp(operator_array, service_array, old_service_price)[0];
                var service_count_per_operator = getServiceRevenuePerOp(operator_array, service_array, old_service_price)[1];
                nlapiLogExecution('DEBUG', 'service_revenue_per_operator', service_revenue_per_operator);
                nlapiLogExecution('DEBUG', 'service_count_per_operator', service_count_per_operator);
                for (i = 0; i < operator_array.length; i++) {
                    date_sch_revenue_array[i] = date_sch_revenue_array[i] + service_revenue_per_operator[i];
                    date_sch_service_count_array[i] = date_sch_service_count_array[i] + service_count_per_operator[i];
                }
                for (i = 0; i < operator_array.length; i++) {
                    multiOp_date_sch_array[multiOp_date_sch_array.length] = old_date_sch;
                    multiOp_operator_array[multiOp_operator_array.length] = operator_array[i];
                    multiOp_revenue_array[multiOp_revenue_array.length] = date_sch_revenue_array[i];
                    multiOp_service_count_array[multiOp_service_count_array.length] = date_sch_service_count_array[i];
                }
            }
        }
        nlapiLogExecution('DEBUG', 'monthly_count', monthly_count);
        nlapiLogExecution('DEBUG', 'perday_count', perday_count);
        nlapiLogExecution('DEBUG', 'multiOp_count', multiOp_count);

        nlapiLogExecution('DEBUG', 'package_time', Date.now() - start_time)
        start_time = Date.now();

        //SERVICES & EXTRAS SECTION
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

        nlapiLogExecution('DEBUG', 'package_date_sch_array', package_date_sch_array);
        nlapiLogExecution('DEBUG', 'package_service_count_array', package_service_count_array);
        nlapiLogExecution('DEBUG', 'package_revenue_array', package_revenue_array);
        nlapiLogExecution('DEBUG', 'package_operator_array', package_operator_array);

        nlapiLogExecution('DEBUG', 'package_monthly_service_count_array', package_monthly_service_count_array);
        nlapiLogExecution('DEBUG', 'package_monthly_revenue_array', package_monthly_revenue_array);

        nlapiLogExecution('DEBUG', 'multiOp_date_sch_array', multiOp_date_sch_array);
        nlapiLogExecution('DEBUG', 'multiOp_service_count_array', multiOp_service_count_array);
        nlapiLogExecution('DEBUG', 'multiOp_revenue_array', multiOp_revenue_array);
        nlapiLogExecution('DEBUG', 'multiOp_operator_array', multiOp_operator_array);

        //BUILD THE TAB TO DISPLAY THE RESULTS
        for (i = 0; i < workingdays_count; i++) {
            date = workingdays[i];
            var date_array = date.split('/');
            var date_day = date_array[0];
            if (same_month == true && date_day > today_day) {
                break;
            }

            inlineQty += '<tr><td class="date" style="font-size:small; vertical-align:middle;">' + date + '</td>';
            var total_service_count = 0;
            var total_revenue = 0.00;

            var total_service_count_service = 0;
            var total_service_count_extra = 0;
            var total_service_count_package = 0;
            var total_service_count_monthly_package = 0;
            var total_service_count_multiOp = 0;

            var total_revenue_service = 0;
            var total_revenue_extra = 0;
            var total_revenue_package = 0;
            var total_revenue_monthly_package = 0;
            var total_revenue_multiOp = 0;


            var service_count_html = '';
            var html = '';
            var revenue_html = '';
            for (y = 0; y < operator_array.length; y++) {
                operator = operator_array[y];
                total_service_count = 0;
                total_service_count_extra = 0;
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
                        total_service_count_package = parseFloat(package_service_count_array[k]);
                        total_service_count = total_service_count + total_service_count_package;

                        total_revenue_package = parseFloat(package_revenue_array[k]);
                        total_revenue = total_revenue + total_revenue_package;
                    }
                }

                //MULTIPLE OPERATORS 
                for (k = 0; k < multiOp_date_sch_array.length; k++) {
                    if (date == multiOp_date_sch_array[k] && operator == multiOp_operator_array[k]) {
                        total_service_count_multiOp = parseFloat(multiOp_service_count_array[k]);
                        total_service_count = total_service_count + total_service_count_multiOp;

                        total_revenue_multiOp = parseFloat(multiOp_revenue_array[k]);
                        total_revenue = total_revenue + total_revenue_multiOp;
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

                total_service_count_monthly_package = parseFloat(package_monthly_service_count_array[y]);
                total_service_count = total_service_count + total_service_count_monthly_package;

                total_revenue_monthly_package = parseFloat(package_monthly_revenue_array[y]) / workingdays_count;
                total_revenue = total_revenue + total_revenue_monthly_package;

                var comm = total_revenue * zee_comm / 100;
                inlineQty += '<td class="cell"><div class="col-sm-3"><label for="service_count_' + operator_id_array[y] + '" style="display:block; color:#555;">SERVICES</label><button type="button" class="btn btn-lg btn-primary service_count_' + operator_id_array[y] + '" id="service_count_' + operator_id_array[y] + '" style="text-align:center;" data-op="' + operator_array[y] + '" data-service="' + total_service_count_service + '" data-package="' + total_service_count_package + '" data-monthly-package="' + total_service_count_monthly_package + '" data-multiOp ="' + total_service_count_multiOp + '" value="' + total_service_count + '" disabled>' + total_service_count + '</button></div>';
                inlineQty += '<div class="col-sm-3"><label for="service_count_' + operator_id_array[y] + '" style="display:block; color:#555;">EXTRAS</label><button type="button" class="btn btn-lg btn-info extra_count_' + operator_id_array[y] + '" id="extra_count_' + operator_id_array[y] + '" style="text-align:center;" data-op="' + operator_array[y] + '" data-extra="' + total_service_count_extra + '" value="' + total_service_count_extra + '" disabled>' + total_service_count_extra + '</button></div>';
                inlineQty += '<div class="col-sm-6"><div class="input-group" style="width:100%;"><span class="input-group-addon" style="width:40%; font-weight:bold">R ($)</span><input type="button" class="form-control revenue_' + operator_id_array[y] + '" style="text-align:center; background-color: white;" data-op="' + operator_array[y] + '" data-service="' + total_revenue_service.toFixed(2) + '" data-package="' + total_revenue_package + '" data-monthly-package="' + total_revenue_monthly_package.toFixed(2) + '" data-multiOp ="' + total_revenue_multiOp + '" data-extra="' + total_revenue_extra + '" value="' + parseFloat(total_revenue).toFixed(2) + '" disabled /></div>'
                inlineQty += '</br><div class="input-group" style="width:100%;"><span class="input-group-addon" style="width:40%; font-weight:bold">D ($)</span><input type="button" class="form-control distribution_' + operator_id_array[y] + '" style="text-align:center; background-color:white;" data-op="' + operator_array[y] + '" value="' + parseFloat(comm).toFixed(2) + '" disabled /></div></div></td>';

            }
            inlineQty += '</tr>';
        }

        inlineQty += '</tbody>';

        //TOTAL SECTION
        inlineQty += '<tfoot style="color: white;background-color: #607799;">';
        inlineQty += '<tr><td style="text-align:center; font-size:medium; vertical-align:middle;">TOTAL</td>';

        for (y = 0; y < operator_array.length; y++) {
            inlineQty += '<td class="cell"><div class="col-sm-3"><label for="total_service_count_' + operator_id_array[y] + '" style="display:block;">SERVICES</label><button type="button" class="btn btn-lg total_service_count_' + operator_id_array[y] + '" id="total_service_count_' + operator_id_array[y] + '" style="text-align:center; background-color: white;color: #607799" data-op="' + operator_array[y] + '" disabled></button></div>';
            inlineQty += '<div class="col-sm-3"><label for="total_extra_count_' + operator_id_array[y] + '" style="display:block;">EXTRAS</label><button type="button" class="btn btn-lg total_extra_count_' + operator_id_array[y] + '" id="total_extra_count_' + operator_id_array[y] + '" style="text-align:center; background-color: white;color: #607799" data-op="' + operator_array[y] + '" disabled></button></div>';
            inlineQty += '<div class="col-sm-6"><div class="input-group" style="width:100%;"><span class="input-group-addon" style="width:40%; font-weight:bold">R ($)</span><input type="button" class="form-control total_revenue_' + operator_id_array[y] + '" style="text-align:center; background-color: white;" data-op="' + operator_array[y] + '" disabled /></div>'
            inlineQty += '</br><div class="input-group" style="width:100%;"><span class="input-group-addon" style="width:40%; font-weight:bold">D ($)</span><input type="button" class="form-control total_distribution_' + operator_id_array[y] + '" style="text-align:center; background-color:white;" data-op="' + operator_array[y] + '" disabled /></div></div></td>';
        }


        inlineQty += '</tr>';
        inlineQty += '</tfoot></table></div>';

        form.addButton('Back', 'BACK', 'onclick_back()');
        form.setScript('customscript_cl_daily_revenue');

        form.addField('start_date', 'text', 'start_date').setDisplayType('hidden').setDefaultValue(request.getParameter('start_date'));
        form.addField('end_date', 'text', 'end_date').setDisplayType('hidden').setDefaultValue(request.getParameter('end_date'));
        form.addField('zee', 'text', 'zee').setDisplayType('hidden').setDefaultValue(zee);
        var operator_id_string = operator_id_array.join();
        form.addField('operator_string', 'text', 'operator_string').setDisplayType('hidden').setDefaultValue(operator_id_string);

        form.addField('custpage_html2', 'inlinehtml').setPadding(1).setLayoutType('outsideabove').setDefaultValue(inlinehtml);
        form.addField('preview_table', 'inlinehtml', '').setLayoutType('outsidebelow', 'startrow').setDefaultValue(inlineQty);

        response.writePage(form);

    } else {

    }
}


/**
 * Check the number of days in a month
 * @params {Int} iMonth
 * @params {Int} iYear
 * @return {Int} - number of days (30, 31, 28 or 29)
 */
function getDaysInMonth(iMonth, iYear) {
    return 32 - new Date(iYear, iMonth - 1, 32).getDate();
}


/**
 * Check if a day is a work day
 * @params {Int} year
 * @params {Int} month
 * @params {Int} day
 * @return {Boolean}
 */
function isWorkDay(year, month, day) {
    var dayOfWeek = new Date(year, month - 1, day).getDay();
    return dayOfWeek >= 1 && dayOfWeek <= 5; // Sun = 0, Mon = 1, and so forth
}


/**
 * Gets the list of working days in a month, ignores public holidays
 * @params {Int} month - number of the month
 * @params {Int} year
 * @return {Array} - list of the working days
 */
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

/**
 * Gives the name of the month
 * @params {Int} month - number of the month minus one (from 0 to 11)
 * @return {String} - name of the month
 */
function getMonthName(month) {
    var monthList = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
    return monthList[month - 1];
}

/**
 * Get today's date
 * @return {String} - today's date
 */
function getDate() {
    var date = new Date();
    date = nlapiDateToString(date);
    return date;
}

/**
 * Gives the revenue per operator for this package
 * @params {Array} operator_array - list of all the operators
 * @params {Array} package_array - list of operators doing each service of the package. example : [service1, opA, opB, service 2, opA]
 * @params {Float} old_fixed_rate_value - price of the package
 * @params {Int} services_number - number of services performed in the package
 * @return {Array} - List of 2 lists : the revenue per Op and the service count per Op for this package
 */
function getPackageRevenuePerOp(operator_array, package_array, old_fixed_rate_value, services_number) {
    var service_rate = old_fixed_rate_value / services_number;
    var operator_revenue_array = new Array();
    var operator_service_count_array = new Array();
    for (k = 0; k < operator_array.length; k++) {
        operator_revenue_array[k] = 0;
        operator_service_count_array[k] = 0;
    }
    for (i = 0; i < package_array.length; i++) {
        //nlapiLogExecution('DEBUG', 'package_array[i]', package_array[i])
        var op_number = package_array[i].length - 1;
        for (j = 1; j < package_array[i].length; j++) {
            var op = package_array[i][j];
            //nlapiLogExecution('DEBUG', 'op', op)
            operator_revenue_array[operator_array.indexOf(op)] += service_rate / op_number;
            operator_service_count_array[operator_array.indexOf(op)] += 1 / op_number;
        }
    }
    return [operator_revenue_array, operator_service_count_array]
}


/**
 * Gives the revenue per operator for this service (in the case of multiple operators performing the service)
 * @params {Array} operator_array - list of all the operators
 * @params {Array} service_array - list of operators doing the service. example : [service1, opA, opB]
 * @params {Float} old_service_price - price of the service
 * @return {Array} - List of 2 lists : the revenue per Op and the service count per Op for this service
 */
function getServiceRevenuePerOp(operator_array, service_array, old_service_price) {
    var operator_revenue_array = new Array();
    var operator_service_count_array = new Array();
    for (k = 0; k < operator_array.length; k++) {
        operator_revenue_array[k] = 0;
        operator_service_count_array[k] = 0;
    }
    var op_number = service_array.length - 1;
    for (i = 1; i < service_array.length; i++) {
        var op = service_array[i];
        nlapiLogExecution('DEBUG', 'op', op)
        operator_revenue_array[operator_array.indexOf(op)] += old_service_price / op_number;
        operator_service_count_array[operator_array.indexOf(op)] += 1 / op_number;
    }
    return [operator_revenue_array, operator_service_count_array]
}