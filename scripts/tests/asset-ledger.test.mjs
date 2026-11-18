import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';
import { assetSaleValues } from '../../src/lib/asset-sale.ts';
const source = (await fs.readFile(new URL('../../src/lib/re-data.js', import.meta.url),'utf8')).replace("import { saveRecordToFirestore, deleteRecordFromFirestore } from './firestore-service';",'const saveRecordToFirestore = () => {}; const deleteRecordFromFirestore = () => {};');
const M = await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const bought=new Date(2026,0,1), sold=new Date(2026,1,1), before=new Date(2026,0,31), after=new Date(2026,1,28);
M.DATA.expenses.push({id:'A1',group:'Assets',amount:100,currentValue:140,date:bought,soldAt:sold,saleAmount:140,saleGain:40,salePaymentId:'ASSET-SALE-A1',office:'Main',paid:100});
M.DATA.payments.push({id:'ASSET-SALE-A1',dir:'in',amount:140,account:'Test Bank',date:sold,category:'Asset Sale',status:'Posted',assetId:'A1'});
test('sold asset leaves holdings on sale date, receipt credits bank, history remains',()=>{
 assert.equal(M.holdingsAt(before).assets,100);assert.equal(M.holdingsAt(after).assets,0);assert.equal(M.holdingsAt(after).bank,140);
 assert.equal(M.investments().length,0);assert.equal(M.DATA.expenses.length,1);
 assert.equal(M.incomeEntries({start:sold,end:after}).reduce((n,r)=>n+r.amount,0),40);
});
test('asset sale receipt and history cannot be independently edited or removed',()=>{
 assert.throws(()=>M.voidPayment('ASSET-SALE-A1'),/asset sale/);
 assert.throws(()=>M.changePaymentAccount('ASSET-SALE-A1','Other Bank'),/asset sale/);
 assert.throws(()=>M.deleteRecord('expenses','A1'),/history/);
 assert.throws(()=>M.updateExpense('A1',{}),/history/);
});
const service=await fs.readFile(new URL('../../src/lib/firestore-service.ts',import.meta.url),'utf8');
const compiled=ts.transpileModule(service,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
function harness(failCommit=false){
 const records=new Map([['expenses/A1',{group:'Assets',amount:100,currentValue:140,office:'Main'}]]);
 const fb={doc:(_db,col,id)=>({path:col+'/'+id,id}),runTransaction:async(_db,fn)=>{
  const writes=[];const result=await fn({get:async ref=>({exists:()=>records.has(ref.path),data:()=>records.get(ref.path)}),update:(ref,data)=>writes.push([ref.path,{...records.get(ref.path),...data}]),set:(ref,data)=>writes.push([ref.path,data])});
  if(failCommit)throw Error('Offline');for(const [key,data]of writes)records.set(key,data);return result;
 }};
 const module={exports:{}};vm.runInNewContext(compiled,{exports:module.exports,module,console,Date,require:name=>{
  if(name==='firebase/firestore')return {...fb,Timestamp:{fromDate:d=>d}};
  if(name==='./firebase')return {getFirebaseFirestore:()=>({})};
  if(name==='./asset-sale')return {assetSaleValues};
  if(name==='./re-data')return {accountNames:()=>['Test Bank'],accountKind:()=> 'Bank',OFFICES:['Main']};
  throw Error(name);
 }});return {sell:module.exports.sellAssetToAccount,records};
}
test('transaction writes asset, receipt and audit once; retries cannot duplicate credit',async()=>{
 const h=harness();await h.sell('A1','Test Bank',140,'Tester');assert.equal(h.records.size,3);assert.equal(h.records.get('payments/ASSET-SALE-A1').amount,140);assert.equal(h.records.get('expenses/A1').saleGain,40);
 await assert.rejects(h.sell('A1','Test Bank',140,'Tester'),/already/);assert.equal(h.records.size,3);
});
test('failed commit and stale values leave asset and bank untouched',async()=>{
 const failed=harness(true);await assert.rejects(failed.sell('A1','Test Bank',140,'Tester'),/Offline/);assert.equal(failed.records.size,1);assert.equal(failed.records.get('expenses/A1').soldAt,undefined);
 const stale=harness();await assert.rejects(stale.sell('A1','Test Bank',150,'Tester'),/changed/);assert.equal(stale.records.size,1);
});
test('partial withdrawal realizes its gain in P&L and lowers the holding cost from its date',()=>{
 const wd=new Date(2026,2,10);
 M.DATA.expenses.push({id:'A2',group:'Assets',amount:800,currentValue:600,date:bought,office:'Main',paid:800,moves:[{id:'ASSET-WD-A2-1',date:wd,kind:'withdraw',amount:300,cost:240,gain:60,account:'Test Bank',paymentId:'ASSET-WD-A2-1'}]});
 assert.equal(M.assetCost(M.DATA.expenses.at(-1)),560);
 assert.equal(M.holdingsAt(new Date(2026,2,1)).assets,800);assert.equal(M.holdingsAt(new Date(2026,2,20)).assets,560);
 assert.equal(M.incomeEntries({start:new Date(2026,2,1),end:new Date(2026,2,31)}).reduce((n,r)=>n+r.amount,0),60);
 assert.equal(M.investments().find(x=>x.id==='A2').invested,560);
 M.DATA.expenses.pop();
});
