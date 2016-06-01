export const fetchingYearsAttended = student_dcid => fetch('/ws/schema/query/org.irondistrict.all-enroll.years.attended', {
    credentials: 'include',
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      student_dcid: student_dcid
    })
  })
  .then(response => response.json());

export const fetchingEnrollment = (student_dcid, year_id) => fetch('/ws/schema/query/org.irondistrict.all-enroll.tabs.year', {
    credentials: 'include',
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      student_dcid: student_dcid,
      year_id: year_id
    })
  })
  .then(response => response.json());

export const fetchingAllEnrollments = student_dcid => fetch('/ws/schema/query/org.irondistrict.all-enroll.tabs.all', {
    credentials: 'include',
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      student_dcid: student_dcid
    })
  })
  .then(response => response.json());

export const fetchingEnrollmentsMostRecentYear = student_dcid => fetch('/ws/schema/query/org.irondistrict.all-enroll.tabs.most-recent-year', {
    credentials: 'include',
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      student_dcid: student_dcid
    })
  })
  .then(response => response.json());

export const checkingDup = student_frn => fetch(`/admin/students/checkdup.html?frn=${student_frn}`, {
    credentials: 'include'
  })
  .then(response => response.text());

export const fetchingSectionExpression = section_dcid => fetch(`/admin/students/sqlSectionExpr.html?relsectionfrn=003${section_dcid}`, {
    credentials: 'include'
  })
  .then(response => response.json())
