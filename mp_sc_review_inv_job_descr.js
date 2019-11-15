/**
 * Module Description
 * 
 * NSVersion    Date            	Author         Remarks
 * 1.00       2017-10-06 11:25:32   Ankith     	   
 * 2.00       2018-02-08 23:45:15   Willian     	   
 * 
 * @Last Modified by:   mailplusar
 * @Last Modified time: 2018-05-08 10:02:26
 *
 */

var ctx = nlapiGetContext();
var usageThreshold = 50;
var adhocInvDeploy = 'customdeploy_adhoc';
var prevInvDeploy = null;

function reviewDiscrepancyJobs() {

	var count_group = 0;
	var count_job = 0;

	if (!isNullorEmpty(ctx.getSetting('SCRIPT', 'custscript_prevdeployid'))) {
		prevInvDeploy = ctx.getSetting('SCRIPT', 'custscript_prevdeployid');
	} else {
		prevInvDeploy = ctx.getDeploymentId();
	}

	var resultSet_group = nlapiLoadSearch('customrecord_job', 'customsearch_job_inv_review_inv_discrep').runSearch();

	resultSet_group.forEachResult(function(group) {

		usageStart = ctx.getRemainingUsage();

		if (usageStart <= usageThreshold) {

			nlapiLogExecution('DEBUG', 'SWITCHing -->', ctx.getRemainingUsage());

			var params = {
				custscript_prevdeployid: ctx.getDeploymentId()
			}


			var reschedule = rescheduleScript(prevInvDeploy, adhocInvDeploy, params);
			if (reschedule == false) {
				return false;
			}
		}

		count_group++;

		var all, yes, no, nullx, invoiceable;
		var job_group_id = group.getValue("internalid", "CUSTRECORD_JOB_GROUP", "GROUP");
		var job_group_status = group.getValue("custrecord_job_group_status", null, "GROUP");

		var cols = group.getAllColumns();
		cols.forEach(function(col) {
			switch (col.getLabel()) {
				case 'All':
					all = group.getValue(col);
					break;
				case 'Yes':
					yes = group.getValue(col);
					break;
				case 'No':
					no = group.getValue(col);
					break;
				case 'Nullx':
					nullx = group.getValue(col);
					break;
			}
			return true;
		});

		if ((all - nullx) > 0) { //Not All Jobs Invoiceable null
			if (job_group_status == "Completed") {
				if (no > 0) {
					invoiceable = 2; // No
				} else {
					invoiceable = 1; // Yes
				}
			} else if (job_group_status == "Incomplete" || job_group_status == "Partial" || job_group_status == "Scheduled" || isNullorEmpty(job_group_status)) {
				if (yes > 0) {
					invoiceable = 1; // Yes
				} else {
					invoiceable = 2; // No
				}
			}
		} else {
			invoceable = null;
		}

		nlapiLogExecution('AUDIT', 'Loop# ' + count_group + ' | Job Group: ' + job_group_id + ' - ' + job_group_status, 'All: ' + all + ' Y: ' + yes + ' N: ' + no + ' null: ' + nullx + ' | Inv: ' + invoiceable);

		if (!isNullorEmpty(job_group_id)) {
			//Run Job Search
			var job_search = nlapiLoadSearch('customrecord_job', 'customsearch_job_invoicing_jobs');

			var newFilters = new Array();

			newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_group', null, 'anyof', job_group_id);

			newFilters[newFilters.length] = new nlobjSearchFilter('custrecord_job_service_category', null, 'anyof', [1]); // Services

			job_search.addFilters(newFilters);

			var resultSet_job = job_search.runSearch();

			// TO BE ADDED
			// Need to Incorporate the consideration for package re-allocation
			// if packaged,
			// nullify service package, pkg job groups, date last allocated and pkg status for existing jobs
			// find all related jobs of the job group ids packaged filtering out existing jobs
			// nullify service package, pkg job groups, date last allocated and pkg status for the other jobs

			// var job_ids_pkg = [];

			// Update Jobs
			resultSet_job.forEachResult(function(job) {

				count_job++;
				var job_id = job.getValue('internalid');
				var job_invoiceable = job.getValue('custrecord_job_invoiceable');
				// var job_pkg = job.getValue('custrecord_job_service_package'); to include in search
				// var job_pkg_groups = job.getValue('custrecord_package_job_groups'); to include in search


				if (!isNullorEmpty(invoiceable) && (invoiceable != job_invoiceable)) {
					var job_record = nlapiLoadRecord('customrecord_job', job_id);
					job_record.setFieldValue('custrecord_job_invoiceable', invoiceable);

					// to be incorporated
					// job_record.setFieldValue('custrecord_job_service_package', null);
					// job_record.setFieldValue('custrecord_package_job_groups', null);
					// job_record.setFieldValue('custrecord_job_date_allocated', null);
					// job_record.setFieldValue('custrecord_package_status', null);

					nlapiSubmitRecord(job_record); //might need to move for package
					nlapiLogExecution('DEBUG', 'Group# - Job#: ' + count_group + ' - ' + count_job + ' | Job : ' + job_id, 'Job Inv: ' + job_invoiceable + ' | Inv: ' + invoiceable + '. UPDATED.');
				} else {
					nlapiLogExecution('DEBUG', 'Group# - Job#: ' + count_group + ' - ' + count_job + ' | Job : ' + job_id, 'Job Inv: ' + job_invoiceable + ' | Inv: ' + invoiceable + '. SKIPPED.');
				}



				// DEPRECATED
				// Assumes that discrepancies are caused by one job being Yes and the other being No
				// Bug: Does not consider that discrepancies can be caused by null and Yes/No

				// if (job_group_status == 1) { // Job Group Status == Complete
				// 	invoiceable_status = 2 // Invoiceable = No
				// } else if (job_group_status == 2 || job_group_status == 3) { // Job Group Status == Incomplete or Partial
				// 	invoiceable_status = 1 // Invoiceable = Yes
				// }

				return true;
			});
		}
		return true;
	});
}