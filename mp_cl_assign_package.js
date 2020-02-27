/*
 * @Author: ankith.ravindran
 * @Date:   2017-08-03 16:58:54
 * @Last Modified by:   mailplusar
 * @Last Modified time: 2017-08-03 17:15:08
 */
var baseURL = 'https://1048144.app.netsuite.com';
if (nlapiGetContext().getEnvironment() == "SANDBOX") {
    baseURL = 'https://1048144-sb3.app.netsuite.com';
}

var service;
var price;
var customer;
var status;

function clientPageInit(type) {

    service = nlapiGetFieldValue('service');
    price = nlapiGetFieldValue('price');
    customer = nlapiGetFieldValue('customer');
    status = nlapiGetFieldValue('group_status');
}

function onclick_reset() {
    window.location.href = window.location.href;
}

function saveRecord() {

    var old_job_group = "";
    var fil = [];
    fil[fil.length] = new nlobjSearchFilter('custrecord_job_service', null, 'is', service);
    fil[fil.length] = new nlobjSearchFilter('custrecord_job_service_price', null, 'is', price);
    fil[fil.length] = new nlobjSearchFilter('custrecord_job_customer', null, 'is', customer);
    if (!isNullorEmpty(nlapiGetFieldValue('group_status'))) {
        fil[fil.length] = new nlobjSearchFilter('custrecord_job_group_status', null, 'is', nlapiGetFieldValue('group_status'));
    }
    if (!isNullorEmpty(nlapiGetFieldValue('start_date')) && !isNullorEmpty(nlapiGetFieldValue('end_date'))) {
        fil[fil.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorafter', (nlapiGetFieldValue('start_date')));
        fil[fil.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorbefore', (nlapiGetFieldValue('end_date')));

    }


    var col = [];
    col[col.length] = new nlobjSearchColumn('internalid');
    col[col.length] = new nlobjSearchColumn('custrecord_job_group');

    var poSearch = nlapiSearchRecord('customrecord_job', null, fil, col);

    for (i = 0; i < poSearch.length; i++) {

        var job_group = poSearch[i].getValue('custrecord_job_group');

        var fil_po = [];
        fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_job_service', null, 'is', service);
        fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_job_service_price', null, 'is', price);
        fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_job_customer', null, 'is', customer);
        if (!isNullorEmpty(nlapiGetFieldValue('group_status'))) {
            fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_job_group_status', null, 'is', nlapiGetFieldValue('group_status'));
        }
        if (!isNullorEmpty(job_group)) {
            fil_po[fil_po.length] = new nlobjSearchFilter('custrecord_job_group', null, 'is', job_group);
        }

        var col_po = [];
        col_po[col_po.length] = new nlobjSearchColumn('internalid');

        if (!isNullorEmpty(job_group)) {
            if (old_job_group != job_group) {

                // alert(i)
                var option = document.getElementById('package_assigned[' + i + ']');
                var default_option = document.getElementById('default_value[' + i + ']');
                var default_value = default_option.value;

                var value = option.value;


                var poResult = nlapiSearchRecord('customrecord_job', null, fil_po, col_po);

                if (value != default_value) {
                    if (value == 0) {
                        for (y = 0; y < poResult.length; y++) {
                            var job_record = nlapiLoadRecord('customrecord_job', poResult[y].getValue('internalid'));

                            job_record.setFieldValue('custrecord_job_service_package', null);
                            // job_record.setFieldValue('custrecord_job_date_reviewed', getDate());

                            nlapiSubmitRecord(job_record);
                        }
                    } else {

                        for (y = 0; y < poResult.length; y++) {
                            var job_record = nlapiLoadRecord('customrecord_job', poResult[y].getValue('internalid'));

                            job_record.setFieldValue('custrecord_job_service_package', value);
                            // job_record.setFieldValue('custrecord_job_date_reviewed', getDate());

                            nlapiSubmitRecord(job_record);
                        }
                    }
                }
            }

            old_job_group = job_group;
        } else {
            var option = document.getElementById('package_assigned[' + i + ']');

            var value = option.value;


            var poResult = nlapiSearchRecord('customrecord_job', null, fil_po, col_po);
            if (value == 0) {
                for (y = 0; y < poResult.length; y++) {
                    var job_record = nlapiLoadRecord('customrecord_job', poResult[y].getValue('internalid'));

                    job_record.setFieldValue('custrecord_job_service_package', null);
                    // job_record.setFieldValue('custrecord_job_date_reviewed', getDate());

                    nlapiSubmitRecord(job_record);
                }
            } else {
                for (y = 0; y < poResult.length; y++) {
                    var job_record = nlapiLoadRecord('customrecord_job', poResult[y].getValue('internalid'));

                    job_record.setFieldValue('custrecord_job_service_package', value);
                    // job_record.setFieldValue('custrecord_job_date_reviewed', getDate());

                    nlapiSubmitRecord(job_record);
                }
            }
        }
    }

    return true;

    // window.opener.submit_package();
    // window.close();

}

function onclick_Back() {

    var upload_url = baseURL + nlapiResolveURL('SUITELET', 'customscript_sl_services_main_page', 'customdeploy_sl_services_main_page') + '&customer_id=' + nlapiGetFieldValue('customer') + '&start_date=' + nlapiGetFieldValue('start_date') + '&end_date=' + nlapiGetFieldValue('end_date');
    window.open(upload_url, "_self", "height=750,width=650,modal=yes,alwaysRaised=yes");

    // window.opener.submit_package();
    // window.close();

}

function getDate() {
    var date = new Date();
    // if (date.getHours() > 6)
    // {
    //     date = nlapiAddDays(date, 1);
    // }
    date = nlapiDateToString(date);

    return date;
}