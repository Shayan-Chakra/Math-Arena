(()=>{
'use strict';
const $=id=>document.getElementById(id);
const settings=Object.assign({name:'Player',length:10,time:10,negative:false,operations:['+','−','×','÷'],sound:true},JSON.parse(localStorage.getItem('ma2_settings')||'{}'));
let state={mode:null}; let tick=null; let audioCtx=null; let ws=null; let myOnlineId=null; let lastMode='solo'; let onlineIntent='create';

const screens=['home','game','result'];
function show(id){screens.forEach(x=>$(x).classList.toggle('active',x===id));}
function modal(id,on=true){$(id).classList.toggle('show',on);}
function rand(a,b){return Math.floor(Math.random()*(b-a+1))+a;}
function shuffle(a){for(let i=a.length-1;i>0;i--){const j=rand(0,i);[a[i],a[j]]=[a[j],a[i]]}return a;}
function clamp(n,a,b){return Math.max(a,Math.min(b,n));}
function saveSettings(){localStorage.setItem('ma2_settings',JSON.stringify(settings));}
function esc(s){return String(s).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function currentProfile(){const p=JSON.parse(localStorage.getItem('ma2_profile')||'{}');return Object.assign({xp:0,matches:0,bestScore:0,bestStreak:0,correct:0,answered:0},p);}
function saveProfile(p){localStorage.setItem('ma2_profile',JSON.stringify(p));renderHome();}

function question(level){
 const ops=settings.operations.length?settings.operations:['+','−','×','÷']; const op=ops[rand(0,ops.length-1)],d=clamp(level,1,5);let a,b,answer;
 if(op==='+'){a=rand(5*d,45*d);b=rand(3*d,32*d);answer=a+b}
 if(op==='−'){a=rand(12,50*d);b=rand(2,a);answer=a-b}
 if(op==='×'){a=rand(2,5+d);b=rand(2,6*d+4);answer=a*b}
 if(op==='÷'){b=rand(2,6+d);answer=rand(2,6*d+2);a=b*answer}
 const spread=Math.max(3,Math.round(Math.max(10,Math.abs(answer))*.18));const set=new Set([answer]);while(set.size<4){const w=answer+rand(-spread,spread);if(w!==answer&&w>=0)set.add(w)}
 return {text:`${a} ${op} ${b} = ?`,answer,choices:shuffle([...set]),category:{'+':'Addition','−':'Subtraction','×':'Multiplication','÷':'Division'}[op],difficulty:d};
}
function newPlayer(name,total=settings.length){return {name,score:0,lives:3,streak:0,bestStreak:0,correct:0,answered:0,index:0,total,level:1,xp:0,times:[],powers:{fifty:true,freeze:true,shield:true},shield:false};}
function me(){if(state.mode==='local')return state.players[state.active];return state.player;}
function getCtx(){if(!settings.sound)return null;try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;if(!audioCtx)audioCtx=new C();if(audioCtx.state==='suspended')audioCtx.resume();return audioCtx}catch{return null}}
function tone(f,d,type='sine',gain=.04,delay=0){const c=getCtx();if(!c)return;const t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(f,t);g.gain.setValueAtTime(gain,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+d+.02)}
function correctSound(){tone(660,.07);tone(900,.08,'sine',.035,.07)}
function memeFail(){const c=getCtx();if(!c)return;const t=c.currentTime,o=c.createOscillator(),g=c.createGain(),f=c.createBiquadFilter();o.type='sawtooth';o.frequency.setValueAtTime(290,t);o.frequency.exponentialRampToValueAtTime(70,t+.48);f.type='lowpass';f.frequency.value=850;g.gain.setValueAtTime(.075,t);g.gain.exponentialRampToValueAtTime(.001,t+.54);o.connect(f);f.connect(g);g.connect(c.destination);o.start(t);o.stop(t+.56);tone(96,.14,'square',.05,.15);tone(68,.18,'square',.04,.31)}
function victory(){[523,659,784,1047].forEach((f,i)=>tone(f,.12,'sine',.035,i*.09))}

function renderHome(){const p=currentProfile();$('xpHome').textContent=p.xp;$('bestHome').textContent=p.bestScore;$('matchesHome').textContent=p.matches;$('streakHome').textContent=p.bestStreak;const ach=[['🔥','Hot Hand',p.bestStreak>=5,'Reach a 5-answer streak'],['🎯','Sharpshooter',p.answered>=20&&p.correct/p.answered>=.9,'Maintain 90% career accuracy'],['⚡','Arena Regular',p.matches>=10,'Play 10 matches'],['🏆','High Roller',p.bestScore>=2500,'Score 2,500 points']];$('achievements').innerHTML=ach.map(a=>`<div class="achievement ${a[2]?'':'locked'}"><span>${a[0]}</span><div><b>${a[1]}</b><div class="muted">${a[3]}</div></div></div>`).join('');renderLeaderboard();}
function renderLeaderboard(){const arr=JSON.parse(localStorage.getItem('ma2_scores')||'[]');$('leaderboard').innerHTML=arr.length?arr.slice(0,10).map((x,i)=>`<div class="lb-row"><span class="rank">#${i+1}</span><span>${esc(x.name)} <span class="muted">· ${esc(x.mode)}</span></span><b>${x.score}</b><span class="date muted">${esc(x.date)}</span></div>`).join(''):'<div class="muted" style="padding:15px 0">No matches yet.</div>'}
function saveRun(p,mode){const profile=currentProfile();profile.xp+=p.xp||Math.round(p.score/5);profile.matches++;profile.bestScore=Math.max(profile.bestScore,p.score);profile.bestStreak=Math.max(profile.bestStreak,p.bestStreak||0);profile.correct+=p.correct||0;profile.answered+=p.answered||0;saveProfile(profile);const arr=JSON.parse(localStorage.getItem('ma2_scores')||'[]');arr.push({name:p.name,mode,score:p.score,date:new Date().toLocaleDateString()});arr.sort((a,b)=>b.score-a.score);localStorage.setItem('ma2_scores',JSON.stringify(arr.slice(0,20)));}

function startSolo(){lastMode='solo';state={mode:'solo',player:newPlayer(settings.name),locked:false,current:null,startAt:0,timeLeft:settings.time,bonusTime:0};show('game');$('onlineBars').classList.remove('show');$('powers').style.display='flex';nextLocalQuestion();}
function startLocal(){lastMode='local';const p1=($('p1Input').value.trim()||'Player 1').slice(0,18),p2=($('p2Input').value.trim()||'Player 2').slice(0,18);state={mode:'local',players:[newPlayer(p1),newPlayer(p2)],active:0,locked:false,current:null,startAt:0,timeLeft:settings.time};modal('localModal',false);show('game');$('onlineBars').classList.add('show');$('powers').style.display='flex';nextLocalQuestion();}
function nextLocalQuestion(){clearInterval(tick);const p=me();if(p.index>=p.total||p.lives<=0)return advanceOrEnd();state.locked=false;state.current=question(p.level);state.timeLeft=settings.time;state.bonusTime=0;renderQuestion(state.current,p.index,p.total);startTimer(settings.time,()=>localTimeout());updateHud();updateLocalBars();}
function renderQuestion(q,index,total){$('question').textContent=q.text;$('category').textContent=q.category;$('difficulty').textContent=`Difficulty ${q.difficulty}`;$('progress').textContent=`${index+1}/${total}`;$('feedback').textContent='';$('feedback').className='feedback';$('qcard').classList.remove('shake','meme','flash','pop');void $('qcard').offsetWidth;$('qcard').classList.add('pop');const box=$('options');box.innerHTML='';q.choices.forEach((v,i)=>{const b=document.createElement('button');b.className='option';b.dataset.value=v;b.innerHTML=`<small>${i+1}</small>${v}`;b.onclick=()=>state.mode==='online'?sendOnlineAnswer(v,b):localAnswer(v,b);box.appendChild(b)});updatePowerButtons();}
function startTimer(seconds,onDone){clearInterval(tick);state.startAt=performance.now();state.timerTotal=seconds;const loop=()=>{const elapsed=(performance.now()-state.startAt)/1000;const total=state.timerTotal+(state.bonusTime||0);const left=Math.max(0,total-elapsed);state.timeLeft=left;$('timerBar').style.width=(left/total*100)+'%';if(left<=0){clearInterval(tick);onDone()}};loop();tick=setInterval(loop,60)}
function disableOptions(){document.querySelectorAll('.option').forEach(b=>b.disabled=true)}
function markCorrect(answer){document.querySelectorAll('.option').forEach(b=>{if(Number(b.dataset.value)===answer)b.classList.add('correct')})}
function localAnswer(value,btn){if(state.locked)return;state.locked=true;clearInterval(tick);const p=me(),q=state.current,elapsed=(performance.now()-state.startAt)/1000;p.times.push(elapsed);p.answered++;const good=value===q.answer;disableOptions();if(good){btn.classList.add('correct');p.correct++;p.streak++;p.bestStreak=Math.max(p.bestStreak,p.streak);const speed=Math.max(0,Math.round(state.timeLeft*4)),mult=1+Math.min(.75,Math.max(0,p.streak-1)*.1),gain=Math.round((100*q.difficulty+speed)*mult);p.score+=gain;p.xp+=Math.round(gain/5);$('feedback').textContent=`Correct +${gain} · ${p.streak}× streak`;$('feedback').className='feedback good';$('qcard').classList.add('flash');correctSound();if(p.streak>0&&p.streak%3===0)p.level=clamp(p.level+1,1,5)}else{btn.classList.add('wrong');markCorrect(q.answer);p.streak=0;if(p.shield){p.shield=false;$('feedback').textContent=`🛡️ Shield saved your life. Answer: ${q.answer}`}else{p.lives--;let pen=0;if(settings.negative){pen=25*q.difficulty;p.score=Math.max(0,p.score-pen)}$('feedback').textContent=`💀 Wrong · ${q.answer}${pen?` · −${pen}`:''}`}$('feedback').className='feedback bad';$('qcard').classList.add('shake','meme');memeFail()}p.index++;updateHud();updateLocalBars();setTimeout(nextLocalQuestion,850)}
function localTimeout(){if(state.locked)return;state.locked=true;const p=me(),q=state.current;p.answered++;p.times.push(settings.time+(state.bonusTime||0));disableOptions();markCorrect(q.answer);p.streak=0;if(p.shield){p.shield=false;$('feedback').textContent=`🛡️ Shield blocked timeout damage · ${q.answer}`}else{p.lives--;let pen=0;if(settings.negative){pen=25*q.difficulty;p.score=Math.max(0,p.score-pen)}$('feedback').textContent=`⏰ Time · ${q.answer}${pen?` · −${pen}`:''}`}$('feedback').className='feedback bad';$('qcard').classList.add('shake','meme');memeFail();p.index++;updateHud();updateLocalBars();setTimeout(nextLocalQuestion,850)}
function advanceOrEnd(){if(state.mode==='local'){const other=state.active?0:1,op=state.players[other];if(op.index<op.total&&op.lives>0){state.active=other;$('feedback').textContent=`Pass device to ${op.name}`;setTimeout(()=>nextLocalQuestion(),500);return}return endLocal()}endSolo()}
function updateHud(){const p=me();$('turnText').textContent=state.mode==='local'?`${p.name}'s turn`:p.name;$('subText').textContent=state.mode==='local'?'Pass & Play Duel':'Solo Sprint';$('modePill').textContent=state.mode.toUpperCase();$('score').textContent=p.score;$('lives').textContent='♥'.repeat(p.lives)+'♡'.repeat(3-p.lives);$('streak').textContent=p.streak+'×';$('accuracy').textContent=(p.answered?Math.round(p.correct/p.answered*100):0)+'%';$('level').textContent=p.level;$('progress').textContent=`${Math.min(p.index+1,p.total)}/${p.total}`;}
function updateLocalBars(){if(state.mode!=='local')return;state.players.forEach((p,i)=>{if(i===state.active){$('meName').textContent=p.name;$('meScore').textContent=p.score;$('meMeta').textContent=`${'♥'.repeat(p.lives)} · ${p.index}/${p.total}`}else{$('oppName').textContent=p.name;$('oppScore').textContent=p.score;$('oppMeta').textContent=`${'♥'.repeat(p.lives)} · ${p.index}/${p.total}`}})}
function useFifty(){const p=me();if(!p||!p.powers?.fifty||state.mode==='online'||state.locked)return;p.powers.fifty=false;const wrong=[...document.querySelectorAll('.option')].filter(b=>Number(b.dataset.value)!==state.current.answer);shuffle(wrong).slice(0,2).forEach(b=>{b.disabled=true;b.style.opacity=.25});updatePowerButtons()}
function useFreeze(){const p=me();if(!p||!p.powers?.freeze||state.mode==='online'||state.locked)return;p.powers.freeze=false;state.bonusTime=(state.bonusTime||0)+5;updatePowerButtons();$('feedback').textContent='❄️ +5 seconds';$('feedback').className='feedback good'}
function useShield(){const p=me();if(!p||!p.powers?.shield||state.mode==='online'||state.locked)return;p.powers.shield=false;p.shield=true;updatePowerButtons();$('feedback').textContent='🛡️ Shield armed for one mistake';$('feedback').className='feedback good'}
function updatePowerButtons(){const p=me();const off=state.mode==='online'||!p?.powers;$('fiftyBtn').disabled=off||!p?.powers?.fifty;$('freezeBtn').disabled=off||!p?.powers?.freeze;$('shieldBtn').disabled=off||!p?.powers?.shield;$('shieldBtn').textContent=p?.shield?'🛡️ Shield active':'🛡️ Shield'}
function averageSpeed(p){return p.times?.length?(p.times.reduce((a,b)=>a+b,0)/p.times.length):0}
function fillResult(p,title,eyebrow){$('resultEyebrow').textContent=eyebrow;$('resultTitle').textContent=title;$('resultScore').textContent=p.score;$('rCorrect').textContent=`${p.correct}/${p.answered}`;$('rAccuracy').textContent=(p.answered?Math.round(p.correct/p.answered*100):0)+'%';$('rStreak').textContent=p.bestStreak;$('rXp').textContent=p.xp||Math.round(p.score/5);$('rSpeed').textContent=averageSpeed(p).toFixed(1)+'s';show('result');}
function endSolo(){const p=state.player;saveRun(p,'Solo');fillResult(p,p.lives<=0?'Out of lives':p.correct/p.answered>=.9?'Precision run':'Training complete','SOLO COMPLETE');if(p.score>0)victory()}
function endLocal(){const [a,b]=state.players;a.xp=Math.round(a.score/5);b.xp=Math.round(b.score/5);saveRun(a,'Local Duel');saveRun(b,'Local Duel');const winner=a.score===b.score?null:(a.score>b.score?a:b);const combined={name:winner?.name||'Draw',score:Math.max(a.score,b.score),correct:(a.correct+b.correct),answered:(a.answered+b.answered),bestStreak:Math.max(a.bestStreak,b.bestStreak),xp:a.xp+b.xp,times:[...(a.times||[]),...(b.times||[])]};fillResult(combined,winner?`🏆 ${winner.name} wins!`:'🤝 Draw!','LOCAL DUEL COMPLETE');victory()}

function connectWS(){
  return new Promise((resolve,reject)=>{
    if(ws && ws.readyState===1) return resolve(ws);

    const server='wss://math-arena-ob5t.onrender.com';

    ws=new WebSocket(server);

    $('connection').textContent='Connecting…';

    ws.onopen=()=>{
      $('connection').textContent='Online';
      resolve(ws);
    };

    ws.onerror=()=>{
      $('connection').textContent='Offline';
      reject(new Error('WebSocket failed'));
    };

    ws.onclose=()=>{
      $('connection').textContent='Offline';
    };

    ws.onmessage=e=>{
      handleWS(JSON.parse(e.data));
    };
  });
}
 function sendWS(obj){if(ws&&ws.readyState===1)ws.send(JSON.stringify(obj))}
function onlineModal(intent){onlineIntent=intent;$('onlineTitle').textContent=intent==='create'?'Create Online Room':'Join Online Room';$('onlineHelp').textContent=intent==='create'?'Share the room code with one opponent. Match starts automatically when they join.':'Enter the 6-character code from the host.';$('joinCodeField').style.display=intent==='join'?'block':'none';$('roomCodeDisplay').style.display='none';$('lobbyStatus').textContent='';$('onlineActionBtn').textContent=intent==='create'?'Create Room':'Join Room';modal('onlineModal',true)}
async function onlineAction(){try{await connectWS();if(onlineIntent==='create')sendWS({type:'create_room',name:settings.name,settings});else sendWS({type:'join_room',name:settings.name,code:$('roomCodeInput').value})}catch{$('lobbyStatus').textContent='Online multiplayer requires running the included Node server.'}}
function handleWS(m){
 if(m.type==='error'){$('lobbyStatus').textContent=m.message;return}
 if(m.type==='room_created'){myOnlineId=m.playerId;$('roomCodeDisplay').style.display='block';$('roomCodeDisplay').textContent=m.code;$('onlineActionBtn').style.display='none';$('lobbyStatus').textContent='Waiting for opponent…';return}
 if(m.type==='joined_room'){myOnlineId=m.playerId;$('lobbyStatus').textContent='Joined. Starting…';return}
 if(m.type==='room_update'){$('lobbyStatus').textContent=m.players.length===2?'Opponent joined. Starting…':'Waiting for opponent…';return}
 if(m.type==='game_start'){modal('onlineModal',false);$('onlineActionBtn').style.display='';lastMode='online';const mine=m.players.find(p=>p.id===myOnlineId)||m.players[0];if(!myOnlineId)myOnlineId=mine.id;state={mode:'online',room:m.room,player:Object.assign(newPlayer(mine.name,m.settings.length),mine,{times:[]}),players:m.players,current:m.question,locked:false,onlineIndex:0,serverSettings:m.settings,startAt:0,timeLeft:m.settings.time,bonusTime:0};show('game');$('onlineBars').classList.add('show');$('powers').style.display='none';renderQuestion(m.question,0,m.settings.length);startTimer(m.settings.time,()=>sendOnlineAnswer(null,null));updateOnlineBars();updateHudOnline();return}
 if(m.type==='answer_result'){clearInterval(tick);const p=state.player;const elapsed=(performance.now()-state.startAt)/1000;p.times.push(elapsed);p.answered++;p.score=m.score;p.lives=m.lives;p.streak=m.streak;p.bestStreak=m.bestStreak;if(m.correct){p.correct++;p.xp+=Math.round(m.gained/5);$('feedback').textContent=`Correct +${m.gained}`;$('feedback').className='feedback good';$('qcard').classList.add('flash');correctSound()}else{$('feedback').textContent=m.timedOut?`⏰ Time · ${m.answer}`:`💀 Wrong · ${m.answer}${m.penalty?` · −${m.penalty}`:''}`;$('feedback').className='feedback bad';markCorrect(m.answer);$('qcard').classList.add('shake','meme');memeFail()}updateHudOnline();return}
 if(m.type==='next_question'){state.locked=false;state.onlineIndex=m.index;state.current=m.question;renderQuestion(m.question,m.index,state.serverSettings.length);startTimer(state.serverSettings.time,()=>sendOnlineAnswer(null,null));return}
 if(m.type==='opponent_update'){state.players=m.players;const mine=m.players.find(p=>p.id===myOnlineId);if(mine)Object.assign(state.player,mine);updateOnlineBars();updateHudOnline();return}
 if(m.type==='player_left'){$('feedback').textContent='Opponent disconnected.';$('feedback').className='feedback bad';return}
 if(m.type==='game_over'){clearInterval(tick);const mine=m.players.find(p=>p.id===myOnlineId)||state.player;Object.assign(state.player,mine);state.player.xp=Math.round(state.player.score/5);saveRun(state.player,'Online');const won=m.tie?null:m.winnerId===myOnlineId;fillResult(state.player,m.tie?'🤝 Online draw!':won?'🏆 You win!':'Opponent wins','ONLINE BATTLE COMPLETE');victory();return}
}
function sendOnlineAnswer(value,btn){if(state.locked)return;state.locked=true;clearInterval(tick);disableOptions();if(btn&&value!==null)btn.classList.add('wrong');sendWS({type:'answer',index:state.onlineIndex,value})}
function updateOnlineBars(){if(state.mode!=='online')return;const mine=state.players.find(p=>p.id===myOnlineId)||state.player,opp=state.players.find(p=>p.id!==myOnlineId);$('meName').textContent=mine?.name||'You';$('meScore').textContent=mine?.score||0;$('meMeta').textContent=`${'♥'.repeat(mine?.lives||0)} · ${mine?.answered||0}/${state.serverSettings.length}`;$('oppName').textContent=opp?.name||'Waiting…';$('oppScore').textContent=opp?.score||0;$('oppMeta').textContent=opp?`${'♥'.repeat(opp.lives)} · ${opp.answered}/${state.serverSettings.length}`:'—';}
function updateHudOnline(){const p=state.player;$('turnText').textContent=p.name;$('subText').textContent='Real-time Online Battle';$('modePill').textContent='ONLINE';$('score').textContent=p.score;$('lives').textContent='♥'.repeat(p.lives)+'♡'.repeat(3-p.lives);$('streak').textContent=p.streak+'×';$('accuracy').textContent=(p.answered?Math.round(p.correct/p.answered*100):0)+'%';$('level').textContent=state.current?.difficulty||1;$('progress').textContent=`${Math.min(state.onlineIndex+1,state.serverSettings.length)}/${state.serverSettings.length}`;updateOnlineBars()}

function openSettings(){ $('nameInput').value=settings.name;$('lengthInput').value=settings.length;$('timeInput').value=settings.time;$('negativeInput').checked=settings.negative;document.querySelectorAll('.op').forEach(c=>c.checked=settings.operations.includes(c.value));modal('settingsModal',true)}
function saveSettingsUI(){settings.name=($('nameInput').value.trim()||'Player').slice(0,18);settings.length=Number($('lengthInput').value);settings.time=Number($('timeInput').value);settings.negative=$('negativeInput').checked;settings.operations=[...document.querySelectorAll('.op:checked')].map(x=>x.value);if(!settings.operations.length)settings.operations=['+','−','×','÷'];saveSettings();modal('settingsModal',false)}

$('soloBtn').onclick=startSolo;$('localBtn').onclick=()=>modal('localModal',true);$('startLocalBtn').onclick=startLocal;$('createBtn').onclick=()=>onlineModal('create');$('joinBtn').onclick=()=>onlineModal('join');$('onlineActionBtn').onclick=onlineAction;$('settingsBtn').onclick=openSettings;$('saveSettingsBtn').onclick=saveSettingsUI;$('soundBtn').onclick=()=>{settings.sound=!settings.sound;$('soundBtn').textContent=settings.sound?'🔊':'🔇';saveSettings()};$('fiftyBtn').onclick=useFifty;$('freezeBtn').onclick=useFreeze;$('shieldBtn').onclick=useShield;$('homeBtn').onclick=()=>{clearInterval(tick);show('home');renderHome()};$('againBtn').onclick=()=>{if(lastMode==='solo')startSolo();else if(lastMode==='local')modal('localModal',true);else onlineModal('create')};document.querySelectorAll('.closeModal').forEach(b=>b.onclick=()=>b.closest('.modal').classList.remove('show'));document.querySelectorAll('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('show')}));
document.addEventListener('keydown',e=>{if(!$('game').classList.contains('active')||state.locked)return;const n=Number(e.key);if(n>=1&&n<=4){const b=document.querySelectorAll('.option')[n-1];if(b&&!b.disabled)b.click()}});
$('soundBtn').textContent=settings.sound?'🔊':'🔇';renderHome();
})();
