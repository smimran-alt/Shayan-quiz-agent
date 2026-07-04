let questions=[];
let lastResultText='';
let submitted=false;
const WA=['163','999','99961'].join('');

function qc(k,f){return (window.SUBJECT_QUIZ_CONFIG&&window.SUBJECT_QUIZ_CONFIG[k])||f}
function cfg(k,f){return (window.QUIZ_CONFIG&&window.QUIZ_CONFIG[k])||f}
function esc(s){return String(s??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')}
function norm(s){return String(s??'').trim().toLowerCase().replaceAll('−','-').replace(/[^a-z0-9\-]/g,'')}
function shuffle(a){for(let i=a.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a}
function getMode(){let x=document.querySelector('input[name="quizMode"]:checked');return x?x.value:(qc('defaultMode','test'))}
function isTestMode(){return getMode()==='test'}
function answerList(q){let a=q.answers||q.acceptedAnswers||[q.answer];return Array.isArray(a)?a:[a]}
function displayAnswer(q){return q.answer || answerList(q)[0] || ''}
function isCorrect(student,q){return answerList(q).some(a=>norm(student)===norm(a))}
function sendWhatsApp(){if(!lastResultText){alert('Submit the quiz first.');return}window.open('https://wa.me/'+WA+'?text='+encodeURIComponent(lastResultText),'_blank')}
function scoreMessage(pct){if(pct>=90)return 'Excellent mastery';if(pct>=75)return 'Good work';if(pct>=60)return 'Needs revision';return 'Retake recommended'}
function setShowAnswerVisibility(){let b=document.getElementById('showAnswersBtn');if(!b)return;b.style.display=(isTestMode()&&!submitted)?'none':''}
function modeChanged(){submitted=false;lastResultText='';let rb=document.getElementById('resultBox');if(rb){rb.style.display='none';rb.innerHTML=''}document.querySelectorAll('.feedback').forEach(f=>{f.className='feedback';f.textContent='' });setShowAnswerVisibility()}

async function loadQuestions(){
  try{
    document.title=qc('title','Shayan Quiz');
    let title=document.getElementById('pageTitle');if(title)title.textContent=qc('title','Shayan Quiz');
    let sub=document.getElementById('pageSub');if(sub)sub.textContent=qc('subtitle','Online quiz with automatic grading, email, WhatsApp, practice mode, and test mode.');
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
  lastResultText=name+' completed '+qc('title','Shayan Quiz')+'.\nMode: '+(isTestMode()?'Test':'Practice')+'\nScore: '+score+'/'+questions.length+'\nPercentage: '+pct+'%\nPerformance: '+performance+'\nSubmitted: '+submittedAt+'\nQuestions to review: '+(wrong.length?wrong.join(', '):'None')+'\nRevision advice:\n- '+revision.join('\n- ')+'\n\n'+details.join('\n\n---\n\n');
  let rb=document.getElementById('resultBox');
  rb.style.display='block';
  rb.innerHTML='<h2>'+esc(name)+' Result</h2><p><b>Mode:</b> '+(isTestMode()?'Test':'Practice')+'</p><p><b>Score:</b> '+score+'/'+questions.length+'</p><p><b>Percentage:</b> '+pct+'%</p><p><b>Performance:</b> '+esc(performance)+'</p><p><b>Questions to review:</b> '+(wrong.length?wrong.join(', '):'None')+'</p><h3>Revision Plan</h3><ul>'+revision.map(x=>'<li>'+esc(x)+'</li>').join('')+'</ul><div class="buttons"><button type="button" onclick="sendWhatsApp()">Send Result on WhatsApp</button><button type="button" onclick="showAnswers()">Review Answers</button></div><div id="status" class="status">Sending result...</div>';
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
  if(isTestMode()&&!submitted){alert('Answers are hidden in Test Mode until the test is submitted. Use Practice Mode if Shayan is studying.');return}
  questions.forEach((q,i)=>{let f=document.getElementById('feedback-'+i);f.className='feedback correct';f.textContent='Answer: '+displayAnswer(q)+'. '+(q.explanation||'')});
}

loadQuestions();