(function() {
  const canvas = document.getElementById('bg-video');
  const ctx = canvas.getContext('2d');
  function resize(){ canvas.width=window.innerWidth; canvas.height=window.innerHeight; }
  resize(); window.addEventListener('resize', resize);
  const stars = Array.from({length:160}, ()=>({
    x: Math.random()*window.innerWidth, y: Math.random()*window.innerHeight,
    len: Math.random()*60+20, speed: Math.random()*3+1.5,
    size: Math.random()*1.5+0.3, opacity: Math.random()*0.6+0.2
  }));
  function draw(){
    ctx.fillStyle='#0a0a1a'; ctx.fillRect(0,0,canvas.width,canvas.height);
    stars.forEach(s=>{
      const grad=ctx.createLinearGradient(s.x,s.y,s.x-s.len*.6,s.y-s.len*.6);
      grad.addColorStop(0,`rgba(255,255,255,${s.opacity})`);
      grad.addColorStop(0.4,`rgba(200,220,255,${s.opacity*.4})`);
      grad.addColorStop(1,'rgba(180,200,255,0)');
      ctx.beginPath(); ctx.strokeStyle=grad; ctx.lineWidth=s.size;
      ctx.moveTo(s.x,s.y); ctx.lineTo(s.x-s.len*.6,s.y-s.len*.6); ctx.stroke();
      ctx.beginPath(); ctx.arc(s.x,s.y,s.size*1.1,0,Math.PI*2);
      ctx.fillStyle=`rgba(255,255,255,${s.opacity})`; ctx.fill();
      s.x+=s.speed; s.y+=s.speed;
      if(s.x>canvas.width+s.len||s.y>canvas.height+s.len){
        Math.random()<.5?(s.x=Math.random()*canvas.width,s.y=-s.len):(s.x=-s.len,s.y=Math.random()*canvas.height);
      }
    });
    requestAnimationFrame(draw);
  }
  draw();

  // audio
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  let audioCtx = null, sfxEnabled = true, globalVolumeNode = null, currentVolume = 0.4;
  function initAudio() {
    if (audioCtx && audioCtx.state !== 'closed') return audioCtx;
    audioCtx = new AudioContext();
    globalVolumeNode = audioCtx.createGain();
    globalVolumeNode.gain.value = currentVolume;
    globalVolumeNode.connect(audioCtx.destination);
    return audioCtx;
  }
  function playChime(freq=880, dur=0.35, type='sine') {
    if (!sfxEnabled || !audioCtx || audioCtx.state==='closed') return;
    if (audioCtx.state!=='running') { audioCtx.resume().then(()=>_chimeInternal(freq,dur,type)); return; }
    _chimeInternal(freq,dur,type);
  }
  function _chimeInternal(freq,dur,type) {
    if (!audioCtx||!sfxEnabled) return;
    const now=audioCtx.currentTime, osc=audioCtx.createOscillator(), g=audioCtx.createGain();
    osc.connect(g); g.connect(globalVolumeNode);
    osc.frequency.value=freq; osc.type=type;
    g.gain.setValueAtTime(0.2,now); g.gain.exponentialRampToValueAtTime(0.0001,now+dur);
    osc.start(); osc.stop(now+dur);
  }
  function playClickSound() {
    playChime(550, 0.08, 'square');
  }
  function playSlideTick() {
    if (!sfxEnabled || !audioCtx || audioCtx.state !== 'running') return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator(), g = audioCtx.createGain();
    osc.connect(g); g.connect(globalVolumeNode);
    osc.type = 'square';
    osc.frequency.setValueAtTime(700, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);
    g.gain.setValueAtTime(0.15, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    osc.start(); osc.stop(now + 0.05);
  }
  function winMelody() {
    if (!sfxEnabled||!audioCtx) return;
    if (audioCtx.state!=='running') { audioCtx.resume().then(_winInternal); return; }
    _winInternal();
  }
  function _winInternal() {
    [523.25,659.25,783.99,1046.50].forEach((f,i) => setTimeout(()=>_chimeInternal(f,0.3,'sine'),i*180));
  }

  // memory sfx
  function playFlipSound() {
    if (!sfxEnabled || !audioCtx) return;
    if (audioCtx.state !== 'running') { audioCtx.resume().then(_flipInternal); return; }
    _flipInternal();
  }
  function _flipInternal() {
    const audio = new Audio('freesound_community-flipcard-91468.mov');
    audio.volume = currentVolume;
    audio.play();
  }
  function playMatchSound() {
    if (!sfxEnabled || !audioCtx) return;
    if (audioCtx.state !== 'running') { audioCtx.resume().then(_matchInternal); return; }
    _matchInternal();
  }
  function _matchInternal() {
    // two-note sparkle: perfect 5th arpeggio
    [[880, 0], [1320, 0.1]].forEach(([f, delay]) => {
      setTimeout(() => _chimeInternal(f, 0.4, 'sine'), delay * 1000);
    });
  }

  // lofi
  const LOFI_CHORDS=[[261.63,329.63,392.00,493.88],[220.00,261.63,329.63,415.30],[174.61,220.00,261.63,329.63],[196.00,246.94,293.66,392.00]];
  const BEAT_SEC=60/76;
  let lofiNodes=[], lofiScheduler=null, lofiChordIdx=0, lofiNextTime=0, lofiActive=false;
  function _lofiNote(freq,st,dur,gain,type='sine') {
    if (!audioCtx) return;
    const osc=audioCtx.createOscillator(), g=audioCtx.createGain(), f=audioCtx.createBiquadFilter();
    f.type='lowpass'; f.frequency.value=1800; f.Q.value=0.9;
    osc.connect(f); f.connect(g); g.connect(globalVolumeNode);
    osc.type=type; osc.frequency.value=freq;
    g.gain.setValueAtTime(0,st); g.gain.linearRampToValueAtTime(gain,st+0.04); g.gain.exponentialRampToValueAtTime(0.0001,st+dur);
    osc.start(st); osc.stop(st+dur+0.05); lofiNodes.push(osc);
  }
  function _lofiKick(t) {
    if (!audioCtx) return;
    const osc=audioCtx.createOscillator(), g=audioCtx.createGain();
    osc.connect(g); g.connect(globalVolumeNode); osc.type='sine';
    osc.frequency.setValueAtTime(150,t); osc.frequency.exponentialRampToValueAtTime(40,t+0.15);
    g.gain.setValueAtTime(0.45,t); g.gain.exponentialRampToValueAtTime(0.0001,t+0.25);
    osc.start(t); osc.stop(t+0.3); lofiNodes.push(osc);
  }
  function _lofiNoise(t,vol,bpType,bpFreq,dur) {
    if (!audioCtx) return;
    const sz=audioCtx.sampleRate*dur, buf=audioCtx.createBuffer(1,sz,audioCtx.sampleRate);
    const d=buf.getChannelData(0); for(let i=0;i<sz;i++) d[i]=(Math.random()*2-1)*(1-i/sz)*(bpType==='bandpass'?0.5:1);
    const src=audioCtx.createBufferSource(), g=audioCtx.createGain(), fl=audioCtx.createBiquadFilter();
    fl.type=bpType; fl.frequency.value=bpFreq; if(bpType==='bandpass') fl.Q.value=1.2;
    src.buffer=buf; src.connect(fl); fl.connect(g); g.connect(globalVolumeNode);
    g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    src.start(t); src.stop(t+dur+0.01); lofiNodes.push(src);
  }
  function _scheduleBar(st,chord) {
    const b=BEAT_SEC;
    _lofiKick(st); _lofiKick(st+b*2);
    _lofiNoise(st+b,0.22,'bandpass',2200,0.12); _lofiNoise(st+b*3,0.22,'bandpass',2200,0.12);
    for(let i=0;i<8;i++) _lofiNoise(st+i*b*0.5,i%2===0?0.09:0.05,'highpass',7000,0.04);
    chord.forEach((freq,idx) => {
      const s=st+idx*0.012;
      _lofiNote(freq/2,s,b*3.5,0.1,'triangle'); _lofiNote(freq,s,b*3.6,0.07,'sine');
    });
    const mel=chord[2]*2;
    _lofiNote(mel,st+b*0.5,b*0.8,0.06,'sine'); _lofiNote(mel*(5/4),st+b*2.5,b*0.7,0.05,'sine');
  }
  function _lofiTick() {
    if (!audioCtx||!lofiActive) return;
    const now=audioCtx.currentTime;
    while (lofiNextTime<now+0.8) { _scheduleBar(lofiNextTime,LOFI_CHORDS[lofiChordIdx%4]); lofiChordIdx++; lofiNextTime+=BEAT_SEC*4; }
  }
  function startLofi() {
    if (!audioCtx) return;
    if (audioCtx.state!=='running') { audioCtx.resume().then(_startLofiInt); return; }
    _startLofiInt();
  }
  function _startLofiInt() { lofiChordIdx=0; lofiNextTime=audioCtx.currentTime+0.05; _lofiTick(); lofiScheduler=setInterval(_lofiTick,200); }
  function stopLofi() {
    if (lofiScheduler) { clearInterval(lofiScheduler); lofiScheduler=null; }
    lofiNodes.forEach(n=>{try{n.stop();}catch(e){}}); lofiNodes=[]; lofiActive=false;
  }
  document.getElementById('bgMusicBtn').addEventListener('click',()=>{
    initAudio();
    if (!lofiActive) { lofiActive=true; startLofi(); document.getElementById('bgMusicBtn').innerHTML='🎵 LOFI ON'; }
    else { stopLofi(); document.getElementById('bgMusicBtn').innerHTML='🎵 PLAY LOFI'; }
  });
  document.getElementById('globalVolume').addEventListener('input',e=>{ currentVolume=parseFloat(e.target.value); if(globalVolumeNode) globalVolumeNode.gain.value=currentVolume; });
  const sfxToggle=document.getElementById('sfxToggleBtn');
  sfxToggle.addEventListener('click',()=>{ sfxEnabled=!sfxEnabled; sfxToggle.innerHTML=sfxEnabled?'🔊 SFX ON':'🔇 SFX OFF'; });
  document.body.addEventListener('click',()=>{ initAudio(); if(audioCtx&&audioCtx.state!=='running') audioCtx.resume(); },{once:true});
  document.body.addEventListener('touchstart',()=>{ initAudio(); if(audioCtx&&audioCtx.state!=='running') audioCtx.resume(); },{once:true});

  // memo grove
  const EMOJIS=['🌙','🍿','🌸','🍃','💚','⏳','🌟','🕊️'];
  let gameBoard=[], flippedIndices=[], lockBoard=false, matchedPairs=0, matchedStatus=[], memoryAttempts=0;
  const memGrid=document.getElementById('memoryBoard');
  const memScore=document.getElementById('memoryScore');
  const memAttemptsEl=document.getElementById('memoryAttempts');

  function shuffle(arr) { for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]]; } return arr; }

  function initMemory() {
    gameBoard=shuffle([...EMOJIS,...EMOJIS]);
    flippedIndices=[]; lockBoard=false; matchedPairs=0; memoryAttempts=0;
    matchedStatus=new Array(16).fill(false);
    document.getElementById('memoryWin').classList.remove('show');
    updateMemoryUI(); renderMemory();
  }
  function updateMemoryUI() {
    memScore.innerText=`matches: ${matchedPairs} / 8`;
    memAttemptsEl.innerText=`attempts: ${memoryAttempts}`;
  }
  function renderMemory() {
    memGrid.innerHTML='';
    for(let i=0;i<gameBoard.length;i++) {
      const c=document.createElement('div'); c.classList.add('memory-card');
      if(matchedStatus[i]) { c.classList.add('matched'); c.innerText=''; }
      else if(flippedIndices.includes(i)) { c.classList.add('flipped'); c.innerText=gameBoard[i]; }
      else c.innerText='?';
      c.addEventListener('click',(idx=>()=>memClick(idx))(i));
      memGrid.appendChild(c);
    }
  }
  function memClick(idx) {
    if(lockBoard||matchedStatus[idx]||flippedIndices.includes(idx)||flippedIndices.length===2) return;
    flippedIndices.push(idx); renderMemory(); playFlipSound();
    if(flippedIndices.length===2) {
      lockBoard=true; memoryAttempts++;
      const [a,b]=flippedIndices;
      if(gameBoard[a]===gameBoard[b]) {
        matchedStatus[a]=matchedStatus[b]=true; matchedPairs++;
        updateMemoryUI(); playMatchSound();
        flippedIndices=[]; lockBoard=false; renderMemory();
        if(matchedPairs===8) {
          winMelody();
          setTimeout(()=>{
            document.getElementById('memoryWinSub').textContent=`${matchedPairs}/8 pairs · ${memoryAttempts} attempts ✨`;
            document.getElementById('memoryWin').classList.add('show');
          },400);
        }
      } else {
        setTimeout(()=>{ flippedIndices=[]; lockBoard=false; updateMemoryUI(); renderMemory(); },700);
      }
    }
  }
  initMemory();
  document.getElementById('resetMemoryBtn').addEventListener('click',()=>{ playClickSound(); initMemory(); });
  document.getElementById('memoryWinBtn').addEventListener('click',()=>{ playClickSound(); initMemory(); });

  // tic tac toe
  const WIN_LINES=[[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]];
  let tttBoard=Array(9).fill(null), tttScores={X:0,O:0}, tttGameOver=false;
  let tttVsAI=true;
  let tttPlayerSym='X';
  let tttCurrentTurn='X';

  function tttWinner(b) {
    for(const [a,c,d] of WIN_LINES) if(b[a]&&b[a]===b[c]&&b[a]===b[d]) return b[a];
    if(b.every(v=>v)) return 'draw'; return null;
  }
  function minimax(b,isMax) {
    const w=tttWinner(b);
    const aiSym = tttVsAI ? (tttPlayerSym==='X'?'O':'X') : 'O';
    const huSym = tttVsAI ? tttPlayerSym : 'X';
    if(w===aiSym) return 10; if(w===huSym) return -10; if(w==='draw') return 0;
    if(isMax){ let best=-Infinity; b.forEach((v,i)=>{ if(!v){ b[i]=aiSym; best=Math.max(best,minimax(b,false)); b[i]=null; }}); return best; }
    else { let best=Infinity; b.forEach((v,i)=>{ if(!v){ b[i]=huSym; best=Math.min(best,minimax(b,true)); b[i]=null; }}); return best; }
  }
  function aiMove() {
    const aiSym=tttPlayerSym==='X'?'O':'X'; let best=-Infinity, move=-1;
    tttBoard.forEach((v,i)=>{ if(!v){ tttBoard[i]=aiSym; const s=minimax(tttBoard,false); tttBoard[i]=null; if(s>best){best=s;move=i;} }});
    return move;
  }
  function renderTtt(winLine=null) {
    const grid=document.getElementById('tttBoard'); grid.innerHTML='';
    tttBoard.forEach((cell,i)=>{
      const sq=document.createElement('div');
      sq.className='ttt-cell'+(cell?' taken':'')+(winLine&&winLine.includes(i)?' win-cell':'');
      sq.textContent=cell==='X'?'✕':cell==='O'?'○':'';
      if(!cell&&!tttGameOver) sq.addEventListener('click',()=>tttClick(i));
      grid.appendChild(sq);
    });
  }
  function setTttStatus(msg) { document.getElementById('tttStatus').textContent=msg; }
  function setTttScore() { document.getElementById('tttScore').textContent=`✕ ${tttScores.X} – ${tttScores.O} ○`; }
  function updateTttGameStatus() {
    const ai2pText = tttVsAI ? `beat the bot` : `2-player mode`;
    document.getElementById('tttGameStatus').textContent=`⊹ you are ${tttPlayerSym==='X'?'✕':'○'} · ${ai2pText}`;
  }

  function tttClick(i) {
    if(tttBoard[i]||tttGameOver) return;
    const sym = tttVsAI ? tttPlayerSym : tttCurrentTurn;
    tttBoard[i]=sym; playChime(sym==='X'?660:440,0.15,'sine');
    const w=tttWinner(tttBoard); if(w){endTtt(w);return;}
    tttCurrentTurn=tttCurrentTurn==='X'?'O':'X';
    if(tttVsAI) {
      const aiSym=tttPlayerSym==='X'?'O':'X';
      setTttStatus('bot is thinking…'); renderTtt();
      setTimeout(()=>{
        const mv=aiMove(); if(mv!==-1){tttBoard[mv]=aiSym; playChime(330,0.15,'triangle');}
        const w2=tttWinner(tttBoard); if(w2){endTtt(w2);return;}
        tttCurrentTurn=tttPlayerSym;
        setTttStatus(`your turn · you are ${tttPlayerSym==='X'?'✕':'○'}`);
        renderTtt();
      },380);
    } else {
      setTttStatus(`${tttCurrentTurn==='X'?'✕':'○'}'s turn`);
      renderTtt();
    }
  }
  function endTtt(result) {
    tttGameOver=true;
    let winLine=null;
    for(const line of WIN_LINES){ const [a,b,c]=line; if(tttBoard[a]&&tttBoard[a]===tttBoard[b]&&tttBoard[a]===tttBoard[c]){winLine=line;break;} }
    renderTtt(winLine); setTttScore();
    const winEl=document.getElementById('tttWin');
    const msgEl=document.getElementById('tttWinMsg');
    const subEl=document.getElementById('tttWinSub');
    if(result==='draw') {
      setTttStatus("it's a draw · well played");
      playChime(440,0.3);
    } else {
      tttScores[result]++;
      setTttScore();
      if(!tttVsAI) {
        const winner=result==='X'?'✕':'○';
        msgEl.textContent=`🎉 ${winner} wins!`;
        subEl.textContent=`player ${result} takes the round!`;
        winMelody();
        setTimeout(()=>winEl.classList.add('show'),300);
      } else if(result===tttPlayerSym) {
        msgEl.textContent='✨ you won!'; subEl.textContent='you outwitted the bot!';
        winMelody(); setTimeout(()=>winEl.classList.add('show'),300);
      } else {
        setTttStatus('bot wins… try again!');
        playChime(200,0.5,'sawtooth');
      }
    }
  }
  function resetTtt() {
    tttBoard=Array(9).fill(null); tttGameOver=false; tttCurrentTurn='X';
    document.getElementById('tttWin').classList.remove('show');
    setTttStatus(tttVsAI?`your turn · you are ${tttPlayerSym==='X'?'✕':'○'}`:'✕ goes first');
    renderTtt();
    if(tttVsAI&&tttPlayerSym==='O') {
      setTimeout(()=>{
        const mv=aiMove(); if(mv!==-1){tttBoard[mv]='X'; tttCurrentTurn='O'; renderTtt(); setTttStatus("your turn · you are ○");}
      },400);
    }
  }
  // mode buttons
  document.getElementById('tttModeAI').addEventListener('click',()=>{
    playClickSound();
    tttVsAI=true;
    document.getElementById('tttModeAI').classList.add('active');
    document.getElementById('tttMode2P').classList.remove('active');
    document.getElementById('tttSymX').style.display=''; document.getElementById('tttSymO').style.display='';
    updateTttGameStatus(); resetTtt();
  });
  document.getElementById('tttMode2P').addEventListener('click',()=>{
    playClickSound();
    tttVsAI=false;
    document.getElementById('tttMode2P').classList.add('active');
    document.getElementById('tttModeAI').classList.remove('active');
    document.getElementById('tttSymX').style.display='none'; document.getElementById('tttSymO').style.display='none';
    updateTttGameStatus(); resetTtt();
  });
  // symbol buttons
  document.getElementById('tttSymX').addEventListener('click',()=>{
    playClickSound();
    tttPlayerSym='X';
    document.getElementById('tttSymX').classList.add('active'); document.getElementById('tttSymO').classList.remove('active');
    updateTttGameStatus(); resetTtt();
  });
  document.getElementById('tttSymO').addEventListener('click',()=>{
    playClickSound();
    tttPlayerSym='O';
    document.getElementById('tttSymO').classList.add('active'); document.getElementById('tttSymX').classList.remove('active');
    updateTttGameStatus(); resetTtt();
  });
  document.getElementById('resetTttBtn').addEventListener('click',()=>{ playClickSound(); resetTtt(); });
  document.getElementById('tttWinBtn').addEventListener('click',()=>{ playClickSound(); resetTtt(); });
  renderTtt(); updateTttGameStatus();

// echo guess — suitcase lock
  let secretNumber, guessAttempts=0, guessHistoryList=[];
  const DIAL_COUNT = 3;
  let dialValues = [0,0,1];

  const lockDials = document.getElementById('lockDials');
  const guessBtn  = document.getElementById('guessBtn');
  const guessHistoryEl = document.getElementById('guessMidSection');

  function buildDials() {
    lockDials.innerHTML = '';
    // per-dial drag state
    const dragState = Array.from({length: DIAL_COUNT}, () => ({active:false, startY:0, startVal:0}));

    dialValues.forEach((val, idx) => {
      const col = document.createElement('div');
      col.className = 'dial-col';

      const up = document.createElement('button');
      up.className = 'dial-arrow'; up.textContent = '▲';
      up.addEventListener('click', () => nudgeDial(idx, 1));

      const win = document.createElement('div');
      win.className = 'dial-window';

      const strip = document.createElement('div');
      strip.className = 'dial-strip';
      strip.id = `strip-${idx}`;
      for (let d = 0; d < 10; d++) {
        const dEl = document.createElement('div');
        dEl.className = 'dial-digit';
        dEl.textContent = d;
        strip.appendChild(dEl);
      }
      win.appendChild(strip);

      // drag to scroll
      win.addEventListener('mousedown', e => {
        dragState[idx] = {active:true, startY:e.clientY, startVal:dialValues[idx]};
        e.preventDefault();
      });
      win.addEventListener('touchstart', e => {
        dragState[idx] = {active:true, startY:e.touches[0].clientY, startVal:dialValues[idx]};
        e.preventDefault();
      }, {passive:false});
      window.addEventListener('mousemove', e => {
        if (!dragState[idx].active) return;
        const dy = dragState[idx].startY - e.clientY;
        const steps = Math.round(dy / 22);
        const nv = ((dragState[idx].startVal + steps) % 10 + 10) % 10;
        if (nv !== dialValues[idx]) { dialValues[idx] = nv; renderDial(idx); playSlideTick(); }      });
      window.addEventListener('touchmove', e => {
        if (!dragState[idx].active) return;
        const dy = dragState[idx].startY - e.touches[0].clientY;
        const steps = Math.round(dy / 22);
        const nv = ((dragState[idx].startVal + steps) % 10 + 10) % 10;
        if (nv !== dialValues[idx]) { dialValues[idx] = nv; renderDial(idx); playSlideTick(); }
      }, {passive:true});
      window.addEventListener('mouseup',  () => { dragState[idx].active = false; });
      window.addEventListener('touchend', () => { dragState[idx].active = false; });

      const dn = document.createElement('button');
      dn.className = 'dial-arrow'; dn.textContent = '▼';
      dn.addEventListener('click', () => nudgeDial(idx, -1));

      col.appendChild(up); col.appendChild(win); col.appendChild(dn);
      lockDials.appendChild(col);
    });
    dialValues.forEach((_,i) => renderDial(i));
  }

  function nudgeDial(idx, dir) {
    dialValues[idx] = ((dialValues[idx] + dir) % 10 + 10) % 10;
    renderDial(idx);
    playChime(dir > 0 ? 660 : 520, 0.07, 'sine');
  }

  function renderDial(idx) {
    const strip = document.getElementById(`strip-${idx}`);
    if (!strip) return;
    const v = dialValues[idx];
    strip.querySelectorAll('.dial-digit').forEach((el, i) => {
      el.classList.toggle('active-digit', i === v);
    });
    strip.style.transform = `translateY(${-v * 60}px)`;
  }

  function getDialNumber() {
    return dialValues[0]*100 + dialValues[1]*10 + dialValues[2];
  }

  function setFeedback(msg, err=false) {
    const el = document.getElementById('guessFeedback');
    el.textContent = msg;
    el.style.color = err ? '#f87171' : '';
  }

  function addChip(val, type) {
    const chip = document.createElement('span');
    chip.className = `guess-chip ${type}`;
    chip.textContent = type==='high'?`↓${val}`:type==='low'?`↑${val}`:`★${val}`;
    guessHistoryEl.appendChild(chip);
    guessHistoryEl.style.display = 'flex';
  }

  function checkGuess() {
    const g = getDialNumber();
    if (g < 1 || g > 999) { setFeedback('set between 1–999', true); return; }
    guessAttempts++;
    guessHistoryList.push(g);
    document.getElementById('attemptCounter').innerText = `attempts: ${guessAttempts}`;
    if (g === secretNumber) {
      setFeedback(`✨ correct! it was ${secretNumber} ✨`);
      guessBtn.disabled = true;
      document.getElementById('attemptCounter').innerText = `attempts: ${guessAttempts} · solved!`;
      addChip(g, 'exact');
      winMelody(); playChime(1046, 0.5);
      document.getElementById('guessWinSub').textContent = `found ${secretNumber} in ${guessAttempts} attempt${guessAttempts===1?'':'s'}!`;
      setTimeout(() => document.getElementById('guessWin').classList.add('show'), 400);
    } else if (g < secretNumber) {
      setFeedback('↑ go higher');
      addChip(g, 'low');
      const audio = new Audio('snorcon-low-battery-421820.mp3');
      audio.volume = currentVolume;
      audio.play();
    } else {
      setFeedback('↓ go lower');
      addChip(g, 'high');
      const audio = new Audio('soundshelfstudio-ui-click-futuristic-high-523714.mp3');
      audio.volume = currentVolume;
      audio.play();
    }
  }

  function resetGuess() {
    secretNumber = Math.floor(Math.random()*999)+1;
    guessAttempts = 0; guessHistoryList = [];
    guessBtn.disabled = false;
    dialValues = [0,0,1];
    buildDials();
    setFeedback('slide the dials · 1–999');
    document.getElementById('attemptCounter').innerText = 'attempts: 0';
    guessHistoryEl.innerHTML = '';
    guessHistoryEl.style.display = 'none';
    document.getElementById('guessWin').classList.remove('show');
  }

  guessBtn.addEventListener('click', checkGuess);
  document.getElementById('resetGuessBtn').addEventListener('click', ()=>{ playClickSound(); resetGuess(); });
  document.getElementById('guessWinBtn').addEventListener('click', ()=>{ playClickSound(); resetGuess(); });
  resetGuess();

  // theme switch
  const themeOverlay=document.getElementById('themeModalOverlay');
  const themeSwatches=document.querySelectorAll('.theme-swatch');
  document.getElementById('themeBtn').addEventListener('click',()=>{ playClickSound(); themeOverlay.classList.toggle('open'); });
  document.getElementById('themeCloseBtn').addEventListener('click',()=>{ playClickSound(); themeOverlay.classList.remove('open'); });
  themeOverlay.addEventListener('click',e=>{ if(e.target===themeOverlay)themeOverlay.classList.remove('open'); });
  function setTheme(name) {
    document.documentElement.setAttribute('data-theme', name==='warm'?'':name);
    themeSwatches.forEach(s=>s.classList.remove('active'));
    const match=[...themeSwatches].find(s=>s.dataset.theme===name);
    if(match) match.classList.add('active');
    document.getElementById('customPreviewRing').classList.remove('active');
  }
  themeSwatches.forEach(s=>s.parentElement.addEventListener('click',()=>{ setTheme(s.dataset.theme); playChime(660,0.2,'sine'); }));

  // custom theme
  function hexToRgb(hex){const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16);return{r,g,b};}
  function lighten(hex,amt){ const {r,g,b}=hexToRgb(hex); return `rgb(${Math.min(255,r+amt)},${Math.min(255,g+amt)},${Math.min(255,b+amt)})`; }
  function darken(hex,amt){ const {r,g,b}=hexToRgb(hex); return `rgb(${Math.max(0,r-amt)},${Math.max(0,g-amt)},${Math.max(0,b-amt)})`; }
  function hexAlpha(hex,a){ const {r,g,b}=hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; }

  const customBaseInput=document.getElementById('customBase');
  const customAccentInput=document.getElementById('customAccent');
  const previewRing=document.getElementById('customPreviewRing');

  function updateCustomPreview() {
    const base=customBaseInput.value, accent=customAccentInput.value;
    previewRing.style.background=`linear-gradient(135deg,${accent},${base})`;
  }
  customBaseInput.addEventListener('input',updateCustomPreview);
  customAccentInput.addEventListener('input',updateCustomPreview);
  updateCustomPreview();

  document.getElementById('applyCustomBtn').addEventListener('click',()=>{
    playClickSound();
    const base=customBaseInput.value, accent=customAccentInput.value;
    const root=document.documentElement;
    root.style.setProperty('--custom-light', lighten(accent, 60));
    root.style.setProperty('--custom-mid', accent);
    root.style.setProperty('--custom-dark', base);
    root.style.setProperty('--custom-darker', darken(base, 30));
    root.style.setProperty('--custom-border', hexAlpha(base, 0.45));
    root.style.setProperty('--custom-border-hover', hexAlpha(accent, 0.75));
    const {r,g,b}=hexToRgb(base);
    root.style.setProperty('--custom-card', `rgba(${Math.round(r*0.3)},${Math.round(g*0.3)},${Math.round(b*0.3)},0.65)`);
    root.style.setProperty('--custom-card-hover', `rgba(${Math.round(r*0.4)},${Math.round(g*0.4)},${Math.round(b*0.4)},0.78)`);
    root.style.setProperty('--custom-container', `rgba(${Math.round(r*0.25)},${Math.round(g*0.25)},${Math.round(b*0.25)},0.55)`);
    root.style.setProperty('--custom-overlay1', `rgba(${Math.round(r*0.15)},${Math.round(g*0.15)},${Math.round(b*0.15)},0.55)`);
    root.style.setProperty('--custom-overlay2', `rgba(${Math.round(r*0.25)},${Math.round(g*0.25)},${Math.round(b*0.25)},0.7)`);
    root.style.setProperty('--custom-score', `rgba(${Math.round(r*0.2)},${Math.round(g*0.2)},${Math.round(b*0.2)},1)`);
    root.style.setProperty('--custom-win-bg', hexAlpha(base, 0.18));
    root.setAttribute('data-theme','custom');
    themeSwatches.forEach(s=>s.classList.remove('active'));
    previewRing.classList.add('active');
    playChime(660,0.2,'sine');
  });

  // credits modal
  const creditsOverlay = document.getElementById('creditsModalOverlay');
  document.getElementById('creditsBtn').addEventListener('click', () => { playClickSound(); creditsOverlay.classList.add('open'); });
  document.getElementById('creditsCloseBtn').addEventListener('click', () => { playClickSound(); creditsOverlay.classList.remove('open'); });
  creditsOverlay.addEventListener('click', e => { if (e.target === creditsOverlay) creditsOverlay.classList.remove('open'); });
})();
