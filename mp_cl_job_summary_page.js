/*
 * Module Description
 * 
 * Author: Ankith Ravindran
 *
 * NSVersion  Date                      Last Modified time                      
 * 1.00       2017-08-03 17:14:00       2017-08-03 17:14:00           
 *
 * Remarks:
 *
 */


var baseURL = 'https://1048144.app.netsuite.com';
if (nlapiGetContext().getEnvironment() == "SANDBOX") {
    baseURL = 'https://1048144-sb3.app.netsuite.com';
}

var dates;

/**
 * [AddStyle description] - Add the CSS to the position specified in the page
 * @param {[type]} cssLink [description]
 * @param {[type]} pos     [description]
 */
function AddStyle(cssLink, pos) {
    var tag = document.getElementsByTagName(pos)[0];
    var addLink = document.createElement('link');
    addLink.setAttribute('type', 'text/css');
    addLink.setAttribute('rel', 'stylesheet');
    addLink.setAttribute('href', cssLink);
    tag.appendChild(addLink);
}

$(window).load(function() {
    // Animate loader off screen
    $(".se-pre-con").fadeOut("slow");;
});

/**
 * [getDate description] - To get the current date
 * @return {string} returns the current date
 */
function getDate() {
    var date = new Date();
    date = nlapiDateToString(date);
    return date;
}

/**
 * [checkMonth description] - To check if the Invoicing Period is selected
 * @return {boolean} true/false - If the Invoicing Period is not selected, it returns false
 */
function checkMonth() {

    var valueMonth = $('.invoicing_month').val();

    if (isNullorEmpty(valueMonth)) {
        alert('Please select the invocing period');
        $('.invoicing_month').focus();
        return false;
    } else {
        return valueMonth;
    }

}

$(document).on("change", ".zee_dropdown", function(e) {

    var zee = $(this).val();
    var valueMonth = checkMonth();

    dates = service_start_end_date(valueMonth);

    nlapiSetFieldValue('start_date', dates[0]);
    nlapiSetFieldValue('end_date', dates[1]);


    var url = baseURL + "/app/site/hosting/scriptlet.nl?script=592&deploy=1&compid=1048144&sorts[customername]=1";
    if (nlapiGetContext().getEnvironment() == "SANDBOX") {
        var url = baseURL + "/app/site/hosting/scriptlet.nl?script=592&deploy=1&sorts[customername]=1";
    }
    url += "&start_date=" + dates[0] + "&end_date=" + dates[1] + "&zee=" + zee + "";

    window.location.href = url;
});


/**
 * [clientPageInit description] - On page initialization, the dynatbale is initialized, the tables is aligned to the center of the page and the dynatable css is added to the head of the page. 
 */
function clientPageInit(type) {

    AddStyle('https://1048144.app.netsuite.com/core/media/media.nl?id=1988776&c=1048144&h=58352d0b4544df20b40f&_xt=.css', 'head');

    // addStyle('https://1048144.app.netsuite.com/core/media/media.nl?id=1988776&c=1048144&h=58352d0b4544df20b40f&mv=j11m86u8&_xt=.css', 'head');

    //JQuery to sort table based on click of header. Attached library  
    jQuery(document).ready(function() {
        jQuery("#stockcount").bind('dynatable:init', function(e, dynatable) {
            dynatable.sorts.clear();
            dynatable.sorts.add('customername', 1); // 1=ASCENDING, -1=DESCENDING
            dynatable.process();
            e.preventDefault();
        }).dynatable();

        jQuery('.edit_customer').closest("tr").addClass("dynatable-complete");
        jQuery('.review_customer').closest("tr").addClass("dynatable-incomplete");

    });
    var mainTable = document.getElementsByClassName("uir-outside-fields-table");
    var mainTable2 = document.getElementsByClassName("uir-inline-tag");


    // for (var i = 0; i < mainTable.length; i++) {
    //     mainTable[i].style.width = "50%";
    // }

    for (var i = 0; i < mainTable2.length; i++) {
        mainTable2[i].style.position = "absolute";
        mainTable2[i].style.left = "10%";
        mainTable2[i].style.width = "80%";
        mainTable2[i].style.top = "500px";
    }

    $('.dynatable-sort-header').css("color", "white");
    $('.invoice_customer').css("font-weight", "bold");

    if (!isNullorEmpty(document.getElementById('tr_submitter'))) {
        document.getElementById('tr_submitter').style.display = 'none';
        $('#submitter').attr('disabled', 'disabled');

    }

    if (!isNullorEmpty(document.getElementById('tdbody_finalise'))) {
        document.getElementById('tdbody_finalise').style = 'background-color: #125ab2 !important;color: white;';
    }

    var result = finalise_date();

    if (result == true) {

    }

}

// When the user scrolls the page, execute myFunction 
window.onscroll = function() {
    myFunction()
};

// Get the header
var header = document.getElementById("stockcount");

// Get the offset position of the navbar
var sticky = header.offsetTop;

// Add the sticky class to the header when you reach its scroll position. Remove "sticky" when you leave the scroll position
function myFunction() {
    if (window.pageYOffset >= sticky) {
        header.classList.add("sticky");
    } else {
        header.classList.remove("sticky");
    }
}

$(document).on('click', '.instruction_button', function(e) {

    var mainTable2 = document.getElementsByClassName("uir-inline-tag");
    for (var i = 0; i < mainTable2.length; i++) {
        mainTable2[i].style.position = "absolute";
        mainTable2[i].style.left = "10%";
        mainTable2[i].style.width = "80%";
        mainTable2[i].style.top = "860px";
    }

    $('.admin_section').css("top", "500px");
    $('.instruction_button').hide();
});

/**
 * [description] - On change of Invoicing MOnth, page reloaded with the cosen month of jobs
 */
$(document).on("change", ".invoicing_month", function(e) {

    var valueMonth = checkMonth();
    var zee = parseInt(nlapiGetFieldValue('zee'));

    if (valueMonth != false) {

        /**
         * [dates description] - To get the start/end date of the month
         * @function service_start_end_date
         * @return {array} returns the start/end date as an array. 0th position is the start date and 1st position is the end date.
         */
        dates = service_start_end_date(valueMonth);

        nlapiSetFieldValue('start_date', dates[0]);
        nlapiSetFieldValue('end_date', dates[1]);

        var url = baseURL + "/app/site/hosting/scriptlet.nl?script=592&deploy=1&compid=1048144&sorts[customername]=1";
        if (nlapiGetContext().getEnvironment() == "SANDBOX") {
            var url = baseURL + "/app/site/hosting/scriptlet.nl?script=592&deploy=1&sorts[customername]=1";
        }

        url += "&start_date=" + dates[0] + "&end_date=" + dates[1] + "&zee=" + zee;

        window.location.href = url;
    } else {

        alert('Please select the invocing period');
        $('.invoicing_month').focus();
        return false;
    }
});

$(document).on('click', '#dailyrevenue', function(){
    var valueMonth = checkMonth();
    dates = service_start_end_date(valueMonth);
    var zee = parseInt(nlapiGetFieldValue('zee'));

    if (valueMonth != false) {
        var url = baseURL + "/app/site/hosting/scriptlet.nl?script=928&deploy=1";
        if (nlapiGetContext().getEnvironment() == "SANDBOX") {
            var url = baseURL + "/app/site/hosting/scriptlet.nl?script=928&deploy=1";
        }

        url += "&start_date=" + dates[0] + "&end_date=" + dates[1] + "&month=" + valueMonth + "&zee=" + zee;
        window.location.href = url;
    } else {
        alert('Please select the invocing period');
        $('.invoicing_month').focus();
        return false;
    }
})

/**
 * [onclick_ContinueReview description] - On click of Start Review / Contine Review the next customer that has the invoiceable field as null is shown.
 * @param {string} internalID Customer internal ID
 */
function onclickContinueReview(internalID, locked, sc_ID) {

    var valueMonth = checkMonth();

    if (valueMonth == false) {
        return false;
    } else {
        if (isNullorEmpty(internalID)) {
            // var searchedJobsExtras = nlapiLoadSearch('customrecord_job', 'customsearch_job_invoicing_summary');
            var searchedJobsExtras = nlapiLoadSearch('customrecord_job', 'customsearch_job_inv_review_exp_amt');

            var filPo = [];
            filPo[filPo.length] = new nlobjSearchFilter('custrecord_job_date_inv_finalised', null, 'isempty');
            filPo[filPo.length] = new nlobjSearchFilter('custrecord_job_date_reviewed', null, 'isempty');
            filPo[filPo.length] = new nlobjSearchFilter('custrecord_job_franchisee', null, 'anyof', nlapiGetFieldValue('zee'));
            if (!isNullorEmpty(nlapiGetFieldValue('start_date')) && !isNullorEmpty(nlapiGetFieldValue('end_date'))) {
                filPo[filPo.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorafter', (nlapiGetFieldValue('start_date')));
                filPo[filPo.length] = new nlobjSearchFilter('custrecord_job_date_scheduled', null, 'onorbefore', (nlapiGetFieldValue('end_date')));
            }

            searchedJobsExtras.addFilters(filPo);

            var resultSetExtras = searchedJobsExtras.runSearch();

            var result = resultSetExtras.getResults(0, 1);
            if (result.length != 0) {
                var internalID = result[0].getValue('internalid', 'CUSTRECORD_JOB_CUSTOMER', 'group');
            }
        }
    }

    var uploadURL = baseURL + nlapiResolveURL('SUITELET', 'customscript_sl_services_main_page', 'customdeploy_sl_services_main_page') + '&customer_id=' + internalID + '&start_date=' + nlapiGetFieldValue('start_date') + '&end_date=' + nlapiGetFieldValue('end_date') + '&locked=' + locked + '&zee=' + parseInt(nlapiGetFieldValue('zee')) + '&sc=' + sc_ID;
    window.open(uploadURL, "_self", "height=750,width=650,modal=yes,alwaysRaised=yes");
}

/**
 * [saveRecord description] - On click of Finalize Button
 */
function saveRecord() {

    var valueMonth = checkMonth();

    if (valueMonth != false) {
        return true;
    }

}

function onclick_Finalise() {
    $('#submitter').prop('disabled', function(i, v) {
        return !v;
    });
    $('#submitter').trigger('click');
}

function finalise_date() {

    var date = new Date();

    var month = date.getMonth(); //Months 0 - 11
    var day = date.getDate();
    var year = date.getFullYear();

    if (day == 1 || day == 2 || day == 3 || day == 4 || day == 5) {
        if (month == 0) {
            month = 11;
            year = year - 1
        } else {
            month = month - 1;
        }
    }
    var firstDay = new Date(year, (month), 1);
    var lastDay = new Date(year, (month + 1), 0);

    var service_range = [];

    service_range[0] = nlapiDateToString(firstDay);
    service_range[1] = nlapiDateToString(lastDay);

    return service_range;
}