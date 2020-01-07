/**
 * Module Description
 * 
 * NSVersion    Date                    Author         
 * 1.00         2017-08-11 10:14:33         Ankith 
 *
 * Remarks: Schedule Script to Set the Date Invoiced Finalised Field          
 * 
 * @Last Modified by:   Ankith
 * @Last Modified time: 2019-12-04 10:21:04
 *
 */


var ctx = nlapiGetContext();
var usageThreshold = 500;
var adhocInvDeploy = 'customdeploy2';
var prevInvDeploy = ctx.getDeploymentId();

/**
 * [updateDateInvFin description] - Function to the set the Date Invoiced Finalised field in the job record.
 * @param {string} custscript_partner Partner ID
 * @param {string} custscript_startdate Start Date
 * @param {string} custscript_enddate End Date
 */
function updateDateInvFin() {

    nlapiLogExecution('DEBUG', 'START -->', ctx.getRemainingUsage());

    var partner = parseInt(ctx.getSetting('SCRIPT', 'custscript_partner'));
    var startDate = ctx.getSetting('SCRIPT', 'custscript_startdate');
    var endDate = ctx.getSetting('SCRIPT', 'custscript_enddate');

    nlapiLogExecution('DEBUG', 'partner', partner);
    nlapiLogExecution('DEBUG', 'startDate', startDate);
    nlapiLogExecution('DEBUG', 'endDate', endDate);

    if (!isNullorEmpty(ctx.getSetting('SCRIPT', 'custscript_prev_deploy'))) {
        nlapiLogExecution('EMERGENCY', 'Received Parameters | ', 'Zee ID: ' + partner);
        nlapiLogExecution('EMERGENCY', 'Received Parameters | ', 'Start Date: ' + startDate);
        nlapiLogExecution('EMERGENCY', 'Received Parameters | ', 'End Date: ' + endDate);
        prevInvDeploy = ctx.getSetting('SCRIPT', 'custscript_prev_deploy');
    } else {
        prevInvDeploy = ctx.getDeploymentId();
        nlapiLogExecution('EMERGENCY', 'Initial Parameters | ', 'Zee ID: ' + partner);
        nlapiLogExecution('EMERGENCY', 'Initial Parameters | ', 'Start Date: ' + startDate);
        nlapiLogExecution('EMERGENCY', 'Initial Parameters | ', 'End Date: ' + endDate);
    }

    /**
     * SEARCH: AIC - Review - unInvoiced Jobs
     * Set the review date and the invoiceable field for each and every job
     */
    var searchedAlljobs = nlapiLoadSearch('customrecord_job', 'customsearch_inv_review_jobs_uninv');

    var zee_record = nlapiLoadRecord('partner', partner);

    var zee_text = zee_record.getFieldValue('entitytitle');

    var strFormula = "COALESCE({custrecord_job_service.custrecord_service_franchisee},{custrecord_job_group.custrecord_jobgroup_franchisee},{custrecord_job_franchisee},'')";


    var newFiltersAlljobs = new Array();
    // newFiltersAlljobs[newFiltersAlljobs.length] = new nlobjSearchFilter('formulatext', null, 'is', zee_text).setFormula(strFormula);
    newFiltersAlljobs[newFiltersAlljobs.length] = new nlobjSearchFilter('custrecord_job_date_inv_finalised', null, 'isempty');
    newFiltersAlljobs[newFiltersAlljobs.length] = new nlobjSearchFilter('custrecord_job_date_reviewed', null, 'isnotempty');
    if (!isNullorEmpty(startDate) && !isNullorEmpty(endDate)) {

        newFiltersAlljobs[newFiltersAlljobs.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorafter', nlapiStringToDate(startDate));
        newFiltersAlljobs[newFiltersAlljobs.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorbefore', nlapiStringToDate(endDate));
    }

    searchedAlljobs.addFilters(newFiltersAlljobs);

    var resultSetAlljobs = searchedAlljobs.runSearch();

    var count = 0;

    resultSetAlljobs.forEachResult(function(searchResultAlljobs) {

        count++;

        usageStart = ctx.getRemainingUsage();

        if (usageStart <= usageThreshold) {

            nlapiLogExecution('DEBUG', 'SWITCHing -->', ctx.getRemainingUsage());

            var params = {
                custscript_partner: partner,
                custscript_prev_deploy: ctx.getDeploymentId(),
                custscript_startdate: startDate,
                custscript_enddate: endDate
            }

            nlapiLogExecution('EMERGENCY', 'Parameters Passed | ', 'Zee ID: ' + partner);
            nlapiLogExecution('EMERGENCY', 'Parameters Passed | ', 'Start Date: ' + startDate);
            nlapiLogExecution('EMERGENCY', 'Parameters Passed | ', 'End Date: ' + endDate);
            var reschedule = rescheduleScript(prevInvDeploy, adhocInvDeploy, params);
            if (reschedule == false) {
                return false;
            }
        }

        var jobID = searchResultAlljobs.getValue('internalid');
        var jobService = searchResultAlljobs.getText("custrecord_job_service");
        var jobCustomer = searchResultAlljobs.getText("custrecord_job_customer");
        var specialCustomerType = searchResultAlljobs.getValue("custentity_special_customer_type", "CUSTRECORD_JOB_CUSTOMER", null);
        var linkedMPCustomer = searchResultAlljobs.getValue("custentity_np_mp_customer", "CUSTRECORD_JOB_CUSTOMER", null);
        var linkedSpecialCustomer = searchResultAlljobs.getValue("custentity_np_np_customer", "CUSTRECORD_JOB_CUSTOMER", null);
        var jobPackageType = searchResultAlljobs.getValue("custrecord_service_package_type", "CUSTRECORD_JOB_SERVICE_PACKAGE", null);

        try {
            var jobRecord = nlapiLoadRecord('customrecord_job', jobID);

            //Below section is for Special Customers, so the job is transferred to that Special Customer and the Field SPECIAL CUSTOMER in the Job record is filled to the Special Customer.

            //Below condition is to check if the customer to which the job is assigned to has both the LINKED MP CUSTOMER & SPECIAL CUSTOMER TYPE not null, then an error email is sent out. 
            if (!isNullorEmpty(linkedMPCustomer) || !isNullorEmpty(specialCustomerType)) {
                var body = 'Customer: ' + jobCustomer + ', has Linked MP Customer Field and Special Customer Type field set to ' + linkedMPCustomer + ' & ' + specialCustomerType + ' respectively.';

                nlapiSendEmail(409635, ['ankith.ravindran@mailplus.com.au', 'Willian.Suryadharma@mailplus.com.au'], 'AIC: Date Invoice Finalised SC - Linked MP Customer & Customer Type both not null', body, null);
            } else if (!isNullorEmpty(linkedSpecialCustomer) && isNullorEmpty(specialCustomerType)) {

                //To check if the customer to which the job is assigned has the LINKED SPECIAL CUSTOMER filled & SPECIAL CUSTOMER TYPE not equal to null, then we go to the Linked Special customer record and get the Special Customer type. 


                var specialCustomerRecord = nlapiLoadRecord('customer', linkedSpecialCustomer);

                var specialCustomerSpecialCustomerType = specialCustomerRecord.getFieldValue('custentity_special_customer_type');

                var specialCustomerTypeRecord = nlapiLoadRecord('customrecord_special_customer_type', specialCustomerSpecialCustomerType);

                //Get the allowed services from the Special Customer Type record.

                var allowedServicesIDs = specialCustomerTypeRecord.getFieldValues('custrecord_special_allowed_service');
                var allowedServicesTexts = specialCustomerTypeRecord.getFieldTexts('custrecord_special_allowed_service');

                var result = null;

                //If the Special Customer Type is of type AusPost or Secure Cash
                if (specialCustomerSpecialCustomerType == 2 || specialCustomerSpecialCustomerType == 3) {
                    //If the Allowed Services field is not null
                    if (!isNullorEmpty(allowedServicesTexts) && !isNullorEmpty(allowedServicesIDs)) {
                        // Check if the service performed by the job exists in the Allowed Services
                        result = allowedServicesTexts.indexOf(jobService);

                        // If exists
                        if (result >= 0) {
                            //Fill the Special Customer with the Linked Special Customer
                            jobRecord.setFieldValue('custrecord_job_special_customer', linkedSpecialCustomer);
                        }
                    } else {
                        // var allowedPackage = specialCustomerTypeRecord.getFieldValues('custrecord_special_allowed_package');

                        // //If allowed Package is equal to NeopPost
                        // if (allowedPackage == jobPackageType) {
                        //     //Fill the Special Customer with the Linked Special Customer
                        //     jobRecord.setFieldValue('custrecord_job_special_customer', linkedSpecialCustomer);
                        // }
                    }
                } else {
                    //If Special Customer Type is of Type NeoPost.

                    //Get the Allowed Package from the Special Type record
                    var allowedPackage = specialCustomerTypeRecord.getFieldValues('custrecord_special_allowed_package');

                    //If allowed Package is equal to NeopPost
                    if (allowedPackage == jobPackageType) {
                        //Fill the Special Customer with the Linked Special Customer
                        jobRecord.setFieldValue('custrecord_job_special_customer', linkedSpecialCustomer);
                    }

                }

            }

            var jobGroupStatus = jobRecord.getFieldValue('custrecord_job_group_status');
            var jobInvoiceable = jobRecord.getFieldValue('custrecord_job_invoiceable');
            var jobCat = jobRecord.getFieldValue('custrecord_job_service_category');
            var packageStatus = jobRecord.getFieldValue('custrecord_package_status');
            var jobGroupSource = jobRecord.getFieldValue('custrecord_job_source');

            if (isNullorEmpty(jobInvoiceable)) {
                if (!isNullorEmpty(packageStatus)) {
                    if (packageStatus == 1 || isNullorEmpty(packageStatus)) {
                        // Job Group Status is Null for Extras and Jobs Created in NS
                        jobRecord.setFieldValue('custrecord_job_invoiceable', 1);
                    } else {
                        jobRecord.setFieldValue('custrecord_job_invoiceable', 2);
                    }
                } else {
                    if (jobGroupStatus == 'Completed' || (isNullorEmpty(jobGroupStatus) && jobGroupSource == 5) || jobCat != '1') {
                        // Job Group Status is Null for Extras and Jobs Created in NS
                        jobRecord.setFieldValue('custrecord_job_invoiceable', 1);
                    } else {
                        jobRecord.setFieldValue('custrecord_job_invoiceable', 2);
                    }
                }

            }

            jobRecord.setFieldValue('custrecord_job_date_inv_finalised', getDate());

            nlapiSubmitRecord(jobRecord);

            usagePerLoop = ctx.getRemainingUsage() - usageStart

            nlapiLogExecution('DEBUG', 'Loop #:' + count + ' | job id: ' + jobID + ' | Usg: ' + usagePerLoop);

            return true;
        } catch (e) {
            var message = '';
            message += "Job: <a href ='https://1048144.app.netsuite.com/app/common/custom/custrecordentry.nl?rectype=941&id=" + jobID + "'> View Job</a></br>";
            message += "----------------------------------------------------------------------------------</br>";
            message += e;


            nlapiSendEmail(409635, ['ankith.ravindran@mailplus.com.au', 'willian.suryadharma@mailplus.com.au'], 'AIC - Review - Date Inv Finalised (SC) - Unable to update Job', message, null);
        }

        return true;
    });

    nlapiLogExecution('DEBUG', 'END -->', ctx.getRemainingUsage());
}