async (page) => {
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.setViewportSize({width:1280,height:900});
  const checks = [];
  const ok = (condition, name) => { if (!condition) throw new Error(name); checks.push(name); console.log(`PASS ${name}`); };
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // This named Playwright session has its own profile. Every nonlocal request is intercepted.
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.hostname === '127.0.0.1' || url.hostname === 'localhost'
      ? route.continue() : route.fulfill({status: 200, contentType: 'application/json', body: 'null'});
  });
  await page.goto('http://127.0.0.1:5173');
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForFunction(() => !!window.game);
  await page.evaluate(() => {
    window.resetDiscoveryTest = () => {
      window.game.state = 'paused';
      window.game.isTestRun = false;
      window.game.currentGameMode = 'arcade';
      window.game.levelUpShockwave.active = false;
      window.game.singularityIntroTimer = 0;
      window.input.clearAllInputs();
      window.profileManager.profile = {pseudo:'TESTER',syncCode:'CHV-TEST',careerGhosts:0,accountLevel:1,accountXp:0,skillPoints:50,skillUpgrades:{},hiScore:0,bestMadnessKills:0,arcadeHiScore:0,customHiScore:0,badges:{},discoveredSkills:[],pendingDiscoveries:[],gameMode:'arcade',updatedAt:'test'};
      window.profileManager.saveProfile();
    };
    window.discoverySnapshot = () => JSON.stringify({state:game.state,time:game.time,score:game.score,mana:game.mana,kills:game.madnessKills,chrono:game.chronoEnergy,player:game.player,enemies:game.enemyManager.enemies,combo:game.combo,ready:game.readyT,shock:game.levelUpShockwave,fx:powerups.fx,pred:powerups.pred,laser:superItems.laserTimer,wiggle:input.wiggleCd,nitro:input.nitroCd,profile:profileManager.profile,storage:Object.keys(localStorage).sort().map(k=>[k,localStorage.getItem(k)])});
    resetDiscoveryTest(); game.startGame();
  });
  const dialog = page.locator('#skill-discovery-modal');
  await dialog.waitFor({state:'visible'});
  ok(await page.locator('#discovery-title').textContent() === 'POWER PELLET', 'First base discovery appears');
  const before = await page.evaluate(() => ({state:discoverySnapshot(),image:document.querySelector('#discovery-preview').toDataURL()}));
  await page.waitForTimeout(450);
  const after = await page.evaluate(() => ({state:discoverySnapshot(),image:document.querySelector('#discovery-preview').toDataURL()}));
  ok(before.state === after.state, 'Live positions, timers, resources, statistics and saves freeze during discovery');
  ok(before.image !== after.image, 'Preview animation continues independently during pause');
  await page.keyboard.press('Tab');
  ok(await page.locator('#discovery-dismiss').evaluate(el => el === document.activeElement), 'Discovery keyboard focus stays inside dialog');
  await page.keyboard.down('Enter');
  await page.keyboard.down('Enter');
  ok(await page.evaluate(() => !input.isStartRequested && !input.isDashRequested), 'Held closing key does not issue a gameplay command');
  await page.keyboard.up('Enter');
  await page.evaluate(() => {game.state='paused';game.startGame();game.state='paused';});
  await page.waitForTimeout(100);
  ok(await dialog.isHidden(), 'Acknowledged cards do not repeat on the next launch');

  await page.evaluate(async () => {
    resetDiscoveryTest(); profileManager.profile.careerGhosts=120; game.state='paused';
    const {getArcadeDiscovery}=await import('/src/ui/DiscoveryCatalog.ts');
    const {SKILL_TREE}=await import('/src/systems/ProgressionSystem.ts');
    game.discoveries.enqueue(getArcadeDiscovery(SKILL_TREE[0]));
    game.discoveries.enqueue(getArcadeDiscovery(SKILL_TREE[1]));
    game.discoveries.enqueue(getArcadeDiscovery(SKILL_TREE[0]));
  });
  await dialog.waitFor({state:'visible'});
  const pausedTime = await page.evaluate(()=>game.time);
  await page.locator('#discovery-dismiss').click();
  ok(await page.locator('#discovery-title').textContent() === 'MEGA NOVA', 'Multiple discoveries keep their order without duplication');
  ok(await page.evaluate(t=>game.time === t, pausedTime), 'No gameplay frame runs between queued cards');
  await page.locator('#discovery-dismiss').click();
  ok(await page.evaluate(()=>game.state==='paused'), 'Closing a discovery preserves manual pause');

  // Actual career threshold event; no direct call to the presentation queue.
  await page.evaluate(() => {
    resetDiscoveryTest(); profileManager.profile.careerGhosts=9; profileManager.profile.discoveredSkills=['arcade:base:power_pellet'];
    game.startGame(); game.state='playing'; game.player.invuln=100;
    const ghost=game.enemyManager.enemies[0];const p=game.enemyManager.getPos(ghost); game.onKillGhost(ghost,p.x,p.y);
  });
  await dialog.waitFor({state:'visible'});
  ok(await page.locator('#discovery-title').textContent() === 'OFFENSIVE DASH', 'Crossing a real career threshold presents the earned ability');
  await page.locator('#discovery-dismiss').click();
  await page.evaluate(async () => {
    game.state='playing';game.enemyManager.enemies=[];game.player.invuln=100;
    game.levelUpShockwave={active:true,timer:.35,maxTimer:.6,x:0,y:0,radius:0,maxRadius:500,level:2,isSurge:false};
    const {getArcadeDiscovery}=await import('/src/ui/DiscoveryCatalog.ts');
    const {SKILL_TREE}=await import('/src/systems/ProgressionSystem.ts');
    game.discoveries.enqueue(getArcadeDiscovery(SKILL_TREE[2]));
  });
  await page.waitForTimeout(80);
  ok(await dialog.isHidden(), 'Level-up cleanup completes before the next discovery');
  await dialog.waitFor({state:'visible'});
  ok(await page.evaluate(()=>!game.levelUpShockwave.active), 'Pending discovery survives the cleanup wave');
  await page.locator('#discovery-dismiss').click();

  await page.evaluate(async () => {
    resetDiscoveryTest();profileManager.profile.careerGhosts=2000;profileManager.profile.gameMode='custom';game.currentGameMode='custom';game.state='codex';
    game.codexTab='tree'; game.renderer.selectedSkillId='magnetic_core';
  });
  await page.keyboard.press('Enter');
  await dialog.waitFor({state:'visible'});
  ok(await page.locator('#discovery-title').textContent() === 'MAGNETIC SINGULARITY', 'Purchasing a passive skill triggers its discovery');
  ok(await page.locator('#discovery-sequence').isHidden(), 'Passive card invents no command keys');
  await page.locator('#discovery-dismiss').click();
  await page.keyboard.press('Enter');
  await dialog.waitFor({state:'visible'});
  ok((await page.locator('#discovery-unlock-label').textContent()).includes('RANK 2'), 'A new purchased rank presents its concrete improvement');
  await page.locator('#discovery-dismiss').click();

  // Review all preview families without changing anything in the real game.
  await page.evaluate(() => {
    resetDiscoveryTest();profileManager.profile.careerGhosts=13000;profileManager.profile.gameMode='custom';
    game.state='codex';game.codexTab='skills';game.currentGameMode='custom';
    profileManager.profile.skillUpgrades={dash_reflex:5,multi_dash:3,vector_surge:4,hyper_nitro:4,phase_shift:3,quantum_laser:2,chrono_tank:5,emp_overcharge:4,deep_freeze:3,magnetic_core:3,aegis_shield:3,kinetic_bastion:2,pellet_resonance:5,titan_breaker:3,super_frequency:4,singularity_mastery:3,singularity_nova:2};
    game.reviewDiscoveries('custom:kinetic_bastion:rank:2');
  });
  ok((await page.locator('#discovery-usage').textContent()).includes('Double-tap Shift'), 'Chromamancer card teaches its sequence activation');
  const reviewBefore = await page.evaluate(()=>discoverySnapshot());
  await page.waitForTimeout(200);
  ok(await page.evaluate(value=>discoverySnapshot()===value, reviewBefore), 'Arsenal replay does not write saves or alter gameplay');
  await page.setViewportSize({width:375,height:667});
  await page.screenshot({path:'output/playwright/discovery-mobile.png'});
  ok(await page.evaluate(()=>{const el=document.querySelector('.discovery-card');const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&el.scrollWidth<=el.clientWidth;}), 'Card stays inside a narrow mobile viewport without horizontal overflow');
  await page.locator('#discovery-dismiss').click();
  await page.evaluate(()=>{profileManager.profile.gameMode='arcade';game.currentGameMode='arcade';game.reviewDiscoveries('arcade:cryo_v1');});
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForFunction(()=>document.querySelector('#discovery-preview').style.aspectRatio==='440 / 126');
  const still = await page.locator('#discovery-preview').evaluate(el=>el.toDataURL());
  await page.waitForTimeout(200);
  ok(still===await page.locator('#discovery-preview').evaluate(el=>el.toDataURL()), 'Reduced-motion mode displays a stable before/result illustration');
  await page.screenshot({path:'output/playwright/discovery-reduced-motion.png'});
  await page.locator('#discovery-lab').click();
  ok(await page.evaluate(()=>game.state==='lab'), 'Arcade item replay retains Try in Lab access');
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.setViewportSize({width:1280,height:900});

  await page.evaluate(() => {
    resetDiscoveryTest();game.enterBonusStage();game.bonusItemSpawnTimer=0;
  });
  await dialog.waitFor({state:'visible'});
  const bonusState = await page.evaluate(()=>JSON.stringify([game.bonusTimer,game.bonusKills,game.bonusScore,game.bonusGhosts,game.bonusItems,game.bonusLaserTimer,game.bonusVortex,profileManager.profile]));
  await page.waitForTimeout(200);
  ok(await page.evaluate(before=>JSON.stringify([game.bonusTimer,game.bonusKills,game.bonusScore,game.bonusGhosts,game.bonusItems,game.bonusLaserTimer,game.bonusVortex,profileManager.profile])===before,bonusState),'Bonus pickups also present a card without advancing the arena');
  await page.locator('#discovery-dismiss').click();
  await page.evaluate(()=>{
    game.state='codex';game.codexTab='skills';game.reviewDiscoveries();
    window.testPad={connected:true,axes:[0,0],buttons:Array.from({length:17},()=>({pressed:false,value:0}))};
    Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[testPad]});
    game.discoveries.pollGamepad();
    testPad.buttons[0]={pressed:true,value:1};game.discoveries.pollGamepad();
  });
  ok(await dialog.isHidden(),'Controller A closes the discovery');
  await page.waitForTimeout(100);
  ok(await page.evaluate(()=>game.state==='codex'&&!input.isDashRequested&&!input.isStartRequested),'Held controller button cannot restart or dash after closing');
  await page.evaluate(()=>{testPad.buttons[0]={pressed:false,value:0};input.pollGamepad();delete navigator.getGamepads;});

  // Real final-score path, with cloud calls intercepted and profile isolated.
  await page.evaluate(()=>{resetDiscoveryTest();profileManager.profile.arcadeHiScore=100;profileManager.profile.customHiScore=300;game.score=99;game.madnessKills=1;game.triggerGameOver();});
  ok(await page.locator('#name-modal').isHidden(), 'Lower personal score never requests a nickname');
  await page.evaluate(()=>{game.state='playing';game.score=100;game.triggerGameOver();});
  ok(await page.locator('#name-modal').isHidden(), 'Equal personal score never requests a nickname');
  await page.evaluate(()=>{game.state='playing';game.score=101;game.triggerGameOver();});
  ok(await page.locator('#name-modal').isVisible(), 'Strict improvement opens the real nickname modal');
  ok(await page.locator('#pseudo-input').inputValue()==='TESTER', 'Known nickname is prefilled from profile');
  await page.keyboard.press('F2');
  ok(await page.evaluate(()=>game.state==='gameover'), 'Name modal blocks background debug hotkey');
  await page.locator('#pseudo-submit').click();
  await page.evaluate(()=>{game.currentGameMode='custom';game.state='playing';game.score=200;game.triggerGameOver();});
  ok(await page.locator('#name-modal').isHidden(), 'Other-mode record does not qualify against Arcade score');
  await page.evaluate(()=>{game.state='playing';game.score=301;game.triggerGameOver();});
  ok(await page.locator('#name-modal').isVisible(), 'Chromamancer has its own personal record');
  await page.locator('#pseudo-skip').click();
  await page.evaluate(()=>{game.isTestRun=true;game.state='playing';game.score=99999;game.triggerGameOver();});
  ok(await page.locator('#name-modal').isHidden(), 'Test run cannot trigger record entry');
  await page.reload();
  ok(await page.evaluate(()=>profileManager.profile.arcadeHiScore===101&&profileManager.profile.customHiScore===301), 'Real record saves retain both scores after page reload');
  ok(errors.length===0, `No runtime errors (${errors.join('; ')})`);
  return {passed:checks.length,checks};
}
