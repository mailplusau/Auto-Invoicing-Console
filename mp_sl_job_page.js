/*
 * Module Description
 * 
 * Author: Ankith Ravindran
 *
 * NSVersion  Date                      Last Modified time                      
 * 1.00       2017-08-10 14:11:22       2017-08-10 14:11:22           
 *
 * Remarks: To make set the invoiceable field to either 'Yes' / 'No' when Completed / Partial / Incomplete Buttons clicked from the review page
 *
 */

/**
 * [commonRows description] - Returns the string of commons columns that needs to be created
 * @param  {array} params Job Source
 * @param  {array} params Date Scheduled
 * @param  {array} params Time Scheduled
 * @param  {array} params Date Finalised
 * @param  {array} params Time Finalised
 * @param  {array} params Service Leg
 * @param  {array} params Operator Assigned
 * @param  {array} params Status
 * @return {array}                     
 */
function commonRows(params, category) {

    var common = '';
    for (var i = 0; i < params.length; i++) {
        common += '<td>' + params[i] + '</td>';
    }
    return common;
}

/**
 * Gets the the class name for the row
 * @param  {string} className Class name for the row color
 * @return {string}           Returns the class name of the row color
 */
function rowColor(className) {
    if (className == 'info') {
        className = '';
    } else {
        className = 'info';
    }
    return className;
}

/**
 * [job_page description] - To make set the invoiceable field to either 'Yes' / 'No' when Completed / Partial / Incomplete Buttons clicked from the review page
 * @param  {String} request  when the page is loaded
 * @param  {String} response when the page is submitted
 */
function job_page(request, response) {
    var ctx = nlapiGetContext();
    var zee = ctx.getUser();

    var baseURL = 'https://1048144.app.netsuite.com';
    if (nlapiGetContext().getEnvironment() == "SANDBOX") {
        baseURL = 'https://1048144-sb3.app.netsuite.com';
    }

    var staus = null;

    if (request.getMethod() == "GET") {
        var customer = request.getParameter('customer_id');
        var service = request.getParameter('service_id');
        var price = request.getParameter('rate');
        var category = request.getParameter('category');
        var packageID = request.getParameter('package');
        var assignPackage = request.getParameter('assign_packge');
        staus = request.getParameter('status');
        var locked = request.getParameter('locked');
        var scID = request.getParameter('sc');
        zee = request.getParameter('zee');

        nlapiLogExecution('DEBUG', 'price', price);

        var discount_period = null;
        if (!isNullorEmpty(packageID) && packageID != 'null') {
            var package_record = nlapiLoadRecord('customrecord_service_package', packageID);
            var package_name = package_record.getFieldValue('name');
            discount_period = package_record.getFieldValue('custrecord_service_package_disc_period');
            if (discount_period == 3) {
                locked = 'yes';
            }
        }


        // var franchisee = 

        var customerName = nlapiLookupField('customer', customer, 'companyname');
        var customerID = nlapiLookupField('customer', customer, 'entityid');

        var statusText = '';

        if (staus == '1') {
            statusText = 'Completed'
        } else if (staus == '2') {
            statusText = 'Partial'
        } else if (staus == '3') {
            statusText = 'Incomplete'
        } else {
            statusText = 'Scheduled';
        }
        // nlapiLogExecution('DEBUG', 'assignPackage', assignPackage)
        if (!isNullorEmpty(assignPackage) && assignPackage != 'undefined') {
            var form = nlapiCreateForm('Activity Page: ' + customerID + ' ' + customerName);
            var filPoPackage = [];
            filPoPackage[filPoPackage.length] = new nlobjSearchFilter('internalid', null, 'is', service);

            var colPoPackage = [];
            colPoPackage[colPoPackage.length] = new nlobjSearchColumn('internalid');
            colPoPackage[colPoPackage.length] = new nlobjSearchColumn('name');
            colPoPackage[colPoPackage.length] = new nlobjSearchColumn('custrecord_service_package');

            var poSearchPackage = nlapiSearchRecord('customrecord_service', null, filPoPackage, colPoPackage);
        } else if (!isNullorEmpty(staus)) {
            var form = nlapiCreateForm('Activity Page: ' + customerID + ' ' + customerName);
        } else {
            var form = nlapiCreateForm('Activity Page: ' + customerID + ' ' + customerName);
        }

        form.addField('start_date', 'text', 'start_date').setDisplayType('hidden').setDefaultValue(request.getParameter('start_date'));
        form.addField('end_date', 'text', 'end_date').setDisplayType('hidden').setDefaultValue(request.getParameter('end_date'));
        form.addField('locked', 'text', 'locked').setDisplayType('hidden').setDefaultValue(locked);
        form.addField('scid', 'text', 'locked').setDisplayType('hidden').setDefaultValue(scID);

        // nlapiLogExecution('DEBUG', 'Dicount Period', discount_period);

        //NOT ABLE TO CREATE CODE FILTERS FOR INCOMPLETE / SCHEDULE / NULL HENCE CREATED TWO SEARCHES 
        /**
         * [if description] -  if category is extras, search: Job - Invoicing Review - Invoicing Jobs
         * @param  {string} nlapiGetFieldValue('category') [description]
         */
        // if (category == 'Extras') {
        //     var searchedJobsExtras = nlapiLoadSearch('customrecord_job', 'customsearch_job_invoicing_jobs');
        // } else {
        /**
         * [if description] - If incoming status is 3, search: Job - Invoicing Review - Invoicing Jobs (Incomplete)
         * @param  {string} nlapiGetFieldValue('incoming_status') [description]
         */
        // if (staus == '3' || staus == '4') {
        //     var searchedJobsExtras = nlapiLoadSearch('customrecord_job', 'customsearch_job_invoicing_jobs_inc');
        // } else {
        var searchedJobsExtras = nlapiLoadSearch('customrecord_job', 'customsearch_job_invoicing_jobs');
        // }
        // }

        var filPo = [];
        filPo[filPo.length] = new nlobjSearchFilter('custrecord_job_customer', null, 'is', customer);
        filPo[filPo.length] = new nlobjSearchFilter('custrecord_job_source', null, 'anyof', [4, 5, 6]);

        if (packageID == 'null') {
            filPo[filPo.length] = new nlobjSearchFilter('custrecord_job_service', null, 'is', service);
            filPo[filPo.length] = new nlobjSearchFilter('custrecord_job_service_price', null, 'equalto', parseFloat(price));
            filPo[filPo.length] = new nlobjSearchFilter('custrecord_job_service_package', null, 'anyof', '@NONE@');
            if (category == 'Services') {
                filPo[filPo.length] = new nlobjSearchFilter('custrecord_job_group_status', null, 'is', statusText);
            }
        } else {
            filPo[filPo.length] = new nlobjSearchFilter('custrecord_job_service_package', null, 'anyof', packageID);

            if (discount_period == 3) {
                filPo[filPo.length] = new nlobjSearchFilter('custrecord_job_service', null, 'is', service);
                filPo[filPo.length] = new nlobjSearchFilter('custrecord_job_service_price', null, 'equalto', parseFloat(price));
                // filPo[filPo.length] = new nlobjSearchFilter('custrecord_job_service_package', null, 'anyof', '@NONE@');
                if (category == 'Services') {
                    filPo[filPo.length] = new nlobjSearchFilter('custrecord_job_group_status', null, 'is', statusText);
                }
            } else {
                filPo[filPo.length] = new nlobjSearchFilter('custrecord_package_status', null, 'is', staus);
            }
        }
        if (!isNullorEmpty(request.getParameter('start_date')) && !isNullorEmpty(request.getParameter('end_date'))) {
            filPo[filPo.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorafter', nlapiStringToDate(request.getParameter('start_date')));
            filPo[filPo.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorbefore', nlapiStringToDate(request.getParameter('end_date')));
        }

        if (!isNullorEmpty(scID)) {
            filPo[filPo.length] = new nlobjSearchFilter('custrecord_job_special_customer', null, 'is', scID);
        } else {
            filPo[filPo.length] = new nlobjSearchFilter('custrecord_job_special_customer', null, 'is', '@NONE@');
        }


        searchedJobsExtras.addFilters(filPo);

        var resultSetExtras = searchedJobsExtras.runSearch();

        // if (ctx.getRole() == 1000) { //Franchisee
        //     zee = ctx.getUser();
        // } else {
        //     zee = '6'; //Test
        // }

        form.addField('service', 'text', 'Service').setDisplayType('hidden').setDefaultValue(service);
        form.addField('price', 'text', 'Service').setDisplayType('hidden').setDefaultValue(price);
        form.addField('customer', 'text', 'Service').setDisplayType('hidden').setDefaultValue(customer);
        form.addField('zee_id', 'text', 'Service').setDisplayType('hidden').setDefaultValue(zee);
        form.addField('group_status', 'text', 'Service').setDisplayType('hidden').setDefaultValue(statusText);
        form.addField('incoming_status', 'text', 'Service').setDisplayType('hidden').setDefaultValue(staus);
        form.addField('category', 'text', 'Service').setDisplayType('hidden').setDefaultValue(category);
        form.addField('package', 'text', 'Service').setDisplayType('hidden').setDefaultValue(assignPackage);
        form.addField('package_id', 'text', 'Service').setDisplayType('hidden').setDefaultValue(packageID);
        form.addField('job_array', 'text', 'Service').setDisplayType('hidden');
        form.addField('package_array', 'text', 'Service').setDisplayType('hidden');
        form.addField('invoiceable_array', 'text', 'Service').setDisplayType('hidden');

        var inlineQty = '<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js"><script src="//code.jquery.com/jquery-1.11.0.min.js"></script><link type="text/css" rel="stylesheet" href="https://cdn.datatables.net/1.10.13/css/jquery.dataTables.min.css"><link href="//netdna.bootstrapcdn.com/bootstrap/3.3.2/css/bootstrap.min.css" rel="stylesheet"><script src="//netdna.bootstrapcdn.com/bootstrap/3.3.2/js/bootstrap.min.js"></script></script><br><br><style>table#stockcount {font-size:12px; text-align:center; border-color: #24385b} </style>';

        if (discount_period == 3) {
            inlineQty += '<div id="demo" style="background-color: #cfeefc !important;border: 1px solid #417ed9;padding: 10px 10px 10px 20px;width:98%;margin-bottom: 10px;"><b><u>Important Instructions:</u></b><ul><li>Jobs belongs to Monthly Fixed Rate Service Package: <b>' + package_name + '</b>.</li><li>Invoiceable status on Jobs are not modifiable as the the Service Package is configured as a monthly Fixed Rate package.</li><li>You may modify the invoice amount for this package on the Review Page (click Back).</li></ul></div>';
        }

        if (packageID == 'null' || (!isNullorEmpty(discount_period) && discount_period == 3)) {
            var serviceRecord = nlapiLoadRecord('customrecord_service', service);
            var service_zee = serviceRecord.getFieldText('custrecord_service_franchisee');
            if (isNullorEmpty(service_zee)) {
                service_zee = 'All';
            }
            inlineQty += '<div class="row"><div class="col-xs-3"><label class="control-label">Service</label><input type="text" readonly class="form-control" value="' + nlapiLookupField('customrecord_service', service, 'name') + '" style="font-weight: bold;" /></div><div class="col-xs-3"><label class="control-label">Service Price</label><input type="text" readonly class="form-control" value="' + price + '" style="font-weight: bold;"/></div><div class="col-xs-3"><label class="control-label">Franchisee</label><input type="text" readonly class="form-control" value="' + service_zee + '" style="font-weight: bold;" /></div></div><br><br>';
        } else {
            inlineQty += '<div class="row"><div class="col-xs-3"><label class="control-label">Package Name</label><input type="text" readonly class="form-control" value="' + nlapiLookupField('customrecord_service_package', packageID, 'name') + '" style="font-weight: bold;" /></div></div><br><br>'
        }

        inlineQty += '<table border="0" cellpadding="10" id="stockcount" cellspacing="0" class="table"><thead style="color: white;background-color: #607799;"><tr>';
        if (isNullorEmpty(assignPackage) || assignPackage == 'undefined') {
            if (packageID != 'null' && (!isNullorEmpty(discount_period) && discount_period != 3)) {
                inlineQty += '<td class="col-xs-2" style="color: rgb(255, 204, 0)"><b>DO YOU WANT TO INVOICE PACKAGE GROUP?</b></td><td><b>SERVICE NAME</b></td><td><b>PRICE</b></td>';
            } else {
                inlineQty += '<td class="col-xs-2" style="color: rgb(255, 204, 0)"><b>Do you want to Invoice Service</b></td>';
            }

        } else {
            inlineQty += '<td style="color: rgb(255, 204, 0)"><b>PACKAGES</b></td><td><b>SERVICE NAME</b></td><td><b>PRICE</b></td>';
        }

        inlineQty += '<td><b>SOURCE</b></td>';

        if (category == 'Extras') {
            inlineQty += '<td><b>EXTRAS QTY</b></td>';
            inlineQty += '<td><b>DATE FINALIZED</b></td><td><b>TIME FINALIZED</b></td><td><b>JOB GROUP SERVICE</b></td>';
            inlineQty += '<td><b>FRANCHISEE</b></td><td><b>OPERATOR ASSIGNED</b></td><td><b>STATUS</b></td><td><b>JOB INTERNAL ID</b></td></tr></thead><tbody>';

        } else {
            inlineQty += '<td><b>DATE SCHEDULED</b></td><td><b>TIME SCHEDULED</b></td>';
            inlineQty += '<td><b>DATE FINALIZED</b></td><td><b>TIME FINALIZED</b></td>';
            inlineQty += '<td><b>JOB LEG</b></td>';
            inlineQty += '<td><b>FRANCHISEE</b></td><td><b>OPERATOR ASSIGNED</b></td><td><b>STATUS</b></td><td><b>JOB INTERNAL ID</b></td>';
        }

        if (packageID != 'null' && (!isNullorEmpty(discount_period) && discount_period != 3)) {
            inlineQty += '<td>PACKAGE STATUS</td><td>JOB GROUP LINKED</td><td>INVOICEABLE</td>';
        }

        inlineQty += '</tr></thead><tbody>'


        var i = 0;

        var oldJobGroup = null;
        var old_package_job_groups = null;

        var className = '';

        resultSetExtras.forEachResult(function(searchResultExtras) {

            // nlapiLogExecution('DEBUG', 'inside loop');

            var jobGroup = searchResultExtras.getValue('custrecord_job_group');
            var jobSource = searchResultExtras.getText('custrecord_job_source');
            var jobDateSchedule = searchResultExtras.getValue('custrecord_job_date_scheduled');
            var jobTimeSchedule = searchResultExtras.getValue('custrecord_job_time_scheduled_before');
            var jobDateFinalised = searchResultExtras.getValue('custrecord_job_date_finalised');
            var jobTimeFinalised = searchResultExtras.getValue('custrecord_job_time_finalised');
            var jobServiceLeg = searchResultExtras.getValue('custrecord_job_service_leg');
            var jobOperatorAssigned = searchResultExtras.getText('custrecord_job_operator_assigned');
            var jobStatus = searchResultExtras.getText('custrecord_job_status');
            var jobInvoiceable = searchResultExtras.getValue('custrecord_job_invoiceable');
            var jobInvoiceableText = searchResultExtras.getText('custrecord_job_invoiceable');
            var jobPackageID = searchResultExtras.getValue('custrecord_job_service_package');
            var jobID = searchResultExtras.getValue('internalid');
            var extrasQty = searchResultExtras.getValue('custrecord_job_extras_qty');
            var package_job_groups = searchResultExtras.getValue('custrecord_package_job_groups');
            var serviceID = searchResultExtras.getText('custrecord_job_service');
            var packageStatus = searchResultExtras.getText('custrecord_package_status');
            // var packageJobGroups = searchResultExtras.getValue("custrecord_service_description","CUSTRECORD_JOB_SERVICE",null);
            var servicePrice = searchResultExtras.getValue('custrecord_job_service_price');
            var jobZee = searchResultExtras.getText('custrecord_job_franchisee');
            var jobGroupService = searchResultExtras.getText("custrecord_jobgroup_service", "CUSTRECORD_JOB_GROUP", null);

            package_job_groups = package_job_groups.split(',').sort().join(',');

            var params = [];
            params[params.length] = jobSource;
            if (category == 'Extras') {
                params[params.length] = extrasQty;
                params[params.length] = jobDateFinalised;
                params[params.length] = jobTimeFinalised;
                params[params.length] = jobGroupService;
            } else {
                params[params.length] = jobDateSchedule;
                params[params.length] = jobTimeSchedule;
                params[params.length] = jobDateFinalised;
                params[params.length] = jobTimeFinalised;
                params[params.length] = jobServiceLeg;
            }

            params[params.length] = jobZee;
            params[params.length] = jobOperatorAssigned;
            params[params.length] = jobStatus;
            params[params.length] = jobID;

            if (isNullorEmpty(jobPackageID)) {
                jobPackageID = 0;
            }

            if (packageID == 'null' || (!isNullorEmpty(discount_period) && discount_period == 3)) {
                if (oldJobGroup != jobGroup) {
                    className = rowColor(className);
                    if (!isNullorEmpty(assignPackage) && assignPackage != 'undefined') {
                        inlineQty += '<tr class="' + className + '" style="border-top-style: solid; border-top-width: 2px; border-top-color: grey;"><td><select class="form-control" id="package_assigned[' + i + ']" data-jobid="' + jobID + '" data-jobgroup="' + jobGroup + '" class="package_assigned"><option value="0">No Package</option>';

                        for (z = 0; z < poSearchPackage.length; z++) {
                            var packageIds = poSearchPackage[z].getValue('custrecord_service_package');
                            if (!isNullorEmpty(packageIds)) {
                                var packageIds = packageIds.split(',');
                                for (var x = 0; x < packageIds.length; x++) {
                                    if (jobPackageID == packageIds[x]) {
                                        inlineQty += '<option value="' + packageIds[x] + '" selected>' + nlapiLookupField('customrecord_service_package', packageIds[x], 'name') + '</option>';
                                    } else {
                                        inlineQty += '<option value="' + packageIds[x] + '">' + nlapiLookupField('customrecord_service_package', packageIds[x], 'name') + '</option>';
                                    }

                                }

                            }
                        }
                        inlineQty += '</select><input type="hidden" id="default_value[' + i + ']" value="' + jobPackageID + '" /></td>';
                    } else {
                        inlineQty += '<tr class="' + className + '" style="border-top-style: solid; border-top-width: 2px; border-top-color: grey;"><td>';
                        if (jobInvoiceable == 1 || jobInvoiceable == 2) {
                            var optionRow = selectedOption(jobInvoiceable, i);
                            inlineQty += optionRow;
                        } else {
                            if (category == 'Extras') {
                                var optionRow = selectedOption(1, i);
                            } else {
                                var optionRow = selectedOption(parseInt(staus), i);
                            }

                            inlineQty += optionRow;
                        }
                        inlineQty += '</td>';
                    }

                    inlineQty += commonRows(params);
                    inlineQty += '</tr>';
                } else {
                    // nlapiLogExecution('DEBUG', 'inside', oldJobGroup);
                    inlineQty += '<tr class="' + className + '"><td></td>';
                    inlineQty += commonRows(params, category);
                    inlineQty += '</tr>';

                }
            } else {
                // nlapiLogExecution('DEBUG', 'inside');
                if (old_package_job_groups !== package_job_groups) {
                    nlapiLogExecution('DEBUG', 'new group', package_job_groups);
                    className = rowColor(className);
                    if (!isNullorEmpty(assignPackage) && assignPackage != 'undefined') {
                        inlineQty += '<tr class="' + className + '" style="border-top-style: solid; border-top-width: 2px; border-top-color: grey;"><td><select class="form-control" id="package_assigned[' + i + ']" data-jobid="' + jobID + '" data-jobgroup="' + jobGroup + '" class="package_assigned"><option value="0">No Package</option>';

                        for (z = 0; z < poSearchPackage.length; z++) {
                            var packageIds = poSearchPackage[z].getValue('custrecord_service_package');
                            if (!isNullorEmpty(packageIds)) {
                                var packageIds = packageIds.split(',');
                                for (var x = 0; x < packageIds.length; x++) {
                                    if (jobPackageID == packageIds[x]) {
                                        inlineQty += '<option value="' + packageIds[x] + '" selected>' + nlapiLookupField('customrecord_service_package', packageIds[x], 'name') + '</option>';
                                    } else {
                                        inlineQty += '<option value="' + packageIds[x] + '">' + nlapiLookupField('customrecord_service_package', packageIds[x], 'name') + '</option>';
                                    }

                                }

                            }
                        }
                        inlineQty += '</select><input type="hidden" id="default_value[' + i + ']" value="' + jobPackageID + '" /></td>';
                    } else {
                        inlineQty += '<tr class="' + className + '" style="border-top-style: solid; border-top-width: 2px; border-top-color: grey;"><td>';
                        if (jobInvoiceable == 1 || jobInvoiceable == 2) {
                            var optionRow = selectedOption(jobInvoiceable, i);
                            inlineQty += optionRow;
                        } else {
                            if (category == 'Extras') {
                                var optionRow = selectedOption(1, i);
                            } else {
                                var optionRow = selectedOption(parseInt(staus), i);
                            }
                            inlineQty += optionRow;
                        }
                        inlineQty += '</td>';
                    }
                    inlineQty += '<td>' + serviceID + '</td>';
                    inlineQty += '<td>' + servicePrice + '</td>';
                    inlineQty += commonRows(params);
                    inlineQty += '<td>' + packageStatus + '</td>';
                    inlineQty += '<td>' + package_job_groups + '</td>';
                    inlineQty += '<td>' + jobInvoiceableText + '</td>';
                    inlineQty += '</tr>';
                } else {
                    nlapiLogExecution('DEBUG', 'same group', old_package_job_groups);
                    inlineQty += '<tr class="' + className + '"><td></td>';
                    inlineQty += '<td>' + serviceID + '</td>'
                    inlineQty += '<td>' + servicePrice + '</td>'
                    inlineQty += commonRows(params, category);
                    inlineQty += '<td>' + packageStatus + '</td>';
                    inlineQty += '<td>' + package_job_groups + '</td>';
                    inlineQty += '<td>' + jobInvoiceableText + '</td>';
                    inlineQty += '</tr>';

                }
            }


            oldJobGroup = jobGroup;
            old_package_job_groups = package_job_groups;

            i++;

            return true;
        });

        form.addField('preview_table', 'inlinehtml', '').setLayoutType('outsidebelow', 'startrow').setDefaultValue(inlineQty);
        form.addSubmitButton('Save');
        form.addButton('cust_back', 'Back', 'onclick_Back()');
        form.addButton('cust_back', 'Reset', 'onclick_reset()');
        form.setScript('customscript_cl_job_page');

        response.writePage(form);
    } else {
        var internalID = request.getParameter('customer');
        var package_array = request.getParameter('package_array');
        var invoiceable_array = request.getParameter('invoiceable_array');
        var job_array = request.getParameter('job_array');


        // nlapiLogExecution('DEBUG', 'job_array', job_array);
        // nlapiLogExecution('DEBUG', 'package_array', package_array);
        // nlapiLogExecution('DEBUG', 'invoiceable_array', invoiceable_array);

        // var params = new Array();
        // params['customer_id'] = internalID;
        // params['start_date'] = request.getParameter('start_date');
        // params['end_date'] = request.getParameter('end_date');  

        var params = new Array();
        params['customer_id'] = internalID;
        params['package_array'] = package_array;
        params['job_array'] = job_array;
        params['invoiceable_array'] = invoiceable_array;
        params['start_date'] = request.getParameter('start_date');
        params['end_date'] = request.getParameter('end_date');
        params['sc'] = request.getParameter('scid');
        params['zee'] = request.getParameter('zee_id');
        params['locked'] = request.getParameter('locked');


        // nlapiSetRedirectURL('SUITELET', 'customscript_sl_services_main_page', 'customdeploy_sl_services_main_page', null, params);
        nlapiSetRedirectURL('SUITELET', 'customscript_sl_assign_jobs', 'customdeploy_sl_assign_jobs', null, params);
    }
}


function selectedOption(option, i) {

    var rows = '';

    // nlapiLogExecution('DEBUG', 'option', option);

    if (option == 1 || isNullorEmpty(option)) {
        rows += '<div class="form-group has-success invoiceable_border">';
    } else {
        rows += '<div class="form-group has-error invoiceable_border">';
    }

    rows += '<div class="input-group"><select class="form-control input-group-addon inv_dropdown" id="invoiceable[' + i + ']" style="margin-right: 100px;">';
    if (option == 1 || isNullorEmpty(option)) {
        rows += '<option value="1" selected="selected">Yes</option><option value="2">No</option>';
    } else {
        rows += '<option value="1">Yes</option><option value="2" selected="selected">No</option>'
    }

    rows += '</select></div><input type="hidden" id="default_value[' + i + ']" value="' + option + '" />';

    // nlapiLogExecution('DEBUG', rows, rows);

    return rows;

}