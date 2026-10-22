const {test}=require('node:test');
const assert=require('node:assert/strict');
const {subscribePhotos}=require('../sources/modules/photoStream');
const {PHOTO_UUID}=require('../sources/modules/photoProtocol');
function setup(){
    const characteristic=new EventTarget();
    const writes=[];let starts=0,stops=0;
    characteristic.startNotifications=async()=>{starts++;};
    characteristic.stopNotifications=async()=>{stops++;};
    const control={writeValue:async value=>writes.push(value[0])};
    const service={getCharacteristic:async uuid=>uuid===PHOTO_UUID?characteristic:control};
    const device={connected:true,getPrimaryService:async()=>service};
    const emit=bytes=>{characteristic.value=new DataView(Uint8Array.from(bytes).buffer);characteristic.dispatchEvent(new Event('characteristicvaluechanged'));};
    return {device,writes,emit,counts:()=>({starts,stops})};
}
test('photo stream starts, delivers a frame and removes notifications on cleanup',async()=>{
    const mock=setup(),photos=[];
    let ready;const started=new Promise(r=>ready=r);
    const stop=subscribePhotos(mock.device,p=>photos.push(p),ready,e=>{throw e;});
    await started;
    mock.emit([0,0,255,216,4,255,217]);mock.emit([255,255]);
    assert.equal(photos.length,1);assert.deepEqual(mock.writes,[5]);
    await stop();
    mock.emit([0,0,255,216,4,255,217]);mock.emit([255,255]);
    assert.equal(photos.length,1);assert.deepEqual(mock.writes,[5,0]);
    assert.deepEqual(mock.counts(),{starts:1,stops:1});
});
test('unmount during pending GATT discovery cannot start a stale capture stream',async()=>{
    const mock=setup();let finish;
    mock.device.getPrimaryService=()=>new Promise(r=>finish=r);
    const stop=subscribePhotos(mock.device,()=>assert.fail(),()=>assert.fail(),()=>assert.fail());
    const stopped=stop();finish({getCharacteristic:()=>assert.fail('stale lookup')});
    await stopped;assert.deepEqual(mock.writes,[]);
});
test('GATT setup failure is surfaced',async()=>{
    const mock=setup();mock.device.getPrimaryService=async()=>{throw Error('service missing');};
    let report;const error=new Promise(r=>report=r);
    const stop=subscribePhotos(mock.device,()=>{},()=>assert.fail(),report);
    assert.match((await error).message,/service missing/);await stop();
});

test('failed capture command releases an already-started notification stream',async()=>{
    const mock=setup(),photos=[];
    const service=await mock.device.getPrimaryService();
    const get=service.getCharacteristic;
    service.getCharacteristic=async uuid=>uuid===PHOTO_UUID?get(uuid):{writeValue:async value=>{
        mock.writes.push(value[0]);if(value[0]===5)throw Error('write failed');
    }};
    let report;const failed=new Promise(r=>report=r);
    const stop=subscribePhotos(mock.device,p=>photos.push(p),()=>assert.fail(),report);
    assert.match((await failed).message,/write failed/);
    mock.emit([0,0,255,216,4,255,217]);mock.emit([255,255]);
    assert.equal(photos.length,0);
    await stop();await stop();
    assert.deepEqual(mock.writes,[5,0]);
    assert.deepEqual(mock.counts(),{starts:1,stops:1});
});
