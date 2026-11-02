// QA-17/19 style: Apps Script mocks to exercise Code.gs + FollowupRunner.gs + FollowupEngine.gs end to end.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const D = fileURLToPath(new URL('../apps-script/', import.meta.url));
test('Google Sheet engine end to end (Apps Script mocked)', () => {
const sheets={};
function mkSheet(name){const rows=[];return sheets[name]={name,rows,
 getRange(r,c,nr=1,nc=1){return{
  setValues(v){for(let i=0;i<v.length;i++){rows[r-1+i]=rows[r-1+i]||[];for(let j=0;j<v[i].length;j++)rows[r-1+i][c-1+j]=v[i][j]}return this},
  getValues(){const o=[];for(let i=0;i<nr;i++){o.push([]);for(let j=0;j<nc;j++)o[i].push((rows[r-1+i]||[])[c-1+j]??'')}return o},
  getValue(){return (rows[r-1]||[])[c-1]??''},setValue(v){rows[r-1]=rows[r-1]||[];rows[r-1][c-1]=v;return this},
  setFontWeight(){return this},setBackground(){return this},setFontColor(){return this},setDataValidation(){return this},setNumberFormat(){return this}}},
 getLastRow(){return rows.length},getLastColumn(){return Math.max(...rows.map(r=>r.length))},appendRow(a){rows.push(a)},setFrozenRows(){},hideColumns(){}}}
const sent=[];
const ctx={console,Date:class extends Date{},JSON,Math,Number,String,Object,Array,Set,Buffer,
 SpreadsheetApp:{getActiveSpreadsheet:()=>({getSheetByName:n=>sheets[n],insertSheet:n=>mkSheet(n)}),getActive:()=>({toast(){}}),newDataValidation:()=>({requireValueInList(){return{build(){}}}})},
 PropertiesService:{getScriptProperties:()=>({getProperty:k=>({SHEET_LOG_SECRET:'s',API_BASE:'https://api'}[k])})},
 LockService:{getScriptLock:()=>({waitLock(){},tryLock(){return true},releaseLock(){}})},
 ContentService:{createTextOutput:t=>({setMimeType(){return t}}),MimeType:{JSON:1}},
 Utilities:{formatDate:(d)=>new Date(d).toISOString().slice(2,10).replace(/-/g,'')},
 UrlFetchApp:{fetch:(u,o)=>{const p=JSON.parse(o.payload);sent.push([u.replace('https://api',''),p.tpl||p.stage,p.step||'']);return{getResponseCode:()=>200,getContentText:()=>JSON.stringify({ok:true,dryRun:true})}}},
 MailApp:{sendEmail(){}},ScriptApp:{}};
vm.createContext(ctx);
for(const f of ['FollowupEngine.gs','Code.gs','FollowupRunner.gs'])vm.runInContext(fs.readFileSync(D+f,'utf8'),ctx,{filename:f});
vm.runInContext('setupSheet()',ctx);
const post=b=>JSON.parse(vm.runInContext('doPost('+JSON.stringify({postData:{contents:JSON.stringify({secret:'s',...b})}})+')',ctx));
let now=Date.parse('2026-11-02T05:30:00Z'); // 11:00 IST
ctx.Date.now=()=>now;
post({action:'lead',phone:'919871522556',name:'Neha Sharma',city:'Faridabad',source:'SRC_META_FORM',consent:true,consentSource:'form',score:75,tier:'HOT',qualified:true,stage:'qualified'});
post({action:'wa_message',phone:'919871522556',text:'Hi EH-META-FBD',intent:'greeting',source:'SRC_META_CTWA',ts:now});
post({action:'wa_message',phone:'919999999999',text:'job?',intent:'job',source:'SRC_UNKNOWN',ts:now});
const L=()=>sheets['Leads'].rows;
assert.equal(L().length-1,2,'one row per phone');assert.equal(L()[1][5],'qualified');assert.equal(L()[1][14],'SRC_META_FORM');assert.equal(L()[1][15],'SRC_META_CTWA');assert.equal(L()[2][5],'not_lead');
for(let i=0;i<12;i++){now+=6*3600e3;vm.runInContext('runFollowups()',ctx)}
assert.deepEqual(sent.filter(s=>s[0].endsWith('send')).map(s=>s[1]),['eh_q_slots','eh_fu_d3_proof']);
// desk books a visit
const c=n=>vm.runInContext(`col_(${JSON.stringify(n)})`,ctx);
L()[1][c('Stage')-1]='visit_booked';L()[1][c('Visit at')-1]=new ctx.Date(now+2*86400e3);sent.length=0;
for(let i=0;i<20;i++){now+=3*3600e3;vm.runInContext('runFollowups()',ctx)}
assert.deepEqual(sent.filter(s=>s[0].endsWith('send')).map(s=>s[1]).slice(0,2),['eh_visit_confirm','eh_visit_reminder_eve']);
post({action:'wa_message',phone:'919871522556',text:'STOP',intent:'stop',ts:now});assert.equal(L()[1][5],'opted_out');
sent.length=0;vm.runInContext('runFollowups()',ctx);assert.deepEqual(sent.map(s=>s[0]),['/api/es/followup-sync']);
const st=sheets['Follow-up stats'].rows;assert.equal(st.find(r=>r[0]==='eh_fu_d3_proof')[3],1,'booking credited to last template');
});
