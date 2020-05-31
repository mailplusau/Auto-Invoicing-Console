/*
 * Module Description
 * 
 * Author: Ankith Ravindran
 *
 * NSVersion  Date                      Last Modified time                      
 * 1.00       2017-08-04 09:39:21       2017-08-04 09:39:21           
 *
 * Remarks: Main Review Page which lists down all the packages / services / extras performed for the customer for the invociing period.
 * 
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
nlapiLogExecution('DEBUG', 'zee', zee);

/**
 * [services_main_page description] - Main Review Page which lists down all the packages / services / extras performed for the customer for the invociing period.
 * @param  {String} request  when the page is loaded
 * @param  {String} response when the page is submitted
 */
function services_main_page(request, response) {

    if (request.getMethod() == "GET") {
        var start_time = Date.now();

        nlapiLogExecution('DEBUG', 'zee2', zee);
        nlapiLogExecution('DEBUG', 'role', role);

        var customer_id = request.getParameter('customer_id');
        if (!isNullorEmpty(request.getParameter('zee'))) {
            zee = request.getParameter('zee');
        }
        var locked = request.getParameter('locked');
        var scID = request.getParameter('sc');

        nlapiLogExecution('DEBUG', 'locked', locked);
        nlapiLogExecution('DEBUG', 'scID', scID);
        nlapiLogExecution('DEBUG', 'zee3', zee);

        var zee_record = nlapiLoadRecord('partner', parseInt(zee));

        var zee_text = zee_record.getFieldValue('entitytitle');
        if (!isNullorEmpty(scID)) {
            var customer_record = nlapiLoadRecord('customer', scID);
        } else {
            var customer_record = nlapiLoadRecord('customer', customer_id);
        }
        var adminFeesNotApplicable = customer_record.getFieldValue('custentity_inv_no_admin_fee');
        var poNumber = customer_record.getFieldValue('custentity11');
        var customer_zee = customer_record.getFieldValue('partner');

        // if(zee != customer_zee){
        //  locked = 'yes';
        // }

        if (isNullorEmpty(poNumber)) {
            poNumber = '';
        }

        var admin_fees_service_id = null;

        if (adminFeesNotApplicable == 1) {
            var customer_admin_fees = null;
        } else {
            var customer_admin_fees = customer_record.getFieldValue('custentity_admin_fees');
            var searched_services = nlapiLoadSearch('customrecord_service', 'customsearch_service_invoicing_add_srv_2');

            var newFilters = new Array();

            //Zee filter is used because Customer is owned by TEST and jobs for this customer belongs to both TEST and TEST-AR. So we pull out only the Admin Fees Service based on the zee logged in. 
            //
            //WS: Zee filter put in place to prevent current franchisee from retrieving previous franchisee's admin fees.
            //assumption: admin fee service record will not need to be replicated on new transfer workflow as AIC script already reads Account Admin Fee from customer record. 
            //
            if (!isNullorEmpty(scID)) {
                var admin_fees_customer = scID;
            } else {
                var admin_fees_customer = customer_id;
            }

            newFilters = [
                [
                    ["custrecord_service_franchisee", "anyof", zee], "AND", ["custrecord_service_customer", "is", admin_fees_customer], "AND", "NOT", ["custrecord_service_customer", "anyof", "@NONE@"]
                ],
                "AND", ["custrecord_service", "is", "22"], "AND", ["isinactive", "is", "F"]
            ];


            searched_services.setFilterExpression(newFilters);

            var resultSet = searched_services.runSearch();

            resultSet.forEachResult(function(searchResult) {
                admin_fees_service_id = searchResult.getValue('internalid');
                customer_admin_fees = parseFloat(searchResult.getValue('custrecord_service_price'));
                return true;
            });
        }
        var adminfees_time = Date.now();
        nlapiLogExecution('DEBUG', 'adminfees_time', adminfees_time - start_time);


        // nlapiLogExecution('DEBUG', 'customer_admin_fees', customer_admin_fees);


        var form = nlapiCreateForm('Review: ' + customer_record.getFieldValue('entityid') + ' ' + customer_record.getFieldValue('companyname'));

        form.addField('customer_id', 'text', 'Customer ID').setDisplayType('hidden').setDefaultValue(customer_id);
        form.addField('zee_id', 'text', 'Customer ID').setDisplayType('hidden').setDefaultValue(zee); //User/Role Zee
        //WS Edit: Hidden field for Zee on Customer
        form.addField('zee_cust', 'text', 'Customer ID').setDisplayType('hidden').setDefaultValue(customer_zee); //Customer Zee
        form.addField('locked', 'text', 'Customer ID').setDisplayType('hidden').setDefaultValue(locked);
        form.addField('admin_fees_not_applicable', 'text', 'Customer ID').setDisplayType('hidden').setDefaultValue(adminFeesNotApplicable);
        form.addField('scid', 'text', 'Customer ID').setDisplayType('hidden').setDefaultValue(scID);
        form.addField('start_date', 'text', 'start_date').setDisplayType('hidden').setDefaultValue(request.getParameter('start_date'));
        form.addField('end_date', 'text', 'end_date').setDisplayType('hidden').setDefaultValue(request.getParameter('end_date'));
        form.addField('extra_service_string', 'text', 'extra_service_string').setDisplayType('hidden');
        form.addField('extra_qty_string', 'text', 'extra_qty_string').setDisplayType('hidden');
        form.addField('extra_rate_string', 'text', 'extra_rate_string').setDisplayType('hidden');
        form.addField('delete_job_id_string', 'text', 'delete_job_id_string').setDisplayType('hidden');
        form.addField('delete_service_id_string', 'text', 'delete_service_id_string').setDisplayType('hidden');
        form.addField('review_button', 'text', 'review_button').setDisplayType('hidden').setDefaultValue("F");
        form.addField('customer_po', 'text', 'review_button').setDisplayType('hidden').setDefaultValue(poNumber);


        //New Jobs to be created from the client 
        form.addField('new_jobs_service_id_string', 'text', 'new_jobs_service_id_string').setDisplayType('hidden');
        form.addField('new_jobs_rate_string', 'text', 'new_jobs_rate_string').setDisplayType('hidden');
        form.addField('new_jobs_qty_string', 'text', 'new_jobs_qty_string').setDisplayType('hidden');
        form.addField('new_jobs_cat_string', 'text', 'new_jobs_cat_string').setDisplayType('hidden');
        form.addField('new_jobs_descp_string', 'text', 'new_jobs_descp_string').setDisplayType('hidden');
        form.addField('new_jobs_package_id_string', 'text', 'new_jobs_package_id_string').setDisplayType('hidden');
        form.addField('new_jobs_single_line_string', 'text', 'new_jobs_single_line_string').setDisplayType('hidden');
        //New Services to be created from the client
        form.addField('new_service_type_string', 'text', 'new_service_type_string').setDisplayType('hidden');
        form.addField('new_service_name_string', 'text', 'new_service_name_string').setDisplayType('hidden');
        form.addField('new_service_price_string', 'text', 'new_service_price_string').setDisplayType('hidden');
        form.addField('new_service_package_id_string', 'text', 'new_service_package_id_string').setDisplayType('hidden');
        form.addField('new_service_customer_string', 'text', 'new_service_customer_string').setDisplayType('hidden');
        form.addField('new_service_comm_reg_string', 'text', 'new_service_comm_reg_string').setDisplayType('hidden');
        form.addField('new_service_qty_string', 'text', 'new_service_qty_string').setDisplayType('hidden');
        form.addField('new_service_discount_type_string', 'text', 'new_service_discount_type_string').setDisplayType('hidden');
        form.addField('new_service_single_line_string', 'text', 'new_service_single_line_string').setDisplayType('hidden');

        var inlinehtml2 = '<div class="se-pre-con"></div><button type="button" class="btn btn-sm btn-info instruction_button" data-toggle="collapse" data-target="#demo">Click for Instructions</button><div id="demo" style="background-color: #cfeefc !important;border: 1px solid #417ed9;padding: 10px 10px 10px 20px;width:98%;position:absolute" class="collapse"><b><u>Important Instructions:</u></b><ul><li><b>Review - Modify Invoice Qty using App Jobs</b><ul><li>Allows for better trace-ability as each Quantity invoiced can be traced to an in-field activity</li><li>For <b style="color:#5cb85c;">Completed</b> Jobs, set those you dont want to be calculated as part of the invoice quantity as <b>No</b></li><li>For <b style="color:#337ab7;">Partial</b>, <b style="color:#d9534f;">Incomplete</b> or <b style="color:#f0ad4e;">Scheduled</b> Jobs, set those you want to be calculated as part of the invoice quantity as <b>Yes</b></li><li>Total Invoiceable Quantity cannot be less than the Invoiceable Quantity that comes from the App. Modify the Invoice Quantity using the App Jobs.</li></ul></li><li><b>Add Services</b> - Allows users to add services not captured in the App</li><li><b>Add Extras</b> - Allows users to add extras not captured in the App</li><li><button type="button" class="btn btn-xs glyphicon glyphicon-plus" style="color: black;margin-bottom: 4px;" disabled></button> - Click to view Quantities that come from the App and distribution of the Total Invoiceable Quantity</li><li><button type="button" class="btn btn-xs glyphicon glyphicon-minus" style="color: black;margin-bottom: 4px;" disabled></button> - Click to collapse all the columns</li><li><button type="button" id="add_service" name="add_service" class="btn btn-xs btn-success" style="margin-bottom: 4px;" disabled>1<span class="badge" style="font-size: 10px;color: #a94342;background-color: #f2dede;border-style: solid;border-width: thin;">-1</span></button> - <span class="badge" style="font-size: 10px;color: #a94342;background-color: #f2dede;border-style: solid;border-width: thin;">-1</span> Shows the number of Jobs that have been made \"Invoiceable\" <b>NO</b></li><li><button type="button" id="add_service" name="add_service" value="1" class="btn btn-xs btn-primary" disabled>1<span class="badge" style="font-size: 10px;color: #5bb95b;background-color: #e0f1d8;font-weight: bolder;border-style: solid;border-width: thin;">+1</span></button> / <button type="button" id="add_service" name="add_service" value="1" class="btn btn-xs btn-danger" disabled>1<span class="badge" style="font-size: 10px;color: #5bb95b;background-color: #e0f1d8;font-weight: bolder;border-style: solid;border-width: thin;">+1</span></button> - <span class="badge" style="font-size: 10px;color: #5bb95b;background-color: #e0f1d8;font-weight: bolder;border-style: solid;border-width: thin;">+1</span> Shows the number of Jobs that have been made \"Invoiceable\" <b>YES</b></li></ul></div>';

        form.addField('custpage_html2', 'inlinehtml').setPadding(1).setLayoutType('outsideabove').setDefaultValue(inlinehtml2);
        // nlapiLogExecution('DEBUG', 'start_Date', nlapiStringToDate(request.getParameter('start_date')));

        //INITIALIZATION OF JQUERY AND BOOTSTRAP
        var inlineQty = '<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.11.1/jquery.min.js"><script src="//code.jquery.com/jquery-1.11.0.min.js"></script><link type="text/css" rel="stylesheet" href="https://cdn.datatables.net/1.10.13/css/jquery.dataTables.min.css"><link href="//netdna.bootstrapcdn.com/bootstrap/3.3.2/css/bootstrap.min.css" rel="stylesheet"><script src="//netdna.bootstrapcdn.com/bootstrap/3.3.2/js/bootstrap.min.js"></script></script><link type="text/css" rel="stylesheet" href="https://1048144.app.netsuite.com/core/media/media.nl?id=2090583&c=1048144&h=a0ef6ac4e28f91203dfe&_xt=.css"><br><br><style>table#stockcount {font-size:12px; text-align:center; border-color: #24385b} </style><div class="se-pre-con"></div><div class="modal fade bs-example-modal-sm" tabindex="-1" role="dialog" aria-labelledby="mySmallModalLabel" aria-hidden="true"><div class="modal-dialog modal-sm" role="document"><div class="modal-content" style="width: fit-content;width: -moz-fit-content;"><div class="modal-header"><button type="button" class="close" data-dismiss="modal" aria-label="Close"><span aria-hidden="true">&times;</span></button><h5 class="modal-title panel panel-info" id="exampleModalLabel">Information</h5></div><div class="modal-body"></div><div class="modal-footer"><button type="button" class="btn btn-default" data-dismiss="modal">Close</button></div></div></div></div><div class="table-responsive table_start"><table border="0" cellpadding="10" id="stockcount" cellspacing="0" class="table table-striped" style="width: 98%;position: absolute;">';
        inlineQty += '';

        nlapiLogExecution('AUDIT', 'zee', zee);
        nlapiLogExecution('AUDIT', 'customer_zee', customer_zee);
        nlapiLogExecution('AUDIT', 'scID', scID);
        nlapiLogExecution('AUDIT', 'adminFeesNotApplicable', adminFeesNotApplicable);

        if (isNullorEmpty(admin_fees_service_id) && isNullorEmpty(customer_admin_fees)) {
            if (adminFeesNotApplicable != 1 && customer_zee == zee) {
                inlineQty += '<div class="col-xs-3" style="text-align: center;vertical-align: middle;line-height: 35px;font-size: medium;font-weight: bold;">Invoicing Period</div><div class="col-xs-3"><input type="date" class="form-control start_date text-center" value="" disabled/></div><div class="col-xs-3"><input type="date" class="form-control end_date text-center" value="" disabled/></div><div class="col-xs-3"><button class="btn btn-primary btn-sm preview_row " type="button" data-toggle="tooltip" data-placement="right" ">Preview Invoice <span class="glyphicon glyphicon-new-window"></span></button></div><br/><br/><br/><br/><div class="col-xs-3" style="text-align: center;vertical-align: middle;line-height: 35px;font-size: larger;font-weight: bold;">Customer PO#</div><div class="col-xs-3"><input type="text" class="form-control customer_po text-center" value="' + poNumber + '" /></div><div class="col-xs-3" style="text-align: center;vertical-align: middle;line-height: 35px;font-size: larger;font-weight: bold;">Admin Fees Applicable?</div><div class="col-xs-3"><div class="btn-group btn-toggle"><button class="btn btn-sm btn-default admin_fees_on">YES</button><button class="btn btn-sm btn-success active admin_fees_off">NO</button></div></div>';

            } else {
                inlineQty += '<div class="col-xs-2" style="text-align: center;vertical-align: middle;line-height: 35px;font-size: medium;font-weight: bold;">Invoicing Period</div><div class="col-xs-2"><input type="date" class="form-control start_date text-center" value="" disabled/></div><div class="col-xs-2"><input type="date" class="form-control end_date text-center" value="" disabled/></div><div class="col-xs-2"><button class="btn btn-primary btn-sm preview_row " type="button" data-toggle="tooltip" data-placement="right" ">Preview Invoice <span class="glyphicon glyphicon-new-window"></span></button></div><br/><br/><br/><br/><div class="col-xs-2" style="text-align: center;vertical-align: middle;line-height: 35px;font-size: larger;font-weight: bold;">Customer PO#</div><div class="col-xs-2">';
                if (!isNullorEmpty(scID)) {
                    inlineQty += '<input type="text" class="form-control customer_po text-center"  readonly />';
                } else {
                    inlineQty += '<input type="text" class="form-control customer_po text-center" value="' + poNumber + '"  />';
                }
                inlineQty += '</div><div class="col-xs-2" style="text-align: center;vertical-align: middle;line-height: 35px;font-size: larger;font-weight: bold;">Admin Fees Applicable?</div><div class="col-xs-2"><div class="btn-group btn-toggle"><button class="btn btn-sm btn-default admin_fees_on" disabled>YES</button><button class="btn btn-sm btn-success active admin_fees_off" disabled>NO <span class="glyphicon glyphicon-lock"></span></button></div></div><div class="col-xs-4"><label class="control-label has-warning" style="color: #ff000099;">Customer not enabled for Account Admin Fee. Please contact Mailplus Finance Team for more information.</label>';
                // inlineQty += '<button class="btn btn-sm btn-danger glyphicon glyphicon-lock" disabled></button></div>';
            }

            form.addField('admin_fees_log', 'text', 'admin_fees_log').setDisplayType('hidden').setDefaultValue(false);
        } else {

            inlineQty += '<div class="col-xs-3" style="text-align: center;vertical-align: middle;line-height: 35px;font-size: medium;font-weight: bold;">Invoicing Period</div><div class="col-xs-3"><input type="date" class="form-control start_date text-center" value="" disabled/></div><div class="col-xs-3"><input type="date" class="form-control end_date text-center" value="" disabled/></div><div class="col-xs-3"><button class="btn btn-primary btn-sm preview_row " type="button" data-toggle="tooltip" data-placement="right" ">Preview Invoice <span class="glyphicon glyphicon-new-window"></span></button></div><br/><br/><br/><br/><div class="col-xs-3" style="text-align: center;vertical-align: middle;line-height: 35px;font-size: larger;font-weight: bold;">Customer PO#</div><div class="col-xs-3"><input type="text" class="form-control customer_po text-center" value="' + poNumber + '" /></div><div class="col-xs-3" style="text-align: center;vertical-align: middle;line-height: 35px;font-size: larger;font-weight: bold;">Admin Fees Applicable?</div><div class="col-xs-3"><div class="btn-group btn-toggle"><button class="btn btn-sm btn-success active admin_fees_on">YES</button><button class="btn btn-sm btn-default admin_fees_off">NO</button></div></div>';
            form.addField('admin_fees_log', 'text', 'admin_fees_log').setDisplayType('hidden').setDefaultValue(true);
        }

        inlineQty += '<input type="hidden" class="customer_admin_fees" value="' + customer_admin_fees + '" />';
        inlineQty += '';
        inlineQty += '</div><br/><br/><br/><br/>';

        //PACKAGE SECTION - TO CHECK IF HEADING IS REQUIRED OR NOT
        var searched_jobs = nlapiLoadSearch('customrecord_job', 'customsearch_job_invoicing_mainpage_2');

        var zee_record = nlapiLoadRecord('partner', zee);
        //nlapiLogExecution('DEBUG', 'zee', zee);
        var zee_text = zee_record.getFieldValue('entitytitle');
        //nlapiLogExecution('DEBUG', 'zee_text', zee_text);

        var strFormula = "COALESCE({custrecord_job_service.custrecord_service_franchisee},{custrecord_job_group.custrecord_jobgroup_franchisee},{custrecord_job_franchisee},'')";

        var newFilters = new Array();
        newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_customer', null, 'is', customer_id);
/*        if (role != 3 && role != 1032) {
            newFilters[newFilters.length] = new nlobjSearchFilter('formulatext', null, 'is', zee_text).setFormula(strFormula);
        }*/
        newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_service_package', null, 'noneof', '@NONE@');
        if (!isNullorEmpty(request.getParameter('start_date')) && !isNullorEmpty(request.getParameter('end_date'))) {

            newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorafter', nlapiStringToDate(request.getParameter('start_date')));
            newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorbefore', nlapiStringToDate(request.getParameter('end_date')));
        }

        if (!isNullorEmpty(scID)) {
            newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_special_customer', null, 'is', scID);
        } else {
            newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_special_customer', null, 'is', '@NONE@');
        }


        searched_jobs.addFilters(newFilters);


        var resultSet = searched_jobs.runSearch();

        var packageResult = resultSet.getResults(0, 1);

        // nlapiLogExecution('DEBUG', 'packageResult length', packageResult.length);

        //VARIABLES INITIALIZATION FOR THE PACKAGE SECTION
        var completed_qty = 0;
        var partial_qty = 0;
        var incomplete_qty = 0;
        var scheduled_qty = 0;
        var count = 0;
        var count_invoiceable = 0;
        var extra_qty = 0;
        var old_service_id = '';
        var old_invoiceable = '';
        var service_rate = 0;
        var service_count = 0;

        var service_status = '';
        var old_service_status = '';
        var old_single_line_invoiceable = '';
        var old_job_detail = '';
        var job_group = 0;
        var old_job_group = 0;
        var old_service_rate = 0;
        var service_qty = 0;
        var extra_service_qty = 0;
        var invoiceable_qty = 0;
        var invoiceable_service_qty = 0;
        var old_invoiceable_service_qty = 0;
        var invoiceable_extra_qty = 0;
        var old_invoiceable_extra_qty = 0;
        var old_netsuite_job_internalid = null;
        var temp_netsuite_job_internalid = null;
        var old_invoiceable_qty = 0;
        var old_extra_service_qty = 0;
        var old_service_qty = 0;
        var discount_job_price = null;
        var discount_job_type = null;
        var discount_job_extras_qty = null;
        var discount_job_single_line = null;
        var discount_job_id = null;
        var old_ns_item = null;
        var old_ns_item_id = null;
        var old_gst = null;

        var total_invoice = 0;
        var total_package = 0;
        var unique_service_count = [];
        var old_package;
        var old_package_text = '';
        var old_service_cat = '';
        var completed_icon = false;
        var partially_completed_icon = false;
        var incompleted_icon = false;
        var scheduled_icon = false;

        var discount_display_qty = 0;

        var discount_job_detail;
        var discount_period;
        var invoice_if_incomplete;

        var old_service_detail;
        var invoice_detail_set = false;

        var invoiceable_completed_count = 0;
        var invoiceable_incomplete_count = 0;
        var invoiceable_partial_count = 0;
        var invoiceable_scheduled_count = 0;

        var package_service_price_change = false;

        if (packageResult.length != 0) {


            //START OF THE TABLE
            // inlineQty += '<thead style="color: white;background-color: #607799;"><tr><td></td>'; Assign Package Col commented
            inlineQty += '<thead style="color: white;background-color: #607799;"><tr>';
            inlineQty += '<td></td><td></td><td></td>';
            inlineQty += '<td colspan="4" class="header_collapse"><b>APP QTY <span class="modal_display glyphicon glyphicon-info-sign" style="padding: 3px 3px 3px 3px;color: orange;cursor: pointer;" data-whatever="Quantities come from the App"></span><button type="button" class="btn btn-xs glyphicon glyphicon-minus collapse_all" style="color: black;margin-bottom: 4px;" data-toggle="tooltip" data-placement="top" title="Collapse Columns"></button></b></td>';
            inlineQty += '<td colspan="3" class="header_invoiceable_qty_collpase"><b>INVOICEABLE QTY <span class="modal_display glyphicon glyphicon-info-sign" style="padding: 3px 3px 3px 3px;color: orange;cursor: pointer;" data-whatever="Quantity taken for Invoicing Purposes"></span></b></td><td></td></tr>';
            inlineQty += '<tr style="font-size: smaller;">';
            // inlineQty += '<td>ASSIGN PACKAGE <span class="modal_display glyphicon glyphicon-info-sign" style="padding: 3px 3px 3px 3px;color: orange;cursor: pointer;" data-whatever=""></span></td>';
            inlineQty += '<td class="col-sm-1">SERVICE <span class="modal_display glyphicon glyphicon-info-sign" style="padding: 3px 3px 3px 3px;color: orange;cursor: pointer;" data-whatever="Name of the Service Performed"></span></td>';
            inlineQty += '<td class="col-sm-2">INVOICE DETAILS <span class="modal_display glyphicon glyphicon-info-sign" style="padding: 3px 3px 3px 3px;color: orange;cursor: pointer;" data-whatever=""></span></td>';
            inlineQty += '<td class="col-sm-2">RATE<span class="modal_display glyphicon glyphicon-info-sign" style="padding: 3px 3px 3px 3px;color: orange;cursor: pointer;" data-whatever="Price of the Service performed"></span></td>';
            inlineQty += '<td class="col-sm-1 col_collapse_appqty">COMPLETED <span class="modal_display glyphicon glyphicon-info-sign" style="padding: 3px 3px 3px 3px;color: orange;cursor: pointer;" data-whatever="Jobs Completed in the App.<br><br> <span class=\'badge\' style=\'font-size: 10px;color: #a94342;background-color: #f2dede;border-style: solid;border-width: thin;\'>-1</span> : Number of Jobs Invoiceable set to <b>NO</b>"></span></td>';
            inlineQty += '<td class="col-sm-1 col_collapse_appqty">PARTIAL <span class="modal_display glyphicon glyphicon-info-sign" style="padding: 3px 3px 3px 3px;color: orange;cursor: pointer;" data-whatever="Jobs half Completed in the App. <br><br> <span class=\'badge\' style=\'font-size: 10px;color: #5bb95b;background-color: #e0f1d8;font-weight: bolder;border-style: solid;border-width: thin;\'>+1</span> : Number of Jobs Invoiceable set to <b>YES</b>"></span></td>';
            inlineQty += '<td class="col-sm-1 col_collapse_appqty">INCOMPLETE <span class="modal_display glyphicon glyphicon-info-sign" style="padding: 3px 3px 3px 3px;color: orange;cursor: pointer;" data-whatever="Jobs not Completed in the App. <br><br> <span class=\'badge\' style=\'font-size: 10px;color: #5bb95b;background-color: #e0f1d8;font-weight: bolder;border-style: solid;border-width: thin;\'>+1</span> : Number of Jobs Invoiceable set to <b>YES</b>"></span></td>';
            inlineQty += '<td class="col-sm-1 col_collapse_appqty">SCHEDULED <span class="modal_display glyphicon glyphicon-info-sign" style="padding: 3px 3px 3px 3px;color: orange;cursor: pointer;" data-whatever="Jobs that have been Scheduled. <br><br> <span class=\'badge\' style=\'font-size: 10px;color: #5bb95b;background-color: #e0f1d8;font-weight: bolder;border-style: solid;border-width: thin;\'>+1</span> : Number of Jobs Invoiceable set to <b>YES</b>"></span></td>';
            inlineQty += '<td class="invoiceable_qty_collpase" style="width: 50px">APP QTY <span class="modal_display glyphicon glyphicon-info-sign" style="padding: 3px 3px 3px 3px;color: orange;cursor: pointer;" data-whatever="Invoiceable Quantity from the App"></span></td>';
            inlineQty += '<td class="invoiceable_qty_collpase" style="width: 50px; text-align:end;">NETSUITE QTY <span class="modal_display glyphicon glyphicon-info-sign" style="padding: 3px 3px 3px 3px;color: orange;cursor: pointer;" data-whatever="Invoiceable Quantity created in NetSuite"></span></td>';
            inlineQty += '<td class="col-sm-1">TOTAL QTY <span class="modal_display glyphicon glyphicon-info-sign" style="padding: 3px 3px 3px 3px;color: orange;cursor: pointer;" data-whatever="Total Invoiceable Quantity which is the summation of the App Quantity and Netsuite Quantity"></span> <button type="button" class="btn btn-xs glyphicon glyphicon-plus collapse_appqty" style="color: black;margin-bottom: 4px;" data-toggle="tooltip" data-placement="top" title="App Qtys"></button></td>';
            inlineQty += '<td class="col-sm-2">INVOICEABLE AMT <small>(exc. GST)</small><span class="modal_display glyphicon glyphicon-info-sign" style="padding: 3px 3px 3px 3px;color: orange;cursor: pointer;" data-whatever="Total Amount for that Service. Excluding GST"></span></td></tr></thead>';
            inlineQty += '<tbody>';

            //PACKAGE SECTION

            resultSet.forEachResult(function(searchResult) {

                //GETTING THE DETAILS FROM THE JOB INVOICING MAIN PAGE SEARCH
                var customer_internal_id = searchResult.getValue('internalid', 'CUSTRECORD_JOB_CUSTOMER', 'group');
                var customer_name = searchResult.getText('custrecord_job_customer', null, 'group');
                var service_id = searchResult.getValue('custrecord_job_service', null, 'group');
                if (isNullorEmpty(searchResult.getValue('formulacurrency', null, 'count'))) {
                    var service_qty = 0;
                } else {
                    var service_qty = parseInt(searchResult.getValue('formulacurrency', null, 'count'));
                }


                if (isNullorEmpty(searchResult.getValue('custrecord_job_extras_qty', null, 'sum'))) {
                    var extra_service_qty = 0;
                } else {
                    var extra_service_qty = parseInt(searchResult.getValue('custrecord_job_extras_qty', null, 'sum'));
                }

                var netsuite_job_internalid = parseInt(searchResult.getValue('formulacurrency', null, 'group'));
                // var service_status = searchResult.getValue('custrecord_job_group_status', null, 'group');
                var service_status = searchResult.getValue('custrecord_jobgroup_status', 'CUSTRECORD_JOB_GROUP', 'group');
                var package_status = searchResult.getValue('custrecord_package_status', null, 'group');
                // var extra_service_qty = searchResult.getValue('custrecord_job_extras_qty', null, 'sum');
                var service_rate = searchResult.getValue('custrecord_job_service_price', null, 'group');
                var job_group = searchResult.getValue('custrecord_job_group', null, 'group');
                var invoiceable = searchResult.getValue('custrecord_job_invoiceable', null, 'group');
                var package = searchResult.getValue('custrecord_job_service_package', null, 'group');
                var package_text = searchResult.getText('custrecord_job_service_package', null, 'group');
                var service_cat = searchResult.getText('custrecord_job_service_category', null, 'group');
                var job_detail = searchResult.getText('custrecord_job_invoice_detail', null, 'group');
                var single_line_invoiceable = searchResult.getValue('custrecord_job_invoice_single_line_item', null, 'group');
                var job_source = searchResult.getValue('custrecord_job_source', null, 'group');
                var ns_item = searchResult.getText('custrecord_service_ns_item', 'CUSTRECORD_JOB_SERVICE', 'group');
                var ns_item_id = searchResult.getValue('custrecord_service_ns_item', 'CUSTRECORD_JOB_SERVICE', 'group');
                var gst = searchResult.getText('custrecord_service_gst', 'CUSTRECORD_JOB_SERVICE', 'group');
                var service_detail = searchResult.getValue('formulatext', null, 'GROUP');
                var singleline_value;


                //FIRST ELEMENT IN THE SEARCH
                if (count == 0) {
                    var package_record = nlapiLoadRecord('customrecord_service_package', package);
                    discount_period = package_record.getFieldValue('custrecord_service_package_disc_period');
                    invoice_if_incomplete = package_record.getFieldValue('custrecord_service_package_inv_incomplet');
                    var invoice_single_line = package_record.getFieldValue('custrecord_service_package_inv_one_line');
                    inlineQty += '<tr style="border-top-style: solid; border-top-width: 2px; border-top-color: grey;"><td colspan="11" class="info text-uppercase package_name_row" style="font-size: large;"><strong>PACKAGE NAME - ' + package_text + '</strong><br></td></tr>';
                    var service_type = nlapiLookupField('customrecord_service', service_id, 'custrecord_service');
                    //IF SERVICE TYPE IS DISCOUNT, DO NOT DO BELOW CALCULATIONS
                    if (service_type != 17) {
                        //IF JOB GROUP STATUS IS COMPLETED

                        if (discount_period == 3) {
                            var values = qtyCalculation(service_status, extra_service_qty, service_qty, invoiceable, job_source, netsuite_job_internalid, 0, 0, 0, 0, 0, 0, 0, 0, false, false, false, false, 0, invoice_if_incomplete, invoiceable_completed_count, invoiceable_partial_count, invoiceable_incomplete_count, invoiceable_scheduled_count);
                        } else {
                            var values = qtyCalculation(package_status, extra_service_qty, service_qty, invoiceable, job_source, netsuite_job_internalid, 0, 0, 0, 0, 0, 0, 0, 0, false, false, false, false, 0, invoice_if_incomplete, invoiceable_completed_count, invoiceable_partial_count, invoiceable_incomplete_count, invoiceable_scheduled_count);
                        }


                        completed_qty = values[0];
                        old_service_qty = values[1];
                        old_extra_service_qty = values[2];
                        partial_qty = values[3];
                        incomplete_qty = values[4];
                        extra_qty = values[5];
                        invoiceable_qty = values[6];
                        invoiceable_service_qty = values[7];
                        invoiceable_extra_qty = values[8];
                        completed_icon = values[9];
                        partially_completed_icon = values[10];
                        incompleted_icon = values[11];
                        temp_netsuite_job_internalid = values[12];
                        // old_job_detail = values[13];
                        scheduled_icon = values[14];
                        scheduled_qty = values[15];
                        invoiceable_completed_count = values[16];
                        invoiceable_incomplete_count = values[17];
                        invoiceable_partial_count = values[18];
                        invoiceable_scheduled_count = values[19];
                    }
                } else {
                    //AT THE END OF ONE PACKAGE
                    if (old_package != package) {
                        var package_record = nlapiLoadRecord('customrecord_service_package', old_package);
                        // discount_period = package_record.getFieldValue('custrecord_service_package_disc_period');
                        var fixed_rate_value = package_record.getFieldValue('custrecord_service_package_fix_mth_rate');
                        var discount_type = package_record.getFieldValue('custrecord_service_package_disc_type');
                        var invoice_single_line = package_record.getFieldValue('custrecord_service_package_inv_one_line');
                        var service_type = nlapiLookupField('customrecord_service', old_service_id, 'custrecord_service');
                        var period_type = package_record.getFieldValue('custrecord_service_package_disc_period');

                        //DONT CREATE DISCOUNT ROW
                        if (service_type != 17) {
                            inlineQty += '<tr>';
                            // var assignPackageRows = completedJobs(true, completed_icon, old_service_qty, customer_id, old_service_rate, old_service_id, old_job_group, old_service_cat_text, old_package, old_service_qty, invoiceable_completed_count);
                            // inlineQty += assignPackageRows;

                            var serviceNameRow = serviceName(old_service_id);
                            inlineQty += serviceNameRow;

                            //IF INVOICE SINGLE LINE ARE NULL
                            if (isNullorEmpty(discount_job_single_line)) {
                                //IF INVOICE SINGLE LINE FROM PACKAGE IS SET TO NO, DISPLAY THE INVOICE DETAIL TEXT FIELD

                                //INVOICE SINGLE LINE FROM PACKGE IS SET TO YES, DO NOT DISPLAY THE INVOICE DETAIL TEXT FIELD
                                var singleLineDescpRow = singleLineDescription(nlapiLookupField('customrecord_service_package', old_package, 'custrecord_service_package_inv_one_line'), old_job_detail, old_netsuite_job_internalid, old_package, old_service_id);
                                inlineQty += singleLineDescpRow;
                                singleline_value = nlapiLookupField('customrecord_service_package', old_package, 'custrecord_service_package_inv_one_line');
                            } else {
                                //IF INVOICE SINGLE LINE FROM JOB RECORD IS SET TO NO, DISPLAY THE INVOICE DETAIL TEXT FIELD

                                var singleLineDescpRow = singleLineDescription(discount_job_single_line, old_job_detail, old_netsuite_job_internalid, old_package, old_service_id);
                                inlineQty += singleLineDescpRow;
                                singleline_value = discount_job_single_line;
                            }

                            //SERVICE RATE OF THE SERVICE
                            inlineQty += '<td><div class="input-group"><span class="input-group-addon">$</span><input type="text" class="form-control text-center" readonly value="' + (old_service_rate) + '" /></div></td>';

                            //COMPLETED APP QTY
                            //IF COMPLETED SERVICE QTY IS GREATER THAN 0, CLICKABLE BUTTON - (TO SET JOB GROUPS TO INVOICEABLE OER NOT)
                            if (old_service_qty > 0) {
                                //IF COMPLETED JOBS HAVE BEEN SET TO NOT INVOICEABLE, PIN IS SHOWN ON THE BUTTON
                                var completedRows = completedJobs(false, completed_icon, old_service_qty, customer_id, old_service_rate, old_service_id, old_job_group, old_service_cat_text, old_package, old_service_qty, invoiceable_completed_count)
                                inlineQty += completedRows;

                            } else {
                                //IF COMPLETED QTY IS LESS THAN 0, THEN UNCLICKABLE BUTTON
                                var zeroRow = zeroJobRows(old_service_qty, null);
                                inlineQty += zeroRow;
                            }

                            //PARTIAL APP QTY
                            //IF PARTIAL QTY IS GREATER THAN 0, CLICKABLE BUTTON - (TO SET JOB GROUPS TO INVOICEBALE OR NOT)
                            if (partial_qty > 0) {
                                //IF PARTIALLY COMPLETED JOBS CHANGED TO INVOICEABLE, PIN IS SHOWN ON THE BUTTON
                                var partialRows = partialJobs(partially_completed_icon, partial_qty, customer_id, old_service_rate, old_service_id, old_job_group, old_service_cat_text, old_package, invoiceable_partial_count);
                                inlineQty += partialRows;

                            } else {
                                //IF PARTIALLY COMPLETED QTY IS LESS THAN 0, NON CLICKABLE BUTTON
                                var zeroRow = zeroJobRows(partial_qty, null);
                                inlineQty += zeroRow;
                            }

                            //INCOMPLETE APP QTY
                            //IF INCOMPLETE APP QTY IS GREATER THAN 0, CLICKABLE BUTTON - (TO SET JOB GROUPS TO INVOICEBALE OR NOT)
                            if (incomplete_qty > 0) {
                                //IF INCOMPLETE JOBS CHANGED TO INVOICEABLE, PIN IS SHOWN ON THE BUTTON
                                var incompleteRows = incompleteJobs(incompleted_icon, incomplete_qty, customer_id, old_service_rate, old_service_id, old_job_group, old_service_cat_text, old_package, invoiceable_incomplete_count);
                                inlineQty += incompleteRows;
                            } else {
                                //IF INCOMPLETE QTY IS LESS THAN 0, UNCLICKABLE BUTTON
                                var zeroRow = zeroJobRows(incomplete_qty, null);
                                inlineQty += zeroRow;
                            }

                            if (scheduled_qty > 0) {
                                var scheduledRows = scheduledJobs(scheduled_icon, scheduled_qty, customer_id, old_service_rate, old_service_id, old_job_group, old_service_cat_text, old_package, invoiceable_scheduled_count);
                                inlineQty += scheduledRows;
                            } else {
                                var zeroRow = zeroJobRows(scheduled_qty, null);
                                inlineQty += zeroRow;
                            }

                            //SET THE INVOICEABLE QTY FIELDS

                            var invoiceableRows = invoiceableFieldsPackage(true, old_invoiceable_service_qty, old_invoiceable_extra_qty, old_package, old_service_rate, old_service_id, old_service_cat, old_netsuite_job_internalid, old_invoiceable_qty, singleline_value, old_gst, old_ns_item, old_ns_item_id);

                            inlineQty += invoiceableRows;
                        }

                        if (service_count != 0) {
                            //FIXED RATE SECTION
                            var resultFixedRate = fixedRateSection(inlineQty, total_package, discount_display_qty, old_service_rate, discount_job_price, fixed_rate_value, period_type, discount_job_extras_qty, discount_job_single_line, discount_job_id, old_package, discount_job_detail, invoice_single_line, total_invoice);

                            inlineQty += resultFixedRate[0];
                            total_invoice = total_invoice + parseFloat(resultFixedRate[1]);
                        } else {
                            deleteDiscount(discount_job_id);
                        }


                        // total_invoice = total_invoice + (old_invoiceable_qty*parseFloat(old_service_rate));
                        // 
                        var package_record_new = nlapiLoadRecord('customrecord_service_package', package);
                        discount_period = package_record_new.getFieldValue('custrecord_service_package_disc_period');
                        invoice_if_incomplete = package_record_new.getFieldValue('custrecord_service_package_inv_incomplet');

                        inlineQty += '<tr style="border-top-style: solid; border-top-width: 2px; border-top-color: grey;"><td colspan="11" class="info text-uppercase package_name_row" style="font-size: large;"><strong>PACKAGE NAME - ' + package_text + '</strong></td></tr>';

                        //START OF NEW SERVICE WITH NEW PACKAGE
                        total_package = 0;
                        service_count = 0;
                        discount_job_price = null;
                        discount_job_extras_qty = null;
                        discount_job_type = null;
                        discount_job_detail = null;
                        discount_job_id = null;
                        discount_job_single_line = null;
                        invoice_detail_set = false;
                        old_job_detail = '';
                        invoiceable_completed_count = 0;
                        invoiceable_incomplete_count = 0;
                        invoiceable_partial_count = 0;
                        invoiceable_scheduled_count = 0;
                        var service_type = nlapiLookupField('customrecord_service', service_id, 'custrecord_service');
                        if (service_type != 17) {

                            if (discount_period == 3) {
                                var values = qtyCalculation(service_status, extra_service_qty, service_qty, invoiceable, job_source, netsuite_job_internalid, 0, 0, 0, 0, 0, 0, 0, 0, false, false, false, false, 0, invoice_if_incomplete, invoiceable_completed_count, invoiceable_partial_count, invoiceable_incomplete_count, invoiceable_scheduled_count);
                            } else {
                                var values = qtyCalculation(package_status, extra_service_qty, service_qty, invoiceable, job_source, netsuite_job_internalid, 0, 0, 0, 0, 0, 0, 0, 0, false, false, false, false, 0, invoice_if_incomplete, invoiceable_completed_count, invoiceable_partial_count, invoiceable_incomplete_count, invoiceable_scheduled_count);
                            }
                            // var values = qtyCalculation(service_status, extra_service_qty, service_qty, invoiceable, job_source, netsuite_job_internalid, 0, 0, 0, 0, 0, 0, 0, 0, false, false, false, false, 0);

                            completed_qty = values[0];
                            old_service_qty = values[1];
                            old_extra_service_qty = values[2];
                            partial_qty = values[3];
                            incomplete_qty = values[4];
                            extra_qty = values[5];
                            invoiceable_qty = values[6];
                            invoiceable_service_qty = values[7];
                            invoiceable_extra_qty = values[8];
                            completed_icon = values[9];
                            partially_completed_icon = values[10];
                            incompleted_icon = values[11];
                            temp_netsuite_job_internalid = values[12];
                            // old_job_detail = values[13];
                            scheduled_icon = values[14];
                            scheduled_qty = values[15];
                            invoiceable_completed_count = values[16];
                            invoiceable_incomplete_count = values[17];
                            invoiceable_partial_count = values[18];
                            invoiceable_scheduled_count = values[19];
                        }

                    } else {
                        //DIFFERENT SERVICES AND SECOND ITERATION
                        if (old_service_id != service_id && count == 1) {
                            var service_type = nlapiLookupField('customrecord_service', old_service_id, 'custrecord_service');
                            if (service_type != 17) {
                                // inlineQty += '<tr><td colspan="11" class="info text-uppercase"><strong>PACKAGE NAME - '+ old_package_text +'</strong></td></tr>';
                                inlineQty += '<tr>';
                                // var assignPackageRows = completedJobs(true, completed_icon, old_service_qty, customer_id, old_service_rate, old_service_id, old_job_group, old_service_cat_text, old_package, old_service_qty, invoiceable_completed_count);
                                // inlineQty += assignPackageRows;
                                // 
                                if (package_service_price_change == true) {
                                    inlineQty += '<td></td><td></td>'
                                } else {
                                    var serviceNameRow = serviceName(old_service_id);
                                    inlineQty += serviceNameRow;
                                    if (isNullorEmpty(discount_job_single_line)) {
                                        //IF INVOICE SINGLE LINE FROM PACKAGE IS SET TO NO, DISPLAY THE INVOICE DETAIL TEXT FIELD

                                        //INVOICE SINGLE LINE FROM PACKGE IS SET TO YES, DO NOT DISPLAY THE INVOICE DETAIL TEXT FIELD
                                        var singleLineDescpRow = singleLineDescription(nlapiLookupField('customrecord_service_package', old_package, 'custrecord_service_package_inv_one_line'), old_job_detail, old_netsuite_job_internalid, old_package, old_service_id);
                                        inlineQty += singleLineDescpRow;
                                        singleline_value = nlapiLookupField('customrecord_service_package', old_package, 'custrecord_service_package_inv_one_line');
                                    } else {
                                        //IF INVOICE SINGLE LINE FROM JOB RECORD IS SET TO NO, DISPLAY THE INVOICE DETAIL TEXT FIELD

                                        var singleLineDescpRow = singleLineDescription(discount_job_single_line, old_job_detail, old_netsuite_job_internalid, old_package, old_service_id);
                                        inlineQty += singleLineDescpRow;
                                        singleline_value = discount_job_single_line;
                                    }
                                }



                                //SERVICE RATE
                                inlineQty += '<td><div class="input-group"><span class="input-group-addon">$</span><input type="text" class="form-control text-center" readonly value="' + (old_service_rate) + '" /></div></td>';
                                //APP COMPLETED QTY
                                if (old_service_qty > 0) {
                                    var completedRows = completedJobs(false, completed_icon, old_service_qty, customer_id, old_service_rate, old_service_id, old_job_group, old_service_cat_text, old_package, old_service_qty, invoiceable_completed_count)
                                    inlineQty += completedRows;
                                } else {
                                    var zeroRow = zeroJobRows(old_service_qty, null);
                                    inlineQty += zeroRow;
                                }
                                //APP PARTIALLY COMPLETED QTY
                                if (partial_qty > 0) {
                                    var partialRows = partialJobs(partially_completed_icon, partial_qty, customer_id, old_service_rate, old_service_id, old_job_group, old_service_cat_text, old_package, invoiceable_partial_count);
                                    inlineQty += partialRows;
                                } else {
                                    var zeroRow = zeroJobRows(partial_qty, null);
                                    inlineQty += zeroRow;
                                }
                                //APP INCOMPLETE QTY
                                if (incomplete_qty > 0) {
                                    var incompleteRows = incompleteJobs(incompleted_icon, incomplete_qty, customer_id, old_service_rate, old_service_id, old_job_group, old_service_cat_text, old_package, invoiceable_incomplete_count);
                                    inlineQty += incompleteRows;
                                } else {
                                    var zeroRow = zeroJobRows(incomplete_qty, null);
                                    inlineQty += zeroRow;
                                }

                                if (scheduled_qty > 0) {
                                    var scheduledRows = scheduledJobs(scheduled_icon, scheduled_qty, customer_id, old_service_rate, old_service_id, old_job_group, old_service_cat_text, old_package, invoiceable_scheduled_count);
                                    inlineQty += scheduledRows;
                                } else {
                                    var zeroRow = zeroJobRows(scheduled_qty, null);
                                    inlineQty += zeroRow;
                                }
                                //INVOICEABLE QTY FIELDS
                                //SET THE INVOICEABLE QTY FIELDS

                                var invoiceableRows = invoiceableFieldsPackage(true, old_invoiceable_service_qty, old_invoiceable_extra_qty, old_package, old_service_rate, old_service_id, old_service_cat, old_netsuite_job_internalid, old_invoiceable_qty, singleline_value, old_gst, old_ns_item, old_ns_item_id);

                                inlineQty += invoiceableRows;
                                total_package = total_package + (old_invoiceable_qty * parseFloat(old_service_rate));

                            } else {

                            }

                            //NEW SERVICE WITH THE SAME PACKAGE
                            //
                            invoice_detail_set = false;
                            old_job_detail = '';
                            invoiceable_completed_count = 0;
                            invoiceable_incomplete_count = 0;
                            invoiceable_partial_count = 0;
                            invoiceable_scheduled_count = 0;
                            package_service_price_change = false;
                            var service_type = nlapiLookupField('customrecord_service', service_id, 'custrecord_service');
                            if (service_type != 17) {

                                if (discount_period == 3) {
                                    var values = qtyCalculation(service_status, extra_service_qty, service_qty, invoiceable, job_source, netsuite_job_internalid, 0, 0, 0, 0, 0, 0, 0, 0, false, false, false, false, 0, 1, invoiceable_completed_count, invoiceable_partial_count, invoiceable_incomplete_count, invoiceable_scheduled_count);
                                } else {
                                    var values = qtyCalculation(package_status, extra_service_qty, service_qty, invoiceable, job_source, netsuite_job_internalid, 0, 0, 0, 0, 0, 0, 0, 0, false, false, false, false, 0, invoice_if_incomplete, invoiceable_completed_count, invoiceable_partial_count, invoiceable_incomplete_count, invoiceable_scheduled_count);
                                }
                                // var values = qtyCalculation(service_status, extra_service_qty, service_qty, invoiceable, job_source, netsuite_job_internalid, 0, 0, 0, 0, 0, 0, 0, 0, false, false, false, false, 0);

                                completed_qty = values[0];
                                old_service_qty = values[1];
                                old_extra_service_qty = values[2];
                                partial_qty = values[3];
                                incomplete_qty = values[4];
                                extra_qty = values[5];
                                invoiceable_qty = values[6];
                                invoiceable_service_qty = values[7];
                                invoiceable_extra_qty = values[8];
                                completed_icon = values[9];
                                partially_completed_icon = values[10];
                                incompleted_icon = values[11];
                                temp_netsuite_job_internalid = values[12];
                                // old_job_detail = values[13];
                                scheduled_icon = values[14];
                                scheduled_qty = values[15];
                                invoiceable_completed_count = values[16];
                                invoiceable_incomplete_count = values[17];
                                invoiceable_partial_count = values[18];
                                invoiceable_scheduled_count = values[19];
                            }

                        } else if (old_service_id != service_id && count > 1) {
                            //DIFFERENT SERVICES AND FROM THE SECOND ITERATION ONWARDS
                            var service_type = nlapiLookupField('customrecord_service', old_service_id, 'custrecord_service');
                            //IF SERVICE TYPE IS DISCOUNT, DO NOT CREATE ROW
                            if (service_type != 17) {
                                inlineQty += '<tr>';
                                // var assignPackageRows = completedJobs(true, completed_icon, old_service_qty, customer_id, old_service_rate, old_service_id, old_job_group, old_service_cat_text, old_package, old_service_qty, invoiceable_completed_count);
                                // inlineQty += assignPackageRows;
                                if (package_service_price_change == true) {
                                    inlineQty += '<td></td><td></td>'
                                } else {
                                    var serviceNameRow = serviceName(old_service_id);
                                    inlineQty += serviceNameRow;
                                    if (isNullorEmpty(discount_job_single_line)) {
                                        //IF INVOICE SINGLE LINE FROM PACKAGE IS SET TO NO, DISPLAY THE INVOICE DETAIL TEXT FIELD

                                        //INVOICE SINGLE LINE FROM PACKGE IS SET TO YES, DO NOT DISPLAY THE INVOICE DETAIL TEXT FIELD
                                        var singleLineDescpRow = singleLineDescription(nlapiLookupField('customrecord_service_package', old_package, 'custrecord_service_package_inv_one_line'), old_job_detail, old_netsuite_job_internalid, old_package, old_service_id);
                                        inlineQty += singleLineDescpRow;
                                        singleline_value = nlapiLookupField('customrecord_service_package', old_package, 'custrecord_service_package_inv_one_line');
                                    } else {
                                        //IF INVOICE SINGLE LINE FROM JOB RECORD IS SET TO NO, DISPLAY THE INVOICE DETAIL TEXT FIELD

                                        var singleLineDescpRow = singleLineDescription(discount_job_single_line, old_job_detail, old_netsuite_job_internalid, old_package, old_service_id);
                                        inlineQty += singleLineDescpRow;
                                        singleline_value = discount_job_single_line;
                                    }
                                }


                                inlineQty += '<td><div class="input-group"><span class="input-group-addon">$</span><input type="text" class="form-control text-center" readonly value="' + (old_service_rate) + '" /></div></td>';
                                //APP COMPLETED QTY
                                if (old_service_qty > 0) {
                                    var completedRows = completedJobs(false, completed_icon, old_service_qty, customer_id, old_service_rate, old_service_id, old_job_group, old_service_cat_text, old_package, old_service_qty, invoiceable_completed_count)
                                    inlineQty += completedRows;
                                } else {
                                    var zeroRow = zeroJobRows(old_service_qty, null);
                                    inlineQty += zeroRow;
                                }
                                //APP PARTIALLY COMPLETED QTY
                                if (partial_qty > 0) {
                                    var partialRows = partialJobs(partially_completed_icon, partial_qty, customer_id, old_service_rate, old_service_id, old_job_group, old_service_cat_text, old_package, invoiceable_partial_count);
                                    inlineQty += partialRows;
                                } else {
                                    var zeroRow = zeroJobRows(partial_qty, null);
                                    inlineQty += zeroRow;
                                }
                                //APP INCOMPLETE QTY
                                if (incomplete_qty > 0) {
                                    var incompleteRows = incompleteJobs(incompleted_icon, incomplete_qty, customer_id, old_service_rate, old_service_id, old_job_group, old_service_cat_text, old_package, invoiceable_incomplete_count);
                                    inlineQty += incompleteRows;
                                } else {
                                    var zeroRow = zeroJobRows(incomplete_qty, null);
                                    inlineQty += zeroRow;
                                }

                                if (scheduled_qty > 0) {
                                    var scheduledRows = scheduledJobs(scheduled_icon, scheduled_qty, customer_id, old_service_rate, old_service_id, old_job_group, old_service_cat_text, old_package, invoiceable_scheduled_count);
                                    inlineQty += scheduledRows;
                                } else {
                                    var zeroRow = zeroJobRows(scheduled_qty, null);
                                    inlineQty += zeroRow;
                                }

                                //INVOICEABLE QTY FIELDS
                                //SET THE INVOICEABLE QTY FIELDS

                                var invoiceableRows = invoiceableFieldsPackage(true, old_invoiceable_service_qty, old_invoiceable_extra_qty, old_package, old_service_rate, old_service_id, old_service_cat, old_netsuite_job_internalid, old_invoiceable_qty, singleline_value, old_gst, old_ns_item, old_ns_item_id);

                                inlineQty += invoiceableRows;
                                total_package = total_package + (old_invoiceable_qty * parseFloat(old_service_rate));

                            }

                            //NEW SERVICE WITH THE SAME PACKAGE 
                            //
                            invoice_detail_set = false;
                            old_job_detail = '';
                            invoiceable_completed_count = 0;
                            invoiceable_incomplete_count = 0;
                            invoiceable_partial_count = 0;
                            invoiceable_scheduled_count = 0;
                            package_service_price_change = false;
                            var service_type = nlapiLookupField('customrecord_service', service_id, 'custrecord_service');
                            if (service_type != 17) {

                                if (discount_period == 3) {
                                    var values = qtyCalculation(service_status, extra_service_qty, service_qty, invoiceable, job_source, netsuite_job_internalid, 0, 0, 0, 0, 0, 0, 0, 0, false, false, false, false, 0, invoice_if_incomplete, invoiceable_completed_count, invoiceable_partial_count, invoiceable_incomplete_count, invoiceable_scheduled_count);
                                } else {
                                    var values = qtyCalculation(package_status, extra_service_qty, service_qty, invoiceable, job_source, netsuite_job_internalid, 0, 0, 0, 0, 0, 0, 0, 0, false, false, false, false, 0, invoice_if_incomplete, invoiceable_completed_count, invoiceable_partial_count, invoiceable_incomplete_count, invoiceable_scheduled_count);
                                }
                                // var values = qtyCalculation(service_status, extra_service_qty, service_qty, invoiceable, job_source, netsuite_job_internalid, 0, 0, 0, 0, 0, 0, 0, 0, false, false, false, false, 0);

                                completed_qty = values[0];
                                old_service_qty = values[1];
                                old_extra_service_qty = values[2];
                                partial_qty = values[3];
                                incomplete_qty = values[4];
                                extra_qty = values[5];
                                invoiceable_qty = values[6];
                                invoiceable_service_qty = values[7];
                                invoiceable_extra_qty = values[8];
                                completed_icon = values[9];
                                partially_completed_icon = values[10];
                                incompleted_icon = values[11];
                                temp_netsuite_job_internalid = values[12];
                                // old_job_detail = values[13];
                                scheduled_icon = values[14];
                                scheduled_qty = values[15];
                                invoiceable_completed_count = values[16];
                                invoiceable_incomplete_count = values[17];
                                invoiceable_partial_count = values[18];
                                invoiceable_scheduled_count = values[19];
                            }
                        } else {

                            if (service_rate != old_service_rate) {
                                //DIFFERENT SERVICES AND FROM THE SECOND ITERATION ONWARDS
                                var service_type = nlapiLookupField('customrecord_service', old_service_id, 'custrecord_service');
                                //IF SERVICE TYPE IS DISCOUNT, DO NOT CREATE ROW
                                if (service_type != 17) {

                                    package_service_price_change = true;
                                    inlineQty += '<tr>';
                                    // var assignPackageRows = completedJobs(true, completed_icon, old_service_qty, customer_id, old_service_rate, old_service_id, old_job_group, old_service_cat_text, old_package, old_service_qty, invoiceable_completed_count);
                                    // inlineQty += assignPackageRows;

                                    var serviceNameRow = serviceName(old_service_id);
                                    inlineQty += serviceNameRow;
                                    if (isNullorEmpty(discount_job_single_line)) {
                                        //IF INVOICE SINGLE LINE FROM PACKAGE IS SET TO NO, DISPLAY THE INVOICE DETAIL TEXT FIELD

                                        //INVOICE SINGLE LINE FROM PACKGE IS SET TO YES, DO NOT DISPLAY THE INVOICE DETAIL TEXT FIELD
                                        var singleLineDescpRow = singleLineDescription(nlapiLookupField('customrecord_service_package', old_package, 'custrecord_service_package_inv_one_line'), old_job_detail, old_netsuite_job_internalid, old_package, old_service_id);
                                        inlineQty += singleLineDescpRow;
                                        singleline_value = nlapiLookupField('customrecord_service_package', old_package, 'custrecord_service_package_inv_one_line');
                                    } else {
                                        //IF INVOICE SINGLE LINE FROM JOB RECORD IS SET TO NO, DISPLAY THE INVOICE DETAIL TEXT FIELD

                                        var singleLineDescpRow = singleLineDescription(discount_job_single_line, old_job_detail, old_netsuite_job_internalid, old_package, old_service_id);
                                        inlineQty += singleLineDescpRow;
                                        singleline_value = discount_job_single_line;
                                    }

                                    inlineQty += '<td><div class="input-group"><span class="input-group-addon">$</span><input type="text" class="form-control text-center" readonly value="' + (old_service_rate) + '" /></div></td>';
                                    //APP COMPLETED QTY
                                    if (old_service_qty > 0) {
                                        var completedRows = completedJobs(false, completed_icon, old_service_qty, customer_id, old_service_rate, old_service_id, old_job_group, old_service_cat_text, old_package, old_service_qty, invoiceable_completed_count)
                                        inlineQty += completedRows;
                                    } else {
                                        var zeroRow = zeroJobRows(old_service_qty, null);
                                        inlineQty += zeroRow;
                                    }
                                    //APP PARTIALLY COMPLETED QTY
                                    if (partial_qty > 0) {
                                        var partialRows = partialJobs(partially_completed_icon, partial_qty, customer_id, old_service_rate, old_service_id, old_job_group, old_service_cat_text, old_package, invoiceable_partial_count);
                                        inlineQty += partialRows;
                                    } else {
                                        var zeroRow = zeroJobRows(partial_qty, null);
                                        inlineQty += zeroRow;
                                    }
                                    //APP INCOMPLETE QTY
                                    if (incomplete_qty > 0) {
                                        var incompleteRows = incompleteJobs(incompleted_icon, incomplete_qty, customer_id, old_service_rate, old_service_id, old_job_group, old_service_cat_text, old_package, invoiceable_incomplete_count);
                                        inlineQty += incompleteRows;
                                    } else {
                                        var zeroRow = zeroJobRows(incomplete_qty, null);
                                        inlineQty += zeroRow;
                                    }

                                    if (scheduled_qty > 0) {
                                        var scheduledRows = scheduledJobs(scheduled_icon, scheduled_qty, customer_id, old_service_rate, old_service_id, old_job_group, old_service_cat_text, old_package, invoiceable_scheduled_count);
                                        inlineQty += scheduledRows;
                                    } else {
                                        var zeroRow = zeroJobRows(scheduled_qty, null);
                                        inlineQty += zeroRow;
                                    }

                                    //INVOICEABLE QTY FIELDS
                                    //SET THE INVOICEABLE QTY FIELDS

                                    var invoiceableRows = invoiceableFieldsPackage(true, old_invoiceable_service_qty, old_invoiceable_extra_qty, old_package, old_service_rate, old_service_id, old_service_cat, old_netsuite_job_internalid, old_invoiceable_qty, singleline_value, old_gst, old_ns_item, old_ns_item_id);

                                    inlineQty += invoiceableRows;
                                    total_package = total_package + (old_invoiceable_qty * parseFloat(old_service_rate));

                                }

                                //NEW SERVICE WITH THE SAME PACKAGE 
                                //
                                invoice_detail_set = false;
                                old_job_detail = '';
                                invoiceable_completed_count = 0;
                                invoiceable_incomplete_count = 0;
                                invoiceable_partial_count = 0;
                                invoiceable_scheduled_count = 0;
                                var service_type = nlapiLookupField('customrecord_service', service_id, 'custrecord_service');
                                if (service_type != 17) {

                                    if (discount_period == 3) {
                                        var values = qtyCalculation(service_status, extra_service_qty, service_qty, invoiceable, job_source, netsuite_job_internalid, 0, 0, 0, 0, 0, 0, 0, 0, false, false, false, false, 0, invoice_if_incomplete, invoiceable_completed_count, invoiceable_partial_count, invoiceable_incomplete_count, invoiceable_scheduled_count);
                                    } else {
                                        var values = qtyCalculation(package_status, extra_service_qty, service_qty, invoiceable, job_source, netsuite_job_internalid, 0, 0, 0, 0, 0, 0, 0, 0, false, false, false, false, 0, invoice_if_incomplete, invoiceable_completed_count, invoiceable_partial_count, invoiceable_incomplete_count, invoiceable_scheduled_count);
                                    }
                                    // var values = qtyCalculation(service_status, extra_service_qty, service_qty, invoiceable, job_source, netsuite_job_internalid, 0, 0, 0, 0, 0, 0, 0, 0, false, false, false, false, 0);

                                    completed_qty = values[0];
                                    old_service_qty = values[1];
                                    old_extra_service_qty = values[2];
                                    partial_qty = values[3];
                                    incomplete_qty = values[4];
                                    extra_qty = values[5];
                                    invoiceable_qty = values[6];
                                    invoiceable_service_qty = values[7];
                                    invoiceable_extra_qty = values[8];
                                    completed_icon = values[9];
                                    partially_completed_icon = values[10];
                                    incompleted_icon = values[11];
                                    temp_netsuite_job_internalid = values[12];
                                    // old_job_detail = values[13];
                                    scheduled_icon = values[14];
                                    scheduled_qty = values[15];
                                    invoiceable_completed_count = values[16];
                                    invoiceable_incomplete_count = values[17];
                                    invoiceable_partial_count = values[18];
                                    invoiceable_scheduled_count = values[19];
                                }
                            } else {
                                //SAME SERVICES AND SAME PACKAGE
                                if (discount_period == 3) {
                                    var values = qtyCalculation(service_status, extra_service_qty, service_qty, invoiceable, job_source, netsuite_job_internalid, completed_qty, old_service_qty, old_extra_service_qty, partial_qty, incomplete_qty, invoiceable_qty, invoiceable_service_qty, invoiceable_extra_qty, completed_icon, partially_completed_icon, incompleted_icon, scheduled_icon, scheduled_qty, invoice_if_incomplete, invoiceable_completed_count, invoiceable_partial_count, invoiceable_incomplete_count, invoiceable_scheduled_count);
                                } else {
                                    var values = qtyCalculation(package_status, extra_service_qty, service_qty, invoiceable, job_source, netsuite_job_internalid, completed_qty, old_service_qty, old_extra_service_qty, partial_qty, incomplete_qty, invoiceable_qty, invoiceable_service_qty, invoiceable_extra_qty, completed_icon, partially_completed_icon, incompleted_icon, scheduled_icon, scheduled_qty, invoice_if_incomplete, invoiceable_completed_count, invoiceable_partial_count, invoiceable_incomplete_count, invoiceable_scheduled_count);
                                }


                                completed_qty = values[0];
                                old_service_qty = values[1];
                                old_extra_service_qty = values[2];
                                partial_qty = values[3];
                                incomplete_qty = values[4];
                                extra_qty = values[5];
                                invoiceable_qty = values[6];
                                invoiceable_service_qty = values[7];
                                invoiceable_extra_qty = values[8];
                                completed_icon = values[9];
                                partially_completed_icon = values[10];
                                incompleted_icon = values[11];
                                temp_netsuite_job_internalid = values[12];
                                old_job_detail = values[13];
                                scheduled_icon = values[14];
                                scheduled_qty = values[15];
                                invoiceable_completed_count = values[16];
                                invoiceable_incomplete_count = values[17];
                                invoiceable_partial_count = values[18];
                                invoiceable_scheduled_count = values[19];
                            }

                        }
                    }

                }

                old_package = searchResult.getValue('custrecord_job_service_package', null, 'group');
                old_package_text = searchResult.getText('custrecord_job_service_package', null, 'group');
                old_service_id = searchResult.getValue('custrecord_job_service', null, 'group');
                old_service_status = searchResult.getValue('custrecord_job_group_status', null, 'group');
                if (searchResult.getValue('custrecord_job_group', null, 'group') != "- None -") {
                    // nlapiLogExecution('DEBUG', 'group', searchResult.getValue('custrecord_job_group', null, 'group'));
                    old_job_group = searchResult.getValue('custrecord_job_group', null, 'group');
                }
                // old_netsuite_job_internalid = searchResult.getValue('formulanumeric',null,'group');
                old_service_rate = searchResult.getValue('custrecord_job_service_price', null, 'group');
                old_service_cat = searchResult.getValue('custrecord_job_service_category', null, 'group');
                old_service_cat_text = searchResult.getText('custrecord_job_service_category', null, 'group');
                var service_type = nlapiLookupField('customrecord_service', old_service_id, 'custrecord_service');
                if (service_type == 17) {
                    discount_job_price = searchResult.getValue('custrecord_job_service_price', null, 'group');
                    discount_job_extras_qty = searchResult.getValue('custrecord_job_extras_qty', null, 'sum');
                    discount_job_type = searchResult.getValue('custrecord_job_discount_type', null, 'group');
                    discount_job_detail = searchResult.getValue('custrecord_job_invoice_detail', null, 'group');
                    if (discount_job_detail == '- None -' || discount_job_detail == 'undefined' || discount_job_detail == 'null') {
                        discount_job_detail = '';
                    }
                    discount_job_id = parseInt(searchResult.getValue('formulacurrency', null, 'group'));
                    discount_job_single_line = searchResult.getValue('custrecord_job_invoice_single_line_item', null, 'group');
                }
                old_invoiceable = searchResult.getValue('custrecord_job_invoiceable', null, 'group');
                if (service_type != 17) {
                    service_count++;
                    if (isNullorEmpty(searchResult.getValue('custrecord_job_invoice_detail', null, 'group')) && isNullorEmpty(service_detail)) {
                        old_job_detail += '';
                    } else {

                        if (searchResult.getValue('custrecord_job_invoice_detail', null, 'group') != "- None -") {
                            old_job_detail = searchResult.getValue('custrecord_job_invoice_detail', null, 'group');
                            invoice_detail_set = true;
                        } else if (service_detail != "- None -" && invoice_detail_set == false) {
                            old_job_detail = service_detail;
                            old_service_detail = service_detail;
                        } else if (!isNullorEmpty(old_job_detail)) {

                        }
                        // old_job_detail += searchResult.getValue('custrecord_job_invoice_detail', null, 'group');
                    }
                }
                // nlapiLogExecution('DEBUG', 'After Setting', old_job_detail);
                if (old_service_cat == 1) {
                    discount_display_qty = invoiceable_qty;
                }
                old_invoiceable_qty = invoiceable_qty;
                old_invoiceable_extra_qty = invoiceable_extra_qty;
                old_invoiceable_service_qty = invoiceable_service_qty;
                old_netsuite_job_internalid = temp_netsuite_job_internalid;

                old_single_line_invoiceable = searchResult.getValue('custrecord_job_invoice_single_line_item', null, 'group');
                old_ns_item = searchResult.getText('custrecord_service_ns_item', 'CUSTRECORD_JOB_SERVICE', 'group');
                old_ns_item_id = searchResult.getValue('custrecord_service_ns_item', 'CUSTRECORD_JOB_SERVICE', 'group');
                old_gst = searchResult.getText('custrecord_service_gst', 'CUSTRECORD_JOB_SERVICE', 'group');

                // nlapiLogExecution('DEBUG','invoice_if_incomplete', invoice_if_incomplete);

                count++;
                return true;
            });

            //LAST ROW IN THE PACKAGE SECTION
            if (count != 0) {
                if (completed_qty > extra_qty || completed_qty == extra_qty) {
                    var package_record = nlapiLoadRecord('customrecord_service_package', old_package);
                    discount_period = package_record.getFieldValue('custrecord_service_package_disc_period');
                    var fixed_rate_value = package_record.getFieldValue('custrecord_service_package_fix_mth_rate');
                    var discount_type = package_record.getFieldValue('custrecord_service_package_disc_type');
                    var period_type = package_record.getFieldValue('custrecord_service_package_disc_period');
                    var invoice_single_line = package_record.getFieldValue('custrecord_service_package_inv_one_line');
                    var service_type = nlapiLookupField('customrecord_service', old_service_id, 'custrecord_service');

                    if (service_type != 17) {
                        inlineQty += '<tr>';
                        // var assignPackageRows = completedJobs(true, completed_icon, old_service_qty, customer_id, old_service_rate, old_service_id, old_job_group, old_service_cat_text, old_package, old_service_qty, invoiceable_completed_count);
                        // inlineQty += assignPackageRows;

                        var serviceNameRow = serviceName(old_service_id);
                        inlineQty += serviceNameRow;
                        if (isNullorEmpty(discount_job_single_line)) {
                            //IF INVOICE SINGLE LINE FROM PACKAGE IS SET TO NO, DISPLAY THE INVOICE DETAIL TEXT FIELD

                            //INVOICE SINGLE LINE FROM PACKGE IS SET TO YES, DO NOT DISPLAY THE INVOICE DETAIL TEXT FIELD
                            var singleLineDescpRow = singleLineDescription(nlapiLookupField('customrecord_service_package', old_package, 'custrecord_service_package_inv_one_line'), old_job_detail, old_netsuite_job_internalid, old_package, old_service_id);
                            inlineQty += singleLineDescpRow;
                            singleline_value = nlapiLookupField('customrecord_service_package', old_package, 'custrecord_service_package_inv_one_line');
                        } else {
                            //IF INVOICE SINGLE LINE FROM JOB RECORD IS SET TO NO, DISPLAY THE INVOICE DETAIL TEXT FIELD

                            var singleLineDescpRow = singleLineDescription(discount_job_single_line, old_job_detail, old_netsuite_job_internalid, old_package, old_service_id);
                            inlineQty += singleLineDescpRow;
                            singleline_value = discount_job_single_line;
                        }

                        //SERVICE RATE
                        inlineQty += '<td><div class="input-group"><span class="input-group-addon">$</span><input type="text" class="form-control text-center" readonly value="' + (old_service_rate) + '" /></div></td>';
                        //APP COMPLETE QTY
                        if (old_service_qty > 0) {
                            var completedRows = completedJobs(false, completed_icon, old_service_qty, customer_id, old_service_rate, old_service_id, old_job_group, old_service_cat_text, old_package, old_service_qty, invoiceable_completed_count)
                            inlineQty += completedRows;
                        } else {
                            var zeroRow = zeroJobRows(old_service_qty, null);
                            inlineQty += zeroRow;
                        }
                        //APP PARTIALLY COMPLETE QTY
                        if (partial_qty > 0) {
                            var partialRows = partialJobs(partially_completed_icon, partial_qty, customer_id, old_service_rate, old_service_id, old_job_group, old_service_cat_text, old_package, invoiceable_partial_count);
                            inlineQty += partialRows;
                        } else {
                            var zeroRow = zeroJobRows(partial_qty, null);
                            inlineQty += zeroRow;
                        }
                        //APP INCOMPLETE QTY
                        if (incomplete_qty > 0) {
                            var incompleteRows = incompleteJobs(incompleted_icon, incomplete_qty, customer_id, old_service_rate, old_service_id, old_job_group, old_service_cat_text, old_package, invoiceable_incomplete_count);
                            inlineQty += incompleteRows;
                        } else {
                            var zeroRow = zeroJobRows(incomplete_qty, null);
                            inlineQty += zeroRow;
                        }

                        if (scheduled_qty > 0) {
                            var scheduledRows = scheduledJobs(scheduled_icon, scheduled_qty, customer_id, old_service_rate, old_service_id, old_job_group, old_service_cat_text, old_package, invoiceable_scheduled_count);
                            inlineQty += scheduledRows;
                        } else {
                            var zeroRow = zeroJobRows(scheduled_qty, null);
                            inlineQty += zeroRow;
                        }

                        //INVOICEABLE QTY FIELDS
                        var invoiceableRows = invoiceableFieldsPackage(true, old_invoiceable_service_qty, old_invoiceable_extra_qty, old_package, old_service_rate, old_service_id, old_service_cat, old_netsuite_job_internalid, old_invoiceable_qty, singleline_value, old_gst, old_ns_item, old_ns_item_id);

                        inlineQty += invoiceableRows;
                    }

                    if (service_count != 0) {
                        //FIXED RATE SECTION
                        var resultFixedRate = fixedRateSection(inlineQty, total_package, discount_display_qty, old_service_rate, discount_job_price, fixed_rate_value, period_type, discount_job_extras_qty, discount_job_single_line, discount_job_id, old_package, discount_job_detail, invoice_single_line, total_invoice);

                        inlineQty += resultFixedRate[0];
                        total_invoice = total_invoice + parseFloat(resultFixedRate[1]);

                    } else {
                        deleteDiscount(discount_job_id);
                    }


                } else {
                    // inlineQty += '<tr><td></td>'; Assign Package Col commented
                    inlineQty += '<tr><td></td>';
                    inlineQty += '<td>' + nlapiLookupField('customrecord_service', old_service_id, 'name') + '</td><td><input type="text" class="form-control job_description text-center" /></td><td><div class="input-group"><span class="input-group-addon">$</span><input type="text" class="form-control text-center" readonly value="' + (old_service_rate) + '" /></div></td><td><input type="button" id="add_service" name="add_service" value="' + extra_qty + '" class="form-control btn btn-success"> </td><td><input type="button" id="add_service" name="add_service" value="' + partial_qty + '" class="form-control btn"> </td><td><input type="button" id="add_service" name="add_service" value="' + incomplete_qty + '" class="form-control btn"></td><td><div class="input-group"><span class="input-group-btn"><button class="btn btn-success btn-sm glyphicon glyphicon-plus" type="button" id="add_service" name="add_service" onclick="increaseInvoiceableQty(' + customer_id + ',\'' + old_service_rate + '\',\'' + old_service_id + '\',\'1\')" ></button></span><input type="button" id="add_service" name="add_service" class="form-control btn btn-success" value="' + old_invoiceable_qty + '"><span class="input-group-btn"><button class="btn btn-danger btn-sm glyphicon glyphicon-minus" type="button" id="add_service" name="add_service" onclick="descreaseInvoiceableQty(' + customer_id + ',\'' + old_service_rate + '\',\'' + old_service_id + '\',\'1\')"></button></span></div></td><td><strong> $' + ((old_invoiceable_qty * parseFloat(old_service_rate))).toFixed(2) + '</strong></td></tr>';
                    total_invoice = total_invoice + (old_invoiceable_qty * parseFloat(old_service_rate));

                }
            }
        }
        var package_time = Date.now();
        nlapiLogExecution('DEBUG', 'package_time', package_time - start_time);

        // nlapiLogExecution('DEBUG', 'invoice package section', total_invoice);
        var searched_jobs = nlapiLoadSearch('customrecord_job', 'customsearch_job_invoicing_mainpage_2');

        var newFilters = new Array();
        newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_customer', null, 'is', customer_id);
/*        if (role != 3 && role != 1032) {
            newFilters[newFilters.length] = new nlobjSearchFilter('formulatext', null, 'is', zee_text).setFormula(strFormula);
        }*/

        newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_service_category', null, 'is', 1);
        newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_service_package', null, 'anyof', '@NONE@');
        if (!isNullorEmpty(request.getParameter('start_date')) && !isNullorEmpty(request.getParameter('end_date'))) {

            newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorafter', nlapiStringToDate(request.getParameter('start_date')));
            newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorbefore', nlapiStringToDate(request.getParameter('end_date')));
        }

        if (!isNullorEmpty(scID)) {
            newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_special_customer', null, 'is', scID);
        } else {
            newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_special_customer', null, 'is', '@NONE@');
        }

        searched_jobs.addFilters(newFilters);

        var resultSet = searched_jobs.runSearch();

        var serviceResult = resultSet.getResults(0, 1);

        if (serviceResult.length != 0) {
            //SERVICES SECTION
            // inlineQty += '<thead style="color: white;background-color: #607799;"><tr><td></td><td></td><td></td><td></td>'; Assign PAckage Col commented
            inlineQty += '<thead style="color: white;background-color: #607799;"><tr><td></td><td></td><td></td>';
            inlineQty += '<td colspan="4" class="header_collapse"><b>APP QTY <span class="modal_display glyphicon glyphicon-info-sign" style="padding: 3px 3px 3px 3px;color: orange;cursor: pointer;" data-whatever="Quantities come from the App"></span><button type="button" class="btn btn-xs glyphicon glyphicon-minus collapse_all" style="color: black;margin-bottom: 4px;" data-toggle="tooltip" data-placement="top" title="Collapse Columns"></button></b></td>';
            inlineQty += '<td colspan="3" class="header_invoiceable_qty_collpase"><b>INVOICEABLE QTY <span class="modal_display glyphicon glyphicon-info-sign" style="padding: 3px 3px 3px 3px;color: orange;cursor: pointer;" data-whatever="Quantity taken for Invoicing Purposes"></span></b></td><td></td></tr>';
            inlineQty += '<tr style="font-size: smaller;">';
            // inlineQty += '<td>ASSIGN PACKAGE <span class="modal_display glyphicon glyphicon-info-sign" style="padding: 3px 3px 3px 3px;color: orange;cursor: pointer;" data-whatever=""></span></td>';
            inlineQty += '<td class="col-sm-1">SERVICE <span class="modal_display glyphicon glyphicon-info-sign" style="padding: 3px 3px 3px 3px;color: orange;cursor: pointer;" data-whatever="Name of the Service Performed"></span></td>';
            inlineQty += '<td class="col-sm-2">INVOICE DETAILS <span class="modal_display glyphicon glyphicon-info-sign" style="padding: 3px 3px 3px 3px;color: orange;cursor: pointer;" data-whatever=""></span></td>';
            inlineQty += '<td class="col-sm-2">RATE<span class="modal_display glyphicon glyphicon-info-sign" style="padding: 3px 3px 3px 3px;color: orange;cursor: pointer;" data-whatever="Price of the Service performed"></span></td>';
            inlineQty += '<td class="col-sm-1 col_collapse_appqty">COMPLETED <span class="modal_display glyphicon glyphicon-info-sign" style="padding: 3px 3px 3px 3px;color: orange;cursor: pointer;" data-whatever="Jobs Completed in the App.<br><br> <span class=\'badge\' style=\'font-size: 10px;color: #a94342;background-color: #f2dede;border-style: solid;border-width: thin;\'>-1</span> : Number of Jobs Invoiceable set to <b>NO</b>"></span></td>';
            inlineQty += '<td class="col-sm-1 col_collapse_appqty">PARTIAL <span class="modal_display glyphicon glyphicon-info-sign" style="padding: 3px 3px 3px 3px;color: orange;cursor: pointer;" data-whatever="Jobs half Completed in the App. <br><br> <span class=\'badge\' style=\'font-size: 10px;color: #5bb95b;background-color: #e0f1d8;font-weight: bolder;border-style: solid;border-width: thin;\'>+1</span> : Number of Jobs Invoiceable set to <b>YES</b>"></span></td>';
            inlineQty += '<td class="col-sm-1 col_collapse_appqty">INCOMPLETE <span class="modal_display glyphicon glyphicon-info-sign" style="padding: 3px 3px 3px 3px;color: orange;cursor: pointer;" data-whatever="Jobs not Completed in the App. <br><br> <span class=\'badge\' style=\'font-size: 10px;color: #5bb95b;background-color: #e0f1d8;font-weight: bolder;border-style: solid;border-width: thin;\'>+1</span> : Number of Jobs Invoiceable set to <b>YES</b>"></span></td>';
            inlineQty += '<td class="col-sm-1 col_collapse_appqty">SCHEDULED <span class="modal_display glyphicon glyphicon-info-sign" style="padding: 3px 3px 3px 3px;color: orange;cursor: pointer;" data-whatever="Jobs that have been Scheduled. <br><br> <span class=\'badge\' style=\'font-size: 10px;color: #5bb95b;background-color: #e0f1d8;font-weight: bolder;border-style: solid;border-width: thin;\'>+1</span> : Number of Jobs Invoiceable set to <b>YES</b>"></span></td>';
            inlineQty += '<td class="invoiceable_qty_collpase">APP QTY <span class="modal_display glyphicon glyphicon-info-sign" style="padding: 3px 3px 3px 3px;color: orange;cursor: pointer;" data-whatever="Invoiceable Quantity from the App"></span></td>';
            inlineQty += '<td class="invoiceable_qty_collpase">NETSUITE QTY <span class="modal_display glyphicon glyphicon-info-sign" style="padding: 3px 3px 3px 3px;color: orange;cursor: pointer;" data-whatever="Invoiceable Quantity created in NetSuite"></span></td>';
            inlineQty += '<td class="col-sm-1">TOTAL QTY <span class="modal_display glyphicon glyphicon-info-sign" style="padding: 3px 3px 3px 3px;color: orange;cursor: pointer;" data-whatever="Total Invoiceable Quantity which is the summation of the App Quantity and Netsuite Quantity"></span> <button type="button" class="btn btn-xs glyphicon glyphicon-plus collapse_appqty" style="color: black;margin-bottom: 4px;" data-toggle="tooltip" data-placement="top" title="App Qtys"></button></td>';
            inlineQty += '<td class="col-sm-2">INVOICEABLE AMT <small>(exc. GST)</small><span class="modal_display glyphicon glyphicon-info-sign" style="padding: 3px 3px 3px 3px;color: orange;cursor: pointer;" data-whatever="Total Amount for that Service. Excluding GST"></span></td></tr></thead>';

            //INITIALIZATION OF THE VARIABLE FOR THE SERVICES SECTION
            var completed_qty = 0;
            var partial_qty = 0;
            var incomplete_qty = 0;
            var count = 0;
            var count_invoiceable = 0;
            var extra_qty = 0;
            var old_service_id = '';
            var service_rate = 0.0;

            var service_status = '';
            var old_service_status = '';
            var old_job_detail = '';
            var job_group = 0;
            var old_job_group = 0;
            var old_service_rate = 0.0;
            var service_qty = 0;
            var extra_service_qty = 0;
            var invoiceable_qty = 0;
            var scheduled_qty = 0;
            var old_invoiceable_qty = 0;
            var old_netsuite_job_internalid = null;
            var invoiceable_service_qty = 0;
            var old_invoiceable_service_qty = 0;
            var invoiceable_extra_qty = 0;
            var old_invoiceable_extra_qty = 0;
            var old_extra_service_qty = 0;
            var old_service_qty = 0;
            var completed_icon = false;
            var partially_completed_icon = false;
            var incompleted_icon = false;
            var scheduled_icon = false;
            var old_ns_item = false;
            var old_ns_item_id = false;
            var old_gst = null;

            var old_service_detail = '';
            var invoice_detail_set = false;

            // var total_invoice = 0;
            var unique_service_count = [];

            var invoiceable_completed_count = 0;
            var invoiceable_incomplete_count = 0;
            var invoiceable_partial_count = 0;
            var invoiceable_scheduled_count = 0;

            var service_price_change = false;

            //SERVICES SECTION

            resultSet.forEachResult(function(searchResult) {

                //GET DETAILS FROM THE JOB INVOICING MAIN PAGE SEARCH
                var customer_internal_id = searchResult.getValue('internalid', 'CUSTRECORD_JOB_CUSTOMER', 'group');
                var customer_name = searchResult.getText('custrecord_job_customer', null, 'group');
                var service_id = searchResult.getValue('custrecord_job_service', null, 'group');
                if (isNullorEmpty(searchResult.getValue('formulacurrency', null, 'count'))) {
                    var service_qty = 0;
                } else {
                    var service_qty = parseInt(searchResult.getValue('formulacurrency', null, 'count'));
                }

                var service_status = searchResult.getValue('custrecord_jobgroup_status', 'CUSTRECORD_JOB_GROUP', 'group');

                if (isNullorEmpty(searchResult.getValue('custrecord_job_extras_qty', null, 'sum'))) {
                    var extra_service_qty = 0;
                } else {
                    var extra_service_qty = parseInt(searchResult.getValue('custrecord_job_extras_qty', null, 'sum'));
                }

                var service_rate = parseFloat(searchResult.getValue('custrecord_job_service_price', null, 'group'));
                var job_group = searchResult.getValue('custrecord_job_group', null, 'group');
                var invoiceable = searchResult.getValue('custrecord_job_invoiceable', null, 'group');
                var package = searchResult.getValue('custrecord_job_service_package', null, 'group');
                var package_text = searchResult.getText('custrecord_job_service_package', null, 'group');
                var job_detail = searchResult.getText('custrecord_job_invoice_detail', null, 'group');
                var netsuite_job_internalid = parseInt(searchResult.getValue('formulacurrency', null, 'group'));
                var ns_item = searchResult.getText('custrecord_service_ns_item', 'CUSTRECORD_JOB_SERVICE', 'group');
                var ns_item_id = searchResult.getValue('custrecord_service_ns_item', 'CUSTRECORD_JOB_SERVICE', 'group');
                var gst = searchResult.getText('custrecord_service_gst', 'CUSTRECORD_JOB_SERVICE', 'group');
                var job_source = searchResult.getValue('custrecord_job_source', null, 'group');
                var service_detail = searchResult.getValue('formulatext', null, 'GROUP');


                //FIRST ITERATION OF THE SEARCH
                if (count == 0) {
                    var values = qtyCalculation(service_status, extra_service_qty, service_qty, invoiceable, job_source, netsuite_job_internalid, 0, 0, 0, 0, 0, 0, 0, 0, false, false, false, false, 0, 0, invoiceable_completed_count, invoiceable_partial_count, invoiceable_incomplete_count, invoiceable_scheduled_count);

                    // nlapiLogExecution('DEBUG', 'service_status', service_status);
                    // nlapiLogExecution('DEBUG', 'extra_service_qty', extra_service_qty);
                    // nlapiLogExecution('DEBUG', 'service_qty', service_qty);
                    // nlapiLogExecution('DEBUG', 'invoiceable', invoiceable);

                    completed_qty = values[0];
                    old_service_qty = values[1];
                    old_extra_service_qty = values[2];
                    partial_qty = values[3];
                    incomplete_qty = values[4];
                    extra_qty = values[5];
                    invoiceable_qty = values[6];
                    invoiceable_service_qty = values[7];
                    invoiceable_extra_qty = values[8];
                    completed_icon = values[9];
                    partially_completed_icon = values[10];
                    incompleted_icon = values[11];
                    temp_netsuite_job_internalid = values[12];
                    // old_job_detail = values[13];
                    scheduled_icon = values[14];
                    scheduled_qty = values[15];
                    invoiceable_completed_count = values[16];
                    invoiceable_incomplete_count = values[17];
                    invoiceable_partial_count = values[18];
                    invoiceable_scheduled_count = values[19];

                    // nlapiLogExecution('DEBUG', 'scheduled_qty', scheduled_qty);


                } else { //EVERY OTHER ITERATION AFTER THE FIRST
                    //IF THE SERVICE ID'S DONT MATCH
                    if (old_service_id != service_id) {
                        unique_service_count[old_service_id] = old_invoiceable_qty;
                        var package_assigned_to_service = nlapiLookupField('customrecord_service', old_service_id, 'custrecord_service_package');
                        inlineQty += '<tr>';
                        //IF SERVICE IS ASSGINED TO PACKAGE WHILE POACKAGE CREATION, ASSIGN PACKAGE BUTTON WILL BE SHOWN
                        // if (!isNullorEmpty(package_assigned_to_service)) {
                        //  var assignPackageRows = completedJobs(true, completed_icon, old_service_qty, customer_id, old_service_rate, old_service_id, old_job_group, 'Services', old_package, old_service_qty, invoiceable_completed_count);
                        //  inlineQty += assignPackageRows;
                        // } else {
                        //  inlineQty += '<td></td>';
                        // }
                        // 
                        if (service_price_change == true) {
                            inlineQty += '<td></td><td></td>';
                        } else {
                            var serviceNameRow = serviceName(old_service_id);
                            inlineQty += serviceNameRow;
                            inlineQty += '<td><input type="text" class="form-control job_description_preview job_description text-center" data-serviceid="' + old_service_id + '" data-packageid="' + null + '" value="' + old_job_detail + '" data-netsuitejob="' + old_netsuite_job_internalid + '" default-value="' + old_job_detail + '"/></td>';
                        }
                        // var serviceNameRow = serviceName(old_service_id);
                        // inlineQty += serviceNameRow;
                        // inlineQty += '<td><input type="text" class="form-control job_description_preview job_description text-center" data-serviceid="' + old_service_id + '" data-packageid="' + null + '" value="' + old_job_detail + '" data-netsuitejob="' + old_netsuite_job_internalid + '" default-value="' + old_job_detail + '"/></td>';
                        inlineQty += '<td><div class="input-group"><span class="input-group-addon">$</span><input type="text" class="form-control text-center" readonly value="' + (old_service_rate) + '" /></div></td>';
                        //APP COMPLETED QTY
                        if (old_service_qty > 0) {
                            var completedRows = completedJobs(false, completed_icon, old_service_qty, customer_id, old_service_rate, old_service_id, old_job_group, 'Services', null, old_service_qty, invoiceable_completed_count);
                            inlineQty += completedRows;
                        } else {
                            var zeroRow = zeroJobRows(old_service_qty, null);
                            inlineQty += zeroRow;
                        }
                        //APP PARTIALLY COMPLETED QTY
                        if (partial_qty > 0) {
                            var partialRows = partialJobs(partially_completed_icon, partial_qty, customer_id, old_service_rate, old_service_id, old_job_group, 'Services', null, invoiceable_partial_count);
                            inlineQty += partialRows;
                        } else {
                            var zeroRow = zeroJobRows(partial_qty, null);
                            inlineQty += zeroRow;
                        }
                        //APP INCOMPLETE QTY
                        if (incomplete_qty > 0) {
                            var incompleteRows = incompleteJobs(incompleted_icon, incomplete_qty, customer_id, old_service_rate, old_service_id, old_job_group, 'Services', null, invoiceable_incomplete_count);
                            inlineQty += incompleteRows;
                        } else {
                            var zeroRow = zeroJobRows(incomplete_qty, null);
                            inlineQty += zeroRow;
                        }

                        if (scheduled_qty > 0) {
                            var scheduledRows = scheduledJobs(scheduled_icon, scheduled_qty, customer_id, old_service_rate, old_service_id, old_job_group, 'Services', null, invoiceable_scheduled_count);
                            inlineQty += scheduledRows;
                        } else {
                            var zeroRow = zeroJobRows(scheduled_qty, null);
                            inlineQty += zeroRow;
                        }

                        //INVOICEABLE QTY FIELDS
                        var invoiceableRows = invoiceableFieldsPackage(false, old_invoiceable_service_qty, old_invoiceable_extra_qty, null, old_service_rate, old_service_id, '1', old_netsuite_job_internalid, old_invoiceable_qty, null, old_gst, old_ns_item, old_ns_item_id);

                        inlineQty += invoiceableRows;

                        total_invoice = total_invoice + (old_invoiceable_qty * parseFloat(old_service_rate));

                        //RESET CALCULATIONS FOR THE NEW SERVICE
                        //
                        old_netsuite_job_internalid = null;
                        old_job_detail = '';
                        invoice_detail_set = false;
                        invoiceable_completed_count = 0;
                        invoiceable_incomplete_count = 0;
                        invoiceable_partial_count = 0;
                        invoiceable_scheduled_count = 0;
                        service_price_change = false;

                        var values = qtyCalculation(service_status, extra_service_qty, service_qty, invoiceable, job_source, netsuite_job_internalid, 0, 0, 0, 0, 0, 0, 0, 0, false, false, false, false, 0, 0, invoiceable_completed_count, invoiceable_partial_count, invoiceable_incomplete_count, invoiceable_scheduled_count);

                        completed_qty = values[0];
                        old_service_qty = values[1];
                        old_extra_service_qty = values[2];
                        partial_qty = values[3];
                        incomplete_qty = values[4];
                        extra_qty = values[5];
                        invoiceable_qty = values[6];
                        invoiceable_service_qty = values[7];
                        invoiceable_extra_qty = values[8];
                        completed_icon = values[9];
                        partially_completed_icon = values[10];
                        incompleted_icon = values[11];
                        temp_netsuite_job_internalid = values[12];
                        old_job_detail = values[13];
                        scheduled_icon = values[14];
                        scheduled_qty = values[15];
                        invoiceable_completed_count = values[16];
                        invoiceable_incomplete_count = values[17];
                        invoiceable_partial_count = values[18];
                        invoiceable_scheduled_count = values[19];
                    } else {

                        if (service_rate != old_service_rate) {
                            service_price_change = true;
                            unique_service_count[old_service_id] = old_invoiceable_qty;
                            var package_assigned_to_service = nlapiLookupField('customrecord_service', old_service_id, 'custrecord_service_package');
                            inlineQty += '<tr>';
                            //IF SERVICE IS ASSGINED TO PACKAGE WHILE POACKAGE CREATION, ASSIGN PACKAGE BUTTON WILL BE SHOWN
                            // if (!isNullorEmpty(package_assigned_to_service)) {
                            //  var assignPackageRows = completedJobs(true, completed_icon, old_service_qty, customer_id, old_service_rate, old_service_id, old_job_group, 'Services', old_package, old_service_qty, invoiceable_completed_count);
                            //  inlineQty += assignPackageRows;
                            // } else {
                            //  inlineQty += '<td></td>';
                            // }
                            var serviceNameRow = serviceName(old_service_id);
                            inlineQty += serviceNameRow;
                            inlineQty += '<td><input type="text" class="form-control job_description_preview job_description text-center" data-serviceid="' + old_service_id + '" data-packageid="' + null + '" value="' + old_job_detail + '" data-netsuitejob="' + old_netsuite_job_internalid + '" default-value="' + old_job_detail + '"/></td><td><div class="input-group"><span class="input-group-addon">$</span><input type="text" class="form-control text-center" readonly value="' + (old_service_rate) + '" /></div></td>';
                            //APP COMPLETED QTY
                            if (old_service_qty > 0) {
                                var completedRows = completedJobs(false, completed_icon, old_service_qty, customer_id, old_service_rate, old_service_id, old_job_group, 'Services', null, old_service_qty, invoiceable_completed_count);
                                inlineQty += completedRows;
                            } else {
                                var zeroRow = zeroJobRows(old_service_qty, null);
                                inlineQty += zeroRow;
                            }
                            //APP PARTIALLY COMPLETED QTY
                            if (partial_qty > 0) {
                                var partialRows = partialJobs(partially_completed_icon, partial_qty, customer_id, old_service_rate, old_service_id, old_job_group, 'Services', null, invoiceable_partial_count);
                                inlineQty += partialRows;
                            } else {
                                var zeroRow = zeroJobRows(partial_qty, null);
                                inlineQty += zeroRow;
                            }
                            //APP INCOMPLETE QTY
                            if (incomplete_qty > 0) {
                                var incompleteRows = incompleteJobs(incompleted_icon, incomplete_qty, customer_id, old_service_rate, old_service_id, old_job_group, 'Services', null, invoiceable_incomplete_count);
                                inlineQty += incompleteRows;
                            } else {
                                var zeroRow = zeroJobRows(incomplete_qty, null);
                                inlineQty += zeroRow;
                            }

                            if (scheduled_qty > 0) {
                                var scheduledRows = scheduledJobs(scheduled_icon, scheduled_qty, customer_id, old_service_rate, old_service_id, old_job_group, 'Services', null, invoiceable_scheduled_count);
                                inlineQty += scheduledRows;
                            } else {
                                var zeroRow = zeroJobRows(scheduled_qty, null);
                                inlineQty += zeroRow;
                            }

                            //INVOICEABLE QTY FIELDS
                            var invoiceableRows = invoiceableFieldsPackage(false, old_invoiceable_service_qty, old_invoiceable_extra_qty, null, old_service_rate, old_service_id, '1', old_netsuite_job_internalid, old_invoiceable_qty, null, old_gst, old_ns_item, old_ns_item_id);

                            inlineQty += invoiceableRows;

                            total_invoice = total_invoice + (old_invoiceable_qty * parseFloat(old_service_rate));

                            //RESET CALCULATIONS FOR THE NEW SERVICE
                            //
                            old_netsuite_job_internalid = null;
                            old_job_detail = '';
                            invoice_detail_set = false;
                            invoiceable_completed_count = 0;
                            invoiceable_incomplete_count = 0;
                            invoiceable_partial_count = 0;
                            invoiceable_scheduled_count = 0;

                            var values = qtyCalculation(service_status, extra_service_qty, service_qty, invoiceable, job_source, netsuite_job_internalid, 0, 0, 0, 0, 0, 0, 0, 0, false, false, false, false, 0, 0, invoiceable_completed_count, invoiceable_partial_count, invoiceable_incomplete_count, invoiceable_scheduled_count);

                            completed_qty = values[0];
                            old_service_qty = values[1];
                            old_extra_service_qty = values[2];
                            partial_qty = values[3];
                            incomplete_qty = values[4];
                            extra_qty = values[5];
                            invoiceable_qty = values[6];
                            invoiceable_service_qty = values[7];
                            invoiceable_extra_qty = values[8];
                            completed_icon = values[9];
                            partially_completed_icon = values[10];
                            incompleted_icon = values[11];
                            temp_netsuite_job_internalid = values[12];
                            old_job_detail = values[13];
                            scheduled_icon = values[14];
                            scheduled_qty = values[15];
                            invoiceable_completed_count = values[16];
                            invoiceable_incomplete_count = values[17];
                            invoiceable_partial_count = values[18];
                            invoiceable_scheduled_count = values[19];
                        } else {
                            //SAME SERVICES CALCULATE THE TOTAL COMPLETED/PARTIALLY COMPLETED AND INCOMPLETE JOBS
                            var values = qtyCalculation(service_status, extra_service_qty, service_qty, invoiceable, job_source, netsuite_job_internalid, completed_qty, old_service_qty, old_extra_service_qty, partial_qty, incomplete_qty, invoiceable_qty, invoiceable_service_qty, invoiceable_extra_qty, completed_icon, partially_completed_icon, incompleted_icon, scheduled_icon, scheduled_qty, 0, invoiceable_completed_count, invoiceable_partial_count, invoiceable_incomplete_count, invoiceable_scheduled_count);

                            completed_qty = values[0];
                            old_service_qty = values[1];
                            old_extra_service_qty = values[2];
                            partial_qty = values[3];
                            incomplete_qty = values[4];
                            extra_qty = values[5];
                            invoiceable_qty = values[6];
                            invoiceable_service_qty = values[7];
                            invoiceable_extra_qty = values[8];
                            completed_icon = values[9];
                            partially_completed_icon = values[10];
                            incompleted_icon = values[11];
                            temp_netsuite_job_internalid = values[12];
                            // old_job_detail = values[13];
                            scheduled_icon = values[14];
                            scheduled_qty = values[15];
                            invoiceable_completed_count = values[16];
                            invoiceable_incomplete_count = values[17];
                            invoiceable_partial_count = values[18];
                            invoiceable_scheduled_count = values[19];
                        }

                    }
                }



                old_service_id = searchResult.getValue('custrecord_job_service', null, 'group');
                old_service_status = searchResult.getValue('custrecord_job_group_status', null, 'group');
                old_job_group = searchResult.getValue('custrecord_job_group', null, 'group');
                old_service_rate = searchResult.getValue('custrecord_job_service_price', null, 'group');
                if (!isNullorEmpty(searchResult.getValue('formulacurrency', null, 'group'))) {
                    old_netsuite_job_internalid = parseInt(searchResult.getValue('formulacurrency', null, 'group'));
                }
                if (searchResult.getValue('custrecord_job_invoice_detail', null, 'group') == "- None -" && service_detail == "- None -" && isNullorEmpty(old_job_detail)) {
                    // old_job_detail = '';
                } else {

                    if (searchResult.getValue('custrecord_job_invoice_detail', null, 'group') != "- None -") {
                        old_job_detail = searchResult.getValue('custrecord_job_invoice_detail', null, 'group');
                        invoice_detail_set = true;
                    } else if (service_detail != "- None -" && invoice_detail_set == false) {
                        old_job_detail = service_detail;
                        old_service_detail = service_detail;
                    } else if (!isNullorEmpty(old_job_detail)) {

                    }
                }

                old_invoiceable_qty = invoiceable_qty;
                old_invoiceable_extra_qty = invoiceable_extra_qty;
                old_invoiceable_service_qty = invoiceable_service_qty;
                old_ns_item = searchResult.getText('custrecord_service_ns_item', 'CUSTRECORD_JOB_SERVICE', 'group');
                old_ns_item_id = searchResult.getValue('custrecord_service_ns_item', 'CUSTRECORD_JOB_SERVICE', 'group');
                old_gst = searchResult.getText('custrecord_service_gst', 'CUSTRECORD_JOB_SERVICE', 'group');
                count++;
                return true;
            });

            unique_service_count[old_service_id] = old_invoiceable_qty;

            //LAST ROW OF THE SERVICES SECTION
            //IF THERE ARE SERVICES
            if (count != 0) {
                if (completed_qty > extra_qty || completed_qty == extra_qty) {
                    var package_assigned_to_service = nlapiLookupField('customrecord_service', old_service_id, 'custrecord_service_package');
                    inlineQty += '<tr>';
                    // if (!isNullorEmpty(package_assigned_to_service)) {
                    //  var assignPackageRows = completedJobs(true, completed_icon, old_service_qty, customer_id, old_service_rate, old_service_id, old_job_group, 'Services', old_package, old_service_qty, invoiceable_completed_count);
                    //  inlineQty += assignPackageRows;
                    // } else {
                    //  inlineQty += '<td></td>';
                    // }
                    // 
                    // 
                    if (service_price_change == true) {
                        inlineQty += '<td></td><td></td>';
                    } else {
                        var serviceNameRow = serviceName(old_service_id);
                        inlineQty += serviceNameRow;
                        inlineQty += '<td><input type="text" class="form-control job_description_preview job_description text-center" data-serviceid="' + old_service_id + '" data-packageid="' + null + '" value="' + old_job_detail + '" data-netsuitejob="' + old_netsuite_job_internalid + '" default-value="' + old_job_detail + '"/></td>';
                    }

                    inlineQty += '<td><div class="input-group"><span class="input-group-addon">$</span><input type="text" class="form-control text-center" readonly value="' + (old_service_rate) + '" /></div></td>';
                    //APP COMPLETED QTY
                    if (old_service_qty > 0) {
                        var completedRows = completedJobs(false, completed_icon, old_service_qty, customer_id, old_service_rate, old_service_id, old_job_group, 'Services', null, old_service_qty, invoiceable_completed_count);
                        inlineQty += completedRows;
                    } else {
                        var zeroRow = zeroJobRows(old_service_qty, null);
                        inlineQty += zeroRow;
                    }
                    //APP PARTIALLY COMPLETED QTY
                    if (partial_qty > 0) {
                        var partialRows = partialJobs(partially_completed_icon, partial_qty, customer_id, old_service_rate, old_service_id, old_job_group, 'Services', null, invoiceable_partial_count);
                        inlineQty += partialRows;
                    } else {
                        var zeroRow = zeroJobRows(partial_qty, null);
                        inlineQty += zeroRow;
                    }
                    //APP INCOMPLETE QTY
                    if (incomplete_qty > 0) {
                        var incompleteRows = incompleteJobs(incompleted_icon, incomplete_qty, customer_id, old_service_rate, old_service_id, old_job_group, 'Services', null, invoiceable_incomplete_count);
                        inlineQty += incompleteRows;
                    } else {
                        var zeroRow = zeroJobRows(incomplete_qty, null);
                        inlineQty += zeroRow;
                    }

                    if (scheduled_qty > 0) {
                        var scheduledRows = scheduledJobs(scheduled_icon, scheduled_qty, customer_id, old_service_rate, old_service_id, old_job_group, 'Services', null, invoiceable_scheduled_count);
                        inlineQty += scheduledRows;
                    } else {
                        var zeroRow = zeroJobRows(scheduled_qty, null);
                        inlineQty += zeroRow;
                    }

                    var invoiceableRows = invoiceableFieldsPackage(false, old_invoiceable_service_qty, old_invoiceable_extra_qty, null, old_service_rate, old_service_id, '1', old_netsuite_job_internalid, old_invoiceable_qty, null, old_gst, old_ns_item, old_ns_item_id);

                    inlineQty += invoiceableRows;
                    total_invoice = total_invoice + (old_invoiceable_qty * parseFloat(old_service_rate));
                }
            }

            form.addField('invoiceable_qty', 'text', 'Invoiceable Qty').setDisplayType('hidden').setDefaultValue(unique_service_count);

            //BUTTON TO ADD SERVICES
            inlineQty += '<tr><td colspan="11"><input type="button" id="add_service" name="add_service" value="Add Services" onclick="addService(\'1\')" class="btn btn-default active add_services"> </td></tr><tr><td> </td></tr>';

        }

        var services_time = Date.now();
        nlapiLogExecution('DEBUG', 'services_time', services_time - start_time);

        // nlapiLogExecution('AUDIT', 'services', total_invoice);

        var searched_jobs_extras = nlapiLoadSearch('customrecord_job', 'customsearch_job_invoicing_mainpage_2');

        var newFilters_extras = new Array();
        newFilters_extras[newFilters_extras.length] = new nlobjSearchFilter('custrecord_job_customer', null, 'is', customer_id);
/*        if (role != 3 && role != 1032) {
            newFilters_extras[newFilters_extras.length] = new nlobjSearchFilter('formulatext', null, 'is', zee_text).setFormula(strFormula);
        }*/
        newFilters_extras[newFilters_extras.length] = new nlobjSearchFilter('custrecord_job_service_category', null, 'anyof', [2, 3]);
        newFilters_extras[newFilters_extras.length] = new nlobjSearchFilter('custrecord_job_service_package', null, 'anyof', '@NONE@');
        if (!isNullorEmpty(request.getParameter('start_date')) && !isNullorEmpty(request.getParameter('end_date'))) {

            newFilters_extras[newFilters_extras.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorafter', nlapiStringToDate(request.getParameter('start_date')));
            newFilters_extras[newFilters_extras.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorbefore', nlapiStringToDate(request.getParameter('end_date')));

        }

        if (!isNullorEmpty(scID)) {
            newFilters_extras[newFilters_extras.length] = new nlobjSearchFilter('custrecord_job_special_customer', null, 'is', scID);
        } else {
            newFilters_extras[newFilters_extras.length] = new nlobjSearchFilter('custrecord_job_special_customer', null, 'is', '@NONE@');
        }

        searched_jobs_extras.addFilters(newFilters_extras);


        var resultSet_extras = searched_jobs_extras.runSearch();

        var extrasResult = resultSet_extras.getResults(0, 1);

        //EXTRAS SECTION
        // inlineQty += '<thead style="color: white;background-color: #607799;"><tr><td></td>'; Assign Package col commented
        inlineQty += '<thead style="color: white;background-color: #607799;"><tr>';
        inlineQty += '<td></td><td></td><td></td><td colspan="4" class="header_collapse"><b>APP QTY </button></b></td><td colspan="3" class="header_invoiceable_qty_collpase"><b>INVOICEABLE QTY</b></td><td></td></tr><tr style="font-size: smaller;">';
        // inlineQty += '<td>ASSIGN PACKAGE</td>';
        inlineQty += '<td>SERVICE </td><td class="col-sm-2">INVOICE DETAILS</td><td class="col-sm-2">RATE</td><td colspan="4" class="col-sm-1 col_collapse_appqty">COMPLETED</td><td class="invoiceable_qty_collpase">APP QTY</td><td class="invoiceable_qty_collpase">NETSUITE QTY</td><td class="col-sm-1">TOTAL QTY <button type="button" class="btn btn-xs glyphicon glyphicon-plus collapse_appqty" style="color: black;margin-bottom: 4px;" ></button></td><td class="col-sm-2">INVOICEABLE AMT <small>(exc. GST)</small></td></tr></thead>';


        //INITIALIZATION OF THE VARIABLES FOR THE EXTRAS SECTION 
        var extras_count = 0;
        var total_extras = 0
        var old_extra_service_rate = 0;
        var old_extra_service_id = '';
        var old_invoiceable = '';
        var old_service_cat = '';
        var old_job_detail = '';
        var app_extras = 0;
        var netsuite_extras = 0;
        var completed_extras = 0;
        var invoiceable_icon = false;
        var old_netsuite_job_internalid = null;
        var old_ns_item = null;
        var old_ns_item_id = null;
        var old_gst = null;
        var old_service_type_id = null;

        var admin_fees_job_id;
        var admin_fees_job_qty;
        var admin_fees_job_rate;
        var service_type_id;
        var admin_fees_job_service_id;

        var invoiceable_completed_count = 0;


        //EXTRAS SECTION 
        resultSet_extras.forEachResult(function(searchResult_extras) {

            //GET THE DETAILS FROM THE JOB INVOICING MAIN PAGE
            var service_id = searchResult_extras.getValue('custrecord_job_service', null, 'group');
            service_type_id = nlapiLookupField('customrecord_service', service_id, 'custrecord_service');
            var extra_service_qty = searchResult_extras.getValue('custrecord_job_extras_qty', null, 'sum');
            var service_rate = parseFloat(searchResult_extras.getValue('custrecord_job_service_price', null, 'group'));
            var invoiceable = searchResult_extras.getValue('custrecord_job_invoiceable', null, 'group');
            var job_source = searchResult_extras.getValue('custrecord_job_source', null, 'group');
            var service_cat = searchResult_extras.getValue('custrecord_job_service_category', null, 'group');
            var job_detail = searchResult_extras.getText('custrecord_job_invoice_detail', null, 'group');
            var netsuite_job_internalid = parseInt(searchResult_extras.getValue('formulacurrency', null, 'group'));
            var ns_item = searchResult_extras.getText('custrecord_service_ns_item', 'CUSTRECORD_JOB_SERVICE', 'group');
            var ns_item_id = searchResult_extras.getValue('custrecord_service_ns_item', 'CUSTRECORD_JOB_SERVICE', 'group');
            var gst = searchResult_extras.getText('custrecord_service_gst', 'CUSTRECORD_JOB_SERVICE', 'group');

            // if (ns_item_id == 97) {
            //     service_rate = -(service_rate);
            // }

            // nlapiLogExecution('DEBUG', 'service_type_id', service_type_id);

            if (service_type_id == 22) {
                admin_fees_job_id = netsuite_job_internalid;
                admin_fees_job_qty = extra_service_qty;
                admin_fees_job_rate = service_rate;
                admin_fees_job_service_id = service_id;
            }
            //FIRST ITERATION
            else if (extras_count == 0 && old_service_type_id != 22) {
                if (invoiceable == 1) { //IF INVOICEABLE IS SET TO YES
                    total_extras = total_extras + parseInt(extra_service_qty);
                    if (job_source != 5) {
                        app_extras = app_extras + parseInt(extra_service_qty);
                        completed_extras = completed_extras + parseInt(extra_service_qty);
                    } else {
                        netsuite_extras = netsuite_extras + parseInt(extra_service_qty);
                    }
                } else if (invoiceable == 2) { //IF INVOICEABLE IS SET TO NO
                    completed_extras = completed_extras + parseInt(extra_service_qty);
                    invoiceable_icon = true;
                    invoiceable_completed_count = invoiceable_completed_count + parseInt(extra_service_qty);
                } else {
                    //IF INVOICEABLE IS NULL
                    total_extras = total_extras + parseInt(extra_service_qty); //CALCULATATE THE TOTAL EXTRAS

                    if (job_source != 5) {
                        app_extras = app_extras + parseInt(extra_service_qty);
                        completed_extras = completed_extras + parseInt(extra_service_qty);
                    } else {
                        netsuite_extras = netsuite_extras + parseInt(extra_service_qty);
                    }
                }


            } else if (old_extra_service_id != service_id && old_service_type_id != 22) { //SECOND ITERATION ONWARDS AND IF THE EXTRAS ARE DIFFERENT

                // inlineQty += '<tr><td></td>'; Assign Package Col commented
                inlineQty += '<tr>';
                var serviceNameRow = serviceName(old_extra_service_id);
                inlineQty += serviceNameRow;
                inlineQty += '<td><input type="text" class="form-control job_description job_description_preview text-center" data-serviceid="' + old_extra_service_id + '" data-packageid="' + null + '" value="' + old_job_detail + '" data-netsuitejob="' + old_netsuite_job_internalid + '" default-value="' + old_job_detail + '"/></td><td><div class="input-group"><span class="input-group-addon">$</span><input type="text" class="form-control text-center" readonly value="' + (old_extra_service_rate) + '" /></div></td>';
                if (completed_extras > 0) {
                    var completedExtraRows = completedExtraJobs(invoiceable_icon, app_extras, customer_id, old_extra_service_rate, old_extra_service_id, completed_extras, invoiceable_completed_count);
                    inlineQty += completedExtraRows;
                } else {
                    var zeroRow = zeroJobRows(completed_extras, true);
                    inlineQty += zeroRow;
                }

                var invoiceableRows = invoiceableFieldsPackage(false, app_extras, netsuite_extras, null, old_extra_service_rate, old_extra_service_id, old_service_cat, old_netsuite_job_internalid, total_extras, null, old_gst, old_ns_item, old_ns_item_id);

                inlineQty += invoiceableRows;
                total_invoice = total_invoice + (old_extra_service_rate * total_extras);

                //RESET THE CALCULATIONS FOR THE NEW EXTRA   
                total_extras = 0;
                app_extras = 0;
                netsuite_extras = 0;
                completed_extras = 0;
                invoiceable_icon = false;
                invoiceable_completed_count = 0;
                old_netsuite_job_internalid = null;
                if (invoiceable == 1) {
                    total_extras = total_extras + parseInt(extra_service_qty);

                    if (job_source != 5) {
                        completed_extras = completed_extras + parseInt(extra_service_qty);
                        app_extras = app_extras + parseInt(extra_service_qty)
                    } else {
                        netsuite_extras = netsuite_extras + parseInt(extra_service_qty);
                    }
                } else if (invoiceable == 2) {
                    completed_extras = completed_extras + parseInt(extra_service_qty);
                    invoiceable_icon = true;
                    invoiceable_completed_count = invoiceable_completed_count + parseInt(extra_service_qty);
                } else {
                    total_extras = total_extras + parseInt(extra_service_qty);

                    if (job_source != 5) {
                        app_extras = app_extras + parseInt(extra_service_qty);
                        completed_extras = completed_extras + parseInt(extra_service_qty);
                    } else {
                        netsuite_extras = netsuite_extras + parseInt(extra_service_qty);
                    }
                }
            } else { //IF THE EXTRAS ARE SAME, CALCULATE THE COMPLETED QTYS
                if (invoiceable == 1) {
                    total_extras = total_extras + parseInt(extra_service_qty);
                    if (job_source != 5) {
                        completed_extras = completed_extras + parseInt(extra_service_qty);
                        app_extras = app_extras + parseInt(extra_service_qty)
                    } else {
                        netsuite_extras = netsuite_extras + parseInt(extra_service_qty);
                    }
                } else if (invoiceable == 2) {
                    completed_extras = completed_extras + parseInt(extra_service_qty);
                    invoiceable_icon = true;
                    invoiceable_completed_count = invoiceable_completed_count + parseInt(extra_service_qty);
                } else {
                    total_extras = total_extras + parseInt(extra_service_qty);

                    if (job_source != 5) {
                        app_extras = app_extras + parseInt(extra_service_qty);
                        completed_extras = completed_extras + parseInt(extra_service_qty);
                    } else {
                        netsuite_extras = netsuite_extras + parseInt(extra_service_qty);
                    }
                }
            }

            if (service_type_id != 22) {
                old_extra_service_id = searchResult_extras.getValue('custrecord_job_service', null, 'group');
                old_extra_service_rate = service_rate;
                old_invoiceable = searchResult_extras.getValue('custrecord_job_invoiceable', null, 'group');
                old_service_cat = searchResult_extras.getValue('custrecord_job_service_category', null, 'group');
                if (!isNullorEmpty(searchResult_extras.getValue('formulacurrency', null, 'group'))) {
                    old_netsuite_job_internalid = parseInt(searchResult_extras.getValue('formulacurrency', null, 'group'));
                }
                // old_netsuite_job_internalid = searchResult_extras.getValue('formulanumeric', null, 'group');
                if (searchResult_extras.getValue('custrecord_job_invoice_detail', null, 'group') == "- None -") {
                    old_job_detail = '';
                } else {
                    old_job_detail = searchResult_extras.getValue('custrecord_job_invoice_detail', null, 'group');
                }
                old_ns_item = searchResult_extras.getText('custrecord_service_ns_item', 'CUSTRECORD_JOB_SERVICE', 'group');
                old_ns_item_id = searchResult_extras.getValue('custrecord_service_ns_item', 'CUSTRECORD_JOB_SERVICE', 'group');
                old_gst = searchResult_extras.getText('custrecord_service_gst', 'CUSTRECORD_JOB_SERVICE', 'group');
                extras_count++;

                old_service_type_id = service_type_id;
            }

            return true;
        });

        //LAST ROW OF THE EXTRAS SECTION
        if (extras_count == 0) {
            if (isNullorEmpty(customer_admin_fees)) {
                inlineQty += '<tr class="no_extras_class"><td colspan="11" style="font-weight: bold;text-align: center;font-size: initial;">NO EXTRAS</td></tr>';
            }

        } else {
            if (old_service_type_id != 22) {
                // inlineQty += '<tr><td></td>'; Assign PAckage Col commented
                inlineQty += '<tr>';
                var serviceNameRow = serviceName(old_extra_service_id);
                inlineQty += serviceNameRow;
                inlineQty += '<td><input type="text" class="form-control job_description job_description_preview text-center" data-serviceid="' + old_extra_service_id + '" data-packageid="' + null + '" value="' + old_job_detail + '" data-netsuitejob="' + old_netsuite_job_internalid + '" default-value="' + old_job_detail + '"/></td><td><div class="input-group"><span class="input-group-addon">$</span><input type="text" class="form-control text-center" readonly value="' + (old_extra_service_rate) + '" /></div></td>';
                if (completed_extras > 0) {
                    var completedExtraRows = completedExtraJobs(invoiceable_icon, app_extras, customer_id, old_extra_service_rate, old_extra_service_id, completed_extras, invoiceable_completed_count);
                    inlineQty += completedExtraRows;
                } else {
                    var zeroRow = zeroJobRows(completed_extras, true);
                    inlineQty += zeroRow;
                }

                var invoiceableRows = invoiceableFieldsPackage(false, app_extras, netsuite_extras, null, old_extra_service_rate, old_extra_service_id, old_service_cat, old_netsuite_job_internalid, total_extras, null, old_gst, old_ns_item, old_ns_item_id);

                inlineQty += invoiceableRows;

                total_invoice = total_invoice + (old_extra_service_rate * total_extras);

                // nlapiLogExecution('AUDIT', 'extras', total_invoice);
            }
        }

        if (!isNullorEmpty(admin_fees_service_id)) {
            var admin_fees_qty = 1;
            var admin_fees_rate = nlapiLookupField('customrecord_service', admin_fees_service_id, 'custrecord_service_price');
            if (!isNullorEmpty(admin_fees_job_id)) {
                if (!isNullorEmpty(admin_fees_job_qty)) {
                    admin_fees_qty = admin_fees_job_qty;
                }

                if (!isNullorEmpty(admin_fees_job_rate)) {
                    admin_fees_rate = admin_fees_job_rate;
                }

                if (!isNullorEmpty(admin_fees_job_service_id)) {
                    admin_fees_service_id = admin_fees_job_service_id;
                }
            }

            // inlineQty += '<tr class="admin_fees_row"><td></td>'; Assign Package Col commented
            inlineQty += '<tr class="admin_fees_row">';
            var serviceNameRow = serviceName(admin_fees_service_id);
            inlineQty += serviceNameRow;
            inlineQty += '<td></td><td><div class="input-group"><span class="input-group-addon">$</span><input type="text" class="admin_fees_rate form-control text-center" value="' + admin_fees_rate + '" data-serviceid="' + admin_fees_service_id + '" data-jobid="' + admin_fees_job_id + '" data-oldvalue=' + admin_fees_rate + ' /></div></td>';
            inlineQty += '<td class="admin_fees_collpase" colspan=""><input type="number" class="admin_fees_qty form-control text-center" value="' + admin_fees_qty + '" min="0" step="1" onkeypress="return event.charCode >= 48 && event.charCode <= 57" /></td>';
            inlineQty += '<td><strong><div class="input-group"><span class="input-group-addon">$</span><input type="number" class="form-control admin_fees_total text-center" readonly value="' + ((admin_fees_qty * parseFloat(admin_fees_rate))).toFixed(2) + '" /></div></td></tr>';

            total_invoice += roundTwoDec((admin_fees_qty * parseFloat(admin_fees_rate)));
        } else if (!isNullorEmpty(customer_admin_fees)) {
            // inlineQty += '<tr class="admin_fees_row" style=""><td></td>'; Assign Package col commented
            inlineQty += '<tr class="admin_fees_row" style="">';
            inlineQty += '<td style="font-size: initial; font-weight: bold;">Account Admin Fee</td>'
            inlineQty += '<td></td><td><div class="input-group"><span class="input-group-addon">$</span><input type="text" class="admin_fees_rate form-control text-center" value="' + customer_admin_fees + '" data-serviceid="' + admin_fees_service_id + '" data-jobid="' + admin_fees_job_id + '" data-oldvalue=' + customer_admin_fees + ' /></div></td>';
            inlineQty += '<td class="admin_fees_collpase" colspan=""><input type="number" class="admin_fees_qty form-control text-center" value="1" min="0" step="1" onkeypress="return event.charCode >= 48 && event.charCode <= 57" /></td>';
            inlineQty += '<td><strong><div class="input-group"><span class="input-group-addon">$</span><input type="text" class="form-control admin_fees_total text-center" readonly value="' + ((1 * parseFloat(customer_admin_fees))).toFixed(2) + '" /></div></td></tr>';
            if (!isNullorEmpty(customer_admin_fees)) {
                total_invoice += roundTwoDec((1 * parseFloat(customer_admin_fees)));
            }
        } else {
            // inlineQty += '<tr class="admin_fees_row" style="display: none;"><td></td>'; Assign Package col commented
            inlineQty += '<tr class="admin_fees_row" style="display: none;">';
            inlineQty += '<td style="font-size: initial; font-weight: bold;">Account Admin Fee</td>'
            inlineQty += '<td></td><td><div class="input-group"><span class="input-group-addon">$</span><input type="text" class="admin_fees_rate form-control text-center" value="' + customer_admin_fees + '" data-serviceid="' + admin_fees_service_id + '" data-jobid="' + admin_fees_job_id + '" /></div></td>';
            inlineQty += '<td class="admin_fees_collpase" colspan=""><input type="number" class="admin_fees_qty form-control text-center" value="1" min="0" step="1" onkeypress="return event.charCode >= 48 && event.charCode <= 57" /></td>';
            inlineQty += '<td><strong><div class="input-group"><span class="input-group-addon">$</span><input type="text" class="form-control admin_fees_total text-center" readonly value="' + ((1 * parseFloat(customer_admin_fees))).toFixed(2) + '" /></div></td></tr>';

            if (!isNullorEmpty(customer_admin_fees)) {
                total_invoice += roundTwoDec((1 * parseFloat(customer_admin_fees)));
            }
        }


        // nlapiLogExecution('AUDIT', 'end', total_invoice);
        //BUTTON TO ADD EXTRAS (Assign Package Col included then colspan = 12)
        inlineQty += '<tr><td colspan="11"><input type="button" id="add_service" name="add_service" value="Add Extras" onclick="addService(\'3\')" class="btn btn-default active add_services"> </td></tr>';

        // }


        //TOTAL INVOICE VALUE
        inlineQty += '<tr style="font-weight: bold;color: white;background-color: #607799;"><td colspan="3"></td><td colspan="4" class="invoicetotalheader_collpase_appqty"></td><td colspan="2" class="invoiceable_qty_collpase"></td><td></td><td>TOTAL INVOICE <small>(exc. GST)</small></td></tr>';
        inlineQty += '<tr><td><button class="btn btn-primary btn-sm preview_row " type="button" data-toggle="tooltip" data-placement="right" ">Preview Invoice <span class="glyphicon glyphicon-new-window"></span></button></td><td colspan="2"></td><td colspan="4" class="invoicetotalheader_collpase_appqty"></td><td colspan="2" class="invoiceable_qty_collpase"></td><td></td><td><strong><div class="input-group has-success"><span class="input-group-addon">$</span><input type="text" class="form-control total_value text-center" readonly value="' + parseFloat((total_invoice)).toFixed(2) + '" /></div><strong></td></tr>';
        inlineQty += '</tbody>';
        inlineQty += '</table><br/><br/></div>';

        form.addField('preview_table_extras', 'inlinehtml', '').setLayoutType('outsidebelow', 'startrow').setDefaultValue(inlineQty);

        form.addSubmitButton('Save & Next Customer')
        form.addButton('reviewed', 'Save', 'onclick_review()');
        form.addButton('cust_back', 'Back to Summary', 'onclick_summaryPage()');
        form.addButton('back', 'Reset', 'onclick_reset()');

        form.setScript('customscript_cl_services_main_page');

        response.writePage(form);
        var end_time = Date.now();
        nlapiLogExecution('DEBUG', 'loading_time', end_time - start_time);
    } else {

        var customer = parseInt(request.getParameter('customer_id'));
        var zee_id = parseInt(request.getParameter('zee_id')); //User/Role Zee

        var extra_service_string = request.getParameter('extra_service_string');
        var extra_qty_string = request.getParameter('extra_qty_string');
        var extra_rate_string = request.getParameter('extra_rate_string');
        var delete_job_id_string = request.getParameter('delete_job_id_string');
        var delete_service_id_string = request.getParameter('delete_service_id_string');
        var review_button = request.getParameter('review_button');

        //Get the New Jobs values
        var new_jobs_service_id_string = request.getParameter('new_jobs_service_id_string');
        var new_jobs_rate_string = request.getParameter('new_jobs_rate_string');
        var new_jobs_qty_string = request.getParameter('new_jobs_qty_string');
        var new_jobs_cat_string = request.getParameter('new_jobs_cat_string');
        var new_jobs_descp_string = request.getParameter('new_jobs_descp_string');
        var new_jobs_package_id_string = request.getParameter('new_jobs_package_id_string');
        var new_jobs_single_line_string = request.getParameter('new_jobs_single_line_string');


        //Get the New Services values
        var new_service_type_string = request.getParameter('new_service_type_string');
        var new_service_name_string = request.getParameter('new_service_name_string');
        var new_service_price_string = request.getParameter('new_service_price_string');
        var new_service_package_id_string = request.getParameter('new_service_package_id_string');
        var new_service_customer_string = request.getParameter('new_service_customer_string');
        var new_service_comm_reg_string = request.getParameter('new_service_comm_reg_string');
        var new_service_qty_string = request.getParameter('new_service_qty_string');
        var new_service_discount_type_string = request.getParameter('new_service_discount_type_string');
        var new_service_single_line_string = request.getParameter('new_service_single_line_string');


        if (!isNullorEmpty(new_jobs_service_id_string)) {
            var new_jobs_service_id = new_jobs_service_id_string.split(',');
            var new_jobs_rate = new_jobs_rate_string.split(',');
            var new_jobs_qty = new_jobs_qty_string.split(',');
            var new_jobs_cat = new_jobs_cat_string.split(',');
            var new_jobs_descp = new_jobs_descp_string.split(',');
            var new_jobs_package_id = new_jobs_package_id_string.split(',');
            var new_jobs_single_line = new_jobs_single_line_string.split(',');

            nlapiLogExecution('DEBUG', 'new_jobs_service_id', new_jobs_service_id);
            nlapiLogExecution('DEBUG', 'new_jobs_rate', new_jobs_rate);
            nlapiLogExecution('DEBUG', 'new_jobs_qty', new_jobs_qty);
            nlapiLogExecution('DEBUG', 'new_jobs_cat', new_jobs_cat);
            nlapiLogExecution('DEBUG', 'new_jobs_descp', new_jobs_descp);
            nlapiLogExecution('DEBUG', 'new_jobs_package_id', new_jobs_package_id);
            nlapiLogExecution('DEBUG', 'new_jobs_single_line', new_jobs_single_line);

            for (var x = 0; x < new_jobs_service_id.length; x++) {
                createJobRecord(customer, new_jobs_service_id[x], new_jobs_rate[x], new_jobs_qty[x], new_jobs_descp[x], new_jobs_cat[x], new_jobs_package_id[x], new_jobs_single_line[x], null, request.getParameter('end_date'));
            }
        }


        if (!isNullorEmpty(new_service_type_string)) {
            var new_service_type = new_service_type_string.split(',');
            var new_service_name = new_service_name_string.split(',');
            var new_service_price = new_service_price_string.split(',');
            var new_service_package_id = new_service_package_id_string.split(',');
            var new_service_customer = new_service_customer_string.split(',');
            var new_service_comm_reg = new_service_comm_reg_string.split(',');
            var new_service_qty = new_service_qty_string.split(',');
            var new_service_discount_type = new_service_discount_type_string.split(',');
            var new_service_single_line = new_service_single_line_string.split(',');

            for (var x = 0; x < new_service_type.length; x++) {

                var new_service_id = createServiceRecord(new_service_type[x], new_service_name[x], new_service_price[x], customer, new_service_comm_reg[x], new_service_package_id[x]);

                createJobRecord(customer, new_service_id, new_service_price[x], new_service_qty[x], null, 2, new_service_package_id[x], new_service_single_line[x], new_service_discount_type[x], request.getParameter('end_date'));
            }
        }


        var recCustomer = nlapiLoadRecord('customer', customer);

        if (!isNullorEmpty(extra_service_string) && !isNullorEmpty(extra_qty_string)) {
            var extra_service = extra_service_string.split(',');
            var extra_qty = extra_qty_string.split(',');
            var extra_rate = extra_rate_string.split(',');
            for (var i = 0; i < extra_service.length; i++) {
                var searched_jobs_extras = nlapiLoadSearch('customrecord_job', 'customsearch_job_invoicing_jobs');

                var fil_po = [];
                fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_job_customer', null, 'is', customer);
                fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_job_service', null, 'is', extra_service[i]);
                fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_job_service_price', null, 'is', extra_rate[i]);
                fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_job_source', null, 'is', 5);

                searched_jobs_extras.addFilters(fil_po);

                var resultSet_extras = searched_jobs_extras.runSearch();

                var packageResult = resultSet_extras.getResults(0, 1);

                // nlapiLogExecution('DEBUG', 'internal_id', internal_id);
                // nlapiLogExecution('DEBUG', 'extra_service', extra_service[i]);
                // nlapiLogExecution('DEBUG', 'packageResult', packageResult.length);

                if (packageResult.length == 0) {

                    if (extra_qty[i] > 0) {
                        var job_new_record = nlapiCreateRecord('customrecord_job', {
                            recordmode: 'dynamic'
                        });

                        // var franchisee = recCustomer.getFieldValue('partner');

                        job_new_record.setFieldValue('custrecord_job_customer', customer);
                        job_new_record.setFieldValue('custrecord_job_franchisee', zee);
                        job_new_record.setFieldValue('custrecord_job_service', extra_service[i]);
                        job_new_record.setFieldValue('custrecord_job_extras_qty', extra_qty[i]);
                        job_new_record.setFieldValue('custrecord_job_service_price', extra_rate[i]);
                        job_new_record.setFieldValue('custrecord_job_status', 3);
                        job_new_record.setFieldValue('custrecord_job_invoiceable', 1);
                        job_new_record.setFieldValue('custrecord_job_date_reviewed', getDate());
                        job_new_record.setFieldValue('custrecord_job_source', 5);
                        job_new_record.setFieldValue('custrecord_job_date_scheduled', request.getParameter('end_date'));
                        job_new_record.setFieldValue('custrecord_job_service_category', 2);

                        nlapiSubmitRecord(job_new_record);
                    }


                } else {
                    if (packageResult.length == 1) {
                        resultSet_extras.forEachResult(function(searchResult_extras) {
                            var job_record = nlapiLoadRecord('customrecord_job', searchResult_extras.getValue('internalid'));
                            job_record.setFieldValue('custrecord_job_extras_qty', extra_qty[i]);
                            job_record.setFieldValue('custrecord_job_status', 3);
                            job_record.setFieldValue('custrecord_job_invoiceable', 1);
                            job_record.setFieldValue('custrecord_job_date_reviewed', getDate());
                            job_record.setFieldValue('custrecord_job_source', 5);
                            job_record.setFieldValue('custrecord_job_date_scheduled', request.getParameter('end_date'));

                            nlapiSubmitRecord(job_record);
                            return true;
                        });

                    } else if (packageResult.length > 1) {
                        alert('More than One Service');
                        return false;
                    }
                }
            }
        }

        //WS Comment: Error due to duplicated ids in param
        if (!isNullorEmpty(delete_job_id_string)) {
            var delete_job_id = delete_job_id_string.split(',');
            for (var i = 0; i < delete_job_id.length; i++) {
                nlapiDeleteRecord('customrecord_job', delete_job_id[i]);
            }
        }

        if (!isNullorEmpty(delete_service_id_string)) {
            var delete_service_id = delete_service_id_string.split(',');
            for (var i = 0; i < delete_service_id.length; i++) {
                // var searched_jobs = nlapiLoadSearch('customrecord_job', 'customsearch_job_inv_review_all');

                // var fil_po = new Array();

                // fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_job_customer', null, 'is', customer);
                // fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_job_service', null, 'is', delete_service_id[i]);

                // searched_jobs.addFilters(fil_po);

                // var resultSet = searched_jobs.runSearch();

                // var searchedJobsResult = resultSet.getResults(0, 1);

                // if (searchedJobsResult.length == 0) {
                //     nlapiDeleteRecord('customrecord_service', delete_service_id[i]);
                // }
                nlapiDeleteRecord('customrecord_service', delete_service_id[i]);
            }


        }

        recCustomer.setFieldValue('custentity_aic_date_reviewed', getDate());

        nlapiSubmitRecord(recCustomer);

        /**
         * [params3 description] - Parameters passed to the Schedule script to set the date review field
         * @type {Object}
         */
        var params3 = {
            custscript_customerid: customer,
            custscriptzee_id: zee_id,
            custscriptstart_date: request.getParameter('start_date'),
            custscriptend_date: request.getParameter('end_date')
        }

        /**
         * [status description] - Schedule Script to set the date review for the customer for that invocing month
         * @type {[type]}
         */

        // To check if the deployments are not in "INPROGRESS" / "INQUEUE" state. If it is, goes to the next available deplyment.
        for (var x = 1; x <= 10; x++) {
            var status = nlapiScheduleScript('customscript_sc_set_date_review', 'customdeploy' + x, params3);
            if (status == 'QUEUED') {

                //WS Edit: Updated search to be consistent with that used in summary page
                //var searched_jobs_extras = nlapiLoadSearch('customrecord_job', 'customsearch_job_invoicing_summary');

                //WS Edit: searched_jobs_extras does not seem like an appropriate variable name for the search, we are not searching for extras.
                var search_unreviewed = nlapiLoadSearch('customrecord_job', 'customsearch_job_inv_review_exp_amt');
                var zee_text = nlapiLoadRecord('partner',zee_id).getFieldValue('entitytitle');

                var strFormula = "COALESCE({custrecord_job_service.custrecord_service_franchisee},{custrecord_job_group.custrecord_jobgroup_franchisee},{custrecord_job_franchisee},'')";

                var strFormula2 = "COALESCE ({custrecord_job_date_reviewed},{custrecord_job_customer.custentity_aic_date_reviewed})";

                var fil_po = [];
                // fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_job_invoiceable', null, 'noneof', [1, 2]);
                fil_po[fil_po.length] = new nlobjSearchFilter('formuladate', null, 'isempty').setFormula(strFormula2);
                fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_job_date_inv_finalised', null, 'isempty');
                fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_job_customer', null, 'noneof', customer);
                fil_po[fil_po.length] = new nlobjSearchFilter("partner","CUSTRECORD_JOB_CUSTOMER", 'is', zee_id);
                //fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_job_franchisee', null, 'is', zee_id);
                //fil_po[fil_po.length] = new nlobjSearchFilter('formulatext', null, 'is', zee_text).setFormula(strFormula);

                //WS Comment: Will these ever be null? If yes, why are we not handling this in all places, see else.
                if (!isNullorEmpty(request.getParameter('start_date')) && !isNullorEmpty(request.getParameter('end_date'))) {

                    fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorafter', nlapiStringToDate(request.getParameter('start_date')));
                    fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorbefore', nlapiStringToDate(request.getParameter('end_date')));
                }

                search_unreviewed.addFilters(fil_po);

                var resultSet_unreviewed = search_unreviewed.runSearch();
                var result = resultSet_unreviewed.getResults(0, 1);

                if (result.length != 0 && review_button == "F") {
                    var internal_id = result[0].getValue('internalid', 'CUSTRECORD_JOB_CUSTOMER', 'group');

                    var params = new Array();
                    params['customer_id'] = internal_id;
                    params['start_date'] = request.getParameter('start_date');
                    params['end_date'] = request.getParameter('end_date');
                    params['zee'] = request.getParameter('zee_id');

                    nlapiSetRedirectURL('SUITELET', 'customscript_sl_services_main_page', 'customdeploy_sl_services_main_page', null, params);
                } else {
                    var params = new Array();
                    params['start_date'] = request.getParameter('start_date');
                    params['end_date'] = request.getParameter('end_date');
                    params['zee'] = request.getParameter('zee_id');

                    nlapiSetRedirectURL('SUITELET', 'customscript_sl_summary_page', 'customdeploy_summary_page', null, params);
                }
                break;
            }
        }
    }
}


//TO DELETE DISCOUNT WHEN THERE IS SERVICES ATTACHED TO PACKAGE
function deleteDiscount(old_netsuite_job_internalid) {
    var job_record = nlapiLoadRecord('customrecord_job', old_netsuite_job_internalid);
    var service_id = job_record.getFieldValue('custrecord_job_service');
    job_record.setFieldValue('custrecord_job_service', null);
    var new_job_id = nlapiSubmitRecord(job_record);
    var service_record = nlapiLoadRecord('customrecord_service', service_id);
    service_record.setFieldValues('custrecord_service_package', null);
    var new_service_id = nlapiSubmitRecord(service_record);
    nlapiDeleteRecord('customrecord_service', new_service_id);
    nlapiDeleteRecord('customrecord_job', new_job_id);
}

function serviceName(old_service_id) {
    var rows = '<td style="font-size: initial; font-weight: bold;">' + nlapiLookupField('customrecord_service', old_service_id, 'name') + '</td>';
    return rows;
}

function fixedRateSection(inlineQty, total_package, old_invoiceable_qty, old_service_rate, discount_job_price, fixed_rate_value, period_type, discount_job_extras_qty, discount_job_single_line, discount_job_id, old_package, discount_job_detail, invoice_single_line, total_invoice) {

    //FIXED RATE SECTION
    var discount_display_value;
    var discount_display_qty;
    var total_discount_display;
    total_package = total_package + (old_invoiceable_qty * parseFloat(old_service_rate));

    // nlapiLogExecution('DEBUG', 'discount_job_price', discount_job_price);
    // nlapiLogExecution('DEBUG', 'total_package', total_package);

    if (isNullorEmpty(discount_job_price)) { //FROM THE PCKAGE RECORD
        total_discount_display = ((fixed_rate_value * old_invoiceable_qty) - total_package);
    } else { // FROM THE DISCOUNT JOB RECORD
        if (period_type == 3) { // PERIOD TYPE IS MONTHLY
            total_discount_display = parseFloat(discount_job_price);
            fixed_rate_value = parseFloat(discount_job_price);
        } else {


            //PERIOD TYPE IS PER DAY & PER VISIT
            if (discount_job_single_line == 2) {
                discount_display_qty = discount_job_extras_qty;
                total_discount_display = parseFloat(discount_job_price) * parseFloat(discount_job_extras_qty);
                fixed_rate_value = total_package + total_discount_display;

            } else {
                var totalPackageValue = parseFloat(discount_job_price) * parseFloat(discount_job_extras_qty);
                if (totalPackageValue < total_package) {
                    total_discount_display = -parseFloat(discount_job_price);
                } else {
                    total_discount_display = parseFloat(discount_job_price);
                }

                fixed_rate_value = parseFloat(discount_job_price);
            }
        }
    }

    // nlapiLogExecution('DEBUG', 'discount_job_price', discount_job_price);
    // nlapiLogExecution('DEBUG', 'fixed_rate_value', fixed_rate_value);
    // nlapiLogExecution('DEBUG', 'discount_display_qty', discount_display_qty);
    // nlapiLogExecution('DEBUG', 'total_package', total_package);


    var returnValue = periodTypeDiscount(period_type, total_discount_display, old_invoiceable_qty, total_package, discount_job_id, discount_job_single_line, old_package, discount_job_detail, invoice_single_line, discount_display_qty, fixed_rate_value);

    return returnValue;
}

function periodTypeDiscount(period_type, total_discount_display, old_invoiceable_qty, total_package, discount_job_id, discount_job_single_line, old_package, discount_job_detail, invoice_single_line, discount_display_qty, fixed_rate_value) {

    var rows = '';
    //PERIOD TYPE MONTHLY
    if (period_type == 3) {
        //DISCOUNT ROW
        rows += '<tr style="display: none;"><td></td><td class="font-size: initial;"><b>DISCOUNT</b></td><td></td>';
        //DISCOUNT TYPE AND VALUE
        if (old_invoiceable_qty != 0) {
            var discount_value = (Math.abs(total_discount_display) / old_invoiceable_qty).toFixed(2);
        } else {
            var discount_value = 0;
        }
        rows += '<td><div class="input-group"><input type="hidden" class="form-control discount_type text-center input-group-addon" value="$" data-value="1" disabled/><span class="input-group-addon">$</span><input type="text" class="form-control discount_value text-center" value="' + discount_value +
            '" disabled/><input type="hidden" class="package_value" value="' + (total_package) + '" /></div></td>';
        //DISCOUNT QTY AND TOTAL DISCOUNT FOR THE PACKAGE
        rows += '<td colspan="3" class="discount_collpase_appqty"></td><td colspan="2"></td><td><input type="text" class="form-control discount_qty text-center" readonly value="' + old_invoiceable_qty + '" /></td><td><strong><div class="input-group has-error discount_dollar"><span class="input-group-addon">$</span><input type="text" class="form-control total_discount_value text-center" data-netsuitejob="' + discount_job_id + '" data-package="' + old_package + '"  readonly value="' + (Math.abs(total_discount_display)).toFixed(2) + '" default-value="' + (Math.abs(total_discount_display)).toFixed(2) + '"/></div></strong></td></tr>';
        //SINGLE LINE INVOICEABLE ROW

        var singleLineRow = invoiceSingleLineRow(period_type, discount_job_single_line, old_package, discount_job_detail, discount_job_id, invoice_single_line);

        rows += singleLineRow;

        //TOTAL ROW
        // rows += '<tr class="success"><td></td><td><strong>TOTAL</strong></td>'; Assign Package Col Commented
        rows += '<tr class="success"><td><strong>TOTAL</strong></td>';
        rows += '<td></td><td><input type="text" class="form-control text-center" readonly value="Monthly" /><input type="hidden" class="form-control fixed_discount_value text-center" package-fixed="true"  value="' + fixed_rate_value + '" /></div></td>';
        rows += '<td colspan="4" class="monthlytotal_collapse_appqty"></td><td colspan="2" class="invoiceable_qty_collpase"></td><td></td><td><strong><div class="input-group"><span class="input-group-addon">$</span><input type="number" class="form-control total_package_value text-center" value="' + parseFloat(fixed_rate_value).toFixed(2) + '" /><input type="hidden" class="package_value" value="' + parseFloat(total_package).toFixed(2) + '" /></div></strong></td></tr>';
    } else { //PERIOD TYPE IS PER DAY
        discount_display_qty = old_invoiceable_qty;
        //DISCOUNT ROW
        // rows += '<tr><td></td><td>DISCOUNT</td><td></td>'; Assign Package Col commented 
        rows += '<tr><td class="font-size: initial;"><b>DISCOUNT</b></td><td></td>';
        // DISCOUNT TYPE AND VALUE
        if (discount_display_qty != 0) {
            var discount_value = (parseFloat(total_discount_display) / discount_display_qty).toFixed(2);
        } else {
            var discount_value = 0;
        }
        rows += '<td><div class="input-group"><input type="hidden" class="form-control discount_type text-center input-group-addon" value="$" data-value="1" disabled/><span class="input-group-addon">$</span><input type="number" class="form-control discount_value text-center" readonly value="' + discount_value +
            '" /><input type="hidden" class="package_value" value="' + (total_package) + '" /></div></td>';
        //DISCOUNT QTY AND TOTAL DISCOUNT FOR THE PACKAGE
        rows += '<td colspan="4" class="discount_collpase_appqty"></td><td colspan="2" class="invoiceable_qty_collpase"><td><input type="number" class="form-control discount_qty text-center" readonly value="' + (discount_display_qty) + '" /></td><td><strong>';
        if (total_discount_display < 0) {
            rows += '<div class="input-group has-error discount_dollar">';
        } else {
            rows += '<div class="input-group has-success discount_dollar">';
        }

        rows += '<span class="input-group-addon">$</span><input type="text" class="form-control total_discount_value text-center" data-netsuitejob="' + discount_job_id + '" data-package="' + old_package + '"  readonly value="' + (total_discount_display).toFixed(2) + '"  default-value="' + (total_discount_display).toFixed(2) + '"/></div></strong></td></tr>';

        //INVOICE SINGLE LINE ROW
        var singleLineRow = invoiceSingleLineRow(period_type, discount_job_single_line, old_package, discount_job_detail, discount_job_id, invoice_single_line);

        rows += singleLineRow;
        //TOTAL ROW
        // rows += '<tr class="success"><td></td><td><strong>TOTAL</strong></td>'; Assign Package Col Commented
        rows += '<tr class="success"><td><strong>TOTAL</strong></td>';
        rows += '<td></td><td><div class="input-group">';
        if (period_type == 1) {
            rows += '<span class="input-group-addon">per Visit | $</span>';
        } else {
            rows += '<span class="input-group-addon">per Day | $</span>';
        }
        if (discount_job_single_line == 1 || (isNullorEmpty(discount_job_single_line) && (invoice_single_line == 1 || invoice_single_line == 2))) {
            rows += '<input type="number" class="form-control fixed_discount_value text-center" package-fixed="true"  value="' + fixed_rate_value + '" step=".01" /></div></td>';
        } else {
            rows += '<input type="number" class="form-control fixed_discount_value text-center" package-fixed="true"  value="' + (parseFloat(fixed_rate_value) / parseInt(discount_display_qty)).toFixed(2) + '" step=".01" /></div></td>';
        }
        rows += '<td colspan="4" class="total_collapse_appqty"></td><td colspan="2" class="invoiceable_qty_collpase"></td><td><input type="number" class="form-control has-success fixed_discount_qty text-center"  value="' + (discount_display_qty) + '" data-packageid="' + old_package + '" pattern="[0-9]" min="0" step="1" onkeypress="return event.charCode >= 48 && event.charCode <= 57"></td>';
        if (discount_job_single_line == 1 || (isNullorEmpty(discount_job_single_line) && (invoice_single_line == 1 || invoice_single_line == 2))) {

            rows += '<td><strong><div class="input-group"><span class="input-group-addon">$</span><input type="number" class="form-control total_package_value text-center" readonly value="' + (parseFloat(fixed_rate_value) * parseInt(discount_display_qty)).toFixed(2) + '" /><input type="hidden" class="package_value" value="' + (total_package) + '" /></div></strong></td></tr>';
            fixed_rate_value = (parseFloat(fixed_rate_value) * parseInt(discount_display_qty));
        } else {
            rows += '<td><strong><div class="input-group"><span class="input-group-addon">$</span><input type="number" class="form-control total_package_value text-center" readonly value="' + (parseFloat(fixed_rate_value)).toFixed(2) + '" /><input type="hidden" class="package_value" value="' + (total_package) + '" /></div></strong></td></tr>';

        }


    }

    var returnValues = new Array();

    returnValues[returnValues.length] = rows;
    returnValues[returnValues.length] = fixed_rate_value;
    return returnValues;
}

function completedJobs(assign_package, completed_icon, old_service_qty, customer_id, old_service_rate, old_service_id, old_job_group, old_service_cat_text, old_package, old_service_qty, invoiceable_completed_count) {
    var rows = '';

    if (assign_package == true) {
        // rows += '<td><button type="button" name="assign_package" onclick="onclick_StatusComplete(' + customer_id + ',\'' + old_service_rate + '\',\'' + old_service_id + '\',\'' + old_job_group + '\',\'1\',\'' + old_service_cat_text + '\',\'' + old_package + '\',\'true\')" class="form-control btn btn-default assign_package glyphicon glyphicon-gift" style="color: black;"></button></td>';
        rows += '<td></td>';
    } else {
        if (completed_icon == true) {
            rows += '<td class="col_collapse_appqty"><button type="button" id="add_service" name="add_service" value="' + old_service_qty + '" onclick="onclick_StatusComplete(' + customer_id + ',\'' + old_service_rate + '\',\'' + old_service_id + '\',\'' + old_job_group + '\',\'1\',\'' + old_service_cat_text + '\',\'' + old_package + '\')" class="form-control btn btn-success" style="position: relative;">' + old_service_qty + '<span class="badge" style="font-size: 10px;color: #a94342;background-color: #f2dede;border-style: solid;border-width: thin;" data-toggle="tooltip" data-placement="top" title="' + invoiceable_completed_count + ' Job(s) not Invoiced out of ' + old_service_qty + '">-' + invoiceable_completed_count + '</span></button></td>';
        } else {
            //IF COMPLETED JOB HAVE BEEN SET TO INVOICEABLE OR NULL, NO PIN IS SHOWN
            rows += '<td class="col_collapse_appqty"><input type="button" id="add_service" name="add_service" value="' + old_service_qty + '" onclick="onclick_StatusComplete(' + customer_id + ',\'' + old_service_rate + '\',\'' + old_service_id + '\',\'' + old_job_group + '\',\'1\',\'' + old_service_cat_text + '\',\'' + old_package + '\')" class="form-control btn btn-success"> </td>';
        }
    }
    return rows;
}

function partialJobs(partially_completed_icon, partial_qty, customer_id, old_service_rate, old_service_id, old_job_group, old_service_cat_text, old_package, invoiceable_partial_count) {
    var rows = '';
    if (partially_completed_icon == true) {
        rows += '<td class="col_collapse_appqty"><button type="button" id="add_service" name="add_service" value="' + partial_qty + '" onclick="onclick_StatusPartial(' + customer_id + ',\'' + old_service_rate + '\',\'' + old_service_id + '\',\'' + old_job_group + '\',\'2\',\'' + old_service_cat_text + '\',\'' + old_package + '\')" class="form-control btn btn-primary" style="position: relative;">' + partial_qty + '<span class="badge" style="font-size: 10px;color: #5bb95b;background-color: #e0f1d8;font-weight: bolder;border-style: solid;border-width: thin;" data-toggle="tooltip" data-placement="top" title="' + invoiceable_partial_count + ' Job(s) Invoiced out of ' + partial_qty + '">+' + invoiceable_partial_count + '</span></button></td>';
    } else {
        //IF PARTIALLY COMPLETED JOBS NOT INVOICEABLE OR NULL, PIN IS NOT SHOWN
        rows += '<td class="col_collapse_appqty"><input type="button" id="add_service" name="add_service" value="' + partial_qty + '" onclick="onclick_StatusPartial(' + customer_id + ',\'' + old_service_rate + '\',\'' + old_service_id + '\',\'' + old_job_group + '\',\'2\',\'' + old_service_cat_text + '\',\'' + old_package + '\')" class="form-control btn btn-primary"></td>';
    }

    return rows;
}

function incompleteJobs(incompleted_icon, incomplete_qty, customer_id, old_service_rate, old_service_id, old_job_group, old_service_cat_text, old_package, invoiceable_incomplete_count) {
    var rows = '';
    if (incompleted_icon == true) {
        rows += '<td class="col_collapse_appqty"><button type="button" id="add_service" name="add_service" value="' + incomplete_qty + '" onclick="onclick_StatusIncomplete(' + customer_id + ',\'' + old_service_rate + '\',\'' + old_service_id + '\',\'' + old_job_group + '\',\'3\',\'' + old_service_cat_text + '\',\'' + old_package + '\')" class="form-control btn btn-danger" style="position: relative;">' + incomplete_qty + '<span class="badge" style="font-size: 10px;color: #5bb95b;background-color: #e0f1d8;font-weight: bolder;border-style: solid;border-width: thin;" data-toggle="tooltip" data-placement="top" title="' + invoiceable_incomplete_count + ' Job(s) Invoiced out of ' + incomplete_qty + '">+' + invoiceable_incomplete_count + '</span></button></td>';
    } else {
        //IF INCOMPLETE JOB IS NOT INVOICEABLE OR NULL, PIN IS NOT SHOWN
        rows += '<td class="col_collapse_appqty"><input type="button" id="add_service" name="add_service" value="' + incomplete_qty + '" onclick="onclick_StatusIncomplete(' + customer_id + ',\'' + old_service_rate + '\',\'' + old_service_id + '\',\'' + old_job_group + '\',\'3\',\'' + old_service_cat_text + '\',\'' + old_package + '\')" class="form-control btn btn-danger"></td>';
    }

    return rows;
}

function scheduledJobs(scheduled_icon, scheduled_qty, customer_id, old_service_rate, old_service_id, old_job_group, old_service_cat_text, old_package, invoiceable_scheduled_count) {
    var rows = '';
    if (scheduled_icon == true) {
        rows += '<td class="col_collapse_appqty"><button type="button" id="add_service" name="add_service" value="' + scheduled_qty + '" onclick="onclick_StatusIncomplete(' + customer_id + ',\'' + old_service_rate + '\',\'' + old_service_id + '\',\'' + old_job_group + '\',\'4\',\'' + old_service_cat_text + '\',\'' + old_package + '\')" class="form-control btn btn-warning" style="position: relative;">' + scheduled_qty + '<span class="badge" style="font-size: 10px;color: #5bb95b;background-color: #e0f1d8;font-weight: bolder;border-style: solid;border-width: thin;" data-toggle="tooltip" data-placement="top" title="' + invoiceable_scheduled_count + ' Job(s) Invoiced out of ' + scheduled_qty + '">+' + invoiceable_scheduled_count + '</span></button></td>';
    } else {
        //IF INCOMPLETE JOB IS NOT INVOICEABLE OR NULL, PIN IS NOT SHOWN
        rows += '<td class="col_collapse_appqty"><input type="button" id="add_service" name="add_service" value="' + scheduled_qty + '" onclick="onclick_StatusIncomplete(' + customer_id + ',\'' + old_service_rate + '\',\'' + old_service_id + '\',\'' + old_job_group + '\',\'4\',\'' + old_service_cat_text + '\',\'' + old_package + '\')" class="form-control btn btn-warning"></td>';
    }

    return rows;
}


function completedExtraJobs(invoiceable_icon, app_extras, customer_id, old_extra_service_rate, old_extra_service_id, completed_extras, invoiceable_completed_count) {
    var rows = '';
    if (invoiceable_icon == true) {
        rows += '<td colspan="4" class="col_collapse_appqty"><button type="button" id="add_service" name="add_service" class="form-control btn btn-success" value="' + app_extras + '" onclick="onclick_StatusComplete(' + customer_id + ',\'' + old_extra_service_rate + '\',\'' + old_extra_service_id + '\',\'' + null + '\',' + null + ',\'Extras\',' + null + ')" style="position:relative">' + completed_extras + '<span class="badge" style="margin: 10px 0px 0px 10px;position: absolute;font-size: 10px;color: #a94342;background-color: #f2dede;border-style: solid;border-width: thin;">-' + invoiceable_completed_count + '</span></button></td>';
    } else {
        rows += '<td colspan="4" class="col_collapse_appqty"><input type="button" id="add_service" name="add_service" class="form-control btn btn-success" value="' + completed_extras + '" onclick="onclick_StatusComplete(' + customer_id + ',\'' + old_extra_service_rate + '\',\'' + old_extra_service_id + '\',\'' + null + '\',' + null + ',\'Extras\',' + null + ')"></td>';
    }
    return rows;
}

function zeroJobRows(qty, extras) {

    var rows = '';
    if (isNullorEmpty(extras)) {
        rows += '<td class="col_collapse_appqty">';
    } else {
        rows += '<td colspan="4" class="col_collapse_appqty">';
    }

    rows += '<input type="button" id="add_service" name="add_service" value="' + qty + '" disabled class="form-control btn btn-default add_service"> </td>';

    return rows;
}

function invoiceSingleLineRow(period_type, discount_job_single_line, old_package, discount_job_detail, discount_job_id, invoice_single_line) {
    //INVOICE SINGLE LINE ROW
    // var rows = '<tr><td></td><td></td>'; AssignPackage Col commented
    var rows = '<tr><td></td>';
    //INVOICE SINGLE LINE INVOICE DETAIL
    if (isNullorEmpty(discount_job_single_line)) { // FROM THE PACKAGE RECORD
        var singleLineDescpRow = singleLineDescription(nlapiLookupField('customrecord_service_package', old_package, 'custrecord_service_package_inv_one_line'), discount_job_detail, discount_job_id, old_package);
        rows += singleLineDescpRow;

    } else { // FROM THE DISCOUNT JOB RECORD
        var singleLineDescpRow = singleLineDescription(discount_job_single_line, discount_job_detail, discount_job_id, old_package);
        rows += singleLineDescpRow;
    }
    rows += '<td></td><td colspan="4" class="singleline_collpase_appqty"></td><td colspan="2" class="invoiceable_qty_collpase"></td><td><span class=""><b>INVOICE SINGLE LINE</b></span></td><td>';
    // if (period_type == 3) {
    rows += '<select class="form-control invoice_single_line" disabled>';
    // } else {
    //     rows += '<select class="form-control invoice_single_line">';
    // }

    //INVOICE SINGLE LINE
    if (isNullorEmpty(discount_job_single_line)) { // FROM THE PACKAGE RECORD

        var singleLineSelRow = singleLineSelection(invoice_single_line, old_package);
        rows += singleLineSelRow;

    } else { // FROM THE DISCOUNT JOB RECORD
        var singleLineSelRow = singleLineSelection(discount_job_single_line, old_package);
        rows += singleLineSelRow;
    }

    return rows;
}

function singleLineDescription(single_line, detail, ns_job_id, package_id, service_id) {

    var rows = '';
    if (single_line == 2) {
        var display_row = 'display: none';
        var service_detail = '';
    } else {
        var display_row = '';
        var service_detail = 'display: none';
    }

    // nlapiLogExecution('DEBUG', 'detail', detail)

    if (isNullorEmpty(detail)) {
        detail = '';
    }

    if (isNullorEmpty(service_id)) {
        rows += '<td><input type="text" class="form-control single_job_description text-center" style="' + display_row + '" value="' + detail + '" data-packageid="' + package_id + '" data-netsuitejob="' + ns_job_id + '" default-value="' + detail + '"/></td>';
    } else {

        rows += '<td><input type="text" style="' + service_detail + '" class="form-control job_description text-center" value="' + detail + '" data-serviceid="' + service_id + '" data-packageid="' + package_id + '" data-singleline="' + single_line + '" data-netsuitejob="' + ns_job_id + '" value="' + detail + '" default-value="' + detail + '"/></td>';
    }

    return rows;
}

function singleLineSelection(single_line, package_id) {
    var rows = '';
    if (single_line == 1) {
        rows += '<option selected value="1" data-packageid="' + package_id + '">Yes</option><option value="2" data-packageid="' + package_id + '">No</option>';
    } else {
        rows += '<option value="1" data-packageid="' + package_id + '">Yes</option><option selected value="2" data-packageid="' + package_id + '">No</option>';
    }

    rows += '</selected><input type="hidden" class="single_line_hidden" data-singleline="' + single_line + '" default-singleline="' + single_line + '" /></div></td></tr>';

    return rows;
}

function qtyCalculation(service_status, extra_service_qty, service_qty, invoiceable, job_source, netsuite_job_internalid, completed_qty, old_service_qty, old_extra_service_qty, partial_qty, incomplete_qty, invoiceable_qty, invoiceable_service_qty, invoiceable_extra_qty, completed_icon, partially_completed_icon, incompleted_icon, scheduled_icon, scheduled_qty, invoice_if_incomplete, invoiceable_completed_count, invoiceable_partial_count, invoiceable_incomplete_count, invoiceable_scheduled_count) {

    var temp_netsuite_job_internalid = null;
    var old_job_detail = '';
    var extra_qty = 0;

    if (service_status == 1) {
        if (isNullorEmpty(extra_service_qty)) {
            completed_qty = completed_qty + parseInt(service_qty);
            old_service_qty = old_service_qty + parseInt(service_qty);
            if (invoiceable == 2) {
                completed_icon = true;
                invoiceable_completed_count++;
            }
        } else {
            if (job_source != 5) {
                completed_qty = completed_qty + parseInt(extra_service_qty);
                old_service_qty = old_service_qty + parseInt(extra_service_qty);
                if (invoiceable == 2) {
                    completed_icon = true;
                    invoiceable_completed_count++;
                }
            } else {
                completed_qty = completed_qty + parseInt(extra_service_qty);
                old_extra_service_qty = old_extra_service_qty + parseInt(extra_service_qty);
            }

        }
    } else if (service_status == 2) { // IF JOB GROUP STATUS IS PARTIAL
        partial_qty = partial_qty + parseInt(service_qty);
        if (invoiceable == 1) {
            partially_completed_icon = true;
            invoiceable_partial_count++;
        }
    } else if (service_status == 3) { // IF JOB GROUP STATUS IS INCOMPLETE
        incomplete_qty = incomplete_qty + parseInt(service_qty);
        if (invoiceable == 1) {
            incompleted_icon = true;
            invoiceable_incomplete_count++;
        }
    } else if (service_status == 4 || (isNullorEmpty(service_status) && job_source != 5)) { //IF JOB GROUP STATUS IS SCHEDULED / BLANK AND NOT FROM NETSUITE 
        scheduled_qty = scheduled_qty + parseInt(service_qty);
        if (invoiceable == 1) {
            scheduled_icon = true;
            invoiceable_scheduled_count++;
        }
    }

    if (invoice_if_incomplete == 1 && (invoiceable == 1 || (isNullorEmpty(invoiceable)))) {

        if (isNullorEmpty(extra_service_qty)) {
            invoiceable_qty = invoiceable_qty + parseInt(service_qty);
            invoiceable_service_qty = invoiceable_qty; // APP QTY // APP QTY
        } else {
            if (job_source != 5) {
                invoiceable_qty = invoiceable_qty + parseInt(extra_service_qty);
                invoiceable_service_qty = invoiceable_qty; // APP QTY
            } else {
                // CALCULATE THE NETSUITE QTY AND INVOICEABLE QTY
                invoiceable_qty = invoiceable_qty + parseInt(extra_service_qty) + parseInt(service_qty);
                invoiceable_extra_qty = invoiceable_extra_qty + parseInt(extra_service_qty); // NETSUITE QTY
                temp_netsuite_job_internalid = netsuite_job_internalid;
            }
        }

    } else if (invoiceable == 1 || (isNullorEmpty(invoiceable) && service_status == 1)) {
        //JOBS THAT HAVE INVOICEABLE AS YES OR NULL AND JOB GROUP STATUS IS COMPLETED
        //IF EXTRA QTY IS NULL, CALCULATE INVOICEABLE QTY AND APP QTY
        if (isNullorEmpty(extra_service_qty)) {
            invoiceable_qty = invoiceable_qty + parseInt(service_qty);
            invoiceable_service_qty = invoiceable_service_qty + parseInt(service_qty); // APP QTY
        } else {

            if (job_source != 5) {
                invoiceable_qty = invoiceable_qty + parseInt(extra_service_qty);
                invoiceable_service_qty = invoiceable_service_qty + parseInt(extra_service_qty); // APP QTY
            } else {
                // CALCULATE THE NETSUITE QTY AND INVOICEABLE QTY
                invoiceable_qty = invoiceable_qty + parseInt(extra_service_qty) + parseInt(service_qty);
                invoiceable_extra_qty = invoiceable_extra_qty + parseInt(extra_service_qty); // NETSUITE QTY
                temp_netsuite_job_internalid = netsuite_job_internalid;
            }
        }
    }


    var returnArray = new Array();

    returnArray[returnArray.length] = completed_qty;
    returnArray[returnArray.length] = old_service_qty;
    returnArray[returnArray.length] = old_extra_service_qty;
    returnArray[returnArray.length] = partial_qty;
    returnArray[returnArray.length] = incomplete_qty;
    returnArray[returnArray.length] = extra_qty;
    returnArray[returnArray.length] = invoiceable_qty;
    returnArray[returnArray.length] = invoiceable_service_qty;
    returnArray[returnArray.length] = invoiceable_extra_qty;
    returnArray[returnArray.length] = completed_icon;
    returnArray[returnArray.length] = partially_completed_icon;
    returnArray[returnArray.length] = incompleted_icon;
    returnArray[returnArray.length] = temp_netsuite_job_internalid;
    returnArray[returnArray.length] = old_job_detail;
    returnArray[returnArray.length] = scheduled_icon;
    returnArray[returnArray.length] = scheduled_qty;
    returnArray[returnArray.length] = invoiceable_completed_count;
    returnArray[returnArray.length] = invoiceable_incomplete_count;
    returnArray[returnArray.length] = invoiceable_partial_count;
    returnArray[returnArray.length] = invoiceable_scheduled_count;

    return returnArray;
}

function invoiceableFieldsPackage(is_package, app_qty, ns_qty, package_id, service_rate, service_id, service_cat, ns_job_id, total_qty, single_line, gst, ns_item, ns_item_id) {

    var rows = '';

    //APP INVOICEABLE QTY
    if (is_package == true) {
        var app_class = 'form-control text-center package_app_qty invoiceable_qty_collpase';
    } else {
        var app_class = 'form-control text-center app_qty';
    }
    rows += '<td class="invoiceable_qty_collpase"><input type="text" readonly class="' + app_class + '" value="' + app_qty + '" style="width: 50px;"></td>';
    //NETSUITE INVOICEABLE QTY
    if (is_package == true) {
        var ns_class = 'form-control text-center package_netsuite_qty invoiceable_qty_collpase';
    } else {
        var ns_class = 'form-control text-center package_netsuite_qty';
    }
    rows += '<td class="invoiceable_qty_collpase"><input type="text" readonly class="' + ns_class + '" value="' + ns_qty + '" data-packageid="' + package_id + '" data-oldqty="' + ns_qty + '" data-rate="' + service_rate + '" data-serviceid="' + service_id + '" data-packageid="' + package_id + '" data-servicecat="' + service_cat + '" data-netsuitejob="' + ns_job_id + '" default-value="' + ns_qty + '"></td>';
    //TOTAL INVOICEABLE QTY
    if (is_package == true) {
        rows += '<td><input type="text" readonly class="form-control package_invoiceable_qty invoice_preview text-center" value="' + total_qty + '" data-oldqty="' + total_qty + '" data-singleline="' + single_line + '" data-rate="' + service_rate + '" data-serviceid="' + service_id + '" data-packageid="' + package_id + '" data-servicecat="' + service_cat + '" data-nsitem="' + ns_item + '" data-gst="' + gst + '" data-nsitemid="' + ns_item_id + '"></td>';
    } else {
        rows += '<td><input type="number" class="form-control invoiceable_qty text-center" value="' + total_qty + '" data-nsitem="' + ns_item + '" data-gst="' + gst + '" data-oldqty="' + total_qty + '" data-serviceid="' + service_id + '" data-rate="' + service_rate + '" data-servicecat="1" data-nsitemid="' + ns_item_id + '" pattern="[0-9]" min="0" step="1" onkeypress="return event.charCode >= 48 && event.charCode <= 57"></td>';
    }

    //TOTAL INVOICEABLE AMT
    if (ns_item_id == 97) {
        rows += '<td><strong><div class="input-group has-error"><span class="input-group-addon">$</span><input type="text" class="form-control service_total_value text-center" data-package="' + package_id + '" readonly value="' + ((total_qty * parseFloat(service_rate))).toFixed(2) + '" /></div>';
    } else {
        rows += '<td><strong><div class="input-group"><span class="input-group-addon">$</span><input type="text" class="form-control service_total_value text-center" data-package="' + package_id + '" readonly value="' + ((total_qty * parseFloat(service_rate))).toFixed(2) + '" /></div>';
    }


    if (is_package == false) {
        rows += '<input type="hidden" class="service_total" value="' + ((total_qty * parseFloat(service_rate))).toFixed(2) + '" />'
    }
    rows += '</strong></td></tr>';

    return rows;
}

function createServiceRecord(service_type, service_name, price, customer_id, comm_reg, package_id) {

    var new_service_record = nlapiCreateRecord('customrecord_service');
    new_service_record.setFieldValue('custrecord_service_customer', customer_id);
    new_service_record.setFieldValue('custrecord_service', service_type);
    new_service_record.setFieldValue('name', service_name);
    new_service_record.setFieldValue('custrecord_service_franchisee', zee);

    new_service_record.setFieldValue('custrecord_service_price', price);


    if (!isNullorEmpty(comm_reg)) {
        new_service_record.setFieldValue('custrecord_service_comm_reg', comm_reg);
    }

    if (!isNullorEmpty(package_id)) {
        new_service_record.setFieldValue('custrecord_service_package', package_id);

    }

    var service_id = nlapiSubmitRecord(new_service_record);

    return service_id;
}

function createJobRecord(customer_id, service_id, rate, qty, description, category, package_id, invoice_single_line, discount_type, end_date) {
    var job_new_record = nlapiCreateRecord('customrecord_job');

    job_new_record.setFieldValue('custrecord_job_customer', customer_id);
    job_new_record.setFieldValue('custrecord_job_franchisee', zee);
    job_new_record.setFieldValue('custrecord_job_service', service_id);
    job_new_record.setFieldValue('custrecord_job_service_price', rate);
    job_new_record.setFieldValue('custrecord_job_extras_qty', qty);
    job_new_record.setFieldValue('custrecord_job_status', 3);
    job_new_record.setFieldValue('custrecord_job_invoiceable', 1);
    job_new_record.setFieldValue('custrecord_job_date_reviewed', getDate());
    job_new_record.setFieldValue('custrecord_job_source', 5);
    job_new_record.setFieldValue('custrecord_job_invoice_detail', description);
    job_new_record.setFieldValue('custrecord_job_date_scheduled', end_date);
    if (category == '1') {
        job_new_record.setFieldValue('custrecord_job_group_status', 'Completed');
    }
    if (!isNullorEmpty(package_id)) {
        job_new_record.setFieldValue('custrecord_job_service_package', package_id);
        job_new_record.setFieldValue('custrecord_job_invoice_single_line_item', invoice_single_line);
    }
    job_new_record.setFieldValue('custrecord_job_service_category', category);
    job_new_record.setFieldValue('custrecord_job_discount_type', discount_type);

    nlapiSubmitRecord(job_new_record);
}