const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const rooms = new Map();
const clients = new Map(); // socket -> {code, playerId, buffer}
const MIME={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png'};

const server=http.createServer((req,res)=>{
  let u=decodeURIComponent((req.url||'/').split('?')[0]); if(u==='/')u='/index.html';
  const file=path.normalize(path.join(ROOT,u)); if(!file.startsWith(ROOT)){res.writeHead(403);return res.end('Forbidden')}
  fs.readFile(file,(err,data)=>{if(err){res.writeHead(404);return res.end('Not found')}res.writeHead(200,{'Content-Type':MIME[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(data)});
});

function encodeFrame(text){
  const payload=Buffer.from(text); const len=payload.length; let header;
  if(len<126){header=Buffer.alloc(2);header[0]=0x81;header[1]=len}
  else if(len<65536){header=Buffer.alloc(4);header[0]=0x81;header[1]=126;header.writeUInt16BE(len,2)}
  else{header=Buffer.alloc(10);header[0]=0x81;header[1]=127;header.writeBigUInt64BE(BigInt(len),2)}
  return Buffer.concat([header,payload]);
}
function send(socket,type,payload={}){if(socket&&!socket.destroyed)socket.write(encodeFrame(JSON.stringify({type,...payload})))}
function decodeFrames(meta,chunk,onText){
  meta.buffer=Buffer.concat([meta.buffer||Buffer.alloc(0),chunk]); let b=meta.buffer;
  while(b.length>=2){
    const first=b[0],second=b[1],opcode=first&0x0f,masked=!!(second&0x80);let len=second&0x7f,off=2;
    if(len===126){if(b.length<4)break;len=b.readUInt16BE(2);off=4}
    else if(len===127){if(b.length<10)break;const big=b.readBigUInt64BE(2);if(big>BigInt(Number.MAX_SAFE_INTEGER))return;len=Number(big);off=10}
    const maskBytes=masked?4:0;if(b.length<off+maskBytes+len)break;
    let mask;if(masked){mask=b.subarray(off,off+4);off+=4}
    const payload=Buffer.from(b.subarray(off,off+len)); if(masked)for(let i=0;i<payload.length;i++)payload[i]^=mask[i%4];
    b=b.subarray(off+len);
    if(opcode===0x8) return meta.socket.destroy();
    if(opcode===0x9){ // ping -> pong
      const h=Buffer.from([0x8A,payload.length]);meta.socket.write(Buffer.concat([h,payload]));continue;
    }
    if(opcode===0x1)onText(payload.toString('utf8'));
  }
  meta.buffer=b;
}

function clamp(n,a,b){return Math.max(a,Math.min(b,n))}function rand(a,b){return Math.floor(Math.random()*(b-a+1))+a}function shuffle(a){for(let i=a.length-1;i>0;i--){const j=rand(0,i);[a[i],a[j]]=[a[j],a[i]]}return a}
function roomCode(){let c;do{c=crypto.randomBytes(3).toString('hex').toUpperCase()}while(rooms.has(c));return c}
function makeQuestion(level,allowed){const ops=allowed?.length?allowed:['+','−','×','÷'],op=ops[rand(0,ops.length-1)],d=clamp(level,1,5);let a,b,answer;if(op==='+'){a=rand(5*d,45*d);b=rand(3*d,32*d);answer=a+b}if(op==='−'){a=rand(12,50*d);b=rand(2,a);answer=a-b}if(op==='×'){a=rand(2,5+d);b=rand(2,6*d+4);answer=a*b}if(op==='÷'){b=rand(2,6+d);answer=rand(2,6*d+2);a=b*answer}const spread=Math.max(3,Math.round(Math.max(10,Math.abs(answer))*.18)),set=new Set([answer]);while(set.size<4){const w=answer+rand(-spread,spread);if(w!==answer&&w>=0)set.add(w)}return{text:`${a} ${op} ${b} = ?`,answer,choices:shuffle([...set]),category:{'+':'Addition','−':'Subtraction','×':'Multiplication','÷':'Division'}[op],difficulty:d}}
function pubQ(q){return{text:q.text,choices:q.choices,category:q.category,difficulty:q.difficulty}}
function pubPlayers(room){return room.players.map(p=>({id:p.id,name:p.name,score:p.score,correct:p.correct,answered:p.answered,lives:p.lives,streak:p.streak,bestStreak:p.bestStreak,finished:p.finished}))}
function broadcast(room,type,payload={}){room.players.forEach(p=>send(p.socket,type,payload))}
function cleanSettings(s={}){const operations=Array.isArray(s.operations)?s.operations.filter(x=>['+','−','×','÷'].includes(x)):['+','−','×','÷'];return{length:clamp(Number(s.length)||10,5,30),time:clamp(Number(s.time)||10,5,30),negative:!!s.negative,operations:operations.length?operations:['+','−','×','÷']}}
function player(socket,name){return{id:crypto.randomUUID(),socket,name:String(name||'Player').slice(0,18),score:0,correct:0,answered:0,lives:3,streak:0,bestStreak:0,index:0,finished:false,questionStartedAt:0}}
function startRoom(room){room.status='playing';room.questions=Array.from({length:room.settings.length},(_,i)=>makeQuestion(1+Math.floor(i/6),room.settings.operations));const now=Date.now();room.players.forEach(p=>p.questionStartedAt=now);broadcast(room,'game_start',{room:room.code,settings:room.settings,players:pubPlayers(room),question:pubQ(room.questions[0]),index:0})}
function finishIfDone(room){if(!room.players.every(p=>p.finished))return;room.status='finished';const sorted=[...room.players].sort((a,b)=>b.score-a.score||b.correct-a.correct||b.bestStreak-a.bestStreak),tie=sorted.length>1&&sorted[0].score===sorted[1].score&&sorted[0].correct===sorted[1].correct;broadcast(room,'game_over',{players:pubPlayers(room),winnerId:tie?null:sorted[0]?.id||null,tie});const t=setTimeout(()=>rooms.delete(room.code),15*60*1000);t.unref?.()}
function nextQuestion(p,room){if(p.index>=room.settings.length||p.lives<=0){p.finished=true;finishIfDone(room);return}p.questionStartedAt=Date.now();send(p.socket,'next_question',{index:p.index,question:pubQ(room.questions[p.index])})}
function handle(socket,msg){
  let m;try{m=JSON.parse(msg)}catch{return send(socket,'error',{message:'Invalid message'})}const meta=clients.get(socket);
  if(m.type==='create_room'){const code=roomCode(),room={code,status:'lobby',settings:cleanSettings(m.settings),players:[],questions:[]},p=player(socket,m.name);room.players.push(p);rooms.set(code,room);meta.code=code;meta.playerId=p.id;return send(socket,'room_created',{code,playerId:p.id,settings:room.settings,players:pubPlayers(room)})}
  if(m.type==='join_room'){const code=String(m.code||'').trim().toUpperCase(),room=rooms.get(code);if(!room)return send(socket,'error',{message:'Room not found'});if(room.status!=='lobby')return send(socket,'error',{message:'Match already started'});if(room.players.length>=2)return send(socket,'error',{message:'Room is full'});const p=player(socket,m.name);room.players.push(p);meta.code=code;meta.playerId=p.id;send(socket,'joined_room',{code,playerId:p.id,settings:room.settings,players:pubPlayers(room)});broadcast(room,'room_update',{code,players:pubPlayers(room),settings:room.settings});return setTimeout(()=>startRoom(room),900)}
  if(m.type==='answer'){if(!meta.code)return;const room=rooms.get(meta.code);if(!room||room.status!=='playing')return;const p=room.players.find(x=>x.id===meta.playerId);if(!p||p.finished||Number(m.index)!==p.index)return;const q=room.questions[p.index],elapsed=(Date.now()-p.questionStartedAt)/1000,timedOut=m.value===null||elapsed>room.settings.time+1.2,correct=!timedOut&&Number(m.value)===q.answer;p.answered++;let gained=0,penalty=0;if(correct){p.correct++;p.streak++;p.bestStreak=Math.max(p.bestStreak,p.streak);const speed=Math.max(0,Math.round((room.settings.time-Math.min(elapsed,room.settings.time))*4)),mult=1+Math.min(.75,Math.max(0,p.streak-1)*.1);gained=Math.round((100*q.difficulty+speed)*mult);p.score+=gained}else{p.streak=0;p.lives--;if(room.settings.negative){penalty=25*q.difficulty;p.score=Math.max(0,p.score-penalty)}}p.index++;send(socket,'answer_result',{correct,answer:q.answer,gained,penalty,score:p.score,lives:p.lives,streak:p.streak,bestStreak:p.bestStreak,index:p.index-1,timedOut});broadcast(room,'opponent_update',{players:pubPlayers(room)});setTimeout(()=>nextQuestion(p,room),800)}
}

server.on('upgrade',(req,socket)=>{
  if((req.headers.upgrade||'').toLowerCase()!=='websocket')return socket.destroy();const key=req.headers['sec-websocket-key'];if(!key)return socket.destroy();const accept=crypto.createHash('sha1').update(key+'258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: '+accept+'\r\n\r\n');const meta={socket,code:null,playerId:null,buffer:Buffer.alloc(0)};clients.set(socket,meta);send(socket,'connected',{ok:true});socket.on('data',chunk=>decodeFrames(meta,chunk,text=>handle(socket,text)));socket.on('close',()=>disconnect(socket));socket.on('error',()=>disconnect(socket));
});
function disconnect(socket){const meta=clients.get(socket);if(!meta)return;clients.delete(socket);if(!meta.code)return;const room=rooms.get(meta.code);if(!room)return;const p=room.players.find(x=>x.id===meta.playerId);if(p){p.finished=true;p.disconnected=true}broadcast(room,'player_left',{playerId:meta.playerId,players:pubPlayers(room)});finishIfDone(room)}
server.listen(PORT,()=>console.log(`Math Arena v2 running on http://localhost:${PORT}`));
