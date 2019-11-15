/*
 * Module Description
 * 
 * Author: Ankith Ravindran
 *
 * NSVersion  Date                      Last Modified time                      
 * 1.00       2017-08-10 14:11:19       2017-08-10 14:11:19           
 *
 * Remarks: To assign / unassign packges for job groups based on the service
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
function commonRows(params) {

    var common = '';
    for (var i = 0; i < params.length; i++) {
        common += '<td>' + params[i] + '</td>';
    }
    common += '</tr>';
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
 * [job_page description] - To assign / unassign packges for job groups based on the service
 * @param  {String} request  when the page is loaded
 * @param  {String} response when the page is submitted
 */
function job_page(request, response) {
    var ctx = nlapiGetContext();
    var zee = ctx.getUser();

    var baseURL = 'https://1048144.app.netsuite.com';
    if (nlapiGetContext().getEnvironment() == "SANDBOX") {
        baseURL = 'https://system.sandbox.netsuite.com';
    }


    var status = null;
    toString()

    if (request.getMethod() == "GET") {
        var customer = request.getParameter('customer_id');
        var service = request.getParameter('service_id');
        var price = request.getParameter('rate');
        var category = request.getParameter('category');
        var packageID = request.getParameter('package');
        status = request.getParameter('status');


        var statusText = '';

        if (status == '1') {
            statusText = 'Completed'
        } else if (status == '2') {
            statusText = 'Partial'
        } else if (status == '3') {
            statusText = ''
        } else {
            statusText = null;
        }

        var customerName = nlapiLookupField('customer', customer, 'companyname');

        var form = nlapiCreateForm('Assign Packages to Jobs for ' + customerName);

        form.addField('start_date', 'text', 'start_date').setDisplayType('hidden').setDefaultValue(request.getParameter('start_date'));
        form.addField('end_date', 'text', 'end_date').setDisplayType('hidden').setDefaultValue(request.getParameter('end_date'));

        /**
         * [if description] -  if category is extras, search: Job - Invoicing Review - Invoicing Jobs
         * @param  {string} nlapiGetFieldValue('category') [description]
         */
        if (category == 'Extras') {
            var searchedJobsExtras = nlapiLoadSearch('customrecord_job', 'customsearch_job_invoicing_jobs');
        } else {
            /**
             * [if description] - If incoming status is 3, search: Job - Invoicing Review - Invoicing Jobs (Incomplete)
             * @param  {string} nlapiGetFieldValue('incoming_status') [description]
             */
            if (status == '3') {
                var searchedJobsExtras = nlapiLoadSearch('customrecord_job', 'customsearch_job_invoicing_jobs_inc');
            } else {
                var searchedJobsExtras = nlapiLoadSearch('customrecord_job', 'customsearch_job_invoicing_jobs');
            }
        }

        var filPo = [];
        filPo[filPo.length] = new nlobjSearchFilter('custrecord_job_service', null, 'is', service);
        filPo[filPo.length] = new nlobjSearchFilter('custrecord_job_service_price', null, 'is', price);
        filPo[filPo.length] = new nlobjSearchFilter('custrecord_job_customer', null, 'is', customer);
        // fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_job_source', null, 'isnot', 'NetSuite');
        if (!isNullorEmpty(status)) {
            filPo[filPo.length] = new nlobjSearchFilter('custrecord_job_group_status', null, 'is', statusText);
        }
        if (packageID == 'null') {
            filPo[filPo.length] = new nlobjSearchFilter('custrecord_job_service_package', null, 'anyof', '@NONE@');
        } else {
            filPo[filPo.length] = new nlobjSearchFilter('custrecord_job_service_package', null, 'anyof', packageID);
        }
        if (!isNullorEmpty(request.getParameter('start_date')) && !isNullorEmpty(request.getParameter('end_date'))) {
            filPo[filPo.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorafter', nlapiStringToDate(request.getParameter('start_date')));
            filPo[filPo.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorbefore', nlapiStringToDate(request.getParameter('end_date')));
        }

        searchedJobsExtras.addFilters(filPo);

        var resultSetExtras = searchedJobsExtras.runSearch();

        if (ctx.getRole() == 1000) { //Franchisee
            zee = ctx.getUser();
        } else {
            zee = '6'; //Test
        }

        var filPoPackage = [];
        filPoPackage[filPoPackage.length] = new nlobjSearchFilter('internalid', null, 'is', service);

        var colPoPackage = [];
        colPoPackage[colPoPackage.length] = new nlobjSearchColumn('internalid');
        colPoPackage[colPoPackage.length] = new nlobjSearchColumn('name');
        colPoPackage[colPoPackage.length] = new nlobjSearchColumn('custrecord_service_package');

        var poSearchPackage = nlapiSearchRecord('customrecord_service', null, filPoPackage, colPoPackage);

        form.addField('service_type', 'text', 'Service').setLayoutType('startrow').setDisplayType('disabled').setDefaultValue(nlapiLookupField('customrecord_service', service, 'name'));
        form.addField('service_price', 'text', 'Service Price').setLayoutType('endrow').setDisplayType('disabled').setDefaultValue(price);

        form.addField('service', 'text', 'Service').setDisplayType('hidden').setDefaultValue(service);
        form.addField('price', 'text', 'Service').setDisplayType('hidden').setDefaultValue(price);
        form.addField('customer', 'text', 'Service').setDisplayType('hidden').setDefaultValue(customer);
        form.addField('group_status', 'text', 'Service').setDisplayType('hidden').setDefaultValue(statusText);
        form.addField('category', 'text', 'Service').setDisplayType('hidden').setDefaultValue(category);
        form.addField('incoming_status', 'text', 'Service').setDisplayType('hidden').setDefaultValue(status);

        var inlineQty = '<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js"><script src="//code.jquery.com/jquery-1.11.0.min.js"></script><link type="text/css" rel="stylesheet" href="https://cdn.datatables.net/1.10.13/css/jquery.dataTables.min.css"><link href="//netdna.bootstrapcdn.com/bootstrap/3.3.2/css/bootstrap.min.css" rel="stylesheet"><script src="//netdna.bootstrapcdn.com/bootstrap/3.3.2/js/bootstrap.min.js"></script></script><br><br><style>table#stockcount {font-size:12px; text-align:center; border-color: #24385b} </style><table border="0" cellpadding="10" id="stockcount" cellspacing="0" class="table table-striped"><thead style="color: white;background-color: #607799;"><tr><td style="color: rgb(255, 204, 0)"><b>PACKAGES</b></td><td><b>DATE SCHEDULED</b></td><td><b>TIME SCHEDULED</b></td><td><b>DATE FINALIZED</b></td><td><b>TIME FINALIZED</b></td><td><b>JOB LEG</b></td><td><b>OPERATOR ASSIGNED</b></td><td><b>STATUS</b></td></tr></thead><tbody>';

        var className = '';
        var i = 0;

        var oldJobGroup = null;

        resultSetExtras.forEachResult(function(searchResultExtras) {

            var jobGroup = searchResultExtras.getValue('custrecord_job_group');
            var jobID = searchResultExtras.getValue('internalid');
            var jobSource = searchResultExtras.getText('custrecord_job_source');
            var jobDateSchedule = searchResultExtras.getValue('custrecord_job_date_scheduled');
            var jobTimeSchedule = searchResultExtras.getValue('custrecord_job_time_scheduled_before');
            var jobDateFinalised = searchResultExtras.getValue('custrecord_job_date_finalised');
            var jobTimeFinalised = searchResultExtras.getValue('custrecord_job_time_finalised');
            var jobServiceLeg = searchResultExtras.getValue('custrecord_job_service_leg');
            var jobOperatorAssigned = searchResultExtras.getText('custrecord_job_operator_assigned');
            var jobStatus = searchResultExtras.getText('custrecord_job_status');
            var jobInvoiceable = searchResultExtras.getValue('custrecord_job_invoiceable');
            var jobPackageID = searchResultExtras.getValue('custrecord_job_service_package');

            var params = [];
            params[params.length] = jobDateSchedule;
            params[params.length] = jobTimeSchedule;
            params[params.length] = jobDateFinalised;
            params[params.length] = jobTimeFinalised;
            params[params.length] = jobServiceLeg;
            params[params.length] = jobOperatorAssigned;
            params[params.length] = jobStatus;

            if (oldJobGroup != jobGroup) {
                className = rowColor(className);
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

                inlineQty += commonRows(params);
            } else {
                inlineQty += '<tr class="' + className + '"><td></td>';

                inlineQty += commonRows(params);
            }

            oldJobGroup = jobGroup;
            i++;

            return true;
        });
        if (i == 0) {
            inlineQty += '<tr><td colspan="11" style="font-weight: bold;text-align: center;font-size: 15px">NO COMPLETED JOBS</td></tr>';
        }

        form.addField('preview_table', 'inlinehtml', '').setLayoutType('outsidebelow', 'startrow').setDefaultValue(inlineQty);

        form.addSubmitButton('Reviewed');
        form.addButton('cust_back', 'Back', 'onclick_Back()');
        form.addButton('cust_back', 'Reset', 'onclick_reset()');

        form.setScript('customscript_cl_assign_package');

        response.writePage(form);

    } else {

        var internalID = request.getParameter('customer');

        var params = new Array();
        params['customer_id'] = internalID;
        params['start_date'] = request.getParameter('start_date');
        params['end_date'] = request.getParameter('end_date');

        nlapiSetRedirectURL('SUITELET', 'customscript_sl_services_main_page', 'customdeploy_sl_services_main_page', null, params);

    }
}