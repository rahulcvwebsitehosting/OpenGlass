const { test } = require('node:test');
const assert = require('node:assert/strict');
const { PhotoAssembler } = require('../sources/modules/photoProtocol');
const { Agent } = require('../sources/agent/Agent');
const { AsyncLock } = require('../sources/utils/lock');
const { toBase64 } = require('../sources/utils/base64');
const { savePhoto, saveCaption } = require('../sources/modules/photoStorage');

const packet = (id, data = [], offset = 0) => {
    const bytes = new Uint8Array(offset + data.length + 2 + 4);
    const view = new DataView(bytes.buffer, offset, data.length + 2);
    view.setUint16(0, id, true);
    bytes.set(data, offset + 2);
    return view;
};
const jpeg = [255, 216, 1, 2, 3, 255, 217];
test('BLE reassembly respects DataView offsets and copies mutable notifications', () => {
    const a = new PhotoAssembler();
    const first = packet(0, jpeg.slice(0, 4), 3);
    a.push(first); first.setUint8(2, 0);
    a.push(packet(1, jpeg.slice(4), 8));
    assert.deepEqual([...a.push(packet(65535))], jpeg);
    assert.equal(a.push(packet(65535)), null);
});
test('BLE drops lost, duplicate, out-of-order, malformed and truncated frames; recovers on sequence zero', () => {
    const a = new PhotoAssembler();
    for (const badId of [0, 2, 100]) {
        a.push(packet(0, jpeg.slice(0, 2)));
        a.push(packet(badId, jpeg.slice(2)));
        assert.equal(a.push(packet(65535)), null);
    }
    a.push(new DataView(new Uint8Array([1]).buffer));
    a.push(packet(0, jpeg.slice(0, -1)));
    assert.equal(a.push(packet(65535)), null);
    a.push(packet(0, jpeg));
    assert.deepEqual([...a.push(packet(65535))], jpeg);
});
test('BLE memory limit rejects oversized frames and allows a following valid frame', () => {
    const a = new PhotoAssembler(8);
    a.push(packet(0, new Array(9).fill(1)));
    assert.equal(a.push(packet(65535)), null);
    a.push(packet(0, jpeg));
    assert.deepEqual([...a.push(packet(65535))], jpeg);
});
test('captured fixture survives minimum and larger BLE MTU packet sizes', () => {
    const image = require('fs').readFileSync('prompts/series_1/img_1.jpeg');
    for (const size of [18, 200]) {
        const a = new PhotoAssembler();
        for (let i=0, n=0; i<image.length; i+=size, n++) a.push(packet(n, image.subarray(i,i+size)));
        assert.deepEqual(Buffer.from(a.push(packet(65535))), image);
    }
});
test('AI failure clears loading and allows a successful retry without stale answer', async () => {
    let fail = true;
    const a = new Agent(async () => 'keys on desk', async () => { if(fail) throw new Error('offline'); return 'On the desk.'; });
    await a.addPhoto([new Uint8Array([1])]);
    assert.equal(await a.answer('Where are my keys?'), undefined);
    assert.equal(a.getState().loading, false);
    assert.match(a.getState().error, /offline/);
    fail = false;
    assert.equal(await a.answer('Where are my keys?'), 'On the desk.');
    assert.equal(a.getState().error, undefined);
});
test('photo failure does not skip later captures; persistence is associated with original bytes', async () => {
    const seen=[];
    const a=new Agent(async p => { if(p[0]===1) throw new Error('bad'); return 'photo '+p[0]; });
    a.onPhotoProcessed=async (photo,description)=>seen.push([photo[0],description]);
    await a.addPhoto([new Uint8Array([1]),new Uint8Array([2]),new Uint8Array([3])]);
    assert.deepEqual(seen,[[2,'photo 2'],[3,'photo 3']]);
    assert.equal(a.getState().described,2);
});
test('agent bounds visual context and ignores blank/concurrent questions', async () => {
    let context;
    const a=new Agent(async p=>'scene-'+p[0],async (_q,c)=>{context=c; return 'answer';});
    assert.equal(await a.answer('  '),undefined);
    await a.addPhoto(Array.from({length:40},(_,i)=>new Uint8Array([i])));
    const first=a.answer('what?');
    assert.equal(await a.answer('duplicate?'),undefined);
    await first;
    assert(!context.includes('scene-0\n'));
    assert.equal((context.match(/Image #/g)||[]).length,24);
});
test('no-context questions fail visibly and release the agent', async () => {
    const a=new Agent();
    await a.answer('What?');
    assert.equal(a.getState().loading,false);
    assert.match(a.getState().error,/Wait for a scene/);
});
test('lock serializes jobs and releases after errors', async () => {
    const lock=new AsyncLock(), order=[];
    await Promise.allSettled([lock.inLock(async()=>{order.push(1);throw Error('fail');}),lock.inLock(async()=>order.push(2))]);
    assert.deepEqual(order,[1,2]);
});
test('base64 preserves subarray boundaries',()=> {
    const bytes=Uint8Array.from([0,1,255,3]).subarray(1,3);
    assert.equal(toBase64(bytes),Buffer.from(bytes).toString('base64'));
});
test('caption waits for its exact upload even when another upload finishes first',async()=>{
    let finish; const pending=new Promise(r=>finish=r); const updates=[];
    const client={from:()=>({update:({caption})=>({eq:async(_field,id)=>{updates.push([id,caption]);return {error:null};}})})};
    const first=saveCaption(client,pending,'first');
    await saveCaption(client,Promise.resolve('id-2'),'second');
    finish('id-1'); await first;
    assert.deepEqual(updates,[['id-2','second'],['id-1','first']]);
});
test('storage cleans orphaned upload if database insert fails',async()=>{
    const removed=[];
    const client={storage:{from:()=>({upload:async()=>({error:null}),remove:async paths=>removed.push(...paths)})},
        from:()=>({insert:()=>({select:()=>({single:async()=>({error:new Error('insert failed')})})})})};
    await assert.rejects(savePhoto(client,new Uint8Array(jpeg)),/insert failed/);
    assert.equal(removed.length,1);
});
