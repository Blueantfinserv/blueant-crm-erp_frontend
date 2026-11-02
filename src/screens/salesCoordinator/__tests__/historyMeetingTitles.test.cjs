const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const path = require('node:path');
const exported = {};
const file = path.join(__dirname, '../historyMeetingTitles.ts');
new Function('exports', ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(exported);
const { historyMeetingTitles } = exported;
test('PC history advances only after conducted meetings and keeps original records intact', () => {
  const statuses = ['COMPLETED', 'COMPLETED', 'COMPLETED', 'NOT_CONDUCTED', 'NOT_CONDUCTED', 'COMPLETED', 'COMPLETED'];
  const chronological = statuses.map((meetingStatus, i) => ({ meetingCode: `M${i}`, meetingDate: `2026-10-0${i + 1}`, meetingStatus, meetingTitle: i ? '9th Meeting' : 'Intro Meeting' }));
  const records = [...chronological].reverse();
  const before = JSON.stringify(records);
  const titles = historyMeetingTitles(records);
  assert.deepEqual(chronological.map(m => titles.get(m)), ['Intro Meeting', '1st Meeting', '2nd Meeting', '3rd Meeting', '3rd Meeting', '3rd Meeting', '4th Meeting']);
  assert.equal(JSON.stringify(records), before);
});
test('incomplete history retains server titles; client meetings are excluded', () => {
  assert.equal(historyMeetingTitles([{ meetingTitle: '3rd Meeting' }]).size, 0);
  assert.equal(historyMeetingTitles([{ meetingTitle: 'Intro Meeting', isClientMeeting: true }]).size, 0);
});
test('scheduled or explicitly not conducted records never advance the sequence', () => {
  const records = [{ meetingTitle: 'Intro Meeting', meetingStatus: 'COMPLETED', meetingConducted: 'NOT_CONDUCTED' }, { meetingStatus: 'SCHEDULED' }, { meetingStatus: 'COMPLETED' }, { meetingStatus: 'SCHEDULED' }];
  const titles = historyMeetingTitles(records);
  assert.deepEqual(records.map(m => titles.get(m)), ['Intro Meeting', 'Intro Meeting', 'Intro Meeting', '1st Meeting']);
});
