/**
 * Module Description
 * 
 * NSVersion    Date            		Author         
 * 1.00       	2017-12-21 10:00:40   		Ankith 
 *
 * Remarks:         
 * 
 * @Last Modified by:   mailplusar
 * @Last Modified time: 2019-05-07 10:10:48
 *
 */

var zee = 0;
var role = nlapiGetRole();

if (role == 1000) {
	zee = nlapiGetUser();
} else if (role == 3) { //Administrator
	zee = 6; //test
} else if (role == 1032) { // System Support
	zee = 425904; //test-AR
}

//Lock record if attempting to edit Job with DATE INV FINALISED / DATE INVOICED / INVOICE field already set
function beforeLoad(type) {
	var id = nlapiGetRecordId();

	// if attempting to edit
	if (type == 'edit') {

		if (role != 3) {
			// if DATE INV FINALISED / DATE INVOICED / INVOICE field is not blank, lock record
			if (!isNullorEmpty(nlapiGetFieldValue('custrecord_job_date_inv_finalised')) || !isNullorEmpty(nlapiGetFieldValue('custrecord_job_date_invoiced')) || !isNullorEmpty(nlapiGetFieldValue('custrecord_job_invoice'))) {
				nlapiLogExecution('DEBUG', 'Job Locked', 'Job ID: ' + id + 'Role: ' + role);
				throw nlapiCreateError('RECORD_LOCKED', 'Record Locked: \n\nThis App Job has been Invoiced cannot be Edited. \nPlease contact head office for more information.', true);
			}
		}
	}

}
// 
//Unset Fields if Job Record edited
function beforeSubmit(type, form) {


	if (type == 'create') {

		//Get the new record after Edit
		var service_id = nlapiGetFieldValue('custrecord_job_service');
		var date_scheduled = nlapiGetFieldValue('custrecord_job_date_scheduled');
		var service = nlapiLoadRecord('customrecord_service', service_id);
		var service_price = parseFloat(service.getFieldValue('custrecord_service_price'));
        var service_price100 = (service_price * 100).toFixed(2);
		var service_date_last_price_upd = (service.getFieldValue('custrecord_service_date_last_price_upd'));
		var new_price = parseFloat(nlapiGetFieldValue('custrecord_job_service_price'));
		var customer_id = nlapiGetFieldValue('custrecord_job_customer');

		nlapiLogExecution('DEBUG', 'App Price - Create', new_price);
		nlapiLogExecution('DEBUG', 'Service Price - Create', service_price);

		if (date_scheduled >= service_date_last_price_upd || isNullorEmpty(service_date_last_price_upd)) {
			if ((new_price == service_price100) || (new_price == service_price)) {
				nlapiSetFieldValue('custrecord_job_service_price', service_price);
			} else {
				//email WS
				// nlapiSetFieldValue('custrecord_job_service_price', service_price);
				var subject = "Auto Invoicing - Package Unallocate (UE): Unexpected Price Update";

				var message = "Price from Premonition does not match Service Price in NetSuite</br></br></br>";
				message += "Script: Auto Invoicing - Package Unallocate (UE)</br>";
				message += "<a href ='https://1048144.app.netsuite.com/app/common/scripting/script.nl?id=713'>View Script</a></br>";
				message += "----------------------------------------------------------------------------------</br>";
				message += "Customer Internal ID: " + customer_id + "</br>";
				message += "Customer:  <a href ='https://1048144.app.netsuite.com/app/common/entity/custjob.nl?id=" + customer_id + "'>View Customer</a></br>";;
				message += "----------------------------------------------------------------------------------</br>";
				message += "Job: New</br>";
				message += "----------------------------------------------------------------------------------</br>";
				message += "Service: " + service.getFieldValue('name') + " " + service.getFieldValue('custrecord_service_price') + " | " + service.getFieldValue('custrecord_service_description') + "</br>";
				message += "Service Internal ID: " + service_id + "</br>";
				message += "<a href='https://1048144.app.netsuite.com/app/common/custom/custrecordentry.nl?rectype=946&id=" + service_id + "'>View Record</a></br>";
				message += "Premonition Service Price: " + new_price;
				nlapiLogExecution('DEBUG', 'message', message);
				nlapiSendEmail(409635, ['ankith.ravindran@mailplus.com.au', 'willian.suryadharma@mailplus.com.au'], subject, message, null);

			}
		}

	}

	if (type == 'edit' || type == 'xedit') {

		//Get the old record before Edit
		var recOld = nlapiGetOldRecord();

		//Get the new record after Edit
		var recUpd = nlapiGetNewRecord();
		var recId = nlapiGetRecordId();

		var old_service_package = recOld.getFieldValue('custrecord_job_service_package');
		var new_service_package = recUpd.getFieldValue('custrecord_job_service_package');
		var new_job_customer = recUpd.getFieldValue('custrecord_job_customer');
		var old_package_job_groups = recOld.getFieldValues('custrecord_package_job_groups');
		var old_date_finalised = recOld.getFieldValue('custrecord_job_date_finalised');
		var old_time_finalised = recOld.getFieldValue('custrecord_job_time_finalised');
		var new_date_finalised = recUpd.getFieldValue('custrecord_job_date_finalised');
		var new_time_finalised = recUpd.getFieldValue('custrecord_job_time_finalised');
		var old_date_scheduled = recOld.getFieldValue('custrecord_job_date_scheduled');

		var new_price = parseFloat(recUpd.getFieldValue('custrecord_job_service_price'));

		nlapiLogExecution('DEBUG', 'App Price - Edit', new_price);
		

		// deal with inconsistent price format from Premonition - ie. no decimals
		if (!isNullorEmpty(new_price)) {
			var service_id = recOld.getFieldValue('custrecord_job_service');
			var service = nlapiLoadRecord('customrecord_service', service_id);
            var service_price = parseFloat(service.getFieldValue('custrecord_service_price'));
            var service_price100 = (service_price * 100).toFixed(2);
			var service_date_last_upd = service.getFieldValue('custrecord_service_date_last_price_upd');

			nlapiLogExecution('DEBUG', 'Service Price - Edit', service_price);

			if (date_scheduled >= service_date_last_price_upd || isNullorEmpty(service_date_last_price_upd)) {

				if ((new_price == service_price100) || (new_price == service_price)) {
					recUpd.setFieldValue('custrecord_job_service_price', service_price);
				} else {
					//email WS

					// recUpd.setFieldValue('custrecord_job_service_price', service_price);
					var subject = "Auto Invoicing - Package Unallocate (UE): Unexpected Price Update";


					var message = "Price from Premonition does not match Service Price in NetSuite</br></br></br>";
					message += "Script: Auto Invoicing - Package Unallocate (UE)</br>";
					message += "<a href ='https://1048144.app.netsuite.com/app/common/scripting/script.nl?id=713'> View Script </a></br>";
					message += "----------------------------------------------------------------------------------</br>";
					message += "Customer Internal ID: " + customer_id + "</br>";
					message += "Customer:  <a href ='https://1048144.app.netsuite.com/app/common/entity/custjob.nl?id=" + customer_id + "'>View Customer</a></br>";
					message += "----------------------------------------------------------------------------------</br>";
					message += "Job: <a href ='https://1048144.app.netsuite.com/app/common/custom/custrecordentry.nl?rectype=941&id=" + recId + "'>View Job</a></br>";
					message += "----------------------------------------------------------------------------------</br>";
					message += "Service: " + service.getFieldValue('name') + " " + service.getFieldValue('custrecord_service_price') + " | " + service.getFieldValue('custrecord_service_description') + "</br>";
					message += "Service Internal ID: " + service_id + "</br>";
					message += "<a href='https://1048144.app.netsuite.com/app/common/custom/custrecordentry.nl?rectype=946&id=" + service_id + "'>View Record</a></br>";
					message += "Premonition Service Price: " + new_price;
					nlapiLogExecution('DEBUG', 'message', message);
					nlapiSendEmail(409635, ['ankith.ravindran@mailplus.com.au', 'willian.suryadharma@mailplus.com.au'], subject, message, null);

				}

			}

		}


		// nlapiLogExecution('DEBUG', 'recId', recId);
		// nlapiLogExecution('DEBUG', 'new_date_finalised', (new_date_finalised));

		//If the date and time finalised has been changed, unset the date reviewed and invoiceable field
		if (!isNullorEmpty(new_date_finalised)) {
			if ((!isNullorEmpty(old_date_finalised) && (old_date_finalised != new_date_finalised)) || (!isNullorEmpty(old_time_finalised) && (old_time_finalised != new_time_finalised))) {

				recUpd.setFieldValue('custrecord_job_date_reviewed', null);
				recUpd.setFieldValue('custrecord_job_invoiceable', null);

			}

			//If service package field is set to null, unset all the related job records from the package
			if (!isNullorEmpty(old_service_package) && isNullorEmpty(new_service_package)) {

				nlapiLogExecution('DEBUG', 'Inside Unaalocate Package');

				recUpd.setFieldValues('custrecord_package_job_groups', null);
				recUpd.setFieldValue('custrecord_job_date_reviewed', null);
				recUpd.setFieldValue('custrecord_job_invoiceable', null);
				recUpd.setFieldValue('custrecord_package_status', null);
				recUpd.setFieldValue('custrecord_job_discount_type', null);
				recUpd.setFieldValue('custrecord_job_invoice_single_line_item', null);
				recUpd.setFieldValue('custrecord_job_date_allocated', null);

				if (!isNullorEmpty(old_package_job_groups)) {

					//Search - Job - Package unAllocator - Jobs Packaged
					var searched_jobs = nlapiLoadSearch('customrecord_job', 'customsearch_pkg_unallocator_job_pkgd');

					var newFilters = new Array();
					newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_customer', null, 'is', new_job_customer);
					newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_group', null, 'anyof', old_package_job_groups);
					newFilters[newFilters.length] = new nlobjSearchFilter('internalid', null, 'noneof', recId);
					newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_service_package', null, 'is', old_service_package);

					searched_jobs.addFilters(newFilters);

					var resultSet = searched_jobs.runSearch();

					resultSet.forEachResult(function(searchResult) {

						var jobid = searchResult.getValue('internalid');

						var jobRecord = nlapiLoadRecord('customrecord_job', jobid);

						jobRecord.setFieldValue('custrecord_job_service_package', null);
						jobRecord.setFieldValues('custrecord_package_job_groups', null);
						jobRecord.setFieldValue('custrecord_job_date_reviewed', null);
						jobRecord.setFieldValue('custrecord_job_invoiceable', null);
						jobRecord.setFieldValue('custrecord_package_status', null);
						jobRecord.setFieldValue('custrecord_job_discount_type', null);
						jobRecord.setFieldValue('custrecord_job_invoice_single_line_item', null);
						jobRecord.setFieldValue('custrecord_job_date_allocated', null);


						nlapiSubmitRecord(jobRecord);

						return true;
					});
				}
			}
		}
	}
}