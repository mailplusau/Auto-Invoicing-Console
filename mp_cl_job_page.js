/*
 * Module Description
 * 
 * Author: Ankith Ravindran
 *
 * NSVersion  Date                		Last Modified time 			            
 * 1.00       2017-08-10 14:11:26  		2017-08-10 14:11:26           
 *
 * Remarks: Client script to set the invoicebale field to either Yes / No
 *
 */

var baseURL = 'https://1048144.app.netsuite.com';
if (nlapiGetContext().getEnvironment() == "SANDBOX") {
	baseURL = 'https://1048144-sb3.app.netsuite.com';
}

var service;
var price;
var customer;
var status;
var category;

var global_locked = null;

/**
 * [clientPageInit description] - On page initialization
 */
function clientPageInit(type) {

	service = nlapiGetFieldValue('service');
	price = nlapiGetFieldValue('price');
	customer = nlapiGetFieldValue('customer');
	status = nlapiGetFieldValue('group_status');
	category = nlapiGetFieldValue('category');
	global_locked = nlapiGetFieldValue('locked');

	if (global_locked == 'yes') {
		document.getElementById('tr_submitter').style.display = 'none';
		$('.inv_dropdown').prop('disabled', function(i, v) {
			return !v;
		});
	}
}

/**
 * [onclick_reset description] - Reload the page on click of the reset button 
 */
function onclick_reset() {
	window.location.href = window.location.href;
}

$(document).on("change", ".inv_dropdown", function(e) {

	var discount_type = $(this).val();
	//IF THE DISCOUNT TYPE IS $, SHOW THE DISCOUNT QTY
	if (discount_type == 1) {
		$(this).closest('tr').find('.invoiceable_border').addClass('has-success');
		$(this).closest('tr').find('.invoiceable_border').removeClass('has-error');
	} else {
		$(this).closest('tr').find('.invoiceable_border').removeClass('has-success');
		$(this).closest('tr').find('.invoiceable_border').addClass('has-error');
	}

});


/**
 * [saveRecord description] - Main save function once, submit is clicked.
 */
function saveRecord() {

	var oldJobGroup = "";
	var assignPackage = nlapiGetFieldValue('package');
	var packageID = nlapiGetFieldValue('package_id');

	var searchUsed = null;

	var discount_period = null;

	// inv_dropdown
	// var inv_dropdown_elem = document.getElementsByClassName("inv_dropdown");

	// for (var i = 0; i < inv_dropdown_elem.length; ++i) {
	// 	var initial_changed_qty = inv_dropdown_elem[i].value;
	// 	var initial_load_qty = inv_dropdown_elem[i].getAttribute("data-jobgroups");
	// }

	/**
	 * [if description] -  if category is extras, search: Job - Invoicing Review - Invoicing Jobs
	 * @param  {string} nlapiGetFieldValue('category') [description]
	 */
	// if (nlapiGetFieldValue('category') == 'Extras') {
	// 	var searchedJobs = nlapiLoadSearch('customrecord_job', 'customsearch_job_invoicing_jobs');
	// 	searchUsed = 1;
	// } else {
	/**
	 * [if description] - If incoming status is 3, search: Job - Invoicing Review - Invoicing Jobs (Incomplete)
	 * @param  {string} nlapiGetFieldValue('incoming_status') [description]
	 */
	// if (nlapiGetFieldValue('incoming_status') == '3') {
	// 	var searchedJobs = nlapiLoadSearch('customrecord_job', 'customsearch_job_invoicing_jobs_inc');
	// 	searchUsed = 2;
	// } else {
	var searchedJobs = nlapiLoadSearch('customrecord_job', 'customsearch_job_invoicing_jobs');
	// 		searchUsed = 1;
	// 	}
	// }
	// 



	var fil = [];
	fil[fil.length] = new nlobjSearchFilter('custrecord_job_customer', null, 'is', customer);
	fil[fil.length] = new nlobjSearchFilter('custrecord_job_source', null, 'anyof', [1, 2, 3, 4,6]);

	if (packageID == 'null' || isNullorEmpty(packageID)) {
		fil[fil.length] = new nlobjSearchFilter('custrecord_job_service', null, 'is', service);
		fil[fil.length] = new nlobjSearchFilter('custrecord_job_service_price', null, 'is', price);
		fil[fil.length] = new nlobjSearchFilter('custrecord_job_service_package', null, 'anyof', '@NONE@');
		if (nlapiGetFieldValue('category') == 'Services') {
			fil[fil.length] = new nlobjSearchFilter('custrecord_job_group_status', null, 'is', nlapiGetFieldValue('group_status'));
		}

	} else {
		var package_record = nlapiLoadRecord('customrecord_service_package', packageID);
		discount_period = package_record.getFieldValue('custrecord_service_package_disc_period');
		fil[fil.length] = new nlobjSearchFilter('custrecord_job_service_package', null, 'anyof', packageID);
		if (discount_period == 3) {
			fil[fil.length] = new nlobjSearchFilter('custrecord_job_service', null, 'is', service);
			fil[fil.length] = new nlobjSearchFilter('custrecord_job_service_price', null, 'is', price);
			fil[fil.length] = new nlobjSearchFilter('custrecord_job_service_package', null, 'anyof', packageID);
			if (nlapiGetFieldValue('category') == 'Services') {
				fil[fil.length] = new nlobjSearchFilter('custrecord_job_group_status', null, 'is', nlapiGetFieldValue('group_status'));
			}
		} else {
			fil[fil.length] = new nlobjSearchFilter('custrecord_package_status', null, 'is', nlapiGetFieldValue('incoming_status'));
		}
	}
	if (!isNullorEmpty(nlapiGetFieldValue('start_date')) && !isNullorEmpty(nlapiGetFieldValue('end_date'))) {
		fil[fil.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorafter', (nlapiGetFieldValue('start_date')));
		fil[fil.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorbefore', (nlapiGetFieldValue('end_date')));
	}

	searchedJobs.addFilters(fil);

	var resultSet = searchedJobs.runSearch();

	var i = 0;

	var job_array = [];
	var invoiceable_array = [];
	var package_array = [];

	resultSet.forEachResult(function(searchResult) {

		if (assignPackage == 'true') {
			var option = document.getElementById('package_assigned[' + i + ']');
		} else {
			var option = document.getElementById('invoiceable[' + i + ']');
		}
		var defaultOption = document.getElementById('default_value[' + i + ']');

		if (!isNullorEmpty(option) && !isNullorEmpty(defaultOption)) {
			var value = option.value;
			var defaultValue = defaultOption.value;



			if (value != defaultValue && value != 0) {

				if (packageID == 'null' || isNullorEmpty(packageID) || discount_period == 3) {
					var jobGroup = searchResult.getValue('custrecord_job_group');
				} else {
					var jobGroup = searchResult.getValue('custrecord_package_job_groups');
					jobGroup = jobGroup.split(',');
				}

				// alert(jobGroup);
				// if (searchUsed == 1) {
				var searchedJobsExtras = nlapiLoadSearch('customrecord_job', 'customsearch_job_invoicing_jobs');
				// } else {
				// 	var searchedJobsExtras = nlapiLoadSearch('customrecord_job', 'customsearch_job_invoicing_jobs_inc');
				// }

				var filPo = [];

				filPo[filPo.length] = new nlobjSearchFilter('custrecord_job_customer', null, 'is', customer);
				filPo[filPo.length] = new nlobjSearchFilter('custrecord_job_source', null, 'anyof', [1, 2, 3, 4, 6]);
				if (packageID == 'null' || isNullorEmpty(packageID) || discount_period == 3) {
					filPo[filPo.length] = new nlobjSearchFilter('custrecord_job_service', null, 'is', service);
					filPo[filPo.length] = new nlobjSearchFilter('custrecord_job_service_price', null, 'is', price);
					if (nlapiGetFieldValue('category') == 'Services' && nlapiGetFieldValue('incoming_status') != 3) {
						filPo[filPo.length] = new nlobjSearchFilter('custrecord_job_group_status', null, 'is', nlapiGetFieldValue('group_status'));
					}
				}

				if (!isNullorEmpty(jobGroup)) {
					filPo[filPo.length] = new nlobjSearchFilter('custrecord_job_group', null, 'anyof', jobGroup);
				}

				searchedJobsExtras.addFilters(filPo);

				var resultSetExtras = searchedJobsExtras.runSearch();

				if (!isNullorEmpty(jobGroup)) {
					if (oldJobGroup != jobGroup) {

						if (value != defaultValue && value != 0) {

							// var count = 0;
							resultSetExtras.forEachResult(function(searchResultExtras) {

								var jobID = searchResultExtras.getValue('internalid');

								if (typeof job_array[i] == 'undefined') {
									job_array[i] = [];
								}
								var job_len = job_array[i].length;
								job_array[i][job_len] = jobID;

								// console.log(invoiceable_array[i]);

								if (typeof package_array[i] == 'undefined') {
									package_array[i] = [];
								}

								if (typeof invoiceable_array[i] == 'undefined') {
									invoiceable_array[i] = [];
								}

								var pack_len = package_array[i].length;
								var inv_len = invoiceable_array[i].length;

								// var jobRecord = nlapiLoadRecord('customrecord_job', searchResultExtras.getValue('internalid'));

								if (assignPackage == 'true') {
									package_array[i][pack_len] = value
									// jobRecord.setFieldValue('custrecord_job_service_package', value);
								} else {
									invoiceable_array[i][inv_len] = value;
									// jobRecord.setFieldValue('custrecord_job_invoiceable', value);
								}

								// jobRecord.setFieldValue('custrecord_job_date_reviewed', getDate());

								// nlapiSubmitRecord(jobRecord);
								// count++;
								return true;
							});

							// alert(count);
							// return false;
						}
					}
					oldJobGroup = jobGroup;
				} else {
					var option = document.getElementById('package_assigned[' + i + ']');

					if (!isNullorEmpty(option)) {
						var value = option.value;

						if (value == 0) {
							// var count = 0;
							resultSetExtras.forEachResult(function(searchResultExtras) {

								var jobID = searchResultExtras.getValue('internalid');

								if (typeof job_array[i] == 'undefined') {
									job_array[i] = [];
								}
								var job_len = job_array[i].length;
								job_array[i][job_len] = jobID;

								if (typeof package_array[i] == 'undefined') {
									package_array[i] = [];
								}

								// if(invoiceable_array[i] == 'undefined'){
								// 	invoiceable_array[i] = [];
								// }

								var pack_len = package_array[i].length;
								// var inv_len = invoiceable_array[i].length;

								package_array[i][pack_len] = null

								// var jobRecord = nlapiLoadRecord('customrecord_job', searchResultExtras.getValue('internalid'));

								// jobRecord.setFieldValue('custrecord_job_service_package', null);

								// nlapiSubmitRecord(jobRecord);
								return true;
							});
						} else {
							resultSetExtras.forEachResult(function(searchResultExtras) {
								var jobID = searchResultExtras.getValue('internalid');

								if (typeof job_array[i] == 'undefined') {
									job_array[i] = [];
								}
								var job_len = job_array[i].length;
								job_array[i][job_len] = jobID;

								if (typeof package_array[i] == 'undefined') {
									package_array[i] = [];
								}

								// if(invoiceable_array[i] == 'undefined'){
								// 	invoiceable_array[i] = [];
								// }

								var pack_len = package_array[i].length;
								// var inv_len = invoiceable_array[i].length;

								package_array[i][pack_len] = value

								// package_array[i] = value;

								// var jobRecord = nlapiLoadRecord('customrecord_job', searchResultExtras.getValue('internalid'));

								// jobRecord.setFieldValue('custrecord_job_service_package', value);

								// nlapiSubmitRecord(jobRecord);
								return true;
							});
						}
					} else {
						if (value != defaultValue && value != 0) {

							resultSetExtras.forEachResult(function(searchResultExtras) {
								var jobID = searchResultExtras.getValue('internalid');

								if (typeof job_array[i] == 'undefined') {
									job_array[i] = [];
								}
								var job_len = job_array[i].length;
								job_array[i][job_len] = jobID;

								if (typeof package_array[i] == 'undefined') {
									package_array[i] = [];
								}

								if (typeof invoiceable_array[i] == 'undefined') {
									invoiceable_array[i] = [];
								}

								var pack_len = package_array[i].length;
								var inv_len = invoiceable_array[i].length;

								// var jobRecord = nlapiLoadRecord('customrecord_job', searchResultExtras.getValue('internalid'));

								if (assignPackage == 'true') {
									package_array[i][pack_len] = value
									// jobRecord.setFieldValue('custrecord_job_service_package', value);
								} else {
									invoiceable_array[i][inv_len] = value;
									// jobRecord.setFieldValue('custrecord_job_invoiceable', value);
								}

								// jobRecord.setFieldValue('custrecord_job_date_reviewed', getDate());

								// nlapiSubmitRecord(jobRecord);
								// count++;
								return true;
							});
						}
					}
				}
			} else if (value == 0 && assignPackage == 'true' && value != defaultValue) {
				resultSetExtras.forEachResult(function(searchResultExtras) {

					var jobID = searchResultExtras.getValue('internalid');

					if (typeof job_array[i] == 'undefined') {
						job_array[i] = [];
					}
					var job_len = job_array[i].length;
					job_array[i][job_len] = jobID;

					if (typeof package_array[i] == 'undefined') {
						package_array[i] = [];
					}

					// if(invoiceable_array[i] == 'undefined'){
					// 	invoiceable_array[i] = [];
					// }

					var pack_len = package_array[i].length;
					// var inv_len = invoiceable_array[i].length;

					package_array[i][pack_len] = value
					// var jobRecord = nlapiLoadRecord('customrecord_job', searchResultExtras.getValue('internalid'));

					// if (assignPackage == 'true') {
					// 	jobRecord.setFieldValue('custrecord_job_service_package', null);
					// }

					// jobRecord.setFieldValue('custrecord_job_date_reviewed', getDate());

					// nlapiSubmitRecord(jobRecord);

					return true;
				});
			}
		}
		i++;
		return true;
	});


	// alert(package_array);
	// 
	// console.log(JSON.parse(job_array));
	// console.log(JSON.parse(package_array));
	// console.log(JSON.parse(invoiceable_array));



	nlapiSetFieldValue('package_array', package_array.toString());
	nlapiSetFieldValue('job_array', job_array.toString());
	nlapiSetFieldValue('invoiceable_array', invoiceable_array.toString());

	return true;
}

/**
 * [onclick_Back description] - Go back to the Review page
 */
function onclick_Back() {

	var internalID = nlapiGetFieldValue('customer');

	var uploadURL = baseURL + nlapiResolveURL('SUITELET', 'customscript_sl_services_main_page', 'customdeploy_sl_services_main_page') + '&customer_id=' + internalID + '&start_date=' + nlapiGetFieldValue('start_date') + '&end_date=' + nlapiGetFieldValue('end_date') + '&locked=' + global_locked + '&sc=' + nlapiGetFieldValue('scid') + '&zee=' + nlapiGetFieldValue('zee_id');
	window.open(uploadURL, "_self", "height=750,width=650,modal=yes,alwaysRaised=yes");
}