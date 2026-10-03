import { SKILL_TREE } from '../systems/ProgressionSystem';
import { SKILL_NODES } from '../config/skillTree';
import { profileManager } from '../systems/ProfileManager';
import { BASE_DISCOVERY_IDS, getArcadeDiscovery, getBaseDiscovery, getCustomDiscovery, isCareerDiscoveryAvailableInMode, type DiscoveryCard, type DiscoveryMode } from './DiscoveryCatalog';
import { DiscoveryCardView } from './DiscoveryPreview';

const BASE_IDS = BASE_DISCOVERY_IDS;

/** A presentation queue only. Gameplay clocks and state remain owned by Game. */
export class DiscoveryManager {
  private readonly view = new DiscoveryCardView();
  private readonly modal = document.getElementById('skill-discovery-modal')!;
  private readonly dismissButton = document.getElementById('discovery-dismiss') as HTMLButtonElement;
  private readonly library = document.createElement('select');
  private readonly labButton = document.createElement('button');
  private readonly cards = new Map<string, DiscoveryCard>();
  private active: DiscoveryCard | null = null;
  private reviewing = false;
  private previousFocus: HTMLElement | null = null;
  private gamepadReady = false;

  constructor(private onOpen: () => void, private onClose: () => void, private onLab: (type: string) => void) {
    for (const mode of ['arcade', 'custom'] as const) {
      for (const skill of SKILL_TREE) this.register(getArcadeDiscovery(skill, mode));
      for (const id of BASE_IDS) this.register(getBaseDiscovery(id, mode));
    }
    for (const skill of SKILL_NODES) {
      for (let rank = 1; rank <= skill.maxRank; rank++) this.register(getCustomDiscovery(skill.id, rank));
    }
    this.library.id = 'discovery-library';
    this.library.setAttribute('aria-label', 'Review an unlocked discovery');
    this.library.style.cssText = 'display:none;width:100%;max-width:100%;padding:8px;background:#101629;color:#e5faff;border:1px solid #00aabc;border-radius:6px;font:inherit;';
    this.dismissButton.before(this.library);
    this.library.addEventListener('change', () => {
      const card = this.cards.get(this.library.value);
      if (card) this.present(card, true);
    });
    this.labButton.id = 'discovery-lab';
    this.labButton.textContent = 'Try in Lab';
    this.labButton.style.cssText = 'display:none;padding:10px 16px;border:1px solid #00ffff;border-radius:6px;background:#102638;color:#bfffff;cursor:pointer;font:inherit;';
    this.dismissButton.before(this.labButton);
    this.labButton.addEventListener('click', () => {
      if (!this.active) return;
      const skill = SKILL_TREE.find(s => getArcadeDiscovery(s, this.active!.mode).id === this.active!.id);
      if (!skill) return;
      this.close();
      this.onLab(skill.baseId);
    });
    this.dismissButton.addEventListener('click', () => this.dismiss());
    this.modal.addEventListener('keydown', event => {
      event.stopPropagation();
      if (event.key === 'Escape' || ((event.key === 'Enter' || event.key === ' ') && event.target !== this.library && event.target !== this.labButton)) {
        event.preventDefault();
        if (!event.repeat) this.dismiss();
      } else if (event.key === 'Tab') {
        const focusable = [...this.modal.querySelectorAll<HTMLElement>('button, select')].filter(el => !el.hidden && el.style.display !== 'none');
        const index = focusable.indexOf(document.activeElement as HTMLElement);
        event.preventDefault();
        focusable[(index + (event.shiftKey ? -1 : 1) + focusable.length) % focusable.length]?.focus();
      }
    });
  }

  private register(card: DiscoveryCard | null) {
    if (card) this.cards.set(card.id, card);
  }

  public get isOpen(): boolean { return this.active !== null; }

  public enqueue(card: DiscoveryCard | null) {
    if (!card || profileManager.isSkillDiscovered(card.id)) return;
    const careerSkill = SKILL_TREE.find(skill => card.id === `${card.mode}:${skill.id}`);
    if (careerSkill && !isCareerDiscoveryAvailableInMode(careerSkill, card.mode)) return;
    // Original releases stored the five Chromamancer cards under bare combo IDs.
    const legacyIds: Record<string, string> = {
      'custom:wiggle_v1': 'wiggle', 'custom:nitro_v1': 'nitro',
      'custom:emp_overcharge:rank:1': 'wiggle', 'custom:hyper_nitro:rank:1': 'nitro',
      'custom:quantum_laser:rank:1': 'quantum_laser',
      'custom:kinetic_bastion:rank:1': 'kinetic_bastion',
      'custom:singularity_nova:rank:1': 'singularity_nova'
    };
    if (legacyIds[card.id] && profileManager.isSkillDiscovered(legacyIds[card.id])) return;
    this.register(card);
    const pending = profileManager.profile.pendingDiscoveries ||= [];
    if (!pending.includes(card.id)) {
      pending.push(card.id);
      profileManager.saveProfile();
    }
  }

  /** Call only at a frame boundary after gameplay events have finished. */
  public update(mode: DiscoveryMode, canPresent: boolean) {
    if (!canPresent || this.isOpen) return;
    const next = (profileManager.profile.pendingDiscoveries || [])
      .map(id => this.cards.get(id))
      .find(card => card?.mode === mode && !profileManager.isSkillDiscovered(card.id));
    if (next) this.present(next, false);
  }

  public available(mode: DiscoveryMode): DiscoveryCard[] {
    const cards: DiscoveryCard[] = [];
    for (const skill of SKILL_TREE) {
      if (profileManager.profile.careerGhosts >= skill.threshold && isCareerDiscoveryAvailableInMode(skill, mode)) cards.push(getArcadeDiscovery(skill, mode));
    }
    if (mode === 'custom') {
      for (const skill of SKILL_NODES) {
        const rank = profileManager.profile.skillUpgrades?.[skill.id] || 0;
        for (let r = 1; r <= rank; r++) {
          const card = getCustomDiscovery(skill.id, r);
          if (card) cards.push(card);
        }
      }
    }
    for (const id of BASE_IDS) {
      const card = getBaseDiscovery(id, mode);
      if (id === 'power_pellet' || profileManager.isSkillDiscovered(card.id) || profileManager.profile.pendingDiscoveries?.includes(card.id)) cards.push(card);
    }
    return cards;
  }

  public review(mode: DiscoveryMode, preferredId?: string) {
    if (this.isOpen) return;
    const cards = this.available(mode);
    this.library.replaceChildren();
    for (const card of cards) {
      this.register(card);
      const option = new Option(`${card.title} — ${card.unlockLabel}`, card.id);
      this.library.add(option);
    }
    const first = cards.find(card => card.id === preferredId) || cards[0];
    if (first) this.present(first, true);
  }

  /** UI-only controller navigation, with a release between every action. */
  public pollGamepad() {
    if (!this.active) return;
    const pad = [...(navigator.getGamepads?.() || [])].find(pad => pad?.connected);
    if (!pad) return;
    const pressed = (index: number) => pad.buttons[index]?.pressed;
    const neutral = !pad.buttons.some(button => button.pressed) && pad.axes.every(axis => Math.abs(axis) < .45);
    if (neutral) { this.gamepadReady = true; return; }
    if (!this.gamepadReady) return;
    this.gamepadReady = false;
    if (pressed(0) || pressed(1)) this.dismiss();
    else if (this.reviewing && (pressed(14) || pressed(15) || Math.abs(pad.axes[0] || 0) >= .45)) {
      const direction = pressed(14) || pad.axes[0] < -.45 ? -1 : 1;
      this.library.selectedIndex = (this.library.selectedIndex + direction + this.library.options.length) % this.library.options.length;
      const card = this.cards.get(this.library.value);
      if (card) this.present(card, true);
    }
  }

  private present(card: DiscoveryCard, reviewing: boolean) {
    if (!this.active) this.previousFocus = document.activeElement as HTMLElement;
    this.active = card;
    this.reviewing = reviewing;
    this.gamepadReady = false;
    this.onOpen();
    this.modal.style.display = 'flex';
    this.view.show(card);
    this.library.style.display = reviewing ? 'block' : 'none';
    this.library.value = card.id;
    const labSkill = SKILL_TREE.find(s => getArcadeDiscovery(s, card.mode).id === card.id && s.category === 'item' && ['nova', 'overdrive', 'vortex', 'super_pellet', 'laser', 'cryo', 'tsunami'].includes(s.baseId));
    this.labButton.style.display = reviewing && card.mode === 'arcade' && labSkill ? 'inline-block' : 'none';
    this.dismissButton.textContent = reviewing ? 'Back' : 'Continue';
    this.dismissButton.focus({ preventScroll: true });
  }

  private dismiss() {
    if (!this.active) return;
    if (!this.reviewing) {
      const id = this.active.id;
      const seen = profileManager.profile.discoveredSkills ||= [];
      if (!seen.includes(id)) seen.push(id);
      profileManager.profile.pendingDiscoveries = (profileManager.profile.pendingDiscoveries || []).filter(pending => pending !== id);
      profileManager.saveProfile();
      const next = profileManager.profile.pendingDiscoveries.map(id => this.cards.get(id)).find(card => card?.mode === this.active!.mode && !profileManager.isSkillDiscovered(card.id));
      if (next) {
        this.present(next, false);
        return;
      }
    }
    this.close();
  }

  private close() {
    this.view.stop();
    this.active = null;
    this.modal.style.display = 'none';
    this.onClose();
    if (this.previousFocus?.isConnected && this.previousFocus !== document.body) this.previousFocus.focus({ preventScroll: true });
    else document.getElementById('c')?.focus({ preventScroll: true });
    this.previousFocus = null;
  }
}
