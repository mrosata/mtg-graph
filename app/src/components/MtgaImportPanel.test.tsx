import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import MtgaImportPanel from './MtgaImportPanel';
import * as bridge from '../lib/mtgaScanBridge';

import healthy from '../../tests/fixtures/mtga/healthy.log?raw';

const importLibrary = vi.fn().mockResolvedValue(undefined);
const importDeck = vi.fn().mockResolvedValue('new-deck-id');

vi.mock('../stores/libraryStore', () => ({
  useLibraryStore: (sel: any) => sel({ importLibrary, owned: null }),
}));
vi.mock('../stores/deckStore', () => ({
  useDeckStore: (sel: any) => sel({ importDeck }),
}));
vi.mock('../stores/graphStore', () => ({
  useGraphStore: (sel: any) =>
    sel({
      cards: new Map([
        ['oid-a', mkCard('oid-a', 70001)],
        ['oid-b', mkCard('oid-b', 70002)],
        ['oid-c', mkCard('oid-c', 70003)],
      ]),
    }),
}));

function mkCard(oid: string, arenaId: number): any {
  return {
    oracleId: oid,
    name: oid,
    set: 'one',
    printings: ['one'],
    collectorNumber: '1',
    manaCost: null,
    cmc: 0,
    colors: [],
    colorIdentity: [],
    typeLine: 'Creature',
    types: ['Creature'],
    subtypes: [],
    supertypes: [],
    oracleText: '',
    keywords: [],
    power: null,
    toughness: null,
    rarity: 'common',
    imageUrl: '',
    printingDetails: [{ set: 'one', collectorNumber: '1', arenaId }],
    tags: [],
  };
}

function fileFrom(text: string) {
  return new File([text], 'Player.log', { type: 'text/plain' });
}

describe('MtgaImportPanel (full mode)', () => {
  beforeEach(() => {
    importLibrary.mockClear();
    importDeck.mockClear();
  });

  it('library-only path: imports library, no decks', async () => {
    const onClose = vi.fn();
    render(<MtgaImportPanel mode="full" onClose={onClose} />);

    const fileInput = screen.getByLabelText(/Choose Player\.log/i);
    fireEvent.change(fileInput, { target: { files: [fileFrom(healthy)] } });

    await waitFor(() =>
      expect(screen.getByText(/Imported.*cards/i)).toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: /Import library/i }));

    await waitFor(() => expect(importLibrary).toHaveBeenCalledTimes(1));
    expect(importDeck).not.toHaveBeenCalled();
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('library + decks path: opt-in checkbox -> checklist -> imports selected decks', async () => {
    const onClose = vi.fn();
    render(<MtgaImportPanel mode="full" onClose={onClose} />);

    fireEvent.change(screen.getByLabelText(/Choose Player\.log/i), {
      target: { files: [fileFrom(healthy)] },
    });
    await waitFor(() => screen.getByText(/Imported.*cards/i));

    fireEvent.click(screen.getByLabelText(/Also import my MTGA decks/i));
    await waitFor(() => screen.getByText('Mono-Red Aggro'));
    fireEvent.click(screen.getByLabelText('Mono-Red Aggro'));
    fireEvent.click(
      screen.getByRole('button', { name: /Import library \+ 1 deck/i }),
    );

    await waitFor(() => expect(importLibrary).toHaveBeenCalled());
    expect(importDeck).toHaveBeenCalledTimes(1);
    expect(importDeck.mock.calls[0]![0]).toBe('Mono-Red Aggro');
  });

  it('shows an error when the file contains neither event', async () => {
    render(<MtgaImportPanel mode="full" onClose={() => {}} />);
    fireEvent.change(screen.getByLabelText(/Choose Player\.log/i), {
      target: { files: [new File(['[Authenticate] hello\n'], 'Player.log')] },
    });
    await waitFor(() =>
      expect(
        screen.getByText(/Neither a collection snapshot nor decks/i),
      ).toBeInTheDocument(),
    );
  });
});

describe('MtgaImportPanel (decks-only mode)', () => {
  beforeEach(() => {
    importLibrary.mockClear();
    importDeck.mockClear();
  });

  it('decks-only path: shows checklist, imports selected decks, does NOT import library', async () => {
    const onClose = vi.fn();
    render(<MtgaImportPanel mode="decks-only" onClose={onClose} />);
    fireEvent.change(screen.getByLabelText(/Choose Player\.log/i), {
      target: { files: [fileFrom(healthy)] },
    });
    await waitFor(() => screen.getByText('Mono-Red Aggro'));

    fireEvent.click(screen.getByLabelText('Mono-Red Aggro'));
    fireEvent.click(screen.getByRole('button', { name: /Import 1 deck/i }));

    await waitFor(() => expect(importDeck).toHaveBeenCalledTimes(1));
    expect(importLibrary).not.toHaveBeenCalled();
  });

  it('cross-section banner: opting in also calls importLibrary', async () => {
    render(<MtgaImportPanel mode="decks-only" onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Choose Player\.log/i), {
      target: { files: [fileFrom(healthy)] },
    });
    await waitFor(() => screen.getByText('Mono-Red Aggro'));

    fireEvent.click(screen.getByLabelText(/also contains your collection/i));
    fireEvent.click(screen.getByLabelText('Mono-Red Aggro'));
    fireEvent.click(screen.getByRole('button', { name: /Import library \+ 1 deck/i }));

    await waitFor(() => expect(importLibrary).toHaveBeenCalled());
    expect(importDeck).toHaveBeenCalledTimes(1);
  });

  it('does NOT show source selector in decks-only mode', () => {
    render(<MtgaImportPanel mode="decks-only" onClose={vi.fn()} />);
    expect(screen.queryByRole('tab', { name: /Collection JSON/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /Player\.log/i })).not.toBeInTheDocument();
  });
});

describe('MtgaImportPanel (JSON source)', () => {
  beforeEach(() => {
    importLibrary.mockClear();
    importDeck.mockClear();
  });

  it('renders source selector in full mode and defaults to Player.log', () => {
    render(<MtgaImportPanel mode="full" onClose={vi.fn()} />);
    expect(screen.getByRole('tab', { name: /Player\.log/i })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: /Collection JSON/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Choose Player\.log/i)).toBeInTheDocument();
  });

  it('switching to JSON source changes the file picker label', () => {
    render(<MtgaImportPanel mode="full" onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('tab', { name: /Collection JSON/i }));
    expect(screen.getByLabelText(/Choose collection JSON/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Choose Player\.log/i)).not.toBeInTheDocument();
  });

  it('JSON path: parses, resolves via name lookup, imports library', async () => {
    const onClose = vi.fn();
    render(<MtgaImportPanel mode="full" onClose={onClose} />);
    fireEvent.click(screen.getByRole('tab', { name: /Collection JSON/i }));

    const jsonText = JSON.stringify([
      { count: 4, name: 'oid-a', set: 'ONE', cn: '1' },
      { count: 2, name: 'oid-b', set: 'ONE', cn: '2' },
    ]);
    const file = new File([jsonText], 'mtga_collection.json', { type: 'application/json' });
    fireEvent.change(screen.getByLabelText(/Choose collection JSON/i), { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText(/Imported 2 cards/i)).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: /Import library/i }));
    await waitFor(() => expect(importLibrary).toHaveBeenCalledTimes(1));
    expect(importDeck).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('JSON path: shows error on malformed JSON', async () => {
    render(<MtgaImportPanel mode="full" onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('tab', { name: /Collection JSON/i }));

    const file = new File(['not json {'], 'mtga_collection.json', { type: 'application/json' });
    fireEvent.change(screen.getByLabelText(/Choose collection JSON/i), { target: { files: [file] } });

    await waitFor(() =>
      expect(screen.getByText(/Invalid JSON/i)).toBeInTheDocument(),
    );
  });

  it('JSON path: shows error when JSON is not an array', async () => {
    render(<MtgaImportPanel mode="full" onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('tab', { name: /Collection JSON/i }));

    const file = new File(['{"foo":1}'], 'mtga_collection.json', { type: 'application/json' });
    fireEvent.change(screen.getByLabelText(/Choose collection JSON/i), { target: { files: [file] } });

    await waitFor(() =>
      expect(screen.getByText(/top-level value must be a JSON array/i)).toBeInTheDocument(),
    );
  });
});

describe('MtgaImportPanel (Live scan source)', () => {
  beforeEach(() => {
    importLibrary.mockClear();
    importDeck.mockClear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const healthyHealth = {
    online: true,
    version: 2,
    running_as_root: true,
    arena_process_found: true,
    card_db_ready: true,
  } as const;

  // Drive the anchor picker: connect, search, pick the first hit, set quantity.
  async function pickAnchor(query: string, qty: string) {
    fireEvent.click(screen.getByRole('tab', { name: /live scan/i }));
    fireEvent.click(screen.getByRole('button', { name: /connect/i }));

    // After connecting, default mode is 'deck' — switch to search mode first.
    const searchTab = await screen.findByRole('tab', { name: /Search a card/i });
    fireEvent.click(searchTab);

    const searchInput = await screen.findByPlaceholderText(/search a card you own/i);
    fireEvent.change(searchInput, { target: { value: query } });
    fireEvent.click(await screen.findByText(new RegExp(query, 'i')));
    fireEvent.change(screen.getByLabelText(/quantity/i), { target: { value: qty } });
  }

  it('scan source: connecting while engine offline shows launch card', async () => {
    vi.spyOn(bridge, 'bridgeHealth').mockResolvedValue({ online: false });
    render(<MtgaImportPanel mode="full" onClose={() => {}} />);
    fireEvent.click(screen.getByRole('tab', { name: /live scan/i }));
    fireEvent.click(screen.getByRole('button', { name: /connect/i }));
    expect(await screen.findByText(/start the exporter/i)).toBeInTheDocument();
  });

  it('scan source: connecting with no Arena process shows Collection-tab hint', async () => {
    vi.spyOn(bridge, 'bridgeHealth').mockResolvedValue({
      online: true,
      running_as_root: true,
      arena_process_found: false,
      card_db_ready: true,
    });
    render(<MtgaImportPanel mode="full" onClose={() => {}} />);
    fireEvent.click(screen.getByRole('tab', { name: /live scan/i }));
    fireEvent.click(screen.getByRole('button', { name: /connect/i }));
    expect(await screen.findByText(/Collection tab/i)).toBeInTheDocument();
  });

  it('scan source: anchor-first happy path imports library', async () => {
    vi.spyOn(bridge, 'bridgeHealth').mockResolvedValue({ ...healthyHealth });
    vi.spyOn(bridge, 'searchCards').mockResolvedValue([
      { grpId: 70001, name: 'Abrade', set: 'DMU', collectorNumber: '131' },
    ]);
    const scan = vi.spyOn(bridge, 'scanCollection').mockResolvedValue({
      status: 'ok',
      collection: [{ count: 4, name: 'Abrade', set: 'DMU', cn: '131' }],
    });
    render(<MtgaImportPanel mode="full" onClose={vi.fn()} />);

    await pickAnchor('Abrade', '4');
    fireEvent.click(screen.getByRole('button', { name: /scan my collection/i }));

    expect(await screen.findByRole('button', { name: /import library/i })).toBeInTheDocument();
    expect(scan).toHaveBeenCalledTimes(1);
    expect(scan).toHaveBeenCalledWith([{ grpId: 70001, quantity: 4 }]);
  });

  it('scan source: ambiguous prompts a second anchor, then both are scanned', async () => {
    vi.spyOn(bridge, 'bridgeHealth').mockResolvedValue({ ...healthyHealth });
    vi.spyOn(bridge, 'searchCards')
      .mockResolvedValueOnce([{ grpId: 70001, name: 'Abrade', set: 'DMU', collectorNumber: '131' }])
      .mockResolvedValueOnce([{ grpId: 70002, name: 'Sheoldred', set: 'DMU', collectorNumber: '107' }]);
    const scan = vi.spyOn(bridge, 'scanCollection')
      .mockResolvedValueOnce({ status: 'ambiguous' })
      .mockResolvedValueOnce({
        status: 'ok',
        collection: [{ count: 3, name: 'Sheoldred', set: 'DMU', cn: '107' }],
      });
    render(<MtgaImportPanel mode="full" onClose={vi.fn()} />);

    await pickAnchor('Abrade', '4');
    fireEvent.click(screen.getByRole('button', { name: /scan my collection/i }));

    expect(await screen.findByText(/add one more card you own/i)).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText(/search a card/i);
    fireEvent.change(searchInput, { target: { value: 'Sheoldred' } });
    fireEvent.click(await screen.findByText(/Sheoldred/));
    fireEvent.change(screen.getByLabelText(/quantity/i), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: /scan my collection/i }));

    expect(await screen.findByRole('button', { name: /import library/i })).toBeInTheDocument();
    expect(scan).toHaveBeenCalledTimes(2);
    expect(scan).toHaveBeenLastCalledWith([
      { grpId: 70001, quantity: 4 },
      { grpId: 70002, quantity: 3 },
    ]);
  });

  it('scan source: need_anchor also prompts for another card', async () => {
    vi.spyOn(bridge, 'bridgeHealth').mockResolvedValue({ ...healthyHealth });
    vi.spyOn(bridge, 'searchCards').mockResolvedValue([
      { grpId: 70001, name: 'Abrade', set: 'DMU', collectorNumber: '131' },
    ]);
    vi.spyOn(bridge, 'scanCollection').mockResolvedValue({ status: 'need_anchor' });
    render(<MtgaImportPanel mode="full" onClose={vi.fn()} />);

    await pickAnchor('Abrade', '4');
    fireEvent.click(screen.getByRole('button', { name: /scan my collection/i }));

    expect(await screen.findByText(/add one more card you own/i)).toBeInTheDocument();
  });

  it('scan source: not_found suggests trying a different card', async () => {
    vi.spyOn(bridge, 'bridgeHealth').mockResolvedValue({ ...healthyHealth });
    vi.spyOn(bridge, 'searchCards').mockResolvedValue([
      { grpId: 70001, name: 'Abrade', set: 'DMU', collectorNumber: '131' },
    ]);
    vi.spyOn(bridge, 'scanCollection').mockResolvedValue({ status: 'not_found' });
    render(<MtgaImportPanel mode="full" onClose={vi.fn()} />);

    await pickAnchor('Abrade', '4');
    fireEvent.click(screen.getByRole('button', { name: /scan my collection/i }));

    expect(await screen.findByText(/try a different one you own/i)).toBeInTheDocument();
  });

  it('scan source: no_process points back to the Collection tab', async () => {
    vi.spyOn(bridge, 'bridgeHealth').mockResolvedValue({ ...healthyHealth });
    vi.spyOn(bridge, 'searchCards').mockResolvedValue([
      { grpId: 70001, name: 'Abrade', set: 'DMU', collectorNumber: '131' },
    ]);
    vi.spyOn(bridge, 'scanCollection').mockResolvedValue({ status: 'no_process' });
    render(<MtgaImportPanel mode="full" onClose={vi.fn()} />);

    await pickAnchor('Abrade', '4');
    fireEvent.click(screen.getByRole('button', { name: /scan my collection/i }));

    expect(await screen.findByText(/visit the Collection tab, then scan again/i)).toBeInTheDocument();
  });
});

function connectScanTab() {
  vi.spyOn(bridge, 'bridgeHealth').mockResolvedValue({
    online: true, version: 2, running_as_root: true, arena_process_found: true, card_db_ready: true,
  });
  render(<MtgaImportPanel mode="full" onClose={() => {}} />);
  fireEvent.click(screen.getByRole('tab', { name: /Live scan/i }));
}

it('scan: warns when the bridge reports no/old version', async () => {
  vi.spyOn(bridge, 'bridgeHealth').mockResolvedValue({
    online: true, running_as_root: true, arena_process_found: true, card_db_ready: true,
  });
  render(<MtgaImportPanel mode="full" onClose={() => {}} />);
  fireEvent.click(screen.getByRole('tab', { name: /Live scan/i }));
  fireEvent.click(screen.getByRole('button', { name: /^Connect$/i }));
  expect(await screen.findByText(/out of date/i)).toBeInTheDocument();
});

it('scan: no version warning when the bridge is current', async () => {
  vi.spyOn(bridge, 'bridgeHealth').mockResolvedValue({
    online: true, version: 2, running_as_root: true, arena_process_found: true, card_db_ready: true,
  });
  render(<MtgaImportPanel mode="full" onClose={() => {}} />);
  fireEvent.click(screen.getByRole('tab', { name: /Live scan/i }));
  fireEvent.click(screen.getByRole('button', { name: /^Connect$/i }));
  await screen.findByRole('button', { name: /Find my collection/i });
  expect(screen.queryByText(/out of date/i)).not.toBeInTheDocument();
});

it('scan deck mode: paste deck → ok → summary with matched count', async () => {
  connectScanTab();
  fireEvent.click(screen.getByRole('button', { name: /^Connect$/i }));
  await screen.findByRole('button', { name: /Find my collection/i }); // deck is the default mode
  fireEvent.change(screen.getByPlaceholderText(/Export.*paste/i), {
    target: { value: 'Deck\n4 Abrade (DMU) 131\n' },
  });
  const spy = vi.spyOn(bridge, 'scanDeck').mockResolvedValue({
    status: 'ok', collection: [{ count: 4, name: 'Abrade', set: 'DMU', cn: '131' }], matched: 21, total: 24,
  });
  fireEvent.click(screen.getByRole('button', { name: /Find my collection/i }));
  expect(await screen.findByText(/matched 21 of 24/i)).toBeInTheDocument();
  expect(spy).toHaveBeenCalledWith([{ name: 'Abrade', count: 4 }]);
});

it('scan deck mode: inconclusive shows fallback message', async () => {
  connectScanTab();
  fireEvent.click(screen.getByRole('button', { name: /^Connect$/i }));
  await screen.findByRole('button', { name: /Find my collection/i });
  fireEvent.change(screen.getByPlaceholderText(/Export.*paste/i), { target: { value: 'Deck\n2 Llanowar Elves (DMU) 168\n' } });
  vi.spyOn(bridge, 'scanDeck').mockResolvedValue({ status: 'inconclusive', matched: 3, total: 12 });
  fireEvent.click(screen.getByRole('button', { name: /Find my collection/i }));
  expect(await screen.findByText(/couldn't pin it down|search a card/i)).toBeInTheDocument();
});

it('scan deck mode: empty paste is rejected without a bridge call', async () => {
  connectScanTab();
  fireEvent.click(screen.getByRole('button', { name: /^Connect$/i }));
  await screen.findByRole('button', { name: /Find my collection/i });
  const spy = vi.spyOn(bridge, 'scanDeck');
  fireEvent.click(screen.getByRole('button', { name: /Find my collection/i }));
  expect(await screen.findByText(/doesn't look like an Arena deck/i)).toBeInTheDocument();
  expect(spy).not.toHaveBeenCalled();
});
