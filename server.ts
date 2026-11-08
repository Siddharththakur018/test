import next from 'next';
import {createServer} from 'node:http';
import {Server} from 'socket.io';
import {allowedSignalingOrigin} from './lib/signaling-origin.ts';
import {attachSignaling} from './lib/signaling.ts';
const dev=process.env.NODE_ENV!=='production';
const requestedPort=Number(process.env.PORT||3000);
async function availablePort(port:number):Promise<number>{
  const probe=createServer();
  return new Promise((resolve,reject)=>{
    probe.once('error',(error:NodeJS.ErrnoException)=>{if(error.code==='EADDRINUSE'&&dev&&!process.env.PORT&&port<3010){console.log(`Port ${port} is busy; trying ${port+1}…`);availablePort(port+1).then(resolve,reject);}else reject(error);});
    probe.listen(port,()=>probe.close(()=>resolve(port)));
  });
}
const port=await availablePort(requestedPort);
console.log(`Starting LoveBooth on http://localhost:${port} …`);
const app=next({dev,port,hostname:'localhost',turbopack:true});await app.prepare();
const server=createServer(app.getRequestHandler());
const io=new Server(server,{maxHttpBufferSize:100_000,cors:{origin:(origin,cb)=>cb(null,allowedSignalingOrigin(origin,undefined,process.env.ALLOWED_ORIGINS))},allowRequest:(req,cb)=>cb(null,allowedSignalingOrigin(req.headers.origin,req.headers.host,process.env.ALLOWED_ORIGINS))});
attachSignaling(io);
server.on('error',(error)=>{console.error('LoveBooth could not start:',error.message);process.exit(1);});
server.listen(port,()=>console.log(`LoveBooth ready at http://localhost:${port}`));
