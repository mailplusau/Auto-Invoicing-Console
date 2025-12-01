/**
 * Module Description
 *
 * NSVersion    Date                    Author
 * 1.00         2018-01-29 15:06:25         Ankith
 *
 * Remarks:
 *
 * @Last Modified by:   mailplusar
 * @Last Modified time: 2018-04-05 10:12:34
 *
 */

var usage_threshold = 30; //20
var usage_threshold_invoice = 1000; //1000
var adhoc_inv_deploy = "customdeploy2";
var prev_inv_deploy = null;
var ctx = nlapiGetContext();

var service_start_date;
var service_end_date;
var franchisee;
var from_invoice = null;
var count_loop_cust = 0;

var error_customers = [];
var error_specialCustomers = [];

function invoiceCreation() {
	nlapiLogExecution(
		"AUDIT",
		"prev_deployment",
		ctx.getSetting("SCRIPT", "custscript_prev_deployment")
	);
	if (!isNullorEmpty(ctx.getSetting("SCRIPT", "custscript_prev_deployment"))) {
		prev_inv_deploy = ctx.getSetting("SCRIPT", "custscript_prev_deployment");
	} else {
		prev_inv_deploy = ctx.getDeploymentId();
	}

	var error_customers_string = ctx.getSetting(
		"SCRIPT",
		"custscript_error_customers"
	);
	var error_special_customers_string = ctx.getSetting(
		"SCRIPT",
		"custscript_error_special_customers"
	);

	if (!isNullorEmpty(error_customers_string)) {
		error_customers = error_customers_string.split(",");
	}

	if (!isNullorEmpty(error_special_customers_string)) {
		error_specialCustomers = error_customers_string.split(",");
	}

	nlapiLogExecution("AUDIT", "Begining");

	nlapiLogExecution(
		"AUDIT",
		"Customer",
		ctx.getSetting("SCRIPT", "custscript_customer_id")
	);
	nlapiLogExecution(
		"AUDIT",
		"Invoice",
		ctx.getSetting("SCRIPT", "custscript_invoiceid")
	);

	if (
		isNullorEmpty(ctx.getSetting("SCRIPT", "custscript_customer_id")) &&
		isNullorEmpty(ctx.getSetting("SCRIPT", "custscript_invoiceid"))
	) {
		// nlapiLogExecution('DEBUG', 'START ---> ', ctx.getRemainingUsage());

		var searched_summary = nlapiLoadSearch(
			"customrecord_job",
			"customsearch_job_inv_process_customer"
		);

		var resultSet_summary = searched_summary.runSearch();

		resultSet_summary.forEachResult(function (searchResult_summary) {
			var usage_loopstart_cust = ctx.getRemainingUsage();
			count_loop_cust++;

			nlapiLogExecution(
				"DEBUG",
				"START ---> Customer" +
				searchResult_summary.getText(
					"custrecord_job_customer",
					null,
					"group"
				),
				ctx.getRemainingUsage()
			);

			var customer_internal_id = searchResult_summary.getValue(
				"internalid",
				"CUSTRECORD_JOB_CUSTOMER",
				"group"
			);
			var special_customer_internal_id = searchResult_summary.getValue(
				"custrecord_job_special_customer",
				null,
				"GROUP"
			);
			var customerPO = searchResult_summary.getValue(
				"custentity11",
				"CUSTRECORD_JOB_CUSTOMER",
				"GROUP"
			);
			var specialCustomerPO = searchResult_summary.getValue(
				"custentity11",
				"CUSTRECORD_JOB_SPECIAL_CUSTOMER",
				"GROUP"
			);
			service_start_date = searchResult_summary.getValue(
				"custrecord_job_date_scheduled",
				null,
				"MIN"
			);
			service_end_date = searchResult_summary.getValue(
				"custrecord_job_date_scheduled",
				null,
				"MAX"
			);

			nlapiLogExecution(
				"DEBUG",
				"special_customer_internal_id",
				special_customer_internal_id
			);

			var result_customer = error_customers.indexOf(customer_internal_id);
			var result_specialCustomer = error_specialCustomers.indexOf(
				special_customer_internal_id
			);

			//If the current customer is not present in the Error Customer array and Current Special Customer is not present in the Error Special Customer array, then continue creating invoice, else skip.

			if (result_customer == -1 && result_specialCustomer == -1) {
				/*
				To check if the Job - Invoicing Review - Invoiceable Discrepancies search for the customer, if present do not run the allocator
				*/
				var searched_job_group_inv_review_descp = nlapiLoadSearch(
					"customrecord_job",
					"customsearch_job_inv_review_inv_discrep"
				);

				var newFilters_job_group_inv_review_descp = new Array();
				newFilters_job_group_inv_review_descp[
					newFilters_job_group_inv_review_descp.length
				] = new nlobjSearchFilter(
					"custrecord_job_customer",
					null,
					"is",
					customer_internal_id
				);
				if (
					!isNullorEmpty(service_start_date) &&
					!isNullorEmpty(service_end_date)
				) {
					newFilters_job_group_inv_review_descp[
						newFilters_job_group_inv_review_descp.length
					] = new nlobjSearchFilter(
						"custrecord_job_date_scheduled",
						null,
						"onorafter",
						nlapiStringToDate(service_start_date)
					);
					newFilters_job_group_inv_review_descp[
						newFilters_job_group_inv_review_descp.length
					] = new nlobjSearchFilter(
						"custrecord_job_date_scheduled",
						null,
						"onorbefore",
						nlapiStringToDate(service_end_date)
					);
				}

				searched_job_group_inv_review_descp.addFilters(
					newFilters_job_group_inv_review_descp
				);

				var resultSet_job_group_inv_review_descp =
					searched_job_group_inv_review_descp.runSearch();

				var result_job_group_inv_review_descp =
					resultSet_job_group_inv_review_descp.getResults(0, 1);

				/*
					If Empty and result is 0, then the package allocator runs
				*/
				try {
					if (result_job_group_inv_review_descp.length == 0) {
						if (ctx.getRemainingUsage() <= usage_threshold_invoice) {
							var params = {
								custscript_prev_deployment: ctx.getDeploymentId(),
								custscript_error_customers: error_customers.join(","),
								custscript_error_special_customers:
									error_specialCustomers.join(","),
							};

							var reschedule = rescheduleScript(
								prev_inv_deploy,
								adhoc_inv_deploy,
								params
							);
							if (reschedule == false) {
								return false;
							}
						}

						var customer_name = searchResult_summary.getText(
							"custrecord_job_customer",
							null,
							"group"
						);
						var date_reviewed = searchResult_summary.getValue(
							"custrecord_job_date_reviewed",
							null,
							"group"
						);
						// var invoiceable = searchResult_summary.getValue('custrecord_job_invoiceable', null, 'group');
						var date_finalised = searchResult_summary.getValue(
							"custrecord_job_date_inv_finalised",
							null,
							"group"
						);
						var count_jobs_invoiceable = searchResult_summary.getValue(
							"formulanumeric",
							null,
							"sum"
						);
						var zee_text = searchResult_summary.getValue(
							"formulatext",
							null,
							"GROUP"
						);
						// franchisee = searchResult_summary.getValue("custrecord_service_franchisee", "CUSTRECORD_JOB_SERVICE", "GROUP");
						var count_jobs = searchResult_summary.getValue(
							"internalid",
							null,
							"count"
						);
						service_start_date = searchResult_summary.getValue(
							"custrecord_job_date_scheduled",
							null,
							"MIN"
						);
						service_end_date = searchResult_summary.getValue(
							"custrecord_job_date_scheduled",
							null,
							"MAX"
						);

						nlapiLogExecution("DEBUG", "zee text", zee_text);

						//Get the Franchisee Name (Text field) from the customer search and get the internal id from the search customsearch_job_inv_process_zee
						//
						var searched_zee = nlapiLoadSearch(
							"partner",
							"customsearch_job_inv_process_zee"
						);

						var newFilters_zee = new Array();
						newFilters_zee[newFilters_zee.length] = new nlobjSearchFilter(
							"entityid",
							null,
							"is",
							zee_text
						);

						searched_zee.addFilters(newFilters_zee);

						var resultSet_zee = searched_zee.runSearch();

						var count_zee = 0;

						var zee_id;

						resultSet_zee.forEachResult(function (searchResult_zee) {
							zee_id = searchResult_zee.getValue("internalid");
							count_zee++;
							return true;
						});

						if (count_zee == 0) {
							//WS Log: Error

							var body = "No zee set for customer " + customer_internal_id;

							nlapiSendEmail(
								409635,
								[
									"ankith.ravindran@mailplus.com.au",
									"willian.suryadharma@mailplus.com.au",
								],
								"Invoice Creation - Empty Zee for Invoicing",
								body,
								null
							);
							return false;
						} else {
							franchisee = zee_id;
						}
						//
						nlapiLogExecution("DEBUG", "Franchisee", franchisee);

						// var customerRec = nlapiLoadRecord('customer', customer_internal_id);

						// nlapiLogExecution('DEBUG', 'END OF ZEE', '');

						if (
							!isNullorEmpty(date_reviewed) &&
							count_jobs_invoiceable == 0 &&
							!isNullorEmpty(date_finalised)
						) {
							nlapiLogExecution("DEBUG", "START OF INVOICE CREATION", "");

							recInvoice = nlapiCreateRecord("invoice", {
								recordmode: "dynamic",
							});
							recInvoice.setFieldValue("customform", 116);
							if (isNullorEmpty(special_customer_internal_id)) {
								recInvoice.setFieldValue("entity", customer_internal_id);
								if (!isNullorEmpty(customerPO)) {
									recInvoice.setFieldValue("custbody6", customerPO);
								}
							} else {
								recInvoice.setFieldValue(
									"entity",
									special_customer_internal_id
								);
								if (!isNullorEmpty(specialCustomerPO)) {
									recInvoice.setFieldValue("custbody6", specialCustomerPO);
								}
							}

							recInvoice.setFieldValue(
								"department",
								nlapiLoadRecord("partner", franchisee).getFieldValue(
									"department"
								)
							);
							recInvoice.setFieldValue(
								"location",
								nlapiLoadRecord("partner", franchisee).getFieldValue("location")
							);
							// recInvoice.setFieldValue('trandate', invoice_date());
							recInvoice.setFieldValue("trandate", "30/11/2025");
							recInvoice.setFieldValue("custbody_dont_update_trandate", "T");
							recInvoice.setFieldValue(
								"custbody_inv_date_range_from",
								"1/11/2025"
							);
							recInvoice.setFieldValue(
								"custbody_inv_date_range_to",
								"30/11/2025"
							);

							recInvoice.setFieldValue("partner", franchisee);

							recInvoice.setFieldValue("terms", 1);

							nlapiLogExecution("DEBUG", "START OF SINGLE LINE SEARCH", "");

							var searched_singleline_discount_jobs = nlapiLoadSearch(
								"customrecord_job",
								"customsearch_job_inv_process_disc_single"
							);

							var strFormula =
								"COALESCE({custrecord_job_service.custrecord_service_franchisee},{custrecord_job_group.custrecord_jobgroup_franchisee},{custrecord_job_franchisee},'')";

							var newFilters_singleline = new Array();
							if (isNullorEmpty(special_customer_internal_id)) {
								newFilters_singleline[newFilters_singleline.length] =
									new nlobjSearchFilter(
										"custrecord_job_customer",
										null,
										"is",
										customer_internal_id
									);
								newFilters_singleline[newFilters_singleline.length] =
									new nlobjSearchFilter(
										"custrecord_job_special_customer",
										null,
										"is",
										"@NONE@"
									);
							} else {
								newFilters_singleline[newFilters_singleline.length] =
									new nlobjSearchFilter(
										"custrecord_job_customer",
										null,
										"is",
										customer_internal_id
									);
								newFilters_singleline[newFilters_singleline.length] =
									new nlobjSearchFilter(
										"custrecord_job_special_customer",
										null,
										"is",
										special_customer_internal_id
									);
							}
							newFilters_singleline[newFilters_singleline.length] =
								new nlobjSearchFilter(
									"formulatext",
									null,
									"is",
									zee_text
								).setFormula(strFormula);

							if (
								!isNullorEmpty(service_start_date) &&
								!isNullorEmpty(service_end_date)
							) {
								newFilters_singleline[newFilters_singleline.length] =
									new nlobjSearchFilter(
										"custrecord_job_date_scheduled",
										null,
										"onorafter",
										nlapiStringToDate(service_start_date)
									);
								newFilters_singleline[newFilters_singleline.length] =
									new nlobjSearchFilter(
										"custrecord_job_date_scheduled",
										null,
										"onorbefore",
										nlapiStringToDate(service_end_date)
									);
							}

							searched_singleline_discount_jobs.addFilters(
								newFilters_singleline
							);

							var resultSet_singleline_jobs =
								searched_singleline_discount_jobs.runSearch();

							var single_line_packages = [];
							var i = 0;

							var global_inv_line_count = 0;

							resultSet_singleline_jobs.forEachResult(function (
								searchResult_singleline_jobs
							) {
								nlapiLogExecution("DEBUG", "INSIDE SINGLE LINE SEARCH", "");

								var total_qty = searchResult_singleline_jobs.getValue(
									"custrecord_job_extras_qty"
								);
								var service_rate = searchResult_singleline_jobs.getValue(
									"custrecord_job_service_price"
								);
								var discount_detail = searchResult_singleline_jobs.getValue(
									"custrecord_job_invoice_detail"
								);
								var ns_item_package = searchResult_singleline_jobs.getValue(
									"custrecord_service_package_ns_item",
									"CUSTRECORD_JOB_SERVICE_PACKAGE",
									null
								);
								var package_type = searchResult_singleline_jobs.getValue(
									"custrecord_service_package_type",
									"CUSTRECORD_JOB_SERVICE_PACKAGE",
									null
								);
								single_line_packages[i] = searchResult_singleline_jobs.getValue(
									"custrecord_job_service_package"
								);

								nlapiLogExecution("DEBUG", "NS ITEM PACKAGE", ns_item_package);

								if (package_type != 1) {
									if (isNullorEmpty(ns_item_package)) {
										ns_item_package = 66;
									}

									if (!isNullorEmpty(discount_detail)) {
										var inv_details_rec = nlapiCreateRecord("customrecord62");
										inv_details_rec.setFieldValue("name", discount_detail);
										inv_details_rec.setFieldValue(
											"custrecord57_2",
											customer_internal_id
										);
										inv_details_rec.setFieldValue(
											"custrecord56_2",
											ns_item_package
										);
										var inv_details_rec_id = nlapiSubmitRecord(inv_details_rec);
									}

									recInvoice.selectNewLineItem("item");
									recInvoice.setCurrentLineItemValue(
										"item",
										"item",
										ns_item_package
									);
									recInvoice.setCurrentLineItemValue(
										"item",
										"quantity",
										total_qty
									);
									recInvoice.setCurrentLineItemValue(
										"item",
										"rate",
										service_rate
									);

									if (!isNullorEmpty(inv_details_rec_id)) {
										item_desc = nlapiLoadRecord(
											"customrecord62",
											inv_details_rec_id
										);
										recInvoice.setCurrentLineItemValue(
											"item",
											"custcol1",
											inv_details_rec_id
										);
										recInvoice.setCurrentLineItemValue(
											"item",
											"custcol1_display",
											item_desc.getFieldValue("name")
										);
									}

									nlapiLogExecution(
										"DEBUG",
										"NS ITEM PACKAGE",
										ns_item_package
									);
									recInvoice.commitLineItem("item");
									i++;
									global_inv_line_count++;
								}
								return true;
							});

							nlapiLogExecution("DEBUG", "START OF INVOICEABLE SEARCH", "");

							var searched_jobs = nlapiLoadSearch(
								"customrecord_job",
								"customsearch_job_inv_process_job_inv_yes"
							);

							var newFilters = new Array();
							if (isNullorEmpty(special_customer_internal_id)) {
								newFilters[newFilters.length] = new nlobjSearchFilter(
									"custrecord_job_customer",
									null,
									"is",
									customer_internal_id
								);
								newFilters[newFilters.length] = new nlobjSearchFilter(
									"custrecord_job_special_customer",
									null,
									"is",
									"@NONE@"
								);
							} else {
								newFilters[newFilters.length] = new nlobjSearchFilter(
									"custrecord_job_customer",
									null,
									"is",
									customer_internal_id
								);
								newFilters[newFilters.length] = new nlobjSearchFilter(
									"custrecord_job_special_customer",
									null,
									"is",
									special_customer_internal_id
								);
							}

							newFilters[newFilters.length] = new nlobjSearchFilter(
								"formulatext",
								null,
								"is",
								zee_text
							).setFormula(strFormula);
							if (!isNullorEmpty(single_line_packages)) {
								newFilters[newFilters.length] = new nlobjSearchFilter(
									"custrecord_job_service_package",
									null,
									"noneof",
									single_line_packages
								);
							}
							if (
								!isNullorEmpty(service_start_date) &&
								!isNullorEmpty(service_end_date)
							) {
								newFilters[newFilters.length] = new nlobjSearchFilter(
									"custrecord_job_date_scheduled",
									null,
									"onorafter",
									nlapiStringToDate(service_start_date)
								);
								newFilters[newFilters.length] = new nlobjSearchFilter(
									"custrecord_job_date_scheduled",
									null,
									"onorbefore",
									nlapiStringToDate(service_end_date)
								);
							}

							searched_jobs.addFilters(newFilters);

							var resultSet_jobs = searched_jobs.runSearch();

							var total_qty = 0;
							var old_total_qty = 0;
							var date_finalised;
							var total_amount = 0;
							var old_total_amount = 0;
							var old_service_rate = 0;

							var old_package_id = null;
							var old_service_id = null;
							var old_ns_item_id = null;
							var old_service_rate = null;
							var old_inv_details_rec_id = null;
							var old_invoice_single_line = null;
							var discount_value = null;
							var discount_set_type = null;
							var discount_detail = null;

							var count = 0;

							resultSet_jobs.forEachResult(function (searchResult_jobs) {
								nlapiLogExecution("DEBUG", "INSIDE OF INVOICEABLE SEARCH", "");

								var customer_internal_id = searchResult_jobs.getValue(
									"internalid",
									"CUSTRECORD_JOB_CUSTOMER",
									"group"
								);
								var customer_name = searchResult_jobs.getText(
									"custrecord_job_customer",
									null,
									"group"
								);
								//use the internal id of the service iunstead of the service name
								var service_id = searchResult_jobs.getValue(
									"custrecord_job_service",
									null,
									"group"
								);
								var service_rate = searchResult_jobs.getValue(
									"custrecord_job_service_price",
									null,
									"group"
								);
								var count_service = searchResult_jobs.getValue(
									"formulacurrency",
									null,
									"sum"
								);
								var discount_id = searchResult_jobs.getValue(
									"formulanumeric",
									null,
									"group"
								);
								var package_id = searchResult_jobs.getValue(
									"custrecord_job_service_package",
									null,
									"group"
								);
								var count_extras = searchResult_jobs.getValue(
									"custrecord_job_extras_qty",
									null,
									"sum"
								);
								var invoice_single_line = searchResult_jobs.getValue(
									"custrecord_job_invoice_single_line_item",
									null,
									"group"
								);
								var invoice_detail = searchResult_jobs.getValue(
									"custrecord_job_invoice_detail",
									null,
									"group"
								);
								if (
									!isNullorEmpty(
										searchResult_jobs.getValue(
											"custrecord_job_date_finalised",
											null,
											"max"
										)
									)
								) {
									date_finalised = searchResult_jobs.getValue(
										"custrecord_job_date_finalised",
										null,
										"max"
									);
								}

								var service_record = nlapiLoadRecord(
									"customrecord_service",
									service_id
								);

								var service_type_id =
									service_record.getFieldValue("custrecord_service");

								var service_type_record = nlapiLoadRecord(
									"customrecord_service_type",
									service_type_id
								);

								var ns_item_id = service_type_record.getFieldValue(
									"custrecord_service_type_ns_item"
								);

								//nlapiLogExecution('DEBUG','count_service', count_service);
								//nlapiLogExecution('DEBUG','count_extras', count_extras);

								if (isNullorEmpty(count_service) || count_service == 0.0) {
									count_service = 0;
								}

								if (isNullorEmpty(count_extras)) {
									count_extras = 0;
								}

								//nlapiLogExecution('DEBUG','count_service', count_service);
								//nlapiLogExecution('DEBUG','count_extras', count_extras);

								if (count == 0) {
									total_qty = parseInt(count_service) + parseInt(count_extras);
									if (
										!isNullorEmpty(invoice_detail) &&
										invoice_detail != "- None -"
									) {
										var inv_details_rec = nlapiCreateRecord("customrecord62");
										inv_details_rec.setFieldValue("name", invoice_detail);
										inv_details_rec.setFieldValue(
											"custrecord57_2",
											customer_internal_id
										);
										inv_details_rec.setFieldValue("custrecord56_2", ns_item_id);
										var inv_details_rec_id = nlapiSubmitRecord(inv_details_rec);
									}
								} else {
									if (old_service_id != service_id) {
										recInvoice.selectNewLineItem("item");

										recInvoice.setCurrentLineItemValue(
											"item",
											"item",
											old_ns_item_id
										);
										recInvoice.setCurrentLineItemValue(
											"item",
											"quantity",
											old_total_qty
										);
										recInvoice.setCurrentLineItemValue(
											"item",
											"rate",
											old_service_rate
										);

										if (!isNullorEmpty(old_inv_details_rec_id)) {
											item_desc = nlapiLoadRecord(
												"customrecord62",
												old_inv_details_rec_id
											);
											recInvoice.setCurrentLineItemValue(
												"item",
												"custcol1",
												old_inv_details_rec_id
											);
											recInvoice.setCurrentLineItemValue(
												"item",
												"custcol1_display",
												item_desc.getFieldValue("name")
											);
										}
										recInvoice.commitLineItem("item");

										//Start of new item
										old_total_qty = 0;
										total_qty = 0;
										total_qty =
											parseInt(count_service) + parseInt(count_extras);
										if (
											!isNullorEmpty(invoice_detail) &&
											invoice_detail != "- None -"
										) {
											var inv_details_rec = nlapiCreateRecord("customrecord62");
											inv_details_rec.setFieldValue("name", invoice_detail);
											inv_details_rec.setFieldValue(
												"custrecord57_2",
												customer_internal_id
											);
											inv_details_rec.setFieldValue(
												"custrecord56_2",
												ns_item_id
											);
											var inv_details_rec_id =
												nlapiSubmitRecord(inv_details_rec);
										}
									} else {
										if (old_service_rate != service_rate) {
											recInvoice.selectNewLineItem("item");

											recInvoice.setCurrentLineItemValue(
												"item",
												"item",
												old_ns_item_id
											);
											recInvoice.setCurrentLineItemValue(
												"item",
												"quantity",
												old_total_qty
											);
											recInvoice.setCurrentLineItemValue(
												"item",
												"rate",
												old_service_rate
											);

											if (!isNullorEmpty(old_inv_details_rec_id)) {
												item_desc = nlapiLoadRecord(
													"customrecord62",
													old_inv_details_rec_id
												);
												recInvoice.setCurrentLineItemValue(
													"item",
													"custcol1",
													old_inv_details_rec_id
												);
												recInvoice.setCurrentLineItemValue(
													"item",
													"custcol1_display",
													item_desc.getFieldValue("name")
												);
											}
											recInvoice.commitLineItem("item");

											//Start of new item
											old_total_qty = 0;
											total_qty = 0;
											total_qty =
												parseInt(count_service) + parseInt(count_extras);
											if (
												!isNullorEmpty(invoice_detail) &&
												invoice_detail != "- None -"
											) {
												var inv_details_rec =
													nlapiCreateRecord("customrecord62");
												inv_details_rec.setFieldValue("name", invoice_detail);
												inv_details_rec.setFieldValue(
													"custrecord57_2",
													customer_internal_id
												);
												inv_details_rec.setFieldValue(
													"custrecord56_2",
													ns_item_id
												);
												var inv_details_rec_id =
													nlapiSubmitRecord(inv_details_rec);
											}
										} else {
											total_qty =
												parseInt(count_service) + parseInt(count_extras);
											if (
												!isNullorEmpty(invoice_detail) &&
												invoice_detail != "- None -"
											) {
												var inv_details_rec =
													nlapiCreateRecord("customrecord62");
												inv_details_rec.setFieldValue("name", invoice_detail);
												inv_details_rec.setFieldValue(
													"custrecord57_2",
													customer_internal_id
												);
												inv_details_rec.setFieldValue(
													"custrecord56_2",
													ns_item_id
												);
												var inv_details_rec_id =
													nlapiSubmitRecord(inv_details_rec);
											}
										}
									}
								}

								count++;
								global_inv_line_count++;

								old_package_id = searchResult_jobs.getValue(
									"custrecord_job_service_package",
									null,
									"group"
								);
								old_service_id = searchResult_jobs.getValue(
									"custrecord_job_service",
									null,
									"group"
								);
								old_ns_item_id = ns_item_id;
								old_service_rate = searchResult_jobs.getValue(
									"custrecord_job_service_price",
									null,
									"group"
								);
								old_inv_details_rec_id = inv_details_rec_id;
								old_invoice_single_line = searchResult_jobs.getValue(
									"custrecord_job_invoice_single_line_item",
									null,
									"group"
								);
								old_total_qty += parseInt(total_qty);

								//nlapiLogExecution('DEBUG','old_total_qty', old_total_qty);

								return true;
							});

							if (ctx.getRemainingUsage() <= usage_threshold_invoice) {
								var params = {
									custscript_prev_deployment: ctx.getDeploymentId(),
									custscript_error_customers: error_customers.join(","),
									custscript_error_special_customers:
										error_specialCustomers.join(","),
								};

								var reschedule = rescheduleScript(
									prev_inv_deploy,
									adhoc_inv_deploy,
									params
								);
								if (reschedule == false) {
									return false;
								}
							} else {
								if (count >= 1) {
									recInvoice.selectNewLineItem("item");

									recInvoice.setCurrentLineItemValue(
										"item",
										"item",
										old_ns_item_id
									);
									recInvoice.setCurrentLineItemValue(
										"item",
										"quantity",
										old_total_qty
									);
									recInvoice.setCurrentLineItemValue(
										"item",
										"rate",
										old_service_rate
									);

									if (!isNullorEmpty(old_inv_details_rec_id)) {
										item_desc = nlapiLoadRecord(
											"customrecord62",
											old_inv_details_rec_id
										);
										recInvoice.setCurrentLineItemValue(
											"item",
											"custcol1",
											old_inv_details_rec_id
										);
										recInvoice.setCurrentLineItemValue(
											"item",
											"custcol1_display",
											item_desc.getFieldValue("name")
										);
									}
									recInvoice.commitLineItem("item");

									var invoiceId = nlapiSubmitRecord(recInvoice);

									//WS Log:
									nlapiLogExecution(
										"AUDIT",
										"Cust #: " +
										count_loop_cust +
										" | Cust ID: " +
										customer_internal_id +
										" | INV ID: " +
										invoiceId +
										".",
										usage_loopstart_cust - ctx.getRemainingUsage()
									);

									// nlapiLogExecution('DEBUG', 'START ---> after invoice creation', ctx.getRemainingUsage());
								} else if (count == 0 && global_inv_line_count >= 1) {
									var invoiceId = nlapiSubmitRecord(recInvoice);

									//WS Log:
									nlapiLogExecution(
										"AUDIT",
										"Cust #: " +
										count_loop_cust +
										" | Cust ID: " +
										customer_internal_id +
										" | INV id: " +
										invoiceId +
										".",
										usage_loopstart_cust - ctx.getRemainingUsage()
									);
								} else if (global_inv_line_count == 0 && count == 0) {
									var invoiceId = null;
								}

								var result = updateJobs(
									customer_internal_id,
									invoiceId,
									service_start_date,
									service_end_date,
									franchisee,
									null,
									special_customer_internal_id,
									zee_text
								);
								nlapiLogExecution("AUDIT", "Return value 1", result);
								return result;
							}
						} else {
							var body =
								"Cannot Finalize Invoicing For " +
								customer_name +
								". Either Date Reviewed or Date Finalized is not set OR the count of the Jobs with no Invoiceable field set is not 0 ";

							nlapiSendEmail(
								409635,
								[
									"ankith.ravindran@mailplus.com.au",
									"willian.suryadharma@mailplus.com.au",
								],
								"Invoice Process - Creation",
								body,
								null
							);

							// return false;
						}

						return true;
					} else {
						//WS Log: Error

						var body =
							"Customer: " +
							customer_internal_id +
							" cannot be invoiced because it has Job Discrepancies present. Search : Job - Invoicing Review - Invoiceable Discrepancies";

						nlapiSendEmail(
							409635,
							[
								"ankith.ravindran@mailplus.com.au",
								"willian.suryadharma@mailplus.com.au",
							],
							"Invoice Creation - Customer: " +
							customer_internal_id +
							" cannot be Invoiced",
							body,
							null
						);
					}
				} catch (e) {
					error_customers[error_customers.length] = customer_internal_id;

					if (!isNullorEmpty(special_customer_internal_id)) {
						error_specialCustomers[error_specialCustomers.length] =
							special_customer_internal_id;
					}

					var message = "";
					message += "Customer Internal ID: " + customer_internal_id + "</br>";
					message +=
						"Customer:  <a href ='https://1048144.app.netsuite.com/app/common/entity/custjob.nl?id=" +
						customer_internal_id +
						"'> View Customer </a></br>";
					message +=
						"----------------------------------------------------------------------------------</br>";
					// message += "Job: <a href ='https://1048144.app.netsuite.com/app/common/custom/custrecordentry.nl?rectype=941&id=" + job_id + "'> View Job </a></br>";
					message +=
						"----------------------------------------------------------------------------------</br>";
					message += e;

					nlapiSendEmail(
						409635,
						[
							"ankith.ravindran@mailplus.com.au",
							"willian.suryadharma@mailplus.com.au",
						],
						"Invoice Creation - Customer: " +
						customer_internal_id +
						" cannot create Invoice",
						message,
						null
					);
				}
			}

			return true;
		});
	} else {
		service_start_date = ctx.getSetting(
			"SCRIPT",
			"custscript_service_start_date"
		);
		service_end_date = ctx.getSetting("SCRIPT", "custscript_service_end_date");
		franchisee = ctx.getSetting("SCRIPT", "custscript_zee");
		zee_text = ctx.getSetting("SCRIPT", "custscript_zee_text");
		from_invoice = ctx.getSetting("SCRIPT", "custscript_from_invoice");

		nlapiLogExecution("AUDIT", "Inside Else to Update jobs");
		nlapiLogExecution(
			"AUDIT",
			"Customer",
			ctx.getSetting("SCRIPT", "custscript_customer_id")
		);
		nlapiLogExecution(
			"AUDIT",
			"Invoice",
			ctx.getSetting("SCRIPT", "custscript_invoiceid")
		);

		var result = updateJobs(
			ctx.getSetting("SCRIPT", "custscript_customer_id"),
			ctx.getSetting("SCRIPT", "custscript_invoiceid"),
			service_start_date,
			service_end_date,
			franchisee,
			from_invoice,
			ctx.getSetting("SCRIPT", "custscript_special_customer_id"),
			zee_text
		);
		nlapiLogExecution("AUDIT", "Return value 2", result);
		if (result == true && from_invoice != "Yes") {
			nlapiLogExecution(
				"AUDIT",
				"To continue with Next customer after Job Update"
			);
			var params = {
				custscript_prev_deployment: ctx.getDeploymentId(),
				custscript_error_customers: error_customers.join(","),
				custscript_error_special_customers: error_specialCustomers.join(","),
			};

			var reschedule = rescheduleScript(
				prev_inv_deploy,
				adhoc_inv_deploy,
				params
			);
			if (reschedule == false) {
				return false;
			}
		}
	}
}

function updateJobs(
	customer_internal_id,
	invoiceId,
	service_start_date,
	service_end_date,
	franchisee,
	from_invoice,
	special_customer_internal_id,
	zee_text
) {
	var count_loop_job = 0;

	var strFormula =
		"COALESCE({custrecord_job_service.custrecord_service_franchisee},{custrecord_job_group.custrecord_jobgroup_franchisee},{custrecord_job_franchisee},'')";

	if (from_invoice == "Yes") {
		var searched_alljobs = nlapiLoadSearch(
			"customrecord_job",
			"customsearch_job_invoicing_jobs"
		);
		var zee_record = nlapiLoadRecord("partner", franchisee);

		zee_text = zee_record.getFieldValue("entitytitle");
	} else {
		var searched_alljobs = nlapiLoadSearch(
			"customrecord_job",
			"customsearch_job_inv_process_job_all"
		);
	}

	var newFilters_alljobs = new Array();
	newFilters_alljobs[newFilters_alljobs.length] = new nlobjSearchFilter(
		"custrecord_job_customer",
		null,
		"is",
		customer_internal_id
	);
	if (!isNullorEmpty(special_customer_internal_id)) {
		nlapiLogExecution(
			"DEBUG",
			"special_customer_internal_id",
			special_customer_internal_id
		);
		newFilters_alljobs[newFilters_alljobs.length] = new nlobjSearchFilter(
			"custrecord_job_special_customer",
			null,
			"is",
			special_customer_internal_id
		);
	} else {
		newFilters_alljobs[newFilters_alljobs.length] = new nlobjSearchFilter(
			"custrecord_job_special_customer",
			null,
			"is",
			"@NONE@"
		);
	}
	newFilters_alljobs[newFilters_alljobs.length] = new nlobjSearchFilter(
		"formulatext",
		null,
		"is",
		zee_text
	).setFormula(strFormula);
	if (!isNullorEmpty(service_start_date) && !isNullorEmpty(service_end_date)) {
		newFilters_alljobs[newFilters_alljobs.length] = new nlobjSearchFilter(
			"custrecord_job_date_scheduled",
			null,
			"onorafter",
			nlapiStringToDate(service_start_date)
		);
		newFilters_alljobs[newFilters_alljobs.length] = new nlobjSearchFilter(
			"custrecord_job_date_scheduled",
			null,
			"onorbefore",
			nlapiStringToDate(service_end_date)
		);
	}

	searched_alljobs.addFilters(newFilters_alljobs);

	var resultSet_alljobs = searched_alljobs.runSearch();

	var reschedule;

	resultSet_alljobs.forEachResult(function (searchResult_alljobs) {
		var usage_loopstart_job = ctx.getRemainingUsage();
		count_loop_job++;

		//nlapiLogExecution('DEBUG', 'START ---> usage remianing per loop of job update', ctx.getRemainingUsage());
		try {
			if (ctx.getRemainingUsage() <= usage_threshold) {
				nlapiLogExecution("AUDIT", "switch inside Job Update");
				nlapiLogExecution(
					"AUDIT",
					"Job Update | Customer",
					customer_internal_id
				);
				nlapiLogExecution("AUDIT", "Job Update | Invoice", invoiceId);

				var params = {
					custscript_customer_id: customer_internal_id.toString(),
					custscript_invoiceid: invoiceId.toString(),
					custscript_prev_deployment: ctx.getDeploymentId(),
					custscript_service_start_date: service_start_date.toString(),
					custscript_service_end_date: service_end_date.toString(),
					custscript_zee: franchisee.toString(),
					custscript_special_customer_id: special_customer_internal_id,
					custscript_error_customers: error_customers.join(","),
					custscript_error_special_customers: error_specialCustomers.join(","),
					custscript_zee_text: zee_text,
				};

				reschedule = rescheduleScript(
					prev_inv_deploy,
					adhoc_inv_deploy,
					params
				);
				nlapiLogExecution("AUDIT", "Reschedule Return", reschedule);
				if (reschedule == false) {
					return false;
				}
			}

			var job_id = searchResult_alljobs.getValue("internalid");
			var invoiceable_yes_no = searchResult_alljobs.getValue(
				"custrecord_job_invoiceable"
			);

			var job_record = nlapiLoadRecord("customrecord_job", job_id);

			// job_record.getFieldValue('custrecord_job_date_invoiced') != getDate()
			if (
				isNullorEmpty(
					job_record.getFieldValue("custrecord_job_date_invoiced")
				) &&
				isNullorEmpty(job_record.getFieldValue("custrecord_job_invoice"))
			) {
				if (from_invoice == "Yes") {
					var jobGroupStatus = job_record.getFieldValue(
						"custrecord_job_group_status"
					);
					var jobInvoiceable = job_record.getFieldValue(
						"custrecord_job_invoiceable"
					);
					var jobCat = job_record.getFieldValue(
						"custrecord_job_service_category"
					);
					var packageStatus = job_record.getFieldValue(
						"custrecord_package_status"
					);

					if (isNullorEmpty(jobInvoiceable)) {
						if (!isNullorEmpty(packageStatus)) {
							if (packageStatus == 1 || isNullorEmpty(packageStatus)) {
								// Job Group Status is Null for Extras and Jobs Created in NS
								job_record.setFieldValue("custrecord_job_invoiceable", 1);
							} else {
								job_record.setFieldValue("custrecord_job_invoiceable", 2);
							}
						} else {
							if (
								jobGroupStatus == "Completed" ||
								isNullorEmpty(jobGroupStatus)
							) {
								// Job Group Status is Null for Extras and Jobs Created in NS
								job_record.setFieldValue("custrecord_job_invoiceable", 1);
							} else {
								job_record.setFieldValue("custrecord_job_invoiceable", 2);
							}
						}
					}
					job_record.setFieldValue("custrecord_job_invoice", invoiceId);
					job_record.setFieldValue("custrecord_job_date_reviewed", getDate());
					job_record.setFieldValue(
						"custrecord_job_date_inv_finalised",
						getDate()
					);
					job_record.setFieldValue("custrecord_job_date_invoiced", getDate());
					job_record.setFieldValue("custrecord_job_invoice_custom", 1);
				} else {
					if (
						!isNullorEmpty(
							job_record.getFieldValue("custrecord_job_date_reviewed")
						) &&
						!isNullorEmpty(
							job_record.getFieldValue("custrecord_job_date_inv_finalised")
						)
					) {
						job_record.setFieldValue("custrecord_job_invoice", invoiceId);
						job_record.setFieldValue("custrecord_job_date_invoiced", getDate());
						job_record.setFieldValue("custrecord_job_invoice_custom", 2);
					} else {
						var body =
							"Customer: " +
							customer_internal_id +
							" | Job: " +
							job_id +
							"cannot be updated because Date Review & Date Invoice Finalised is Empty.";

						nlapiSendEmail(
							112209,
							[
								"ankith.ravindran@mailplus.com.au",
								"willian.suryadharma@mailplus.com.au",
							],
							"Invoice Creation - Customer: " +
							customer_internal_id +
							" cannot update Job",
							body,
							null
						);

						//WS log:
						nlapiLogExecution(
							"ERROR",
							"Job #: " + count_loop_job + " | Job: " + job_id + ".",
							"ERROR: JOB X UPDATED - Inv & Date Invoice not empty."
						);

						return false;
					}
				}

				nlapiSubmitRecord(job_record);

				//WS Log:
				nlapiLogExecution(
					"DEBUG",
					"Job #: " + count_loop_job + " | Job: " + job_id + ".",
					usage_loopstart_job - ctx.getRemainingUsage()
				);
			} else {
				var body =
					"Customer: " +
					customer_internal_id +
					" | Job: " +
					job_id +
					"cannot be updated because Invoice ID and Date Invoice is not Empty.";

				nlapiSendEmail(
					409635,
					[
						"ankith.ravindran@mailplus.com.au",
						"willian.suryadharma@mailplus.com.au",
					],
					"Invoice Creation - Customer: " +
					customer_internal_id +
					" cannot update Job",
					body,
					null
				);

				//WS log:
				nlapiLogExecution(
					"ERROR",
					"Job #: " + count_loop_job + " | Job: " + job_id + ".",
					"ERROR: JOB X UPDATED - Inv & Date Invoice not empty."
				);

				return false;
			}
		} catch (e) {
			error_customers[error_customers.length] = customer_internal_id;

			var message = "";
			message += "Customer Internal ID: " + customer_internal_id + "</br>";
			message +=
				"Customer:  <a href ='https://1048144.app.netsuite.com/app/common/entity/custjob.nl?id=" +
				customer_internal_id +
				"'> View Customer </a></br>";
			message +=
				"----------------------------------------------------------------------------------</br>";
			message +=
				"Job: <a href ='https://1048144.app.netsuite.com/app/common/custom/custrecordentry.nl?rectype=941&id=" +
				job_id +
				"'> View Job </a></br>";
			message +=
				"----------------------------------------------------------------------------------</br>";
			message += e;

			nlapiSendEmail(
				409635,
				[
					"ankith.ravindran@mailplus.com.au",
					"willian.suryadharma@mailplus.com.au",
				],
				"Invoice Creation - Customer: " +
				customer_internal_id +
				" cannot update Job",
				message,
				null
			);
		}

		return true;
	});

	//WS Log:
	nlapiLogExecution(
		"DEBUG",
		"--> END | update job function",
		ctx.getRemainingUsage()
	);
	if (reschedule != false) {
		return true;
	} else {
		return false;
	}
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
			year = year - 1;
		} else {
			month = month - 1;
		}
	}

	// var firstDay = new Date(year, (month), 1);
	var lastDay = new Date(year, month + 1, 0);

	return nlapiDateToString(lastDay);
}

function service_start_end_date(date_finalised) {
	var split_date = date_finalised.split("/");

	var date = new Date();
	var firstDay = new Date(date.getFullYear(), parseInt(split_date[1]) - 1, 1);
	var lastDay = new Date(date.getFullYear(), split_date[1], 0);

	var service_range = [];

	service_range[0] = nlapiDateToString(firstDay);
	service_range[1] = nlapiDateToString(lastDay);

	return service_range;
}
