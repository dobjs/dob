import { Event } from '../src/event';

test('test on', () => {
  let count = 0;

  const event = new Event();

  event.emit('change', 1);

  event.on('change' as any, (changedValue: any) => {
    count += changedValue;
  });

  event.emit('change', 2);

  expect(count === 2).toBe(true);
});

test('test multiple on', () => {
  let count = 0;

  const event = new Event();

  event.emit('change', 1);

  event.on('change' as any, (changedValue: any) => {
    count += changedValue;
  });

  event.on('change' as any, (changedValue: any) => {
    count += changedValue;
  });

  event.emit('change', 2);

  expect(count === 4).toBe(true);
});

test('test off', () => {
  let count = 0;

  const event = new Event();

  event.emit('change', 1);

  function changeValue(changedValue: any) {
    count += changedValue;
  }

  event.on('change' as any, changeValue);

  event.on('change' as any, changeValue);

  event.emit('change', 2);
  event.off('change', changeValue);
  event.emit('change', 2);

  expect(count === 4).toBe(true);
});

test('test off not exist event', () => {
  let count = 0;

  const event = new Event();

  event.emit('change', 1);

  function changeValue(changedValue: any) {
    count += changedValue;
  }

  event.on('change' as any, changeValue);

  event.on('change' as any, changeValue);

  event.emit('change', 2);
  event.off('someThing', changeValue);
  event.emit('change', 2);

  expect(count === 8).toBe(true);
});
