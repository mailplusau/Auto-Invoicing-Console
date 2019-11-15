/**
 * Module Description
 * 
 * NSVersion    Date            Author         Remarks
 * 1.00       2017-10-17 14:34:11   Ankith         To set all jobs with either invoiceable or package values
 * 
 * @Last Modified by:   mailplusar
 * @Last Modified time: 2018-03-28 09:55:25
 *
 */
function assignJobs() {

	var form = nlapiCreateForm('');

	var custId = request.getParameter('customer_id');
	var zee = request.getParameter('zee');
	var jobs = request.getParameter('job_array');
	var package = request.getParameter('package_array');
	var invoiceable = request.getParameter('invoiceable_array');

	var package_array = null;
	var invoiceable_array = null;

	// nlapiSetRedirectURL('SUITELET', script_id, deploy_id, null, params2);
	// 
	if (!isNullorEmpty(custId) && !isNullorEmpty(jobs)) {
		var jobs_array = jobs.split(',');
		if (!isNullorEmpty(package)) {
			package_array = package.split(',');
		}
		if (!isNullorEmpty(invoiceable)) {
			invoiceable_array = invoiceable.split(',');
		}

		for (i = 0; i < jobs_array.length; i++) {
			if (!isNullorEmpty(jobs_array[i])) {
				var jobRecord = nlapiLoadRecord('customrecord_job', jobs_array[i]);

				if (!isNullorEmpty(package_array)) {
					if (!isNullorEmpty(package_array[i])) {
						jobRecord.setFieldValue('custrecord_job_service_package', package_array[i]);
					}
				}

				if (!isNullorEmpty(invoiceable_array)) {
					if (!isNullorEmpty(invoiceable_array[i])) {
						jobRecord.setFieldValue('custrecord_job_invoiceable', invoiceable_array[i]);
					}
				}

				jobRecord.setFieldValue('custrecord_job_date_reviewed', getDate());

				nlapiSubmitRecord(jobRecord);
			}
		}
	}

	var params = new Array();
	params['customer_id'] = custId;
	params['zee'] = zee;
	params['start_date'] = request.getParameter('start_date');
	params['end_date'] = request.getParameter('end_date');

	nlapiSetRedirectURL('SUITELET', 'customscript_sl_services_main_page', 'customdeploy_sl_services_main_page', null, params);
	// assignJobs();
	response.writePage(form);

}