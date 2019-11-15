/*
 * Module Description
 * 
 * Author: Ankith Ravindran
 *
 * NSVersion  Date                		Last Modified time 			            
 * 1.00       2017-08-03 17:14:46  		2017-08-03 17:14:46           
 *
 * Remarks: Client to add Services /Extras
 *
 */

var baseURL = 'https://1048144.app.netsuite.com';
if (nlapiGetContext().getEnvironment() == "SANDBOX") {
	baseURL = 'https://system.sandbox.netsuite.com';
}

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

var package_name_create = new Array();
var package_count_create = new Array();
var item_array = new Array();
var item_price_array = [];
var package_count = 0;
var item_count = 0;
var item_price_count = 0;
var package_create = true;

/**
 * [pageInit description] - On Page initialization, form arrays to mnake sure that the duplication of the services/extras does not happen.
 */
function pageInit() {

	var service_cat = nlapiGetFieldValue('service_cat');

	if (service_cat == 1) {
		var searched_jobs = nlapiLoadSearch('customrecord_service', 'customsearch_service_invoicing_add_srvc');
	} else {
		var searched_jobs = nlapiLoadSearch('customrecord_service', 'customsearch_service_invoicing_add_srv_2');
	}


	var newFilters = new Array();
	newFilters[0] = new nlobjSearchFilter('custrecord_service_customer', null, 'is', nlapiGetFieldValue('customer'));
	if (service_cat != 1) {
		newFilters[1] = new nlobjSearchFilter('custrecord_service_package', null, 'anyof', '@NONE@');
	}

	searched_jobs.addFilters(newFilters);

	var resultSet = searched_jobs.runSearch();

	//Create the item_price_array and package_name_create arrays based on the existing service records
	resultSet.forEachResult(function(searchResult) {

		var item_description = searchResult.getValue('custrecord_service_description');
		item_description = serviceDescription(item_description);

		if (item_price_array[searchResult.getValue('custrecord_service')] == undefined) {
			item_price_array[searchResult.getValue('custrecord_service')] = [];
			item_price_array[searchResult.getValue('custrecord_service')][0] = searchResult.getValue('custrecord_service_price') + '_' + item_description;
		} else {
			var size = item_price_array[searchResult.getValue('custrecord_service')].length;
			item_price_array[searchResult.getValue('custrecord_service')][size] = searchResult.getValue('custrecord_service_price') + '_' + item_description;
		}

		item_price_count++;
		return true;
	});

	for (y = 1; y <= nlapiGetLineItemCount('services'); y++) {
		nlapiSetLineItemDisabled('services', 'itemprice', true, y);
	}
}

//Validate delete of service items. The service records are made inactive as requested by Will.
function validateDelete(type) {
	if (type == 'new_services') {
		if (confirm("Are you sure you want to delete this item?\n\nThis action cannot be undone.")) {
			var item_name = nlapiGetCurrentLineItemValue(type, 'new_item');
			var item_package = nlapiGetCurrentLineItemValue(type, 'new_item_package');
			if (item_name == 17 && !isNullorEmpty(item_package)) {
				discount_created[item_package] = 'F';
			}
			if (!isNullorEmpty(nlapiGetCurrentLineItemValue(type, 'new_service_record_internalid'))) {

				//Inactive the service record on remove

				var service_record_id = nlapiGetCurrentLineItemValue(type, 'new_service_record_internalid');

				var service_record = nlapiLoadRecord('customrecord_service', service_record_id);

				service_record.setFieldValue('isinactive', 'T');

				nlapiSubmitRecord(service_record);
			}
			return true;
		} else {
			return false;
		}
	}
}

/**
 * [clientFieldChanged description]
 * @param  {[type]} type    [description]
 * @param  {[type]} name    [description]
 * @param  {[type]} linenum [description]
 * @return {[type]}         [description]
 */
function clientFieldChanged(type, name, linenum) {

	if (type == 'new_services') {
		var item_name = nlapiGetCurrentLineItemValue('new_services', 'new_item');
		var item_price = nlapiGetCurrentLineItemValue('new_services', 'new_itemprice');
		var item_desc = nlapiGetCurrentLineItemValue('new_services', 'new_description');

		item_desc = serviceDescription(item_desc);

		if (name == 'new_item') {
			var item_name = nlapiGetCurrentLineItemValue('new_services', 'new_item');
			if (item_name == 22) {
				nlapiSetCurrentLineItemValue('new_services', 'new_itemprice', 9);
			}
		}
		if (name == 'new_itemprice') {

			itemPriceArray(item_name, item_price, item_desc);

		}
		if (name == 'new_description' && !isNullorEmpty(nlapiGetCurrentLineItemValue('new_services', 'new_itemprice'))) {

			itemPriceArray(item_name, item_price, item_desc);
		}
	}

}

/**
 * [saveRecord description] - 
 */
function saveRecord() {

	var customer = nlapiGetFieldValue('customer');
	var service_cat = nlapiGetFieldValue('service_cat');
	var start_date = nlapiGetFieldValue('start_date');
	var end_date = nlapiGetFieldValue('end_date');
	zee = nlapiGetFieldValue('zee_id');

	console.log(start_date)
	console.log(end_date)

	console.log(nlapiStringToDate(start_date))
	console.log(nlapiStringToDate(end_date))

	var recCustomer = nlapiLoadRecord('customer', customer);

	var franchisee = recCustomer.getFieldValue('partner');

	var commReg_search = nlapiLoadSearch('customrecord_commencement_register', 'customsearch_service_commreg_assign');

	var filterExpression = [
		["custrecord_customer", "anyof", customer], // customer id
		"AND", ["custrecord_franchisee", "is", franchisee] // partner id
	];

	commReg_search.setFilterExpression(filterExpression);

	var comm_reg_results = commReg_search.runSearch();

	var count_commReg = 0;
	var commReg = null;

	comm_reg_results.forEachResult(function(searchResult) {
		count_commReg++;

		/**
		 * [if description] - Only the latest comm Reg needs to be assigned
		 */
		if (count_commReg == 1) {
			commReg = searchResult.getValue('internalid');
		}

		/**
		 * [if description] - if more than one Comm Reg, error mail is sent
		 */
		if (count_commReg > 1) {
			return false;
		}
		return true;
	});
	var extra_service_id = [];
	var extra_qty = [];
	var extra_rate = [];
	var delete_job_id = [];

	var new_jobs_service_id = [];
	var new_jobs_rate = [];
	var new_jobs_qty = [];
	var new_jobs_cat = [];
	var new_jobs_descp = [];

	var new_service_type = [];
	var new_service_name = [];
	var new_service_price = [];
	var new_service_descp = [];
	var new_service_qty = [];
	var new_service_customer = [];
	var new_service_comm_reg = [];
	var new_service_cat = [];


	for (y = 1; y <= nlapiGetLineItemCount('services'); y++) {

		console.log(nlapiGetLineItemValue('services', 'service_record_internalid', y))

		var params = [];
		params[params.length] = customer;
		params[params.length] = zee;
		params[params.length] = service_cat;

		if (nlapiGetLineItemValue('services', 'itemaddqty', y) != nlapiGetLineItemValue('services', 'old_itemaddqty', y)) {

			console.log('inside');

			var item_list_value = nlapiGetLineItemValue('services', 'item', y);
			var package_name_stored = nlapiGetLineItemValue('services', 'item_package', y);
			var service_record_id = nlapiGetLineItemValue('services', 'service_record_internalid', y);
			var assign_package = false;


			if (service_record_id != 242 && service_record_id != 243 && service_record_id != 1904 && service_record_id != 241) {

				console.log('inside 2');

				var service_type = nlapiLoadRecord('customrecord_service_type', item_list_value);

				var searched_jobs_extras = nlapiLoadSearch('customrecord_job', 'customsearch_job_invoicing_jobs');

				var fil_po = [];
				fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_job_customer', null, 'is', customer);
				fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_job_service', null, 'is', service_record_id);
				fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_job_service_price', null, 'is', nlapiGetLineItemValue('services', 'itemprice', y));
				fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_job_source', null, 'is', 5);
				fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorafter', (start_date));
				fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorbefore', (end_date));

				searched_jobs_extras.addFilters(fil_po);

				var resultSet_extras = searched_jobs_extras.runSearch();

				var packageResult = resultSet_extras.getResults(0, 1);

				if (isNullorEmpty(packageResult)) {

					console.log(123);
					/**
					 * [if description] - If there is no job record present, create a job record with the details provided
					 */
					if (nlapiGetLineItemValue('services', 'itemaddqty', y) > 0) {
						if (zee == franchisee) {
							params[params.length] = service_record_id;
							params[params.length] = nlapiGetLineItemValue('services', 'itemaddqty', y);
							params[params.length] = null;
							params[params.length] = nlapiGetLineItemValue('services', 'itemprice', y);

							createNewJobRecord(params);
						} else {
							new_jobs_service_id[new_jobs_service_id.length] = service_record_id;
							new_jobs_rate[new_jobs_rate.length] = nlapiGetLineItemValue('services', 'itemprice', y);
							new_jobs_qty[new_jobs_qty.length] = nlapiGetLineItemValue('services', 'itemaddqty', y);
							new_jobs_cat[new_jobs_cat.length] = service_cat;
							new_jobs_descp[new_jobs_descp.length] = null;
						}
					}
				} else {
					if (packageResult.length == 1) {

						console.log(233);
						/**
						 * [if description] - If the updated qty entered is greater than 0, update the job record
						 */
						if (nlapiGetLineItemValue('services', 'itemaddqty', y) > 0) {
							resultSet_extras.forEachResult(function(searchResult_extras) {

								loadJobRecord(searchResult_extras.getValue('internalid'), nlapiGetLineItemValue('services', 'itemaddqty', y), service_cat);
								return true;
							});
						} else {
							/**
							 * [description] - If the qty entered is 0, then add the job record id to the array to be deleted in the suitlet
							 */
							resultSet_extras.forEachResult(function(searchResult_extras) {
								delete_job_id[delete_job_id.length] = searchResult_extras.getValue('internalid');
								return true;
							});
						}
					} else if (packageResult.length > 1) {
						alert('More than One Service');
						return false;
					}
				}
			} else {

				console.log('suitelet update');

				extra_service_id[extra_service_id.length] = service_record_id;
				extra_qty[extra_qty.length] = nlapiGetLineItemValue('services', 'itemaddqty', y);
				extra_rate[extra_rate.length] = nlapiGetLineItemValue('services', 'itemprice', y);
			}
		}
	}

	var extra_service_string = extra_service_id.join();
	var extra_qty_string = extra_qty.join();
	var extra_rate_string = extra_rate.join();
	var delete_job_id_string = delete_job_id.join();

	nlapiSetFieldValue('extra_service_string', extra_service_string);
	nlapiSetFieldValue('extra_qty_string', extra_qty_string);
	nlapiSetFieldValue('extra_rate_string', extra_rate_string);
	nlapiSetFieldValue('delete_job_id_string', delete_job_id_string);

	for (y = 1; y <= nlapiGetLineItemCount('new_services'); y++) {

		console.log('y' + y);

		var params = [];
		params[params.length] = customer;
		params[params.length] = zee;
		params[params.length] = service_cat;

		var item_list_value = nlapiGetLineItemValue('new_services', 'new_item', y);
		var package_name_stored = nlapiGetLineItemValue('new_services', 'new_item_package', y);
		var service_record_id = nlapiGetLineItemValue('new_services', 'new_service_record_internalid', y);

		var assign_package = false;

		var service_type = nlapiLoadRecord('customrecord_service_type', item_list_value);

		var service_id = null;

		if (!isNullorEmpty(service_record_id) && (nlapiGetLineItemValue('new_services', 'new_itemprice', y) == nlapiLookupField('customrecord_service', service_record_id, 'custrecord_service_price')) && (nlapiLookupField('customrecord_service', service_record_id, 'custrecord_service_comm_reg') == commReg)) {
			var new_service_record = nlapiLoadRecord('customrecord_service', service_record_id);
			new_service_record.setFieldValue('custrecord_service', item_list_value);
			new_service_record.setFieldValue('name', service_type.getFieldValue('name'));
			var service_rate = nlapiGetLineItemValue('new_services', 'new_itemprice', y);
			// if (item_list_value == 17) {
			// 	service_rate = -service_rate;
			// }

			new_service_record.setFieldValue('custrecord_service_price', service_rate);
			new_service_record.setFieldValue('custrecord_service_description', nlapiGetLineItemValue('new_services', 'new_description', y));

			if (!isNullorEmpty(commReg)) {
				new_service_record.setFieldValue('custrecord_service_comm_reg', commReg);

			}

			service_id = nlapiSubmitRecord(new_service_record);

			var searched_jobs_extras = nlapiLoadSearch('customrecord_job', 'customsearch_job_invoicing_jobs');

			var fil_po = [];
			fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_job_customer', null, 'is', customer);
			fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_job_service', null, 'is', service_id);
			fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_job_service_price', null, 'is', nlapiGetLineItemValue('new_services', 'new_itemprice', y));
			fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_job_source', null, 'is', 5);
			fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorafter', (start_date));
			fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorbefore', (end_date));


			searched_jobs_extras.addFilters(fil_po);

			var resultSet_extras = searched_jobs_extras.runSearch();

			var packageResult = resultSet_extras.getResults(0, 1);

			if (isNullorEmpty(packageResult)) {

				if (nlapiGetLineItemValue('new_services', 'new_itemaddqty', y) > 0) {

					if (zee == franchisee) {
						params[params.length] = service_id;
						params[params.length] = nlapiGetLineItemValue('new_services', 'new_itemaddqty', y);
						params[params.length] = nlapiGetLineItemValue('new_services', 'new_description', y);
						params[params.length] = nlapiGetLineItemValue('new_services', 'new_itemprice', y);


						createNewJobRecord(params);

						if (item_list_value == 22) {
							var custRecord = nlapiLoadRecord('customer', customer);

							custRecord.setFieldValue('custentity_admin_fees', nlapiGetLineItemValue('new_services', 'new_itemprice', y));

							nlapiSubmitRecord(custRecord);

						}
					}
				}


			} else {
				if (packageResult.length == 1) {
					resultSet_extras.forEachResult(function(searchResult_extras) {

						loadJobRecord(searchResult_extras.getValue('internalid'), nlapiGetLineItemValue('new_services', 'new_itemaddqty', y), service_cat, nlapiGetLineItemValue('new_services', 'new_description', y));
						return true;
					});

				} else if (packageResult.length > 1) {
					alert('More than One Service');
					return false;
				}
			}
		} else {
			if (zee == franchisee) {
				var new_service_record = nlapiCreateRecord('customrecord_service', {
					recordmode: 'dynamic'
				});
				new_service_record.setFieldValue('custrecord_service', item_list_value);
				new_service_record.setFieldValue('name', service_type.getFieldValue('name'));
				var service_rate = nlapiGetLineItemValue('new_services', 'new_itemprice', y);
				// if (item_list_value == 17) {
				// 	service_rate = -service_rate;
				// }

				new_service_record.setFieldValue('custrecord_service_price', service_rate);
				new_service_record.setFieldValue('custrecord_service_description', nlapiGetLineItemValue('new_services', 'new_description', y));
				new_service_record.setFieldValue('custrecord_service_customer', customer);
				if (!isNullorEmpty(commReg)) {
					new_service_record.setFieldValue('custrecord_service_comm_reg', commReg);

				}

				service_id = nlapiSubmitRecord(new_service_record);

				var searched_jobs_extras = nlapiLoadSearch('customrecord_job', 'customsearch_job_invoicing_jobs');

				var fil_po = [];
				fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_job_customer', null, 'is', customer);
				fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_job_service', null, 'is', service_id);
				fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_job_service_price', null, 'is', nlapiGetLineItemValue('new_services', 'new_itemprice', y));
				fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_job_source', null, 'is', 5);
				fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorafter', (start_date));
				fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorbefore', (end_date));


				searched_jobs_extras.addFilters(fil_po);

				var resultSet_extras = searched_jobs_extras.runSearch();

				var packageResult = resultSet_extras.getResults(0, 1);

				if (isNullorEmpty(packageResult)) {

					if (nlapiGetLineItemValue('new_services', 'new_itemaddqty', y) > 0) {

						if (zee == franchisee) {
							params[params.length] = service_id;
							params[params.length] = nlapiGetLineItemValue('new_services', 'new_itemaddqty', y);
							params[params.length] = nlapiGetLineItemValue('new_services', 'new_description', y);
							params[params.length] = nlapiGetLineItemValue('new_services', 'new_itemprice', y);


							createNewJobRecord(params);

							if (item_list_value == 22) {
								var custRecord = nlapiLoadRecord('customer', customer);

								custRecord.setFieldValue('custentity_admin_fees', nlapiGetLineItemValue('new_services', 'new_itemprice', y));

								nlapiSubmitRecord(custRecord);

							}
						}
					}


				} else {
					if (packageResult.length == 1) {
						resultSet_extras.forEachResult(function(searchResult_extras) {

							loadJobRecord(searchResult_extras.getValue('internalid'), nlapiGetLineItemValue('new_services', 'new_itemaddqty', y), service_cat, nlapiGetLineItemValue('new_services', 'new_description', y));
							return true;
						});

					} else if (packageResult.length > 1) {
						alert('More than One Service');
						return false;
					}
				}
			} else {
				new_service_price[new_service_price.length] = nlapiGetLineItemValue('new_services', 'new_itemprice', y);
				new_service_descp[new_service_descp.length] = nlapiGetLineItemValue('new_services', 'new_description', y);
				new_service_qty[new_service_qty.length] = nlapiGetLineItemValue('new_services', 'new_itemaddqty', y);
				new_service_customer[new_service_customer.length] = customer;
				new_service_type[new_service_type.length] = item_list_value;
				new_service_name[new_service_name.length] = service_type.getFieldValue('name');
				new_service_cat[new_service_cat.length] = service_cat;
			}
		}
	}

	nlapiSubmitRecord(recCustomer);

	var new_jobs_service_id_string = new_jobs_service_id.join();
	var new_jobs_rate_string = new_jobs_rate.join();
	var new_jobs_qty_string = new_jobs_qty.join();
	var new_jobs_cat_string = new_jobs_cat.join();
	var new_jobs_descp_string = new_jobs_descp.join();



	var new_service_type_string = new_service_type.join();
	var new_service_name_string = new_service_name.join();
	var new_service_price_string = new_service_price.join();
	var new_service_cat_string = new_service_cat.join();
	var new_service_descp_string = new_service_descp.join();
	var new_service_customer_string = new_service_customer.join();
	var new_service_comm_reg_string = new_service_comm_reg.join();
	var new_service_qty_string = new_service_qty.join();


	nlapiSetFieldValue('new_jobs_service_id_string', new_jobs_service_id_string);
	nlapiSetFieldValue('new_jobs_rate_string', new_jobs_rate_string);
	nlapiSetFieldValue('new_jobs_qty_string', new_jobs_qty_string);
	nlapiSetFieldValue('new_jobs_cat_string', new_jobs_cat_string);
	nlapiSetFieldValue('new_jobs_descp_string', new_jobs_descp_string);


	nlapiSetFieldValue('new_service_type_string', new_service_type_string);
	nlapiSetFieldValue('new_service_name_string', new_service_name_string);
	nlapiSetFieldValue('new_service_price_string', new_service_price_string);
	nlapiSetFieldValue('new_service_qty_string', new_service_qty_string);
	nlapiSetFieldValue('new_service_customer_string', new_service_customer_string);
	nlapiSetFieldValue('new_service_comm_reg_string', new_service_comm_reg_string);
	nlapiSetFieldValue('new_service_descp_string', new_service_descp_string);
	nlapiSetFieldValue('new_service_cat_string', new_service_cat_string);


	return true;
}

/**
 * [onclick_Back description] - Go back to the review page
 */
function onclick_Back() {

	var internal_id = nlapiGetFieldValue('customer');

	var upload_url = baseURL + nlapiResolveURL('SUITELET', 'customscript_sl_services_main_page', 'customdeploy_sl_services_main_page') + '&customer_id=' + internal_id + '&start_date=' + nlapiGetFieldValue('start_date') + '&end_date=' + nlapiGetFieldValue('end_date') + '&zee=' + nlapiGetFieldValue('zee_id');
	window.open(upload_url, "_self", "height=750,width=650,modal=yes,alwaysRaised=yes");

}

/**
 * [createNewJobRecord description] -  create New Job Record
 * @param  {Array} params 0th position - customer id
 * @param  {Array} params 1th position - franchisee id
 * @param  {Array} params 2th position - category
 * @param  {Array} params 3th position - service id
 * @param  {Array} params 4th position - qty
 * @param  {Array} params 5th position - Description
 * @param  {Array} params 6th position - Price
 */
function createNewJobRecord(params) {
	var job_new_record = nlapiCreateRecord('customrecord_job', {
		recordmode: 'dynamic'
	});


	console.log(params[0]);
	console.log(params[1]);

	job_new_record.setFieldValue('custrecord_job_customer', params[0]);
	// job_new_record.setFieldValue('custrecord_job_franchisee', params[1]);
	job_new_record.setFieldValue('custrecord_job_service', params[3]);
	job_new_record.setFieldValue('custrecord_job_extras_qty', params[4]);
	job_new_record.setFieldValue('custrecord_job_invoice_detail', params[5]);
	job_new_record.setFieldValue('custrecord_job_status', 3);
	job_new_record.setFieldValue('custrecord_job_invoiceable', 1);
	job_new_record.setFieldValue('custrecord_job_date_reviewed', getDate());
	job_new_record.setFieldValue('custrecord_job_source', 5);
	job_new_record.setFieldValue('custrecord_job_date_scheduled', nlapiGetFieldValue('end_date'));
	if (params[2] == '1') {
		job_new_record.setFieldValue('custrecord_job_group_status', 1);
	}
	job_new_record.setFieldValue('custrecord_job_service_category', params[2]);
	job_new_record.setFieldValue('custrecord_job_service_price', params[6]);

	nlapiSubmitRecord(job_new_record);
}

/**
 * [loadJobRecord description]
 * @param  {String} jobId      Job Record ID
 * @param  {String} qty        Qty to be updated in the job record
 * @param  {String} serviceCat service category
 */
function loadJobRecord(jobId, qty, serviceCat, description) {
	var job_record = nlapiLoadRecord('customrecord_job', jobId);
	job_record.setFieldValue('custrecord_job_extras_qty', qty);
	job_record.setFieldValue('custrecord_job_invoice_detail', description);
	job_record.setFieldValue('custrecord_job_status', 3);
	job_record.setFieldValue('custrecord_job_invoiceable', 1);
	job_record.setFieldValue('custrecord_job_date_reviewed', getDate());
	job_record.setFieldValue('custrecord_job_source', 5);
	job_record.setFieldValue('custrecord_job_date_scheduled', nlapiGetFieldValue('end_date'));
	if (serviceCat == '1') {
		job_record.setFieldValue('custrecord_job_group_status', 1);
	}
	nlapiSubmitRecord(job_record);
}

/**
 * [serviceDescription description] - Converts the description to lowercase / or makes the value 0 if the descriotion is null
 * @param  {String} description service description
 * @return {String}             
 */
function serviceDescription(description) {
	if (isNullorEmpty(description)) {
		description = 0;
	} else {
		description = description.replace(/\s+/g, '-').toLowerCase()
	}

	return description;
}

/**
 * [itemPriceArray description] - Create the Item price array to check for duplicate services entered
 * @param  {String} item_name  Item name
 * @param  {String} item_price Item price
 * @param  {String} item_desc  Item description
 */
function itemPriceArray(item_name, item_price, item_desc) {

	if (item_price_array[item_name] != undefined) {

		var size = item_price_array[item_name].length;

		for (var x = 0; x < size; x++) {

			var price_desc = item_price_array[item_name][x];

			price_desc = price_desc.split('_');

			if (price_desc[0] == item_price && price_desc[1] == item_desc) {
				alert('Duplicate Service with same price has been entered');
				nlapiCancelLineItem('new_services');
				return false;
			}
		}

		item_price_array[item_name][x] = item_price + '_' + item_desc;

	} else {
		item_price_array[item_name] = [];
		item_price_array[item_name][0] = item_price + '_' + item_desc;
	}
}