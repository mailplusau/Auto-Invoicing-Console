function ueDiscrepancyJobs() {

	if (type == 'edit') {
		var searched_summary = nlapiLoadSearch('customrecord_job', 'customsearch_job_inv_review_inv_discrep');

		var resultSet_summary = searched_summary.runSearch();

		resultSet_summary.forEachResult(function(searchResult_summary) {

			var job_group_id = searchResult_summary.getValue("internalid", "CUSTRECORD_JOB_GROUP", "GROUP");

			nlapiLogExecution('DEBUG', 'job_group_id', job_group_id);

			// if (!isNullorEmpty(job_group_id)) {


			var job_group_record = nlapiLoadRecord('customrecord_jobgroup', job_group_id);

			var job_group_status = job_group_record.getFieldValue('custrecord_jobgroup_status');

			nlapiLogExecution('DEBUG', 'job_group_status', job_group_status)

			var searched_jobs4 = nlapiLoadSearch('customrecord_job', 'customsearch_job_invoicing_jobs');

			var newFilters = new Array();
			newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_group', null, 'anyof', job_group_id);
			newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_service_category', null, 'anyof', [1]);
			// 


			searched_jobs4.addFilters(newFilters);

			var resultSet4 = searched_jobs4.runSearch();

			resultSet4.forEachResult(function(searchResult4) {

				nlapiLogExecution('DEBUG', 'JOB ID', searchResult4.getValue('internalid'))

				var job_record = nlapiLoadRecord('customrecord_job', searchResult4.getValue('internalid'));
				var job_invoiceable_field = job_record.getFieldValue('custrecord_job_invoiceable');

				var invoiceable_status;

				if (job_group_status == 1) {
					invoiceable_status = 2
				} else if (job_group_status == 2 || job_group_status == 3) {
					invoiceable_status = 1
				}

				job_record.setFieldValue('custrecord_job_invoiceable', invoiceable_status);
				job_record.setFieldValue('custrecord_job_date_allocated', getDate());

				nlapiSubmitRecord(job_record);

				return true;
			});
			// }


			return true;
		});

	}
}