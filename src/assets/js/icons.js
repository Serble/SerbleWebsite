// The app's icon set and its stroke rule. Rendered by components/Icon.vue.

/**
 * The app's icon set. Every icon in the app goes through here; add new ones to ICONS rather than
 * inlining <svg> blocks in pages.
 *
 * Icons are strokes on a 24x24 grid, drawn so the ink's bounding box is centred on (12, 12) and
 * spans roughly 3..21. That keeps them visually centred in buttons and makes a spinning icon turn
 * about its own middle. The stroke width is worked out from the rendered size so a line is about
 * the same on-screen weight at any size: never thinner than 1.6px, getting heavier for large
 * decorative icons (see strokeFor).
 *
 * An entry is either a list of path data (stroked), or { fill, viewBox } for the few solid brand
 * marks that cannot be drawn as strokes.
 */
export const ICONS = {
  check: ['M4.5 12.5 9.5 17.5 19.5 6.5'],
  close: ['M6 6 18 18', 'M18 6 6 18'],
  plus: ['M12 5v14', 'M5 12h14'],
  dash: ['M5 12h14'],
  chevronDown: ['M6 9l6 6 6-6'],
  chevronLeft: ['M15 6l-6 6 6 6'],
  chevronRight: ['M9 6l6 6-6 6'],
  arrowLeft: ['M19 12H5', 'M11 6l-6 6 6 6'],
  arrowRight: ['M5 12h14', 'M13 6l6 6-6 6'],
  arrowDown: ['M12 5v14', 'M6 13l6 6 6-6'],
  arrowUpRight: ['M7 17 17 7', 'M8 7h9v9'],
  arrowDownLeft: ['M17 7 7 17', 'M16 17H7V8'],
  arrowSwap: ['M4 8h15', 'M15 4l4 4-4 4', 'M20 16H5', 'M9 12l-4 4 4 4'],
  alert: ['M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z', 'M12 7.5V13', 'M12 16.5h.01'],
  warning: ['M12 3.5 21.5 20.5h-19z', 'M12 9.5V14', 'M12 17.2h.01'],
  checkCircle: ['M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z', 'M8 12.5l3 3 5-6'],
  closeCircle: ['M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z', 'M9 9l6 6', 'M15 9l-6 6'],
  plusCircle: ['M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z', 'M12 8v8', 'M8 12h8'],
  history: ['M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18z', 'M12 7.5V12l3 2'],
  lock: ['M7 10.5h10a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2z', 'M8 10.5v-3a4 4 0 0 1 8 0v3'],
  person: ['M12 3.5a4 4 0 1 1 0 8 4 4 0 0 1 0-8z', 'M4.5 20.5a7.5 6 0 0 1 15 0'],
  pencil: ['M16.5 3.5l4 4L9 19l-5.5 1.5L5 15z', 'M14 6l4 4'],
  trash: ['M4 6.5h16', 'M9.5 6.5v-2a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2', 'M6 6.5l1 12.5a1.5 1.5 0 0 0 1.5 1.5h7a1.5 1.5 0 0 0 1.5-1.5l1-12.5', 'M10 10.5v6', 'M14 10.5v6'],
  copy: ['M10.5 8.5h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2z', 'M15.5 8.5v-3a2 2 0 0 0-2-2h-8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h3'],
  send: ['M21 3 10.5 13.5', 'M21 3l-6.5 18-4-7.5L3 9.5z'],
  trophy: ['M7 3.5h10V9a5 5 0 0 1-10 0z', 'M7 5.5H4V7a3 3 0 0 0 3 3', 'M17 5.5h3V7a3 3 0 0 1-3 3', 'M12 14v6.5', 'M8.5 20.5h7'],
  refresh: ['M20 12.5a8 8 0 1 1-2.34-5.66', 'M17.66 3.34v3.5h-3.5'],
  home: ['M4 10 12 3.5 20 10v9.5a1 1 0 0 1-1 1h-4v-6H9v6H5a1 1 0 0 1-1-1z'],
  mail: ['M5 5.5h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z', 'M3.5 7.5 12 13l8.5-5.5'],
  headset: ['M4 15v-3.5a8 8 0 0 1 16 0V15', 'M4.5 12.5H7v6H4.5A1.5 1.5 0 0 1 3 17v-3a1.5 1.5 0 0 1 1.5-1.5z', 'M19.5 12.5H17v6h2.5A1.5 1.5 0 0 0 21 17v-3a1.5 1.5 0 0 0-1.5-1.5z', 'M19 18.5v.5a1.5 1.5 0 0 1-1.5 1.5H14'],
  box: ['M12 3l8.5 4.5v9L12 21l-8.5-4.5v-9z', 'M3.5 7.5 12 12l8.5-4.5', 'M12 12v9'],
  cart: ['M3.5 3.5h2.2l2.2 10.5a1.5 1.5 0 0 0 1.5 1.2h8a1.5 1.5 0 0 0 1.5-1.2L20.5 7.5H6.5', 'M9.5 18a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5z', 'M17 18a1.25 1.25 0 1 1 0 2.5 1.25 1.25 0 0 1 0-2.5z'],
  creditCard: ['M4.5 5.5h15a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2z', 'M2.5 10h19', 'M6 14.5h4'],
  gift: ['M4.5 8h15a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z', 'M5 12v7.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V12', 'M12 8v12.5', 'M12 8C11 4 7 2.2 7 5c0 1.8 2 3 5 3', 'M12 8c1-4 5-5.8 5-3 0 1.8-2 3-5 3'],
  hash: ['M9.5 3.5l-2 17', 'M16.5 3.5l-2 17', 'M4 8.5h16.5', 'M3.5 15.5H20'],
  menu: ['M4 7h16', 'M4 12h16', 'M4 17h16'],
  grid: ['M5.5 4h3.5A1.5 1.5 0 0 1 10.5 5.5V9A1.5 1.5 0 0 1 9 10.5H5.5A1.5 1.5 0 0 1 4 9V5.5A1.5 1.5 0 0 1 5.5 4z', 'M15 4h3.5A1.5 1.5 0 0 1 20 5.5V9a1.5 1.5 0 0 1-1.5 1.5H15A1.5 1.5 0 0 1 13.5 9V5.5A1.5 1.5 0 0 1 15 4z', 'M5.5 13.5h3.5a1.5 1.5 0 0 1 1.5 1.5v3.5A1.5 1.5 0 0 1 9 20H5.5A1.5 1.5 0 0 1 4 18.5V15a1.5 1.5 0 0 1 1.5-1.5z', 'M15 13.5h3.5A1.5 1.5 0 0 1 20 15v3.5a1.5 1.5 0 0 1-1.5 1.5H15a1.5 1.5 0 0 1-1.5-1.5V15a1.5 1.5 0 0 1 1.5-1.5z'],
  shieldCheck: ['M12 3.5 19 6v5.5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z', 'M9 12l2 2 4-4.5'],
  note: ['M14 3.5H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5z', 'M14 3.5v5h5', 'M8.5 13h7', 'M8.5 16.5h5'],
  verified: ['M14.91 4.98A3.2 3.2 0 0 1 19.02 9.09 3.2 3.2 0 0 1 19.02 14.91 3.2 3.2 0 0 1 14.91 19.02 3.2 3.2 0 0 1 9.09 19.02 3.2 3.2 0 0 1 4.98 14.91 3.2 3.2 0 0 1 4.98 9.09 3.2 3.2 0 0 1 9.09 4.98 3.2 3.2 0 0 1 14.91 4.98z', 'M9 12.2l2.1 2.1 4-4.4'],
  discord: {
    // Brand mark, solid. Padded so its weight matches the stroked icons beside it.
    viewBox: '-2 -2 20 20',
    fill: ['M13.545 2.907a13.2 13.2 0 0 0-3.257-1.011.05.05 0 0 0-.052.025c-.141.25-.297.577-.406.833a12.2 12.2 0 0 0-3.658 0 8 8 0 0 0-.412-.833.05.05 0 0 0-.052-.025c-1.125.194-2.22.534-3.257 1.011a.04.04 0 0 0-.021.018C.356 6.024-.213 9.047.066 12.032q.003.022.021.037a13.3 13.3 0 0 0 3.995 2.020.05.05 0 0 0 .056-.019q.463-.63.818-1.329a.05.05 0 0 0-.01-.059l-.018-.011a9 9 0 0 1-1.248-.595.05.05 0 0 1-.02-.066l.015-.019q.127-.095.248-.195a.05.05 0 0 1 .051-.007c2.619 1.196 5.454 1.196 8.041 0a.05.05 0 0 1 .053.007q.121.1.248.195a.05.05 0 0 1-.004.085 8 8 0 0 1-1.249.594.05.05 0 0 0-.03.03.05.05 0 0 0 .003.041c.24.465.515.909.817 1.329a.05.05 0 0 0 .056.019 13.2 13.2 0 0 0 4.001-2.020.05.05 0 0 0 .021-.037c.334-3.451-.559-6.449-2.366-9.106a.03.03 0 0 0-.02-.019m-8.198 7.307c-.789 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.45.73 1.438 1.613 0 .888-.637 1.612-1.438 1.612m5.316 0c-.788 0-1.438-.724-1.438-1.612s.637-1.613 1.438-1.613c.807 0 1.451.73 1.438 1.613 0 .888-.631 1.612-1.438 1.612'],
  },
};

/**
 * On-screen stroke weight in px for an icon rendered `size` px square: 1.6px up to 18px, then
 * growing with the icon so large status icons are not spindly, capped at 3px.
 */
export function strokeFor(size) {
  const px = Math.min(3, Math.max(1.6, size * 0.085));
  return +(px * 24 / size).toFixed(3);
}
