// ─── Entry Point ─────────────────────────────────────────────────────────────

function doGet(e) {
  var meetingId = e && e.parameter && e.parameter.meeting;

  if (meetingId) {
    var file = _getMeetingFile(meetingId);
    var tpl = HtmlService.createTemplateFromFile(file);
    tpl.execUrl = ScriptApp.getService().getUrl();
    return tpl.evaluate()
      .setTitle('EPB Team Meeting')
      .setSandboxMode(HtmlService.SandboxMode.IFRAME)
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
  }

  var tmpl = HtmlService.createTemplateFromFile('index');
  var props = PropertiesService.getScriptProperties();
  tmpl.isAdmin = _isAdminUser();
  tmpl.execUrl = ScriptApp.getService().getUrl();
  tmpl.teamCardData = props.getProperty('TEAM_CARD_DATA') || '{}';
  tmpl.petCardData  = props.getProperty('PET_CARD_DATA')  || '{}';
  tmpl.calendarData  = JSON.stringify(getCalendarData()).replace(/<\/script/gi, '<\\/script');
  tmpl.tasksData     = getTasksData();
  var _sheetId = props.getProperty('TEAM_SHEET_ID') || props.getProperty('TASKS_SHEET_ID');
  tmpl.tasksSheetUrl = _sheetId ? 'https://docs.google.com/spreadsheets/d/' + _sheetId : '';
  return tmpl.evaluate()
    .setTitle('EPB Team Site')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}


// ─── Team Meetings ────────────────────────────────────────────────────────────

var MEETINGS = [
  {
    id: 'july-2026',
    title: 'July Team Meeting',
    date: 'July 2026',
    description: 'AMA on org announcement, dashboard presentations by Jonathan Hu & Jonathan Lum.',
    file: 'meeting-july-2026'
  },
  {
    id: 'june-2026',
    title: 'June Team Meeting',
    date: 'June 2026',
    description: 'Growth story, 4 strategic pillars, team wins, and 2027 targets.',
    file: 'meeting-june-2026'
  },
  {
    id: 'april-2026',
    title: 'April 2026 Team Meeting',
    date: 'April 2026',
    description: 'AI Innovation & 45-Minute Breakout Challenge',
    file: 'meeting-april-2026'
  }
];

function _getMeetingFile(meetingId) {
  if (!meetingId || meetingId === 'current') return MEETINGS[0].file;
  for (var i = 0; i < MEETINGS.length; i++) {
    if (MEETINGS[i].id === meetingId) return MEETINGS[i].file;
  }
  return MEETINGS[0].file;
}

function getMeetingsManifest() {
  return MEETINGS;
}

function saveNoteToSheet(section, noteText) {
  var props = PropertiesService.getUserProperties();
  var sheetId = props.getProperty('MEETING_NOTES_SHEET_ID');
  var doc, sheet;

  if (!sheetId) {
    doc = SpreadsheetApp.create('S&P Leadership Team - Meeting Notes & Actions');
    sheet = doc.getActiveSheet();
    sheet.appendRow(['Timestamp', 'Agenda Section', 'Action Item / Note']);
    sheet.getRange('A1:C1').setFontWeight('bold').setBackground('#4b286d').setFontColor('white');
    sheet.setColumnWidth(1, 150);
    sheet.setColumnWidth(2, 200);
    sheet.setColumnWidth(3, 500);
    props.setProperty('MEETING_NOTES_SHEET_ID', doc.getId());
  } else {
    try {
      doc = SpreadsheetApp.openById(sheetId);
      sheet = doc.getActiveSheet();
    } catch (ex) {
      doc = SpreadsheetApp.create('S&P Leadership Team - Meeting Notes & Actions');
      sheet = doc.getActiveSheet();
      sheet.appendRow(['Timestamp', 'Agenda Section', 'Action Item / Note']);
      sheet.getRange('A1:C1').setFontWeight('bold').setBackground('#4b286d').setFontColor('white');
      props.setProperty('MEETING_NOTES_SHEET_ID', doc.getId());
    }
  }

  sheet.appendRow([new Date(), section, noteText]);
  return doc.getUrl();
}


// ─── Team Site Input Form ─────────────────────────────────────────────────────
// Run this function once from the Apps Script editor to generate the Google Form.
// The edit URL and shareable respondent URL are logged to the Execution Log.

function createTeamInputForm() {
  var form = FormApp.create('EPB S&P Team — Tell Us About You (& Your Pet!)');

  form.setDescription(
    'Help us fill out the EPB Team Site! This form has two parts:\n\n' +
    '1. Your Baseball Card — a few fun facts that appear when teammates click your card on the roster.\n' +
    '2. Furry Friends (optional) — if you have a pet you\'d like featured on the site, we\'d love to include them!\n\n' +
    'Your answers will be added to the site by Derek. Thanks for playing along! ⚾'
  );

  form.setCollectEmail(true);
  form.setShowLinkToRespondAgain(false);
  form.setConfirmationMessage('Thanks! Your answers have been received and will be added to the EPB Team Site shortly.');

  // ── Section 1: Baseball Card ──────────────────────────────────────────────

  form.addSectionHeaderItem()
    .setTitle('⚾ Your Baseball Card')
    .setHelpText('These stats show up when teammates click your card on the Team Roster.');

  form.addTextItem()
    .setTitle('Your Name')
    .setHelpText('First and last name as it appears on your roster card (e.g., Derek Johnson).')
    .setRequired(true);

  form.addTextItem()
    .setTitle('Walk-Up Song')
    .setHelpText('The song that plays as you stride to the plate. (e.g., Minuet in G)')
    .setRequired(true);

  form.addTextItem()
    .setTitle('GOAT Vacation Spot')
    .setHelpText('Your greatest-of-all-time destination — visited or on the bucket list. (e.g., Laos)')
    .setRequired(true);

  form.addParagraphTextItem()
    .setTitle('Fun Fact')
    .setHelpText('Something surprising, obscure, or delightfully random about yourself. (e.g., 1993 Mosquito Provincial Champion)')
    .setRequired(true);

  form.addTextItem()
    .setTitle('Pre-Game Meal')
    .setHelpText('What do you eat before a big day? (e.g., Pizza)')
    .setRequired(true);

  form.addTextItem()
    .setTitle('Home Turf')
    .setHelpText('The city or neighbourhood you call home. (e.g., Vancouver BC)')
    .setRequired(true);

  form.addTextItem()
    .setTitle('Rookie Card Year')
    .setHelpText('The year you joined TELUS. (e.g., 2012)')
    .setRequired(true);

  // ── Section 2: Furry Friends (optional) ──────────────────────────────────

  form.addPageBreakItem()
    .setTitle('🐾 Furry Friends (Optional)')
    .setHelpText(
      'Got a pet? We\'d love to add them to the Furry Friends section of the team site!\n\n' +
      'Leave everything below blank if you\'d rather skip this part — no pressure.\n\n' +
      'For reference, here\'s how Ruff\'s profile reads:\n\n' +
      '"Ruff joined the EPB S&P team on September 8, 2025 and hasn\'t left Derek\'s side since. ' +
      'He specialises in morale-boosting zoomies, strategic napping, and unconditional positive regard. ' +
      'Currently negotiating for a treat allowance in the next budget cycle."'
    );

  form.addTextItem()
    .setTitle('Pet Name')
    .setHelpText('What\'s your pet\'s name? (e.g., Ruff)')
    .setRequired(false);

  form.addTextItem()
    .setTitle('Playful Title')
    .setHelpText('Give your pet a fun corporate-sounding job title. (e.g., Chief Barketing Officer)')
    .setRequired(false);

  form.addParagraphTextItem()
    .setTitle('Pet Bio')
    .setHelpText(
      'Write 2–3 sentences in the style of the Ruff example above — when they joined the team, ' +
      'what they "specialise" in, and a funny current status or ambition.'
    )
    .setRequired(false);

  form.addTextItem()
    .setTitle('Your Name (for the "Owner" field)')
    .setHelpText('Just your first name, so we can attribute the pet card correctly. (e.g., Derek)')
    .setRequired(false);

  // Photo upload requires Drive scope and can only be enabled on domain-restricted forms.
  // Instead, direct respondents to send the photo separately.
  form.addParagraphTextItem()
    .setTitle('Pet Photo')
    .setHelpText(
      'Google Forms doesn\'t support photo uploads here. ' +
      'Please send a clear photo of your pet directly to Derek via Teams or email after submitting this form.'
    )
    .setRequired(false);

  // Link responses to a new Sheet and store its ID for syncTeamData()
  var responseSheet = SpreadsheetApp.create('EPB Team Site — Input Form Responses');
  form.setDestination(FormApp.DestinationType.SPREADSHEET, responseSheet.getId());
  PropertiesService.getScriptProperties().setProperty('FORM_RESPONSE_SHEET_ID', responseSheet.getId());

  Logger.log('Form created successfully.');
  Logger.log('Edit URL:       ' + form.getEditUrl());
  Logger.log('Respondent URL: ' + form.getPublishedUrl());
}


// ─── Sync Survey Responses → Team Card Data ───────────────────────────────────
// Run this function from the Apps Script editor after responses come in.
// It reads the Form response Sheet, builds a name-keyed lookup of baseball
// card stats, and stores it in Script Properties so doGet can inject it into
// the page. The site picks up the latest data on next load — no HTML editing.
//
// Expected response Sheet columns (auto-created by the Form):
//   A: Timestamp  B: Email  C: Your Name  D: Walk-Up Song  E: GOAT Vacation Spot
//   F: Fun Fact   G: Pre-Game Meal  H: Home Turf  I: Rookie Card Year

function syncTeamData() {
  var sheetId = PropertiesService.getScriptProperties().getProperty('FORM_RESPONSE_SHEET_ID');
  if (!sheetId) {
    Logger.log('ERROR: FORM_RESPONSE_SHEET_ID not set. Run createTeamInputForm() first.');
    return;
  }

  var ss    = SpreadsheetApp.openById(sheetId);
  var sheet = ss.getSheets()[0]; // Form responses always land on the first sheet
  var rows  = sheet.getDataRange().getValues();

  if (rows.length < 2) {
    Logger.log('No responses yet.');
    return;
  }

  // Normalise headers to find column positions by name (robust to column reordering)
  var headers = rows[0].map(function(h) { return String(h).trim().toLowerCase(); });
  function col(name) { return headers.indexOf(name); }

  var iName      = col('your name');
  var iSong      = col('walk-up song');
  var iGateway   = col('goat vacation spot');
  var iReport    = col('fun fact');
  var iMeal      = col('pre-game meal');
  var iTurf      = col('home turf');
  var iRookie    = col('rookie card year');
  var iPetName   = col('pet name');
  var iPetRole   = col('playful title');
  var iPetBio    = col('pet bio');
  var iPetOwner  = col('your name (for the "owner" field)');

  if (iName === -1) {
    Logger.log('ERROR: Could not find "Your Name" column. Check the response sheet headers.');
    return;
  }

  // Build maps keyed by normalised name → data.
  // If a person submitted multiple times, the latest row wins.
  var cardData = {};
  var petData  = {};

  for (var i = 1; i < rows.length; i++) {
    var row  = rows[i];
    var name = String(row[iName]).trim();
    if (!name) continue;

    cardData[name.toLowerCase()] = {
      name:    name,
      song:    iSong    >= 0 ? String(row[iSong]).trim()    : '',
      gateway: iGateway >= 0 ? String(row[iGateway]).trim() : '',
      report:  iReport  >= 0 ? String(row[iReport]).trim()  : '',
      meal:    iMeal    >= 0 ? String(row[iMeal]).trim()    : '',
      turf:    iTurf    >= 0 ? String(row[iTurf]).trim()    : '',
      rookie:  iRookie  >= 0 ? String(row[iRookie]).trim()  : ''
    };

    // Only capture pet data if the respondent named their pet
    var petName = iPetName >= 0 ? String(row[iPetName]).trim() : '';
    if (petName) {
      var ownerFirst = iPetOwner >= 0 ? String(row[iPetOwner]).trim() : name.split(' ')[0];
      petData[ownerFirst.toLowerCase()] = {
        petName: petName,
        role:    iPetRole >= 0 ? String(row[iPetRole]).trim() : '',
        bio:     iPetBio  >= 0 ? String(row[iPetBio]).trim()  : '',
        owner:   ownerFirst
      };
    }
  }

  var props = PropertiesService.getScriptProperties();
  props.setProperty('TEAM_CARD_DATA', JSON.stringify(cardData));
  props.setProperty('PET_CARD_DATA',  JSON.stringify(petData));

  Logger.log('Sync complete. ' + Object.keys(cardData).length + ' team member(s) updated:');
  Object.keys(cardData).forEach(function(k) { Logger.log('  • ' + cardData[k].name); });
  if (Object.keys(petData).length) {
    Logger.log(Object.keys(petData).length + ' pet(s) updated:');
    Object.keys(petData).forEach(function(k) { Logger.log('  • ' + petData[k].petName + ' (Owner: ' + petData[k].owner + ')'); });
  }
}


// ─── Calendar Data ────────────────────────────────────────────────────────────
// Merges events from Derek's Google Calendar (next 90 days) with rows from an
// optional CALENDAR_EVENTS_SHEET_ID Sheet (Date | Title | Type | Owner | Notes).
// Set CALENDAR_EVENTS_SHEET_ID in Script Properties to enable the Sheet source.

// ─── Calendar Data ────────────────────────────────────────────────────────────
// Reads from the "Team Calendar" tab of TEAM_SHEET_ID (falls back to the
// first sheet of CALENDAR_EVENTS_SHEET_ID for backward compat).
// Populate the sheet by running syncTeamCalendar() from the Apps Script editor,
// or add rows manually — the Source column ("auto" / blank) is ignored here.

function getCalendarData() {
  var cache    = CacheService.getScriptCache();
  var cacheKey = 'cal_data_v7';
  try {
    var hit = cache.get(cacheKey);
    if (hit) return JSON.parse(hit);
  } catch (e) {}

  var events   = [];
  var calError = null;
  var now      = new Date();
  var tz       = Session.getScriptTimeZone();
  var props    = PropertiesService.getScriptProperties();
  var sheetId  = props.getProperty('TEAM_SHEET_ID') || props.getProperty('CALENDAR_EVENTS_SHEET_ID');

  if (!sheetId) {
    calError = 'No TEAM_SHEET_ID set. Run setupTeamSheet() then syncTeamCalendar() from the Apps Script editor.';
  } else {
    try {
      var ss  = SpreadsheetApp.openById(sheetId);
      var tab = ss.getSheetByName('Team Calendar') || ss.getSheets()[0];
      var rows = tab.getDataRange().getValues();
      if (rows.length > 1) {
        var headers = rows[0].map(function(h) { return String(h).trim().toLowerCase(); });
        var iDate   = headers.indexOf('date');
        var iTitle  = headers.indexOf('title');
        var iType   = headers.indexOf('type');
        var iOwner  = headers.indexOf('owner');
        var iNotes  = headers.indexOf('notes');
        for (var i = 1; i < rows.length; i++) {
          var row = rows[i];
          var raw = iDate >= 0 ? row[iDate] : '';
          if (!raw) continue;
          var d = raw instanceof Date ? raw : new Date(raw);
          if (isNaN(d.getTime())) continue;
          if (d < now) continue;
          events.push({
            date:      Utilities.formatDate(d, tz, 'yyyy-MM-dd'),
            dateLabel: Utilities.formatDate(d, tz, 'MMM d'),
            title:     iTitle >= 0 ? String(row[iTitle]).trim() : '',
            type:      iType  >= 0 ? String(row[iType]).trim()  : 'Team Calendar',
            owner:     iOwner >= 0 ? String(row[iOwner]).trim() : '',
            notes:     iNotes >= 0 ? String(row[iNotes]).trim() : ''
          });
        }
        events.sort(function(a, b) { return a.date < b.date ? -1 : a.date > b.date ? 1 : 0; });
      }
      Logger.log('getCalendarData: ' + events.length + ' upcoming events from sheet');
    } catch (ex) {
      Logger.log('getCalendarData sheet error: ' + ex);
      calError = String(ex);
    }
  }

  var resultObj = { events: events, calError: calError };
  try { cache.put(cacheKey, JSON.stringify(resultObj), 900); } catch (e) {}
  return resultObj;
}


// ─── Sync Team Calendar to Sheet ─────────────────────────────────────────────
// Reads Peacock-colored (color '7') events from derek.johnson@telus.com and
// writes them as "auto" rows in the "Team Calendar" tab of TEAM_SHEET_ID.
// Manually-added rows (Source column blank or not "auto") are preserved.
//
// Run this from the Apps Script editor (▶ Run > syncTeamCalendar) whenever
// you want to refresh, or set a daily time-based trigger via:
//   Triggers > Add Trigger > syncTeamCalendar > Time-driven > Day timer.

function syncTeamCalendar() {
  var sheetId = PropertiesService.getScriptProperties().getProperty('TEAM_SHEET_ID');
  if (!sheetId) { Logger.log('syncTeamCalendar: TEAM_SHEET_ID not set — run setupTeamSheet() first.'); return; }

  var ss  = SpreadsheetApp.openById(sheetId);
  var tab = ss.getSheetByName('Team Calendar');
  if (!tab) { Logger.log('syncTeamCalendar: "Team Calendar" tab not found — run setupTeamSheet() first.'); return; }

  var now = new Date();
  var end = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
  var tz  = Session.getScriptTimeZone();

  // Preserve manually-added rows (Source column blank or not "auto")
  var existing = tab.getDataRange().getValues();
  var headers  = existing[0];
  var srcIdx   = headers.map(function(h) { return String(h).trim().toLowerCase(); }).indexOf('source');
  var manualRows = existing.slice(1).filter(function(row) {
    var src = srcIdx >= 0 ? String(row[srcIdx]).trim().toLowerCase() : '';
    return src !== 'auto';
  });

  // Fetch Peacock ('7') events from Derek's primary calendar
  var autoRows = [];
  try {
    var cal = CalendarApp.getCalendarById('derek.johnson@telus.com');
    if (!cal) throw new Error('Calendar derek.johnson@telus.com not found.');
    cal.getEvents(now, end).forEach(function(ev) {
      if (ev.getColor() !== '7') return;
      var start = ev.getStartTime();
      autoRows.push([
        Utilities.formatDate(start, tz, 'yyyy-MM-dd'),
        ev.getTitle(),
        'Team Calendar',
        ((ev.getCreators() || [])[0] || ''),
        (ev.getDescription() || '').replace(/<[^>]*>/g, '').trim(),
        'auto'
      ]);
    });
    autoRows.sort(function(a, b) { return a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0; });
  } catch (ex) {
    Logger.log('syncTeamCalendar calendar error: ' + ex);
  }

  // Rewrite sheet: header + auto rows + manual rows
  var allRows = [headers].concat(autoRows).concat(manualRows);
  tab.clearContents();
  tab.getRange(1, 1, allRows.length, headers.length).setValues(allRows);

  // Invalidate cache so the next page load gets fresh data
  try { CacheService.getScriptCache().remove('cal_data_v7'); } catch (e) {}

  Logger.log('syncTeamCalendar: wrote ' + autoRows.length + ' auto + ' + manualRows.length + ' manual rows.');
}


// ─── One-time Sheet Setup ─────────────────────────────────────────────────────
// Creates a new "CPB Team Site Data" spreadsheet with "Team Calendar" and
// "Tasks" tabs, saves the ID as TEAM_SHEET_ID, and migrates any existing
// tasks from TASKS_SHEET_ID.  Run once from the Apps Script editor.

function setupTeamSheet() {
  var props = PropertiesService.getScriptProperties();

  // If already set, report and bail
  var existing = props.getProperty('TEAM_SHEET_ID');
  if (existing) {
    Logger.log('setupTeamSheet: TEAM_SHEET_ID already set → ' +
      'https://docs.google.com/spreadsheets/d/' + existing);
    return;
  }

  // Create the spreadsheet
  var ss = SpreadsheetApp.create('CPB Team Site Data');
  var id = ss.getId();

  // ── Team Calendar tab ──
  var calTab = ss.getActiveSheet().setName('Team Calendar');
  calTab.getRange(1, 1, 1, 6).setValues([['Date', 'Title', 'Type', 'Owner', 'Notes', 'Source']]);
  calTab.getRange(1, 1, 1, 6).setFontWeight('bold');
  calTab.setFrozenRows(1);

  // ── Tasks tab ──
  var tasksTab = ss.insertSheet('Tasks');
  tasksTab.getRange(1, 1, 1, 6).setValues([['Task', 'Owner', 'Due Date', 'Priority', 'Status', 'Notes']]);
  tasksTab.getRange(1, 1, 1, 6).setFontWeight('bold');
  tasksTab.setFrozenRows(1);

  // Migrate existing tasks if TASKS_SHEET_ID was set
  var oldTasksId = props.getProperty('TASKS_SHEET_ID');
  var migratedRows = 0;
  if (oldTasksId) {
    try {
      var oldRows = SpreadsheetApp.openById(oldTasksId).getSheets()[0].getDataRange().getValues();
      if (oldRows.length > 1) {
        var dataRows = oldRows.slice(1).filter(function(r) { return String(r[0]).trim(); });
        if (dataRows.length) {
          tasksTab.getRange(2, 1, dataRows.length, dataRows[0].length).setValues(dataRows);
          migratedRows = dataRows.length;
        }
      }
    } catch (ex) {
      Logger.log('setupTeamSheet: could not migrate tasks — ' + ex);
    }
  }

  // Save the new sheet ID and clear the old separate property
  props.setProperty('TEAM_SHEET_ID', id);
  if (oldTasksId) props.deleteProperty('TASKS_SHEET_ID');

  var url = 'https://docs.google.com/spreadsheets/d/' + id;
  Logger.log('setupTeamSheet: created sheet → ' + url);
  Logger.log('setupTeamSheet: migrated ' + migratedRows + ' task rows from previous sheet.');
  Logger.log('Next steps: 1) run syncTeamCalendar()  2) color team events Peacock in Google Calendar  3) redeploy the web app.');
}


// ─── Tasks Data ───────────────────────────────────────────────────────────────
// Reads from the "Tasks" tab of TEAM_SHEET_ID (preferred) or the first sheet
// of TASKS_SHEET_ID (legacy).  Columns: Task | Owner | Due Date | Priority | Status | Notes

function getTasksData() {
  var tasks   = [];
  var props   = PropertiesService.getScriptProperties();
  var teamId  = props.getProperty('TEAM_SHEET_ID');
  var sheetId = teamId || props.getProperty('TASKS_SHEET_ID');
  if (!sheetId) return JSON.stringify(tasks);
  var tz = Session.getScriptTimeZone();

  try {
    var ss   = SpreadsheetApp.openById(sheetId);
    var sheet = teamId ? (ss.getSheetByName('Tasks') || ss.getSheets()[0]) : ss.getSheets()[0];
    var rows  = sheet.getDataRange().getValues();
    if (rows.length < 2) return JSON.stringify(tasks);

    var headers   = rows[0].map(function(h) { return String(h).trim().toLowerCase(); });
    var iTask     = headers.indexOf('task');
    var iOwner    = headers.indexOf('owner');
    var iDue      = headers.indexOf('due date');
    var iPriority = headers.indexOf('priority');
    var iStatus   = headers.indexOf('status');
    var iNotes    = headers.indexOf('notes');

    for (var i = 1; i < rows.length; i++) {
      var row  = rows[i];
      var task = iTask >= 0 ? String(row[iTask]).trim() : '';
      if (!task) continue;

      var dueStr = '';
      if (iDue >= 0 && row[iDue]) {
        var d = row[iDue] instanceof Date ? row[iDue] : new Date(row[iDue]);
        if (!isNaN(d)) dueStr = Utilities.formatDate(d, tz, 'yyyy-MM-dd');
      }

      tasks.push({
        task:     task,
        owner:    iOwner    >= 0 ? String(row[iOwner]).trim()                   : '',
        dueDate:  dueStr,
        priority: iPriority >= 0 ? String(row[iPriority]).trim().toLowerCase()  : '',
        status:   iStatus   >= 0 ? String(row[iStatus]).trim().toLowerCase()    : 'todo',
        notes:    iNotes    >= 0 ? String(row[iNotes]).trim()                   : ''
      });
    }
  } catch (ex) {
    Logger.log('Tasks sheet error: ' + ex);
  }

  return JSON.stringify(tasks);
}


// ─── Engagement Data ──────────────────────────────────────────────────────────
// Reads engagement survey data from the YTD 2026 tab of the engagement sheet.
// Returns an array of row objects with all core metrics, sub-metrics, and the
// three composite scores computed server-side.

var ENGAGEMENT_SHEET_ID = '1SScKVG1Zo-UdPWupq-vb4kE_WTu1P_8lMIu7WFYPsXU';

function getEngagementData() {
  // Serve from script cache when available (6-hour TTL) to avoid repeated
  // cross-spreadsheet API calls, which are the main source of load latency.
  var cache = CacheService.getScriptCache();
  try {
    var hit = cache.get('eng_ytd2026_v2');
    if (hit) return JSON.parse(hit);
  } catch (e) {}

  try {
    var ss    = SpreadsheetApp.openById(ENGAGEMENT_SHEET_ID);
    var sheet = ss.getSheetByName('YTD 2026');
    if (!sheet) return [];

    var values = sheet.getDataRange().getValues();
    if (values.length < 2) return [];

    var results = [];
    for (var i = 1; i < values.length; i++) {
      var r = values[i];
      var rawDate = r[0];
      if (!rawDate || String(rawDate).trim() === '-----') continue;

      var eng       = _engNum(r[1]);
      var part      = _engNum(r[2]);
      var eNPS      = _engNum(r[3]);
      var recog     = _engNum(r[4]);
      var ambass    = _engNum(r[5]);
      var feedback  = _engNum(r[6]);
      var relPeers  = _engNum(r[7]);
      var relMgr    = _engNum(r[8]);
      var satis     = _engNum(r[9]);
      var align     = _engNum(r[10]);
      var happy     = _engNum(r[11]);
      var wellness  = _engNum(r[12]);
      var growth    = _engNum(r[13]);
      // r[14] is the ----- separator column

      results.push({
        date:             _formatEngDate(rawDate),
        engagement:       eng,
        participation:    part,
        participantCount: _engNum(r[41]),  // optional count column (col AP); null if not present
        eNPS:             eNPS,
        recognition:  recog,
        ambassadorship: ambass,
        feedback:     feedback,
        relPeers:     relPeers,
        relManager:   relMgr,
        satisfaction: satis,
        alignment:    align,
        happiness:    happy,
        wellness:     wellness,
        personalGrowth: growth,
        // Composite scores
        expSatis:    _engAvg([recog, ambass, feedback, satis]),
        orgCulture:  _engAvg([relPeers, relMgr]),
        growthWell:  _engAvg([align, happy, wellness, growth]),
        // Sub-metrics
        sub: {
          recogQuality:    _engNum(r[15]),
          recogFrequency:  _engNum(r[16]),
          championing:     _engNum(r[17]),
          pride:           _engNum(r[18]),
          feedbackQuality: _engNum(r[19]),
          feedbackFreq:    _engNum(r[20]),
          feedbackSuggest: _engNum(r[21]),
          peerCollab:      _engNum(r[22]),
          peerTrust:       _engNum(r[23]),
          peerComm:        _engNum(r[24]),
          mgrCollab:       _engNum(r[25]),
          mgrTrust:        _engNum(r[26]),
          mgrComm:         _engNum(r[27]),
          satisFair:       _engNum(r[28]),
          satisRole:       _engNum(r[29]),
          satisEnv:        _engNum(r[30]),
          alignValues:     _engNum(r[31]),
          alignVision:     _engNum(r[32]),
          alignEthics:     _engNum(r[33]),
          happyWork:       _engNum(r[34]),
          happyWLB:        _engNum(r[35]),
          stress:          _engNum(r[36]),
          personalHealth:  _engNum(r[37]),
          autonomy:        _engNum(r[38]),
          mastery:         _engNum(r[39]),
          purpose:         _engNum(r[40])
        }
      });
    }
    try { cache.put('eng_ytd2026_v2', JSON.stringify(results), 21600); } catch (e) {}
    return results;
  } catch (ex) {
    Logger.log('getEngagementData error: ' + ex);
    return [];
  }
}

function _engNum(v) {
  var n = parseFloat(v);
  return isNaN(n) ? null : n;
}

function _engAvg(vals) {
  var nums = vals.filter(function(v) { return v !== null && !isNaN(v); });
  if (!nums.length) return null;
  var sum = nums.reduce(function(a, b) { return a + b; }, 0);
  return Math.round((sum / nums.length) * 10) / 10;
}

function _formatEngDate(raw) {
  if (raw instanceof Date) {
    return Utilities.formatDate(raw, 'America/Vancouver', 'yyyy-MM-dd');
  }
  return String(raw).trim();
}


// ─── BR Queries Pipeline ──────────────────────────────────────────────────────

var BR_QUERIES_SHEET_ID  = '19ioEbx2qjS74CIuvg95aS0_BzeLokXWkCL8bgEeBSzw';
var BR_QUERIES_TRACKER_URL = 'https://docs.google.com/spreadsheets/d/19ioEbx2qjS74CIuvg95aS0_BzeLokXWkCL8bgEeBSzw/edit';

function getDashboardData() {
  // Cache queries data for 5 minutes — isAdmin is always computed fresh (user-specific).
  var cache      = CacheService.getScriptCache();
  var queriesData = null;
  try {
    var hit = cache.get('br_queries_v1');
    if (hit) queriesData = JSON.parse(hit);
  } catch (e) {}

  if (!queriesData) {
    queriesData = _getQueriesStatus();
    try { cache.put('br_queries_v1', JSON.stringify(queriesData), 300); } catch (e) {}
  }

  return {
    pso:     null,
    cbr:     null,
    queries: queriesData,
    isAdmin: _isAdminUser()
  };
}

function _getQueriesStatus() {
  try {
    var ss    = SpreadsheetApp.openById(BR_QUERIES_SHEET_ID);
    var sheet = ss.getSheetByName('CONFIG');
    if (!sheet) return { error: 'CONFIG tab not found in BR Queries sheet' };

    var cfg             = _brQueriesConfig(sheet);
    var currentPeriod   = cfg['Current Period']        || '';
    var pipelineStatus  = cfg['Pipeline Status']       || 'PENDING';
    var preRunSent      = cfg['Pre-Run Reminder Sent'] || '';
    var queriesComplete = cfg['Queries Complete']      || '';
    var postRunChecked  = cfg['Post-Run Checked']      || '';
    var gocoMonth       = cfg['GoCo BQ Max Month']     || '';
    var cbsMonth        = cfg['CBS Max Month']         || '';
    var pwnMonth        = cfg['PWN Max Month']         || '';
    var wlnMonth        = cfg['WLN Max Month']         || '';
    var masterMonth     = cfg['Master Table Max Month']|| '';

    var stage = 0;
    if (preRunSent)      stage = 1;
    if (queriesComplete) stage = 2;
    if (postRunChecked)  stage = 3;

    var exp = currentPeriod;
    return {
      currentPeriod:   currentPeriod,
      pipelineStatus:  pipelineStatus,
      stage:           stage,
      totalStages:     4,
      preRunSent:      preRunSent,
      queriesComplete: queriesComplete,
      postRunChecked:  postRunChecked,
      tables: [
        { name: 'GoCo BQ',     bqId: 'bq_goco_customer_rgu_rev',               maxMonth: gocoMonth,   pass: !!gocoMonth   && gocoMonth   === exp },
        { name: 'CBS',          bqId: 'adt_cbs_active_billed_customer_rgu_hist', maxMonth: cbsMonth,    pass: !!cbsMonth    && cbsMonth    === exp },
        { name: 'PWN',          bqId: 'gs_bq_pwn_br',                           maxMonth: pwnMonth,    pass: !!pwnMonth    && pwnMonth    === exp },
        { name: 'WLN',          bqId: 'op_14239_br_master_tbs',                 maxMonth: wlnMonth,    pass: !!wlnMonth    && wlnMonth    === exp },
        { name: 'Master Table', bqId: 'master_commercial_public_revenue',        maxMonth: masterMonth, pass: !!masterMonth && masterMonth === exp }
      ],
      trackerUrl: BR_QUERIES_TRACKER_URL
    };
  } catch (e) {
    return { error: String(e) };
  }
}

function _brQueriesConfig(sheet) {
  var config = {};
  var data   = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var key = String(data[i][0]).trim();
    if (!key) continue;
    var val = data[i][1];
    config[key] = val instanceof Date ? val.toISOString() : String(val).trim();
  }
  return config;
}

function _brQueriesUpdateConfig(updates) {
  var ss    = SpreadsheetApp.openById(BR_QUERIES_SHEET_ID);
  var sheet = ss.getSheetByName('CONFIG');
  if (!sheet) return;
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    var key = String(data[i][0]).trim();
    if (key in updates) sheet.getRange(i + 1, 2).setValue(updates[key]);
  }
}

// Run once from the Apps Script editor when the CONFIG sheet has no rows.
function initBRConfigSheet() {
  var ss    = SpreadsheetApp.openById(BR_QUERIES_SHEET_ID);
  var sheet = ss.getSheetByName('CONFIG');
  if (!sheet) { Logger.log('ERROR: CONFIG tab not found'); return; }

  var keys = [
    'Current Period', 'Pipeline Status',
    'Pre-Run Reminder Sent', 'Queries Complete', 'Post-Run Checked',
    'GoCo BQ Max Month', 'CBS Max Month', 'PWN Max Month',
    'WLN Max Month', 'Master Table Max Month'
  ];

  var data     = sheet.getDataRange().getValues();
  var existing = {};
  for (var i = 1; i < data.length; i++) {
    var k = String(data[i][0]).trim();
    if (k) existing[k] = true;
  }

  if (!data.length || !String(data[0][0]).trim()) {
    sheet.getRange(1, 1).setValue('Key');
    sheet.getRange(1, 2).setValue('Value');
    sheet.getRange(1, 1, 1, 2).setFontWeight('bold');
  }

  var lastRow = sheet.getLastRow() || 1;
  keys.forEach(function(k) {
    if (!existing[k]) {
      lastRow++;
      sheet.getRange(lastRow, 1).setValue(k);
      if (k === 'Pipeline Status') sheet.getRange(lastRow, 2).setValue('PENDING');
    }
  });
  Logger.log('initBRConfigSheet done. Next: run scheduleMonthlyBRNotification() to set the current period.');
}


// ─── Manual controls (called from EPB Team Site frontend) ─────────────────────

function markReminderSent() {
  _brQueriesUpdateConfig({ 'Pre-Run Reminder Sent': new Date().toISOString() });
  return { success: true };
}

function markQueriesWorkflowDone() {
  _brQueriesUpdateConfig({ 'Queries Complete': new Date().toISOString() });
  return { success: true };
}

function runPostRunCheckNow() {
  try { _brQueriesPostRunCheck(); return { success: true }; }
  catch (e) { return { error: String(e) }; }
}


// ─── Monthly automation ────────────────────────────────────────────────────────

// Run once to install the 1st-of-month recurring trigger.
function setupBRQueriesTriggers() {
  _brQueriesDeleteTriggersFor('scheduleMonthlyBRNotification');
  ScriptApp.newTrigger('scheduleMonthlyBRNotification').timeBased().onMonthDay(1).atHour(6).create();
  Logger.log('Trigger created: scheduleMonthlyBRNotification fires on the 1st of each month at 6am.');
}

// Fires 1st of each month — sets Current Period, resets flags, schedules downstream triggers.
function scheduleMonthlyBRNotification() {
  var now     = new Date();
  var year    = now.getFullYear();
  var month   = now.getMonth() + 1;
  var cpMonth = month === 1 ? 12 : month - 1;
  var cpYear  = month === 1 ? year - 1 : year;
  var pad     = function(n) { return n < 10 ? '0' + n : String(n); };
  var currentPeriod = cpYear + '-' + pad(cpMonth);

  _brQueriesUpdateConfig({
    'Current Period':         currentPeriod,
    'Pipeline Status':        'PENDING',
    'Pre-Run Reminder Sent':  '',
    'Queries Complete':       '',
    'Post-Run Checked':       '',
    'GoCo BQ Max Month':      '',
    'CBS Max Month':          '',
    'PWN Max Month':          '',
    'WLN Max Month':          '',
    'Master Table Max Month': ''
  });

  var fourth       = new Date(year, month - 1, 4);
  var reminderDate = _brQueriesNBDsBefore(fourth, 2);
  reminderDate.setHours(8, 0, 0, 0);
  _brQueriesDeleteTriggersFor('preRunBRReminder');
  ScriptApp.newTrigger('preRunBRReminder').timeBased().at(reminderDate).create();

  var checkDate = new Date(year, month - 1, 13, 9, 0, 0, 0);
  _brQueriesDeleteTriggersFor('_brQueriesPostRunCheck');
  ScriptApp.newTrigger('_brQueriesPostRunCheck').timeBased().at(checkDate).create();

  Logger.log('BR period=' + currentPeriod +
    ' reminder=' + reminderDate.toDateString() +
    ' check='    + checkDate.toDateString());
}

function preRunBRReminder() {
  var cfg    = _brQueriesConfig(SpreadsheetApp.openById(BR_QUERIES_SHEET_ID).getSheetByName('CONFIG'));
  var month  = _brQueriesFormatPeriod(cfg['Current Period']);
  var pwnUrl = PropertiesService.getScriptProperties().getProperty('PWN_SHEET_URL') ||
               'https://docs.google.com/spreadsheets/d/1Xy8iifq42EvKKNpRZ2KyQsoRuBChHtcuRHZPUmNZyTg';
  _brQueriesSendToChat(
    '📋 *Consolidated BR — ' + month + ' Data Reminder*\n\n' +
    'Scheduled queries run on the *4th at 09:00 ET*. ' +
    'Consolidation workflow runs on the *12th at 12:00 ET*.\n\n' +
    'Update before the 4th:\n' +
    '• *PWN* — ' + pwnUrl + '\n' +
    '• *GoCo* — automated from BQ, no update needed.\n' +
    '• *CBS* — automated from BQ, no update needed.\n' +
    '• *WLN* — `op_14239_br_master_tbs` must load by the *7th business day*.\n\n' +
    '_Post-run check fires automatically on the 13th._'
  );
  _brQueriesUpdateConfig({ 'Pre-Run Reminder Sent': new Date().toISOString() });
}

function _brQueriesPostRunCheck() {
  var cfg    = _brQueriesConfig(SpreadsheetApp.openById(BR_QUERIES_SHEET_ID).getSheetByName('CONFIG'));
  var exp    = cfg['Current Period'];
  var month  = _brQueriesFormatPeriod(exp);
  var r      = _brQueriesCheckBQTables(exp);

  _brQueriesUpdateConfig({
    'GoCo BQ Max Month':      r.goco   || 'ERROR',
    'CBS Max Month':          r.cbs    || 'ERROR',
    'PWN Max Month':          r.pwn    || 'ERROR',
    'WLN Max Month':          r.wln    || 'ERROR',
    'Master Table Max Month': r.master || 'ERROR',
    'Post-Run Checked':       new Date().toISOString()
  });

  var allPass = r.goco === exp && r.cbs === exp &&
                r.pwn  === exp && r.wln === exp && r.master === exp;
  _brQueriesUpdateConfig({ 'Pipeline Status': allPass ? 'SUCCESS' : 'FAILED' });

  var icon = function(v) { return v === exp ? '✅' : '❌'; };
  var msg = allPass
    ? '✅ *Consolidated BR — ' + month + ' Pipeline Complete*\n\n' +
      'All tables updated to *' + _brQueriesFormatPeriod(exp) + '*:\n' +
      '• bq_goco_customer_rgu_rev: '               + r.goco   + ' ✅\n' +
      '• adt_cbs_active_billed_customer_rgu_hist: ' + r.cbs    + ' ✅\n' +
      '• gs_bq_pwn_br: '                           + r.pwn    + ' ✅\n' +
      '• op_14239_br_master_tbs (WLN): '           + r.wln    + ' ✅\n' +
      '• master_commercial_public_revenue: '        + r.master + ' ✅'
    : '🔴 *Consolidated BR — ' + month + ' Pipeline Issue*\n\n' +
      'Expected *' + _brQueriesFormatPeriod(exp) + '*. One or more tables stale:\n' +
      '• bq_goco_customer_rgu_rev: '               + (r.goco   || 'ERROR') + ' ' + icon(r.goco)   + '\n' +
      '• adt_cbs_active_billed_customer_rgu_hist: ' + (r.cbs    || 'ERROR') + ' ' + icon(r.cbs)    + '\n' +
      '• gs_bq_pwn_br: '                           + (r.pwn    || 'ERROR') + ' ' + icon(r.pwn)    + '\n' +
      '• op_14239_br_master_tbs (WLN): '           + (r.wln    || 'ERROR') + ' ' + icon(r.wln)    + '\n' +
      '• master_commercial_public_revenue: '        + (r.master || 'ERROR') + ' ' + icon(r.master);
  _brQueriesSendToChat(msg);
}

function _brQueriesCheckBQTables(expectedMonth) {
  var proj = PropertiesService.getScriptProperties().getProperty('BQ_PROJECT_ID') || 'bi-stg-tbs-cmrcl-pr-3233c3';
  var sql  = [
    "SELECT 'goco' AS tbl,",
    "  FORMAT_DATE('%Y-%m', PARSE_DATE('%Y%m', CAST(MAX(year * 100 + month) AS STRING))) AS max_month",
    "FROM `bi-srv-tbs-tbmbi-pr-fc0a62.bus_customer_profile.bq_goco_customer_rgu_rev`",
    "UNION ALL",
    "SELECT 'cbs',",
    "  FORMAT_DATE('%Y-%m', DATE_SUB(MAX(bi_update_dt), INTERVAL 1 DAY))",
    "FROM `bi-srv-tbs-tbmbi-pr-fc0a62.bus_customer_profile.adt_cbs_active_billed_customer_rgu_hist`",
    "WHERE EXTRACT(DAY FROM bi_update_dt) = 1",
    "UNION ALL",
    "SELECT 'pwn', FORMAT_DATE('%Y-%m', MAX(Month_ID))",
    "FROM `" + proj + ".mi_temp_landing.gs_bq_pwn_br`",
    "UNION ALL",
    "SELECT 'wln',",
    "  FORMAT_DATE('%Y-%m', PARSE_DATE('%Y%m', CAST(MAX(CAST(CCYYMM AS INT64)) AS STRING)))",
    "FROM `bi-srv-tbs-tbmbi-pr-fc0a62.bi_temp_landing.op_14239_br_master_tbs`",
    "UNION ALL",
    "SELECT 'master', FORMAT_DATE('%Y-%m', MAX(Billing_Date))",
    "FROM `" + proj + ".mi_temp_landing.master_commercial_public_revenue`"
  ].join(' ');

  try {
    var resp = BigQuery.Jobs.query({ query: sql, useLegacySql: false, timeoutMs: 30000 }, proj);
    var out  = { goco: null, cbs: null, pwn: null, wln: null, master: null };
    if (resp.rows) {
      resp.rows.forEach(function(row) {
        var k = row.f[0].v;
        if (k in out) out[k] = row.f[1].v;
      });
    }
    return out;
  } catch (e) {
    Logger.log('_brQueriesCheckBQTables error: ' + e);
    return { goco: null, cbs: null, pwn: null, wln: null, master: null };
  }
}

function _brQueriesSendToChat(text) {
  var url = PropertiesService.getScriptProperties().getProperty('CHAT_WEBHOOK_URL_AUTHY') ||
            PropertiesService.getScriptProperties().getProperty('CHAT_WEBHOOK_URL');
  if (!url) { Logger.log('No Chat webhook configured — BR notification skipped.'); return; }
  try {
    UrlFetchApp.fetch(url, {
      method: 'post', contentType: 'application/json',
      muteHttpExceptions: true,
      payload: JSON.stringify({ text: text })
    });
  } catch (e) { Logger.log('Chat webhook error: ' + e); }
}

function _brQueriesFormatPeriod(yyyyMm) {
  if (!yyyyMm) return '—';
  var p = String(yyyyMm).split('-');
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return (months[parseInt(p[1], 10) - 1] || p[1]) + ' ' + p[0];
}

function _brQueriesNBDsBefore(targetDate, n) {
  var year     = targetDate.getFullYear();
  var prevYear = targetDate.getMonth() === 0 ? year - 1 : year;
  var holidays = _brQueriesCanadianHolidays(year);
  if (prevYear !== year) holidays = holidays.concat(_brQueriesCanadianHolidays(prevYear));
  var count = 0, d = new Date(targetDate);
  d.setDate(d.getDate() - 1);
  while (count < n) {
    var dow = d.getDay();
    if (dow !== 0 && dow !== 6 && holidays.indexOf(_brQueriesDateStr(d)) === -1) {
      if (++count === n) return new Date(d);
    }
    d.setDate(d.getDate() - 1);
  }
  return new Date(d);
}

function _brQueriesCanadianHolidays(year) {
  var h = [];
  [[1,1],[7,1],[11,11],[12,25],[12,26]].forEach(function(md) {
    var dt = new Date(year, md[0] - 1, md[1]);
    h.push(_brQueriesDateStr(dt));
    var dow = dt.getDay();
    if (dow === 6)      h.push(_brQueriesDateStr(new Date(year, md[0] - 1, md[1] + 2)));
    else if (dow === 0) h.push(_brQueriesDateStr(new Date(year, md[0] - 1, md[1] + 1)));
  });
  var easter = _brQueriesEasterDate(year);
  var gf = new Date(easter); gf.setDate(gf.getDate() - 2); h.push(_brQueriesDateStr(gf));
  var em = new Date(easter); em.setDate(em.getDate() + 1); h.push(_brQueriesDateStr(em));
  var vic = new Date(year, 4, 24);
  while (vic.getDay() !== 1) vic.setDate(vic.getDate() - 1);
  h.push(_brQueriesDateStr(vic));
  h.push(_brQueriesDateStr(_brQueriesFirstWeekday(year, 9, 1)));
  var oct1 = _brQueriesFirstWeekday(year, 10, 1);
  var thx  = new Date(oct1); thx.setDate(thx.getDate() + 7); h.push(_brQueriesDateStr(thx));
  return h;
}

function _brQueriesEasterDate(year) {
  var a = year % 19, b = Math.floor(year / 100), c = year % 100;
  var d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25);
  var g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  var i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
  var m = Math.floor((a + 11 * h + 22 * l) / 451);
  return new Date(year, Math.floor((h + l - 7 * m + 114) / 31) - 1,
                  ((h + l - 7 * m + 114) % 31) + 1);
}

function _brQueriesFirstWeekday(year, month, targetDow) {
  var d = new Date(year, month - 1, 1);
  while (d.getDay() !== targetDow) d.setDate(d.getDate() + 1);
  return d;
}

function _brQueriesDateStr(date) {
  var m = date.getMonth() + 1, dy = date.getDate();
  return date.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (dy < 10 ? '0' + dy : dy);
}

function _brQueriesDeleteTriggersFor(funcName) {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === funcName) ScriptApp.deleteTrigger(t);
  });
}


// ─── Admin: Access Control ────────────────────────────────────────────────────
// Checks whether the current user is in the EPB Hub admin list.
// Used by doGet to gate the admin panel in the Team Site UI.

var EPB_HUB_SHEET_ID = '1OJpOFEwV0YaT1rUoygxXqypv5OwdDcBZX_q-_29Grug';

function _isAdminUser() {
  try {
    var email = Session.getActiveUser().getEmail().toLowerCase().trim();
    if (!email) return false;
    var ss    = SpreadsheetApp.openById(EPB_HUB_SHEET_ID);
    var sheet = ss.getSheetByName('Admin - Access');
    if (!sheet || sheet.getLastRow() < 1) return false;
    var col = sheet.getRange(1, 1, sheet.getLastRow(), 1).getValues();
    return col.some(function(r) {
      return String(r[0]).toLowerCase().trim() === email;
    });
  } catch (e) {
    return false;
  }
}


// ─── Admin: Access Requests ───────────────────────────────────────────────────
// These functions support the access-request panel in the Team Site UI,
// which lets team members request access to EPB Hub dashboards.

// Maps EPB Hub dashboard display names to the "Admin - Access" column keys.
// Must match exactly the same map in epb-hub/server/Auth.gs.
var ACCESS_COLUMN_MAP = {
  'ACIA REVENUE & MARGIN':          'ACIA REVENUE',
  'WLN REVENUE DETAIL':             'WIRELINE REVENUE',
  'WLN DIRECT MARGIN DETAIL':       'WIRELINE MARGIN',
  'WLN NET KPIS':                   'WLN NET KPIS',
  'IOT DETAIL':                     'IOT DETAILS',
  'CORE WIRELESS DETAIL':           'WLS DETAILS',
  'EBITDA CONTRIBUTION':            'EBITDA',
  'EPB EXECUTIVE DASHBOARD':        'EPB ON A PAGE',
  'WLS NETWORK REVENUE':            'WLS DETAILS',
  'WLS P&L SUMMARY':                'WLS DETAILS',
  'PORTING PERFORMANCE':            'EPB ON A PAGE',
  'WLS EQUIPMENT MARGIN':           'WLS DETAILS',
  'WLS/WLN ACQUISITION & RENEWALS': 'WLS DETAILS',
  'EPB PIPELINE':                   'WLS DETAILS',
  'FLASH WEEKLY REPORT':            'FLASH',
  'FLASH NEWSLETTER':               'FLASH ADMIN',
  'EPB STRATCHECK':                 'STRATCHECK',
  'GOQ WLS DASHBOARD':              'GOQ',
  'WLS/WLN CMRG PIPELINE':          'CMRG',
  'CMRG PIPELINE':                  'CMRG',
  'CROSS-SELL PERFORMANCE':         'CROSS SELL',
  'BUDGET':                         'BUDGET'
};

function getPendingAccessRequests() {
  if (!_isAdminUser()) return { error: 'NOT_ADMIN' };
  try {
    var ss    = SpreadsheetApp.openById(EPB_HUB_SHEET_ID);
    var sheet = ss.getSheetByName('Access Requests');
    if (!sheet || sheet.getLastRow() < 2) return { requests: [] };

    var rows    = sheet.getRange(2, 1, sheet.getLastRow() - 1, 8).getValues();
    var pending = [];
    rows.forEach(function(r, i) {
      if (String(r[4]).toLowerCase() === 'pending') {
        var reqAt = r[3] ? new Date(r[3]).toLocaleString('en-CA', {
          month: 'short', day: 'numeric', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        }) : '';
        pending.push({
          rowIndex:     i + 2,
          email:        String(r[0]).trim(),
          dashboard:    String(r[1]).trim(),
          accessColumn: String(r[2]).trim(),
          requestedAt:  reqAt
        });
      }
    });
    return { requests: pending };
  } catch (e) {
    return { error: String(e) };
  }
}

function approveAccessRequest(rowIndex, email, accessColumn) {
  Logger.log('approveAccessRequest called: rowIndex=%s email=%s accessColumn=%s', rowIndex, email, accessColumn);
  if (!_isAdminUser()) { Logger.log('NOT_ADMIN'); return { error: 'NOT_ADMIN' }; }

  // Privilege escalation check — column must be a known value in ACCESS_COLUMN_MAP
  var validColumns = Object.keys(ACCESS_COLUMN_MAP).map(function(k) {
    return ACCESS_COLUMN_MAP[k];
  });
  Logger.log('validColumns: %s', JSON.stringify(validColumns));
  if (validColumns.indexOf(accessColumn) === -1) { Logger.log('INVALID_COLUMN: %s', accessColumn); return { error: 'INVALID_COLUMN: ' + accessColumn }; }

  try {
    var ss           = SpreadsheetApp.openById(EPB_HUB_SHEET_ID);
    var accessSheet  = ss.getSheetByName('Admin - Access');
    var reqSheet     = ss.getSheetByName('Access Requests');
    var approverEmail = Session.getActiveUser().getEmail();

    if (!accessSheet) return { error: 'Admin - Access tab not found' };
    if (!reqSheet)    return { error: 'Access Requests tab not found' };

    // Find column index for accessColumn in Admin - Access header row
    var lastCol = accessSheet.getLastColumn();
    var headers = accessSheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var colIdx  = -1;
    for (var h = 0; h < headers.length; h++) {
      if (String(headers[h]).trim().toUpperCase() === accessColumn.toUpperCase()) {
        colIdx = h;
        break;
      }
    }
    if (colIdx === -1) return { error: 'COLUMN_NOT_FOUND: ' + accessColumn };

    // Find existing row for this email or append after last row
    var lastRow   = accessSheet.getLastRow();
    var allEmails = lastRow > 1
      ? accessSheet.getRange(2, 1, lastRow - 1, 1).getValues()
      : [];
    var targetRow = -1;
    for (var e = 0; e < allEmails.length; e++) {
      if (String(allEmails[e][0]).toLowerCase().trim() === email.toLowerCase()) {
        targetRow = e + 2;
        break;
      }
    }
    if (targetRow === -1) targetRow = lastRow + 1;

    // Read display name from request row for webhook message
    var displayName = String(reqSheet.getRange(rowIndex, 2).getValue()).trim() || accessColumn;

    // Write email into admin access matrix
    accessSheet.getRange(targetRow, 1).setValue(email);
    accessSheet.getRange(targetRow, colIdx + 1).setValue(email);

    // Update request row: Status, Approved By, Approved At
    var now = new Date();
    reqSheet.getRange(rowIndex, 5).setValue('Approved');
    reqSheet.getRange(rowIndex, 6).setValue(approverEmail);
    reqSheet.getRange(rowIndex, 7).setValue(now);

    // Fire Google Chat webhook
    var webhookUrl = PropertiesService.getScriptProperties().getProperty('CHAT_WEBHOOK_URL_AUTHY');
    if (webhookUrl) {
      try {
        var approveResp = UrlFetchApp.fetch(webhookUrl, {
          method: 'post',
          contentType: 'application/json',
          muteHttpExceptions: true,
          payload: JSON.stringify({
            text: '✅ *EPB Hub Access Granted!*\n\n*User:* ' + email +
                  '\n*Dashboard:* ' + displayName +
                  '\n*Approved By:* ' + approverEmail +
                  '\n*Time:* ' + now.toLocaleString() +
                  '\n\n' + email + ' — please refresh EPB Hub to access your new dashboard.'
          })
        });
        Logger.log('Approve webhook: %s %s', approveResp.getResponseCode(), approveResp.getContentText());
      } catch (hookErr) {
        Logger.log('Approve webhook error: ' + hookErr);
      }
    } else {
      Logger.log('approveAccessRequest: Dashboard_Bot property not set — webhook skipped');
    }

    // Email requester
    try {
      GmailApp.sendEmail(
        email,
        'EPB Hub — Access Granted: ' + displayName,
        'Hi,\n\nYour access request for the ' + displayName + ' dashboard in EPB Hub has been approved.\n\n' +
        'You can now refresh EPB Hub and the dashboard will be available to you.\n\n' +
        'Approved by: ' + approverEmail + '\n\nEPB Hub Team'
      );
    } catch (mailErr) {
      Logger.log('sendEmail error: ' + mailErr.message);
    }

    return { success: true };
  } catch (e) {
    return { error: String(e) };
  }
}

function denyAccessRequest(rowIndex) {
  if (!_isAdminUser()) return { error: 'NOT_ADMIN' };
  try {
    var ss       = SpreadsheetApp.openById(EPB_HUB_SHEET_ID);
    var reqSheet = ss.getSheetByName('Access Requests');
    if (!reqSheet) return { error: 'Access Requests tab not found' };

    var rowData     = reqSheet.getRange(rowIndex, 1, 1, 3).getValues()[0];
    var email       = String(rowData[0]).trim();
    var displayName = String(rowData[1]).trim();
    var decliner    = Session.getActiveUser().getEmail();
    var now         = new Date();

    reqSheet.getRange(rowIndex, 5).setValue('Denied');
    reqSheet.getRange(rowIndex, 6).setValue(decliner);
    reqSheet.getRange(rowIndex, 7).setValue(now);

    // Fire Google Chat webhook
    var webhookUrl = PropertiesService.getScriptProperties().getProperty('CHAT_WEBHOOK_URL_AUTHY');
    if (webhookUrl) {
      try {
        var denyResp = UrlFetchApp.fetch(webhookUrl, {
          method: 'post',
          contentType: 'application/json',
          muteHttpExceptions: true,
          payload: JSON.stringify({
            text: '❌ *EPB Hub Access Request Declined*\n\n*User:* ' + email +
                  '\n*Dashboard:* ' + displayName +
                  '\n*Declined By:* ' + decliner +
                  '\n*Time:* ' + now.toLocaleString()
          })
        });
        Logger.log('Deny webhook: %s %s', denyResp.getResponseCode(), denyResp.getContentText());
      } catch (hookErr) {
        Logger.log('Deny webhook error: ' + hookErr);
      }
    } else {
      Logger.log('denyAccessRequest: Dashboard_Bot property not set — webhook skipped');
    }

    // Email requester
    try {
      GmailApp.sendEmail(
        email,
        'EPB Hub — Access Request Declined: ' + displayName,
        'Hi,\n\nYour access request for the ' + displayName + ' dashboard in EPB Hub has been declined.\n\n' +
        'If you believe this is an error, please reach out to your manager.\n\nEPB Hub Team'
      );
    } catch (mailErr) {
      Logger.log('sendEmail error: ' + mailErr.message);
    }

    return { success: true };
  } catch (e) {
    return { error: String(e) };
  }
}

function approveBulkAccessRequests(requestsJson) {
  if (!_isAdminUser()) return { error: 'NOT_ADMIN' };
  var requests;
  try { requests = JSON.parse(requestsJson); } catch (e) { return { error: 'INVALID_JSON' }; }
  if (!Array.isArray(requests) || requests.length === 0) return { error: 'EMPTY_LIST' };

  var validColumns = Object.keys(ACCESS_COLUMN_MAP).map(function (k) { return ACCESS_COLUMN_MAP[k]; });
  var ss           = SpreadsheetApp.openById(EPB_HUB_SHEET_ID);
  var accessSheet  = ss.getSheetByName('Admin - Access');
  var reqSheet     = ss.getSheetByName('Access Requests');
  if (!accessSheet) return { error: 'Admin - Access tab not found' };
  if (!reqSheet)    return { error: 'Access Requests tab not found' };

  var approverEmail = Session.getActiveUser().getEmail();
  var now           = new Date();
  var lastCol       = accessSheet.getLastColumn();
  var headers       = accessSheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var lastRow       = accessSheet.getLastRow();
  var allEmails     = lastRow > 1 ? accessSheet.getRange(2, 1, lastRow - 1, 1).getValues() : [];

  var results      = [];
  var summaryParts = [];

  requests.forEach(function (req) {
    var rowIndex     = req.rowIndex;
    var email        = req.email;
    var accessColumn = req.accessColumn;
    try {
      if (validColumns.indexOf(accessColumn) === -1) {
        results.push({ email: email, success: false, error: 'INVALID_COLUMN: ' + accessColumn });
        return;
      }
      var colIdx = -1;
      for (var h = 0; h < headers.length; h++) {
        if (String(headers[h]).trim().toUpperCase() === accessColumn.toUpperCase()) { colIdx = h; break; }
      }
      if (colIdx === -1) { results.push({ email: email, success: false, error: 'COLUMN_NOT_FOUND: ' + accessColumn }); return; }

      var targetRow = -1;
      for (var e = 0; e < allEmails.length; e++) {
        if (String(allEmails[e][0]).toLowerCase().trim() === email.toLowerCase()) { targetRow = e + 2; break; }
      }
      if (targetRow === -1) {
        lastRow++;
        targetRow = lastRow;
        allEmails.push([email]);
      }

      var displayName = String(reqSheet.getRange(rowIndex, 2).getValue()).trim() || accessColumn;
      accessSheet.getRange(targetRow, 1).setValue(email);
      accessSheet.getRange(targetRow, colIdx + 1).setValue(email);
      reqSheet.getRange(rowIndex, 5).setValue('Approved');
      reqSheet.getRange(rowIndex, 6).setValue(approverEmail);
      reqSheet.getRange(rowIndex, 7).setValue(now);

      try {
        GmailApp.sendEmail(
          email,
          'EPB Hub — Access Granted: ' + displayName,
          'Hi,\n\nYour access request for the ' + displayName + ' dashboard in EPB Hub has been approved.\n\n' +
          'You can now refresh EPB Hub and the dashboard will be available to you.\n\n' +
          'Approved by: ' + approverEmail + '\n\nEPB Hub Team'
        );
      } catch (mailErr) { Logger.log('sendEmail error: ' + mailErr.message); }

      summaryParts.push('• ' + email + ' → ' + displayName);
      results.push({ email: email, success: true });
    } catch (err) {
      results.push({ email: email, success: false, error: String(err) });
    }
  });

  if (summaryParts.length > 0) {
    var webhookUrl = PropertiesService.getScriptProperties().getProperty('CHAT_WEBHOOK_URL_AUTHY');
    if (webhookUrl) {
      try {
        UrlFetchApp.fetch(webhookUrl, {
          method: 'post', contentType: 'application/json', muteHttpExceptions: true,
          payload: JSON.stringify({
            text: '✅ *EPB Hub Bulk Access Granted (' + summaryParts.length + ')*\n\n' +
                  summaryParts.join('\n') +
                  '\n\n*Approved By:* ' + approverEmail + '\n*Time:* ' + now.toLocaleString()
          })
        });
      } catch (hookErr) { Logger.log('Bulk approve webhook error: ' + hookErr); }
    }
  }

  return { results: results };
}

function denyBulkAccessRequests(rowIndicesJson) {
  if (!_isAdminUser()) return { error: 'NOT_ADMIN' };
  var rowIndices;
  try { rowIndices = JSON.parse(rowIndicesJson); } catch (e) { return { error: 'INVALID_JSON' }; }
  if (!Array.isArray(rowIndices) || rowIndices.length === 0) return { error: 'EMPTY_LIST' };

  var ss       = SpreadsheetApp.openById(EPB_HUB_SHEET_ID);
  var reqSheet = ss.getSheetByName('Access Requests');
  if (!reqSheet) return { error: 'Access Requests tab not found' };

  var decliner     = Session.getActiveUser().getEmail();
  var now          = new Date();
  var results      = [];
  var summaryParts = [];

  rowIndices.forEach(function (rowIndex) {
    try {
      var rowData     = reqSheet.getRange(rowIndex, 1, 1, 3).getValues()[0];
      var email       = String(rowData[0]).trim();
      var displayName = String(rowData[1]).trim();
      reqSheet.getRange(rowIndex, 5).setValue('Denied');
      reqSheet.getRange(rowIndex, 6).setValue(decliner);
      reqSheet.getRange(rowIndex, 7).setValue(now);

      try {
        GmailApp.sendEmail(
          email,
          'EPB Hub — Access Request Declined: ' + displayName,
          'Hi,\n\nYour access request for the ' + displayName + ' dashboard in EPB Hub has been declined.\n\n' +
          'If you believe this is an error, please reach out to your manager.\n\nEPB Hub Team'
        );
      } catch (mailErr) { Logger.log('sendEmail error: ' + mailErr.message); }

      summaryParts.push('• ' + email + ' → ' + displayName);
      results.push({ rowIndex: rowIndex, email: email, success: true });
    } catch (err) {
      results.push({ rowIndex: rowIndex, success: false, error: String(err) });
    }
  });

  if (summaryParts.length > 0) {
    var webhookUrl = PropertiesService.getScriptProperties().getProperty('CHAT_WEBHOOK_URL_AUTHY');
    if (webhookUrl) {
      try {
        UrlFetchApp.fetch(webhookUrl, {
          method: 'post', contentType: 'application/json', muteHttpExceptions: true,
          payload: JSON.stringify({
            text: '❌ *EPB Hub Bulk Access Declined (' + summaryParts.length + ')*\n\n' +
                  summaryParts.join('\n') +
                  '\n\n*Declined By:* ' + decliner + '\n*Time:* ' + now.toLocaleString()
          })
        });
      } catch (hookErr) { Logger.log('Bulk deny webhook error: ' + hookErr); }
    }
  }

  return { results: results };
}
