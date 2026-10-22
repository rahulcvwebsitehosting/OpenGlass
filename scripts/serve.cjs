// Local-only preview of the exported app and its actual API handlers.
require('../tests/register.cjs');
require('@expo/env').load(process.cwd());
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const routes = { '/api/chat': require('../api/chat').default, '/api/describe': require('../api/describe').default };
const root = path.resolve(__dirname, '../dist');
const port = Number(process.env.PORT || 8787);
const mime = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.png':'image/png', '.svg':'image/svg+xml', '.ico':'image/x-icon', '.json':'application/json' };
http.createServer(async (req,res) => {
    const pathname = new URL(req.url,'http://localhost').pathname;
    res.status = code => { res.statusCode=code; return res; };
    res.json = value => {res.setHeader('Content-Type','application/json');res.end(JSON.stringify(value));};
    try {
        if(routes[pathname]) {
            let size=0;const chunks=[];
            for await(const chunk of req) {
                size+=chunk.length;
                if(size>3000000){res.status(413).json({error:'Request is too large.'});return;}
                chunks.push(chunk);
            }
            try {req.body=JSON.parse(Buffer.concat(chunks).toString()||'{}');}
            catch {res.status(400).json({error:'Invalid JSON.'});return;}
            await routes[pathname](req,res);return;
        }
        if(pathname.startsWith('/api/')) {res.status(404).json({error:'Unknown API route.'});return;}
        if(req.method!=='GET' && req.method!=='HEAD'){res.status(405).end();return;}
        const target=path.resolve(root,'.'+decodeURIComponent(pathname));
        if(target!==root && !target.startsWith(root+path.sep)){res.status(403).end();return;}
        const file=fs.existsSync(target)&&fs.statSync(target).isFile()?target:path.join(root,'index.html');
        if(!fs.existsSync(file)){res.status(503).end('Run npm run build:web first.');return;}
        res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
        if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
    } catch {if(!res.headersSent)res.status(500).json({error:'Local server failed.'});else res.end();}
}).listen(port,'127.0.0.1',()=>console.log('OpenGlass local preview: http://localhost:'+port));
