/*
 * Module Description
 * 
 * Author: Ankith Ravindran
 *
 * NSVersion  Date                      Last Modified time                      
 * 1.00       2017-08-03 17:14:11       2017-08-03 17:14:11           
 *
 * Remarks: Invoicing Review Summary Page
 *
 */

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

var start_date;
var end_date;
var zee_name;

/**
 * [summary_page description] - To display the list of customers for a franchisee for whom the Invoice Review needs to be done.
 * @param  {String} request  when the page is loaded
 * @param  {String} response when the page is submitted
 */
function summary_page(request, response) {

    if (request.getMethod() === "GET") {
        var start_time = Date.now();

        var form = nlapiCreateForm('Auto Invoicing Console: Summary Page');

        var inlinehtml2 = '<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js"><script src="//code.jquery.com/jquery-1.11.0.min.js"></script><link type="text/css" rel="stylesheet" href="https://cdn.datatables.net/1.10.13/css/jquery.dataTables.min.css"><link href="//netdna.bootstrapcdn.com/bootstrap/3.3.2/css/bootstrap.min.css" rel="stylesheet"><script src="//netdna.bootstrapcdn.com/bootstrap/3.3.2/js/bootstrap.min.js"></script><link rel="stylesheet" href="https://1048144.app.netsuite.com/core/media/media.nl?id=2060796&c=1048144&h=9ee6accfd476c9cae718&_xt=.css"/><script src="https://1048144.app.netsuite.com/core/media/media.nl?id=2060797&c=1048144&h=ef2cda20731d146b5e98&_xt=.js"></script><link type="text/css" rel="stylesheet" href="https://1048144.app.netsuite.com/core/media/media.nl?id=2090583&c=1048144&h=a0ef6ac4e28f91203dfe&_xt=.css">';

        inlinehtml2 += '<div class="se-pre-con"></div><button type="button" class="btn btn-sm btn-info instruction_button" data-toggle="collapse" data-target="#demo">Click for Instructions</button><div id="demo" style="background-color: #cfeefc !important;border: 1px solid #417ed9;padding: 10px 10px 10px 20px;width:96%;position:absolute" class="collapse"><b><u>Important Instructions:</u></b><ul><li>Click headers to sort. Hold <b><i>"Shift"</i></b> and click another column to sort according to multiple columns.</li><li>Can search for specific customer by typing into the Search bar</li><li><input class="btn-xs btn-default" type="button" value="START REVIEW" disabled> - Click to <b>Start</b> the Invoice Review for the Customer</li><li><input class="btn-xs btn-default" type="button" value="CONTINUE REVIEW" disabled> - Click to <b>Continue</b> the Invoice Review Process</li><li><input class="btn-xs btn-primary" type="button" value="FINALISE" disabled> - Click when all the Customer\'s Invoice has been reviewed and its ready for Invoicing</li><li><b>ACTIONS</b> reveals the stage of the review process for each customer: <ul><li><input class="btn-xs btn-danger" type="button" value="REVIEW" disabled> - New <b>activities</b> from Mailplus GO app are available for review.</li><li><input class="btn-xs btn-primary" type="button" value="EDIT" disabled> - All <b>activities</b> from Mailplus GO app are reviewed, up-to-date and can be edited.</li><li><input class="btn-xs btn-info" type="button" value="FINALISED" disabled> <small><b>(LOCKED)</b></small> - All activities from Mailplus GO app are finalised for invoicing</li></li><li><input class="btn-xs btn-success active" type="button" value="INVOICED" disabled> <small><b>(LOCKED)</b></small> - Invoice has been automatically created using activities from Mailplus GO app. </li><li><input class="btn-xs btn btn-default" type="button" value="CUSTOM INVOICE" disabled> <small><b>(LOCKED)</b></small> - Invoice has been generated without the use of activities from Mailplus GO app.</ul></li></ul></div>';

        // <li><input class="btn-xs btn-default" type="button" value="PARTIALLY REVIEWED" disabled> - Click to <b>Continue</b> the Invoice Review for the Customer</li>



        inlinehtml2 += '<div class="col-xs-4 admin_section" style="width: 20%;left: 40%;position: absolute;"><label class="control-label">Invoicing Month <span class="glyphicon glyphicon-asterisk" style="font-size: 5px;top: -5px;color: red;"></span></label>';

        var result = finalise_date();



        if (result == true && isNullorEmpty(request.getParameter('start_date'))) {
            var date_string = start_end_date();
            start_date = date_string[0];
            end_date = date_string[1];
            form.addField('start_date', 'text', 'start_date').setDisplayType('hidden').setDefaultValue(date_string[0]);
            form.addField('end_date', 'text', 'end_date').setDisplayType('hidden').setDefaultValue(date_string[1]);
            var splitDate = date_string[0].split('/');
            if (splitDate[1].length == 1) {
                splitDate[1] = '0' + splitDate[1]
            }
            var startDate = splitDate[2] + '-' + splitDate[1];
            inlinehtml2 += '<input type="month" class="form-control invoicing_month" value="' + startDate + '" required="required" />';
        } else if (!isNullorEmpty(request.getParameter('start_date'))) {
            start_date = request.getParameter('start_date');
            end_date = request.getParameter('end_date');
            form.addField('start_date', 'text', 'start_date').setDisplayType('hidden').setDefaultValue(request.getParameter('start_date'));
            form.addField('end_date', 'text', 'end_date').setDisplayType('hidden').setDefaultValue(request.getParameter('end_date'));
            var splitDate = request.getParameter('start_date').split('/');
            if (splitDate[1].length == 1) {
                splitDate[1] = '0' + splitDate[1]
            }
            var startDate = splitDate[2] + '-' + splitDate[1];
            inlinehtml2 += '<input type="month" class="form-control invoicing_month" value="' + startDate + '" required="required"/>';
        } else {
            var todayDate = getDate();
            var service_dates = service_start_end_date(todayDate);
            start_date = service_dates[0];
            end_date = service_dates[1];
            form.addField('start_date', 'text', 'start_date').setDisplayType('hidden').setDefaultValue(service_dates[0]);
            form.addField('end_date', 'text', 'end_date').setDisplayType('hidden').setDefaultValue(service_dates[1]);
            var splitDate = service_dates[0].split('/');
            if (splitDate[1].length == 1) {
                splitDate[1] = '0' + splitDate[1]
            }
            var startDate = splitDate[2] + '-' + splitDate[1];
            inlinehtml2 += '<input type="month" class="form-control invoicing_month" value="' + startDate + '" required="required" />';
        }

        nlapiLogExecution('DEBUG', 'zee', zee);
        if (zee == 6 || zee == 425904) {
            inlinehtml2 += '<select class="form-control zee_dropdown" >';

            var searched_zee = nlapiLoadSearch('partner', 'customsearch_job_inv_process_zee');

            var resultSet_zee = searched_zee.runSearch();

            var count_zee = 0;

            var zee_id;

            inlinehtml2 += '<option value=""></option>'

            resultSet_zee.forEachResult(function(searchResult_zee) {

                zee_id = searchResult_zee.getValue('internalid');
                zee_name = searchResult_zee.getValue('entityid');

                if (request.getParameter('zee') == zee_id) {
                    inlinehtml2 += '<option value="' + zee_id + '" selected="selected">' + zee_name + '</option>';
                } else {
                    inlinehtml2 += '<option value="' + zee_id + '">' + zee_name + '</option>';
                }


                return true;
            });

            inlinehtml2 += '</select>';
        }

        // } else {
        //  var searched_zee = nlapiLoadSearch('partner', 'customsearch_job_inv_process_zee');

        //  var newFilters_zee = new Array();
        //  newFilters_zee[newFilters_zee.length] = new nlobjSearchFilter('internalid', null, 'is', zee);

        //  searched_zee.addFilters(newFilters_zee);

        //  var resultSet_zee = searched_zee.runSearch();

        //  var count_zee = 0;

        //  var zee_id;

        //  resultSet_zee.forEachResult(function(searchResult_zee) {

        //      zee_id = searchResult_zee.getValue('internalid');
        //      zee_name = searchResult_zee.getValue('entityid');

        //      return true;
        //  });

        // }

        if (!isNullorEmpty(request.getParameter('zee'))) {
            zee = request.getParameter('zee');
        }

        var zee_record = nlapiLoadRecord('partner', zee);

        var zee_text = zee_record.getFieldValue('entitytitle');
        var zeeName = zee_record.getFieldValue('entityid');
        // inlinehtml2 += '</div>';

        var inlineQty = '<div><style>table#stockcount {font-size:12px; font-weight:bold; text-align:center; border-color: #24385b;} </style><table border="0" cellpadding="10" id="stockcount" cellspacing="0" class="table table-responsive table-striped"><thead style="color: white;background-color: #607799;"><tr><td style="text-align:left;"><b>ID</b></td><td style="text-align:left;" class="col-sm-3"><b>CUSTOMER NAME</b></td><td><b>ACTION</b></td><td style="text-align:right;" class="col-sm-2"><b>EXPECTED INVOICE</b></td><td class="col-sm-2" style="text-align:right;"><b>EXPECTED DISTRIBUTION</b></td><td><b>LINK TO INVOICE</b></td></tr></thead><tbody>';

        // var searchedSummary = nlapiLoadSearch('customrecord_job', 'customsearch_job_invoicing_summary');
        //var searchedSummary = nlapiLoadSearch('customrecord_job', 'customsearch_job_inv_review_exp_amt');

        var zeeName_firstletter = zeeName.substring(0, 1);
        var zeeName_test = zeeName.substring(0, 4);
        // nlapiLogExecution('DEBUG', 'zeeName_firstletter', zeeName_firstletter);
        // nlapiLogExecution('DEBUG', 'zeeName_test', zeeName_test);


        if (zeeName_test == 'TEST') {
            var searchedSummary = nlapiLoadSearch('customrecord_job', 'customsearch_job_inv_review_exp_amt_test');
        } else if (zeeName_firstletter == 'A' || zeeName_firstletter == 'B' || zeeName_firstletter == 'C' || zeeName_firstletter == 'D' || zeeName_firstletter == 'E' || zeeName_firstletter == 'F') {
            var searchedSummary = nlapiLoadSearch('customrecord_job', 'customsearch_job_inv_review_exp_amt_a_f');
        } else if (zeeName_firstletter == 'G' || zeeName_firstletter == 'H' || zeeName_firstletter == 'I' || zeeName_firstletter == 'J' || zeeName_firstletter == 'K' || zeeName_firstletter == 'L' || zeeName_firstletter == 'M') {
            var searchedSummary = nlapiLoadSearch('customrecord_job', 'customsearch_job_inv_review_exp_amt_g_m');
        } else if (zeeName_firstletter == 'N' || zeeName_firstletter == 'O' || zeeName_firstletter == 'P' || zeeName_firstletter == 'Q' || zeeName_firstletter == 'R') {
            var searchedSummary = nlapiLoadSearch('customrecord_job', 'customsearch_job_inv_review_exp_amt_n_r');
        } else if (zeeName_firstletter == 'S' || zeeName_firstletter == 'T' || zeeName_firstletter == 'U' || zeeName_firstletter == 'V' || zeeName_firstletter == 'W' || zeeName_firstletter == 'X' || zeeName_firstletter == 'Y' || zeeName_firstletter == 'Z') {
            var searchedSummary = nlapiLoadSearch('customrecord_job', 'customsearch_job_inv_review_exp_amt_s_z');
        }

        //var zee_record = nlapiLoadRecord('partner', zee);

        //var zee_text = zee_record.getFieldValue('entitytitle');

        var strFormula = "COALESCE({custrecord_job_service.custrecord_service_franchisee},{custrecord_job_group.custrecord_jobgroup_franchisee},{custrecord_job_franchisee},'')";

        var newFilters = new Array();
        if (!isNullorEmpty(start_date) && !isNullorEmpty(end_date)) {

            newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorafter', start_date);
            newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorbefore', end_date);
        }
        //newFilters[newFilters.length] = new nlobjSearchFilter('formulatext', null, 'is', zee_text).setFormula(strFormula);
        newFilters[newFilters.length] = new nlobjSearchFilter("partner", "CUSTRECORD_JOB_CUSTOMER", "anyof", zee);

        searchedSummary.addFilters(newFilters);

        var resultSet = searchedSummary.runSearch();

        form.addField('zee', 'text', 'zee').setDisplayType('hidden').setDefaultValue(zee);

        var startReview = true;
        var startFinalize = false;

        var countCustomers = 0;
        var countTotalJobsInvoiceable = 0;

        var old_customer_id;
        var old_service_id;
        var old_service_rate;
        var old_service_qty;
        var old_extra_qty;
        var old_service_type;
        var old_customer_name;
        var old_ID;
        var old_service_text;
        var old_package_id;
        var old_package_single_line;
        var old_package_period;
        var old_package_fix_rate;
        var old_invoice_id;
        var old_invoice_text;

        var old_sc_ID;
        var old_sc_entity_id;
        var old_sc_name;
        var old_sc_company_name;

        var old_date_reviewed;

        var global_gst = 0.10;


        var total_per_customer = 0.0;
        var total_comm_per_customer = 0.0;
        var old_invoice_total = 0.0;
        var total_gst = 0.0;

        var reviewed = false;
        var review = false;
        var edit = null;
        var edit_count = 0;
        var reviewed_count = 0;
        var invoiced = false;

        var single_line_discount = false;

        var total_monthly_invoice = 0.0;
        var total_monthly_comm = 0.0

        var old_invoiceable;
        var old_jobGroupStatus;

        var service_count = 0;
        var service_unique_count = 0;

        var admin_fees_result = false;

        var old_admin_fees;
        var old_invoice_custom;
        var old_customer_partner;

        var zee_comm_array = [];

        var invoiced_count = 0;

        /**
         * Goes through the list of jobs for the selected month. Search: Job - Invoicing Review - Summary.
         * @function resultSet
         * @param  {Array} searchResult    Each result from the search
         * @return {Boolean}               true
         */
        resultSet.forEachResult(function(searchResult) {
            var customerInternalID = searchResult.getValue('internalid', 'CUSTRECORD_JOB_CUSTOMER', 'group');
            var specialCustomerInternalID = searchResult.getValue("custrecord_job_special_customer", null, "GROUP");
            var specialCustomerName = searchResult.getText("custrecord_job_special_customer", null, "GROUP");
            var partner = searchResult.getValue('partner', 'CUSTRECORD_JOB_CUSTOMER', 'group');
            var ID = searchResult.getValue('entityid', 'CUSTRECORD_JOB_CUSTOMER', 'group');
            var scID = searchResult.getValue("entityid", "CUSTRECORD_JOB_SPECIAL_CUSTOMER", "GROUP");
            var companyName = searchResult.getValue('companyname', 'CUSTRECORD_JOB_CUSTOMER', 'group');
            var specialCompanyName = searchResult.getValue('companyname', 'CUSTRECORD_JOB_SPECIAL_CUSTOMER', 'group');
            var customerName = searchResult.getText('custrecord_job_customer', null, 'group');
            var dateReviewed = searchResult.getValue('custrecord_job_date_reviewed', null, 'group');
            var invoiceable = searchResult.getText('custrecord_job_invoiceable', null, 'group');
            var jobGroupStatus = searchResult.getValue('custrecord_jobgroup_status', 'CUSTRECORD_JOB_GROUP', 'group');
            var inv_if_incomplete = searchResult.getValue("custrecord_service_package_inv_incomplet", "CUSTRECORD_JOB_SERVICE_PACKAGE", "GROUP");
            var dateInvFinalised = searchResult.getValue('custrecord_job_date_inv_finalised', null, 'group');
            var dateInvoiced = searchResult.getValue('custrecord_job_date_invoiced', null, 'group');
            //No. of Jobs that does not have Date Reviewed
            var countJobsNoDateReviewed = searchResult.getValue('formulanumeric', null, 'sum');
            //Total No. of Jobs
            var countJobs = searchResult.getValue('internalid', null, 'count');

            var service_id = searchResult.getValue('custrecord_job_service', null, 'group');
            var service_text = searchResult.getText('custrecord_job_service', null, 'group');
            var service_category = searchResult.getValue("custrecord_job_service_category", null, "GROUP");
            var service_type = searchResult.getValue("custrecord_service", "CUSTRECORD_JOB_SERVICE", "GROUP");
            if (isNullorEmpty(searchResult.getValue('formulanumeric', null, 'SUM'))) {
                var service_qty = 0;
            } else {
                var service_qty = parseFloat(searchResult.getValue('formulanumeric', null, 'SUM'));
            }
            if (isNullorEmpty(searchResult.getValue('custrecord_job_service_price', null, 'group'))) {
                var service_rate = 0.0;
                var body = 'Customer Name: ' + companyName + '/ Customer ID: ' + customerInternalID + ' | Service Name: ' + service_text + ' / Service ID: ' + service_id + ' has Null Service Price.';

                nlapiSendEmail(112209, ['ankith.ravindran@mailplus.com.au', 'willian.suryadharma@mailplus.com.au'], 'AIC Summary Page - Customer: ' + companyName + ' with Null Service Price', body, null);
            } else {
                var service_rate = parseFloat(searchResult.getValue('custrecord_job_service_price', null, 'group'));
            }

            if (isNullorEmpty(searchResult.getValue('custrecord_job_extras_qty', null, 'SUM'))) {
                var extra_qty = 0;
            } else {
                var extra_qty = parseFloat(searchResult.getValue('custrecord_job_extras_qty', null, 'SUM'));
            }

            var date_inv_finalised = searchResult.getValue('custrecord_job_date_inv_finalised', null, 'GROUP');
            var date_invoiced = searchResult.getValue('custrecord_job_date_invoiced', null, 'GROUP');
            var date_reviewed = searchResult.getValue("formuladate", null, "GROUP");

            var package_id = searchResult.getValue('custrecord_job_service_package', null, 'GROUP');

            var package_single_line = searchResult.getValue('custrecord_job_invoice_single_line_item', null, 'GROUP');
            var package_period = searchResult.getValue('custrecord_service_package_disc_period', 'CUSTRECORD_JOB_SERVICE_PACKAGE', 'GROUP');
            if (isNullorEmpty(searchResult.getValue('custrecord_service_package_fix_mth_rate', 'CUSTRECORD_JOB_SERVICE_PACKAGE', 'GROUP'))) {
                var package_fix_rate = 0.0
            } else {
                var package_fix_rate = parseFloat(searchResult.getValue('custrecord_service_package_fix_mth_rate', 'CUSTRECORD_JOB_SERVICE_PACKAGE', 'GROUP'));
            }

            var invoice_id = searchResult.getValue("internalid", "CUSTRECORD_JOB_INVOICE", "GROUP");
            var invoice_text = searchResult.getValue("tranid", "CUSTRECORD_JOB_INVOICE", "GROUP");
            if (isNullorEmpty(searchResult.getValue("amount", "CUSTRECORD_JOB_INVOICE", "GROUP"))) {
                var invoice_total = 0.0;
            } else {
                var invoice_total = parseFloat(searchResult.getValue("amount", "CUSTRECORD_JOB_INVOICE", "GROUP"));
            }

            var gst = searchResult.getValue("custrecord_service_gst", "CUSTRECORD_JOB_SERVICE", "GROUP");
            if (isNullorEmpty(searchResult.getValue("custentity_admin_fees", "CUSTRECORD_JOB_CUSTOMER", "GROUP"))) {
                var admin_fees = 0.0;
            } else {
                var admin_fees = parseFloat(searchResult.getValue("custentity_admin_fees", "CUSTRECORD_JOB_CUSTOMER", "GROUP"));
            }
            var invoice_custom = searchResult.getValue("custrecord_job_invoice_custom", null, "GROUP");
            var customer_partner = searchResult.getValue("partner", "CUSTRECORD_JOB_CUSTOMER", "GROUP");

            if (isNullorEmpty(invoice_custom)) {
                invoice_custom = '';
            }

            var zee_comm = parseFloat(searchResult.getValue('formulapercent', null, 'GROUP'));

            if (companyName == 'B & R Enclosures Pty Ltd - Heathwood') {
                nlapiLogExecution('DEBUG', 'service_id', service_id); //569
                nlapiLogExecution('DEBUG', 'service_text', service_text); //569
                nlapiLogExecution('DEBUG', 'package_id', package_id); //569
                nlapiLogExecution('DEBUG', 'package_single_line', package_single_line); //1
                nlapiLogExecution('DEBUG', 'package_period', package_period); //1
                nlapiLogExecution('DEBUG', 'package_fix_rate', package_fix_rate); //9
                nlapiLogExecution('DEBUG', 'service_type', service_type); //9
            }

            zee_comm_array[zee_comm_array.length] = zee_comm;
            if (countCustomers == 0) {

                if (isNullorEmpty(package_id)) {
                    if (invoiceable == 'Yes' || (isNullorEmpty(invoiceable) && jobGroupStatus == '1') || (isNullorEmpty(invoiceable) && service_category != '1')) {
                        // var service_type = nlapiLookupField('customrecord_service', service_id, 'custrecord_service');
                        if (service_type == 22) {
                            admin_fees_result = true;
                        }
                        var total_per_line = (service_rate * (service_qty + extra_qty))
                        if (gst != 'No') {
                            total_per_customer = total_per_customer + (total_per_line + (total_per_line * global_gst));
                            total_comm_per_customer = total_comm_per_customer + ((zee_comm * (total_per_line + (total_per_line * global_gst))) / 100);
                        } else {
                            total_per_customer = (total_per_customer + total_per_line);
                            total_comm_per_customer = total_comm_per_customer + ((zee_comm * total_per_line) / 100);
                        }
                    }
                } else {
                    if (package_single_line == '1') {
                        // var service_type = nlapiLookupField('customrecord_service', service_id, 'custrecord_service');
                        if (service_type == 17) {
                            single_line_discount = true;
                            var total_per_line = (service_rate * (service_qty + extra_qty))
                            if (gst != 'No') {
                                total_per_customer = total_per_customer + (total_per_line + (total_per_line * global_gst));
                                total_comm_per_customer = total_comm_per_customer + ((zee_comm * (total_per_line + (total_per_line * global_gst))) / 100);
                            } else {
                                total_per_customer = (total_per_customer + total_per_line);
                                total_comm_per_customer = total_comm_per_customer + ((zee_comm * total_per_line) / 100);
                            }
                        } else {
                            service_unique_count++;
                            if (package_period != 3) {
                                if (invoiceable == 'Yes' || (isNullorEmpty(invoiceable) && jobGroupStatus == '1') || (inv_if_incomplete == '1')) {
                                    service_count += (service_qty + extra_qty);
                                }
                            } else {
                                service_count = 1;
                            }
                        }
                    } else {
                        if (service_type == 17) {
                            single_line_discount = true;
                        }
                        if (single_line_discount == true) {
                            if (invoiceable == 'Yes' || (isNullorEmpty(invoiceable) && jobGroupStatus == '1') || (isNullorEmpty(invoiceable) && service_category != '1')) {
                                var total_per_line = (service_rate * (service_qty + extra_qty));
                                if (gst != 'No') {
                                    total_per_customer = total_per_customer + (total_per_line + (total_per_line * global_gst));
                                    total_comm_per_customer = total_comm_per_customer + ((zee_comm * (total_per_line + (total_per_line * global_gst))) / 100);
                                } else {
                                    total_per_customer = (total_per_customer + total_per_line);
                                    total_comm_per_customer = total_comm_per_customer + ((zee_comm * total_per_line) / 100);
                                }
                            }
                        } else {
                            service_unique_count++;
                            if (package_period != 3) {
                                if (invoiceable == 'Yes' || (isNullorEmpty(invoiceable) && jobGroupStatus == '1') || (inv_if_incomplete == '1')) {
                                    service_count += (service_qty + extra_qty);
                                }
                            } else {
                                service_count = 1;
                            }
                        }
                    }
                }
            } else {

                if (old_customer_id != customerInternalID) {


                    // nlapiLogExecution('DEBUG', 'zee', zee);

                    // if (zee == old_customer_partner) {
                    var customer_locked = '';
                    var lock_class = '';
                    // } else {
                    //  var customer_locked = 'yes';
                    //  var lock_class = 'glyphicon glyphicon-lock';
                    // }

                    if (single_line_discount == false) {
                        if (old_customer_name == 'B & R Enclosures Pty Ltd - Heathwood') {
                            nlapiLogExecution('AUDIT', 'service_count', service_count);
                            nlapiLogExecution('AUDIT', 'service_unique_count', service_unique_count);
                        }
                        if (service_count > 1) {
                            service_count = service_count / service_unique_count;
                        }
                        if (old_customer_name == 'B & R Enclosures Pty Ltd - Heathwood') {
                            nlapiLogExecution('AUDIT', 'service_count', service_count);
                            nlapiLogExecution('AUDIT', 'total_per_customer', total_per_customer);
                            nlapiLogExecution('AUDIT', 'old_package_fix_rate', old_package_fix_rate);
                            nlapiLogExecution('AUDIT', 'zee_comm', zee_comm);
                        }
                        total_per_customer = total_per_customer + ((old_package_fix_rate * service_count) * 1.1);
                        total_comm_per_customer = total_comm_per_customer + (((zee_comm * ((old_package_fix_rate * service_count))) / 100) * 1.1);
                    }

                    var unique_zee_comm_array = [];
                    unique_zee_comm_array = zee_comm_array.filter(function(elem, index, self) {
                        return index == self.indexOf(elem);
                    });

                    var min_zee_comm = Math.min(unique_zee_comm_array);

                    if (!isNullorEmpty(old_admin_fess) && admin_fees_result == false && isNullorEmpty(old_date_reviewed)) {
                        total_per_customer = total_per_customer + (old_admin_fess * 1.1);
                        total_comm_per_customer = total_comm_per_customer + (((min_zee_comm * (old_admin_fess)) / 100) * 1.1);
                    }

                    if (old_customer_name == 'B & R Enclosures Pty Ltd - Heathwood') {
                        nlapiLogExecution('DEBUG', 'total_per_customer for customer: ' + old_customer_name, total_per_customer);

                        // if(old_customer_id == 518069){
                        nlapiLogExecution('AUDIT', 'invoiced', invoiced);
                        nlapiLogExecution('AUDIT', 'old_invoice_custom', old_invoice_custom);
                        nlapiLogExecution('AUDIT', 'old_invoice_total', old_invoice_total);
                        nlapiLogExecution('AUDIT', 'total_per_customer', total_per_customer);
                    }
                    // }

                    if (invoiced == true) {
                        if (isNullorEmpty(old_sc_ID)) {
                            inlineQty += '<tr><td><a href="' + baseURL + '/app/common/entity/custjob.nl?id=' + old_customer_id + '" target="_blank"><p style="text-align:left;">' + old_ID + '</p></a></td><td><p style="text-align:left;">' + old_customer_name + '</p></td>';

                        } else {
                            inlineQty += '<tr><td><a href="' + baseURL + '/app/common/entity/custjob.nl?id=' + old_sc_ID + '" target="_blank"><p style="text-align:left;">' + old_sc_entity_id + '</p></a></td><td><p style="text-align:left;">' + old_sc_company_name + '</p></td>';
                        }


                        if (old_invoice_custom == 2 || isNullorEmpty(old_invoice_custom)) {
                            inlineQty += '<td><button type="button" id="invoice_customer" onclick="onclickContinueReview(' + old_customer_id + ',\'yes\', ' + old_sc_ID + ')" class="form-control btn btn-success active invoice_customer ">INVOICED  <span class="glyphicon glyphicon-lock"></span></button></td>';
                        } else {
                            inlineQty += '<td><button type="button" id="invoice_customer"  onclick="onclickContinueReview(' + old_customer_id + ',\'yes\', ' + old_sc_ID + ')" class="form-control btn btn-default invoice_customer active">CUSTOM INVOICE  <span class="glyphicon glyphicon-lock"></span></button></td>';
                        }
                        if (roundTwoDec(total_per_customer) == roundTwoDec(old_invoice_total)) {
                            inlineQty += '<td><div class="input-group"><span class="input-group-addon">$</span><input type="number" style="text-align:right;" class="form-control total_monthly_invoice" value="' + (total_per_customer).toFixed(2) + '" readonly /></div></td><td><div class="input-group"><span class="input-group-addon">$</span><input type="number" style="text-align:right;" class="form-control total_monthly_invoice" value="' + (total_comm_per_customer).toFixed(2) + '" readonly /></div></td>';
                            if (isNullorEmpty(old_invoice_id)) {
                                inlineQty += '<td>NO INVOICE</td></tr>';
                            } else {
                                inlineQty += '<td><a href="' + baseURL + '/app/accounting/transactions/custinvc.nl?id=' + old_invoice_id + '" target="_blank">' + old_invoice_text + '</a></td></tr>';
                            }

                        } else {
                            inlineQty += '<td><div class="input-group"><span class="input-group-addon">$</span><input type="number" style="text-align:right;" class="form-control total_monthly_invoice" value="' + (old_invoice_total).toFixed(2) + '" readonly /></div></td><td><div class="input-group"><span class="input-group-addon">$</span><input type="number" style="text-align:right;" class="form-control total_monthly_invoice" value="' + (total_comm_per_customer).toFixed(2) + '" readonly /></div></td>';
                            if (isNullorEmpty(old_invoice_id)) {
                                inlineQty += '<td>NO INVOICE</td></tr>';
                            } else {
                                inlineQty += '<td><a href="' + baseURL + '/app/accounting/transactions/custinvc.nl?id=' + old_invoice_id + '" target="_blank">' + old_invoice_text + '</a></td></tr>';
                            }
                        }
                    } else if (reviewed == true) {
                        if (isNullorEmpty(old_sc_ID)) {
                            inlineQty += '<tr><td><a href="' + baseURL + '/app/common/entity/custjob.nl?id=' + old_customer_id + '" target="_blank"><p style="text-align:left;">' + old_ID + '</p></a></td><td><p style="text-align:left;">' + old_customer_name + '</p></td><td><input type="button" id="invoice_customer" value="FINALISED" onclick="onclickContinueReview(' + old_customer_id + ',\'yes\', ' + old_sc_ID + ')" class="form-control btn btn-info invoice_customer"> </td>';

                        } else {
                            inlineQty += '<tr><td><a href="' + baseURL + '/app/common/entity/custjob.nl?id=' + old_sc_ID + '" target="_blank"><p style="text-align:left;">' + old_sc_entity_id + '</p></a></td><td><p style="text-align:left;">' + old_sc_company_name + '</p></td><td><input type="button" id="invoice_customer" value="FINALISED" onclick="onclickContinueReview(' + old_customer_id + ',\'yes\',' + old_sc_ID + ')" class="form-control btn btn-info invoice_customer"> </td>';
                        }


                        inlineQty += '<td><div class="input-group"><span class="input-group-addon">$</span><input type="number" style="text-align:right;" class="form-control total_monthly_invoice" value="' + (total_per_customer).toFixed(2) + '" readonly /></div></td><td><div class="input-group"><span class="input-group-addon">$</span><input type="number" style="text-align:right;" class="form-control total_monthly_invoice" value="' + (total_comm_per_customer).toFixed(2) + '" readonly /></div></td><td>' + old_invoice_id + '</td></tr>';


                    } else if (edit == true) {
                        if (isNullorEmpty(old_sc_ID)) {
                            inlineQty += '<tr><td><a href="' + baseURL + '/app/common/entity/custjob.nl?id=' + old_customer_id + '" target="_blank"><p style="text-align:left;">' + old_ID + '</p></a></td><td><p style="text-align: left;">' + old_customer_name + '</p></td>';
                        } else {
                            inlineQty += '<tr><td><a href="' + baseURL + '/app/common/entity/custjob.nl?id=' + old_sc_ID + '" target="_blank"><p style="text-align:left;">' + old_sc_entity_id + '</p></a></td><td><p style="text-align: left;">' + old_sc_company_name + '</p></td>';
                        }


                        inlineQty += '<td><button type="button" id="invoice_customer" value="EDIT" onclick="onclickContinueReview(' + old_customer_id + ', \'' + customer_locked + '\', ' + old_sc_ID + ')" class="form-control btn btn-primary invoice_customer">EDIT <span class="' + lock_class + '"></span></button></td><td><div class="input-group"><span class="input-group-addon">$</span><input type="number" class="form-control total_monthly_invoice" style="text-align:right;" value="' + (total_per_customer).toFixed(2) + '" readonly /></div></td><td><div class="input-group"><span class="input-group-addon">$</span><input type="number" class="form-control total_monthly_invoice" style="text-align:right;" value="' + (total_comm_per_customer).toFixed(2) + '" readonly /></div></td><td>' + old_invoice_id + '</td></tr>';
                    } else {
                        if (isNullorEmpty(old_sc_ID)) {
                            inlineQty += '<tr><td><a href="' + baseURL + '/app/common/entity/custjob.nl?id=' + old_customer_id + '" target="_blank"><p style="text-align:left;">' + old_ID + '</p></a></td><td><p style="text-align: left;">' + old_customer_name + '</p></td>';
                        } else {
                            inlineQty += '<tr><td><a href="' + baseURL + '/app/common/entity/custjob.nl?id=' + old_sc_ID + '" target="_blank"><p style="text-align:left;">' + old_sc_entity_id + '</p></a></td><td><p style="text-align: left;">' + old_sc_company_name + '</p></td>';
                        }

                        inlineQty += '<td><button type="button" id="invoice_customer" value="REVIEW" onclick="onclickContinueReview(' + old_customer_id + ', \'' + customer_locked + '\', ' + old_sc_ID + ')" class="form-control btn btn-danger invoice_customer">REVIEW <span class="' + lock_class + '"></span></button> </td><td><div class="input-group"><span class="input-group-addon">$</span><input type="number" class="form-control total_monthly_invoice" style="text-align:right;" value="' + (total_per_customer).toFixed(2) + '" readonly /></div></td><td><div class="input-group"><span class="input-group-addon">$</span><input type="number" class="form-control total_monthly_invoice" style="text-align:right;" value="' + (total_comm_per_customer).toFixed(2) + '" readonly /></div></td><td>' + old_invoice_id + '</td></tr>';
                    }

                    total_monthly_invoice += total_per_customer;
                    total_monthly_comm += total_comm_per_customer;

                    total_per_customer = 0.0;
                    total_comm_per_customer = 0.0;
                    reviewed = false;
                    edit = null;
                    invoiced = false;
                    single_line_discount = false;
                    service_count = 0;
                    service_unique_count = 0;
                    admin_fees_result = false;

                    zee_comm_array = [];

                    if (isNullorEmpty(package_id)) {
                        if (invoiceable == 'Yes' || (isNullorEmpty(invoiceable) && jobGroupStatus == '1') || (isNullorEmpty(invoiceable) && service_category != '1')) {
                            // var service_type = nlapiLookupField('customrecord_service', service_id, 'custrecord_service');
                            if (service_type == 22) {
                                admin_fees_result = true;
                            }
                            var total_per_line = (service_rate * (service_qty + extra_qty))
                            if (gst != 'No') {
                                total_per_customer = total_per_customer + (total_per_line + (total_per_line * global_gst));
                                total_comm_per_customer = total_comm_per_customer + ((zee_comm * (total_per_line + (total_per_line * global_gst))) / 100);
                            } else {
                                total_per_customer = (total_per_customer + total_per_line);
                                total_comm_per_customer = total_comm_per_customer + ((zee_comm * total_per_line) / 100);
                            }
                        }
                    } else {
                        if (package_single_line == '1') {
                            // var service_type = nlapiLookupField('customrecord_service', service_id, 'custrecord_service');
                            if (service_type == 17) {
                                single_line_discount = true;
                                var total_per_line = (service_rate * (service_qty + extra_qty))
                                if (gst != 'No') {
                                    total_per_customer = total_per_customer + (total_per_line + (total_per_line * global_gst));
                                    total_comm_per_customer = total_comm_per_customer + ((zee_comm * (total_per_line + (total_per_line * global_gst))) / 100);
                                } else {
                                    total_per_customer = (total_per_customer + total_per_line);
                                    total_comm_per_customer = total_comm_per_customer + ((zee_comm * total_per_line) / 100);
                                }
                            } else {
                                service_unique_count++;
                                if (package_period != 3) {
                                    if (invoiceable == 'Yes' || (isNullorEmpty(invoiceable) && jobGroupStatus == '1') || (inv_if_incomplete == '1')) {
                                        service_count += (service_qty + extra_qty);
                                    }
                                } else {
                                    service_count = 1;
                                }
                            }
                        } else {
                            if (service_type == 17) {
                                single_line_discount = true;
                            }
                            if (single_line_discount == true) {
                                if (invoiceable == 'Yes' || (isNullorEmpty(invoiceable) && jobGroupStatus == '1') || (isNullorEmpty(invoiceable) && service_category != '1')) {
                                    var total_per_line = (service_rate * (service_qty + extra_qty));
                                    if (gst != 'No') {
                                        total_per_customer = total_per_customer + (total_per_line + (total_per_line * global_gst));
                                        total_comm_per_customer = total_comm_per_customer + ((zee_comm * (total_per_line + (total_per_line * global_gst))) / 100);
                                    } else {
                                        total_per_customer = (total_per_customer + total_per_line);
                                        total_comm_per_customer = total_comm_per_customer + ((zee_comm * total_per_line) / 100);
                                    }
                                }
                            } else {
                                service_unique_count++;
                                if (package_period != 3) {
                                    if (invoiceable == 'Yes' || (isNullorEmpty(invoiceable) && jobGroupStatus == '1') || (inv_if_incomplete == '1')) {
                                        service_count += (service_qty + extra_qty);
                                    }
                                } else {
                                    service_count = 1;
                                }
                            }
                        }
                    }
                } else {

                    if (old_sc_ID != specialCustomerInternalID) {

                        if (old_customer_name == 'B & R Enclosures Pty Ltd - Heathwood') {
                            nlapiLogExecution('DEBUG', 'Inside Special Customer');
                        }
                        // nlapiLogExecution('DEBUG', 'zee', zee);

                        // if (zee == old_customer_partner) {
                        var customer_locked = '';
                        var lock_class = '';
                        // } else {
                        //  var customer_locked = 'yes';
                        //  var lock_class = 'glyphicon glyphicon-lock';
                        // }

                        if (single_line_discount == false) {
                            if (service_count > 1) {
                                service_count = service_count / service_unique_count;
                            }
                            total_per_customer = total_per_customer + ((old_package_fix_rate * service_count) * 1.1);
                            total_comm_per_customer = total_comm_per_customer + (((zee_comm * ((old_package_fix_rate * service_count))) / 100) * 1.1);
                        }

                        var unique_zee_comm_array = [];
                        unique_zee_comm_array = zee_comm_array.filter(function(elem, index, self) {
                            return index == self.indexOf(elem);
                        });

                        var min_zee_comm = Math.min(unique_zee_comm_array);

                        if (!isNullorEmpty(old_admin_fess) && admin_fees_result == false && isNullorEmpty(old_date_reviewed)) {
                            total_per_customer = total_per_customer + (old_admin_fess * 1.1);
                            total_comm_per_customer = total_comm_per_customer + (((min_zee_comm * (old_admin_fess)) / 100) * 1.1);
                        }

                        // nlapiLogExecution('DEBUG', 'SC - total_per_customer for customer: ' + old_sc_name, total_per_customer);

                        if (invoiced == true) {
                            if (isNullorEmpty(old_sc_ID)) {
                                inlineQty += '<tr><td><a href="' + baseURL + '/app/common/entity/custjob.nl?id=' + old_customer_id + '" target="_blank"><p style="text-align:left;">' + old_ID + '</p></a></td><td><p style="text-align:left;">' + old_customer_name + '</p></td>';

                            } else {
                                inlineQty += '<tr><td><a href="' + baseURL + '/app/common/entity/custjob.nl?id=' + old_sc_ID + '" target="_blank"><p style="text-align:left;">' + old_sc_entity_id + '</p></a></td><td><p style="text-align:left;">' + old_sc_company_name + '</p></td>';
                            }


                            if (old_invoice_custom == 2 || isNullorEmpty(old_invoice_custom)) {
                                inlineQty += '<td><button type="button" id="invoice_customer" onclick="onclickContinueReview(' + old_customer_id + ',\'yes\')" class="form-control btn btn-success active invoice_customer ">INVOICED  <span class="glyphicon glyphicon-lock"></span></button></td>';
                            } else {
                                inlineQty += '<td><button type="button" id="invoice_customer"  onclick="onclickContinueReview(' + old_customer_id + ',\'yes\')" class="form-control btn btn-default invoice_customer active">CUSTOM INVOICE  <span class="glyphicon glyphicon-lock"></span></button></td>';
                            }
                            if (roundTwoDec(total_per_customer) == roundTwoDec(old_invoice_total)) {
                                inlineQty += '<td><div class="input-group"><span class="input-group-addon">$</span><input type="number" style="text-align:right;" class="form-control total_monthly_invoice" value="' + (total_per_customer).toFixed(2) + '" readonly /></div></td><td><div class="input-group"><span class="input-group-addon">$</span><input type="number" style="text-align:right;" class="form-control total_monthly_invoice" value="' + (total_comm_per_customer).toFixed(2) + '" readonly /></div></td>';
                                if (isNullorEmpty(old_invoice_id)) {
                                    inlineQty += '<td>NO INVOICE</td></tr>';
                                } else {
                                    inlineQty += '<td><a href="' + baseURL + '/app/accounting/transactions/custinvc.nl?id=' + old_invoice_id + '" target="_blank">' + old_invoice_text + '</a></td></tr>';
                                }

                            } else {
                                inlineQty += '<td><div class="input-group"><span class="input-group-addon">$</span><input type="number" style="text-align:right;" class="form-control total_monthly_invoice" value="' + (old_invoice_total).toFixed(2) + '" readonly /></div></td><td><div class="input-group"><span class="input-group-addon">$</span><input type="number" style="text-align:right;" class="form-control total_monthly_invoice" value="' + (total_comm_per_customer).toFixed(2) + '" readonly /></div></td>';
                                if (isNullorEmpty(old_invoice_id)) {
                                    inlineQty += '<td>NO INVOICE</td></tr>';
                                } else {
                                    inlineQty += '<td><a href="' + baseURL + '/app/accounting/transactions/custinvc.nl?id=' + old_invoice_id + '" target="_blank">' + old_invoice_text + '</a></td></tr>';
                                }
                            }
                        } else if (reviewed == true) {
                            if (isNullorEmpty(old_sc_ID)) {
                                inlineQty += '<tr><td><a href="' + baseURL + '/app/common/entity/custjob.nl?id=' + old_customer_id + '" target="_blank"><p style="text-align:left;">' + old_ID + '</p></a></td><td><p style="text-align:left;">' + old_customer_name + '</p></td><td><input type="button" id="invoice_customer" value="FINALISED" onclick="onclickContinueReview(' + old_customer_id + ',\'yes\', ' + old_sc_ID + ')" class="form-control btn btn-info invoice_customer"> </td>';

                            } else {
                                inlineQty += '<tr><td><a href="' + baseURL + '/app/common/entity/custjob.nl?id=' + old_sc_ID + '" target="_blank"><p style="text-align:left;">' + old_sc_entity_id + '</p></a></td><td><p style="text-align:left;">' + old_sc_company_name + '</p></td><td><input type="button" id="invoice_customer" value="FINALISED" onclick="onclickContinueReview(' + old_customer_id + ',\'yes\', ' + old_sc_ID + ')" class="form-control btn btn-info invoice_customer"> </td>';
                            }


                            inlineQty += '<td><div class="input-group"><span class="input-group-addon">$</span><input type="number" style="text-align:right;" class="form-control total_monthly_invoice" value="' + (total_per_customer).toFixed(2) + '" readonly /></div></td><td><div class="input-group"><span class="input-group-addon">$</span><input type="number" style="text-align:right;" class="form-control total_monthly_invoice" value="' + (total_comm_per_customer).toFixed(2) + '" readonly /></div></td><td>' + old_invoice_id + '</td></tr>';


                        } else if (edit == true) {
                            if (isNullorEmpty(old_sc_ID)) {
                                inlineQty += '<tr><td><a href="' + baseURL + '/app/common/entity/custjob.nl?id=' + old_customer_id + '" target="_blank"><p style="text-align:left;">' + old_ID + '</p></a></td><td><p style="text-align: left;">' + old_customer_name + '</p></td>';
                            } else {
                                inlineQty += '<tr><td><a href="' + baseURL + '/app/common/entity/custjob.nl?id=' + old_sc_ID + '" target="_blank"><p style="text-align:left;">' + old_sc_entity_id + '</p></a></td><td><p style="text-align: left;">' + old_sc_company_name + '</p></td>';
                            }


                            inlineQty += '<td><button type="button" id="invoice_customer" value="EDIT" onclick="onclickContinueReview(' + old_customer_id + ', \'' + customer_locked + '\', ' + old_sc_ID + ')" class="form-control btn btn-primary invoice_customer">EDIT <span class="' + lock_class + '"></span></button></td><td><div class="input-group"><span class="input-group-addon">$</span><input type="number" class="form-control total_monthly_invoice" style="text-align:right;" value="' + (total_per_customer).toFixed(2) + '" readonly /></div></td><td><div class="input-group"><span class="input-group-addon">$</span><input type="number" class="form-control total_monthly_invoice" style="text-align:right;" value="' + (total_comm_per_customer).toFixed(2) + '" readonly /></div></td><td>' + old_invoice_id + '</td></tr>';
                        } else {
                            if (isNullorEmpty(old_sc_ID)) {
                                inlineQty += '<tr><td><a href="' + baseURL + '/app/common/entity/custjob.nl?id=' + old_customer_id + '" target="_blank"><p style="text-align:left;">' + old_ID + '</p></a></td><td><p style="text-align: left;">' + old_customer_name + '</p></td>';
                            } else {
                                inlineQty += '<tr><td><a href="' + baseURL + '/app/common/entity/custjob.nl?id=' + old_sc_ID + '" target="_blank"><p style="text-align:left;">' + old_sc_entity_id + '</p></a></td><td><p style="text-align: left;">' + old_sc_company_name + '</p></td>';
                            }

                            inlineQty += '<td><button type="button" id="invoice_customer" value="REVIEW" onclick="onclickContinueReview(' + old_customer_id + ', \'' + customer_locked + '\', ' + old_sc_ID + ')" class="form-control btn btn-danger invoice_customer">REVIEW <span class="' + lock_class + '"></span></button> </td><td><div class="input-group"><span class="input-group-addon">$</span><input type="number" class="form-control total_monthly_invoice" style="text-align:right;" value="' + (total_per_customer).toFixed(2) + '" readonly /></div></td><td><div class="input-group"><span class="input-group-addon">$</span><input type="number" class="form-control total_monthly_invoice" style="text-align:right;" value="' + (total_comm_per_customer).toFixed(2) + '" readonly /></div></td><td>' + old_invoice_id + '</td></tr>';
                        }

                        total_monthly_invoice += total_per_customer;
                        total_monthly_comm += total_comm_per_customer;

                        total_per_customer = 0.0;
                        total_comm_per_customer = 0.0;
                        reviewed = false;
                        edit = null;
                        invoiced = false;
                        single_line_discount = false;
                        service_count = 0;
                        service_unique_count = 0;
                        admin_fees_result = false;

                        zee_comm_array = [];

                        if (isNullorEmpty(package_id)) {
                            if (invoiceable == 'Yes' || (isNullorEmpty(invoiceable) && jobGroupStatus == '1') || (isNullorEmpty(invoiceable) && service_category != '1')) {
                                // var service_type = nlapiLookupField('customrecord_service', service_id, 'custrecord_service');
                                if (service_type == 22) {
                                    admin_fees_result = true;
                                }
                                var total_per_line = (service_rate * (service_qty + extra_qty))
                                if (gst != 'No') {
                                    total_per_customer = total_per_customer + (total_per_line + (total_per_line * global_gst));
                                    total_comm_per_customer = total_comm_per_customer + ((zee_comm * (total_per_line + (total_per_line * global_gst))) / 100);
                                } else {
                                    total_per_customer = (total_per_customer + total_per_line);
                                    total_comm_per_customer = total_comm_per_customer + ((zee_comm * total_per_line) / 100);
                                }
                            }
                        } else {
                            if (package_single_line == '1') {
                                // var service_type = nlapiLookupField('customrecord_service', service_id, 'custrecord_service');
                                if (service_type == 17) {
                                    single_line_discount = true;
                                    var total_per_line = (service_rate * (service_qty + extra_qty))
                                    if (gst != 'No') {
                                        total_per_customer = total_per_customer + (total_per_line + (total_per_line * global_gst));
                                        total_comm_per_customer = total_comm_per_customer + ((zee_comm * (total_per_line + (total_per_line * global_gst))) / 100);
                                    } else {
                                        total_per_customer = (total_per_customer + total_per_line);
                                        total_comm_per_customer = total_comm_per_customer + ((zee_comm * total_per_line) / 100);
                                    }
                                } else {
                                    if (package_period != 3) {
                                        if (invoiceable == 'Yes' || (isNullorEmpty(invoiceable) && jobGroupStatus == '1') || (inv_if_incomplete == '1')) {
                                            service_count += (service_qty + extra_qty);
                                        }
                                    } else {
                                        service_count = 1;
                                    }
                                }
                            } else {
                                if (service_type == 17) {
                                    single_line_discount = true;
                                }
                                if (single_line_discount == true) {
                                    if (invoiceable == 'Yes' || (isNullorEmpty(invoiceable) && jobGroupStatus == '1') || (isNullorEmpty(invoiceable) && service_category != '1')) {
                                        var total_per_line = (service_rate * (service_qty + extra_qty));
                                        if (gst != 'No') {
                                            total_per_customer = total_per_customer + (total_per_line + (total_per_line * global_gst));
                                            total_comm_per_customer = total_comm_per_customer + ((zee_comm * (total_per_line + (total_per_line * global_gst))) / 100);
                                        } else {
                                            total_per_customer = (total_per_customer + total_per_line);
                                            total_comm_per_customer = total_comm_per_customer + ((zee_comm * total_per_line) / 100);
                                        }
                                    }
                                } else {
                                    if (package_period != 3) {
                                        if (invoiceable == 'Yes' || (isNullorEmpty(invoiceable) && jobGroupStatus == '1') || (inv_if_incomplete == '1')) {
                                            service_count += (service_qty + extra_qty);
                                        }
                                    } else {
                                        service_count = 1;
                                    }
                                }
                            }
                        }
                    } else if (old_service_id != service_id) {

                        if (old_customer_name == 'B & R Enclosures Pty Ltd - Heathwood') {
                            nlapiLogExecution('DEBUG', 'Inside New Services', old_service_text);
                        }
                        // var service_type = nlapiLookupField('customrecord_service', service_id, 'custrecord_service');

                        // var old_service_type = nlapiLookupField('customrecord_service', old_service_id, 'custrecord_service');

                        if (old_package_id != package_id) {
                            if (old_customer_name == 'B & R Enclosures Pty Ltd - Heathwood') {
                                nlapiLogExecution('AUDIT', 'End of Packages');
                                nlapiLogExecution('AUDIT', 'service_count', service_count);
                                nlapiLogExecution('AUDIT', 'service_unique_count', service_unique_count);
                                nlapiLogExecution('AUDIT', 'total_per_customer', total_per_customer);
                                nlapiLogExecution('AUDIT', 'total_comm_per_customer', total_comm_per_customer);
                            }
                            if (single_line_discount == false) {
                                if (service_count > 1) {
                                    service_count = service_count / service_unique_count;
                                }
                                total_per_customer = total_per_customer + ((old_package_fix_rate * service_count) * 1.1);
                                total_comm_per_customer = total_comm_per_customer + (((zee_comm * ((old_package_fix_rate * service_count))) / 100) * 1.1);
                            }
                            single_line_discount = false;
                            service_count = 0;
                            service_unique_count = 0;
                            if (old_customer_name == 'B & R Enclosures Pty Ltd - Heathwood') {
                                nlapiLogExecution('AUDIT', 'End of Packages');
                                nlapiLogExecution('AUDIT', 'total_per_customer', total_per_customer);
                                nlapiLogExecution('AUDIT', 'total_comm_per_customer', total_comm_per_customer);
                            }
                        }

                        service_unique_count++;

                        if (isNullorEmpty(package_id)) {
                            if (invoiceable == 'Yes' || (isNullorEmpty(invoiceable) && jobGroupStatus == '1') || (isNullorEmpty(invoiceable) && service_category != '1')) {

                                if (old_customer_name == 'B & R Enclosures Pty Ltd - Heathwood') {
                                    nlapiLogExecution('AUDIT', 'Inside Non Packages Invoiceable Yes or Status Completed or Extras');
                                    nlapiLogExecution('AUDIT', 'total_comm_per_customer', total_comm_per_customer);
                                    nlapiLogExecution('AUDIT', 'total_per_customer', total_per_customer);
                                    nlapiLogExecution('AUDIT', 'invoiceable', invoiceable);
                                    nlapiLogExecution('AUDIT', 'jobGroupStatus', jobGroupStatus);
                                    nlapiLogExecution('AUDIT', 'service_category', service_category);
                                }
                                // var service_type = nlapiLookupField('customrecord_service', service_id, 'custrecord_service');
                                if (service_type == 22) {
                                    admin_fees_result = true;
                                }
                                var total_per_line = (service_rate * (service_qty + extra_qty));
                                if (gst != 'No') {
                                    total_per_customer = total_per_customer + (total_per_line + (total_per_line * global_gst));
                                    total_comm_per_customer = total_comm_per_customer + ((zee_comm * (total_per_line + (total_per_line * global_gst))) / 100);
                                } else {
                                    total_per_customer = (total_per_customer + total_per_line);
                                    total_comm_per_customer = total_comm_per_customer + ((zee_comm * total_per_line) / 100);
                                }
                            }

                        } else {

                            if (package_single_line == '1') {
                                if (old_customer_name == 'B & R Enclosures Pty Ltd - Heathwood') {
                                    nlapiLogExecution('DEBUG', 'Package Single Line is 1');
                                }
                                if (service_type == 17) {
                                    single_line_discount = true;

                                    var total_per_line = (service_rate * (service_qty + extra_qty))
                                    if (gst != 'No') {
                                        total_per_customer = total_per_customer + (total_per_line + (total_per_line * global_gst));
                                        total_comm_per_customer = total_comm_per_customer + ((zee_comm * (total_per_line + (total_per_line * global_gst))) / 100);
                                    } else {
                                        total_per_customer = (total_per_customer + total_per_line);
                                        total_comm_per_customer = total_comm_per_customer + ((zee_comm * total_per_line) / 100);
                                    }
                                } else {
                                    if (package_period != 3) {
                                        if (invoiceable == 'Yes' || (isNullorEmpty(invoiceable) && jobGroupStatus == '1') || (inv_if_incomplete == '1')) {
                                            service_count += (service_qty + extra_qty);
                                        }
                                    } else {
                                        service_count = 1;
                                    }
                                }
                                if (old_customer_name == 'B & R Enclosures Pty Ltd - Heathwood') {
                                    nlapiLogExecution('DEBUG', 'Package Single Line is 1. Service Count: ', service_count);
                                }

                            } else {
                                if (old_customer_name == 'B & R Enclosures Pty Ltd - Heathwood') {
                                    nlapiLogExecution('DEBUG', 'Package Single Line is 0');
                                }
                                if (service_type == 17) {
                                    single_line_discount = true;
                                }
                                if (single_line_discount == true) {
                                    if (invoiceable == 'Yes' || (isNullorEmpty(invoiceable) && jobGroupStatus == '1') || (isNullorEmpty(invoiceable) && service_category != '1')) {
                                        var total_per_line = (service_rate * (service_qty + extra_qty));
                                        if (gst != 'No') {
                                            total_per_customer = total_per_customer + (total_per_line + (total_per_line * global_gst));
                                            total_comm_per_customer = total_comm_per_customer + ((zee_comm * (total_per_line + (total_per_line * global_gst))) / 100);
                                        } else {
                                            total_per_customer = (total_per_customer + total_per_line);
                                            total_comm_per_customer = total_comm_per_customer + ((zee_comm * total_per_line) / 100);
                                        }
                                    }
                                } else {
                                    if (package_period != 3) {
                                        if (invoiceable == 'Yes' || (isNullorEmpty(invoiceable) && jobGroupStatus == '1') || (inv_if_incomplete == '1')) {
                                            service_count += (service_qty + extra_qty);
                                        }
                                    } else {
                                        service_count = 1;
                                    }
                                }
                            }
                        }

                    } else {
                        if (old_customer_name == 'B & R Enclosures Pty Ltd - Heathwood') {
                            nlapiLogExecution('DEBUG', 'Last Extra');
                        }
                        if (old_package_id != package_id) {
                            if (single_line_discount == false) {
                                if (service_count > 1 && service_unique_count != 0) {
                                    service_count = service_count / service_unique_count;
                                }
                                total_per_customer = total_per_customer + ((old_package_fix_rate * service_count) * 1.1);
                                total_comm_per_customer = total_comm_per_customer + (((zee_comm * ((old_package_fix_rate * service_count))) / 100) * 1.1);
                            }
                            single_line_discount = false;
                            service_count = 0;
                            service_unique_count = 0;
                        }

                        service_unique_count++;
                        if (isNullorEmpty(package_id)) {
                            if (invoiceable == 'Yes' || (isNullorEmpty(invoiceable) && jobGroupStatus == '1') || (isNullorEmpty(invoiceable) && service_category != '1')) {
                                var total_per_line = (service_rate * (service_qty + extra_qty));
                                if (gst != 'No') {
                                    total_per_customer = total_per_customer + (total_per_line + (total_per_line * global_gst));
                                    total_comm_per_customer = total_comm_per_customer + ((zee_comm * (total_per_line + (total_per_line * global_gst))) / 100);
                                } else {
                                    total_per_customer = (total_per_customer + total_per_line);
                                    total_comm_per_customer = total_comm_per_customer + ((zee_comm * total_per_line) / 100);
                                }
                            }
                        } else {
                            if (old_package_single_line == '1') {
                                if (service_type == 17) {
                                    single_line_discount = true;

                                    var total_per_line = (service_rate * (service_qty + extra_qty));
                                    if (gst != 'No') {
                                        total_per_customer = total_per_customer + (total_per_line + (total_per_line * global_gst));
                                        total_comm_per_customer = total_comm_per_customer + ((zee_comm * (total_per_line + (total_per_line * global_gst))) / 100);
                                    } else {
                                        total_per_customer = (total_per_customer + total_per_line);
                                        total_comm_per_customer = total_comm_per_customer + ((zee_comm * total_per_line) / 100);
                                    }

                                } else {
                                    // service_unique_count++;
                                    if (package_period != 3) {
                                        if (invoiceable == 'Yes' || (isNullorEmpty(invoiceable) && jobGroupStatus == '1') || (inv_if_incomplete == '1')) {
                                            service_count += (service_qty + extra_qty);
                                        }
                                    } else {
                                        service_count = 1;
                                    }
                                }

                            } else {
                                if (single_line_discount == true) {
                                    if (invoiceable == 'Yes' || (isNullorEmpty(invoiceable) && jobGroupStatus == '1')) {
                                        var total_per_line = (service_rate * (service_qty + extra_qty));
                                        if (gst != 'No') {
                                            total_per_customer = total_per_customer + (total_per_line + (total_per_line * global_gst));
                                            total_comm_per_customer = total_comm_per_customer + ((zee_comm * (total_per_line + (total_per_line * global_gst))) / 100);
                                        } else {
                                            total_per_customer = (total_per_customer + total_per_line);
                                            total_comm_per_customer = total_comm_per_customer + ((zee_comm * total_per_line) / 100);
                                        }
                                    }
                                } else {
                                    // service_unique_count++;
                                    if (package_period != 3) {
                                        if (invoiceable == 'Yes' || (isNullorEmpty(invoiceable) && jobGroupStatus == '1') || (inv_if_incomplete == '1')) {
                                            service_count += (service_qty + extra_qty);
                                        }
                                    } else {
                                        service_count = 1;
                                    }
                                }
                            }
                        }

                    }
                }
            }

            old_customer_id = customerInternalID;
            old_service_id = service_id;
            old_service_type = service_type;
            old_service_rate = service_rate;
            old_service_qty = service_qty;
            old_extra_qty = extra_qty;
            old_customer_name = companyName;
            old_ID = ID;
            old_service_text = service_text;
            old_package_id = package_id;
            old_package_single_line = package_single_line;
            old_package_period = package_period;
            old_package_fix_rate = package_fix_rate;
            old_invoice_id = invoice_id;
            old_invoice_text = invoice_text;
            old_invoiceable = invoiceable;
            old_jobGroupStatus = jobGroupStatus;
            old_admin_fess = admin_fees;
            old_invoice_total = invoice_total;
            old_invoice_custom = invoice_custom;
            old_customer_partner = customer_partner;
            old_date_reviewed = dateReviewed;

            old_sc_ID = specialCustomerInternalID;
            old_sc_name = specialCustomerName;
            old_sc_entity_id = scID;
            old_sc_company_name = specialCompanyName;


            if (!isNullorEmpty(date_invoiced)) {
                invoiced = true;
                invoiced_count++;
            } else if (!isNullorEmpty(date_inv_finalised)) {
                reviewed = true;
                reviewed_count++;
            }

            if (!isNullorEmpty(date_reviewed) && edit != false) {
                edit = true;
                edit_count++;
            } else {
                edit = false;
            }

            countCustomers++;
            return true;
        });


        if (countCustomers > 0) {
            var admin_fess = nlapiLookupField('customer', old_customer_id, 'custentity_admin_fees');
            // if (zee == old_customer_partner) {
            var customer_locked = '';
            var lock_class = '';
            // } else {
            //  var customer_locked = 'yes';
            //  var lock_class = 'glyphicon glyphicon-lock';
            // }

            var unique_zee_comm_array = [];
            unique_zee_comm_array = zee_comm_array.filter(function(elem, index, self) {
                return index == self.indexOf(elem);
            });

            var min_zee_comm = Math.min(unique_zee_comm_array);

            if (!isNullorEmpty(old_admin_fess) && admin_fees_result == false && isNullorEmpty(old_date_reviewed)) {
                total_per_customer = total_per_customer + (old_admin_fess * 1.1);
                total_comm_per_customer = total_comm_per_customer + (((min_zee_comm * (old_admin_fess)) / 100) * 1.1);
            }

            if (invoiced == true) {
                if (isNullorEmpty(old_sc_ID)) {
                    inlineQty += '<tr><td><a href="' + baseURL + '/app/common/entity/custjob.nl?id=' + old_customer_id + '" target="_blank"><p style="text-align:left;">' + old_ID + '</p></a></td><td><p style="text-align:left;">' + old_customer_name + '</p></td>';

                } else {
                    inlineQty += '<tr><td><a href="' + baseURL + '/app/common/entity/custjob.nl?id=' + old_sc_ID + '" target="_blank"><p style="text-align:left;">' + old_sc_entity_id + '</p></a></td><td><p style="text-align:left;">' + old_sc_company_name + '</p></td>';
                }


                if (old_invoice_custom == 2 || isNullorEmpty(old_invoice_custom)) {
                    inlineQty += '<td><button type="button" id="invoice_customer" onclick="onclickContinueReview(' + old_customer_id + ',\'yes\', ' + old_sc_ID + ')" class="form-control btn btn-success active invoice_customer ">INVOICED  <span class="glyphicon glyphicon-lock"></span></button></td>';
                } else {
                    inlineQty += '<td><button type="button" id="invoice_customer"  onclick="onclickContinueReview(' + old_customer_id + ',\'yes\', ' + old_sc_ID + ')" class="form-control btn btn-default invoice_customer active">CUSTOM INVOICE  <span class="glyphicon glyphicon-lock"></span></button></td>';
                }
                if (roundTwoDec(total_per_customer) == roundTwoDec(old_invoice_total)) {
                    inlineQty += '<td><div class="input-group"><span class="input-group-addon">$</span><input type="number" style="text-align:right;" class="form-control total_monthly_invoice" value="' + (total_per_customer).toFixed(2) + '" readonly /></div></td><td><div class="input-group"><span class="input-group-addon">$</span><input type="number" style="text-align:right;" class="form-control total_monthly_invoice" value="' + (total_comm_per_customer).toFixed(2) + '" readonly /></div></td>';
                    if (isNullorEmpty(old_invoice_id)) {
                        inlineQty += '<td>NO INVOICE</td></tr>';
                    } else {
                        inlineQty += '<td><a href="' + baseURL + '/app/accounting/transactions/custinvc.nl?id=' + old_invoice_id + '" target="_blank">' + old_invoice_text + '</a></td></tr>';
                    }

                } else {
                    inlineQty += '<td><div class="input-group"><span class="input-group-addon">$</span><input type="number" style="text-align:right;" class="form-control total_monthly_invoice" value="' + (old_invoice_total).toFixed(2) + '" readonly /></div></td><td><div class="input-group"><span class="input-group-addon">$</span><input type="number" style="text-align:right;" class="form-control total_monthly_invoice" value="' + (total_comm_per_customer).toFixed(2) + '" readonly /></div></td>';
                    if (isNullorEmpty(old_invoice_id)) {
                        inlineQty += '<td>NO INVOICE</td></tr>';
                    } else {
                        inlineQty += '<td><a href="' + baseURL + '/app/accounting/transactions/custinvc.nl?id=' + old_invoice_id + '" target="_blank">' + old_invoice_text + '</a></td></tr>';
                    }
                }
            } else if (reviewed == true) {
                if (isNullorEmpty(old_sc_ID)) {
                    inlineQty += '<tr><td><a href="' + baseURL + '/app/common/entity/custjob.nl?id=' + old_customer_id + '" target="_blank"><p style="text-align:left;">' + old_ID + '</p></a></td><td><p style="text-align:left;">' + old_customer_name + '</p></td><td><input type="button" id="invoice_customer" value="FINALISED" onclick="onclickContinueReview(' + old_customer_id + ',\'yes\', ' + old_sc_ID + ')" class="form-control btn btn-info invoice_customer"> </td>';

                } else {
                    inlineQty += '<tr><td><a href="' + baseURL + '/app/common/entity/custjob.nl?id=' + old_sc_ID + '" target="_blank"><p style="text-align:left;">' + old_sc_entity_id + '</p></a></td><td><p style="text-align:left;">' + old_sc_company_name + '</p></td><td><input type="button" id="invoice_customer" value="FINALISED" onclick="onclickContinueReview(' + old_customer_id + ',\'yes\', ' + old_sc_ID + ')" class="form-control btn btn-info invoice_customer"> </td>';
                }


                inlineQty += '<td><div class="input-group"><span class="input-group-addon">$</span><input type="number" style="text-align:right;" class="form-control total_monthly_invoice" value="' + (total_per_customer).toFixed(2) + '" readonly /></div></td><td><div class="input-group"><span class="input-group-addon">$</span><input type="number" style="text-align:right;" class="form-control total_monthly_invoice" value="' + (total_comm_per_customer).toFixed(2) + '" readonly /></div></td><td>' + old_invoice_id + '</td></tr>';


            } else if (edit == true) {
                if (isNullorEmpty(old_sc_ID)) {
                    inlineQty += '<tr><td><a href="' + baseURL + '/app/common/entity/custjob.nl?id=' + old_customer_id + '" target="_blank"><p style="text-align:left;">' + old_ID + '</p></a></td><td><p style="text-align: left;">' + old_customer_name + '</p></td>';
                } else {
                    inlineQty += '<tr><td><a href="' + baseURL + '/app/common/entity/custjob.nl?id=' + old_sc_ID + '" target="_blank"><p style="text-align:left;">' + old_sc_entity_id + '</p></a></td><td><p style="text-align: left;">' + old_sc_company_name + '</p></td>';
                }


                inlineQty += '<td><button type="button" id="invoice_customer" value="EDIT" onclick="onclickContinueReview(' + old_customer_id + ', \'' + customer_locked + '\', ' + old_sc_ID + ')" class="form-control btn btn-primary invoice_customer">EDIT <span class="' + lock_class + '"></span></button></td><td><div class="input-group"><span class="input-group-addon">$</span><input type="number" class="form-control total_monthly_invoice" style="text-align:right;" value="' + (total_per_customer).toFixed(2) + '" readonly /></div></td><td><div class="input-group"><span class="input-group-addon">$</span><input type="number" class="form-control total_monthly_invoice" style="text-align:right;" value="' + (total_comm_per_customer).toFixed(2) + '" readonly /></div></td><td>' + old_invoice_id + '</td></tr>';
            } else {
                if (isNullorEmpty(old_sc_ID)) {
                    inlineQty += '<tr><td><a href="' + baseURL + '/app/common/entity/custjob.nl?id=' + old_customer_id + '" target="_blank"><p style="text-align:left;">' + old_ID + '</p></a></td><td><p style="text-align: left;">' + old_customer_name + '</p></td>';
                } else {
                    inlineQty += '<tr><td><a href="' + baseURL + '/app/common/entity/custjob.nl?id=' + old_sc_ID + '" target="_blank"><p style="text-align:left;">' + old_sc_entity_id + '</p></a></td><td><p style="text-align: left;">' + old_sc_company_name + '</p></td>';
                }

                inlineQty += '<td><button type="button" id="invoice_customer" value="REVIEW" onclick="onclickContinueReview(' + old_customer_id + ', \'' + customer_locked + '\', ' + old_sc_ID + ')" class="form-control btn btn-danger invoice_customer">REVIEW <span class="' + lock_class + '"></span></button> </td><td><div class="input-group"><span class="input-group-addon">$</span><input type="number" class="form-control total_monthly_invoice" style="text-align:right;" value="' + (total_per_customer).toFixed(2) + '" readonly /></div></td><td><div class="input-group"><span class="input-group-addon">$</span><input type="number" class="form-control total_monthly_invoice" style="text-align:right;" value="' + (total_comm_per_customer).toFixed(2) + '" readonly /></div></td><td>' + old_invoice_id + '</td></tr>';
            }
            total_monthly_invoice += total_per_customer;
            total_monthly_comm += total_comm_per_customer;
        } else {
            inlineQty += '<tr><td></td><td></td><td><b>NO CUSTOMERS TO REVIEW</b></td><td></td><td></td><td></td></tr>';
        }


        inlineQty += '</tbody>';
        inlineQty += '</table></div><br/>';

        inlinehtml2 += '<br/><label>Total Exp Invoice Amount</label><div class="input-group"><span class="input-group-addon">$</span><input type="number" class="form-control total_monthly_invoice" value="' + (total_monthly_invoice).toFixed(2) + '" readonly /></div>';
        inlinehtml2 += '<label>Total Exp Distribution Amount</label><div class="input-group"><span class="input-group-addon">$</span><input type="number" class="form-control total_monthly_comm" value="' + (total_monthly_comm).toFixed(2) + '" readonly /></div>';
        inlinehtml2 += '<div><button type="button" id="dailyrevenue" value="DAILY REVENUE" class="form-control btn btn-primary" style="margin-top: 10px">Daily Revenue</button></div>';

        var edit_progress = 0.0;
        var remaining_progress = 0.0;
        var reviewed_progress = 0.0;
        var invoiced_progress = 0.0;

        edit_progress = (edit_count / countCustomers) * 100;
        remaining_progress = ((countCustomers - edit_count) / countCustomers) * 100;
        reviewed_progress = (reviewed_count / countCustomers) * 100;
        invoiced_progress = (invoiced_count / countCustomers) * 100;

        if (edit_progress > 0.00 && edit_progress < 100.00) {
            inlinehtml2 += '</br><label>Review Progress</label><div class="progress"><div class="progress-bar" style="width: ' + edit_progress + '%">' + edit_progress.toFixed(2) + '% </div><div class="progress-bar progress-bar-danger" style="width: ' + remaining_progress + '%">' + remaining_progress.toFixed(2) + '% (Remaining)</div></div>';
        }

        if (reviewed_progress > 0.00 && reviewed_progress < 100.00) {
            inlinehtml2 += '</br><label>Reviewed Progress</label><div class="progress"><div class="progress-bar progress-bar-info" style="width: ' + reviewed_progress + '%">' + reviewed_progress.toFixed(2) + '% </div></div>';
        }

        if (invoiced_progress > 0.00 && invoiced_progress < 100.00) {
            inlinehtml2 += '</br><label>Invoiced Progress</label><div class="progress"><div class="progress-bar progress-bar-success" style="width: ' + invoiced_progress + '%">' + invoiced_progress.toFixed(2) + '%</div></div></div>';
        }

        form.addField('custpage_html2', 'inlinehtml').setPadding(1).setLayoutType('outsideabove').setDefaultValue(inlinehtml2);

        form.addField('preview_table', 'inlinehtml', '').setLayoutType('outsidebelow', 'startrow').setDefaultValue(inlineQty);
        form.addField('partner', 'text', 'Partner').setDisplayType('hidden').setDefaultValue(zee);

        if (countCustomers == countTotalJobsInvoiceable) {
            startFinalize = true;
        }

        // nlapiLogExecution('DEBUG', 'reviewed_count', reviewed_count);
        // nlapiLogExecution('DEBUG', 'countCustomers', countCustomers);
        // nlapiLogExecution('DEBUG', 'edit_count', edit_count);
        // nlapiLogExecution('DEBUG', 'invoiced_count', invoiced_count);


        if (countCustomers == edit_count && countCustomers != 0) {
            var button = finalise_date();
            if (button == true || role == 3 || role == 1032 || zee == 6 || zee == 425904) {

                //WS Edit: should not be && on invoiced_count
                //if (reviewed_count > 0 && invoiced_count > 0) { 

                // if(role == 3){
                //  form.addSubmitButton('FINALISE');
                //  form.addButton('finalise', 'FINALISE', 'onclick_Finalise()');
                // }

                if (reviewed_count > 0 || invoiced_count == countCustomers) {
                    //DONT SHOW FINALISE BUTTON
                } else {
                    // if (role == 3) {
                    form.addSubmitButton('FINALISE');
                    form.addButton('finalise', 'FINALISE', 'onclick_Finalise()');
                    // }
                }
            }
        } else if (edit_count == 0 && countCustomers != 0) {
            form.addButton('cust_back1', 'START REVIEW', 'onclickContinueReview()');
        } else if (edit_count > 0 && reviewed_count == 0) {
            form.addButton('cust_back1', 'CONTINUE REVIEW', 'onclickContinueReview()');
        }



        form.setScript('customscript_cl_summary_page');

        response.writePage(form);
        var end_time = Date.now();
        nlapiLogExecution('DEBUG', 'loading_time', end_time - start_time);
    } else {

        var partner = request.getParameter('partner');
        var start_date = request.getParameter('start_date');
        var end_date = request.getParameter('end_date');

        /**
         * [params description] - Paramters that needs to be passed to the scheduled script to set the date Invoiced
         * @type {Object}
         */
        var params = {
            custscript_partner: partner,
            custscript_startdate: start_date,
            custscript_enddate: end_date
        }

        // var taskRecord = nlapiCreateRecord('task', {
        //  recordmode: 'dynamic'
        // })

        // taskRecord.setFieldValue('custevent_invoicing_complete', 'T');
        // taskRecord.setFieldValue('custevent2', 2);
        // taskRecord.setFieldValue('title', 'Invoicing Completed');
        // taskRecord.setFieldValue('assigned', zee);

        // nlapiSubmitRecord(taskRecord);
        // 


        /**
         * [status description] -  Schedule Script to set the date Invoiced for all the jobs associated to the franchisee for that invoicing period.
         */

        // for (var x = 1; x <= 10; x++) {
        // var status = nlapiScheduleScript('customscript_sc_date_inv_finalised', 'customdeploy' + x, params);

        // if (status == 'QUEUED') {
        nlapiSendEmail(112209, ['ankith.ravindran@mailplus.com.au'], 'Invoicing Complete: ' + partner, null, null);
        var params = new Array();
        params['custevent_invoicing_complete'] = 'T';
        nlapiSetRedirectURL('RECORD', 'task',
            null,
            true,
            params);
        // break;
        // }
        // }
        // var status = nlapiScheduleScript('customscript_sc_date_inv_finalised', 'customdeploy1', params);
        // nlapiLogExecution('AUDIT', 'status', status);
        // if (status == 'QUEUED') {

        //  // nlapiSetRedirectURL('TASKLINK', 'CARD_-29');
        //  // 
        //  var params = new Array();
        //  params['custevent_invoicing_complete'] = 'T';
        //  nlapiSetRedirectURL('RECORD', 'task',
        //      null,
        //      true,
        //      params);
        //  return false;
        // } else {
        //  var params = new Array();
        //  params['custevent_invoicing_complete'] = 'T';
        //  nlapiSetRedirectURL('RECORD', 'task',
        //      null,
        //      true,
        //      params);
        // }
    }
}

//To check if todays date falls between the below criteria.
function finalise_date() {

    var date = new Date();

    if (date.getHours() > 6) {
        date = nlapiAddDays(date, 1);
    }

    var month = date.getMonth(); //Months 0 - 11
    var today = date.getDate();
    var year = date.getFullYear();

    var lastDay = new Date(year, (month + 1), 0);


    if (lastDay.getDay() == 0) {
        lastDay.setDate(lastDay.getDate() - 2);
    } else if (lastDay.getDay() == 6) {
        lastDay.setDate(lastDay.getDate() - 1);
    }

    var lastWorkingDay = lastDay.getDate();

    lastDay.setDate(lastDay.getDate() + 5);


    var button = false;

    //If allocator run on the first day of the month, it takes the last month as the filter
    if (lastWorkingDay == today || today <= lastDay.getDate()) {
        button = true;
    }
    return button;
}

// Get the previous month first and last day
function start_end_date() {

    var date = new Date();

    var month = date.getMonth(); //Months 0 - 11
    var day = date.getDate();
    var year = date.getFullYear();

    if (day == 1 || day == 2 || day == 3 || day == 4 || day == 5) {
        if (month == 0) {
            month = 11;
            year = year - 1
        } else {
            month = month - 1;
        }
    }
    var firstDay = new Date(year, (month), 1);
    var lastDay = new Date(year, (month + 1), 0);

    var service_range = [];

    service_range[0] = nlapiDateToString(firstDay);
    service_range[1] = nlapiDateToString(lastDay);

    return service_range;
}