/*
 * Module Description
 * 
 * Author: Ankith Ravindran
 *
 * NSVersion  Date                      Last Modified time                      
 * 1.00       2017-08-03 17:14:37       2017-08-03 17:14:37           
 *
 * Remarks: Add Services from the Review Page. Script used for both Add Services as well as Add Extras.
 *
 */

var ctx = nlapiGetContext();

var zee = 0;
var role = ctx.getRole();

if (role == 1000) {
    //Franchisee
    zee = ctx.getUser();
} else if (role == 3) { //Administrator
    zee = 6; //test
} else if (role == 1032) { // System Support
    zee = 425904; //test-AR
}

/**
 * [serviceTypeLoop description] - To generate the service type dropwdown
 * @param  {[type]} searchResult Service Type search result
 * @param  {[type]} option       Dropdown option field
 * @return {[type]}              [description]
 */
function serviceTypeLoop(searchResult, option) {
    for (var x = 0; x < searchResult.length; x++) {
        if (searchResult[x].getValue('internalid') != 22) {
            option.addSelectOption(searchResult[x].getValue('internalid'), searchResult[x].getValue('name'));
        }

    }
}

/**
 * [add_service description] - Add Services from the Review Page. Script used for both Add Services as well as Add Extras.
 * @param  {String} request  when the page is loaded
 * @param  {String} response when the page is submitted
 */
function add_service(request, response) {

    if (request.getMethod() == "GET") {

        var customer_record = nlapiLoadRecord('customer', request.getParameter('custid'));

        // zee = parseInt(request.getParameter('zee'));

        /**
         * [if description] - If services, search: Job - Service - Add Services
         */
        if (request.getParameter('service_cat') == '1') {
            var form = nlapiCreateForm('Services: ' + customer_record.getFieldValue('entityid') + ' ' + customer_record.getFieldValue('companyname'));
            var searched_jobs = nlapiLoadSearch('customrecord_service', 'customsearch_service_invoicing_add_srvc');
        } else {
            var form = nlapiCreateForm('Extras: ' + customer_record.getFieldValue('entityid') + ' ' + customer_record.getFieldValue('companyname'));
            /**
             * If extras, search: Job - Service - Add Extras
             */

            var searched_jobs = nlapiLoadSearch('customrecord_service', 'customsearch_service_invoicing_add_srv_2');
        }

        var pricing_subTab = form.addFieldGroup('custom_pricing', 'Service Pricing');
        form.addField('start_date', 'text', 'start_date').setDisplayType('hidden').setDefaultValue(request.getParameter('start_date'));
        form.addField('end_date', 'text', 'end_date').setDisplayType('hidden').setDefaultValue(request.getParameter('end_date'));
        form.addField('extra_service_string', 'text', 'extra_service_string').setDisplayType('hidden');
        form.addField('extra_qty_string', 'text', 'extra_qty_string').setDisplayType('hidden');
        form.addField('extra_rate_string', 'text', 'extra_rate_string').setDisplayType('hidden');
        form.addField('delete_job_id_string', 'text', 'delete_job_id_string').setDisplayType('hidden');
        form.addField('zee_id', 'text', 'delete_job_id_string').setDisplayType('hidden').setDefaultValue(zee);

        form.addField('new_jobs_service_id_string', 'text', 'new_jobs_service_id_string').setDisplayType('hidden');
        form.addField('new_jobs_rate_string', 'text', 'new_jobs_rate_string').setDisplayType('hidden');
        form.addField('new_jobs_qty_string', 'text', 'new_jobs_qty_string').setDisplayType('hidden');
        form.addField('new_jobs_cat_string', 'text', 'new_jobs_cat_string').setDisplayType('hidden');
        form.addField('new_jobs_descp_string', 'text', 'new_jobs_descp_string').setDisplayType('hidden');

        //New Services to be created from the client
        form.addField('new_service_type_string', 'text', 'new_service_type_string').setDisplayType('hidden');
        form.addField('new_service_name_string', 'text', 'new_service_name_string').setDisplayType('hidden');
        form.addField('new_service_price_string', 'text', 'new_service_price_string').setDisplayType('hidden');
        form.addField('new_service_qty_string', 'text', 'new_service_qty_string').setDisplayType('hidden');
        form.addField('new_service_customer_string', 'text', 'new_service_customer_string').setDisplayType('hidden');
        form.addField('new_service_comm_reg_string', 'text', 'new_service_comm_reg_string').setDisplayType('hidden');
        form.addField('new_service_descp_string', 'text', 'new_service_descp_string').setDisplayType('hidden');
        form.addField('new_service_cat_string', 'text', 'new_service_cat_string').setDisplayType('hidden');



        var newFilters = new Array();
        newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_service_customer', null, 'anyof', request.getParameter('custid'));

        if (request.getParameter('service_cat') == '3') {
            newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_service_package', null, 'anyof', '@NONE@');
            newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_service_category', null, 'anyof', [2, 3]);
            newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_service_franchisee', null, 'anyof', [zee, "@NONE@"]);
        } else {
            newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_service_franchisee', null, 'anyof', zee);
        }

        searched_jobs.addFilters(newFilters);



        var resultSet = searched_jobs.runSearch();

        /**
         * [if description] - Based on the Service Category, the heading for the sublists change
         */
        if (request.getParameter('service_cat') == '3') {
            form.addTab('custom_pricing', 'Standard / Used Extras');
            form.addTab('custom_new_pricing', 'Custom Extras');
            form.addSubTab('custpage_pricing', 'Standard / Extras', 'custom_pricing');
            form.addSubTab('custpage_new_pricing', 'Custom Extras', 'custom_new_pricing');
        } else {
            form.addTab('custom_pricing', 'Existing / Used Services');
            form.addTab('custom_new_pricing', 'New Services');
            form.addSubTab('custpage_pricing', 'Existing / Used  Services', 'custom_pricing');
            form.addSubTab('custpage_new_pricing', 'New Services', 'custom_new_pricing');
        }


        form.addField('customer', 'select', 'Company', 'customer', 'main').setDisplayType('hidden').setDefaultValue(request.getParameter('custid'));
        form.addField('service_cat', 'text', 'Category').setDisplayType('hidden').setDefaultValue(request.getParameter('service_cat'));

        var sublistPricing = form.addSubList('services', 'editor', 'Services / Extras', 'custpage_pricing');
        sublistPricing.addField('service_record_internalid', 'integer', 'InternalID').setDisplayType('hidden');
        sublistPricing.addField('service_category', 'integer', 'Service Category').setDisplayType('hidden');
        var service_type = sublistPricing.addField('item', 'select', 'Item').setDisplayType('disabled').setMandatory(true);
        service_type.addSelectOption('', '');
        if (request.getParameter('service_cat') == '1') {
            var service_typeSearch = serviceTypeSearch(null, [1]);
        } else {
            var service_typeSearch = serviceTypeSearch(null, [2, 3]);
        }

        serviceTypeLoop(service_typeSearch, service_type);

        sublistPricing.addField('itemdescp', 'text', 'Description').setDisplayType('disabled');
        sublistPricing.addField('itemprice', 'currency', 'Price (ex GST)').setDisplayType('disabled').setMandatory(true);
        sublistPricing.addField('itemqty', 'text', 'App Quantity').setDisplayType('disabled').setMandatory(true).setDefaultValue('0');
        sublistPricing.addField('itemaddqty', 'integer', 'Additional Quantity').setMandatory(true);
        sublistPricing.addField('old_itemaddqty', 'integer', 'Old Additional Quantity').setDisplayType('hidden');

        var i = 0;

        resultSet.forEachResult(function(searchResult) {

            var searched_jobs_2 = nlapiLoadSearch('customrecord_job', 'customsearch_job_invoicing_mainpage');

            var service_record_id = searchResult.getValue('internalid');

            var zee_record = nlapiLoadRecord('partner', zee);

            var zee_text = zee_record.getFieldValue('entitytitle');

            var strFormula = "COALESCE({custrecord_job_service.custrecord_service_franchisee},{custrecord_job_group.custrecord_jobgroup_franchisee},{custrecord_job_franchisee},'')";

            var newFilters_2 = new Array();
            newFilters_2[newFilters_2.length] = new nlobjSearchFilter('custrecord_job_customer', null, 'is', request.getParameter('custid'));
            newFilters_2[newFilters_2.length] = new nlobjSearchFilter('custrecord_job_service', null, 'is', searchResult.getValue('internalid'));
            if (!isNullorEmpty(request.getParameter('start_date')) && !isNullorEmpty(request.getParameter('end_date'))) {
                newFilters_2[newFilters_2.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorafter', nlapiStringToDate(request.getParameter('start_date')));
                newFilters_2[newFilters_2.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorbefore', nlapiStringToDate(request.getParameter('end_date')));
            }
            if (request.getParameter('service_cat') == 3) {
                newFilters_2[newFilters_2.length] = new nlobjSearchFilter('custrecord_job_service_category', null, 'anyof', [2, 3]);
            } else {
                newFilters_2[newFilters_2.length] = new nlobjSearchFilter('custrecord_job_service_category', null, 'is', request.getParameter('service_cat'));
            }
            newFilters_2[newFilters_2.length] = new nlobjSearchFilter('formulatext', null, 'is', zee_text).setFormula(strFormula);

            searched_jobs_2.addFilters(newFilters_2);

            var resserviceultSet_2 = searched_jobs_2.runSearch();

            var total_qty = 0;
            var extra_total_qty = 0;

            resultSet_2.forEachResult(function(searchResult_2) {

                var service_qty = (searchResult_2.getValue('formulacurrency', null, 'count'));

                var service_status = searchResult_2.getValue('custrecord_jobgroup_status', 'CUSTRECORD_JOB_GROUP', 'group');
                var extra_service_qty = (searchResult_2.getValue('custrecord_job_extras_qty', null, 'sum'));
                var job_source = searchResult_2.getValue('custrecord_job_source', null, 'group');

                var invoiceable = searchResult_2.getValue('custrecord_job_invoiceable', null, 'group');

                nlapiLogExecution('DEBUG', 'service_qty', service_qty);
                nlapiLogExecution('DEBUG', 'extra_service_qty', extra_service_qty);

                if (invoiceable == 1 || (isNullorEmpty(invoiceable) && service_status == 1)) {
                    if (isNullorEmpty(extra_service_qty)) {
                        if (!isNullorEmpty(service_qty)) {
                            total_qty = parseInt(total_qty) + parseInt(service_qty);
                        }
                    } else {

                        if (job_source != 5) {
                            if (!isNullorEmpty(extra_service_qty)) {
                                total_qty = parseInt(total_qty) + parseInt(extra_service_qty);
                            }
                        } else {
                            if (!isNullorEmpty(extra_service_qty)) {
                                extra_total_qty = parseInt(extra_total_qty) + parseInt(extra_service_qty);
                            }
                        }
                    }
                }
                return true;
            });



            sublistPricing.setLineItemValue('service_record_internalid', i + 1, searchResult.getValue('internalid'));
            sublistPricing.setLineItemValue('service_category', i + 1, searchResult.getValue('custrecord_service_category'));
            sublistPricing.setLineItemValue('item', i + 1, searchResult.getValue('custrecord_service'));
            sublistPricing.setLineItemValue('itemdescp', i + 1, searchResult.getValue('custrecord_service_description'));
            sublistPricing.setLineItemValue('itemprice', i + 1, searchResult.getValue('custrecord_service_price'));
            sublistPricing.setLineItemValue('itemqty', i + 1, String(total_qty));
            sublistPricing.setLineItemValue('itemaddqty', i + 1, String(extra_total_qty));
            sublistPricing.setLineItemValue('old_itemaddqty', i + 1, String(extra_total_qty));

            i++;
            return true;
        });

        sublistPricing.addField('deletepricing', 'text', 'Deleted Pricing').setDisplayType('hidden');

        var sublistNewPricing = form.addSubList('new_services', 'inlineeditor', 'Services', 'custpage_new_pricing');
        sublistNewPricing.addField('new_service_record_internalid', 'integer', 'InternalID').setDisplayType('hidden');
        var service_type = sublistNewPricing.addField('new_item', 'select', 'Item').setMandatory(true);
        service_type.addSelectOption('', '');
        if (request.getParameter('service_cat') != '1') {
            var service_typeSearch = serviceTypeSearch(null, [3]);
        }

        serviceTypeLoop(service_typeSearch, service_type);

        sublistNewPricing.addField('new_description', 'text', 'Service Description');
        sublistNewPricing.addField('new_itemprice', 'currency', 'Price (ex GST)').setMandatory(true);
        sublistNewPricing.addField('new_itemaddqty', 'text', 'New Quantity').setMandatory(true);

        if (request.getParameter('service_cat') == '1') {
            form.addSubmitButton('Add Services');
        } else {
            form.addSubmitButton('Add Extras');
        }

        form.addButton('cust_back', 'Back', 'onclick_Back()');
        form.addButton('cust_back', 'Reset', 'onclick_reset()');
        form.setScript('customscript_cl_add_service');
        response.writePage(form);

    } else {

        var internal_id = request.getParameter('customer');
        var extra_service_string = request.getParameter('extra_service_string');
        var extra_qty_string = request.getParameter('extra_qty_string');
        var extra_rate_string = request.getParameter('extra_rate_string');
        var delete_job_id_string = request.getParameter('delete_job_id_string');

        nlapiLogExecution('DEBUG', 'delete1', delete_job_id_string);

        var recCustomer = nlapiLoadRecord('customer', internal_id);

        var extra_service = extra_service_string.split(',');
        var extra_qty = extra_qty_string.split(',');
        var extra_rate = extra_rate_string.split(',');
        var delete_job_id = delete_job_id_string.split(',');

        //Get the New Jobs values
        var new_jobs_service_id_string = request.getParameter('new_jobs_service_id_string');
        var new_jobs_rate_string = request.getParameter('new_jobs_rate_string');
        var new_jobs_qty_string = request.getParameter('new_jobs_qty_string');
        var new_jobs_cat_string = request.getParameter('new_jobs_cat_string');
        var new_jobs_descp_string = request.getParameter('new_jobs_descp_string');


        //Get the New Services values
        var new_service_type_string = request.getParameter('new_service_type_string');
        var new_service_name_string = request.getParameter('new_service_name_string');
        var new_service_price_string = request.getParameter('new_service_price_string');
        var new_service_qty_string = request.getParameter('new_service_qty_string');
        var new_service_customer_string = request.getParameter('new_service_customer_string');
        var new_service_comm_reg_string = request.getParameter('new_service_comm_reg_string');
        var new_service_descp_string = request.getParameter('new_service_descp_string');
        var new_service_cat_string = request.getParameter('new_service_cat_string');

        if (!isNullorEmpty(new_jobs_service_id_string)) {
            var new_jobs_service_id = new_jobs_service_id_string.split(',');
            var new_jobs_rate = new_jobs_rate_string.split(',');
            var new_jobs_qty = new_jobs_qty_string.split(',');
            var new_jobs_cat = new_jobs_cat_string.split(',');
            var new_jobs_descp = new_jobs_descp_string.split(',');

            for (var x = 0; x < new_jobs_service_id.length; x++) {
                createJobRecord(internal_id, new_jobs_service_id[x], new_jobs_rate[x], new_jobs_qty[x], new_jobs_descp[x], new_jobs_cat[x], request.getParameter('end_date'));
            }
        }


        if (!isNullorEmpty(new_service_type_string)) {
            var new_service_type = new_service_type_string.split(',');
            var new_service_name = new_service_name_string.split(',');
            var new_service_price = new_service_price_string.split(',');
            var new_service_customer = new_service_customer_string.split(',');
            var new_service_comm_reg = new_service_comm_reg_string.split(',');
            var new_service_qty = new_service_qty_string.split(',');
            var new_service_descp = new_service_descp_string.split(',');
            var new_service_cat = new_service_cat_string.split(',');

            for (var x = 0; x < new_service_type.length; x++) {

                var new_service_id = createServiceRecord(new_service_type[x], new_service_name[x], new_service_price[x], internal_id, new_service_comm_reg[x]);

                createJobRecord(internal_id, new_service_id, new_service_price[x], new_service_qty[x], new_service_descp[x], new_service_cat[x], request.getParameter('end_date'));
            }
        }



        nlapiLogExecution('DEBUG', 'delete2', delete_job_id);


        /**
         * [if description] - Delete the job records if the value entered in the update qty is 0
         */
        if (!isNullorEmpty(delete_job_id)) {
            for (var i = 0; i < delete_job_id.length; i++) {
                nlapiDeleteRecord('customrecord_job', delete_job_id[i]);
            }
        }

        /**
         * [if description] - Create / Update the extra services in the suitlet instead of the client script becasue the these extra services have just one service record from which the job is created and hence the fracnhisee will not be able to access the service record until and unless its done in the suitlet which is run as administrator.
         */
        if (!isNullorEmpty(extra_service_string) && !isNullorEmpty(extra_qty_string)) {
            for (var i = 0; i < extra_service.length; i++) {
                var searched_jobs_extras = nlapiLoadSearch('customrecord_job', 'customsearch_job_invoicing_jobs');

                var fil_po = [];
                fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_job_customer', null, 'is', internal_id);
                fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_job_service', null, 'is', extra_service[i]);
                fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_job_source', null, 'is', 5);
                fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorafter', nlapiStringToDate(request.getParameter('start_date')));
                fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorbefore', nlapiStringToDate(request.getParameter('end_date')));

                searched_jobs_extras.addFilters(fil_po);

                var resultSet_extras = searched_jobs_extras.runSearch();

                var packageResult = resultSet_extras.getResults(0, 1);

                if (packageResult.length == 0) {

                    if (extra_qty[i] > 0) {
                        var job_new_record = nlapiCreateRecord('customrecord_job', {
                            recordmode: 'dynamic'
                        });

                        // var franchisee = recCustomer.getFieldValue('partner');

                        job_new_record.setFieldValue('custrecord_job_customer', internal_id);
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

        var params = new Array();
        params['customer_id'] = internal_id;
        params['start_date'] = request.getParameter('start_date');
        params['end_date'] = request.getParameter('end_date');
        params['zee'] = request.getParameter('zee_id');
        nlapiSetRedirectURL('SUITELET', 'customscript_sl_services_main_page', 'customdeploy_sl_services_main_page', null, params);
    }
}

function createServiceRecord(service_type, service_name, price, customer_id, comm_reg) {

    var new_service_record = nlapiCreateRecord('customrecord_service');
    new_service_record.setFieldValue('custrecord_service_customer', customer_id);
    new_service_record.setFieldValue('custrecord_service', service_type);
    new_service_record.setFieldValue('name', service_name);
    new_service_record.setFieldValue('custrecord_service_franchisee', zee);

    new_service_record.setFieldValue('custrecord_service_price', price);

        if (!isNullorEmpty(comm_reg)) {
        new_service_record.setFieldValue('custrecord_service_comm_reg', comm_reg);
    }

    var service_id = nlapiSubmitRecord(new_service_record);

    return service_id;
}

function createJobRecord(customer_id, service_id, rate, qty, description, category, end_date) {
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
    job_new_record.setFieldValue('custrecord_job_service_category', category);

    nlapiSubmitRecord(job_new_record);
}