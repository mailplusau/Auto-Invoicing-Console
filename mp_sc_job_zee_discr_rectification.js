var usage_threshold = 50;
var adhoc_deploy = 'customdeploy2';
var prev_deploy = null;

function main(type) {

	var ctx = nlapiGetContext();

	if (!isNullorEmpty(ctx.getSetting('SCRIPT', 'custscript_prev_zee_discr_deployment')) && (adhoc_deploy != ctx.getSetting('SCRIPT', 'custscript_prev_zee_discr_deployment'))) {
        prev_deploy = ctx.getSetting('SCRIPT', 'custscript_prev_zee_discr_deployment');
    } else {
        prev_deploy = ctx.getDeploymentId();
    }

	var searched_jobs = nlapiLoadSearch('customrecord_job', 'customsearch_job_inv_review_zee_discr');
	var resultSet = searched_jobs.runSearch();
    var usage_start = ctx.getRemainingUsage();
  
	nlapiLogExecution('EMERGENCY', 'START -->', usage_start);


	var count_loop = 0;
	
	resultSet.forEachResult(function(result){

		var usage_loopstart = ctx.getRemainingUsage();
		var cust_id = result.getValue('internalid','custrecord_job_customer');
		var cust_zee = result.getValue('partner','custrecord_job_customer');
		var job_id = result.getValue('internalid');
		var jobgroup_id = result.getValue('custrecord_job_group');
		var jobgroup_zee = result.getValue('custrecord_jobgroup_franchisee','custrecord_job_group');
		var job_zee = result.getValue('custrecord_job_franchisee');
		var service_id = result.getValue('custrecord_job_service');
		var service_zee = result.getValue('custrecord_service_franchisee','custrecord_job_service');
		var joboperatorassigned_id = result.getValue('custrecord_job_operator_assigned');
		var job_source = result.getValue('custrecord_job_source');

		if (usage_loopstart <= usage_threshold) {

            var params = {
                custscript_prev_zee_discr_deployment: ctx.getDeploymentId()
            }

            var reschedule = rescheduleScript(prev_deploy, adhoc_deploy, params);
            if (reschedule == false) {
                return false;
            }
        }

		count_loop++;

		/* Customer Zee can be different to Job once Transferred
		if (cust_zee != job_zee) {
			//set job_zee to cust_zee
			nlapiLogExecution('DEBUG', '!= job_zee', "cust_zee: " + cust_zee + " vs job_zee: " + job_zee);
			rectify('customrecord_job', job_id,'custrecord_job_franchisee', cust_zee, joboperatorassigned_id);
		}
		
		if (cust_zee != jobgroup_zee && !isNullorEmpty(jobgroup_zee)) {
			//set jobgroup_zee to cust_zee
			nlapiLogExecution('DEBUG', '!= jobgroup_zee', "cust_zee: " + cust_zee + " vs jobgroup_zee: " + jobgroup_zee);
			rectify('customrecord_jobgroup', jobgroup_id, 'custrecord_jobgroup_franchisee', cust_zee, null);	
		}

		if (cust_zee != service_zee && !isNullorEmpty(service_zee)) {
			//send alert email to WS & AR
			nlapiLogExecution('DEBUG', '!= service_zee', "cust_zee: " + cust_zee + " vs service_zee: " + service_zee);
			var cust = nlapiLoadRecord('customer', cust_id);
			var service = nlapiLoadRecord ('customrecord_service',service_id);

			var subject = "Invoicing Review Discrepancy: Service Zee != Customer Zee";

			var message ="";
			message += "Customer: " +  cust.getFieldValue('companyname') + " " + cust.getFieldValue('entityid') +"\n";
			message += "Customer Internal ID: " +  cust_id +"\n";
			message += "Customer Zee: " + cust_zee +"\n\n";
			message += "----------------------------------------------------------------------------------\n\n"
			message += "Service: " +  service.getFieldValue('name') + " " + service.getFieldValue('custrecord_service_price') + " | " + service.getFieldValue ('custrecord_service_description') +"\n";
			message += "Service Internal ID: " +  service_id +"\n";
			message += "Service Zee: " +  service_zee +"\n";
			
			nlapiSendEmail(58097, 58097, subject, message);

		}
		*/

		if (isNullorEmpty(service_zee)) {
			//send error email: services needs to have service_zee
			nlapiLogExecution('DEBUG', 'service_zee == null', "service_zee: " + service_zee);
			
			var service = nlapiLoadRecord ('customrecord_service',service_id);

			var subject = "Job Franchisee Discrepancy Recitfication: Service Zee == null";

			var message ="ALL non-Extra Services should have Service Zee.</br></br></br>";
			message += "Script: Job Franchisee Discrepancy Recitfication</br>";
			message += "<a href ='https://system.na2.netsuite.com/app/common/scripting/script.nl?id=709'> View Script </a></br>";
			message += "----------------------------------------------------------------------------------</br>";
			message += "Service: " +  service.getFieldValue('name') + " " + service.getFieldValue('custrecord_service_price') + " | " + service.getFieldValue ('custrecord_service_description') +"</br>";
			message += "Service Internal ID: " +  service_id +"</br>";
			message += "Service Zee: " +  service_zee +"</br>";
			message += "<a href='https://system.na2.netsuite.com/app/common/custom/custrecordentry.nl?rectype=946&id="+ service_id+"'> View Record </a>"
			
			nlapiSendEmail(58097, 58097, subject, message);

		} else if (isNullorEmpty (jobgroup_zee) && job_source != 5) {
			//send error email: jobgroup needs to have jobgroup_zee
			nlapiLogExecution('DEBUG', 'jobgroup_zee == null', "jobgroup_zee: " + jobgroup_zee);

			var subject = "Job Franchisee Discrepancy Recitfication: Job Group Zee == null";

			var message ="ALL Job Groups should have Job Group Zee.</br></br></br>";
			message += "Script: Job Franchisee Discrepancy Recitfication</br>";
			message += "<a href ='https://system.na2.netsuite.com/app/common/scripting/script.nl?id=709'> View Script </a></br>";
			message += "----------------------------------------------------------------------------------</br>";
			message += "Job Group Internal ID: " +  jobgroup_id +"</br>";
			message += "<a href='https://system.na2.netsuite.com/app/common/custom/custrecordentry.nl?rectype=958&id="+ jobgroup_id +"'> View Record </a>";
			
			nlapiSendEmail(58097, 58097, subject, message);

		} else {

			if (service_zee != job_zee) {
				//set job_zee to cust_zee
				nlapiLogExecution('DEBUG', '!= job_zee', "service_zee: " + service_zee + " vs job_zee: " + job_zee);
				rectify('customrecord_job', job_id,'custrecord_job_franchisee', service_zee, joboperatorassigned_id);
			}

			if (service_zee != jobgroup_zee){
				//set jobgroup_zee to service_zee
				nlapiLogExecution('DEBUG', 'service_zee != jobgroup_zee', "service_zee: " + service_zee + " vs jobgroup_zee: " + jobgroup_zee);
				rectify('customrecord_jobgroup', jobgroup_id, 'custrecord_jobgroup_franchisee', service_zee, null);	
			}

		}

		nlapiLogExecution('AUDIT', 'Loop: '+ count_loop + " | job: " + job_id + " | grp: " + jobgroup_id + ".", (usage_loopstart - ctx.getRemainingUsage()));

		return true;

	});

	nlapiLogExecution('EMERGENCY', '--> END', usage_start - ctx.getRemainingUsage());

}

function rectify(recordType, id, field, value, operator){

	var record = nlapiLoadRecord(recordType, id);

	record.setFieldValue(field, value);
	if (operator) {
		record.setFieldValue('custrecord_job_operator_assigned', operator);
	}

	nlapiLogExecution('DEBUG', 'rectify -> ' + recordType , "id: " + id + " | field: " + field + " | value: " + value + " | operator: " + operator);

	nlapiSubmitRecord(record);

	return true;

}