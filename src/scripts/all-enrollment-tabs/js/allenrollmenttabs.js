/*global $, require, _, dupCC*/

/**
 * Create the context for the year tabs template.
 * @param jsonData {Object} parsed response data from sqlYearsAttended.html.
 * @param psData {Object} Data provided by powerschool tags, parsed as JSON from the #ps-data div.
 * @returns {Object} Object that contains data needed to render tabs.
 *  {
 *      "showAllTab": {boolean} - should the Show All tab be displayed?
 *      "tabs": {Array} - Array of Objects that contain the link_href, tab_class, term and yearId properties.
 *      "allTab": {Object}
    }
 */
function createTabsContext(jsonData, psData) {
    'use strict';
    var tabsContext = {};
    tabsContext.tabs = [];

    // jsonData is sorted by yearid descending, so use the first element's yearId.
    var mostRecentYear = jsonData[0].yearId;

    _.each(jsonData, function (elem) {
        var tab_class,
            link_href;
        // If the tab's year is the same as the year passed in the gpv, show selected
        // If the tab's year is the most recent year id and there is no gpv passed in, this is the first time visiting this page,
        // so show most recent year with enrollments as active tab.
        if ((elem.yearId === mostRecentYear && !psData.yearId) || (elem.yearId.toString() === psData.yearId)) {
            tab_class = 'selected';
            link_href = '#';
        } else {
            tab_class = elem.yearId;
            link_href = '/admin/students/allenrollments.html?frn=' + psData.frn + '&yearid=' + elem.yearId;
        }
        elem.tab_class = tab_class;
        elem.link_href = link_href;
        tabsContext.tabs.push(elem);
    });

    if (jsonData.length > 1) {
        // Is the user viewing all years? Show "all" tab as selected.
        var tab_class,
            link_href,
            tempObj = {};

        tabsContext.showAllTab = true;
        if (psData.yearId === 'all') {
            tab_class = 'selected';
            link_href = '#';
        } else {
            tab_class = '';
            link_href = '/admin/students/allenrollments.html?frn=' + psData.frn + '&yearid=' + 'all';
        }

        tempObj.tab_class = tab_class;
        tempObj.link_href = link_href;
        tabsContext.allTab = tempObj;
    } else {
        tabsContext.showAllTab = false;
    }
    return tabsContext;
}

/**
 * Create the uri that should be used to get enrollments data.
 * @param psData {Object} Data provided by powerschool tags, parsed as JSON from the #ps-data div.
 */
function createEnrollmentsUri(psData) {
    'use strict';
    var enrollmentsUri;

    // If year gpv is set to all, show all enrollments for every year that the student is enrolled.
    var enrollmentsPerYear = '/admin/students/sqlEnrollmentsPerYear.html?curstudid=';
    var allEnrollments = '/admin/students/sqlAllEnrollments.html?curstudid=';
    if (psData.yearId === 'all') {
        enrollmentsUri = allEnrollments + psData.curStudId;

        // If the yearid gpv isn't blank (and not set to all), display that year.
    } else if (psData.yearId) {
        enrollmentsUri = enrollmentsPerYear + psData.curStudId + '&yearid=' + psData.yearId;

        // Else, no yearid gpv was passed in, so show the enrollments for the most recent year with enrollments.
        // The SQL code that the enrollmentsUri calls will replace a  curyear
    } else {
        enrollmentsUri = enrollmentsPerYear + psData.curStudId;
    }

    return enrollmentsUri;
}

(function ($) {
    'use strict';

    var psData = $.parseJSON($('#ps-data').data().ps);

    //Remove extra br tags and feedback alert.
    $('br').remove();
    $('.feedback-alert').remove();

    var dataTablesUri = 'https://cdnjs.cloudflare.com/ajax/libs/datatables/1.9.4/jquery.dataTables.min.js';
    require(['underscore', dataTablesUri], function () {
        var yearsAttendedUri = '/admin/students/sqlYearsAttended.html?curstudid=' + psData.curStudId;
        var enrollmentsUri = createEnrollmentsUri(psData);

        // Handle tabs
        $.get(yearsAttendedUri, function (data) {
            data.splice(-1, 1); //Last element will always be empty, so remove it.
            var tabsContext = createTabsContext(data, psData);

            var template = $('#tabs-template').html();
            var compiledTemplate = _.template(template);
            var renderedTemplate =  compiledTemplate({context: tabsContext})
            $(renderedTemplate).insertBefore('.box-round');
        }, 'json');

        // Handle table
        $.get(enrollmentsUri, function (enrollmentsData) {
            $('.jqgridx').remove(); //remove old table

            // get and render new table
            enrollmentsData.splice(-1, 1); //Last element will always be empty, so remove it.

            var displayDuplicateMsg = false;
            var checkDuplicateUri = '/admin/students/checkdup.html?frn=' + psData.frn;
            $.get(checkDuplicateUri, function (checkDupData) {
                $('#hidden-content').html(checkDupData);
                displayDuplicateMsg = dupCC;
                var deferredAjax = [];
                _.each(enrollmentsData, function(elem) {
                    var ajaxCall = $.get('/admin/students/sqlSectionExpr.html?relsectionfrn=003' + elem.secDcid, function (expression) {
                        elem.expression = expression;
                    });
                    deferredAjax.push(ajaxCall);
                });

                $.when.apply($, deferredAjax).done(function (expression, status, xhr) {
                    var template = $('#table-template').html();
                    var context = {
                        rows: enrollmentsData
                    };
                    var compiledTemplate = _.template(template);
                    var renderedTemplate =  compiledTemplate(context);

                    $('.box-round').html(renderedTemplate); //insert new table

                    $('#enrollments-table').dataTable({
                        "bPaginate": false,
                        "bFilter": true,
                        "bJQueryUI": true
                    });

                    if (displayDuplicateMsg) {
                        var duplicatesTemplate = $($('#duplicates-template').html());
                        var duplicatesSelect = $('.fg-toolbar').eq(1);
                        duplicatesTemplate.insertAfter(duplicatesSelect);
                    }

                    // If a user clicks on the arrow buttons next to the List link in the side menu, and the following line wasn't here,
                    // the checkdup.html page would display because it was the last page that was sent to the user.
                    // So, send another request to make powerschool understand that it was really allenrollments.html
                    // that was last visited, so that should be page displayed when the arrow is clicked.
                    $.get('/admin/students/allenrollments.html?frn=' + psData.frn + '&yearid');
                });
            });
        }, 'json');
    });
}($));
