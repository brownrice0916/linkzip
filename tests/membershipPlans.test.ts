import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BETA_LIFETIME_PREMIUM_GRANT,
  MEMBERSHIP_PLANS,
  membershipCheckoutAmount,
  resolveActiveMembershipPlan,
  validateWorkspacesForPlan,
  workspaceUsage,
} from '../src/domain/membershipPlans.ts';

test('uses ten monthly payments for a twelve month pass', () => {
  const standard = MEMBERSHIP_PLANS.find((plan) => plan.id === 'standard')!;
  assert.equal(membershipCheckoutAmount(standard, 'annual'), 39_000);
});

test('downgrades an expired paid membership to basic', () => {
  assert.equal(resolveActiveMembershipPlan('premium', '2026-07-30T00:00:00.000Z', Date.parse('2026-07-29T00:00:00.000Z')), 'premium');
  assert.equal(resolveActiveMembershipPlan('premium', '2026-07-28T00:00:00.000Z', Date.parse('2026-07-29T00:00:00.000Z')), 'basic');
  assert.equal(resolveActiveMembershipPlan('standard', null), 'basic');
});

test('keeps beta lifetime premium active without an end date', () => {
  assert.equal(
    resolveActiveMembershipPlan('premium', null, Date.now(), BETA_LIFETIME_PREMIUM_GRANT),
    'premium',
  );
});

test('counts nested blocks and products', () => {
  assert.deepEqual(workspaceUsage({
    customLinks: [{
      type: 'collection',
      links: [{type: 'file'}, {type: 'sales', salesConfig: {products: [{}, {}]}}],
    }],
  }), {blocks: 3, sharedFileBlocks: 1, customerForms: 0, products: 2});
});

test('blocks new overages but preserves downgraded data', () => {
  const existing = [{id: 'one'}, {id: 'two'}];
  assert.equal(validateWorkspacesForPlan(existing, 'basic', existing), null);
  assert.match(validateWorkspacesForPlan([...existing, {id: 'three'}], 'basic', existing) || '', /최대 1개/);
  assert.match(validateWorkspacesForPlan([{id: 'one', customLinks: [{type: 'customer_info'}]}], 'basic') || '', /스탠다드/);
});

test('does not limit the number of content blocks on any plan', () => {
  const manyBlocks = Array.from({ length: 600 }, (_, index) => ({ id: `block-${index}`, type: 'link' }));
  assert.equal(validateWorkspacesForPlan([{ id: 'one', customLinks: manyBlocks }], 'basic'), null);
});

test('does not limit products or Instagram DM automation by plan', () => {
  const products = Array.from({ length: 200 }, () => ({}));
  assert.equal(validateWorkspacesForPlan([{
    id: 'one',
    customLinks: [{ type: 'sales', salesConfig: { products } }],
  }], 'basic'), null);
});

test('previews advanced themes but prevents a new basic-plan save', () => {
  const basicTheme = [{id: 'one', templateType: 'preset', templateValue: 'minimalist'}];
  const advancedTheme = [{id: 'one', templateType: 'preset', templateValue: 'neo-pop'}];
  assert.match(validateWorkspacesForPlan(advancedTheme, 'basic', basicTheme) || '', /고급 테마/);
  assert.equal(validateWorkspacesForPlan(advancedTheme, 'standard', basicTheme), null);
  assert.equal(validateWorkspacesForPlan(advancedTheme, 'basic', advancedTheme), null);
});

test('keeps the onboarding themes through Bloom available on the basic plan', () => {
  const saved = [{id: 'one', templateType: 'preset', templateValue: 'minimalist'}];
  for (const templateValue of ['minimalist', 'neon-dark', 'soft-gradient', 'air', 'blocks', 'bloom']) {
    assert.equal(validateWorkspacesForPlan([{id: 'one', templateType: 'preset', templateValue}], 'basic', saved), null);
  }
});

test('keeps Pretendard and Inter free but gates newly selected premium fonts', () => {
  const saved = [{id: 'one', design: {fontFamily: 'Inter', titleFontFamily: ''}}];
  assert.equal(validateWorkspacesForPlan([{id: 'one', design: {fontFamily: 'Pretendard', titleFontFamily: ''}}], 'basic', saved), null);
  assert.match(validateWorkspacesForPlan([{id: 'one', design: {fontFamily: 'Lora', titleFontFamily: ''}}], 'basic', saved) || '', /고급 글꼴/);
  assert.equal(validateWorkspacesForPlan([{id: 'one', design: {fontFamily: 'Lora', titleFontFamily: ''}}], 'standard', saved), null);
});

test('previews uploaded backgrounds but only saves new ones on paid plans', () => {
  const previous = [{id: 'one', design: {fontFamily: 'Inter'}}];
  const withBackground = [{id: 'one', design: {fontFamily: 'Inter', backgroundImageUrl: 'https://example.com/background.webp'}}];

  assert.match(validateWorkspacesForPlan(withBackground, 'basic', previous) || '', /배경 이미지/);
  assert.equal(validateWorkspacesForPlan(withBackground, 'standard', previous), null);
  assert.equal(validateWorkspacesForPlan(withBackground, 'premium', previous), null);
  assert.equal(validateWorkspacesForPlan(withBackground, 'basic', withBackground), null);
});

test('allows multiple static stickers but gates newly added animated stickers', () => {
  const staticStickers = [{
    id: 'one',
    design: {stickers: [
      {value: '🌸', animated: false},
      {value: '✨', animated: false},
      {value: '👑', animated: false},
    ]},
  }];
  const animatedStickers = [{
    id: 'one',
    design: {stickers: [
      ...staticStickers[0].design.stickers,
      {value: 'https://example.com/animated.gif', animated: true},
    ]},
  }];

  assert.equal(validateWorkspacesForPlan(staticStickers, 'basic'), null);
  assert.match(validateWorkspacesForPlan(animatedStickers, 'basic', staticStickers) || '', /움직이는 스티커/);
  assert.equal(validateWorkspacesForPlan(animatedStickers, 'standard', staticStickers), null);
  assert.equal(validateWorkspacesForPlan(animatedStickers, 'basic', animatedStickers), null);
});

test('applies sticker limits per membership plan', () => {
  const workspaceWith = (staticCount: number, animatedCount: number) => [{
    id: 'one',
    design: {stickers: [
      ...Array.from({length: staticCount}, (_, index) => ({value: `static-${index}`, animated: false})),
      ...Array.from({length: animatedCount}, (_, index) => ({value: `animated-${index}`, animated: true})),
    ]},
  }];

  assert.equal(validateWorkspacesForPlan(workspaceWith(10, 0), 'basic'), null);
  assert.match(validateWorkspacesForPlan(workspaceWith(11, 0), 'basic') || '', /최대 10개/);
  assert.equal(validateWorkspacesForPlan(workspaceWith(7, 3), 'standard'), null);
  assert.match(validateWorkspacesForPlan(workspaceWith(6, 4), 'standard') || '', /최대 3개/);
  assert.equal(validateWorkspacesForPlan(workspaceWith(10, 5), 'premium'), null);
  assert.match(validateWorkspacesForPlan(workspaceWith(9, 6), 'premium') || '', /최대 5개/);
});
