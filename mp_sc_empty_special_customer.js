/*
* @Author: ankith.ravindran
* @Date:   2019-03-01 08:24:47
* @Last Modified by:   ankith.ravindran
* @Last Modified time: 2019-03-01 10:27:14
* Description: Schedule Script to empty the Special Customer Field in the App Job Record. Uses Search AIC - AUDIT - Empty App Job Special Customer to get the list of App Jobs.
*/
function main(){

	var searched_summary = nlapiLoadSearch('customrecord_job', 'customsearch_emtpy_app_job_special_cust');

		var resultSet_summary = searched_summary.runSearch();


		resultSet_summary.forEachResult(function(searchResult_summary) {

			var job_id = searchResult_summary.getValue('internalid');

			var job_record = nlapiLoadRecord('customrecord_job', job_id);
			job_record.setFieldValue('custrecord_job_special_customer', null);
			nlapiSubmitRecord(job_record);

			return true;
		});
}