// My Trips V3.3 — local-only travel wallet
(function(){
  const previousRender=render;
  render=function(){
    if(state.view==='finance'){
      renderHeader();
      $$('.navbtn').forEach(b=>b.classList.toggle('active',b.dataset.view===state.view));
      if(!TRIP){state.view='library';return previousRender()}
      return renderFinance();
    }
    return previousRender();
  };

  function financeKey(){return `finance:${TRIP?.id||'none'}`}
  function loadFinance(){
    const defaults={rate:TRIP?.finance?.planningRate||1,totalBudgetIDR:TRIP?.finance?.budgetRange?.maxIDR||0,expenses:[]};
    try{const saved=JSON.parse(localStorage.getItem(financeKey())||'{}');return {...defaults,...saved,expenses:Array.isArray(saved.expenses)?saved.expenses:[]}}catch(e){return defaults}
  }
  function saveFinance(v){localStorage.setItem(financeKey(),JSON.stringify(v))}
  function money(n,c='IDR'){const v=Math.round(Number(n)||0);return c==='CNY'?'¥'+v.toLocaleString('zh-CN'):'IDR '+v.toLocaleString('en-US')}
  function toCNY(idr,rate){return rate>0?(Number(idr)||0)/rate:0}
  function total(f){return f.expenses.reduce((s,x)=>s+(Number(x.idr)||0),0)}
  function onDate(f,date){return f.expenses.filter(x=>x.date===date).reduce((s,x)=>s+(Number(x.idr)||0),0)}
  function categories(){return TRIP?.finance?.categories||['住宿','交通','餐饮','门票/项目','购物','其他']}
  function deleteExpense(id){const f=loadFinance();f.expenses=f.expenses.filter(x=>x.id!==id);saveFinance(f);renderFinance()}
  function exportFinance(){const f=loadFinance();const blob=new Blob([JSON.stringify({tripId:TRIP.id,city:TRIP.city,finance:f},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=`${TRIP.id}-expenses.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
  function addExpense(){
    const f=loadFinance(),amount=Number($('#expenseAmount').value),currency=$('#expenseCurrency').value;
    if(!amount||amount<=0){alert('请输入消费金额');return}
    const rate=Number(f.rate)||1,idr=currency==='IDR'?amount:amount*rate;
    f.expenses.unshift({id:`e-${Date.now()}`,date:$('#expenseDate').value||localParts().date,category:$('#expenseCategory').value,title:$('#expenseTitle').value.trim()||$('#expenseCategory').value,originalAmount:amount,currency,idr:Math.round(idr),note:$('#expenseNote').value.trim(),createdAt:Date.now()});
    saveFinance(f);renderFinance();
  }

  window.renderFinance=function(){
    renderDayStrip(false);
    const f=loadFinance(),rate=Number(f.rate)||1,spent=total(f),today=onDate(f,localParts().date),budget=Number(f.totalBudgetIDR)||0,remain=budget?Math.max(0,budget-spent):0,pct=budget?Math.min(100,Math.round(spent/budget*100)):0,cats=categories(),range=TRIP.finance?.budgetRange;
    const catTotals=Object.fromEntries(cats.map(c=>[c,0]));f.expenses.forEach(x=>catTotals[x.category]=(catTotals[x.category]||0)+(Number(x.idr)||0));const maxCat=Math.max(1,...Object.values(catTotals));
    $('#main').innerHTML=`
      <section class="card finance-hero"><div class="smart-label">${TRIP.city} · TRAVEL WALLET</div><div class="money-big">${money(spent)}</div><div class="money-sub">约 ${money(toCNY(spent,rate),'CNY')} · 1 CNY = ${Math.round(rate).toLocaleString()} IDR</div><div class="money-grid"><div class="money-stat"><b>今日消费</b><span>${money(today)}</span></div><div class="money-stat"><b>预算剩余</b><span>${budget?money(remain):'未设置'}</span></div><div class="money-stat"><b>记录笔数</b><span>${f.expenses.length}</span></div></div>${budget?`<div class="progress-wrap"><div class="progress-head"><span>总预算使用</span><span>${pct}%</span></div><div class="progress"><i style="width:${pct}%"></i></div></div>`:''}</section>
      <div class="section-head"><h3>快速换算</h3><span class="hint">汇率可以随时改</span></div><section class="card"><div class="rate-card"><div class="field"><label>1 CNY = 多少 IDR</label><input id="fxRate" type="number" min="1" step="1" value="${rate}"></div><div class="field"><label>输入 IDR</label><input id="fxIDR" type="number" min="0" step="1000" placeholder="例如 500000"></div></div><div class="converter-result" id="fxResult">¥0</div><div class="converter-note">攻略规划汇率：${TRIP.finance?.rateLabel||'未设置'}。实际刷卡/换汇会有差异。</div><div class="actions" style="margin-top:10px"><button class="btn primary" id="saveRate">保存汇率</button></div></section>
      <div class="section-head"><h3>预算</h3><span class="hint">本机保存</span></div><section class="card">${range?`<div class="route">攻略双人总预算区间：${money(range.minIDR)}–${money(range.maxIDR)}（约 ¥${Number(range.minCNY).toLocaleString()}–¥${Number(range.maxCNY).toLocaleString()}，不含国际机票）</div>`:''}<div class="field" style="margin-top:12px"><label>你的总预算（IDR）</label><input id="totalBudget" type="number" min="0" step="100000" value="${budget||''}" placeholder="例如 30000000"></div><div class="actions"><button class="btn primary" id="saveBudget">保存总预算</button></div>${budget?`<div class="budget-box"><div class="budget-head"><span>已用 ${money(spent)}</span><span>剩余 ${money(remain)}</span></div><div class="budget-track"><i style="width:${pct}%"></i></div></div>`:''}</section>
      <div class="section-head"><h3>记一笔</h3><span class="hint">IDR / CNY 都可以</span></div><section class="card"><div class="expense-form"><div class="field"><label>金额</label><input id="expenseAmount" type="number" min="0" step="1" placeholder="金额"></div><div class="field"><label>币种</label><select id="expenseCurrency"><option>IDR</option><option>CNY</option></select></div><div class="field"><label>分类</label><select id="expenseCategory">${cats.map(c=>`<option>${escapeHTML(c)}</option>`).join('')}</select></div><div class="field"><label>日期</label><input id="expenseDate" type="date" value="${localParts().date}"></div><div class="field"><label>项目</label><input id="expenseTitle" type="text" placeholder="例如 Grab / 晚餐"></div><div class="field"><label>备注</label><input id="expenseNote" type="text" placeholder="可选"></div><div class="wide-row"><button class="btn primary wide" id="addExpense">添加消费</button></div></div></section>
      <div class="section-head"><h3>分类统计</h3><span class="hint">统一按 IDR</span></div><section class="card">${cats.map(c=>`<div class="cat-row"><div class="cat-name">${escapeHTML(c)}</div><div class="cat-bar"><i style="width:${Math.round((catTotals[c]||0)/maxCat*100)}%"></i></div><div class="cat-value">${money(catTotals[c]||0)}</div></div>`).join('')}</section>
      <div class="section-head"><h3>每日消费</h3><span class="hint">Day 1–${TRIP.days.length}</span></div><section class="card">${TRIP.days.map((d,i)=>{const v=onDate(f,d.date);return `<div class="day-budget-row"><span>Day ${i+1}</span><div class="cat-bar"><i style="width:${spent?Math.round(v/spent*100):0}%"></i></div><span>${money(v)}</span></div>`}).join('')}</section>
      <div class="section-head"><h3>消费明细</h3><span class="hint">${f.expenses.length} 笔</span></div><section class="card">${f.expenses.length?f.expenses.map(x=>`<div class="expense-row"><div class="expense-main"><h4>${escapeHTML(x.title)}</h4><div class="expense-meta">${x.date} · ${escapeHTML(x.category)}${x.note?' · '+escapeHTML(x.note):''}</div></div><div class="expense-amount"><b>${money(x.idr)}</b><span>${x.currency==='CNY'?money(x.originalAmount,'CNY'):''}</span><div class="mini-actions"><button data-del="${x.id}">删除</button></div></div></div>`).join(''):'<div class="route">还没有消费记录。</div>'}</section><div class="actions"><button class="btn" id="exportFinance">导出记账 JSON</button></div>`;
    const update=()=>{$('#fxResult').textContent=money(toCNY(Number($('#fxIDR').value)||0,Number($('#fxRate').value)||1),'CNY')};$('#fxRate').addEventListener('input',update);$('#fxIDR').addEventListener('input',update);
    $('#saveRate').addEventListener('click',()=>{const v=loadFinance(),r=Number($('#fxRate').value);if(!r||r<=0){alert('请输入有效汇率');return}v.rate=r;saveFinance(v);renderFinance()});
    $('#saveBudget').addEventListener('click',()=>{const v=loadFinance();v.totalBudgetIDR=Number($('#totalBudget').value)||0;saveFinance(v);renderFinance()});
    $('#addExpense').addEventListener('click',addExpense);$$('[data-del]').forEach(b=>b.addEventListener('click',()=>{if(confirm('删除这笔消费？'))deleteExpense(b.dataset.del)}));$('#exportFinance').addEventListener('click',exportFinance);
  };
})();
