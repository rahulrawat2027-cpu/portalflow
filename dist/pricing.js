/* Proposed launch prices only. This module never starts a trial or changes billing/workspace data. */
(function (root) {
  'use strict';
  const catalog=Object.freeze({currency:'INR',monthlyPaise:99900,annualPaise:999000,intro:Object.freeze({firstMonthPaise:49900,eligibleCadence:'monthly',usesPerWorkspace:1}),proposedTrialDays:14});
  const money=paise=>new Intl.NumberFormat('en-IN',{style:'currency',currency:catalog.currency,minimumFractionDigits:paise%100?2:0,maximumFractionDigits:2}).format(paise/100);
  function quote(cadence='monthly',intro=false) {
    if(!['monthly','annual'].includes(cadence))throw Error('Invalid billing cadence.');
    if(typeof intro!=='boolean')throw Error('Invalid introductory offer selection.');
    if(cadence==='annual'&&intro)throw Error('The introductory offer applies to monthly plans only.');
    const duePaise=cadence==='annual'?catalog.annualPaise:intro?catalog.intro.firstMonthPaise:catalog.monthlyPaise;
    const savingsPaise=catalog.monthlyPaise*12-catalog.annualPaise;
    return Object.freeze({cadence,intro,duePaise,renewalPaise:cadence==='annual'?catalog.annualPaise:catalog.monthlyPaise,monthlyEquivalentPaise:cadence==='annual'?catalog.annualPaise/12:catalog.monthlyPaise,savingsPaise:cadence==='annual'?savingsPaise:0,savingsPercentLabel:cadence==='annual'?(100*savingsPaise/(catalog.monthlyPaise*12)).toFixed(2)+'%':'0%',firstYearPaise:cadence==='annual'?catalog.annualPaise:duePaise+catalog.monthlyPaise*11});
  }
  function selectionMarkup() {
    return `<div class="pf-pricing" data-pricing-root>
      <div class="pricing-beta"><div class="pricing-status-icon" aria-hidden="true">✓</div><div><h2>Free beta</h2><p>Your workspace has no expiry and no automatic charges. Nothing you choose here changes your account.</p></div><span class="pricing-status-tag">Current access</span></div>
      <div class="pricing-layout">
        <section class="pricing-plan" aria-labelledby="launch-plan-title"><div class="pricing-plan-heading"><div><span class="pricing-kicker">PROPOSED LAUNCH PLAN</span><h2 id="launch-plan-title">Everything in one place.</h2></div><span class="pricing-country">INR · India</span></div><p>One agency account. A simpler way to work with your clients.</p>
          <fieldset class="pricing-cadence"><legend>Choose how you would pay</legend><label><input type="radio" name="pricing-cadence" value="monthly" checked><span>Monthly<small>Pay one month at a time</small></span></label><label><input type="radio" name="pricing-cadence" value="annual"><span>Yearly<small>Save ${money(quote('annual').savingsPaise)} a year</small></span></label></fieldset>
          <div class="pricing-quote" aria-live="polite" aria-atomic="true" data-pricing-quote>${quoteMarkup(quote())}</div>
          <div class="pricing-offer"><label class="pricing-intro"><input type="checkbox" data-pricing-intro><span>First month for ${money(catalog.intro.firstMonthPaise)}<small>Preview the new-subscriber offer</small></span></label><p class="pricing-small" data-pricing-eligibility>Offer applies once per workspace, monthly only. Then ${money(catalog.monthlyPaise)}/month. Cannot combine with annual pricing.</p></div>
          <a class="pricing-cta" href="index.html">Continue to your workspace <span aria-hidden="true">→</span></a><p class="pricing-small pricing-payment-note">No checkout or payment today. Prices are proposals; applicable taxes and final terms will be confirmed before paid launch.</p>
        </section>
        <section class="pricing-included"><span class="pricing-kicker">MADE FOR YOUR DAILY WORK</span><h2>Less admin. Clearer handoffs.</h2><ul class="pricing-benefits"><li><span aria-hidden="true">✓</span><div><b>Keep every project moving</b><p>Projects, tasks and client requests in one workspace.</p></div></li><li><span aria-hidden="true">✓</span><div><b>Get clear client decisions</b><p>Version comments, approvals and a history of every sign-off.</p></div></li><li><span aria-hidden="true">✓</span><div><b>Bring the conversation together</b><p>Client access, messages and file snapshots alongside the work.</p></div></li><li><span aria-hidden="true">✓</span><div><b>Stay on top of the details</b><p>Manual invoice records, time tracking and workspace exports.</p></div></li></ul>
          <div class="pricing-trial"><h3>A ${catalog.proposedTrialDays}-day trial is planned</h3><p>No card required at a future paid launch. No trial clock is running today.</p></div>
          <details class="pricing-limits"><summary>Current limits & service availability</summary><p class="pricing-small">One agency account and client access in shared-server mode. Files are limited to 1 MiB each; existing workspace storage safeguards apply. Browser export and local server backups are available.</p><p class="pricing-small">Hosting, payment processing, email delivery and legal signatures are not active services. Unlimited storage, staff and support are not included.</p><a href="research.html">Full feature status ↗</a></details>
        </section>
      </div>
    </div>`;
  }
  function quoteMarkup(q) {
    const amount='<strong class="pricing-amount">'+money(q.duePaise)+'</strong>';
    return q.cadence==='annual'?amount+'<span>per year, paid upfront</span><p>'+money(q.monthlyEquivalentPaise)+'/month equivalent. Renews at '+money(q.renewalPaise)+'/year.</p><p class="pricing-saving">Save '+money(q.savingsPaise)+' per year ('+q.savingsPercentLabel+') versus 12 standard monthly payments.</p>':amount+'<span>'+(q.intro?'for the first paid month':'per month')+'</span><p>'+(q.intro?'Then '+money(q.renewalPaise)+'/month. First 12 paid months: '+money(q.firstYearPaise)+'.':'Standard monthly price: '+money(q.renewalPaise)+'.')+'</p>';
  }
  function update(event) {
    if(!event.target.matches('[name="pricing-cadence"], [data-pricing-intro]'))return;
    const node=event.target.closest('[data-pricing-root]');if(!node)return;
    const cadence=node.querySelector('[name="pricing-cadence"]:checked').value;
    const intro=node.querySelector('[data-pricing-intro]');
    if(cadence==='annual')intro.checked=false;
    intro.disabled=cadence==='annual';
    node.querySelector('[data-pricing-eligibility]').textContent=cadence==='annual'?'Yearly billing includes its own saving. The first-month offer is available with monthly billing only.':'Proposed offer: once per workspace, monthly only. Then '+money(catalog.monthlyPaise)+'/month. Cannot combine with annual pricing.';
    node.querySelector('[data-pricing-quote]').innerHTML=quoteMarkup(quote(cadence,intro.checked));
  }
  root.PortalFlowPricing=Object.freeze({catalog,quote,money,markup:selectionMarkup});
  const PF=typeof window!=='undefined'?window.PF:null;
  if(PF){PF.views.pricing={title:'Plan & pricing',icon:'◇',render:()=>selectionMarkup()};PF.onChange.push(update);}
  if(typeof document!=='undefined'){
    const mount=document.querySelector('[data-pricing-public]');
    if(mount){mount.innerHTML=selectionMarkup();mount.addEventListener('change',update);}
    const theme=document.querySelector('[data-pricing-theme]');
    if(theme)theme.addEventListener('click',()=>{const dark=document.documentElement.dataset.theme==='dark'||(!document.documentElement.dataset.theme&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.dataset.theme=dark?'light':'dark';});
  }
})(globalThis);
