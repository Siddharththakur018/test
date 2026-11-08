import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { attachSignaling } from './lib/signaling.ts';
import { allowedSignalingOrigin } from './lib/signaling-origin.ts';
const port=Number(process.env.PORT || 3001);
const allowed=process.env.ALLOWED_ORIGINS;
if(process.env.NODE_ENV==='production' && !allowed)throw new Error('Set ALLOWED_ORIGINS to your Vercel website origin.');
const http=createServer((req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.url==='/health'){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:true}));return;}
  res.writeHead(404);res.end('Not found');
});
const io=new Server(http,{
  maxHttpBufferSize:100_000,
  cors:{origin:(origin,callback)=>callback(null,allowedSignalingOrigin(origin,undefined,allowed))},
  allowRequest:(req,callback)=>callback(null,allowedSignalingOrigin(req.headers.origin,req.headers.host,allowed)),
});
const signaling=attachSignaling(io);
http.listen(port,'0.0.0.0',()=>console.log(`LoveBooth signaling listening on port ${port}`));
const close=()=>{signaling.close();io.close(()=>process.exit(0));};
process.once('SIGTERM',close);process.once('SIGINT',close);
