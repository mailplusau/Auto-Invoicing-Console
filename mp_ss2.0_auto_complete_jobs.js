/**
 * @NApiVersion 2.x
 * @NScriptType ScheduledScript
 * @Author: Ankith Ravindran <ankithravindran>
 * @Date:   2022-04-29T13:58:14+10:00
 * @Filename: mp_ss2.0_auto_complete_jobs.js
 * @Last modified by:   ankithravindran
 * @Last modified time: 2022-05-06T09:19:56+10:00
 */


define(['N/task', 'N/email', 'N/runtime', 'N/search', 'N/record', 'N/format',
		'N/https'
	],
	function(task, email, runtime, search, record, format, https) {


		var main_JSON = '';

		function execute(context) {

			var todayDateTime = new Date();

			log.audit({
				title: 'todayDateTime',
				details: todayDateTime
			});

			//To get todays date
			todayDateTime = format.format({
				value: todayDateTime,
				type: format.Type.DATETIME,
				timezone: format.Timezone.AUSTRALIA_SYDNEY
			});

			var oldAppJobID = null;
			var oldJobGroupID = null;
			var count = 0;

			//NetSuite Search: AIC - Todays Scheduled & Partial App Jobs
			var searchJobsScheduledPartial = search.load({
				id: 'customsearch_rta_today_app_jobs_4',
				type: 'customrecord_job'
			});


			searchJobsScheduledPartial.run().each(function(
				searchJobsScheduledPartialResultSet) {

				var jobInternalID = searchJobsScheduledPartialResultSet.getValue({
					name: 'internalid'
				});

				var jobGroupInternalID = searchJobsScheduledPartialResultSet.getValue({
					name: "internalid",
					join: "CUSTRECORD_JOB_GROUP"
				});


				if (count > 0 && oldAppJobID != jobInternalID) {
					var appJobGroupRecord = record.load({
						type: 'customrecord_jobgroup',
						id: oldJobGroupID
					});
					appJobGroupRecord.setValue({
						fieldId: 'custrecord_jobgroup_status',
						value: 1
					});
					appJobGroupRecord.save();

					// reschedule = rescheduleScript(prev_inv_deploy, adhoc_inv_deploy, null);
					var scriptTask = task.create({
						taskType: task.TaskType.SCHEDULED_SCRIPT,
						scriptId: 'customscript_ss2_auto_complete_jobs',
						deploymentId: 'customdeploy2',
						params: null
					});
					var scriptTaskId = scriptTask.submit();

					return false;

				}

				var appJobRecord = record.load({
					type: 'customrecord_job',
					id: jobInternalID
				});
				var timeScheduled = appJobRecord.getValue({
					fieldId: 'custrecord_job_time_scheduled'
				});
				appJobRecord.setValue({
					fieldId: 'custrecord_job_date_finalised',
					value: getDateToday()
				});
				appJobRecord.setValue({
					fieldId: 'custrecord_job_time_finalised',
					value: timeScheduled
				});
				appJobRecord.setValue({
					fieldId: 'custrecord_job_status',
					value: 3
				});
				appJobRecord.save();

				count++;
				oldAppJobID = jobInternalID;
				oldJobGroupID = jobGroupInternalID;
				return true;
			});

			if (count > 0) {
				var appJobGroupRecord = record.load({
					type: 'customrecord_jobgroup',
					id: oldJobGroupID
				});
				appJobGroupRecord.setValue({
					fieldId: 'custrecord_jobgroup_status',
					value: 1
				});
				appJobGroupRecord.save();
			}

		}

		function getDateToday() {
			var date = new Date();
			format.format({
				value: date,
				type: format.Type.DATE,
				timezone: format.Timezone.AUSTRALIA_SYDNEY
			})

			return date;
		}

		return {
			execute: execute
		};
	}
);

/**
 * Is Null or Empty.
 *
 * @param {Object} strVal
 */
function isNullorEmpty(strVal) {
	return (strVal == null || strVal == '' || strVal == 'null' || strVal ==
		undefined || strVal == 'undefined' || strVal == '- None -');
}
