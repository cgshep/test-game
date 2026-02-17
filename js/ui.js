/* ===================================================
   UI - chat log, stats panel, inventory, dialogue
   =================================================== */

class UI {
  constructor(game) {
    this.game = game;
    this.chatLog     = document.getElementById('chat-log');
    this.hpBar       = document.getElementById('hp-bar');
    this.hpVal       = document.getElementById('hp-val');
    this.xpBar       = document.getElementById('xp-bar');
    this.xpVal       = document.getElementById('xp-val');
    this.skillsGrid  = document.getElementById('skills-grid');
    this.invGrid     = document.getElementById('inventory-grid');
    this.locationEl  = document.getElementById('location-info');
    this.coordsEl    = document.getElementById('coords-info');
    this.eqWeapon    = document.getElementById('eq-weapon');
    this.eqArmour    = document.getElementById('eq-armour');
    this.eqTool      = document.getElementById('eq-tool');
    this.ctxMenu     = document.getElementById('context-menu');
    this.dialogueBox = null;

    this._buildInventorySlots();
    this._buildSkillsGrid();
    this._buildDialogueBox();
  }

  _buildInventorySlots() {
    this.invGrid.innerHTML = '';
    for (let i = 0; i < 28; i++) {
      const slot = document.createElement('div');
      slot.className = 'inv-slot';
      slot.dataset.slot = i;
      slot.addEventListener('click', () => this._onInventoryClick(i));
      this.invGrid.appendChild(slot);
    }
  }

  _buildSkillsGrid() {
    this.skillsGrid.innerHTML = '';
    for (const s of SKILL_DEFS) {
      const el = document.createElement('div');
      el.className = 'skill-item';
      el.id = `skill-${s.id}`;
      el.innerHTML = `
        <div class="skill-name">${s.icon} ${s.name}</div>
        <div class="skill-level" id="sl-${s.id}">1</div>
        <div class="skill-xp" id="sx-${s.id}">0 xp</div>
      `;
      this.skillsGrid.appendChild(el);
    }
  }

  _buildDialogueBox() {
    const el = document.createElement('div');
    el.id = 'dialogue-box';
    el.innerHTML = `
      <div class="dialogue-close" id="dlg-close">✕</div>
      <div class="dialogue-speaker" id="dlg-speaker"></div>
      <div class="dialogue-text" id="dlg-text"></div>
      <div class="dialogue-options" id="dlg-options"></div>
    `;
    document.getElementById('canvas-wrap').appendChild(el);
    this.dialogueBox = el;
    document.getElementById('dlg-close').addEventListener('click', () => this.closeDialogue());
  }

  // ---- Chat Log ----
  log(msg, type = 'game') {
    const line = document.createElement('div');
    line.className = `chat-line chat-${type}`;
    line.textContent = msg;
    this.chatLog.appendChild(line);
    // Keep last 200 lines
    while (this.chatLog.children.length > 200) {
      this.chatLog.removeChild(this.chatLog.firstChild);
    }
    this.chatLog.scrollTop = this.chatLog.scrollHeight;
  }

  // ---- Stats Update ----
  updateStats(player) {
    const hpFrac = player.hp / player.maxHp;
    this.hpBar.style.width = (hpFrac * 100) + '%';
    this.hpVal.textContent = `${player.hp}/${player.maxHp}`;

    const curLvl = player.skills.hp.level;
    const curXp  = player.skills.hp.xp;
    const nextXp = xpForLevel(curLvl + 1);
    const xpFrac = curLvl >= 99 ? 1 : (curXp / nextXp);
    this.xpBar.style.width = (xpFrac * 100) + '%';
    this.xpVal.textContent = `Lv${curLvl} (${curXp} xp)`;

    for (const s of SKILL_DEFS) {
      const sk = player.skills[s.id];
      const lvlEl = document.getElementById(`sl-${s.id}`);
      const xpEl  = document.getElementById(`sx-${s.id}`);
      if (lvlEl) lvlEl.textContent = sk.level;
      if (xpEl)  xpEl.textContent  = sk.xp + ' xp';
    }

    // Equipment
    const weapDef = ITEMS[player.equipment.weapon];
    const armrDef = ITEMS[player.equipment.armour];
    const toolDef = ITEMS[player.equipment.tool];
    this.eqWeapon.textContent = weapDef ? `${weapDef.icon} ${weapDef.name}` : 'Bare Fists';
    this.eqArmour.textContent = armrDef ? `${armrDef.icon} ${armrDef.name}` : 'Nowt';
    this.eqTool.textContent   = toolDef ? `${toolDef.icon} ${toolDef.name}` : 'None';
  }

  // ---- Inventory Update ----
  updateInventory(player) {
    const slots = this.invGrid.querySelectorAll('.inv-slot');
    slots.forEach((slot, i) => {
      const entry = player.inventory[i];
      slot.innerHTML = '';
      slot.removeAttribute('title');
      slot.classList.remove('filled');
      if (entry) {
        const def = ITEMS[entry.item];
        if (!def) return;
        slot.classList.add('filled');
        slot.setAttribute('title', def.name);
        const iconEl = document.createElement('span');
        iconEl.className = 'item-icon';
        iconEl.textContent = def.icon;
        slot.appendChild(iconEl);
        if (entry.qty > 1) {
          const qtyEl = document.createElement('span');
          qtyEl.className = 'item-qty';
          qtyEl.textContent = entry.qty;
          slot.appendChild(qtyEl);
        }
      }
    });
  }

  _onInventoryClick(slotIndex) {
    const player = this.game.player;
    const entry  = player.inventory[slotIndex];
    if (!entry) return;
    const def = ITEMS[entry.item];
    if (!def) return;

    // Build context menu
    const slot = this.invGrid.querySelectorAll('.inv-slot')[slotIndex];
    const rect  = slot.getBoundingClientRect();
    const canvasRect = document.getElementById('canvas-wrap').getBoundingClientRect();
    const actions = [];

    if (def.equip) actions.push({ label: `Equip ${def.name}`, fn: () => {
      if (player.equip(entry.item)) {
        this.game.ui.log(`You equip the ${def.name}.`, 'skill');
        this.game.ui.updateInventory(player);
        this.game.ui.updateStats(player);
      }
    }});
    if (def.healHp) actions.push({ label: `Eat ${def.name}`, fn: () => {
      const healed = player.eat(entry.item);
      if (healed !== false) {
        this.game.ui.log(`You eat the ${def.name} and recover ${healed} HP.`, 'loot');
        this.game.ui.updateInventory(player);
        this.game.ui.updateStats(player);
      }
    }});
    actions.push({ label: `Examine ${def.name}`, fn: () => {
      this.game.ui.log(`${def.name}: ${def.desc}`, 'info');
    }});
    actions.push({ label: 'Drop', fn: () => {
      player.removeItem(entry.item, 1);
      this.game.world.dropItem(player.x, player.y, entry.item, 1);
      this.game.ui.log(`You drop the ${def.name}.`, 'game');
      this.game.ui.updateInventory(player);
    }});

    // Position context menu near the slot (but on canvas)
    const relX = rect.left - canvasRect.left + rect.width;
    const relY = rect.top  - canvasRect.top;
    this.showContextMenu(relX, relY, actions);
  }

  // ---- Location ----
  updateLocation(player, world) {
    const zone = world.getZone(player.x, player.y);
    this.locationEl.textContent = zone;
    this.coordsEl.textContent = `${player.x}, ${player.y}`;
  }

  // ---- Context Menu ----
  showContextMenu(x, y, actions) {
    this.ctxMenu.innerHTML = '';
    this.ctxMenu.classList.remove('hidden');
    this.ctxMenu.style.left = x + 'px';
    this.ctxMenu.style.top  = y + 'px';

    for (const action of actions) {
      const opt = document.createElement('div');
      opt.className = 'ctx-option';
      opt.textContent = action.label;
      opt.addEventListener('click', () => {
        action.fn();
        this.hideContextMenu();
      });
      this.ctxMenu.appendChild(opt);
    }

    const cancel = document.createElement('div');
    cancel.className = 'ctx-option ctx-cancel';
    cancel.textContent = 'Cancel';
    cancel.addEventListener('click', () => this.hideContextMenu());
    this.ctxMenu.appendChild(cancel);
  }

  hideContextMenu() {
    this.ctxMenu.classList.add('hidden');
    this.ctxMenu.innerHTML = '';
  }

  // ---- Dialogue ----
  showDialogue(npc, game) {
    const pages = npc.def.dialogue;
    if (!pages || pages.length === 0) return;
    npc.dialoguePage = 0;
    this._renderDialoguePage(npc, pages[0], game);
    this.dialogueBox.classList.add('active');
  }

  _renderDialoguePage(npc, page, game) {
    document.getElementById('dlg-speaker').textContent = npc.def.name;
    document.getElementById('dlg-text').textContent    = page.text;
    const optEl = document.getElementById('dlg-options');
    optEl.innerHTML = '';

    // Handle shop/sell triggers
    if (page.openShop) {
      const shopBtn = document.createElement('div');
      shopBtn.className = 'dialogue-opt';
      shopBtn.textContent = '🛒 Open Shop';
      shopBtn.addEventListener('click', () => {
        this.closeDialogue();
        game.openShop(npc);
      });
      optEl.appendChild(shopBtn);
    }

    for (const opt of (page.options || [])) {
      const btn = document.createElement('div');
      btn.className = 'dialogue-opt';
      btn.textContent = opt.text;
      btn.addEventListener('click', () => {
        if (opt.combat) {
          this.closeDialogue();
          game.startCombat(npc);
          return;
        }
        if (opt.flee) {
          this.closeDialogue();
          game.ui.log('You back away cautiously.', 'game');
          return;
        }
        if (opt.next === null) {
          this.closeDialogue();
          return;
        }
        // Find page by id
        const nextPage = npc.def.dialogue.find(p => p.id === opt.next);
        if (nextPage) this._renderDialoguePage(npc, nextPage, game);
        else this.closeDialogue();
      });
      optEl.appendChild(btn);
    }
  }

  closeDialogue() {
    this.dialogueBox.classList.remove('active');
  }

  // ---- Shop UI ----
  showShop(npc, player) {
    // Reuse dialogue box as a shop
    const shopDef = npc.def.shop;
    if (!shopDef) return;

    const speakerEl = document.getElementById('dlg-speaker');
    const textEl    = document.getElementById('dlg-text');
    const optEl     = document.getElementById('dlg-options');
    speakerEl.textContent = npc.def.name + ' — Shop';
    textEl.textContent = `Your coins: 🪙${player.coins}`;

    optEl.innerHTML = '';
    for (const entry of shopDef.buy) {
      const def = ITEMS[entry.item];
      if (!def) continue;
      const btn = document.createElement('div');
      btn.className = 'dialogue-opt';
      btn.textContent = `Buy ${def.icon} ${def.name} — ${entry.price} coins`;
      btn.addEventListener('click', () => {
        if (player.coins < entry.price) {
          this.game.ui.log("You can't afford that, pet!", 'system');
          return;
        }
        if (player.inventoryFull()) {
          this.game.ui.log("Your inventory is full!", 'system');
          return;
        }
        player.coins -= entry.price;
        player.addItem(entry.item, 1);
        this.game.ui.log(`You buy ${def.name} for ${entry.price} coins.`, 'loot');
        this.game.ui.updateInventory(player);
        textEl.textContent = `Your coins: 🪙${player.coins}`;
      });
      optEl.appendChild(btn);
    }

    const closeBtn = document.createElement('div');
    closeBtn.className = 'dialogue-opt ctx-cancel';
    closeBtn.textContent = 'Close shop';
    closeBtn.addEventListener('click', () => this.closeDialogue());
    optEl.appendChild(closeBtn);

    this.dialogueBox.classList.add('active');
  }

  // ---- Floating damage numbers (delegated to 3D renderer sprites) ----
  showDamage(x, y, dmg, isPlayer = false) {
    // Damage numbers are now 3D sprites created in Renderer3D.showDamage()
    // This stub kept for compatibility.
  }

  // ---- Level-up flash ----
  showLevelUp(skillName, level) {
    this.log(`⭐ You've reached level ${level} in ${skillName}!`, 'skill');
    const el = document.getElementById(`skill-${skillName.toLowerCase()}`);
    if (el) {
      el.style.borderColor = '#f0d060';
      el.style.background  = '#4a3010';
      setTimeout(() => {
        el.style.borderColor = '';
        el.style.background  = '';
      }, 2000);
    }
  }
}
