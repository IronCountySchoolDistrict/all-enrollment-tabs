/*global $j, require, _, dupCC*/

/**
 * Create the context for the year tabs template.
 * @param jsonData {Object} parsed response data from sqlYearsAttended.html.
 * @param psData {Object} Data provided by powerschool tags, parsed as JSON from the #ps-data div.
 * @returns {Object} Object that contains data needed to render tabs. Matches the form:
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
        // The SQL code that the enrollmentsUri calls will replace a null curyear
    } else {
        enrollmentsUri = enrollmentsPerYear + psData.curStudId;
    }

    return enrollmentsUri;
}

(function () {
    'use strict';

    var psData = $j.parseJSON($j('#ps-data').data().ps);

    //Remove extra br tags.
    $j('br').remove();

    var dataTablesUri = 'https://cdnjs.cloudflare.com/ajax/libs/datatables/1.9.4/jquery.dataTables.min.js';
    require(['underscore', dataTablesUri], function () {
        var yearsAttendedUri = '/admin/students/sqlYearsAttended.html?curstudid=' + psData.curStudId;
        var enrollmentsUri = createEnrollmentsUri(psData);

        // Handle tabs
        $j.get(yearsAttendedUri, function (data) {
            var jsonData = JSON.parse(data);
            jsonData.splice(-1, 1); //Last element will always be empty, so remove it.
            var tabsContext = createTabsContext(jsonData, psData);

            var template = $j('#tabs-template').html();
            var renderedTemplate = _.template(template, {context: tabsContext});
            $j(renderedTemplate).insertBefore('.box-round');
        });

        // Handle table
        $j.get(enrollmentsUri, function (data) {
            $j('jqgridx').remove(); //remove old table

            // get and render new table
            var jsonData = JSON.parse(data);
            jsonData.splice(-1, 1); //Last element will always be empty, so remove it.

            var displayDuplicateMsg = false;
            var checkDuplicateUri = '/admin/students/checkdup.html?frn=' + psData.frn;
            $j.get(checkDuplicateUri, function (data) {
                $j('#hidden-content').html(data);
                displayDuplicateMsg = dupCC;

                var template = $j('#table-template').html();
                var context = {
                    rows: jsonData
                };
                var renderedTemplate = _.template(template, context);

                $j('.box-round').html(renderedTemplate); //insert new table

                $j('#enrollments-table').dataTable({
                    "bPaginate": false,
                    "bFilter": true,
                    "bJQueryUI": true
                });

                if (displayDuplicateMsg) {
                    var duplicatesTemplate = $j($j('#duplicates-template').html());
                    var duplicatesSelect = $j('.fg-toolbar').eq(1);
                    duplicatesTemplate.insertAfter(duplicatesSelect);
                }

                // If a user clicks on the arrow buttons next to the List link in the side menu, and the following line wasn't here,
                // the checkdup.html page would display because it was the last page that was sent to the user.
                // So, send another request to make powerschool understand that it was really allenrollments.html
                // that was last visited, so that should be page displayed when the arrow is clicked.
                $j.get('/admin/students/allenrollments.html?frn=' + psData.frn + '&yearid');
            });
        });
    });
}());