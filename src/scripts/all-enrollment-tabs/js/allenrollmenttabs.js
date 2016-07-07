/*global $, require, _, dupCC*/
import _ from 'underscore';
import $ from 'jquery';
import {
  fetchingYearsAttended,
  fetchingEnrollment,
  fetchingAllEnrollments,
  fetchingEnrollmentsMostRecentYear,
  checkingDup,
  fetchingSectionExpression
} from './service';
import Promise from 'bluebird';
import dataTables from 'dataTables';

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
function createTabsContext(yearsAttended, year_id, frn) {
  'use strict';
  var tabsContext = {};
  tabsContext.tabs = [];

  // jsonData is sorted by yearid descending, so use the first element's yearId.
  var mostRecentYear = yearsAttended[0].year_id;

  tabsContext.tabs = yearsAttended.map(year => {
    var tab_class,
      link_href;
    // If the tab's year is the same as the year passed in the gpv, show selected
    // If the tab's year is the most recent year id and there is no gpv passed in, this is the first time visiting this page,
    // so show most recent year with enrollments as active tab.
    if ((year.year_id === mostRecentYear && !year_id) || (year.year_id === year_id)) {
      tab_class = 'selected';
      link_href = '#';
    } else {
      tab_class = year.year_id;
      link_href = '/admin/students/allenrollments.html?frn=' + frn + '&yearid=' + year.year_id;
    }
    return {
      tab_class: tab_class,
      link_href: link_href,
      term: year.term
    };
  });

  if (yearsAttended.length > 1) {
    // Is the user viewing all years? Show "all" tab as selected.
    var tab_class,
      link_href,
      tempObj = {};

    tabsContext.showAllTab = true;
    if (year_id === 'all') {
      tab_class = 'selected';
      link_href = '#';
    } else {
      tab_class = '';
      link_href = '/admin/students/allenrollments.html?frn=' + frn + '&yearid=all';
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
 * Returns enrollments data that reflects gpv params
 * @param psData {Object}
 * @returns {Promise}
 */
function fetchingEnrollments(studentId, yearId) {
  if (psData.yearId === 'all') {
    return fetchingAllEnrollments(studentId);
  } else if (yearId) {
    return fetchingEnrollment(studentId, yearId);
  } else {
    return fetchingEnrollmentsMostRecentYear(studentId);
  }
}

export default function() {
  //Remove extra br tags and feedback alert.
  $('br').remove();
  $('.feedback-alert').remove();
  $('.jqgridx').remove(); //remove old table

  Promise.all([
      fetchingYearsAttended(psData.studentdcid),
      fetchingEnrollments(psData.studentdcid, psData.yearId),
      checkingDup(psData.frn)
    ])
    .then(data => {
      var yearsAttended = data[0].record;
      var enrollmentsData = data[1].record;
      var checkDupData = data[2];

      var tabsContext = createTabsContext(yearsAttended, psData.yearId, psData.frn);

      var template = $('#tabs-template').html();
      var compiledTemplate = _.template(template);
      var renderedTemplate = compiledTemplate({
        context: tabsContext
      })
      $(renderedTemplate).insertBefore('.box-round');
      return data;
    })
    .then(data => {
      var enrollmentsData = data[1].record;
      var fetchingExpressions = enrollmentsData.map(enrollment => {
        return fetchingSectionExpression(enrollment.section_dcid);
      });
      return [data, Promise.all(fetchingExpressions)];
    })
    .all() //process part-data, part-thenable array fulfillment value
    // es6 destructure the arguments within the array
    .then(([data, expressions]) => {
      //Convert expressions from [Object] to Object
      expressions = expressions.reduce((prev, curr) => {
        var currKey = Object.keys(curr)[0];
        var currVal = curr[currKey];
        prev[currKey] = currVal;
        return prev;
      });

      var enrollmentsData = data[1].record;
      var checkDupData = data[2];

      var displayDuplicateMsg = false;
      $('#hidden-content').html(checkDupData);
      displayDuplicateMsg = dupCC;

      var enrollmentsDataWithExpressions = enrollmentsData.map(enrollment => {
        enrollment.expression = expressions[`003${enrollment.section_dcid}`];
        return enrollment;
      });
      var template = $('#table-template').html();
      var context = {
        rows: enrollmentsDataWithExpressions
      };
      var compiledTemplate = _.template(template);
      var renderedTemplate = compiledTemplate(context);

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
    })

}
