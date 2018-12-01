import { Action, cancelStrict, isObservable, observable, observe, Static, useStrict } from '../src/index';

test('use strict in Action otherwise will throw error', () => {
  const obj = observable({
    a: 1
  });

  useStrict();

  expect(() => {
    obj.a = 2;
  }).toThrow();

  expect(() => {
    Action(() => {
      obj.a = 3;
    });
  }).not.toThrow();

  cancelStrict();
});

test('use strict in Action otherwise will throw error in decorator', () => {
  @observable
  class Test {
    public value = 1;

    @Action
    public changeValue(value: number) {
      this.value = value;
    }

    public changeValueNotSafe(value: number) {
      this.value = value;
    }
  }

  const instance = new Test();

  useStrict();

  expect(() => {
    instance.changeValueNotSafe(2);
  }).toThrow();

  expect(() => {
    instance.changeValue(3);
  }).not.toThrow();

  cancelStrict();
});
