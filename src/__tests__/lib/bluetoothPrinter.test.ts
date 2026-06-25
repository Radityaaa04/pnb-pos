import { describe, it, expect } from 'vitest';
import { EscPosBuilder } from '@/lib/bluetoothPrinter';

const ESC = 0x1B;
const GS = 0x1D;

describe('EscPosBuilder', () => {
  describe('init', () => {
    it('adds ESC @ reset command', () => {
      const builder = new EscPosBuilder();
      const data = builder.init().build();
      expect(data[0]).toBe(ESC);
      expect(data[1]).toBe(0x40);
    });
  });

  describe('text alignment', () => {
    it('alignLeft adds ESC a 0', () => {
      const data = new EscPosBuilder().alignLeft().build();
      expect(Array.from(data)).toEqual([ESC, 0x61, 0x00]);
    });

    it('alignCenter adds ESC a 1', () => {
      const data = new EscPosBuilder().alignCenter().build();
      expect(Array.from(data)).toEqual([ESC, 0x61, 0x01]);
    });

    it('alignRight adds ESC a 2', () => {
      const data = new EscPosBuilder().alignRight().build();
      expect(Array.from(data)).toEqual([ESC, 0x61, 0x02]);
    });
  });

  describe('bold', () => {
    it('enables bold with ESC E 1', () => {
      const data = new EscPosBuilder().bold(true).build();
      expect(Array.from(data)).toEqual([ESC, 0x45, 1]);
    });

    it('disables bold with ESC E 0', () => {
      const data = new EscPosBuilder().bold(false).build();
      expect(Array.from(data)).toEqual([ESC, 0x45, 0]);
    });
  });

  describe('textSize', () => {
    it('sets text size with GS ! n', () => {
      const data = new EscPosBuilder().textSize(2, 3).build();
      // n = ((2-1) << 4) | (3-1) = (1 << 4) | 2 = 16 | 2 = 18
      expect(Array.from(data)).toEqual([GS, 0x21, 18]);
    });

    it('handles size 1x1 (default)', () => {
      const data = new EscPosBuilder().textSize(1, 1).build();
      // n = ((1-1) << 4) | (1-1) = 0
      expect(Array.from(data)).toEqual([GS, 0x21, 0]);
    });
  });

  describe('text and textLine', () => {
    it('encodes text as char codes', () => {
      const data = new EscPosBuilder().text('Hi').build();
      expect(data[0]).toBe('H'.charCodeAt(0));
      expect(data[1]).toBe('i'.charCodeAt(0));
    });

    it('textLine appends newline after text', () => {
      const data = new EscPosBuilder().textLine('A').build();
      expect(data[0]).toBe('A'.charCodeAt(0));
      expect(data[1]).toBe(0x0A); // newline
    });
  });

  describe('newline', () => {
    it('adds single newline by default', () => {
      const data = new EscPosBuilder().newline().build();
      expect(Array.from(data)).toEqual([0x0A]);
    });

    it('adds multiple newlines', () => {
      const data = new EscPosBuilder().newline(3).build();
      expect(Array.from(data)).toEqual([0x0A, 0x0A, 0x0A]);
    });
  });

  describe('drawLine', () => {
    it('draws a line of dashes with default length 32', () => {
      const data = new EscPosBuilder().drawLine().build();
      const dashes = '-'.repeat(32);
      const expected = [...dashes.split('').map(c => c.charCodeAt(0)), 0x0A];
      expect(Array.from(data)).toEqual(expected);
    });

    it('draws a line with custom character and length', () => {
      const data = new EscPosBuilder().drawLine('=', 5).build();
      const expected = [...'====='.split('').map(c => c.charCodeAt(0)), 0x0A];
      expect(Array.from(data)).toEqual(expected);
    });
  });

  describe('cut', () => {
    it('adds GS V A 0 cut command', () => {
      const data = new EscPosBuilder().cut().build();
      expect(Array.from(data)).toEqual([GS, 0x56, 0x41, 0x00]);
    });
  });

  describe('build', () => {
    it('returns a Uint8Array', () => {
      const data = new EscPosBuilder().init().build();
      expect(data).toBeInstanceOf(Uint8Array);
    });

    it('chains multiple operations correctly', () => {
      const data = new EscPosBuilder()
        .init()
        .alignCenter()
        .bold(true)
        .text('X')
        .bold(false)
        .build();

      const expected = [
        ESC, 0x40,        // init
        ESC, 0x61, 0x01,  // alignCenter
        ESC, 0x45, 1,     // bold on
        'X'.charCodeAt(0),// text
        ESC, 0x45, 0,     // bold off
      ];
      expect(Array.from(data)).toEqual(expected);
    });
  });
});
