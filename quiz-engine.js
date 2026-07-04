let questions=[];
let lastResultText='';
let submitted=false;
const WA=['163','999','99961'].join('');
const PROGRESS_KEY='shayanQuizProgress';

function qc(k,f){return (window.SUBJECT_QUIZ_CONFIG&&window.SUBJECT_QUIZ_CONFIG[k])||f}
function cfg(k,f){return (window.QUIZ_CONFIG&&window.QUIZ_CONFIG[k])||f}
function esc(s){return String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')}
function norm(s){return String(s??'').trim().toLowerCase().replaceAll('−','-').replace(/[^a-z0-9\-]/g,'')}
function shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function answerList(q){let a=q.answers||q.acceptedAnswers||[q.answer];return Array.isArray(a)?a:[a]}
function displayAnswer(q){return q.answer || answerList(q)[0] || ''}
function isCorrect(student,q){return answerList(q).some(a=>norm(student)===norm(a))}
function sendWhatsApp(){if(!lastResultText){alert('Submit the test first.');return}window.open('https://wa.me/'+WA+'?text='+encodeURIComponent(lastResultText),'_blank')}
function scoreMessage(pct){if(pct>=90)return 'Excellent mastery';if(pct>=75)return 'Good work';if(pct>=60)return 'Needs revision';return 'Retake recommended'}
function setShowAnswerVisibility(){document.querySelectorAll('button').forEach(b=>{let action=b.getAttribute('onclick')||'';if(action.includes('showAnswers'))b.style.display=submitted?'':'none'})}
function subjectId(){let id=qc('subjectId','');if(id)return id;let f=qc('questionFile','questions.json').toLowerCase();if(f.includes('chemistry'))return 'chemistry';if(f.includes('physics'))return 'physics';if(f.includes('biology'))return 'biology';if(f.includes('math'))return 'math';return 'quiz'}
function saveProgress(name,score,total,pct,performance,submittedAt){
  try{
    let p=JSON.parse(localStorage.getItem(PROGRESS_KEY)||'{}');
    let id=subjectId();
    let old=p[id]||{};
    let attempt={subjectId:id,title:qc('shortTitle',qc('title','Quiz')),student:name,score:score,total:total,percentage:pct,performance:performance,submittedAt:submittedAt,ts:Date.now()};
    let history=Array.isArray(old.history)?old.history:[];
    history.push(attempt);
    if(history.length>50)history=history.slice(history.length-50);
    p[id]={...attempt,completed:true,history:history};
    localStorage.setItem(PROGRESS_KEY,JSON.stringify(p));
  }catch(e){console.log('Progress not saved',e)}
}

async function loadQuestions(){
  try{
    document.title=qc('title','Shayan Quiz');
    let title=document.getElementById('pageTitle');if(title)title.textContent=qc('title','Shayan Quiz');
    let sub=document.getElementById('pageSub');if(sub)sub.textContent=qc('subtitle','Online test with automatic grading, email, WhatsApp, and revision advice. Answers stay hidden until submission.');
    let r=await fetch(qc('questionFile','questions.json')+'?v='+Date.now(),{cache:'reload'});
    let loaded=await r.json();
    questions=shuffle(loaded.map(q=>{let copy={...q};if(copy.options)copy.options=shuffle([...copy.options]);return copy}));
    let max=Number(qc('maxQuestions',questions.length));
    if(max&&questions.length>max)questions=questions.slice(0,max);
    render();
    setShowAnswerVisibility();
  }catch(e){document.getElementById('quizContainer').innerHTML='<p class="note">Could not load questions. '+esc(e.message)+'</p>'}
}

function render(){
  let c=document.getElementById('quizContainer');
  c.innerHTML='';
  questions.forEach((q,i)=>{
    let ans='';
    if(q.type==='input'){
      ans='<label>Your answer</label><input type="text" id="answer-'+i+'" autocomplete="off" placeholder="Type your answer">';
    }else{
      ans=(q.options||[]).map((o,j)=>'<label class="option"><input type="radio" name="answer-'+i+'" value="'+esc(o)+'"> '+String.fromCharCode(65+j)+'. '+esc(o)+'</label>').join('');
    }
    let meta='<p class="note"><b>Difficulty:</b> '+esc(q.difficulty||'')+' &nbsp; <b>Topic:</b> '+esc(q.topic||'')+'</p>';
    c.innerHTML+='<div class="question"><h2>Question '+(i+1)+'</h2>'+meta+'<p>'+esc(q.question)+'</p>'+ans+'<div id="feedback-'+i+'" class="feedback"></div></div>';
  });
}

function getAnswer(i){
  let q=questions[i];
  if(q.type==='input')return document.getElementById('answer-'+i).value;
  let x=document.querySelector('input[name="answer-'+i+'"]:checked');
  return x?x.value:'';
}

function buildRevision(wrongItems){
  if(!wrongItems.length)return ['Excellent work. No weak areas found. Keep practicing to maintain accuracy.'];
  let topicCounts={};
  wrongItems.forEach(w=>{let t=w.topic||'General review';topicCounts[t]=(topicCounts[t]||0)+1});
  let top=Object.entries(topicCounts).sort((a,b)=>b[1]-a[1]).slice(0,4);
  let advice=top.map(([t,n])=>'Review '+t+' ('+n+' question'+(n>1?'s':'')+' missed).');
  wrongItems.slice(0,5).forEach(w=>{if(w.review&&!advice.includes(w.review))advice.push(w.review)});
  return advice;
}

async function gradeQuiz(e){
  e.preventDefault();
  submitted=true;
  setShowAnswerVisibility();
  let score=0,wrong=[],wrongItems=[],details=[];
  questions.forEach((q,i)=>{
    let a=getAnswer(i);
    let ok=isCorrect(a,q);
    let f=document.getElementById('feedback-'+i);
    if(ok){score++;f.className='feedback correct';f.textContent='Correct! '+(q.explanation||'')}
    else{wrong.push(i+1);wrongItems.push(q);f.className='feedback wrong';f.textContent='Not correct. Correct answer: '+displayAnswer(q)+'. '+(q.explanation||'')}
    details.push('Q'+(i+1)+': '+q.question+'\nTopic: '+(q.topic||'')+'\nDifficulty: '+(q.difficulty||'')+'\nStudent answer: '+(a||'(blank)')+'\nCorrect answer: '+displayAnswer(q)+'\nResult: '+(ok?'Correct':'Incorrect'));
  });
  let pct=Math.round(score/questions.length*100);
  let performance=scoreMessage(pct);
  let revision=buildRevision(wrongItems);
  let name=document.getElementById('studentName').value.trim()||'Student';
  let submittedAt=new Date().toLocaleString();
  saveProgress(name,score,questions.length,pct,performance,submittedAt);
  lastResultText=name+' completed '+qc('title','Shayan Quiz')+'.\nMode: Test\nScore: '+score+'/'+questions.length+'\nPercentage: '+pct+'%\nPerformance: '+performance+'\nSubmitted: '+submittedAt+'\nQuestions to review: '+(wrong.length?wrong.join(', '):'None')+'\nRevision advice:\n- '+revision.join('\n- ')+'\n\n'+details.join('\n\n---\n\n');
  let rb=document.getElementById('resultBox');
  rb.style.display='block';
  rb.innerHTML='<h2>'+esc(name)+' Result</h2><p><b>Mode:</b> Test</p><p><b>Score:</b> '+score+'/'+questions.length+'</p><p><b>Percentage:</b> '+pct+'%</p><p><b>Performance:</b> '+esc(performance)+'</p><p><b>Questions to review:</b> '+(wrong.length?wrong.join(', '):'None')+'</p><h3>Revision Plan</h3><ul>'+revision.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul><div class="buttons"><button type="button" onclick="sendWhatsApp()">Send Result on WhatsApp</button><button type="button" onclick="showAnswers()">Review Answers</button><a class="button secondary" href="index.html">Back to Dashboard</a></div><div id="status" class="status">Sending result...</div>';
  await sendResult(name,score,pct,submittedAt,wrong,performance,revision);
}

async function sendResult(name,score,pct,submittedAt,wrong,performance,revision){
  let st=document.getElementById('status');
  let key=cfg('web3formsAccessKey','');
  let email=cfg('parentEmail','');
  if(!key){st.innerHTML='Web3Forms key is missing in config.js. Result is graded but not emailed.';return}
  let payload={access_key:key,subject:qc('title','Shayan Quiz')+' Result',from_name:qc('title','Shayan Quiz'),name:name,email:email,message:lastResultText,score:score+'/'+questions.length,percentage:pct+'%',performance:performance,submitted_at:submittedAt,questions_to_review:wrong.length?wrong.join(', '):'None',revision_advice:revision.join(' | ')};
  try{
    let r=await fetch('https://api.web3forms.com/submit',{method:'POST',headers:{'Content-Type':'application/json','Accept':'application/json'},body:JSON.stringify(payload)});
    let data=await r.json();
    if(r.ok&&data.success){st.textContent='Result submitted through Web3Forms. Check email inbox/spam. You can also use WhatsApp button above.'}
    else{st.textContent='Web3Forms rejected submission: '+(data.message||'Unknown error')}
  }catch(err){st.textContent='Could not connect to Web3Forms: '+err.message}
}

function showAnswers(){
  if(!submitted){alert('Answers are hidden until the test is submitted.');return}
  questions.forEach((q,i)=>{let f=document.getElementById('feedback-'+i);f.className='feedback correct';f.textContent='Answer: '+displayAnswer(q)+'. '+(q.explanation||'')});
}

loadQuestions();