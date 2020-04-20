var baseURL = 'https://1048144.app.netsuite.com';
if (nlapiGetContext().getEnvironment() == "SANDBOX") {
    baseURL = 'https://1048144-sb3.app.netsuite.com';
}

$(document).ready(function() {
    $('#daily_revenue').DataTable({
        "scrollX": true
    })
});


function pageInit() {
    //var mainTable = document.getElementsByClassName("uir-outside-fields-table");
    var mainTable2 = document.getElementsByClassName("uir-inline-tag");

    var operator_id_string = nlapiGetFieldValue('operator_string');
    var operator_id_array = operator_id_string.split(',');
    console.log('operator_id_array', operator_id_array);

    for (var i = 0; i < mainTable2.length; i++) {
        mainTable2[i].style.position = "absolute";
        //mainTable2[i].style.left = "10%";
        //mainTable2[i].style.right = "10%";
        mainTable2[i].style.maxWidth = "100%";
        mainTable2[i].style.top = "350px";
        if (operator_id_array.length <= 2) {
            mainTable2[i].style.left = "25%";

        }
    }


    for (i = 0; i < operator_id_array.length; i++) {
        var total = getTotal(operator_id_array[i]);
        console.log('total', total);
        $('.total_service_count_' + operator_id_array[i] + '').text(total[0]);
        $('.total_extra_count_' + operator_id_array[i] + '').text(total[1]);
        $('.total_revenue_' + operator_id_array[i] + '').val(total[2]);
        $('.total_distribution_' + operator_id_array[i] + '').val(total[3]);
    }

    $('th.op, td.cell').css({
        "width": "350px",
        "display": "inline-block"
    });
}

function onclick_back() {
    var zee = parseInt(nlapiGetFieldValue('zee'));
    var start_date = nlapiGetFieldValue('start_date');
    var end_date = nlapiGetFieldValue('end_date');

    console.log('zee', zee);
    console.log('start_date', start_date);
    console.log('end_date', end_date);

    var url = baseURL + "/app/site/hosting/scriptlet.nl?script=592&deploy=1";
    url += "&start_date=" + start_date + "&end_date=" + end_date + "&zee=" + zee;
    window.location.href = url;
}

function getTotal(operator_name) {
    var service_count_total = 0;
    var extra_count_total = 0;
    var revenue_total = 0.00;
    var distribution_total = 0.00;
    console.log('$(.service_count_+ operator_name +)', $('.service_count_' + operator_name + ''));
    $('.service_count_' + operator_name + '').each(function() {
        console.log('$(this).attr(value)', $(this).attr('value'));
        service_count_total += parseFloat($(this).attr('value'));
    });
    $('.extra_count_' + operator_name + '').each(function() {
        console.log('$(this).attr(value)', $(this).attr('value'));
        extra_count_total += parseFloat($(this).attr('value'));
    });
    $('.revenue_' + operator_name + '').each(function() {
        console.log('$(this).attr(value)', $(this).attr('value'));
        revenue_total += parseFloat($(this).attr('value'));
    });
    $('.distribution_' + operator_name + '').each(function() {
        console.log('$(this).attr(value)', $(this).attr('value'));
        distribution_total += parseFloat($(this).attr('value'));
    });
    return [parseInt(service_count_total), parseInt(extra_count_total), revenue_total.toFixed(2), distribution_total.toFixed(2)]
}