import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  collection,
  getDocs,
  query,
  where,
  onSnapshot,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
window.addEventListener("error",event=>{
  console.error("JianJian boot error:",event.error||event.message);
  const el=document.getElementById("todayWorkoutTitle");
  if(el&&el.textContent==="讀取中")el.textContent="程式載入失敗，請查看 Console";
});
window.addEventListener("unhandledrejection",event=>{
  console.error("JianJian promise error:",event.reason);
});

const firebaseConfig={
  apiKey:"AIzaSyCJt9PUyI-t5O0giQV_OVBYLj-5LuxIXcs",
  authDomain:"jianfit-f40b7.firebaseapp.com",
  projectId:"jianfit-f40b7",
  storageBucket:"jianfit-f40b7.firebasestorage.app",
  messagingSenderId:"461851112399",
  appId:"1:461851112399:web:26c86accb78b0e690e58ba"
};
const APP_VERSION="8.0.0";

const clone=x=>JSON.parse(JSON.stringify(x));
const dateKey=(d=new Date())=>{
  const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,"0"),day=String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${day}`;
};
const dateFromKey=k=>new Date(`${k}T00:00:00`);
const shiftDate=(k,n)=>{const d=dateFromKey(k);d.setDate(d.getDate()+n);return dateKey(d)};

const catalog={
 hipThrust:{name:"臀推 Hip Thrust",sets:4,reps:10,guide:"hipThrust",inc:2.5,alts:["Smith 臀推","啞鈴臀推","臀橋","Cable Pull Through"]},
 squat:{name:"深蹲 Squat",sets:4,reps:8,guide:"squat",inc:2.5,alts:["高腳杯深蹲","Smith 深蹲","Hack Squat","腿推"]},
 rdl:{name:"啞鈴 RDL",sets:3,reps:10,guide:"rdl",inc:2,alts:["槓鈴 RDL","Smith RDL","腿彎舉","Cable Pull Through"]},
 legPress:{name:"腿推 Leg Press",sets:4,reps:10,guide:"legPress",inc:5,alts:["Hack Squat","Smith 深蹲","高腳杯深蹲","分腿蹲"]},
 bulgarian:{name:"保加利亞分腿蹲",sets:3,reps:10,guide:"bulgarian",inc:2,alts:["反向弓箭步","登階","腿推","分腿蹲"]},
 lat:{name:"滑輪下拉",sets:3,reps:10,guide:"lat",inc:2.5,alts:["輔助引體向上","高位下拉機","單手滑輪下拉","直臂下壓"]},
 row:{name:"坐姿划船",sets:3,reps:10,guide:"row",inc:2.5,alts:["啞鈴划船","胸托划船","T-bar 划船","單手滑輪划船"]},
 chest:{name:"機械胸推",sets:3,reps:10,guide:"chest",inc:2.5,alts:["啞鈴臥推","Smith 臥推","伏地挺身","槓鈴臥推"]},
 shoulder:{name:"肩推",sets:3,reps:10,guide:"shoulder",inc:2,alts:["啞鈴肩推","Smith 肩推","Landmine Press","機械肩推"]},
 lateral:{name:"側平舉",sets:3,reps:15,guide:"lateral",inc:1,alts:["Cable 側平舉","機械側平舉","單手側平舉"]},
 abduction:{name:"髖外展機",sets:3,reps:20,guide:"abduction",inc:2.5,alts:["彈力帶側走","Cable 髖外展","側躺抬腿","Monster Walk"]},
 zone2:{name:"Zone 2 有氧",sets:1,reps:30,guide:"zone2",inc:0,alts:["跑步機快走","橢圓機","飛輪","戶外快走"]}
};
const defs=(...keys)=>keys.map(k=>clone(catalog[k]));
const buildPlan=(goal="recomp",days=4,focus="balanced")=>{
 const templates={
 3:[{title:"全身 A",note:"全身肌力",exercises:defs("squat","lat","chest","rdl")},
    {title:"全身 B",note:"全身與核心",exercises:defs("legPress","row","shoulder","hipThrust")},
    {title:"臀腿＋有氧",note:"臀腿與心肺",exercises:defs("hipThrust","bulgarian","abduction","zone2")}],
 4:[{title:"下半身 A",note:"臀腿力量",exercises:defs("hipThrust","squat","rdl","abduction")},
    {title:"上半身 A",note:"推拉基礎",exercises:defs("lat","row","chest","shoulder","lateral")},
    {title:"下半身 B",note:"單腿與腿後側",exercises:defs("legPress","bulgarian","rdl","abduction")},
    {title:"全身＋有氧",note:"全身循環",exercises:defs("squat","lat","chest","zone2")}],
 5:[{title:"臀腿 A",note:"臀推重點",exercises:defs("hipThrust","squat","rdl","abduction")},
    {title:"上半身 A",note:"背胸肩",exercises:defs("lat","row","chest","lateral")},
    {title:"有氧／核心",note:"恢復與消耗",exercises:defs("zone2")},
    {title:"臀腿 B",note:"腿推與單腿",exercises:defs("legPress","bulgarian","rdl","abduction")},
    {title:"上半身 B",note:"肩背手臂",exercises:defs("lat","shoulder","row","chest")}],
 6:[{title:"臀腿 A",note:"臀推重點",exercises:defs("hipThrust","squat","rdl")},
    {title:"上半身 A",note:"推拉基礎",exercises:defs("lat","row","chest")},
    {title:"有氧",note:"Zone 2",exercises:defs("zone2")},
    {title:"臀腿 B",note:"腿推與單腿",exercises:defs("legPress","bulgarian","abduction")},
    {title:"上半身 B",note:"肩背",exercises:defs("lat","shoulder","row","lateral")},
    {title:"有氧／自由加練",note:"弱項補強",exercises:defs("zone2")}],
 };
 let source=clone(templates[days]||templates[4]);
 if(focus==="glutes")source.forEach((d,i)=>{if(i%2===0&&!d.exercises.some(e=>e.guide==="hipThrust"))d.exercises.unshift(clone(catalog.hipThrust))});
 if(focus==="upper")source.forEach((d,i)=>{if(i%2===0&&!d.exercises.some(e=>e.guide==="lat"))d.exercises.unshift(clone(catalog.lat))});
 if(focus==="cardio")source.forEach((d,i)=>{if(i%2===1&&!d.exercises.some(e=>e.guide==="zone2"))d.exercises.push(clone(catalog.zone2))});
 const week=[{title:"休息／恢復",note:"散步、伸展或完整休息",exercises:[]},...source];
 while(week.length<7)week.push({title:"休息／恢復",note:"散步、伸展或完整休息",exercises:[]});
 return week.slice(0,7);
};
const makeExercise=(def,extra=false)=>({id:crypto.randomUUID(),name:def.name,guide:def.guide,inc:def.inc,alts:def.alts||[],extra,status:"pending",sets:Array.from({length:def.sets},()=>({done:false,weight:"",reps:def.reps}))});
const mealTemplates={
 strength:{label:"重訓日菜單",calories:1700,protein:125,meals:[["早餐","燕麥＋無糖豆漿＋雞蛋 2 顆＋香蕉",430],["午餐","雞胸或雞腿排 150 g＋白飯＋蔬菜",520],["練前點心","香蕉或地瓜＋無糖優格",220],["晚餐","魚或瘦肉＋澱粉＋深綠色蔬菜",470]]},
 cardio:{label:"有氧日菜單",calories:1600,protein:120,meals:[["早餐","全麥吐司＋雞蛋＋無糖豆漿",400],["午餐","雞胸＋飯＋蔬菜",480],["點心","水果＋無糖優格",180],["晚餐","魚／豆腐／瘦肉＋蔬菜",440]]},
 rest:{label:"休息日菜單",calories:1500,protein:120,meals:[["早餐","雞蛋＋無糖豆漿＋水果",350],["午餐","雞肉／魚＋飯＋蔬菜",450],["點心","優格、茶葉蛋或毛豆",170],["晚餐","豆腐／魚／瘦肉＋蔬菜",430]]}
};
const guides={
 hipThrust:{title:"臀推 Hip Thrust",muscles:["臀大肌","腿後肌","核心"],points:["長椅上緣位於肩胛骨下方","腳跟穩定踩地","下巴微收、肋骨不要翻起","頂端夾臀停一秒"],errors:["用下背過度拱起","膝蓋內夾","腳位置不合適"],breathing:"下降吸氣，向上推時吐氣。"},
 squat:{title:"深蹲 Squat",muscles:["股四頭肌","臀大肌","核心"],points:["腳掌三點踩地","膝蓋朝腳尖方向","核心穩定","以可控制深度為主"],errors:["膝蓋內夾","腳跟離地","下背圓曲"],breathing:"下降前吸氣撐緊，站起吐氣。"},
 rdl:{title:"羅馬尼亞硬舉 RDL",muscles:["腿後肌","臀大肌","豎脊肌"],points:["臀部向後推","重量貼近腿部","感覺腿後側拉長即停止"],errors:["背部圓曲","重量離身體太遠","變成深蹲"],breathing:"下降前吸氣，站起吐氣。"},
 legPress:{title:"腿推",muscles:["股四頭肌","臀大肌"],points:["背與臀貼住椅背","膝蓋跟著腳尖","不要鎖死膝蓋"],errors:["臀部離座","膝蓋內夾","下降過深"],breathing:"下降吸氣，推起吐氣。"},
 lat:{title:"滑輪下拉",muscles:["背闊肌","肱二頭肌"],points:["胸口微抬","先下沉肩胛","手肘向下拉"],errors:["身體甩動","聳肩","拉到頸後"],breathing:"下拉吐氣，回程吸氣。"},
 row:{title:"坐姿划船",muscles:["背闊肌","菱形肌"],points:["胸口打開","手肘向後","頂端夾背"],errors:["身體大幅擺動","聳肩","只用手臂"],breathing:"後拉吐氣，回程吸氣。"},
 chest:{title:"胸推",muscles:["胸大肌","前三角肌","肱三頭肌"],points:["肩胛向後下固定","手腕中立","回程控制"],errors:["肩膀向前","手腕折彎","重量撞回"],breathing:"推出吐氣，回程吸氣。"},
 shoulder:{title:"肩推",muscles:["三角肌","肱三頭肌"],points:["核心收緊","手腕在手肘上方","避免聳肩"],errors:["下背過度拱起","手腕折彎"],breathing:"上推吐氣，下降吸氣。"},
 lateral:{title:"側平舉",muscles:["三角肌中束"],points:["手肘微彎","抬至肩高附近","控制下降"],errors:["身體甩動","聳肩","重量太重"],breathing:"抬起吐氣，下降吸氣。"},
 abduction:{title:"髖外展機",muscles:["臀中肌","臀小肌"],points:["臀部坐穩","向外打開停一秒","控制回程"],errors:["用慣性甩動","重量太重"],breathing:"打開吐氣，回程吸氣。"},
 zone2:{title:"Zone 2 有氧",muscles:["心肺耐力"],points:["可以說完整句子但呼吸加快","保持穩定強度","逐步增加時間"],errors:["一開始過強","全程扶握器材"],breathing:"保持自然規律呼吸。"}
};
const symptoms=[["bloating","水腫"],["cramps","經痛"],["fatigue","容易疲累"],["mood","情緒起伏"],["headache","頭痛"],["backache","腰痠"],["breast","胸部脹痛"],["appetite","食慾增加"],["sleep","睡眠變差"],["digestive","腸胃不適"],["acne","皮膚變化"],["dizziness","頭暈"],["nausea","噁心"],["motivation","訓練動力下降"]];

const KEY="jianjian_v8_state";
const defaults=()=>({version:8,profile:{displayName:"使用者",gender:"unspecified",increment:2.5,cycleEnabled:false,lastPeriod:"",cycleLength:28,periodLength:6,symptoms:[],goal:"recomp"},goal:{title:"降低體脂",start:28,current:28,target:24,unit:"%"},weeklyPlan:buildPlan(),tasks:[{id:"a",text:"完成今日訓練",done:false},{id:"b",text:"蛋白質達標",done:false},{id:"c",text:"喝水 2500 ml",done:false},{id:"d",text:"走路 9000 步",done:false}],days:{},menus:{},cardio:[],body:[],history:{},customExercises:{},dailyMetrics:{}});
const loadLocal=()=>{try{const x=JSON.parse(localStorage.getItem(KEY));return merge(x)}catch{return defaults()}};
const saveLocal=s=>localStorage.setItem(KEY,JSON.stringify(s));
const merge=x=>{const d=defaults();return {...d,...(x||{}),profile:{...d.profile,...(x?.profile||{})},goal:{...d.goal,...(x?.goal||{})},days:{...(x?.days||{})},menus:{...(x?.menus||{})},cardio:Array.isArray(x?.cardio)?x.cardio:[],body:Array.isArray(x?.body)?x.body:[],history:{...(x?.history||{})},customExercises:{...(x?.customExercises||{})},dailyMetrics:{...(x?.dailyMetrics||{})},weeklyPlan:Array.isArray(x?.weeklyPlan)?x.weeklyPlan:d.weeklyPlan}};

const firebaseApp=initializeApp(firebaseConfig),auth=getAuth(firebaseApp),db=getFirestore(firebaseApp),provider=new GoogleAuthProvider();
const authState=cb=>onAuthStateChanged(auth,cb);
const login=()=>signInWithPopup(auth,provider);
const logout=()=>signOut(auth);
async function pushCloud(uid,state){
 const base=doc(db,"users",uid);
 await Promise.all([
  setDoc(doc(base,"profile","main"),state.profile),
  setDoc(doc(base,"settings","main"),{goal:state.goal,weeklyPlanJson:JSON.stringify(state.weeklyPlan),tasks:state.tasks,version:8}),
  ...Object.entries(state.days).map(([k,v])=>setDoc(doc(base,"days",k),{json:JSON.stringify(v)})),
  ...Object.entries(state.menus).map(([k,v])=>setDoc(doc(base,"menus",k),{json:JSON.stringify(v)})),
  setDoc(doc(base,"collections","cardio"),{json:JSON.stringify(state.cardio)}),
  setDoc(doc(base,"collections","body"),{json:JSON.stringify(state.body)}),
  setDoc(doc(base,"collections","history"),{json:JSON.stringify(state.history)}),
  setDoc(doc(base,"collections","dailyMetrics"),{json:JSON.stringify(state.dailyMetrics||{})})
 ]);
}
async function pullCloud(uid,current){
 const base=doc(db,"users",uid),next={...current};
 const [p,s,c,b,h,dm,days,menus]=await Promise.all([
  getDoc(doc(base,"profile","main")),getDoc(doc(base,"settings","main")),
  getDoc(doc(base,"collections","cardio")),getDoc(doc(base,"collections","body")),getDoc(doc(base,"collections","history")),getDoc(doc(base,"collections","dailyMetrics")),
  getDocs(collection(base,"days")),getDocs(collection(base,"menus"))
 ]);
 if(p.exists())next.profile={...next.profile,...p.data()};
 if(s.exists()){const x=s.data();next.goal=x.goal||next.goal;next.tasks=x.tasks||next.tasks;try{next.weeklyPlan=JSON.parse(x.weeklyPlanJson)||next.weeklyPlan}catch{}}
 if(c.exists())try{next.cardio=JSON.parse(c.data().json)||[]}catch{}
 if(b.exists())try{next.body=JSON.parse(b.data().json)||[]}catch{}
 if(h.exists())try{next.history=JSON.parse(h.data().json)||{}}catch{}
 if(dm.exists())try{next.dailyMetrics=JSON.parse(dm.data().json)||{}}catch{}
 days.forEach(d=>{try{next.days[d.id]=JSON.parse(d.data().json)}catch{}});
 menus.forEach(d=>{try{next.menus[d.id]=JSON.parse(d.data().json)}catch{}});
 return merge(next);
}

const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
let state=loadLocal(),user=null,previewKey=dateKey();

// ===== JianJian v10.1 Complete Daily Coach =====
let menuPreviewKey=dateKey();

const PLAN_PRESETS={
  gluteFatloss:{
    goal:{title:"降低體脂",target:24,unit:"%"},
    plan:()=>buildPlan("fatloss",5,"glutes")
  },
  balancedFatloss:{
    goal:{title:"均衡減脂",target:24,unit:"%"},
    plan:()=>buildPlan("fatloss",4,"balanced")
  },
  muscle:{
    goal:{title:"增加肌肉",target:0,unit:""},
    plan:()=>buildPlan("muscle",5,"balanced")
  },
  beginner:{
    goal:{title:"規律運動",target:0,unit:""},
    plan:()=>buildPlan("health",3,"balanced")
  }
};

function ensureExtendedState(){
  state.profile=state.profile||{};
  if(!Array.isArray(state.profile.favoriteExercises))state.profile.favoriteExercises=[];
  state.profile.proteinTarget=Number(state.profile.proteinTarget)||125;
  state.profile.waterTarget=Number(state.profile.waterTarget)||2500;
  state.profile.stepsTarget=Number(state.profile.stepsTarget)||9000;
  state.profile.sleepTarget=Number(state.profile.sleepTarget)||7.5;
  state.dailyMetrics=state.dailyMetrics||{};
}
function todayMetrics(key=dateKey()){
  ensureExtendedState();
  if(!state.dailyMetrics[key]){
    state.dailyMetrics[key]={water:0,protein:0,steps:0,sleep:0};
  }
  return state.dailyMetrics[key];
}
function capPercent(value,target){
  return target?Math.min(100,Math.round(Number(value||0)/Number(target)*100)):0;
}
function completedDates(){
  return Object.entries(state.days)
    .filter(([,day])=>day.status==="completed"||pct(day)===100)
    .map(([key])=>key).sort();
}
function currentStreakValue(){
  const dates=new Set(completedDates());
  let cursor=new Date(),count=0;
  while(true){
    const key=dateKey(cursor);
    if(!dates.has(key))break;
    count++;
    cursor.setDate(cursor.getDate()-1);
  }
  return count;
}
function weeklyCompletedValue(){
  const now=new Date(),start=new Date(now);
  start.setDate(now.getDate()-((now.getDay()+6)%7));
  start.setHours(0,0,0,0);
  return completedDates().filter(key=>dateFromKey(key)>=start).length;
}
function monthlyPRCount(){
  const month=dateKey().slice(0,7);
  let count=0;
  Object.values(state.history||{}).forEach(records=>{
    if(!Array.isArray(records)||!records.length)return;
    const current=records[0];
    const earlier=records.slice(1);
    const oldMax=Math.max(0,...earlier.map(x=>Number(x.max)||0));
    if(current.date?.startsWith(month)&&Number(current.max)>oldMax)count++;
  });
  return count;
}
function coachAdvice(){
  const day=ensureDay(),metrics=todayMetrics(),cycleData=typeof cycleInfo==="function"?cycleInfo():null;
  const sleep=Number(metrics.sleep)||0;
  const workout=pct(day);
  const lastSeven=Object.entries(state.days).filter(([key])=>{
    const diff=(new Date()-dateFromKey(key))/86400000;
    return diff>=0&&diff<7;
  });
  const completed=lastSeven.filter(([,d])=>d.status==="completed"||pct(d)===100).length;

  if(cycleData&&cycleData.phase==="月經期"){
    return {title:"今天以身體感受為主",text:`目前為${cycleData.phase} Day ${cycleData.day}。若有經痛或疲勞，可降低重量 5～15%，或改做散步與伸展。`};
  }
  if(sleep>0&&sleep<6){
    return {title:"今天不要勉強追 PR",text:`昨晚睡眠 ${sleep} 小時。建議維持或降低重量，優先完成動作品質。`};
  }
  if(workout===100){
    return {title:"今天訓練已完成",text:"記得補充蛋白質、喝水和完成練後拉伸。下次會依本次紀錄提供重量建議。"};
  }
  if(completed>=4){
    return {title:"本週訓練量充足",text:`最近 7 天已完成 ${completed} 次訓練。今天若疲勞明顯，可以維持重量或安排恢復。`};
  }
  const first=day.exercises?.[0];
  if(first){
    return {title:`今天是 ${day.title}`,text:`先完成暖身，再從「${first.name}」開始。建議使用可保留 2～3 下餘力的重量。`};
  }
  return {title:"今天是恢復日",text:"可以安排步行、輕度有氧或全身伸展，並提前準備明天的訓練。"};
}
function renderDailyDashboard(){
  const m=todayMetrics(),p=state.profile;
  const fields=[
    ["water",m.water,p.waterTarget],["protein",m.protein,p.proteinTarget],
    ["steps",m.steps,p.stepsTarget],["sleep",m.sleep,p.sleepTarget]
  ];
  fields.forEach(([name,current,target])=>{
    const currentEl=$("#"+name+"Current"),targetEl=$("#"+name+"Target"),bar=$("#"+name+"Bar");
    if(currentEl)currentEl.textContent=current;
    if(targetEl)targetEl.textContent=target;
    if(bar)bar.style.width=capPercent(current,target)+"%";
  });
  const advice=coachAdvice();
  $("#aiCoachTitle").textContent=advice.title;
  $("#aiCoachText").textContent=advice.text;
  $("#weekCompleted").textContent=weeklyCompletedValue();
  $("#currentStreak").textContent=currentStreakValue();
  $("#monthPRCount").textContent=monthlyPRCount();
}
function menuForPreview(key){
  return ensureMenu(key);
}

const FOOD_CALORIE_RULES = [
  {keys:["白飯","飯"], kcal:280},
  {keys:["半碗飯"], kcal:140},
  {keys:["雞胸"], kcal:180},
  {keys:["雞腿排"], kcal:260},
  {keys:["雞腿"], kcal:230},
  {keys:["瘦牛","牛肉"], kcal:250},
  {keys:["豬里肌","里肌"], kcal:220},
  {keys:["鮭魚"], kcal:280},
  {keys:["魚"], kcal:200},
  {keys:["蛋餅"], kcal:300},
  {keys:["可頌"], kcal:330},
  {keys:["薯泥"], kcal:150},
  {keys:["吐司"], kcal:140},
  {keys:["全麥吐司"], kcal:120},
  {keys:["蛋","雞蛋","茶葉蛋"], kcal:80},
  {keys:["無糖豆漿","豆漿"], kcal:100},
  {keys:["乳清"], kcal:130},
  {keys:["香蕉"], kcal:100},
  {keys:["地瓜"], kcal:160},
  {keys:["優格"], kcal:120},
  {keys:["希臘優格"], kcal:140},
  {keys:["毛豆"], kcal:130},
  {keys:["豆腐"], kcal:150},
  {keys:["沙拉"], kcal:120},
  {keys:["青菜","蔬菜"], kcal:80},
  {keys:["燕麥"], kcal:220},
  {keys:["麥片"], kcal:220},
  {keys:["漢堡"], kcal:450},
  {keys:["三明治"], kcal:350},
  {keys:["麵"], kcal:420},
  {keys:["義大利麵"], kcal:550},
  {keys:["火鍋"], kcal:650},
  {keys:["燒肉"], kcal:700},
  {keys:["便當"], kcal:650},
  {keys:["拿鐵"], kcal:180},
  {keys:["奶茶"], kcal:300},
  {keys:["咖啡"], kcal:20},
  {keys:["水果"], kcal:100}
];

function parseMultiplier(text){
  const t=String(text||"");
  const pieces=[
    [/(\d+(?:\.\d+)?)\s*顆/g,1],
    [/(\d+(?:\.\d+)?)\s*份/g,1],
    [/(\d+(?:\.\d+)?)\s*片/g,1],
    [/(\d+(?:\.\d+)?)\s*杯/g,1],
    [/(\d+(?:\.\d+)?)\s*碗/g,1],
    [/(\d+(?:\.\d+)?)\s*根/g,1]
  ];
  let max=1;
  pieces.forEach(([regex])=>{
    let m;
    while((m=regex.exec(t)))max=Math.max(max,Number(m[1])||1);
  });
  return max;
}

function estimateMealCalories(text){
  const source=String(text||"").trim();
  if(!source)return 0;

  const parts=source.split(/[＋+、,，\/／\n]/).map(x=>x.trim()).filter(Boolean);
  let total=0;
  let matched=false;

  parts.forEach(part=>{
    const rule=FOOD_CALORIE_RULES.find(rule=>rule.keys.some(key=>part.includes(key)));
    if(rule){
      matched=true;
      total+=rule.kcal*parseMultiplier(part);
    }
  });

  if(!matched){
    // 無法辨識時給一個保守的單餐起始值
    if(parts.length>=4)return 500;
    if(parts.length===3)return 420;
    if(parts.length===2)return 300;
    return 180;
  }

  return Math.round(total);
}


function menuTotalCalories(menu){
  if(!menu || !Array.isArray(menu.meals)) return 0;
  return Math.round(
    menu.meals.reduce((total, meal) => total + (Number(meal.kcal) || 0), 0)
  );
}

function renderCalorieProgress(menu = ensureMenu(dateKey())){
  const current = menuTotalCalories(menu);
  const target = Math.max(1, Number(menu.calories) || 1700);
  const percent = Math.min(100, Math.round(current / target * 100));
  const difference = target - current;

  const currentEl = document.getElementById("calorieCurrent");
  const targetEl = document.getElementById("calorieTarget");
  const barEl = document.getElementById("calorieBar");
  const statusEl = document.getElementById("calorieStatus");
  const remainingEl = document.getElementById("calorieRemaining");
  const cardEl = document.querySelector(".calorie-progress-card");

  if(currentEl) currentEl.textContent = current;
  if(targetEl) targetEl.textContent = target;
  if(barEl) barEl.style.width = `${percent}%`;

  if(cardEl){
    cardEl.classList.toggle("calorie-over", current > target);
    cardEl.classList.toggle("calorie-complete", current > 0 && current <= target);
  }

  if(current === 0){
    if(statusEl) statusEl.textContent = "尚未記錄";
    if(remainingEl) remainingEl.textContent = "今日尚未記錄餐點熱量。";
    return;
  }

  if(difference > 0){
    if(statusEl) statusEl.textContent = `${percent}%`;
    if(remainingEl) remainingEl.textContent = `今天還可攝取約 ${difference} kcal。`;
  }else if(difference === 0){
    if(statusEl) statusEl.textContent = "剛好達標";
    if(remainingEl) remainingEl.textContent = "今天剛好達到熱量目標。";
  }else{
    if(statusEl) statusEl.textContent = `超過 ${Math.abs(difference)} kcal`;
    if(remainingEl) remainingEl.textContent = `今天已超過目標約 ${Math.abs(difference)} kcal。`;
  }
}

function renderHomeMenuSummary(){
  const menu=ensureMenu(dateKey());
  renderCalorieProgress(menu);
  $("#menuCalories").textContent=menu.calories;
  $("#menuProtein").textContent=menu.protein;
  $("#menuSummary").innerHTML=menu.meals.map(meal=>`
    <div class="menu-row">
      <b>${escapeHtml(meal.name)}</b>
      <div class="muted">${escapeHtml(meal.food)}</div>
      <span class="meal-kcal-badge">約 ${Number(meal.kcal)||0} kcal</span>
    </div>
  `).join("");
}


let menuHasUnsavedChanges=false;

function setMenuUnsaved(unsaved){
  menuHasUnsavedChanges=Boolean(unsaved);
  const button=document.getElementById("saveMenuBtn");
  if(button){
    button.textContent=menuHasUnsavedChanges
      ?"儲存此日期菜單（尚未儲存）"
      :"儲存此日期菜單";
    button.classList.toggle("unsaved",menuHasUnsavedChanges);
  }
}

function collectVisibleMenuEdits(){
  const menu=ensureMenu(menuPreviewKey);
  const cards=[...document.querySelectorAll("#mealList .meal")];
  cards.forEach((card,index)=>{
    const meal=menu.meals[index];
    if(!meal)return;
    const foodInput=card.querySelector(".actual-food-input");
    const kcalInput=card.querySelector(".meal-kcal-input");
    if(foodInput)meal.food=foodInput.value.trim();
    if(kcalInput)meal.kcal=Math.max(0,Number(kcalInput.value)||0);
  });
  state.menus[menuPreviewKey]=menu;
  return menu;
}

async function saveCurrentMenu(){
  const menu=collectVisibleMenuEdits();
  saveLocal(state);
  renderHomeMenuSummary();

  if(user){
    const base=doc(db,"users",user.uid);
    await setDoc(
      doc(base,"menus",menuPreviewKey),
      {json:JSON.stringify(menu)}
    );
    status("同步正常","菜單已同步："+new Date().toLocaleString("zh-TW"));
    if(document.getElementById("syncStatus")){
      document.getElementById("syncStatus").textContent="菜單已同步至雲端。";
    }
  }

  setMenuUnsaved(false);
  if(menuPreviewKey === dateKey()) renderCalorieProgress(menu);
  alert(`${menuPreviewKey} 菜單已儲存。`);
}

function renderMenuPreview(){
  const menu=menuForPreview(menuPreviewKey);
  const day=ensureDay(menuPreviewKey);
  const date=dateFromKey(menuPreviewKey);

  $("#menuPreviewDate").value=menuPreviewKey;
  $("#menuPreviewNote").textContent=
    `${date.toLocaleDateString("zh-TW",{year:"numeric",month:"long",day:"numeric",weekday:"long"})} · ${day.title}`;
  $("#menuTypeText").textContent=menu.label;

  $("#menuPageSummary").innerHTML=menu.meals.map(meal=>`
    <div class="menu-row">
      <b>${escapeHtml(meal.name)}</b>
      <div class="muted">${escapeHtml(meal.food)}</div>
      <span class="meal-kcal-badge">約 ${Number(meal.kcal)||0} kcal</span>
    </div>
  `).join("");

  const list=$("#mealList");
  list.innerHTML="";

  menu.meals.forEach(meal=>{
    const card=document.createElement("article");
    card.className="meal";
    card.innerHTML=`
      <div class="between">
        <h3>${escapeHtml(meal.name)}</h3>
        <span class="pill meal-estimate-label">約 ${Number(meal.kcal)||0} kcal</span>
      </div>

      <label>實際吃的內容
        <textarea class="actual-food-input" placeholder="例如：雞胸 150g＋白飯半碗＋青菜">${escapeHtml(meal.food)}</textarea>
      </label>

      <div class="meal-estimate-actions">
        <button class="soft estimate-calories-btn" type="button">自動估算熱量</button>
        <span class="muted">依常見份量估算，可再手動調整。</span>
      </div>

      <label>估計熱量
        <input class="meal-kcal-input" type="number" min="0" value="${Number(meal.kcal)||0}">
      </label>
    `;

    const textArea=card.querySelector(".actual-food-input");
    const kcalInput=card.querySelector(".meal-kcal-input");
    const kcalLabel=card.querySelector(".meal-estimate-label");

    const refreshLabel=()=>{
      kcalLabel.textContent=`約 ${Number(meal.kcal)||0} kcal`;
    };

    const estimateAndSave=()=>{
      meal.food=textArea.value.trim();
      meal.kcal=estimateMealCalories(meal.food);
      kcalInput.value=meal.kcal;
      refreshLabel();
      saveLocal(state);
      renderHomeMenuSummary();
      setMenuUnsaved(true);
    };

    textArea.oninput=()=>{
      meal.food=textArea.value;
      setMenuUnsaved(true);
    };
    textArea.onchange=estimateAndSave;
    card.querySelector(".estimate-calories-btn").onclick=()=>{
      estimateAndSave();
      setMenuUnsaved(true);
    };

    kcalInput.oninput=()=>{
      meal.kcal=Math.max(0,Number(kcalInput.value)||0);
      refreshLabel();
      setMenuUnsaved(true);
    };
    kcalInput.onchange=()=>{
      meal.kcal=Math.max(0,Number(kcalInput.value)||0);
      refreshLabel();
      saveLocal(state);
      renderHomeMenuSummary();
      setMenuUnsaved(true);
    };

    list.appendChild(card);
  });
}
function allWorkoutRecords(){
  return Object.values(state.days).filter(day=>day.exercises?.length);
}
function renderTrainingStats(){
  const records=allWorkoutRecords();
  const completed=records.filter(day=>day.status==="completed"||pct(day)===100);
  $("#totalWorkoutCount").textContent=completed.length;
  $("#overallCompletion").textContent=records.length?Math.round(records.reduce((s,d)=>s+pct(d),0)/records.length)+"%":"0%";
  const entries=Object.entries(state.history||{}).filter(([,r])=>Array.isArray(r)&&r.length);
  $("#trackedExerciseCount").textContent=entries.length;
  const box=$("#prSummaryList");
  box.innerHTML=entries
    .map(([name,records])=>({name,max:Math.max(0,...records.map(x=>Number(x.max)||0)),date:records.find(x=>Number(x.max)===Math.max(0,...records.map(y=>Number(y.max)||0)))?.date}))
    .filter(x=>x.max>0).sort((a,b)=>b.max-a.max).slice(0,10)
    .map(x=>`<div class="pr-row"><div><b>${escapeHtml(x.name)}</b><div class="muted">${x.date||""}</div></div><span class="pill">${x.max} kg</span></div>`).join("");
  if(!box.innerHTML)box.innerHTML='<p class="muted">完成訓練並輸入重量後，這裡會顯示個人最佳紀錄。</p>';
}
function applyPersonalPlan(){
  ensureExtendedState();
  const presetKey=$("#personalPlanPreset").value;
  const preset=PLAN_PRESETS[presetKey]||PLAN_PRESETS.gluteFatloss;
  state.profile.proteinTarget=Number($("#profileProteinTarget").value)||125;
  state.profile.waterTarget=Number($("#profileWaterTarget").value)||2500;
  state.profile.stepsTarget=Number($("#profileStepsTarget").value)||9000;
  state.profile.sleepTarget=Number($("#profileSleepTarget").value)||7.5;
  state.profile.aiIntensity=$("#aiIntensity").value||"normal";
  const presetGoals={
    gluteFatloss:"fatloss",
    balancedFatloss:"fatloss",
    muscle:"muscle",
    beginner:"health"
  };
  state.profile.goal=presetGoals[presetKey]||"recomp";
  state.goal={...state.goal,...preset.goal};
  state.weeklyPlan=preset.plan();

  rebuildFuturePlanAndMenus(dateKey(),28);
  save();
  renderMenuPreview();
  renderHomeMenuSummary();
  alert("計畫已套用，今天與未來 28 天的課表、熱量與菜單已同步重建。");
  goToPage("homePage");
}

function save(){saveLocal(state);render();if(user)syncCloud(false)}
async function syncCloud(show=true){if(!user){status("尚未登入","登入後可跨裝置同步。");return}try{status("同步中","正在寫入雲端…");await pushCloud(user.uid,state);status("同步正常","最後同步："+new Date().toLocaleString("zh-TW"));$("#syncStatus").textContent="已同步至雲端。";if(show)alert("同步完成")}catch(e){console.error(e);status("同步失敗",e.message);$("#syncStatus").textContent="同步失敗，本機資料仍保留。"}}
function status(t,d){$("#syncTitle").textContent=t;$("#syncDetail").textContent=d}
function ensureDay(key=dateKey()){if(!state.days[key]){const tpl=state.weeklyPlan[dateFromKey(key).getDay()]||state.weeklyPlan[0];state.days[key]={title:tpl.title,note:tpl.note,status:"pending",exercises:tpl.exercises.map(makeExercise),tasks:clone(state.tasks),foodTiming:"60"}}return state.days[key]}
function menuKind(day){return day.title.includes("休息")?"rest":day.title.includes("有氧")?"cardio":"strength"}

const GOAL_MENU_CONFIG={
  fatloss:{
    name:"降低體脂",
    targets:{
      strength:{calories:1700,protein:125},
      cardio:{calories:1600,protein:120},
      rest:{calories:1500,protein:120}
    }
  },
  muscle:{
    name:"增加肌肉",
    targets:{
      strength:{calories:2200,protein:140},
      cardio:{calories:2050,protein:135},
      rest:{calories:1950,protein:130}
    }
  },
  recomp:{
    name:"體態重塑",
    targets:{
      strength:{calories:1850,protein:130},
      cardio:{calories:1750,protein:125},
      rest:{calories:1650,protein:125}
    }
  },
  strength:{
    name:"提升力量",
    targets:{
      strength:{calories:2100,protein:140},
      cardio:{calories:1900,protein:130},
      rest:{calories:1800,protein:130}
    }
  },
  health:{
    name:"健康維持",
    targets:{
      strength:{calories:1800,protein:120},
      cardio:{calories:1700,protein:115},
      rest:{calories:1650,protein:115}
    }
  }
};

function currentGoalKey(){
  const key=String(state.profile?.goal||"recomp");
  return GOAL_MENU_CONFIG[key]?key:"recomp";
}

function goalMenuFoods(goal,kind){
  const menus={
    fatloss:{
      strength:[
        ["早餐","雞蛋 2 顆＋全麥吐司＋無糖豆漿＋水果",400],
        ["午餐","雞胸／雞腿排 150 g＋白飯半碗至一碗＋兩份蔬菜",500],
        ["練前／點心","香蕉或地瓜＋無糖優格",200],
        ["晚餐","魚／瘦牛／豬里肌＋半碗飯＋大量蔬菜",480]
      ],
      cardio:[
        ["早餐","蛋白質早餐＋無糖豆漿＋水果",370],
        ["午餐","雞胸便當，飯量減少並增加蔬菜",470],
        ["點心","無糖優格、茶葉蛋或毛豆",170],
        ["晚餐","魚／豆腐／瘦肉＋蔬菜＋少量澱粉",430]
      ],
      rest:[
        ["早餐","雞蛋＋無糖豆漿＋水果",350],
        ["午餐","魚／雞肉＋半碗飯＋蔬菜",450],
        ["點心","希臘優格、毛豆或茶葉蛋",170],
        ["晚餐","豆腐／魚／瘦肉＋大量蔬菜",430]
      ]
    },
    muscle:{
      strength:[
        ["早餐","燕麥＋牛奶／豆漿＋雞蛋 2 顆＋香蕉＋吐司",550],
        ["午餐","雞腿排／牛肉 180 g＋白飯 1.5 碗＋蔬菜",700],
        ["練前／練後","香蕉＋乳清＋優格或地瓜",350],
        ["晚餐","鮭魚／牛肉／雞胸＋一碗飯＋蔬菜",600]
      ],
      cardio:[
        ["早餐","燕麥＋雞蛋＋無糖豆漿＋香蕉",500],
        ["午餐","雞肉／牛肉＋一碗飯＋蔬菜",620],
        ["點心","乳清＋水果＋優格",300],
        ["晚餐","魚／瘦肉＋一碗飯＋蔬菜",550]
      ],
      rest:[
        ["早餐","雞蛋 2 顆＋燕麥＋豆漿＋水果",480],
        ["午餐","雞肉／魚＋一碗飯＋蔬菜",600],
        ["點心","乳清、優格或堅果",280],
        ["晚餐","牛肉／魚／豆腐＋飯＋蔬菜",520]
      ]
    },
    recomp:{
      strength:[
        ["早餐","燕麥＋雞蛋 2 顆＋無糖豆漿＋水果",450],
        ["午餐","雞胸／雞腿排 150 g＋白飯一碗＋蔬菜",560],
        ["練前／點心","香蕉＋無糖優格或乳清",230],
        ["晚餐","魚／瘦肉＋半碗至一碗飯＋蔬菜",510]
      ],
      cardio:[
        ["早餐","全麥吐司＋雞蛋＋無糖豆漿＋水果",410],
        ["午餐","雞胸／魚＋飯＋蔬菜",520],
        ["點心","優格、乳清或毛豆",210],
        ["晚餐","瘦肉／豆腐＋蔬菜＋適量澱粉",470]
      ],
      rest:[
        ["早餐","雞蛋＋燕麥／吐司＋無糖豆漿",390],
        ["午餐","雞肉／魚＋半碗至一碗飯＋蔬菜",500],
        ["點心","優格、茶葉蛋或毛豆",190],
        ["晚餐","魚／豆腐／瘦肉＋蔬菜",450]
      ]
    },
    strength:{
      strength:[
        ["早餐","燕麥＋雞蛋 2 顆＋豆漿＋香蕉＋吐司",520],
        ["午餐","牛肉／雞腿排 180 g＋白飯 1.5 碗＋蔬菜",670],
        ["練前／練後","香蕉＋乳清＋地瓜",320],
        ["晚餐","魚／牛肉＋一碗飯＋蔬菜",590]
      ],
      cardio:[
        ["早餐","燕麥＋雞蛋＋豆漿＋水果",450],
        ["午餐","雞肉／牛肉＋一碗飯＋蔬菜",580],
        ["點心","乳清＋香蕉或優格",260],
        ["晚餐","魚／瘦肉＋飯＋蔬菜",510]
      ],
      rest:[
        ["早餐","雞蛋 2 顆＋燕麥＋豆漿",430],
        ["午餐","雞肉／魚＋一碗飯＋蔬菜",550],
        ["點心","乳清、優格或毛豆",230],
        ["晚餐","瘦肉／豆腐＋飯＋蔬菜",490]
      ]
    },
    health:{
      strength:[
        ["早餐","全麥吐司＋雞蛋 2 顆＋無糖豆漿＋水果",430],
        ["午餐","雞肉／魚＋白飯＋兩份蔬菜",540],
        ["點心","水果＋優格或茶葉蛋",210],
        ["晚餐","瘦肉／豆腐＋適量澱粉＋蔬菜",500]
      ],
      cardio:[
        ["早餐","雞蛋＋吐司＋無糖豆漿＋水果",400],
        ["午餐","雞胸／魚＋飯＋蔬菜",500],
        ["點心","水果、優格或毛豆",190],
        ["晚餐","魚／豆腐／瘦肉＋蔬菜＋少量澱粉",460]
      ],
      rest:[
        ["早餐","雞蛋＋無糖豆漿＋水果",370],
        ["午餐","雞肉／魚＋飯＋蔬菜",480],
        ["點心","優格、茶葉蛋或毛豆",180],
        ["晚餐","豆腐／魚／瘦肉＋蔬菜",440]
      ]
    }
  };
  return clone(menus[goal]?.[kind]||menus.recomp[kind]);
}

function buildGoalMenu(key=dateKey()){
  const day=ensureDay(key);
  const kind=menuKind(day);
  const goal=currentGoalKey();
  const config=GOAL_MENU_CONFIG[goal];
  const target=config.targets[kind];
  const kindNames={strength:"重訓日",cardio:"有氧日",rest:"休息日"};

  return {
    label:`${config.name}・${kindNames[kind]}菜單`,
    goal,
    kind,
    calories:target.calories,
    protein:target.protein,
    meals:goalMenuFoods(goal,kind).map(([name,food,kcal])=>({name,food,kcal}))
  };
}

function ensureMenu(key=dateKey()){
  if(!state.menus[key])state.menus[key]=buildGoalMenu(key);
  return state.menus[key];
}

function rebuildFuturePlanAndMenus(startKey=dateKey(),daysAhead=28){
  Object.keys(state.days).forEach(key=>{
    if(key>=startKey)delete state.days[key];
  });
  Object.keys(state.menus).forEach(key=>{
    if(key>=startKey)delete state.menus[key];
  });

  const start=dateFromKey(startKey);
  for(let offset=0;offset<daysAhead;offset++){
    const date=new Date(start);
    date.setDate(start.getDate()+offset);
    const key=dateKey(date);
    ensureDay(key);
    ensureMenu(key);
  }

  menuPreviewKey=startKey;
}

function pct(day){let t=0,d=0;day.exercises.forEach(e=>e.sets.forEach(s=>{t++;if(s.done)d++}));return t?Math.round(d/t*100):0}
function taskPct(day){return day.tasks.length?Math.round(day.tasks.filter(x=>x.done).length/day.tasks.length*100):0}
function category(day){const n=day.exercises.map(e=>e.name).join(" ");if(/臀|腿|深蹲|RDL|Hip|Leg/.test(n))return"lower";if(/胸|肩|推/.test(n))return"upper";if(/背|拉|划船/.test(n))return"back";if(/有氧|Zone/.test(n))return"cardio";return"full"}
function warmups(day){const m={lower:[["快走",5,"分鐘"],["髖關節活動",10,"次"],["徒手深蹲",15,"下"],["臀橋",15,"下"]],upper:[["快走",5,"分鐘"],["肩關節繞環",15,"次"],["Band Pull Apart",20,"下"]],back:[["划船機",5,"分鐘"],["肩胛收縮",15,"下"],["Face Pull",15,"下"]],cardio:[["輕鬆步行",5,"分鐘"],["腳踝活動",10,"次"]],full:[["快走",5,"分鐘"],["全身關節活動",5,"分鐘"]]}[category(day)];if(!day.warmups)day.warmups=m.map((x,i)=>({id:i,name:x[0],amount:x[1],unit:x[2],done:false}));return day.warmups}
function stretches(day){const m={lower:[["臀肌",30],["股四頭肌",30],["腿後肌",30],["小腿",30]],upper:[["胸大肌",30],["肩前側",30],["肱三頭肌",30]],back:[["背闊肌",30],["上背",30],["二頭肌",30]],cardio:[["小腿",30],["腿後肌",30],["股四頭肌",30]],full:[["全身放鬆",45]]}[category(day)];if(!day.stretches)day.stretches=m.map((x,i)=>({id:i,name:x[0],seconds:x[1],done:false}));return day.stretches}
function foods(t){return t==="30"?["香蕉","乳清或無糖豆漿"]:t==="120"?["雞胸肉＋白飯","魚／瘦肉＋澱粉","正常均衡正餐"]:["香蕉＋優格","地瓜＋茶葉蛋","吐司＋無糖豆漿"]}
function last(ex){return state.history[ex.name]?.[0]}
function suggestion(ex){const l=last(ex),inc=ex.inc||state.profile.increment;if(!l)return"首次紀錄：先用可保留 2–3 下餘力的重量。";if(l.completion===100&&l.max>0)return`建議 ${l.max+inc} kg`;if(l.completion>=75)return`建議維持 ${l.max||"上次"} kg`;return l.max?`建議約 ${(l.max*.9).toFixed(1)} kg`:"建議降低難度"}
function cycle(){const p=state.profile;if(!p.cycleEnabled||!p.lastPeriod)return null;const diff=Math.floor((new Date()-dateFromKey(p.lastPeriod))/86400000),len=+p.cycleLength||28,day=((diff%len)+len)%len+1,per=+p.periodLength||6;if(day<=per)return{title:`Day ${day} · 月經期`,advice:"依疲勞與疼痛降低重量或組數。"};if(day<=14)return{title:`Day ${day} · 濾泡期`,advice:"通常適合學習動作與漸進加重。"};if(day<=21)return{title:`Day ${day} · 排卵後期`,advice:"可維持課表並留意恢復。"};return{title:`Day ${day} · 經前期`,advice:"水腫與疲勞可能增加，優先睡眠與正常飲食。"}}


let friendships=[],receivedRequests=[],feedPosts=[],socialUnsubs=[];
const friendCodeForUid=uid=>uid.slice(0,8).toUpperCase();
const pairId=(a,b)=>[a,b].sort().join("_");
function clearSocial(){
  socialUnsubs.forEach(fn=>{try{fn()}catch{}});
  socialUnsubs=[];
}
async function ensurePublicProfile(){
  if(!user)return;
  await setDoc(doc(db,"publicProfiles",user.uid),{
    uid:user.uid,
    displayName:user.displayName||state.profile.displayName||"使用者",
    photoURL:user.photoURL||"",
    friendCode:friendCodeForUid(user.uid),
    updatedAt:serverTimestamp()
  },{merge:true});
}
function friendMessage(text,error=false){
  const el=$("#friendStatus");
  if(el){el.textContent=text;el.style.color=error?"#b64040":""}
}
async function findProfile(code){
  const q=query(collection(db,"publicProfiles"),where("friendCode","==",code.trim().toUpperCase()));
  const snap=await getDocs(q);
  return snap.empty?null:{id:snap.docs[0].id,...snap.docs[0].data()};
}
async function sendFriendRequest(){
  if(!user)return alert("請先登入 Google。");
  const code=$("#friendCodeInput").value.trim().toUpperCase();
  if(!code)return friendMessage("請輸入好友代碼。",true);
  try{
    const target=await findProfile(code);
    if(!target)return friendMessage("找不到此好友代碼。",true);
    if(target.uid===user.uid)return friendMessage("不能新增自己。",true);
    const pid=pairId(user.uid,target.uid);
    const fs=await getDoc(doc(db,"friendships",pid));
    if(fs.exists())return friendMessage("你們已經是好友。",true);
    await setDoc(doc(db,"friendRequests",pid),{
      pairId:pid,fromUid:user.uid,fromName:user.displayName||"使用者",fromPhoto:user.photoURL||"",
      toUid:target.uid,toName:target.displayName||"使用者",status:"pending",createdAt:serverTimestamp()
    });
    $("#friendCodeInput").value="";
    friendMessage(`已送出邀請給 ${target.displayName||"使用者"}。`);
  }catch(e){console.error(e);friendMessage(e.message,true)}
}
async function acceptRequest(r){
  await updateDoc(doc(db,"friendRequests",r.id),{status:"accepted",respondedAt:serverTimestamp()});
  await setDoc(doc(db,"friendships",r.pairId),{
    members:[r.fromUid,r.toUid],
    names:{[r.fromUid]:r.fromName||"使用者",[r.toUid]:user.displayName||r.toName||"使用者"},
    photos:{[r.fromUid]:r.fromPhoto||"",[r.toUid]:user.photoURL||""},
    status:"accepted",createdAt:serverTimestamp()
  });
}
async function rejectRequest(r){
  await updateDoc(doc(db,"friendRequests",r.id),{status:"rejected",respondedAt:serverTimestamp()});
}
async function removeFriend(id){
  if(confirm("確定移除此好友？"))await deleteDoc(doc(db,"friendships",id));
}
function friendUids(){
  return user?friendships.map(f=>f.members.find(x=>x!==user.uid)).filter(Boolean):[];
}
async function sharePost(){
  if(!user)return alert("請先登入 Google。");
  const text=$("#postText").value.trim();
  const include=$("#includeWorkout").checked;
  const day=ensureDay();
  if(!text&&!include)return alert("請輸入內容或附上今日課表。");
  try{
    $("#sharePostBtn").disabled=true;
    $("#sharePostBtn").textContent="分享中…";
    await addDoc(collection(db,"feedPosts"),{
      ownerUid:user.uid,
      ownerName:user.displayName||state.profile.displayName||"使用者",
      ownerPhoto:user.photoURL||"",
      text,
      workout:include?{title:day.title,completion:pct(day)}:null,
      viewers:[user.uid,...friendUids()],
      createdAt:serverTimestamp()
    });
    $("#postText").value="";
    alert("已分享！");
  }catch(error){
    console.error(error);
    alert(`分享失敗：${error.message}`);
  }finally{
    $("#sharePostBtn").disabled=false;
    $("#sharePostBtn").textContent="分享給好友";
  }
}
async function toggleLike(post){
  const ref=doc(db,"feedPosts",post.id,"likes",user.uid),snap=await getDoc(ref);
  if(snap.exists())await deleteDoc(ref);
  else await setDoc(ref,{uid:user.uid,name:user.displayName||"使用者",createdAt:serverTimestamp()});
}
async function addComment(postId,input){
  const text=input.value.trim();if(!text)return;
  await addDoc(collection(db,"feedPosts",postId,"comments"),{
    uid:user.uid,name:user.displayName||"使用者",text,createdAt:serverTimestamp()
  });
  input.value="";
}
function listenSocial(){
  clearSocial();if(!user)return;
  socialUnsubs.push(onSnapshot(query(collection(db,"friendRequests"),where("toUid","==",user.uid)),snap=>{
    receivedRequests=snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.status==="pending");renderFriendRequests();
  }));
  socialUnsubs.push(onSnapshot(query(collection(db,"friendships"),where("members","array-contains",user.uid)),snap=>{
    friendships=snap.docs.map(d=>({id:d.id,...d.data()})).filter(x=>x.status==="accepted");renderFriends();
  }));
  socialUnsubs.push(onSnapshot(query(collection(db,"feedPosts"),where("viewers","array-contains",user.uid)),snap=>{
    feedPosts=snap.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));renderFeed();
  }));
}
function renderChallenge(){
  const month=dateKey().slice(0,7);
  const completed=Object.entries(state.days).filter(([k,d])=>k.startsWith(month)&&(d.status==="completed"||pct(d)===100)).length;
  if($("#challengeProgressText"))$("#challengeProgressText").textContent=`${completed} / 20`;
  if($("#challengeProgressBar"))$("#challengeProgressBar").style.width=Math.min(100,completed/20*100)+"%";
}
function renderSocialIdentity(){
  const el=$("#myFriendCode");if(el)el.textContent=user?friendCodeForUid(user.uid):"登入後顯示";
}
function renderFriendRequests(){
  const b=$("#friendRequestsList");if(!b)return;
  if(!receivedRequests.length){b.innerHTML='<p class="muted">目前沒有待處理邀請。</p>';return}
  b.innerHTML="";receivedRequests.forEach(r=>{
    const x=document.createElement("div");x.className="request-row";
    x.innerHTML=`<div class="person"><img src="${r.fromPhoto||""}"><div><div class="person-name">${r.fromName||"使用者"}</div><div class="muted">想加你為好友</div></div></div><div class="friend-actions"><button class="tiny yes">接受</button><button class="tiny no">拒絕</button></div>`;
    x.querySelector(".yes").onclick=()=>acceptRequest(r);x.querySelector(".no").onclick=()=>rejectRequest(r);b.appendChild(x);
  });
}
function renderFriends(){
  const b=$("#friendsList");if(!b)return;
  if(!friendships.length){b.innerHTML='<p class="muted">尚無好友。</p>';return}
  b.innerHTML="";friendships.forEach(f=>{
    const uid=f.members.find(x=>x!==user.uid),name=f.names?.[uid]||"好友",photo=f.photos?.[uid]||"";
    const x=document.createElement("div");x.className="friend-row";
    x.innerHTML=`<div class="person"><img src="${photo}"><div class="person-name">${name}</div></div><button class="tiny">移除</button>`;
    x.querySelector("button").onclick=()=>removeFriend(f.id);b.appendChild(x);
  });
}
function renderFeed(){
  const b=$("#friendFeed");if(!b)return;
  if(!feedPosts.length){b.innerHTML='<article class="card muted">目前沒有好友動態。</article>';return}
  b.innerHTML="";feedPosts.forEach(p=>{
    const x=document.createElement("article");x.className="feed-card";
    x.innerHTML=`<div class="person"><img src="${p.ownerPhoto||""}"><div><div class="person-name">${p.ownerName||"使用者"}</div><div class="muted">${p.createdAt?.toDate?p.createdAt.toDate().toLocaleString("zh-TW"):"剛剛"}</div></div></div>${p.text?`<div class="feed-text">${escapeHtml(p.text)}</div>`:""}${p.workout?`<div class="feed-workout"><b>${p.workout.title}</b><br>完成度 ${p.workout.completion}%</div>`:""}<div class="reaction-bar"><button class="tiny like">♡ 讚</button><span class="muted count">讀取中</span></div><div class="comments"></div><div class="comment-form"><input placeholder="留言鼓勵好友"><button class="tiny send">送出</button></div>`;
    const like=x.querySelector(".like"),count=x.querySelector(".count"),comments=x.querySelector(".comments");
    const ul=onSnapshot(collection(db,"feedPosts",p.id,"likes"),s=>{count.textContent=`${s.size} 個讚`;like.textContent=s.docs.some(d=>d.id===user.uid)?"♥ 已讚":"♡ 讚"});
    const uc=onSnapshot(collection(db,"feedPosts",p.id,"comments"),s=>{comments.innerHTML=s.docs.map(d=>d.data()).sort((a,b)=>(a.createdAt?.seconds||0)-(b.createdAt?.seconds||0)).map(c=>`<div class="comment"><b>${escapeHtml(c.name||"使用者")}</b>　${escapeHtml(c.text||"")}</div>`).join("")});
    socialUnsubs.push(ul,uc);like.onclick=()=>toggleLike(p);x.querySelector(".send").onclick=()=>addComment(p.id,x.querySelector(".comment-form input"));b.appendChild(x);
  });
}
function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}




// ===== JianJian v9.6 Custom Exercise / Photo / Plan Editor =====
let selectedPostPhotoFile=null;

function hydrateCustomExerciseLibrary(){
  state.customExercises=state.customExercises||{};
  Object.assign(EXERCISE_DB,state.customExercises);
}

function makeCustomExerciseData({name,category,equipment,sets,reps,notes}){
  return {
    name,
    category:category||"其他",
    equipment:equipment||"自訂",
    level:"自訂",
    sets:Number(sets)||3,
    reps:Number(reps)||10,
    inc:state.profile.increment||2.5,
    primary:[category||"自訂"],
    secondary:[],
    steps:notes?[notes]:["依自己的訓練目的與安全姿勢完成動作。"],
    errors:["重量過重導致姿勢失控"],
    breathing:"發力時吐氣，回程吸氣。",
    warmup:["先用輕重量完成一組暖身"],
    stretch:["訓練後伸展主要訓練部位"],
    weights:{
      beginner:"先選可保留 2～3 下餘力的重量",
      intermediate:"依上次完成狀況漸進",
      advanced:"依 RPE 與週期安排"
    },
    alternatives:[]
  };
}

function openCustomExerciseModal(){
  $("#customExerciseModal").classList.add("open");
  $("#customExerciseName").focus();
}
function closeCustomExerciseModal(){
  $("#customExerciseModal").classList.remove("open");
}
function addCustomExercise(){
  const name=$("#customExerciseName").value.trim();
  if(!name)return alert("請輸入動作名稱。");

  const data=makeCustomExerciseData({
    name,
    category:$("#customExerciseCategory").value,
    equipment:$("#customExerciseEquipment").value.trim(),
    sets:$("#customExerciseSets").value,
    reps:$("#customExerciseReps").value,
    notes:$("#customExerciseNotes").value.trim()
  });

  const saveToLibrary=$("#saveCustomExerciseToLibrary").checked;
  let id=`custom_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;

  if(saveToLibrary){
    state.customExercises=state.customExercises||{};
    state.customExercises[id]=data;
    EXERCISE_DB[id]=data;
  }

  const exercise={
    id:crypto.randomUUID(),
    exerciseId:saveToLibrary?id:null,
    name:data.name,
    guide:saveToLibrary?id:null,
    inc:data.inc,
    alts:[],
    customGuide:saveToLibrary?null:data,
    extra:true,
    status:"pending",
    sets:Array.from({length:data.sets},()=>({done:false,weight:"",reps:data.reps}))
  };

  ensureDay().exercises.push(exercise);
  closeCustomExerciseModal();
  $("#customExerciseName").value="";
  $("#customExerciseEquipment").value="";
  $("#customExerciseNotes").value="";
  save();
  alert(saveToLibrary?"已加入今日訓練與動作庫。":"已加入今日訓練。");
}

async function compressPostImage(file,maxSide=1280,quality=.82){
  const bitmap=await createImageBitmap(file);
  let width=bitmap.width,height=bitmap.height;
  const ratio=Math.min(1,maxSide/Math.max(width,height));
  width=Math.round(width*ratio);height=Math.round(height*ratio);
  const canvas=document.createElement("canvas");
  canvas.width=width;canvas.height=height;
  canvas.getContext("2d").drawImage(bitmap,0,0,width,height);
  bitmap.close?.();
  return await new Promise((resolve,reject)=>{
    canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("無法處理相片")),"image/jpeg",quality);
  });
}

function clearPostPhoto(){
  selectedPostPhotoFile=null;
  $("#postPhotoInput").value="";
  $("#postPhotoPreview").hidden=true;
  $("#postPhotoPreviewImage").removeAttribute("src");
}

function exerciseFromPlanName(name){
  const normalized=name.trim().toLowerCase();
  const match=Object.entries(EXERCISE_DB).find(([,data])=>
    data.name.toLowerCase()===normalized ||
    data.name.toLowerCase().includes(normalized) ||
    normalized.includes(data.name.toLowerCase())
  );
  if(match)return clone(match[1]);
  return makeCustomExerciseData({
    name:name.trim(),
    category:"其他",
    equipment:"自訂",
    sets:3,
    reps:10,
    notes:""
  });
}

function planCategorySummary(plan){
  const counts={};
  plan.forEach(day=>day.exercises.forEach(ex=>{
    const data=exerciseDataFor(ex)||exerciseFromPlanName(ex.name);
    const category=data.category||"其他";
    counts[category]=(counts[category]||0)+1;
  }));
  return counts;
}

function buildPlanRecommendations(plan){
  const counts=planCategorySummary(plan);
  const recommendations=[];

  if((counts["臀部"]||0)+(counts["腿部"]||0)>=3){
    recommendations.push({
      title:"臀腿課表建議",
      items:["暖身：臀橋、髖關節活動、徒手深蹲","輔助：髖外展或腿彎舉","拉伸：臀肌、腿後肌、髖屈肌"]
    });
  }
  if((counts["胸部"]||0)+(counts["肩部"]||0)>=2){
    recommendations.push({
      title:"推類課表建議",
      items:["暖身：肩關節繞環、彈力帶外旋","輔助：側平舉或三頭下壓","拉伸：胸肌、前三角肌"]
    });
  }
  if((counts["背部"]||0)>=2){
    recommendations.push({
      title:"拉類課表建議",
      items:["暖身：肩胛下壓、Band Pull Apart","輔助：Face Pull 或二頭彎舉","拉伸：背闊肌、上背"]
    });
  }
  if((counts["核心"]||0)===0){
    recommendations.push({
      title:"核心補強",
      items:["每週加入 2 次核心訓練","可選 Dead Bug、Plank 或 Pallof Press"]
    });
  }
  if((counts["有氧"]||0)===0 && state.profile.goal==="fatloss"){
    recommendations.push({
      title:"減脂有氧建議",
      items:["每週安排 2～3 次 Zone 2","每次 20～40 分鐘"]
    });
  }
  return recommendations;
}

function openWeeklyPlanEditor(){
  const box=$("#weeklyPlanEditorDays");
  box.innerHTML="";
  const weekdayNames=["星期日","星期一","星期二","星期三","星期四","星期五","星期六"];

  state.weeklyPlan.forEach((day,index)=>{
    const section=document.createElement("section");
    section.className="weekly-editor-day";
    section.innerHTML=`
      <div class="between">
        <b>${weekdayNames[index]}</b>
        <span class="pill">${day.exercises.length} 個動作</span>
      </div>
      <label>課表名稱<input data-plan-title="${index}" value="${escapeHtml(day.title||"")}"></label>
      <label>說明<input data-plan-note="${index}" value="${escapeHtml(day.note||"")}"></label>
      <label>動作（每行一個）
        <textarea data-plan-exercises="${index}" placeholder="例如：深蹲 Squat&#10;腿推 Leg Press">${day.exercises.map(ex=>ex.name).join("\n")}</textarea>
      </label>
    `;
    box.appendChild(section);
  });

  $("#weeklyPlanEditor").hidden=false;
  $("#weeklyPlanEditor").scrollIntoView({behavior:"smooth",block:"start"});
}

function saveWeeklyPlanEdits(){
  const updated=state.weeklyPlan.map((oldDay,index)=>{
    const title=$(`[data-plan-title="${index}"]`).value.trim()||"自訂課表";
    const note=$(`[data-plan-note="${index}"]`).value.trim();
    const names=$(`[data-plan-exercises="${index}"]`).value
      .split("\n").map(x=>x.trim()).filter(Boolean);

    const exercises=names.map(name=>{
      const data=exerciseFromPlanName(name);
      const id=Object.entries(EXERCISE_DB).find(([,d])=>d.name===data.name)?.[0];
      return id?clone(EXERCISE_DB[id]):data;
    });

    return {title,note,exercises};
  });

  state.weeklyPlan=updated;

  rebuildFuturePlanAndMenus(dateKey(),28);

  const recommendations=buildPlanRecommendations(updated);
  const box=$("#planRecommendations");
  box.innerHTML=recommendations.length
    ? recommendations.map(group=>`
        <div class="recommendation-group">
          <b>${escapeHtml(group.title)}</b>
          <ul>${group.items.map(item=>`<li>${escapeHtml(item)}</li>`).join("")}</ul>
        </div>`).join("")
    : '<p class="muted">目前課表分配均衡，暫無額外建議。</p>';
  $("#planRecommendationsCard").hidden=false;
  $("#weeklyPlanEditor").hidden=true;

  save();
  renderMenuPreview();
  renderHomeMenuSummary();
  alert("課表已儲存，未來 28 天課表與菜單已同步重新產生。");
}

// ===== JianJian v9.2 Exercise Database =====
const EXERCISE_DB = {"hipThrust":{"name":"臀推 Hip Thrust","category":"臀部","equipment":"槓鈴／機械","level":"初中階","sets":4,"reps":10,"inc":2.5,"primary":["臀大肌"],"secondary":["腿後肌","核心"],"steps":["長椅上緣放在肩胛骨下方，槓鈴置於髖部摺線。","雙腳約與肩同寬，頂端時小腿接近垂直。","下巴微收、肋骨下沉，向上推至髖部完全伸展。","頂端夾臀停一秒，再控制下降。"],"errors":["用下背拱起代替伸髖","膝蓋內夾","腳放得太遠或太近","回程直接落下"],"breathing":"下降吸氣，向上推並夾臀時吐氣。","warmup":["徒手臀橋 15 下","空槓或輕重量 15 下","工作重量 50% 做 8–10 下"],"stretch":["臀肌拉伸 30 秒","髖屈肌拉伸 30 秒"],"weights":{"beginner":"徒手～20 kg","intermediate":"30～80 kg","advanced":"依個人訓練紀錄漸進"},"alternatives":["Smith 臀推","啞鈴臀推","臀橋","Cable Pull Through"]},"squat":{"name":"深蹲 Squat","category":"腿部","equipment":"槓鈴／Smith","level":"初中高階","sets":4,"reps":8,"inc":2.5,"primary":["股四頭肌","臀大肌"],"secondary":["核心","內收肌"],"steps":["雙腳約肩寬，腳尖自然向外。","吸氣撐緊核心，臀部與膝蓋同時開始下降。","膝蓋朝腳尖方向移動，腳掌三點持續踩地。","下降至可控制深度，再由中足發力站起。"],"errors":["膝蓋明顯內夾","腳跟離地","胸口塌下或下背圓曲","下降速度失控"],"breathing":"下降前吸氣並撐緊腹部，通過最難位置後吐氣。","warmup":["腳踝與髖關節活動","徒手深蹲 15 下","空槓 10～15 下"],"stretch":["股四頭肌拉伸","臀肌拉伸","小腿拉伸"],"weights":{"beginner":"徒手～空槓","intermediate":"依姿勢穩定逐步增加","advanced":"依 RPE 與訓練紀錄安排"},"alternatives":["高腳杯深蹲","Smith 深蹲","Hack Squat","腿推"]},"rdl":{"name":"羅馬尼亞硬舉 RDL","category":"腿部","equipment":"啞鈴／槓鈴","level":"初中階","sets":3,"reps":10,"inc":2,"primary":["腿後肌","臀大肌"],"secondary":["豎脊肌","背闊肌"],"steps":["雙腳髖寬，膝蓋微彎並維持角度。","臀部向後推，重量貼近大腿與小腿。","背部保持中立，感覺腿後側拉長即停止。","用臀部向前推回站姿。"],"errors":["背部圓曲","膝蓋彎太多變成深蹲","重量離身體太遠","追求碰地而失去姿勢"],"breathing":"下降前吸氣撐緊，站起時吐氣。","warmup":["髖鉸鏈練習 10 下","輕重量 RDL 12 下"],"stretch":["腿後肌拉伸","臀肌拉伸"],"weights":{"beginner":"每手 4～10 kg","intermediate":"依控制能力增加","advanced":"以 RPE 7～9 安排"},"alternatives":["槓鈴 RDL","Smith RDL","腿彎舉","Cable Pull Through"]},"legPress":{"name":"腿推 Leg Press","category":"腿部","equipment":"腿推機","level":"初中階","sets":4,"reps":10,"inc":5,"primary":["股四頭肌","臀大肌"],"secondary":["腿後肌"],"steps":["背部與臀部貼住椅背，腳掌完整踩住踏板。","解除安全鎖後控制下降。","膝蓋朝腳尖方向，下降至骨盆不捲起的深度。","推起時保留膝蓋微彎，不要鎖死。"],"errors":["臀部離開座椅","膝蓋內夾","下降過深造成骨盆捲起","推起時鎖死膝蓋"],"breathing":"下降吸氣，推起吐氣。","warmup":["空機或輕重量 15 下","工作重量 50% 做 10 下"],"stretch":["股四頭肌拉伸","臀肌拉伸"],"weights":{"beginner":"空機起逐步增加","intermediate":"可完成 10～12 下且保留 2 下","advanced":"依器材差異與 RPE 安排"},"alternatives":["Hack Squat","Smith 深蹲","高腳杯深蹲","分腿蹲"]},"bulgarian":{"name":"保加利亞分腿蹲","category":"腿部","equipment":"啞鈴／長椅","level":"中階","sets":3,"reps":10,"inc":2,"primary":["臀大肌","股四頭肌"],"secondary":["腿後肌","核心"],"steps":["後腳輕放長椅，前腳完整踩地。","軀幹可微微前傾，重心保持在前腳。","垂直向下，膝蓋朝腳尖方向。","以前腳發力站起。"],"errors":["前腳離椅子太近","重心放在後腳","膝蓋內夾","身體左右晃動"],"breathing":"下降吸氣，站起吐氣。","warmup":["徒手分腿蹲 10 下／側","臀中肌啟動"],"stretch":["髖屈肌拉伸","臀肌拉伸"],"weights":{"beginner":"徒手","intermediate":"每手 4～16 kg","advanced":"依穩定度漸進"},"alternatives":["反向弓箭步","登階 Step-up","腿推","分腿蹲"]},"abduction":{"name":"髖外展機","category":"臀部","equipment":"髖外展機","level":"初階","sets":3,"reps":20,"inc":2.5,"primary":["臀中肌","臀小肌"],"secondary":["臀大肌上束"],"steps":["臀部坐穩，膝蓋外側貼住擋墊。","核心穩定，向外打開至可控制範圍。","最外側停一秒。","慢慢控制回程。"],"errors":["用慣性甩動","回程直接放掉","身體前後大幅晃動","重量太重導致幅度過小"],"breathing":"向外打開吐氣，回程吸氣。","warmup":["彈力帶側走 10 步／側"],"stretch":["臀中肌拉伸"],"weights":{"beginner":"可控制 15～20 下的重量","intermediate":"逐步加重但保持停頓","advanced":"可搭配遞減組"},"alternatives":["彈力帶側走","Cable 髖外展","側躺抬腿","Monster Walk"]},"lat":{"name":"滑輪下拉 Lat Pulldown","category":"背部","equipment":"滑輪","level":"初中階","sets":3,"reps":10,"inc":2.5,"primary":["背闊肌"],"secondary":["肱二頭肌","下斜方肌"],"steps":["大腿固定，胸口微抬。","先讓肩胛下沉，再讓手肘朝下拉。","把手拉向上胸附近。","控制回程至手臂伸展。"],"errors":["身體大幅後仰甩動","聳肩","只用手臂拉","把手拉到頸後"],"breathing":"下拉吐氣，回程吸氣。","warmup":["肩胛下壓 10 下","輕重量下拉 15 下"],"stretch":["背闊肌拉伸"],"weights":{"beginner":"可完成 12 下的輕重量","intermediate":"8～12 下保留 2 下","advanced":"依訓練週期安排"},"alternatives":["輔助引體向上","高位下拉機","單手滑輪下拉","直臂下壓"]},"row":{"name":"坐姿划船 Seated Row","category":"背部","equipment":"滑輪／機械","level":"初中階","sets":3,"reps":10,"inc":2.5,"primary":["背闊肌","菱形肌"],"secondary":["肱二頭肌","後三角肌"],"steps":["胸口打開，軀幹保持穩定。","先讓肩胛後收，再將手肘向後拉。","把手拉向腹部。","控制回程，讓肩胛自然前伸。"],"errors":["身體前後大幅擺動","聳肩","手腕過度彎曲","只拉手不動肩胛"],"breathing":"後拉吐氣，回程吸氣。","warmup":["Band Pull Apart 15 下","輕重量划船 15 下"],"stretch":["上背拉伸","背闊肌拉伸"],"weights":{"beginner":"可穩定完成 12 下","intermediate":"逐步增加重量","advanced":"可使用停頓或單手版本"},"alternatives":["啞鈴划船","胸托划船","T-bar 划船","單手滑輪划船"]},"chest":{"name":"機械胸推 Chest Press","category":"胸部","equipment":"胸推機","level":"初階","sets":3,"reps":10,"inc":2.5,"primary":["胸大肌"],"secondary":["前三角肌","肱三頭肌"],"steps":["調整座椅，使握把約在胸口高度。","肩胛向後下固定，雙腳踩穩。","推出時手腕保持中立。","控制回程至胸部有伸展感。"],"errors":["肩膀向前跑","手腕折彎","手肘抬得太高","回程撞回"],"breathing":"推出吐氣，回程吸氣。","warmup":["肩胛活動","輕重量胸推 15 下"],"stretch":["門框胸肌伸展"],"weights":{"beginner":"輕重量 10～15 下","intermediate":"8～12 下保留 1～3 下","advanced":"依器材與週期安排"},"alternatives":["啞鈴臥推","Smith 臥推","伏地挺身","槓鈴臥推"]},"shoulder":{"name":"肩推 Shoulder Press","category":"肩部","equipment":"啞鈴／機械","level":"初中階","sets":3,"reps":10,"inc":2,"primary":["三角肌前束","三角肌中束"],"secondary":["肱三頭肌","核心"],"steps":["背部與臀部穩定，核心收緊。","手腕位於手肘上方。","向上推時避免聳肩。","下降至肩膀舒適範圍。"],"errors":["下背過度拱起","手腕折彎","下降太深","左右手不同步"],"breathing":"向上推吐氣，下降吸氣。","warmup":["肩關節繞環","輕重量肩推 12 下"],"stretch":["前三角肌與胸肌伸展"],"weights":{"beginner":"每手 2～6 kg","intermediate":"每手 6～16 kg","advanced":"依姿勢與 RPE 漸進"},"alternatives":["啞鈴肩推","Smith 肩推","Landmine Press","機械肩推"]},"lateral":{"name":"側平舉 Lateral Raise","category":"肩部","equipment":"啞鈴／滑輪","level":"初中階","sets":3,"reps":15,"inc":1,"primary":["三角肌中束"],"secondary":["上斜方肌"],"steps":["手肘微彎並固定角度。","手臂向兩側打開。","抬至肩膀高度附近即可。","慢慢控制下降。"],"errors":["身體甩動","聳肩","重量太重","手臂抬得過高"],"breathing":"抬起吐氣，下降吸氣。","warmup":["極輕重量 15 下"],"stretch":["肩部橫向拉伸"],"weights":{"beginner":"每手 1～3 kg","intermediate":"每手 3～7 kg","advanced":"以控制與張力優先"},"alternatives":["Cable 側平舉","機械側平舉","單手側平舉"]},"benchPress":{"name":"槓鈴臥推 Bench Press","category":"胸部","equipment":"槓鈴","level":"中階","sets":4,"reps":8,"inc":2.5,"primary":["胸大肌"],"secondary":["前三角肌","肱三頭肌"],"steps":["眼睛位於槓鈴下方，雙腳踩穩。","肩胛後收下沉，手腕維持中立。","槓鈴下降至胸骨附近。","以前臂接近垂直的路徑推回。"],"errors":["屁股離椅","肩胛鬆開","手腕過度後折","槓鈴彈胸"],"breathing":"下降前吸氣撐緊，推過最難位置後吐氣。","warmup":["空槓 15～20 下","工作重量 40% 與 60% 暖身組"],"stretch":["胸肌伸展"],"weights":{"beginner":"空槓或較輕固定槓","intermediate":"依 RPE 7～8 漸進","advanced":"依週期化安排"},"alternatives":["啞鈴臥推","機械胸推","伏地挺身"]},"inclinePress":{"name":"上斜啞鈴臥推 Incline Press","category":"胸部","equipment":"啞鈴","level":"中階","sets":3,"reps":10,"inc":2,"primary":["上胸"],"secondary":["前三角肌","肱三頭肌"],"steps":["椅背約 20～35 度。","肩胛後收，雙腳踩穩。","啞鈴下降至上胸兩側。","向上內推但不要碰撞。"],"errors":["椅背太直變成肩推","肩膀前移","下降太深造成不適"],"breathing":"下降吸氣，推起吐氣。","warmup":["輕重量 12～15 下"],"stretch":["胸肌伸展"],"weights":{"beginner":"每手 3～8 kg","intermediate":"每手 8～20 kg","advanced":"依個人紀錄"},"alternatives":["上斜機械胸推","上斜 Smith 臥推","低至高 Cable Fly"]},"cableFly":{"name":"滑輪夾胸 Cable Fly","category":"胸部","equipment":"滑輪","level":"初中階","sets":3,"reps":12,"inc":1,"primary":["胸大肌"],"secondary":["前三角肌"],"steps":["身體微前傾，肩胛穩定。","手肘保持微彎。","雙手沿弧線向前夾。","感受胸肌收縮後控制回程。"],"errors":["手肘角度一直改變","肩膀向前聳起","重量太重變成推舉"],"breathing":"夾胸吐氣，回程吸氣。","warmup":["輕重量 15 下"],"stretch":["胸肌伸展"],"weights":{"beginner":"單側 2.5～7.5 kg","intermediate":"以 12～15 下控制為準","advanced":"停頓或單手版本"},"alternatives":["Pec Deck","啞鈴飛鳥","伏地挺身"]},"pullUp":{"name":"引體向上 Pull-up","category":"背部","equipment":"單槓","level":"中高階","sets":3,"reps":6,"inc":0,"primary":["背闊肌"],"secondary":["肱二頭肌","核心"],"steps":["握距略寬於肩，核心與臀部收緊。","先下沉肩胛，再將胸口拉向橫槓。","避免過度擺動。","控制下降至手臂伸展。"],"errors":["用腿甩動","聳肩","只做很短幅度","下降直接掉落"],"breathing":"向上拉吐氣，下降吸氣。","warmup":["肩胛引體 8～10 下","彈力帶輔助"],"stretch":["背闊肌拉伸"],"weights":{"beginner":"輔助引體","intermediate":"自重","advanced":"負重引體"},"alternatives":["滑輪下拉","輔助引體向上","單手下拉"]},"deadlift":{"name":"傳統硬舉 Deadlift","category":"腿部","equipment":"槓鈴","level":"中高階","sets":3,"reps":5,"inc":2.5,"primary":["臀大肌","腿後肌","豎脊肌"],"secondary":["股四頭肌","背闊肌","握力"],"steps":["槓鈴位於中足上方。","髖部向後，握住槓鈴並收緊背闊肌。","推地站起，槓鈴貼近身體。","站直後以髖部向後控制下放。"],"errors":["背部圓曲","槓鈴離身體太遠","起步時臀部先衝高","頂端過度後仰"],"breathing":"起拉前吸氣撐壓，站穩後吐氣。","warmup":["髖鉸鏈練習","逐級暖身組"],"stretch":["臀腿放鬆"],"weights":{"beginner":"先學動作，不急著加重","intermediate":"RPE 6～8","advanced":"依週期化計畫"},"alternatives":["Trap Bar 硬舉","RDL","腿推＋腿彎舉"]},"legCurl":{"name":"腿彎舉 Leg Curl","category":"腿部","equipment":"腿彎舉機","level":"初階","sets":3,"reps":12,"inc":2.5,"primary":["腿後肌"],"secondary":["腓腸肌"],"steps":["調整轉軸對準膝關節。","骨盆貼住座椅或臥墊。","彎曲膝蓋至腿後側收縮。","控制回到接近伸直。"],"errors":["臀部抬起","用慣性甩動","回程直接放掉"],"breathing":"彎曲吐氣，回程吸氣。","warmup":["輕重量 15 下"],"stretch":["腿後肌拉伸"],"weights":{"beginner":"15 下可控制重量","intermediate":"10～15 下","advanced":"單腿或遞減組"},"alternatives":["滑布腿彎舉","Nordic Curl","RDL"]},"legExtension":{"name":"腿伸展 Leg Extension","category":"腿部","equipment":"腿伸展機","level":"初階","sets":3,"reps":12,"inc":2.5,"primary":["股四頭肌"],"secondary":[],"steps":["膝關節對準機器轉軸。","臀部與背部貼住座椅。","伸直膝蓋至股四頭肌收縮。","控制下降。"],"errors":["用慣性踢起","重量過重","臀部離座"],"breathing":"伸直吐氣，下降吸氣。","warmup":["輕重量 15 下"],"stretch":["股四頭肌拉伸"],"weights":{"beginner":"12～15 下可控制重量","intermediate":"逐步加重","advanced":"單腿或停頓"},"alternatives":["西西深蹲","靠牆蹲","腿推"]},"calfRaise":{"name":"站姿提踵 Calf Raise","category":"小腿","equipment":"機械／啞鈴","level":"初階","sets":4,"reps":15,"inc":2.5,"primary":["腓腸肌"],"secondary":["比目魚肌"],"steps":["前腳掌踩穩平台，腳跟懸空。","下降至小腿有伸展感。","向上踮高並停一秒。","控制回程。"],"errors":["上下彈跳","幅度太小","腳踝內外翻"],"breathing":"向上吐氣，下降吸氣。","warmup":["徒手提踵 20 下"],"stretch":["小腿拉伸"],"weights":{"beginner":"徒手","intermediate":"手持啞鈴","advanced":"機械加重"},"alternatives":["坐姿提踵","單腳提踵","腿推機提踵"]},"facePull":{"name":"Face Pull","category":"肩部","equipment":"滑輪","level":"初中階","sets":3,"reps":15,"inc":1,"primary":["後三角肌","菱形肌"],"secondary":["旋轉肌群","中下斜方肌"],"steps":["滑輪設在臉部高度。","以繩索拉向眉眼附近。","手肘向外，肩胛後收。","控制回程。"],"errors":["聳肩","身體後仰","只用手臂拉","重量太重"],"breathing":"拉近吐氣，回程吸氣。","warmup":["彈力帶外旋"],"stretch":["後肩拉伸"],"weights":{"beginner":"輕重量 15～20 下","intermediate":"保持停頓","advanced":"以品質為主"},"alternatives":["反向飛鳥","Rear Delt Machine","Band Pull Apart"]},"rearDelt":{"name":"反向飛鳥 Rear Delt Fly","category":"肩部","equipment":"啞鈴／機械","level":"初中階","sets":3,"reps":15,"inc":1,"primary":["後三角肌"],"secondary":["菱形肌"],"steps":["胸口穩定，手肘微彎。","手臂向兩側後方打開。","肩胛保持自然，不要過度夾背。","控制下降。"],"errors":["聳肩","重量太重","身體甩動"],"breathing":"打開吐氣，回程吸氣。","warmup":["極輕重量 15 下"],"stretch":["後肩拉伸"],"weights":{"beginner":"每手 1～3 kg","intermediate":"每手 3～7 kg","advanced":"機械或滑輪版本"},"alternatives":["Face Pull","Rear Delt Machine","Band Pull Apart"]},"bicepsCurl":{"name":"啞鈴二頭彎舉 Biceps Curl","category":"手臂","equipment":"啞鈴","level":"初階","sets":3,"reps":12,"inc":1,"primary":["肱二頭肌"],"secondary":["肱肌","前臂"],"steps":["手肘靠近身體兩側。","保持肩膀穩定，彎曲手肘。","頂端收縮但不抬手肘。","控制下降至接近伸直。"],"errors":["身體甩動","手肘向前跑","回程太快"],"breathing":"彎舉吐氣，下降吸氣。","warmup":["輕重量 15 下"],"stretch":["二頭肌伸展"],"weights":{"beginner":"每手 2～5 kg","intermediate":"每手 5～12 kg","advanced":"嚴格姿勢優先"},"alternatives":["Cable Curl","槌式彎舉","機械彎舉"]},"hammerCurl":{"name":"槌式彎舉 Hammer Curl","category":"手臂","equipment":"啞鈴","level":"初階","sets":3,"reps":12,"inc":1,"primary":["肱肌","肱橈肌"],"secondary":["肱二頭肌"],"steps":["掌心相對，手肘靠近身體。","向上彎舉並維持中立握法。","控制下降。"],"errors":["身體甩動","手腕彎曲","手肘移動"],"breathing":"向上吐氣，下降吸氣。","warmup":["輕重量 15 下"],"stretch":["前臂與二頭肌伸展"],"weights":{"beginner":"每手 2～5 kg","intermediate":"每手 5～14 kg","advanced":"維持控制"},"alternatives":["繩索槌式彎舉","一般彎舉","交替彎舉"]},"tricepsPushdown":{"name":"三頭下壓 Triceps Pushdown","category":"手臂","equipment":"滑輪","level":"初階","sets":3,"reps":12,"inc":1,"primary":["肱三頭肌"],"secondary":[],"steps":["手肘固定在身體兩側。","將握把向下推至手臂伸直。","底端收縮一秒。","控制回程。"],"errors":["手肘前後移動","身體下壓借力","肩膀聳起"],"breathing":"下壓吐氣，回程吸氣。","warmup":["輕重量 15 下"],"stretch":["三頭肌拉伸"],"weights":{"beginner":"可完成 15 下的重量","intermediate":"10～15 下","advanced":"單手或停頓"},"alternatives":["繩索下壓","窄距伏地挺身","過頭三頭伸展"]},"plank":{"name":"平板撐 Plank","category":"核心","equipment":"徒手","level":"初階","sets":3,"reps":30,"inc":0,"primary":["腹橫肌","腹直肌"],"secondary":["臀肌","肩帶"],"steps":["手肘位於肩膀下方。","頭、背、骨盆保持一直線。","收緊腹部與臀部。","維持自然呼吸。"],"errors":["腰部下塌","臀部抬太高","憋氣","肩膀聳起"],"breathing":"持續自然呼吸，每次吐氣時加強收腹。","warmup":["貓牛式","Dead Bug"],"stretch":["嬰兒式"],"weights":{"beginner":"15～30 秒","intermediate":"30～60 秒","advanced":"增加負重或不穩定性"},"alternatives":["高平板","Dead Bug","Pallof Press"]},"deadBug":{"name":"Dead Bug","category":"核心","equipment":"徒手","level":"初階","sets":3,"reps":10,"inc":0,"primary":["腹橫肌","深層核心"],"secondary":["髖屈肌"],"steps":["仰躺，髖膝約 90 度。","下背輕貼地面。","對側手腳緩慢伸展。","回到起始再換側。"],"errors":["下背離地","動作太快","肩頸用力"],"breathing":"伸展時吐氣並收腹，回程吸氣。","warmup":["骨盆後傾練習"],"stretch":["腹部與髖屈肌放鬆"],"weights":{"beginner":"徒手","intermediate":"手持輕啞鈴","advanced":"彈力帶抗阻"},"alternatives":["Bird Dog","Plank","Pallof Press"]},"zone2":{"name":"Zone 2 有氧","category":"有氧","equipment":"跑步機／橢圓機／飛輪","level":"初中高階","sets":1,"reps":30,"inc":0,"primary":["心肺耐力"],"secondary":["下肢耐力"],"steps":["選擇可以持續的器材。","強度維持在可以說完整句子、但呼吸明顯加快。","先從 20～30 分鐘開始。","每週逐步增加時間，不必每次提高強度。"],"errors":["一開始強度過高","全程抓緊跑步機扶手","忽略頭暈或胸悶","每次都做成 HIIT"],"breathing":"保持規律自然呼吸。","warmup":["5 分鐘低強度"],"stretch":["小腿、腿後肌與股四頭肌拉伸"],"weights":{"beginner":"20 分鐘","intermediate":"30～45 分鐘","advanced":"依恢復與總訓練量安排"},"alternatives":["跑步機快走","橢圓機","飛輪","戶外快走"]}};
hydrateCustomExerciseLibrary();

const EXERCISE_CATEGORIES = ["全部","臀部","腿部","胸部","背部","肩部","手臂","核心","小腿","有氧"];
let exerciseLibraryFilter = "全部";
let favoritesOnly=false;
let exerciseLibrarySearch = "";

function exerciseDataFor(ex){
  if(ex?.exerciseId && EXERCISE_DB[ex.exerciseId]) return EXERCISE_DB[ex.exerciseId];
  if(ex?.guide && EXERCISE_DB[ex.guide]) return EXERCISE_DB[ex.guide];
  const name = String(ex?.name || "").toLowerCase();
  return Object.values(EXERCISE_DB).find(item =>
    name.includes(item.name.toLowerCase()) ||
    item.name.toLowerCase().includes(name) ||
    (item.alternatives || []).some(a => a.toLowerCase() === name)
  ) || null;
}

function exerciseIdForData(data){
  return Object.entries(EXERCISE_DB).find(([,value]) => value === data)?.[0] || null;
}

function libraryExercise(id, extra=true){
  const data = EXERCISE_DB[id];
  return {
    id: crypto.randomUUID(),
    exerciseId: id,
    name: data.name,
    guide: id,
    inc: data.inc || state.profile.increment || 2.5,
    alts: data.alternatives || [],
    extra,
    status: "pending",
    sets: Array.from({length:data.sets || 3}, () => ({done:false,weight:"",reps:data.reps || 10}))
  };
}

function weightText(data){
  if(!data?.weights) return "";
  return `<div class="weight-grid">
    <div><span>新手</span><b>${escapeHtml(data.weights.beginner || "依能力")}</b></div>
    <div><span>中階</span><b>${escapeHtml(data.weights.intermediate || "依能力")}</b></div>
    <div><span>進階</span><b>${escapeHtml(data.weights.advanced || "依能力")}</b></div>
  </div>`;
}


const EXERCISE_GUIDE_GIFS={
  hip_thrust:"assets/gif/hip-thrust.gif",
  squat:"assets/gif/squat.gif",
  deadlift:"assets/gif/deadlift.gif",
  bench_press:"assets/gif/bench-press.gif",
  lat_pulldown:"assets/gif/lat-pulldown.gif",
  seated_row:"assets/gif/row.gif"
};
function exerciseGuideGif(id,data){
  if(EXERCISE_GUIDE_GIFS[id])return EXERCISE_GUIDE_GIFS[id];
  const name=String(data?.name||"");
  if(name.includes("臀推"))return EXERCISE_GUIDE_GIFS.hip_thrust;
  if(name.includes("深蹲"))return EXERCISE_GUIDE_GIFS.squat;
  if(name.includes("硬舉"))return EXERCISE_GUIDE_GIFS.deadlift;
  if(name.includes("臥推"))return EXERCISE_GUIDE_GIFS.bench_press;
  if(name.includes("下拉"))return EXERCISE_GUIDE_GIFS.lat_pulldown;
  if(name.includes("划船"))return EXERCISE_GUIDE_GIFS.seated_row;
  return "";
}
function exercisePracticeCount(name){return Array.isArray(state.history?.[name])?state.history[name].length:0;}
function exerciseSkill(name){const n=exercisePracticeCount(name);return n>=20?[5,"非常熟練"]:n>=12?[4,"熟練"]:n>=6?[3,"逐漸熟悉"]:n>=2?[2,"練習中"]:[1,"剛開始"];}


function exerciseYoutubeLinks(data){
  const name=String(data?.name||"健身動作").trim();
  const equipment=String(data?.equipment||"").trim();

  return [
    {
      label:"YouTube 中文教學",
      url:`https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} ${equipment} 正確姿勢 健身教學`)}`
    },
    {
      label:"YouTube 完整示範",
      url:`https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} exercise tutorial proper form`)}`
    }
  ];
}

function showExerciseGuideByData(data, exercise=null){
  if(!data){
    openModal(exercise?.name || "動作教學", `<p>此動作尚未建立專屬教學。請先使用可以保留 2～3 下餘力、且姿勢穩定的重量。</p>`);
    return;
  }
  const id = exerciseIdForData(data);
  const gif=exerciseGuideGif(id,data);
  const [skillStars,skillLabel]=exerciseSkill(data.name);
  openModal(data.name, `
    <div class="exercise-gif-box">
      ${gif?`<img class="exercise-guide-gif" src="${gif}" alt="${escapeHtml(data.name)} 動作示範" loading="lazy" onerror="this.style.display='none';this.nextElementSibling.style.display='block';">`:""}
      <div class="gif-fallback" style="${gif?'display:none':''}">此動作目前尚未加入 GIF 示範。</div>
    </div>
    <div class="guide-skill"><span class="guide-stars">${"★".repeat(skillStars)}${"☆".repeat(5-skillStars)}</span><b>${skillLabel}</b><span class="muted">完成紀錄 ${exercisePracticeCount(data.name)} 次</span></div>
    <div class="guide-hero">
      <div><span class="tag">${escapeHtml(data.category)}</span> <span class="tag">${escapeHtml(data.level)}</span></div>
      <p class="muted">器材：${escapeHtml(data.equipment)}</p>
    </div>
    <div class="guide-section"><h3>主要肌群</h3><div class="muscle-tags">${data.primary.map(x=>`<span class="tag primary-muscle">${escapeHtml(x)}</span>`).join("")}</div></div>
    ${data.secondary?.length ? `<div class="guide-section"><h3>次要肌群</h3><div class="muscle-tags">${data.secondary.map(x=>`<span class="tag">${escapeHtml(x)}</span>`).join("")}</div></div>` : ""}
    <div class="guide-section"><h3>動作步驟</h3><ol class="guide-list">${data.steps.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ol></div>
    <div class="guide-section warning-section"><h3>常見錯誤</h3><ul class="guide-list">${data.errors.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul></div>
    <div class="guide-section"><h3>呼吸方式</h3><p>${escapeHtml(data.breathing)}</p></div>
    <div class="guide-section"><h3>暖身建議</h3><ul class="guide-list">${data.warmup.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul></div>
    <div class="guide-section"><h3>練後拉伸</h3><ul class="guide-list">${data.stretch.map(x=>`<li>${escapeHtml(x)}</li>`).join("")}</ul></div>
    <div class="guide-section"><h3>重量參考</h3>${weightText(data)}<p class="muted">重量僅作起始參考，以動作品質、器材差異與保留次數為準。</p></div>
    <div class="guide-section">
      <h3>YouTube 教學</h3>
      <div class="youtube-guide-links">
        ${exerciseYoutubeLinks(data).map(item=>`
          <a class="youtube-guide-btn"
             href="${item.url}"
             target="_blank"
             rel="noopener noreferrer">
            ▶ ${escapeHtml(item.label)}
          </a>
        `).join("")}
      </div>
      <p class="muted youtube-guide-note">依目前動作名稱開啟 YouTube 搜尋；不會上傳個人資料。</p>
    </div>
    <div class="guide-section"><h3>替代動作</h3><div class="alternatives">${data.alternatives.map(x=>`<button class="alt guide-alt" data-guide-alt="${escapeHtml(x)}">${escapeHtml(x)}</button>`).join("")}</div></div>
    ${id ? `<button class="primary full" id="addGuideExerciseBtn">加入今日課表</button>` : ""}
  `);
  $("#modalContent").querySelectorAll("[data-guide-alt]").forEach(button=>button.onclick=()=>{
    const altData=Object.values(EXERCISE_DB).find(x=>x.name===button.dataset.guideAlt || x.alternatives.includes(button.dataset.guideAlt));
    showExerciseGuideByData(altData,{name:button.dataset.guideAlt});
  });
  if(id && $("#addGuideExerciseBtn")) $("#addGuideExerciseBtn").onclick=()=>{
    ensureDay().exercises.push(libraryExercise(id,true));
    closeModal();save();alert("已加入今日課表。");
  };
}

function renderExerciseLibrary(){
  const catBox=$("#exerciseCategoryFilter"), search=$("#exerciseSearch"), list=$("#exerciseLibraryList");
  if(!catBox || !search || !list) return;
  catBox.innerHTML=EXERCISE_CATEGORIES.map(c=>`<button class="library-filter ${c===exerciseLibraryFilter?"active":""}" data-category="${c}">${c}</button>`).join("");
  search.value=exerciseLibrarySearch;
  catBox.querySelectorAll("[data-category]").forEach(btn=>btn.onclick=()=>{exerciseLibraryFilter=btn.dataset.category;renderExerciseLibrary();});
  const q=exerciseLibrarySearch.trim().toLowerCase();
  const items=Object.entries(EXERCISE_DB).filter(([id,d])=>{
    const categoryOk=exerciseLibraryFilter==="全部"||d.category===exerciseLibraryFilter;
    const favoriteOk=!favoritesOnly||state.profile.favoriteExercises.includes(id);
    const searchOk=!q||[d.name,d.category,d.equipment,...d.primary,...d.secondary,...d.alternatives].join(" ").toLowerCase().includes(q);
    return categoryOk&&searchOk&&favoriteOk;
  });
  $("#exerciseLibraryCount").textContent=`${items.length} 個動作`;
  list.innerHTML="";
  items.forEach(([id,d])=>{
    const card=document.createElement("article");card.className="library-card";
    card.innerHTML=`<div class="between"><div><div class="exercise-name">${escapeHtml(d.name)}</div><div class="muted">${escapeHtml(d.category)} · ${escapeHtml(d.equipment)} · ${escapeHtml(d.level)}</div></div><span class="pill">${d.sets}×${d.reps}</span></div><div class="muscle-tags mt8">${d.primary.map(x=>`<span class="tag primary-muscle">${escapeHtml(x)}</span>`).join("")}</div><div class="library-actions"><button class="soft favorite-library">${state.profile.favoriteExercises.includes(id)?"★ 已收藏":"☆ 收藏"}</button><button class="soft view-guide">查看教學</button><button class="primary add-library">加入今日</button></div>`;
    card.querySelector(".favorite-library").onclick=e=>{
      e.stopPropagation();
      const list=state.profile.favoriteExercises;
      const i=list.indexOf(id);
      if(i>=0)list.splice(i,1);else list.push(id);
      save();
    };
    card.querySelector(".view-guide").onclick=()=>showExerciseGuideByData(d);
    card.querySelector(".add-library").onclick=()=>{ensureDay().exercises.push(libraryExercise(id,true));save();alert(`已加入：${d.name}`);};
    card.onclick=e=>{if(!e.target.closest("button"))showExerciseGuideByData(d);};
    list.appendChild(card);
  });
  if(!items.length)list.innerHTML='<article class="card muted">找不到符合條件的動作。</article>';
}

// ===== JianJian v9 Cycle Module =====
const CYCLE_SYMPTOMS = [
  ["cramps","經痛"],["bloating","水腫"],["fatigue","疲勞"],["headache","頭痛"],
  ["backache","腰痠"],["mood","情緒起伏"],["sleep","睡眠變差"],["appetite","食慾增加"],
  ["breast","乳房脹痛"],["digestive","腸胃不適"],["acne","長痘痘"],["dizziness","頭暈"],
  ["nausea","噁心"],["motivation","訓練動力下降"]
];

function ensureCycleProfile(){
  state.profile = state.profile || {};
  if(!Array.isArray(state.profile.symptoms)) state.profile.symptoms = [];
  if(!Array.isArray(state.profile.customSymptoms)) state.profile.customSymptoms = [];
  if(typeof state.profile.cycleEnabled !== "boolean") state.profile.cycleEnabled = false;
  if(!state.profile.cycleLength) state.profile.cycleLength = 28;
  if(!state.profile.periodLength) state.profile.periodLength = 6;
  if(!state.profile.lastPeriod) state.profile.lastPeriod = "";
}

function cycleInfo(){
  ensureCycleProfile();
  const p = state.profile;
  if(!p.cycleEnabled || !p.lastPeriod) return null;

  const start = dateFromKey(p.lastPeriod);
  const diff = Math.floor((new Date() - start) / 86400000);
  const length = Number(p.cycleLength) || 28;
  const periodLength = Number(p.periodLength) || 6;
  const day = ((diff % length) + length) % length + 1;
  const ovulationDay = Math.max(periodLength + 1, Math.min(length - 1, length - 14));
  const daysUntilNext = length - day + 1;

  let phase = "濾泡期";
  let training = "正常訓練";
  let advice = "通常恢復感較好，可維持課表並漸進加重。";

  if(day <= periodLength){
    phase = "月經期";
    training = "恢復／輕量";
    advice = "依經痛、疲勞或頭暈程度降低重量與組數，也可改做散步或伸展。";
  }else if(day < ovulationDay){
    phase = "濾泡期";
    training = "正常／漸進加重";
    advice = "通常適合學習動作與安排較高品質訓練。";
  }else if(day <= ovulationDay + 2){
    phase = "排卵期附近";
    training = "正常訓練";
    advice = "可正常訓練，但要完整熱身並留意關節感受。";
  }else{
    phase = "黃體期／經前期";
    training = "維持／適度降量";
    advice = "若出現水腫、睡眠變差或疲勞，可維持重量但降低總組數。";
  }

  return {
    day, phase, training, advice, ovulationDay, daysUntilNext,
    symptoms: [...p.symptoms, ...p.customSymptoms]
  };
}

function renderCycleHomeV9(){
  const card = $("#cycleCard");
  if(!card) return;

  const info = cycleInfo();
  card.hidden = !info;
  if(!info) return;

  $("#cycleTitle").textContent = `Day ${info.day} · ${info.phase}`;
  $("#cycleAdvice").innerHTML = `
    <div>${info.advice}</div>
    <div class="cycle-summary">
      <div class="cycle-stat"><span>距離下次月經</span><b>${info.daysUntilNext}</b><small>天</small></div>
      <div class="cycle-stat"><span>預估排卵日</span><b>Day ${info.ovulationDay}</b></div>
      <div class="cycle-stat"><span>今日建議</span><b>${info.training}</b></div>
    </div>
    ${info.symptoms.length ? `<p class="muted">今日症狀：${info.symptoms.map(escapeHtml).join("、")}</p>` : ""}
  `;
}

function renderCycleSettingsV9(){
  ensureCycleProfile();
  const profile=state.profile;
  const enabled=$("#cycleEnabled");
  if(!enabled)return;

  enabled.checked=Boolean(profile.cycleEnabled);
  $("#cycleSettings").hidden=!profile.cycleEnabled;
  $("#lastPeriod").value=profile.lastPeriod||"";
  $("#cycleLength").value=profile.cycleLength||28;
  $("#periodLength").value=profile.periodLength||6;

  const selected=new Set(profile.symptoms||[]);
  const box=$("#symptomBox");
  box.innerHTML=CYCLE_SYMPTOMS.map(([value,label])=>`
    <label class="symptom ${selected.has(value)?"selected":""}">
      <input type="checkbox" value="${value}" ${selected.has(value)?"checked":""}>
      <span>${escapeHtml(label)}</span>
    </label>`).join("");

  box.querySelectorAll('input[type="checkbox"]').forEach(input=>{
    input.onchange=()=>{
      const values=box.querySelectorAll('input:checked').map(item=>item.value);
      profile.symptoms=values;
      input.closest(".symptom")?.classList.toggle("selected",input.checked);
      save();
    };
  });

  renderCustomSymptomsV9();
}

function renderCustomSymptomsV9(){
  const box = $("#customSymptomList");
  if(!box) return;

  box.innerHTML = (state.profile.customSymptoms || []).map((text,index) => `
    <span class="custom-symptom-chip">
      ${escapeHtml(text)}
      <button type="button" data-remove-custom="${index}">×</button>
    </span>
  `).join("");

  box.querySelectorAll("[data-remove-custom]").forEach(button => {
    button.addEventListener("click", () => {
      state.profile.customSymptoms.splice(Number(button.dataset.removeCustom),1);
      save();
    });
  });
}

function saveCycleSettingsV9(){
  ensureCycleProfile();
  state.profile.cycleEnabled = $("#cycleEnabled").checked;
  state.profile.lastPeriod = $("#lastPeriod").value;
  state.profile.cycleLength = Number($("#cycleLength").value) || 28;
  state.profile.periodLength = Number($("#periodLength").value) || 6;
  state.profile.symptoms = $$("#symptomBox input:checked").map(input => input.value);
  save();
  alert("生理週期設定已儲存。");
}

function render(){
 const day=ensureDay(),menu=ensureMenu(),wp=pct(day),tp=taskPct(day);
 $("#todayWorkoutTitle").textContent=day.title;$("#todayWorkoutNote").textContent=day.note;$("#workoutPageTitle").textContent=day.title;
 $("#todayWorkoutBar").style.width=wp+"%";$("#workoutPercent").textContent=wp+"%";$("#workoutState").textContent=day.status==="completed"?"已完成":wp?"進行中":"尚未開始";
 $("#taskPercent").textContent=tp+"%";$("#taskBar").style.width=tp+"%";
 renderCycleHomeV9();
 renderHomeMenuSummary();renderMenuPreview();renderTasks(day);renderWorkout(day);renderPreview();renderCardio();renderBody();renderProfile();renderWeek();renderExerciseLibrary();renderSocialIdentity();renderFriendRequests();renderFriends();renderFeed();renderChallenge();renderDailyDashboard();renderTrainingStats();
}
function renderTasks(day){const b=$("#taskList");b.innerHTML="";day.tasks.forEach(t=>{const r=document.createElement("div");r.className="task"+(t.done?" done":"");r.innerHTML=`<input type="checkbox" ${t.done?"checked":""}><span>${t.text}</span><button class="tiny">刪除</button>`;r.querySelector("input").onchange=e=>{t.done=e.target.checked;save()};r.querySelector("button").onclick=()=>{day.tasks=day.tasks.filter(x=>x.id!==t.id);save()};b.appendChild(r)});if(!day.tasks.length)b.innerHTML='<p class="muted">尚無任務。</p>'}
function renderPhase(box,items,type){
  box.innerHTML="";

  items.forEach((item,index)=>{
    const row=document.createElement("div");
    row.className="phase-edit-row"+(item.done?" done":"");

    const isWarmup=type==="warmup";
    const amountValue=isWarmup?(item.amount??""):(item.seconds??"");
    const unitValue=isWarmup?(item.unit||"次"):"秒";

    row.innerHTML=`
      <input class="phase-check" type="checkbox" ${item.done?"checked":""} aria-label="完成">
      <input class="phase-name-input" type="text" value="${escapeHtml(item.name||"")}" placeholder="${isWarmup?"暖身項目":"拉伸部位"}">
      <input class="phase-amount-input" type="number" min="0" step="1" value="${amountValue}" placeholder="${isWarmup?"數量":"秒數"}">
      ${isWarmup
        ? `<input class="phase-unit-input" type="text" value="${escapeHtml(unitValue)}" placeholder="單位">`
        : `<span class="phase-unit-text">秒</span>`}
      <button class="phase-delete-btn" type="button" aria-label="刪除此項">刪除</button>
    `;

    const check=row.querySelector(".phase-check");
    const nameInput=row.querySelector(".phase-name-input");
    const amountInput=row.querySelector(".phase-amount-input");
    const unitInput=row.querySelector(".phase-unit-input");

    check.onchange=()=>{
      item.done=check.checked;
      save();
    };

    nameInput.onchange=()=>{
      item.name=nameInput.value.trim()|| (isWarmup?"自訂暖身":"自訂拉伸");
      save();
    };

    amountInput.onchange=()=>{
      const value=Number(amountInput.value)||0;
      if(isWarmup)item.amount=value;
      else item.seconds=value;
      save();
    };

    if(unitInput){
      unitInput.onchange=()=>{
        item.unit=unitInput.value.trim()||"次";
        save();
      };
    }

    row.querySelector(".phase-delete-btn").onclick=()=>{
      const label=item.name||"這個項目";
      if(confirm(`確定刪除「${label}」？`)){
        items.splice(index,1);
        save();
      }
    };

    box.appendChild(row);
  });

  if(!items.length){
    box.innerHTML=`<div class="empty-phase">目前沒有${type==="warmup"?"暖身":"拉伸"}項目，可按右上角新增。</div>`;
  }
}


function exerciseHistoryRecords(name){
  const records=state.history?.[name];
  return Array.isArray(records)?records:[];
}
function exercisePR(name){
  const records=exerciseHistoryRecords(name);
  return Math.max(0,...records.map(r=>Number(r.max)||0));
}
function previousExerciseRecord(name){
  return exerciseHistoryRecords(name)[0]||null;
}
function aiWeightSuggestion(ex){
  const previous=previousExerciseRecord(ex.name);
  if(!previous)return {text:"先以可保留 2～3 下餘力的重量開始",value:null};
  const avgRpe=Number(previous.avgRpe)||0;
  const complete=Number(previous.completion)||0;
  let increment=Number(ex.inc||state.profile.increment||2.5);
  if(state.profile.aiIntensity==="conservative")increment=Math.max(0.5,increment/2);
  if(state.profile.aiIntensity==="aggressive")increment=increment*1.5;
  const max=Number(previous.max)||0;
  if(complete>=95 && avgRpe>0 && avgRpe<=8)return {text:`上次完成良好，建議 ${max+increment} kg`,value:max+increment};
  if(complete<70 || avgRpe>=9.5)return {text:`上次較吃力，建議 ${Math.max(0,max-increment)} kg`,value:Math.max(0,max-increment)};
  return {text:`建議維持 ${max} kg，優先改善次數或動作品質`,value:max};
}

function renderWorkout(day){
  renderPhase($("#warmupList"),warmups(day),"warmup");
  renderPhase($("#stretchList"),stretches(day),"stretch");
  $("#preFoodList").innerHTML=`<p class="muted">距離訓練約 ${day.foodTiming} 分鐘</p>`+
    foods(day.foodTiming).map(item=>`<span class="food-chip">${escapeHtml(item)}</span>`).join("");

  const container=$("#exerciseList");
  container.innerHTML="";

  day.exercises.forEach(ex=>{
    ex.sets=Array.isArray(ex.sets)?ex.sets:[];
    const pr=exercisePR(ex.name);
    const weightAdvice=aiWeightSuggestion(ex);
    const alternatives=Array.isArray(ex.alts)?ex.alts:[];
    const completed=ex.sets.filter(set=>set.done).length;

    const card=document.createElement("article");
    card.className="exercise";
    card.innerHTML=`
      <div class="exercise-head between">
        <div>
          <div class="exercise-name">${escapeHtml(ex.name)}</div>
          <div class="muted">${completed}/${ex.sets.length} 組完成 · 點此查看要點</div>
        </div>
        <span class="pill">${ex.extra?"加練":"課表"}</span>
      </div>

      <div class="exercise-insights">
        <span class="pill">PR ${pr?`${pr} kg`:"尚無"}</span>
        <span class="ai-weight-note">${escapeHtml(weightAdvice.text)}</span>
      </div>

      <div class="workout-recommendations">
        <div class="recommendation-title">建議項目／替代動作</div>
        <div class="recommendation-chips">
          ${alternatives.length
            ? alternatives.slice(0,6).map(name=>`<button type="button" class="alt-chip" data-alt="${escapeHtml(name)}">${escapeHtml(name)}</button>`).join("")
            : '<span class="muted">點「動作要點」查看暖身、常見錯誤與更多建議。</span>'}
        </div>
      </div>

      <div class="sets"></div>
      <div class="actions">
        <button class="tiny guide" type="button">動作要點</button>
        <button class="tiny all" type="button">全部完成</button>
        <button class="tiny unfinished" type="button">沒做完</button>
        <button class="tiny remove danger" type="button">刪除動作</button>
      </div>`;

    const setsBox=card.querySelector(".sets");
    ex.sets.forEach((set,index)=>{
      if(set.rpe===undefined)set.rpe="";
      const row=document.createElement("div");
      row.className="set"+(set.done?" done":"");
      row.innerHTML=`
        <input class="set-done" type="checkbox" ${set.done?"checked":""} aria-label="完成第 ${index+1} 組">
        <b>${index+1}</b>
        <input class="set-weight" type="number" step="0.5" placeholder="kg" value="${set.weight??""}">
        <input class="set-reps" type="number" min="0" placeholder="次數" value="${set.reps??""}">
        <input class="set-rpe" type="number" min="1" max="10" step="0.5" placeholder="RPE" value="${set.rpe??""}">`;

      row.querySelector(".set-done").onchange=event=>{set.done=event.target.checked;save();};
      row.querySelector(".set-weight").onchange=event=>{set.weight=event.target.value;saveLocalOnly();};
      row.querySelector(".set-reps").onchange=event=>{set.reps=Number(event.target.value)||0;saveLocalOnly();};
      row.querySelector(".set-rpe").onchange=event=>{set.rpe=Number(event.target.value)||"";saveLocalOnly();};
      setsBox.appendChild(row);
    });

    const showGuideHandler=event=>{event?.stopPropagation();showGuide(ex);};
    card.querySelector(".exercise-head").onclick=showGuideHandler;
    card.querySelector(".guide").onclick=showGuideHandler;
    card.querySelector(".all").onclick=()=>{ex.sets.forEach(set=>set.done=true);save();};
    card.querySelector(".unfinished").onclick=()=>{ex.status="unfinished";save();};
    card.querySelector(".remove").onclick=event=>{
      event.stopPropagation();
      if(confirm(`確定從今天課表刪除「${ex.name}」？`)){
        day.exercises=day.exercises.filter(item=>item.id!==ex.id);
        save();
      }
    };

    card.querySelectorAll(".alt-chip").forEach(button=>{
      button.onclick=event=>{
        event.stopPropagation();
        const targetName=button.dataset.alt;
        if(!confirm(`要把「${ex.name}」替換成「${targetName}」嗎？`))return;
        const match=Object.entries(EXERCISE_DB).find(([,data])=>data.name===targetName);
        if(match){
          const [id,data]=match;
          ex.exerciseId=id;
          ex.guide=id;
          ex.name=data.name;
          ex.alts=data.alternatives||[];
          ex.inc=data.inc||ex.inc||state.profile.increment||2.5;
          ex.sets=Array.from({length:data.sets||3},()=>({done:false,weight:"",reps:data.reps||10,rpe:""}));
        }else{
          ex.name=targetName;
          ex.exerciseId=null;
          ex.guide=null;
          ex.alts=[];
        }
        save();
      };
    });

    card.onclick=event=>{
      if(event.target.closest(".sets,.actions,.workout-recommendations,input,button"))return;
      showGuide(ex);
    };
    container.appendChild(card);
  });

  if(!day.exercises.length){
    container.innerHTML='<article class="card muted">今天是休息日，可按「＋從動作庫」或「＋自訂動作」。</article>';
  }
}
function saveLocalOnly(){saveLocal(state)}
function showGuide(ex){showExerciseGuideByData(ex.customGuide||exerciseDataFor(ex),ex)}
function renderPreview(){const d=dateFromKey(previewKey),saved=state.days[previewKey],tpl=saved||{...state.weeklyPlan[d.getDay()],exercises:state.weeklyPlan[d.getDay()].exercises.map(makeExercise)};$("#previewDate").value=previewKey;$("#previewTitle").textContent=d.toLocaleDateString("zh-TW",{year:"numeric",month:"long",day:"numeric",weekday:"long"})+" · "+tpl.title;$("#previewNote").textContent=previewKey===dateKey()?"今天的課表。":"預覽模式，不會更動今天。";const b=$("#previewExercises");b.innerHTML="";tpl.exercises.forEach(e=>{const x=document.createElement("article");x.className="preview";x.innerHTML=`<b>${e.name}</b><p class="muted">${e.sets.length} 組 × ${e.sets[0]?.reps||""} 下</p>`;b.appendChild(x)});if(!tpl.exercises.length)b.innerHTML='<article class="card muted">休息／恢復日。</article>'}
function renderWeek(){$("#weeklyPlan").innerHTML=["日","一","二","三","四","五","六"].map((n,i)=>`<div class="week-row between"><b>星期${n}</b><span>${state.weeklyPlan[i].title}</span></div>`).join("")}
function renderMenu(menu){$("#menuTypeText").textContent=menu.label;$("#menuCalories").textContent=menu.calories;$("#menuProtein").textContent=menu.protein;$("#menuSummary").innerHTML=menu.meals.map(m=>`<div class="menu-row"><b>${m.name}</b><div class="muted">${m.food}</div></div>`).join("");const b=$("#mealList");b.innerHTML="";menu.meals.forEach(m=>{const x=document.createElement("article");x.className="meal";x.innerHTML=`<h3>${m.name}</h3><label>內容<textarea>${m.food}</textarea></label><label>估計熱量<input type="number" value="${m.kcal}"></label>`;const q=x.querySelectorAll("textarea,input");q[0].onchange=e=>m.food=e.target.value;q[1].onchange=e=>m.kcal=+e.target.value||0;b.appendChild(x)})}
function cardioFields(){const t=$("#cardioType").value,v={treadmill:["speed","incline"],elliptical:["resistance","rpm"],bike:["resistance","rpm"],rower:["resistance"],stair:["level"],outdoor:["speed"]}[t];$$("[data-cardio]").forEach(x=>x.style.display=v.includes(x.dataset.cardio)?"block":"none");$("#cardioTip").textContent=t==="treadmill"?"減脂可從速度 4.8–5.8 km/h、坡度 6–12%、30–45 分鐘開始。":t==="elliptical"?"阻力 6–10、RPM 55–70、25–40 分鐘。":"維持可說完整句子的 Zone 2 強度。"}
function renderCardio(){cardioFields();const list=state.cardio.filter(x=>x.date===dateKey()),b=$("#cardioList");b.innerHTML="";list.slice().reverse().forEach(r=>{const x=document.createElement("article");x.className="cardio-record";const ms=[r.speed&&`速度 ${r.speed}`,r.incline&&`坡度 ${r.incline}%`,r.resistance&&`阻力 ${r.resistance}`,r.rpm&&`RPM ${r.rpm}`,r.level&&`Level ${r.level}`,`${r.minutes} 分鐘`].filter(Boolean);x.innerHTML=`<div class="between"><b>${{treadmill:"跑步機",elliptical:"橢圓機",bike:"飛輪",rower:"划船機",stair:"登階機",outdoor:"戶外"}[r.type]}</b><button class="tiny">刪除</button></div><div class="metrics">${ms.map(m=>`<span class="metric-chip">${m}</span>`).join("")}</div>`;x.querySelector("button").onclick=()=>{state.cardio=state.cardio.filter(z=>z.id!==r.id);save()};b.appendChild(x)});if(!list.length)b.innerHTML='<article class="card muted">今天尚無有氧紀錄。</article>'}
function renderBody(){$("#bodyTable").innerHTML=state.body.length?state.body.slice().reverse().map(x=>`<tr><td>${x.date}</td><td>${x.fat||"—"}</td><td>${x.weight||"—"}</td><td>${x.waist||"—"}</td><td>${x.hip||"—"}</td></tr>`).join(""):'<tr><td colspan="5">尚無紀錄</td></tr>'}
function renderProfile(){$("#displayName").value=state.profile.displayName;$("#gender").value=state.profile.gender;$("#weightIncrement").value=state.profile.increment;$("#cycleEnabled").checked=state.profile.cycleEnabled;$("#lastPeriod").value=state.profile.lastPeriod;$("#cycleLength").value=state.profile.cycleLength;$("#periodLength").value=state.profile.periodLength;$("#cycleSettings").hidden=!state.profile.cycleEnabled;$("#symptomBox").innerHTML=symptoms.map(([v,l])=>`<label class="symptom"><input type="checkbox" value="${v}" ${state.profile.symptoms.includes(v)?"checked":""}>${l}</label>`).join("");if($("#planGoal"))$("#planGoal").value=state.profile.goal||"recomp";if($("#planDays"))$("#planDays").value=String(state.profile.planDays||4);if($("#planFocus"))$("#planFocus").value=state.profile.planFocus||"balanced"
  renderCycleSettingsV9();
  ensureExtendedState();
  if($("#profileProteinTarget"))$("#profileProteinTarget").value=state.profile.proteinTarget;
  if($("#profileWaterTarget"))$("#profileWaterTarget").value=state.profile.waterTarget;
  if($("#profileStepsTarget"))$("#profileStepsTarget").value=state.profile.stepsTarget;
  if($("#profileSleepTarget"))$("#profileSleepTarget").value=state.profile.sleepTarget;
  if($("#aiIntensity"))$("#aiIntensity").value=state.profile.aiIntensity||"normal";
}
function openModal(t,h){$("#modalTitle").textContent=t;$("#modalContent").innerHTML=h;$("#modal").classList.add("open")}
function closeModal(){$("#modal").classList.remove("open")}


function openDrawer(){
  $("#sideDrawer").classList.add("open");
  $("#drawerOverlay").classList.add("open");
  $("#sideDrawer").setAttribute("aria-hidden","false");
  $("#menuButton").setAttribute("aria-expanded","true");
  document.body.classList.add("drawer-open");
}
function closeDrawer(){
  $("#sideDrawer").classList.remove("open");
  $("#drawerOverlay").classList.remove("open");
  $("#sideDrawer").setAttribute("aria-hidden","true");
  $("#menuButton").setAttribute("aria-expanded","false");
  document.body.classList.remove("drawer-open");
}
function goToPage(pageId){
  const target=document.getElementById(pageId);
  if(!target||!target.classList.contains("page")){
    console.error("Page not found:",pageId);
    return;
  }

  document.querySelectorAll("main > section.page").forEach(page=>{
    const active=page.id===pageId;
    page.hidden=!active;
    page.classList.toggle("active",active);
  });

  document.querySelectorAll("[data-nav]").forEach(button=>{
    button.classList.toggle("active",button.dataset.nav===pageId);
  });

  closeDrawer();
  window.scrollTo(0,0);
}
$$("[data-nav]").forEach(button=>{
  button.onclick=()=>goToPage(button.dataset.nav);
});
$("#menuButton").onclick=openDrawer;
$("#drawerCloseBtn").onclick=closeDrawer;
$("#drawerOverlay").onclick=closeDrawer;
document.addEventListener("keydown",event=>{
  if(event.key==="Escape")closeDrawer();
});


$("#favoritesOnly").addEventListener("change",event=>{favoritesOnly=event.target.checked;renderExerciseLibrary();});
$("#exerciseSearch").addEventListener("input",event=>{
  exerciseLibrarySearch=event.target.value;
  renderExerciseLibrary();
});
$("#clearExerciseSearchBtn").addEventListener("click",()=>{
  exerciseLibrarySearch="";
  renderExerciseLibrary();
});

$("#todayText").textContent=new Date().toLocaleDateString("zh-TW",{year:"numeric",month:"long",day:"numeric",weekday:"short"});
$("#addTaskBtn").onclick=()=>{const x=prompt("任務名稱");if(x){ensureDay().tasks.push({id:crypto.randomUUID(),text:x,done:false});save()}};
$("#addExerciseBtn").onclick=()=>{
  goToPage("exerciseLibraryPage");
};




$$(".add-custom-metric").forEach(button=>{
  button.onclick=()=>{
    const input=document.getElementById(button.dataset.inputId);
    const metric=button.dataset.metricName;
    const amount=Number(input?.value);

    if(!Number.isFinite(amount)||amount<=0){
      alert("請先輸入大於 0 的數字。");
      input?.focus();
      return;
    }

    const metrics=todayMetrics();
    metrics[metric]=Number(metrics[metric]||0)+amount;
    input.value="";
    save();
  };
});

$("#setSleepBtn").onclick=()=>{
  const input=$("#sleepCustomInput");
  const value=Number(input.value);

  if(!Number.isFinite(value)||value<0||value>24){
    alert("睡眠請輸入 0～24 小時。");
    input.focus();
    return;
  }

  todayMetrics().sleep=value;
  input.value="";
  save();
};

$$(`[data-edit-metric]`).forEach(button=>{
  button.onclick=()=>{
    const metric=button.dataset.editMetric;
    const unit=button.dataset.unit||"";
    const metrics=todayMetrics();
    const current=Number(metrics[metric])||0;
    const value=prompt(`請輸入正確的目前總數（${unit}）`,String(current));
    if(value===null)return;
    const number=Number(value);
    if(!Number.isFinite(number)||number<0)return alert("請輸入 0 以上的數字。");
    metrics[metric]=number;
    save();
  };
});

$$(`[data-reset-metric]`).forEach(button=>{
  button.onclick=()=>{
    if(!confirm("確定將今天這項數值歸零嗎？"))return;
    todayMetrics()[button.dataset.resetMetric]=0;
    save();
  };
});

$$("[data-metric]").forEach(button=>button.onclick=()=>{
  const metric=button.dataset.metric;
  const metrics=todayMetrics();
  metrics[metric]=Number(metrics[metric]||0)+Number(button.dataset.add||0);
  save();
});

$("#prevMenuDateBtn").onclick=()=>{if(menuHasUnsavedChanges&&!confirm("目前菜單尚未儲存，仍要切換日期嗎？"))return;menuPreviewKey=shiftDate(menuPreviewKey,-1);setMenuUnsaved(false);renderMenuPreview()};
$("#nextMenuDateBtn").onclick=()=>{if(menuHasUnsavedChanges&&!confirm("目前菜單尚未儲存，仍要切換日期嗎？"))return;menuPreviewKey=shiftDate(menuPreviewKey,1);setMenuUnsaved(false);renderMenuPreview()};
$("#todayMenuDateBtn").onclick=()=>{if(menuHasUnsavedChanges&&!confirm("目前菜單尚未儲存，仍要回到今天嗎？"))return;menuPreviewKey=dateKey();setMenuUnsaved(false);renderMenuPreview()};
$("#menuPreviewDate").onchange=e=>{if(menuHasUnsavedChanges&&!confirm("目前菜單尚未儲存，仍要切換日期嗎？")){e.target.value=menuPreviewKey;return;}menuPreviewKey=e.target.value||dateKey();setMenuUnsaved(false);renderMenuPreview()};
$("#applyPersonalPlanBtn").onclick=applyPersonalPlan;

$("#addCustomExerciseBtn").onclick=openCustomExerciseModal;
$("#closeCustomExerciseBtn").onclick=closeCustomExerciseModal;
$("#confirmCustomExerciseBtn").onclick=addCustomExercise;
$("#customExerciseModal").onclick=event=>{
  if(event.target===$("#customExerciseModal"))closeCustomExerciseModal();
};

$("#editWeeklyPlanBtn").onclick=openWeeklyPlanEditor;
$("#cancelWeeklyPlanEditBtn").onclick=()=>{$("#weeklyPlanEditor").hidden=true};
$("#saveWeeklyPlanBtn").onclick=saveWeeklyPlanEdits;

$("#clearSymptomsBtn").onclick=()=>{
  ensureCycleProfile();
  state.profile.symptoms=[];
  renderCycleSettingsV9();
  save();
};

$("#addWarmupBtn").onclick=()=>{
  const day=ensureDay();
  const list=warmups(day);
  list.push({
    id:crypto.randomUUID(),
    name:"",
    amount:"",
    unit:"次",
    done:false,
    custom:true
  });
  save();
  requestAnimationFrame(()=>{
    const inputs=$$("#warmupList .phase-name-input");
    inputs.at(-1)?.focus();
  });
};

$("#addStretchBtn").onclick=()=>{
  const day=ensureDay();
  const list=stretches(day);
  list.push({
    id:crypto.randomUUID(),
    name:"",
    seconds:"",
    done:false,
    custom:true
  });
  save();
  requestAnimationFrame(()=>{
    const inputs=$$("#stretchList .phase-name-input");
    inputs.at(-1)?.focus();
  });
};

$("#foodTimingBtn").onclick=()=>{const x=prompt("距離訓練幾分鐘？輸入 30、60 或 120",ensureDay().foodTiming);if(["30","60","120"].includes(x)){ensureDay().foodTiming=x;save()}};
$("#finishWorkoutBtn").onclick=()=>{const d=ensureDay();d.status=pct(d)===100?"completed":"unfinished";d.exercises.forEach(e=>{const completion=Math.round(e.sets.filter(s=>s.done).length/e.sets.length*100),max=Math.max(0,...e.sets.map(s=>+s.weight||0)),rpes=e.sets.map(s=>Number(s.rpe)||0).filter(Boolean),avgRpe=rpes.length?Math.round(rpes.reduce((a,b)=>a+b,0)/rpes.length*10)/10:0;state.history[e.name]=[{date:dateKey(),completion,max,avgRpe},...(state.history[e.name]||[])].slice(0,20)});save();alert("今日訓練已儲存")};
$("#prevDateBtn").onclick=()=>{previewKey=shiftDate(previewKey,-1);renderPreview()};$("#nextDateBtn").onclick=()=>{previewKey=shiftDate(previewKey,1);renderPreview()};$("#todayPreviewBtn").onclick=()=>{previewKey=dateKey();renderPreview()};$("#previewDate").onchange=e=>{previewKey=e.target.value||dateKey();renderPreview()};
$("#cardioType").onchange=cardioFields;$("#saveCardioBtn").onclick=()=>{const r={id:crypto.randomUUID(),date:dateKey(),type:$("#cardioType").value,speed:+$("#cardioSpeed").value||0,incline:+$("#cardioIncline").value||0,resistance:+$("#cardioResistance").value||0,rpm:+$("#cardioRpm").value||0,level:+$("#cardioLevel").value||0,minutes:+$("#cardioMinutes").value||0,note:$("#cardioNote").value};if(!r.minutes)return alert("請輸入分鐘");state.cardio.push(r);save()};
$("#resetMenuBtn").onclick=()=>{
  if(!confirm("要恢復這一天的建議菜單嗎？"))return;
  delete state.menus[menuPreviewKey];
  ensureMenu(menuPreviewKey);
  saveLocal(state);
  renderMenuPreview();
  renderHomeMenuSummary();
  setMenuUnsaved(true);
};
$("#saveMenuBtn").onclick=async()=>{
  try{
    await saveCurrentMenu();
  }catch(error){
    console.error("Menu save failed:",error);
    alert(`菜單已儲存在此裝置，但雲端同步失敗：${error.message}`);
  }
};
$("#saveBodyBtn").onclick=()=>{state.body.push({date:new Date().toLocaleDateString("zh-TW"),fat:$("#bodyFat").value,weight:$("#bodyWeight").value,waist:$("#bodyWaist").value,hip:$("#bodyHip").value});save()};
$("#cycleEnabled").onchange=e=>$("#cycleSettings").hidden=!e.target.checked;$("#saveProfileBtn").onclick=()=>{state.profile={...state.profile,displayName:$("#displayName").value,gender:$("#gender").value,increment:+$("#weightIncrement").value||2.5,cycleEnabled:$("#cycleEnabled").checked,lastPeriod:$("#lastPeriod").value,cycleLength:+$("#cycleLength").value||28,periodLength:+$("#periodLength").value||6,symptoms:$$('#symptomBox input:checked').map(x=>x.value)};save()};

$("#cycleEnabled").addEventListener("change", event => {
  $("#cycleSettings").hidden = !event.target.checked;
});
$("#addCustomSymptomBtn").addEventListener("click", () => {
  ensureCycleProfile();
  const input = $("#customSymptomInput");
  const value = input.value.trim();
  if(!value) return;
  if(!state.profile.customSymptoms.includes(value)){
    state.profile.customSymptoms.push(value);
  }
  input.value = "";
  save();
});
$("#saveCycleBtn").addEventListener("click", saveCycleSettingsV9);


$("#savePlanSettingsBtn").onclick=()=>{
  const goal=$("#planGoal").value;
  const days=Math.max(1,Math.min(7,Number($("#planDays").value)||4));
  const focus=$("#planFocus").value;

  state.profile.goal=goal;
  state.profile.planDays=days;
  state.profile.planFocus=focus;

  save();

  const status=document.getElementById("planSaveStatus");
  if(status){
    status.textContent=`已儲存：${new Date().toLocaleString("zh-TW")}`;
    status.classList.remove("save-error");
    status.classList.add("save-success");
  }
};

$("#generatePlanBtn").onclick=()=>{
  const goal=$("#planGoal").value;
  const days=Number($("#planDays").value)||4;
  const focus=$("#planFocus").value;

  const goalMap={
    fatloss:{title:"降低體脂",description:"減脂並維持肌肉"},
    muscle:{title:"增加肌肉",description:"增肌與力量進步"},
    recomp:{title:"體態重塑",description:"降低體脂並增加肌肉"},
    strength:{title:"提升力量",description:"主要動作力量進步"},
    health:{title:"健康維持",description:"規律運動與健康維持"}
  };

  state.profile.goal=goal;
  state.goal=state.goal||{};
  state.goal.title=goalMap[goal]?.title||"健康維持";
  state.goal.description=goalMap[goal]?.description||"規律運動";

  state.profile.goal=goal;
  state.profile.planDays=days;
  state.profile.planFocus=focus;
  state.weeklyPlan=buildPlan(goal,days,focus);

  // 同步重建今天與未來 28 天的課表及目標菜單。
  rebuildFuturePlanAndMenus(dateKey(),28);
  const today=ensureDay(dateKey());

  save();
  renderMenuPreview();
  renderHomeMenuSummary();

  // 自動回首頁，直接顯示新課表與新熱量目標。
  goToPage("homePage");

  alert(`已套用「${state.goal.title}」課表。
今天：${today.title}
每週訓練 ${days} 天。`);
};
$("#copyFriendCodeBtn").onclick=async()=>{if(!user)return alert("請先登入");const c=friendCodeForUid(user.uid);try{await navigator.clipboard.writeText(c);friendMessage("好友代碼已複製。")}catch{prompt("請複製好友代碼",c)}};
$("#sendFriendRequestBtn").onclick=sendFriendRequest;
$("#sharePostBtn").onclick=sharePost;
$("#syncNowBtn").onclick=()=>syncCloud(true);$("#closeModalBtn").onclick=closeModal;$("#modal").onclick=e=>{if(e.target===$("#modal"))closeModal()};
$("#loginBtn").onclick=()=>login().catch(e=>alert(e.message));
authState(async u=>{user=u;if(u){$("#authBox").innerHTML=`<div class="between"><img class="avatar" src="${u.photoURL||""}"><div><b>${u.displayName||"已登入"}</b><br><button class="tiny" id="logoutBtn">登出</button></div></div>`;$("#logoutBtn").onclick=logout;status("讀取中","正在讀取雲端資料…");await ensurePublicProfile();listenSocial();try{state=await pullCloud(u.uid,state);saveLocal(state);status("同步正常","已載入雲端資料。");$("#syncStatus").textContent="已載入雲端資料。"}catch(e){status("讀取失敗",e.message)}render()}else{clearSocial();friendships=[];receivedRequests=[];feedPosts=[];$("#authBox").innerHTML='<button class="primary" id="loginBtn2">Google 登入</button>';$("#loginBtn2").onclick=()=>login().catch(e=>alert(e.message));status("尚未登入","登入後可跨裝置同步。");render()}});
render();

// v8.1: Service Worker intentionally disabled until core is verified stable.

window.addEventListener("beforeunload",event=>{
  if(menuHasUnsavedChanges){
    event.preventDefault();
    event.returnValue="";
  }
});
