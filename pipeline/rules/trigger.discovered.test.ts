import { describe, it, expect } from 'vitest';
import { rule } from './trigger.discovered';

describe('trigger.discovered', () => {
  it.each([
    // Curator of Sun's Creation
    ['whenever you discover, discover again for the same value.'],
    // Hypothetical alt: "when you discover" (single-shot triggered ability)
    ['when you discover, draw a card.'],
    // Plural / creature-controlled-discovers variants — keep regex tight to "you"/"a player"
    ['whenever a player discovers, that player gains 1 life.'],
  ])('matches: %s', (text) => {
    expect(rule.match!(text)).toBeTruthy();
  });

  it.each([
    // The action side ("you discover N", a positive number) is NOT a trigger.
    // The trigger only fires on the bare "discover" verb in a "when/whenever ... discover" frame.
    ['at the beginning of your end step, discover 5.'],
    // Unrelated
    ['draw a card.'],
    // Flavor verb usage
    ['they discovered new lands.'],
    // self-discover action (no when/whenever)
    ['__self__ discovers 3.'],
  ])('does not match: %s', (text) => {
    expect(rule.match!(text)).toBe(false);
  });
});
