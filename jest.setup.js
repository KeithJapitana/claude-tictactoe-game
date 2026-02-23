// Jest setup file
global.console = {
  ...console,
  // Suppress console.log during tests unless debugging
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock Canvas context for confetti animation
HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
  clearRect: jest.fn(),
  fillRect: jest.fn(),
  save: jest.fn(),
  restore: jest.fn(),
  translate: jest.fn(),
  rotate: jest.fn(),
  fillStyle: '',
}));

Object.defineProperty(HTMLCanvasElement.prototype, 'width', {
  get: jest.fn(() => 1024),
  set: jest.fn(),
});

Object.defineProperty(HTMLCanvasElement.prototype, 'height', {
  get: jest.fn(() => 768),
  set: jest.fn(),
});
