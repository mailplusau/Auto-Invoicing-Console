var usage_threshold = 20;
var usage_threshold_invoice = 1000;
var adhoc_inv_deploy = 'customdeploy2';
var prev_inv_deploy = null;
var ctx = nlapiGetContext();

var service_start_date;
var service_end_date;
var franchisee;
var from_invoice = null;
var count_loop_cust = 0;

function invoiceCreation() {

    if (!isNullorEmpty(ctx.getSetting('SCRIPT', 'custscript_deployment_prev'))) {
        prev_inv_deploy = ctx.getSetting('SCRIPT', 'custscript_deployment_prev');
    } else {
        prev_inv_deploy = ctx.getDeploymentId();
    }

    if (!isNullorEmpty(ctx.getSetting('SCRIPT', 'custscript_id_customer')) && !isNullorEmpty(ctx.getSetting('SCRIPT', 'custscript_id_invoice'))) {
        service_start_date = ctx.getSetting('SCRIPT', 'custscript_service_start');
        service_end_date = ctx.getSetting('SCRIPT', 'custscript_service_end');
        franchisee = ctx.getSetting('SCRIPT', 'custscript_id_zee');
        from_invoice = ctx.getSetting('SCRIPT', 'custscript_custom_invoice');

        var result = updateJobs(ctx.getSetting('SCRIPT', 'custscript_id_customer'), ctx.getSetting('SCRIPT', 'custscript_id_invoice'), service_start_date, service_end_date, franchisee, from_invoice);
        if (result == true) {
            var params = {
                custscript_prev_deployment: ctx.getDeploymentId()
            }

            var reschedule = rescheduleScript(prev_inv_deploy, adhoc_inv_deploy, params);
            if (reschedule == false) {

                return false;
            }
        }
    }
}

function updateJobs(customer_internal_id, invoiceId, service_start_date, service_end_date, franchisee, from_invoice) {

    var count_loop_job = 0;

    nlapiLogExecution('DEBUG', 'START ---> update job function', ctx.getRemainingUsage());
    nlapiLogExecution('DEBUG', 'customer_internal_id | ' + customer_internal_id, ctx.getRemainingUsage());
    nlapiLogExecution('DEBUG', 'invoiceId | ' + invoiceId, ctx.getRemainingUsage());
    nlapiLogExecution('DEBUG', 'service_end_date | ' + service_end_date, ctx.getRemainingUsage());
    nlapiLogExecution('DEBUG', 'service_start_date | ' + service_start_date, ctx.getRemainingUsage());
    nlapiLogExecution('DEBUG', 'from_invoice | ' + from_invoice, ctx.getRemainingUsage());
    nlapiLogExecution('DEBUG', 'franchisee | ' + franchisee, ctx.getRemainingUsage());

    if (from_invoice == 'Yes') {
        var searched_alljobs = nlapiLoadSearch('customrecord_job', 'customsearch_job_invoicing_jobs');
    } else {
        var searched_alljobs = nlapiLoadSearch('customrecord_job', 'customsearch_job_inv_process_job_all');
    }

    var newFilters_alljobs = new Array();
    newFilters_alljobs[newFilters_alljobs.length] = new nlobjSearchFilter('custrecord_job_customer', null, 'is', customer_internal_id);
    newFilters_alljobs[newFilters_alljobs.length] = new nlobjSearchFilter('custrecord_job_franchisee', null, 'is', franchisee);
    if (!isNullorEmpty(service_start_date) && !isNullorEmpty(service_end_date)) {

        newFilters_alljobs[newFilters_alljobs.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorafter', nlapiStringToDate(service_start_date));
        newFilters_alljobs[newFilters_alljobs.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorbefore', nlapiStringToDate(service_end_date));
    }

    searched_alljobs.addFilters(newFilters_alljobs);

    var resultSet_alljobs = searched_alljobs.runSearch();

    resultSet_alljobs.forEachResult(function(searchResult_alljobs) {

        var usage_loopstart_job = ctx.getRemainingUsage();
        count_loop_job++;


        //nlapiLogExecution('DEBUG', 'START ---> usage remianing per loop of job update', ctx.getRemainingUsage());

        if (ctx.getRemainingUsage() <= usage_threshold) {

            var params = {
                custscript_id_customer: customer_internal_id,
                custscript_id_invoice: invoiceId,
                custscript_deployment_prev: ctx.getDeploymentId(),
                custscript_service_start: service_start_date,
                custscript_id_zee: service_end_date,
                custscript_zee: franchisee,
                custscript_custom_invoice: 'Yes'
            }

            var reschedule = rescheduleScript(prev_inv_deploy, adhoc_inv_deploy, params);
            if (reschedule == false) {

                return false;
            }
        }


        var job_id = searchResult_alljobs.getValue('internalid');
        var invoiceable_yes_no = searchResult_alljobs.getValue('custrecord_job_invoiceable');

        nlapiLogExecution('DEBUG', 'jobID', job_id);
        var job_record = nlapiLoadRecord('customrecord_job', job_id);

        // job_record.getFieldValue('custrecord_job_date_invoiced') != getDate()
        if (isNullorEmpty(job_record.getFieldValue('custrecord_job_date_invoiced')) && isNullorEmpty(job_record.getFieldValue('custrecord_job_invoice'))) {

            nlapiLogExecution('DEBUG', 'Inside');

            if (from_invoice == 'Yes') {

                var jobGroupStatus = job_record.getFieldValue('custrecord_job_group_status');
                var jobInvoiceable = job_record.getFieldValue('custrecord_job_invoiceable');
                var jobCat = job_record.getFieldValue('custrecord_job_service_category');
                var packageStatus = job_record.getFieldValue('custrecord_package_status');

                if (isNullorEmpty(jobInvoiceable)) {
                    if (!isNullorEmpty(packageStatus)) {
                        if (packageStatus == 1 || isNullorEmpty(packageStatus)) {
                            // Job Group Status is Null for Extras and Jobs Created in NS
                            job_record.setFieldValue('custrecord_job_invoiceable', 1);
                        } else {
                            job_record.setFieldValue('custrecord_job_invoiceable', 2);
                        }
                    } else {
                        if (jobGroupStatus == 'Completed' || isNullorEmpty(jobGroupStatus)) {
                            // Job Group Status is Null for Extras and Jobs Created in NS
                            job_record.setFieldValue('custrecord_job_invoiceable', 1);
                        } else {
                            job_record.setFieldValue('custrecord_job_invoiceable', 2);
                        }
                    }
                }
                job_record.setFieldValue('custrecord_job_invoice', invoiceId);
                job_record.setFieldValue('custrecord_job_date_reviewed', getDate());
                job_record.setFieldValue('custrecord_job_date_inv_finalised', getDate());
                job_record.setFieldValue('custrecord_job_date_invoiced', getDate());
                job_record.setFieldValue('custrecord_job_invoice_custom', 1);
            } 

            nlapiLogExecution('DEBUG', 'Job #: ' + count_loop_job + ' | Job: ' + job_id + '.', usage_loopstart_job - ctx.getRemainingUsage());
            nlapiSubmitRecord(job_record);

            //WS Log:
            

        } else {

            var body = 'Customer: ' + customer_internal_id + ' | Job: ' + job_id + 'cannot be updated because Invoice ID and Date Invoice is not Empty.';

            nlapiSendEmail(112209, ['ankith.ravindran@mailplus.com.au', 'willian.suryadharma@mailplus.com.au'], 'Invoice Creation - Customer: ' + customer_internal_id + ' cannot update Job', body, null);

            //WS log:
            nlapiLogExecution('ERROR', 'Job #: ' + count_loop_job + ' | Job: ' + job_id + '.', 'ERROR: JOB X UPDATED - Inv & Date Invoice not empty.');

            return false;
        }

        return true;
    });

    //WS Log:
    nlapiLogExecution('DEBUG', '--> END | update job function', ctx.getRemainingUsage());

    return true;
}

function getDate() {
    var date = new Date();
    date.setHours(date.getHours() + 17);
    date = nlapiDateToString(date);

    return date;
}

function invoice_date() {

    var date = new Date();

    var month = date.getMonth(); //Months 0 - 11
    var day = date.getDate();
    var year = date.getFullYear();

    //If allocator run on the first day of the month, it takes the last month as the filter
    if (day == 1 || day == 2 || day == 3 || day == 4 || day == 5) {
        if (month == 0) {
            month = 11;
            year = year - 1
        } else {
            month = month - 1;
        }
    }

    // var firstDay = new Date(year, (month), 1);
    var lastDay = new Date(year, (month + 1), 0);

    return nlapiDateToString(lastDay);
}

function service_start_end_date(date_finalised) {

    var split_date = date_finalised.split('/');

    var date = new Date();
    var firstDay = new Date(date.getFullYear(), parseInt(split_date[1]) - 1, 1);
    var lastDay = new Date(date.getFullYear(), split_date[1], 0);



    var service_range = [];

    service_range[0] = nlapiDateToString(firstDay);
    service_range[1] = nlapiDateToString(lastDay);

    return service_range;

}