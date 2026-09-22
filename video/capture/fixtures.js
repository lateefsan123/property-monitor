import {useState} from 'react';
export const sources=[{id:'st-regis',label:'The St. Regis Residences, Downtown Dubai'},{id:'burj-khalifa',label:'Burj Khalifa'}];
export function useSpreadsheetBuildings(){
 const [sourceId,setSourceId]=useState('');
 return {sourceId,setSourceId,sources,buildings:sources.filter(s=>s.id===sourceId).map(s=>s.label),loading:false,error:null,retry(){}};
}
export async function previewSheetBuildings(url){
 await new Promise(resolve=>setTimeout(resolve,300));
 const source=sources.find(s=>url.includes(s.id));
 if(!source)throw Error('Use one of the two recording spreadsheets.');
 return [{building:source.label,rowCount:4,uniquePhoneCount:4}];
}
let savedSchedule=null;
export const demoClient={from(){return {select(){return {eq(){return {maybeSingle:async()=>({data:savedSchedule,error:null})}}}},upsert:async(value)=>{savedSchedule=value;return {error:null}}}}};
