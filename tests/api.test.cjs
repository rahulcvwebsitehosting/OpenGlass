const {test} = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const describe = require('../api/describe').default;
const chat = require('../api/chat').default;
const invoke = async (handler, body, method='POST') => {
    const res={code:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(c){this.code=c;return this;},json(v){this.body=v;}};
    await handler({method,body},res);
    return res;
};
test('API validation, model configuration, upstream success/failure and empty responses',async t=>{
    let upstream='ok', requests=[];
    const server=http.createServer(async(req,res)=>{
        let body='';for await (const c of req) body+=c;
        requests.push(JSON.parse(body));
        res.setHeader('Content-Type','application/json');
        if(upstream==='error'){res.statusCode=401;res.end(JSON.stringify({error:{message:'secret upstream diagnostics'}}));}
        else res.end(JSON.stringify({choices:[{message:{content:upstream==='empty'?'':'A desk with keys.'}}]}));
    });
    await new Promise(r=>server.listen(0,'127.0.0.1',r));
    t.after(()=>{server.closeAllConnections();server.close();});
    for(const prefix of ['VISION','CHAT']){
        for(const suffix of ['API_KEY','BASE_URL','MODEL']){
            const key=prefix+'_'+suffix, old=process.env[key];
            t.after(()=>{if(old===undefined)delete process.env[key];else process.env[key]=old;});
        }
        process.env[prefix+'_API_KEY']='test-only';
        process.env[prefix+'_BASE_URL']='http://127.0.0.1:'+server.address().port+'/v1';
        process.env[prefix+'_MODEL']='test-model';
    }
    await t.test('rejects wrong method and advertises POST',async()=>{
        const r=await invoke(chat,{},'GET');assert.equal(r.code,405);assert.equal(r.headers.Allow,'POST');
    });
    await t.test('rejects absent configuration instead of silently routing to the wrong provider',async()=>{
        const model=process.env.VISION_MODEL;delete process.env.VISION_MODEL;
        assert.equal((await invoke(describe,{image:'a'})).code,500);
        process.env.VISION_MODEL=model;
    });
    await t.test('rejects empty, oversized questions and invalid context',async()=>{
        for(const body of [{question:' '},{question:'x'.repeat(2001),context:'desk'},{question:'q',context:'x'.repeat(48001)},{question:'q'}]){
            assert.equal((await invoke(chat,body)).code,400);
        }
    });
    await t.test('rejects malformed, truncated, non-JPEG and oversized image payloads',async()=>{
        for(const image of ['garbage','data:image/png;base64,abcd',Buffer.from([255,216,1]).toString('base64')]){
            assert.equal((await invoke(describe,{image})).code,400);
        }
        assert.equal((await invoke(describe,{image:'a'.repeat(2800004)})).code,413);
    });
    await t.test('forwards JPEG, model and observations correctly and returns useful text',async()=>{
        const image=require('fs').readFileSync('prompts/series_1/img_1.jpeg').toString('base64');
        assert.equal((await invoke(describe,{image})).body.description,'A desk with keys.');
        assert.equal(requests.at(-1).messages[0].content[1].image_url.url,'data:image/jpeg;base64,'+image);
        assert.equal((await invoke(chat,{question:'Where?',context:'Keys on desk'})).body.answer,'A desk with keys.');
        assert.equal(requests.at(-1).model,'test-model');
        assert(!requests.at(-1).messages[0].content.includes('Keys on desk'));
    });
    await t.test('empty and failed provider responses are errors without diagnostic leakage',async()=>{
        upstream='empty';
        assert.equal((await invoke(chat,{question:'Where?',context:'desk'})).code,502);
        upstream='error';
        const original=console.error;console.error=()=>{};
        try {
            const r=await invoke(chat,{question:'Where?',context:'desk'});
            assert.equal(r.code,502);assert(!JSON.stringify(r.body).includes('secret'));
        } finally {console.error=original;}
    });
});
