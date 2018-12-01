import { Atom, observe } from '../src/index';

class Clock {
  private atom: Atom;
  private intervalHandler: any = null;
  private currentDateTime = 1;

  constructor() {
    this.atom = new Atom(() => this.startTicking(), () => this.stopTicking());
  }

  public stopAtom() {
    this.atom.unobserve();
  }

  public getTime() {
    this.atom.reportObserved();
    return this.currentDateTime;
  }

  public startTicking() {
    this.currentDateTime++;
    this.atom.reportChanged();
  }

  public stopTicking() {
    clearInterval(this.intervalHandler);
    this.intervalHandler = null;
  }
}

test('basic test', () => {
  let time: number = 0;
  const clock = new Clock();
  observe(() => {
    time = clock.getTime();
  });

  clock.startTicking();
  clock.startTicking();
  clock.startTicking();

  return Promise.resolve().then(() => expect(time === 5).toBe(true));
});

test('unobservable', () => {
  let time: number = 0;
  const clock = new Clock();
  observe(() => {
    time = clock.getTime();
  });

  clock.startTicking();
  clock.startTicking();
  clock.stopAtom();

  return Promise.resolve().then(() => expect(time === 4).toBe(true));
});
