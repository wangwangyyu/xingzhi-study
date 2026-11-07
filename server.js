const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const host = process.env.XINGZHI_HOST || '127.0.0.1';
const publicFiles = new Set(['/index.html','/styles.css','/app.js','/bank.js','/data.js','/knowledge-map.js','/domain.js','/real-questions.js','/icon.svg']);
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.md':'text/plain; charset=utf-8'};
const server = http.createServer((req,res) => {
  let name;
  try {name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);} catch {res.writeHead(400).end('Bad request');return;}
  if (name === '/') name = '/index.html';
  if (!publicFiles.has(name) && !/^\/question-bank\/(?:catalog\.js|papers\/p\d+\.js|images\/[^\\]+)$/.test(name)) {res.writeHead(404).end('Not found');return;}
  const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
  if (!file.startsWith(root + path.sep) || /(^|[\\/])\./.test(name) || !['GET','HEAD'].includes(req.method)) {res.writeHead(403).end('Forbidden');return;}
  fs.stat(file,(err,stat)=>{
    if(err || !stat.isFile()){res.writeHead(404).end('Not found');return;}
    res.writeHead(200,{'Content-Type':types[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});
    if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res);
  });
});
server.on('error', error => {console.error(error.code === 'EADDRINUSE' ? '端口已被占用；若网站已经启动，请直接打开访问地址。' : error.message);process.exitCode=1;});
server.listen(Number(process.env.PORT) || 4173, host,()=>{
  const port=server.address().port;
  console.log('行知已启动：http://127.0.0.1:' + port);
  if(host==='0.0.0.0')for(const addresses of Object.values(require('node:os').networkInterfaces()))for(const address of addresses||[])if(address.family==='IPv4'&&!address.internal)console.log('手机访问：http://'+address.address+':'+port+'/#real');
});
