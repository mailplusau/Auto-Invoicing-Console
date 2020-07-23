/**
 * Module Description
 * 
 * NSVersion    Date            			Author         
 * 1.00       	2017-10-17 09:47:26   		Ankith 
 *
 * Remarks: Allocate Jobs to Pre defined packages setup by the Zees        
 * 
 * @Last Modified by:   Ankith
 * @Last Modified time: 2020-07-17 14:43:27
 *
 */

/*
	Global Variables
 */
var ctx = nlapiGetContext();
var usageThreshold = 100;
// var usageThreshold = 9800;
var adhocInvDeploy = 'customdeploy2';
var prevInvDeploy = null;
var reschedulePerVisit = true;
var reschedulePerDay = true;
var rescheduleMonthly = true;
var rescheduleJobPackageAllocator = true;
var rescheduleJobAllocator = true;
var invoiceable_check = false;



function main(type) {

	var ctx = nlapiGetContext();

	nlapiLogExecution('DEBUG', 'ALL START --> ', ctx.getRemainingUsage());

	// if () {

	var service_ids_array = [];

	/**
	 * AIC - Package - Customer (DO NOT DELETE)	
	 */
	var searched_jobs = nlapiLoadSearch('customrecord_job', 'customsearch_job_invoicing_allocator_cus');

	var resultSet = searched_jobs.runSearch();

	if (!isNullorEmpty(ctx.getSetting('SCRIPT', 'custscript_prev_deploy_id'))) {
		prevInvDeploy = ctx.getSetting('SCRIPT', 'custscript_prev_deploy_id');
	} else {
		prevInvDeploy = ctx.getDeploymentId();
	}

	var count_customer = 0;

	/**
	 * [description] - Search result run based on the customer
	 */
	resultSet.forEachResult(function(searchResult) {

		var usageStartCustomer = ctx.getRemainingUsage();

		var result = rescheduleSC(usageStartCustomer);

		//If the threshold to switch isnt met

		if (result != false) {

			var customer_id = searchResult.getValue('custrecord_job_customer', null, 'GROUP');

			/*
			To check if the Job - Invoicing Review - Invoiceable Discrepancies search for the customer, if present do not run the allocator
			*/
			var searched_job_group_inv_review_descp = nlapiLoadSearch('customrecord_job', 'customsearch_job_inv_review_inv_discrep');

			var newFilters_job_group_inv_review_descp = new Array();
			newFilters_job_group_inv_review_descp[newFilters_job_group_inv_review_descp.length] = new nlobjSearchFilter('custrecord_job_customer', null, 'is', customer_id);

			searched_job_group_inv_review_descp.addFilters(newFilters_job_group_inv_review_descp);

			var resultSet_job_group_inv_review_descp = searched_job_group_inv_review_descp.runSearch();

			var result_job_group_inv_review_descp = resultSet_job_group_inv_review_descp.getResults(0, 1);

			/*
				If Empty and result is 0, then the package allocator runs
			*/

			if (result_job_group_inv_review_descp.length == 0) {

				var customer_text = searchResult.getText('custrecord_job_customer', null, 'GROUP');

				var customer_franchisee = nlapiLookupField('customer', customer_id, 'partner');

				nlapiLogExecution('DEBUG', 'Start of Customer', customer_text + '| Usage: ' + ctx.getRemainingUsage());

				/**
				 * Job - Package Allocator - Service Package
				 */
				var searched_packages = nlapiLoadSearch('customrecord_service_package', 'customsearch_job_service_package');

				var fil_line = [];
				fil_line[fil_line.length] = new nlobjSearchFilter('custrecord_service_package_customer', null, 'is', customer_id);
				fil_line[fil_line.length] = new nlobjSearchFilter('custrecord_service_package_franchisee', null, 'anyof', customer_franchisee);

				searched_packages.addFilters(fil_line);
				var packageResult = searched_packages.runSearch();

				var count_package = 0;

				// [description] - Get all the packages based on the customer
				packageResult.forEachResult(function(searchPackageResult) {

					var usageStartPackage = ctx.getRemainingUsage();


					var package_id = searchPackageResult.getValue('internalid');
					var package_text = searchPackageResult.getValue('name');

					nlapiLogExecution('DEBUG', 'Start of package loop - ' + package_text + ' for customer  ' + customer_text, ctx.getRemainingUsage());

					var customer = searchPackageResult.getValue('custrecord_service_package_customer');
					var franchisee = searchPackageResult.getValue('custrecord_service_package_franchisee');
					var discount_period = searchPackageResult.getValue('custrecord_service_package_disc_period');
					var invoice_single_item = searchPackageResult.getValue('custrecord_service_package_inv_one_line');
					var invoice_incomplete = searchPackageResult.getValue('custrecord_service_package_inv_incomplet');
					var include_extras = searchPackageResult.getValue('custrecord_service_package_extra_inc');
					var discount_type = searchPackageResult.getValue('custrecord_service_package_disc_type');
					var date_effective = searchPackageResult.getValue('custrecord_service_package_date_effectiv');


					/**
					 * Search to get all the services assigned to the package
					 */
					var fil_po = [];
					fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_service_package', null, 'anyof', package_id);
					fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_service_franchisee', null, 'anyof', customer_franchisee);

					var col_po = [];
					col_po[col_po.length] = new nlobjSearchColumn('internalid');
					col_po[col_po.length] = new nlobjSearchColumn('custrecord_service');
					col_po[col_po.length] = new nlobjSearchColumn('custrecord_service_price');
					col_po[col_po.length] = new nlobjSearchColumn('name');

					var poSearch = nlapiSearchRecord('customrecord_service', null, fil_po, col_po);

					var service_ids = [];
					var service_names = [];
					var job_ids_array = [];
					var job_group_ids_array = [];
					var job_groups_list = [];

					//Get all the services assigned to the package and start initialising the job_group_ids_array	
					//
					if (!isNullorEmpty(poSearch)) {
						for (var i = 0; i < poSearch.length; i++) {
							if (poSearch[i].getValue('custrecord_service') != 17) {
								service_ids[service_ids.length] = poSearch[i].getValue('internalid');
								service_names[service_names.length] = poSearch[i].getValue('name');
								job_ids_array[job_ids_array.length] = [];
								job_group_ids_array[job_group_ids_array.length] = [];
							}

						}
					}

					nlapiLogExecution('DEBUG', 'service_ids', service_ids);

					if (!isNullorEmpty(service_ids)) {
						/**
						 * SWITCH - Based on the Discount Period 
						 */
						if (discount_period == 1) {

							// Discount Period - Per Visit
							nlapiLogExecution('DEBUG', 'Begining of the Package Switch - PER VISIT: ', 'Package:' + package_text + '| Customer: ' + customer_text + ' | Usage: ' + ctx.getRemainingUsage());

							/**
							 * Job - Package Allocator (Date-Time)
							 */
							var searched_jobs2 = nlapiLoadSearch('customrecord_job', 'customsearch_job_invoicing_allocator_dt');


							//Filter for Job - Package Allocator (Date-Time) are customer,serviceids, zee
							var newFilters = new Array();
							newFilters[0] = new nlobjSearchFilter('custrecord_job_customer', null, 'is', customer_id);
							newFilters[1] = new nlobjSearchFilter('custrecord_job_service', null, 'anyof', service_ids);
							newFilters[2] = new nlobjSearchFilter('custrecord_job_franchisee', null, 'is', customer_franchisee);
							if (!isNullorEmpty(date_effective)) {
								newFilters[3] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorafter', nlapiStringToDate(date_effective));
							}

							searched_jobs2.addFilters(newFilters);

							var resultSet2 = searched_jobs2.runSearch();

							var usageStartDateTime = ctx.getRemainingUsage();

							var count_date_time = 0;

							//To go through all the result for Job - Package Allocator (Date-Time)
							resultSet2.forEachResult(function(searchResult2) {

								var usageStartPerVisit = ctx.getRemainingUsage();

								// var resultPerVisit = rescheduleSC(usageStartPerVisit);

								if (usageStartPerVisit <= usageThreshold) {

									nlapiLogExecution('DEBUG', 'SWITCHing at Package: ' + package_text + ' - PER VISIT for Customer: ' + customer_text + ' -->', ctx.getRemainingUsage());

									var params = {
										custscript_prev_deploy_id: ctx.getDeploymentId()
									}

									reschedulePerVisit = rescheduleScript(prevInvDeploy, adhocInvDeploy, params);
									if (reschedulePerVisit == false) {
										return false;
									}
								} else {
									nlapiLogExecution('DEBUG', 'Begining of the Date-Time search loop ', ctx.getRemainingUsage());

									var date_finalised = searchResult2.getValue('custrecord_job_date_finalised', null, 'GROUP');
									var time_finalised = searchResult2.getValue('custrecord_job_time_finalised', null, 'GROUP');
									var count = searchResult2.getValue('internalid', null, 'COUNT');


									/**
									 * Job - Package Allocator
									 */
									var searched_jobs3 = nlapiLoadSearch('customrecord_job', 'customsearch_job_invoicing_allocator');

									// Filters for Job - Package Allocator are customerid, serviceids, zee,date finalised, time finalised
									var newFilters = new Array();
									newFilters[0] = new nlobjSearchFilter('custrecord_job_customer', null, 'is', customer_id);
									newFilters[1] = new nlobjSearchFilter('custrecord_job_date_finalised', null, 'on', nlapiStringToDate(date_finalised));
									newFilters[2] = new nlobjSearchFilter('custrecord_job_time_finalised', null, 'equalto', time_finalised);
									newFilters[3] = new nlobjSearchFilter('custrecord_job_service', null, 'is', service_ids);
									newFilters[4] = new nlobjSearchFilter('custrecord_job_franchisee', null, 'is', customer_franchisee);
									if (!isNullorEmpty(date_effective)) {
										newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorafter', nlapiStringToDate(date_effective));
									}
									// if (invoice_incomplete == 2) {
									// 	newFilters[5] = new nlobjSearchFilter('custrecord_job_status', null, 'is', 3);
									// }

									searched_jobs3.addFilters(newFilters);

									var resultSet3 = searched_jobs3.runSearch();

									var job_group_status_array = [];
									var job_group_invoiceable_array = [];
									var result_service_ids = [];

									nlapiLogExecution('DEBUG', 'Start of Creating Job Group ID/Status Array ', ctx.getRemainingUsage());

									/**
									 * To go throught all the results from the Job - Package Allocator and get the Job Group Ids for the related services
									 */
									resultSet3.forEachResult(function(searchResult3) {

										var job_id = searchResult3.getValue('internalid');
										var job_group_id = searchResult3.getValue('custrecord_job_group');
										var service_id = searchResult3.getValue('custrecord_job_service');
										var service_text = searchResult3.getText('custrecord_job_service');
										var job_invoiceable = searchResult3.getValue('custrecord_job_invoiceable');
										var job_group_status = searchResult3.getValue("custrecord_jobgroup_status", "CUSTRECORD_JOB_GROUP", null);

										nlapiLogExecution('AUDIT', 'Job Group ID : ' + job_group_id + ' | Status Array: ' + job_group_status, ctx.getRemainingUsage());

										var pos = service_ids.indexOf(service_id);

										var len = job_group_ids_array[pos].length;

										result_service_ids[result_service_ids.length] = service_id;
										job_ids_array[pos][len] = job_id;
										job_group_ids_array[pos][len] = job_group_id;
										job_group_status_array[job_group_id] = job_group_status;
										job_group_invoiceable_array[job_group_id] = job_invoiceable;
										return true;
									});

									result_service_ids = result_service_ids.filter(function(elem, index, self) {
										return index == self.indexOf(elem);
									});

									nlapiLogExecution('DEBUG', 'End of Creating Job Group ID/Status Array ', ctx.getRemainingUsage());


									if (service_ids.length == result_service_ids.length) {

										nlapiLogExecution('DEBUG', 'INSIDE');
										var unique = [];

										for (var i = 0; i < job_group_ids_array.length; i++) {
											unique[i] = [];

											unique[i] = job_group_ids_array[i].filter(function(elem, index, self) {
												return index == self.indexOf(elem);
											});
										}


										var shortest = unique.reduce(function(p, c) {
											return p.length > c.length ? c : p;
										}, {
											length: Infinity
										});

										// var unique = job_groups_list.filter(function(elem, index, self) {
										// 	return index == self.indexOf(elem);
										// });
										// 
										var final_package_status = null;
										var final_invoiceable = null;
										invoiceable_check = false;

										if (shortest.length > 0) {
											for (var y = 0; y < shortest.length; y++) {
												for (var i = 0; i < unique.length; i++) {
													job_groups_list[job_groups_list.length] = unique[i][y];
													var status = job_group_status_array[unique[i][y]];

													var invoiceable = job_group_invoiceable_array[unique[i][y]];

													final_package_status = getPackageStatus(final_package_status, status);
													final_invoiceable = getPackageInvoiceable(final_invoiceable, status, invoiceable);
												}

												job_groups_list.sort(function(a, b) {
													return a - b
												});
												if (!isNullorEmpty(job_groups_list)) {

													nlapiLogExecution('DEBUG', 'Start of Allocator Jobs Loop', ctx.getRemainingUsage());

													// Search: Job - Package Allocator - Unfiltered - DO NOT DELETE
													var searched_jobs4 = nlapiLoadSearch('customrecord_job', 'customsearch_job_pkg_allocatr_unfilterd');

													nlapiLogExecution('DEBUG', 'Period Type 1 | Shortest Length > 0 ', 'job_groups_list: ' + job_groups_list);


													var newFilters = new Array();
													newFilters[0] = new nlobjSearchFilter('custrecord_job_customer', null, 'is', customer_id);
													newFilters[1] = new nlobjSearchFilter('custrecord_job_group', null, 'anyof', job_groups_list);
													newFilters[2] = new nlobjSearchFilter('custrecord_job_franchisee', null, 'is', customer_franchisee);
													if (include_extras == 2) {
														newFilters[3] = new nlobjSearchFilter('custrecord_job_service_category', null, 'is', 1);
													}
													if (!isNullorEmpty(date_effective)) {
														newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorafter', nlapiStringToDate(date_effective));
													}
													// if (invoice_incomplete == 2) {
													// 	newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_status', null, 'is', 3);
													// }

													searched_jobs4.addFilters(newFilters);

													var resultSet4 = searched_jobs4.runSearch();

													var usageStartAllocator = ctx.getRemainingUsage();

													if (usageStartAllocator <= usageThreshold) {

														nlapiLogExecution('DEBUG', 'SWITCHing at -->', 'PACKAGE PER DAY - Allocator:' + package_text + ' | Customer: ' + customer_text + ' | Job Group List: ' + job_groups_list + ' | ' + ctx.getRemainingUsage());

														var params = {
															custscript_prev_deploy_id: ctx.getDeploymentId()
														}

														rescheduleJobPackageAllocator = rescheduleScript(prevInvDeploy, adhocInvDeploy, params);
														nlapiLogExecution('DEBUG', 'rescheduleJobPackageAllocator', rescheduleJobPackageAllocator);
														if (rescheduleJobPackageAllocator == false) {
															return false;
														}
													} else {
														resultSet4.forEachResult(function(searchResult4) {


															var startUsageAllocator = ctx.getRemainingUsage();

															var job_record = nlapiLoadRecord('customrecord_job', searchResult4.getValue('internalid'));


															job_record.setFieldValue('custrecord_job_service_package', package_id);
															job_record.setFieldValue('custrecord_job_invoice_single_line_item', invoice_single_item);
															job_record.setFieldValue('custrecord_job_discount_type', discount_type);
															job_record.setFieldValues('custrecord_package_job_groups', job_groups_list);
															job_record.setFieldValue('custrecord_package_status', final_package_status);
															job_record.setFieldValue('custrecord_job_invoiceable', final_invoiceable);
															job_record.setFieldValue('custrecord_job_date_allocated', getDate());
															nlapiSubmitRecord(job_record);

															nlapiLogExecution('AUDIT', 'PACKAGE PER VISIT - Allocator | Job ID: ' + searchResult4.getValue('internalid'), (startUsageAllocator - ctx.getRemainingUsage()));


															return true;
														});

														nlapiLogExecution('DEBUG', 'End of Allocator Jobs Loop', ctx.getRemainingUsage());

														job_groups_list = [];
													}
												} else {
													return true;
												}

											}
										} else {
											for (var i = 0; i < unique.length; i++) {
												job_groups_list[job_groups_list.length] = unique[i][0];
												var status = job_group_status_array[unique[i][0]];

												var invoiceable = job_group_invoiceable_array[unique[i][0]];

												final_package_status = getPackageStatus(final_package_status, status);
												final_invoiceable = getPackageInvoiceable(final_invoiceable, status, invoiceable);
											}

											job_groups_list.sort(function(a, b) {
												return a - b
											});

											job_groups_list = cleanArray(job_groups_list)

											if (!isNullorEmpty(job_groups_list)) {


												nlapiLogExecution('DEBUG', 'Start of Allocator Jobs Loop', ctx.getRemainingUsage());

												//Search: Job - Package Allocator - Unfiltered - DO NOT DELETE
												var searched_jobs4 = nlapiLoadSearch('customrecord_job', 'customsearch_job_pkg_allocatr_unfilterd');

												nlapiLogExecution('DEBUG', 'Period Type 1 | Shortest Length = 0 ', 'job_groups_list: ' + job_groups_list);


												var newFilters = new Array();
												newFilters[0] = new nlobjSearchFilter('custrecord_job_customer', null, 'is', customer_id);
												newFilters[1] = new nlobjSearchFilter('custrecord_job_group', null, 'anyof', job_groups_list);
												newFilters[2] = new nlobjSearchFilter('custrecord_job_franchisee', null, 'is', customer_franchisee);
												if (include_extras == 2) {
													newFilters[3] = new nlobjSearchFilter('custrecord_job_service_category', null, 'is', 1);
												}
												if (!isNullorEmpty(date_effective)) {
													newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorafter', nlapiStringToDate(date_effective));
												}
												// if (invoice_incomplete == 2) {
												// 	newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_status', null, 'is', 3);
												// }

												searched_jobs4.addFilters(newFilters);

												var resultSet4 = searched_jobs4.runSearch();

												var usageStartAllocator = ctx.getRemainingUsage();

												if (usageStartAllocator <= usageThreshold) {

													nlapiLogExecution('DEBUG', 'SWITCHing at -->', 'PACKAGE PER DAY - Allocator:' + package_text + ' | Customer: ' + customer_text + ' | Job Group List: ' + job_groups_list + ' | ' + ctx.getRemainingUsage());

													var params = {
														custscript_prev_deploy_id: ctx.getDeploymentId()
													}

													rescheduleJobPackageAllocator = rescheduleScript(prevInvDeploy, adhocInvDeploy, params);
													nlapiLogExecution('DEBUG', 'rescheduleJobPackageAllocator', rescheduleJobPackageAllocator);
													if (rescheduleJobPackageAllocator == false) {
														return false;
													}
												} else {
													resultSet4.forEachResult(function(searchResult4) {


														var startUsageAllocator = ctx.getRemainingUsage();

														var job_record = nlapiLoadRecord('customrecord_job', searchResult4.getValue('internalid'));


														job_record.setFieldValue('custrecord_job_service_package', package_id);
														job_record.setFieldValue('custrecord_job_invoice_single_line_item', invoice_single_item);
														job_record.setFieldValue('custrecord_job_discount_type', discount_type);
														job_record.setFieldValues('custrecord_package_job_groups', job_groups_list);
														job_record.setFieldValue('custrecord_package_status', final_package_status);
														job_record.setFieldValue('custrecord_job_invoiceable', final_invoiceable);
														job_record.setFieldValue('custrecord_job_date_allocated', getDate());
														nlapiSubmitRecord(job_record);

														nlapiLogExecution('AUDIT', 'PACKAGE PER VISIT - Allocator | Job ID: ' + searchResult4.getValue('internalid'), (startUsageAllocator - ctx.getRemainingUsage()));


														return true;
													});

													nlapiLogExecution('DEBUG', 'End of Allocator Jobs Loop', ctx.getRemainingUsage());

													job_groups_list = [];
												}
											} else {
												return true;
											}

										}

										if (rescheduleJobPackageAllocator == false) {
											return false;
										} else {
											for (var i = 0; i < job_group_ids_array.length; i++) {
												job_group_ids_array[i] = [];
											}

											count_date_time++;

											nlapiLogExecution('DEBUG', 'Usage end of (' + count_date_time + ') Date Time loop ', 'For Services: ' + service_names + ' | For Pakcgae: ' + package_text + ' | Customer: ' + customer_text + ' | Usage: ' + (usageStartPerVisit - ctx.getRemainingUsage()));

											return true;
										}
									} else {
										return true;
									}

								}
							});

							nlapiLogExecution('DEBUG', 'End of the Date Time search loop ', ctx.getRemainingUsage());

						} else if (discount_period == 2) {

							//Discount Period - per Day
							nlapiLogExecution('DEBUG', 'Begining of the Package Switch - PER DAY: ', 'Package:' + package_text + '| Customer: ' + customer_text + ' | Usage: ' + ctx.getRemainingUsage());

							var searched_jobs2 = nlapiLoadSearch('customrecord_job', 'customsearch_job_invoicing_allocator_d');


							var newFilters = new Array();
							newFilters[0] = new nlobjSearchFilter('custrecord_job_customer', null, 'is', customer_id);
							newFilters[1] = new nlobjSearchFilter('custrecord_job_service', null, 'anyof', service_ids);
							newFilters[2] = new nlobjSearchFilter('custrecord_job_franchisee', null, 'is', customer_franchisee);
							if (!isNullorEmpty(date_effective)) {
								newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorafter', nlapiStringToDate(date_effective));
							}
							// if (invoice_incomplete == 2) {
							// 	newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_status', null, 'is', 3);
							// }

							searched_jobs2.addFilters(newFilters);

							var resultSet2 = searched_jobs2.runSearch();
							var count_date = 0;

							resultSet2.forEachResult(function(searchResult2) {

								// rescheduleSC();
								// 
								var usageStartPerDay = ctx.getRemainingUsage();

								if (usageStartPerDay <= usageThreshold) {

									nlapiLogExecution('DEBUG', 'SWITCHing at Package: ' + package_text + ' - PER DAY for Customer: ' + customer_text + ' -->', ctx.getRemainingUsage());

									var params = {
										custscript_prev_deploy_id: ctx.getDeploymentId()
									}

									reschedulePerDay = rescheduleScript(prevInvDeploy, adhocInvDeploy, params);
									if (reschedulePerDay == false) {
										return false;
									}
								} else {

									var date_finalised = searchResult2.getValue('custrecord_job_date_finalised', null, 'GROUP');
									var count = searchResult2.getValue('internalid', null, 'COUNT');


									var searched_jobs3 = nlapiLoadSearch('customrecord_job', 'customsearch_job_invoicing_allocator');


									var newFilters = new Array();
									newFilters[0] = new nlobjSearchFilter('custrecord_job_customer', null, 'is', customer_id);
									newFilters[1] = new nlobjSearchFilter('custrecord_job_date_finalised', null, 'on', nlapiStringToDate(date_finalised));
									newFilters[2] = new nlobjSearchFilter('custrecord_job_service', null, 'is', service_ids);
									newFilters[3] = new nlobjSearchFilter('custrecord_job_franchisee', null, 'is', customer_franchisee);
									if (!isNullorEmpty(date_effective)) {
										newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorafter', nlapiStringToDate(date_effective));
									}

									searched_jobs3.addFilters(newFilters);

									var resultSet3 = searched_jobs3.runSearch();

									var job_group_status_array = [];
									var job_group_invoiceable_array = [];
									var result_service_ids = [];

									nlapiLogExecution('DEBUG', 'Creating Job Group ID/Status Array', ctx.getRemainingUsage());

									resultSet3.forEachResult(function(searchResult3) {

										var job_id = searchResult3.getValue('internalid');
										var job_group_id = searchResult3.getValue('custrecord_job_group');
										var service_id = searchResult3.getValue('custrecord_job_service');
										var service_text = searchResult3.getText('custrecord_job_service');
										var service_text = searchResult3.getText('custrecord_job_service');
										var job_invoiceable = searchResult3.getValue('custrecord_job_invoiceable');
										var job_group_status = searchResult3.getValue("custrecord_jobgroup_status", "CUSTRECORD_JOB_GROUP", null);

										nlapiLogExecution('AUDIT', 'Job Group ID : ' + job_group_id + ' | Status Array: ' + job_group_status, ctx.getRemainingUsage());

										var pos = service_ids.indexOf(service_id);

										var len = job_group_ids_array[pos].length;

										result_service_ids[result_service_ids.length] = service_id;
										job_ids_array[pos][len] = job_id;
										job_group_ids_array[pos][len] = job_group_id;
										job_group_status_array[job_group_id] = job_group_status;
										job_group_invoiceable_array[job_group_id] = job_invoiceable;
										return true;
									});

									nlapiLogExecution('DEBUG', 'End of creating Job Group ID/Status Array', ctx.getRemainingUsage());

									result_service_ids = result_service_ids.filter(function(elem, index, self) {
										return index == self.indexOf(elem);
									});

									if (service_ids.length == result_service_ids.length) {

										var unique = [];

										for (var i = 0; i < job_group_ids_array.length; i++) {
											unique[i] = [];

											unique[i] = job_group_ids_array[i].filter(function(elem, index, self) {
												return index == self.indexOf(elem);
											});
										}


										var shortest = unique.reduce(function(p, c) {
											return p.length > c.length ? c : p;
										}, {
											length: Infinity
										});

										var final_package_status = null;
										var final_invoiceable = null;
										invoiceable_check = false;

										if (shortest.length > 0) {
											for (var y = 0; y < shortest.length; y++) {
												for (var i = 0; i < unique.length; i++) {
													job_groups_list[job_groups_list.length] = unique[i][y];
													var status = job_group_status_array[unique[i][y]];
													var invoiceable = job_group_invoiceable_array[unique[i][y]];

													final_package_status = getPackageStatus(final_package_status, status);
													final_invoiceable = getPackageInvoiceable(final_invoiceable, status, invoiceable);
												}

												job_groups_list.sort(function(a, b) {
													return a - b
												});

												if (!isNullorEmpty(job_groups_list)) {

													nlapiLogExecution('DEBUG', 'Start of Allocator Jobs Loop', ctx.getRemainingUsage());

													// Search: Job - Package Allocator - Unfiltered - DO NOT DELETE
													var searched_jobs4 = nlapiLoadSearch('customrecord_job', 'customsearch_job_pkg_allocatr_unfilterd');

													nlapiLogExecution('DEBUG', 'Period Type 2 | Shortest Length > 0 ', 'job_groups_list: ' + job_groups_list);

													var newFilters = new Array();
													newFilters[0] = new nlobjSearchFilter('custrecord_job_customer', null, 'is', customer_id);
													newFilters[1] = new nlobjSearchFilter('custrecord_job_group', null, 'anyof', job_groups_list);
													newFilters[2] = new nlobjSearchFilter('custrecord_job_franchisee', null, 'is', customer_franchisee);
													if (include_extras == 2) {
														newFilters[3] = new nlobjSearchFilter('custrecord_job_service_category', null, 'is', 1);
													}
													if (!isNullorEmpty(date_effective)) {
														newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorafter', nlapiStringToDate(date_effective));
													}

													searched_jobs4.addFilters(newFilters);

													var resultSet4 = searched_jobs4.runSearch();

													var usageStartAllocator = ctx.getRemainingUsage();

													if (usageStartAllocator <= usageThreshold) {

														nlapiLogExecution('DEBUG', 'SWITCHing at -->', 'PACKAGE PER DAY - Allocator:' + package_text + ' | Customer: ' + customer_text + ' | Job Group List: ' + job_groups_list + ' | ' + ctx.getRemainingUsage());

														var params = {
															custscript_prev_deploy_id: ctx.getDeploymentId()
														}

														rescheduleJobPackageAllocator = rescheduleScript(prevInvDeploy, adhocInvDeploy, params);

														if (rescheduleJobPackageAllocator == false) {
															return false;
														}
													} else {
														resultSet4.forEachResult(function(searchResult4) {


															var startUsageAllocator = ctx.getRemainingUsage();


															var job_record = nlapiLoadRecord('customrecord_job', searchResult4.getValue('internalid'));

															job_record.setFieldValue('custrecord_job_service_package', package_id);
															job_record.setFieldValue('custrecord_job_invoice_single_line_item', invoice_single_item);
															job_record.setFieldValue('custrecord_job_discount_type', discount_type);
															job_record.setFieldValues('custrecord_package_job_groups', job_groups_list);
															job_record.setFieldValue('custrecord_package_status', final_package_status);
															job_record.setFieldValue('custrecord_job_invoiceable', final_invoiceable);
															job_record.setFieldValue('custrecord_job_date_allocated', getDate());
															nlapiSubmitRecord(job_record);


															nlapiLogExecution('AUDIT', 'PACKAGE PER DAY - Allocator | Job ID: ' + searchResult4.getValue('internalid'), (startUsageAllocator - ctx.getRemainingUsage()));

															return true;
														});

														nlapiLogExecution('DEBUG', 'End of Allocator Jobs Loop', ctx.getRemainingUsage());

														job_groups_list = [];
													}
												} else {
													return true;
												}

											}
										} else {
											for (var i = 0; i < unique.length; i++) {
												job_groups_list[job_groups_list.length] = unique[i][0];
												var status = job_group_status_array[unique[i][0]];
												var invoiceable = job_group_invoiceable_array[unique[i][0]];

												final_package_status = getPackageStatus(final_package_status, status);
												final_invoiceable = getPackageInvoiceable(final_invoiceable, status, invoiceable);
											}

											job_groups_list.sort(function(a, b) {
												return a - b
											});

											job_groups_list = cleanArray(job_groups_list);

											if (!isNullorEmpty(job_groups_list)) {

												nlapiLogExecution('DEBUG', 'Start of Allocator Jobs Loop', ctx.getRemainingUsage());

												//Search: Job - Package Allocator - Unfiltered - DO NOT DELETE
												var searched_jobs4 = nlapiLoadSearch('customrecord_job', 'customsearch_job_pkg_allocatr_unfilterd');

												nlapiLogExecution('DEBUG', 'Period Type 1 | Shortest Length = 0 ', 'job_groups_list: ' + job_groups_list);

												var newFilters = new Array();
												newFilters[0] = new nlobjSearchFilter('custrecord_job_customer', null, 'is', customer_id);
												newFilters[1] = new nlobjSearchFilter('custrecord_job_group', null, 'anyof', job_groups_list);
												newFilters[2] = new nlobjSearchFilter('custrecord_job_franchisee', null, 'is', customer_franchisee);
												if (include_extras == 2) {
													newFilters[3] = new nlobjSearchFilter('custrecord_job_service_category', null, 'is', 1);
												}
												if (!isNullorEmpty(date_effective)) {
													newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorafter', nlapiStringToDate(date_effective));
												}

												searched_jobs4.addFilters(newFilters);

												var resultSet4 = searched_jobs4.runSearch();

												var usageStartAllocator = ctx.getRemainingUsage();

												if (usageStartAllocator <= usageThreshold) {

													nlapiLogExecution('DEBUG', 'SWITCHing at -->', 'PACKAGE PER DAY - Allocator:' + package_text + ' | Customer: ' + customer_text + ' | Job Group List: ' + job_groups_list + ' | ' + ctx.getRemainingUsage());

													var params = {
														custscript_prev_deploy_id: ctx.getDeploymentId()
													}

													rescheduleJobPackageAllocator = rescheduleScript(prevInvDeploy, adhocInvDeploy, params);

													if (rescheduleJobPackageAllocator == false) {
														return false;
													}
												} else {
													resultSet4.forEachResult(function(searchResult4) {


														var startUsageAllocator = ctx.getRemainingUsage();


														var job_record = nlapiLoadRecord('customrecord_job', searchResult4.getValue('internalid'));

														job_record.setFieldValue('custrecord_job_service_package', package_id);
														job_record.setFieldValue('custrecord_job_invoice_single_line_item', invoice_single_item);
														job_record.setFieldValue('custrecord_job_discount_type', discount_type);
														job_record.setFieldValues('custrecord_package_job_groups', job_groups_list);
														job_record.setFieldValue('custrecord_package_status', final_package_status);
														job_record.setFieldValue('custrecord_job_invoiceable', final_invoiceable);
														job_record.setFieldValue('custrecord_job_date_allocated', getDate());
														nlapiSubmitRecord(job_record);


														nlapiLogExecution('AUDIT', 'PACKAGE PER DAY - Allocator | Job ID: ' + searchResult4.getValue('internalid'), (startUsageAllocator - ctx.getRemainingUsage()));

														return true;
													});

													nlapiLogExecution('DEBUG', 'End of Allocator Jobs Loop', ctx.getRemainingUsage());

													job_groups_list = [];
												}
											} else {
												return true;
											}

										}

										if (rescheduleJobPackageAllocator == false) {
											return false;
										} else {
											for (var i = 0; i < job_group_ids_array.length; i++) {
												job_group_ids_array[i] = [];
											}

											count_date++;
											nlapiLogExecution('DEBUG', 'Usage end of (' + count_date + ') Date loop', 'For Services: ' + service_names + ' | Package: ' + package_text + ' | For Customer: ' + customer_text + ' | Usage: ' + (usageStartPerDay - ctx.getRemainingUsage()));

											return true;
										}
									} else {
										return true;
									}
								}
							});

							nlapiLogExecution('DEBUG', 'End of the Date search loop ', ctx.getRemainingUsage());
						} else if (discount_period == 3) {
							//Discount Period - Monthly 

							nlapiLogExecution('DEBUG', 'Begining of the Package: ' + package_text + ' - MONTHLY switch for Customer: ' + customer_text, ctx.getRemainingUsage());

							var date = new Date();

							var month = date.getMonth(); //Months 0 - 11
							var day = date.getDate();
							var year = date.getFullYear();

							//If allocator run on the first day of the month, it takes the last month as the filter
							if (day == 1) {
								if (month == 0) {
									month = 11;
									year = year - 1
								} else {
									month = month - 1;
								}
							}

							var firstDay = new Date(year, (month), 1);
							var lastDay = new Date(year, (month + 1), 0);



							var searched_jobs2 = nlapiLoadSearch('customrecord_job', 'customsearch_job_invoicing_allocator');

							var newFilters = new Array();
							newFilters[0] = new nlobjSearchFilter('custrecord_job_customer', null, 'is', customer_id);
							newFilters[1] = new nlobjSearchFilter('custrecord_job_service', null, 'is', service_ids);
							newFilters[2] = new nlobjSearchFilter('custrecord_job_date_finalised', null, 'within', firstDay, lastDay);
							newFilters[3] = new nlobjSearchFilter('custrecord_job_franchisee', null, 'is', customer_franchisee);
							if (include_extras == 2) {
								newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_service_category', null, 'is', 1);
							}
							if (!isNullorEmpty(date_effective)) {
								newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorafter', nlapiStringToDate(date_effective));
							}


							searched_jobs2.addFilters(newFilters);

							var resultSet2 = searched_jobs2.runSearch();

							resultSet2.forEachResult(function(searchResult2) {

								var usageStartMonthly = ctx.getRemainingUsage();

								if (usageStartMonthly <= usageThreshold) {

									nlapiLogExecution('DEBUG', 'SWITCHing at Package: ' + package_text + ' - MONTHLY for Customer: ' + customer_text + ' -->', ctx.getRemainingUsage());

									nlapiLogExecution('DEBUG', 'test', ctx.getDeploymentId());

									var params = {
										custscript_prev_deploy_id: ctx.getDeploymentId()
									}

									rescheduleMonthly = rescheduleScript(prevInvDeploy, adhocInvDeploy, params);
									nlapiLogExecution('DEBUG', 'rescheduleMonthly', rescheduleMonthly);

									if (rescheduleMonthly == false) {
										return false;
									}
								} else {
									var job_group_id = searchResult2.getValue('custrecord_job_group');


									var job_record = nlapiLoadRecord('customrecord_job', searchResult2.getValue('internalid'));

									job_record.setFieldValue('custrecord_job_service_package', package_id);
									job_record.setFieldValue('custrecord_job_invoice_single_line_item', invoice_single_item);
									job_record.setFieldValue('custrecord_job_discount_type', discount_type);
									job_record.setFieldValue('custrecord_job_date_allocated', getDate());

									nlapiSubmitRecord(job_record);

									nlapiLogExecution('DEBUG', 'PACKAGE MONTHLY - Allocator | Job ID: ' + searchResult2.getValue('internalid'), (usageStartMonthly - ctx.getRemainingUsage()));

									return true;
								}

							});

							nlapiLogExecution('DEBUG', 'End of the Allocator search loop for Package: ' + package_text + ' - MONTHLY for Customer: ' + customer_text, ctx.getRemainingUsage());
						}

						count_package++;

						if (reschedulePerVisit == false || reschedulePerDay == false || rescheduleMonthly == false || rescheduleJobPackageAllocator == false) {
							return false;
						} else {
							nlapiLogExecution('DEBUG', 'Usage at the end of (' + count_package + ') Package: ' + package_text + ' for (' + count_customer + ') Customer: ' + customer_text, (usageStartPackage - ctx.getRemainingUsage()));
							return true;
						}
					} else {
						return true;
					}
				});

				if (reschedulePerVisit == false || reschedulePerDay == false || rescheduleMonthly == false || rescheduleJobPackageAllocator == false) {
					return false;
				} else {
					nlapiLogExecution('DEBUG', 'End of the Package search loop ', ctx.getRemainingUsage());

					var searched_jobs2 = nlapiLoadSearch('customrecord_job', 'customsearch_job_invoicing_allocator');

					var newFilters = new Array();
					newFilters[0] = new nlobjSearchFilter('custrecord_job_customer', null, 'is', customer_id);
					newFilters[1] = new nlobjSearchFilter('custrecord_job_franchisee', null, 'is', customer_franchisee);

					searched_jobs2.addFilters(newFilters);

					var resultSet2 = searched_jobs2.runSearch();

					var usageStartDateAllocated = ctx.getRemainingUsage();
					var count_date_allocated_jobs = 0;

					nlapiLogExecution('DEBUG', 'Start of Assigning Date Allocated Loop for Customer: ' + customer_text, ctx.getRemainingUsage());

					resultSet2.forEachResult(function(searchResult2) {

						var usageStartPerDay = ctx.getRemainingUsage();

						if (usageStartPerDay <= usageThreshold) {

							nlapiLogExecution('DEBUG', 'SWITCHing at Assigning Date Allocated for Customer: ' + customer_text + ' -->', ctx.getRemainingUsage());

							var params = {
								custscript_prev_deploy_id: ctx.getDeploymentId()
							}

							rescheduleJobAllocator = rescheduleScript(prevInvDeploy, adhocInvDeploy, params);
							if (rescheduleJobAllocator == false) {
								return false;
							}
						} else {
							var job_record = nlapiLoadRecord('customrecord_job', searchResult2.getValue('internalid'));

							job_record.setFieldValue('custrecord_job_date_allocated', getDate());

							nlapiSubmitRecord(job_record);

							count_date_allocated_jobs++;
							return true;
						}
					});

					if (rescheduleJobAllocator == false) {
						return false;
					} else {
						nlapiLogExecution('DEBUG', 'Usage End of the Assigning Date Allocated Loop', 'For Customer:' + customer_text + '| No. of Jobs:' + count_date_allocated_jobs + ' | Usage' + (usageStartDateAllocated - ctx.getRemainingUsage()));

						count_customer++;

						nlapiLogExecution('DEBUG', 'Usage at the end of (' + count_customer + ') Customer: ' + customer_text, (usageStartCustomer - ctx.getRemainingUsage()));

						return true;
					}
				}
			} else {
				nlapiLogExecution('DEBUG', 'END --> Customer: ' + customer_id + ' present in Job - Invoicing Review - Invoiceable Discrepancies', ctx.getRemainingUsage());

				return true;
			}
		} else {
			return true;
		}
	});

	nlapiLogExecution('DEBUG', 'End of the Customer allocator search loop ', ctx.getRemainingUsage());
	// } else {
	// 	nlapiLogExecution('DEBUG', 'END --> Job - Invoicing Review - Invoiceable Discrepancies search is not empty', ctx.getRemainingUsage());
	// }
}

function getDate() {
	var date = new Date();
	if (date.getHours() > 6) {
		date = nlapiAddDays(date, 1);
	}
	date = nlapiDateToString(date);

	return date;
}

/*
	To set the Package Status on each Job based on the combination.
	Expected Package Status				
								|Job Group Status|
	-----------------------------------------------------------------
	|Job Group Status|	Completed	Incomplete	Scheduled	Partial
	-----------------------------------------------------------------
	Completed			Completed	Partial		Partial		Partial
	Incomplete			Partial		Incomplete	Incomplete	Partial
	Scheduled			Partial		Incomplete	Scheduled	Partial
	Partial				Partial		Partial		Partial		Partial
	-----------------------------------------------------------------
 */
function getPackageStatus(final_package_status, status) {

	if (final_package_status == null) {
		final_package_status = status;
	} else {
		if (final_package_status == status) {
			final_package_status == status;
		} else if (final_package_status == 1 && (status == 2 || status == 3 || status == 4)) {
			final_package_status == 2;
		} else if (final_package_status == 2 && (status == 1 || status == 3 || status == 4)) {
			final_package_status == 2
		} else if (final_package_status == 3) {
			if (status == 3 || status == 4) {
				final_package_status = 4;
			} else {
				final_package_status = 2;
			}
		} else if (final_package_status == 4) {
			if (status == 1 || status == 2) {
				final_package_status = 2;
			} else {
				final_package_status = 3;
			}
		}
	}

	return final_package_status;
}

/*
	To get the Invoiceable Field set for the Jobs linked to the package
 */
function getPackageInvoiceable(final_invoiceable, status, invoiceable) {

	if (invoiceable_check == false) {
		if (final_invoiceable == null) {
			if (status == 1 && invoiceable == 2) {
				final_invoiceable = 2;
				invoiceable_check = true;
				return final_invoiceable;
			} else {
				final_invoiceable = invoiceable;
			}

		} else {
			if (status == 1 && invoiceable == 2) {
				final_invoiceable = 2;
				invoiceable_check = true;
				return final_invoiceable;
			} else {
				if (status == 1 && invoiceable == 1 && final_invoiceable == 1) {
					final_invoiceable == 1;
				} else if (status == 3 || status == 2 || status == 4) {
					if (invoiceable == 1 && final_invoiceable == 1) {
						final_invoiceable == 1;
					} else if (invoiceable == 2 && final_invoiceable == 2) {
						final_invoiceable == 2;
					}

				}
			}
		}
	}

	return final_invoiceable;
}

/*
	Reschedule the Package Allcator Schedule Script
 */
function rescheduleSC(usageStart) {

	if (usageStart <= usageThreshold) {

		nlapiLogExecution('DEBUG', 'SWITCHing -->', ctx.getRemainingUsage());

		var params = {
			custscript_prev_deploy_id: ctx.getDeploymentId()
		}

		var reschedule = rescheduleScript(prevInvDeploy, adhocInvDeploy, params);
		if (reschedule == false) {
			return false;
		}
	}
}

function cleanArray(actual) {
	var newArray = new Array();
	for (var i = 0; i < actual.length; i++) {
		if (actual[i]) {
			newArray.push(actual[i]);
		}
	}
	return newArray;
}