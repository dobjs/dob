import { Action, isObservable, observable, observe, Static } from '../src/index';

// /**
//  * observable
//  */

test('should return a new observable when no argument is provided', () => {
  const dynamicObj = observable();
  expect(isObservable(dynamicObj)).toBe(true);
});

test('should return an observable wrapping of an object argument', () => {
  const obj = { prop: 'value' };
  const dynamicObj = observable(obj);
  expect(obj === dynamicObj).not.toBe(true);
  expect(isObservable(dynamicObj)).toBe(true);
});

test('should return the argument if test is already an observable', () => {
  const dynamicObj1 = observable();
  const dynamicObj2 = observable(dynamicObj1);
  expect(dynamicObj1 === dynamicObj2).toBe(true);
});

test('should return the same observable wrapper when called repeatedly with the same argument', () => {
  const obj = { prop: 'value' };
  const dynamicObj1 = observable(obj);
  const dynamicObj2 = observable(obj);
  expect(dynamicObj1 === dynamicObj2).toBe(true);
});

test('should never modify the underlying plain object', () => {
  const obj = {} as any;
  const dynamicObj = observable(obj);
  obj.nested1 = {};
  dynamicObj.nested2 = observable({});
  expect(isObservable(obj.nested1)).not.toBe(true);
  expect(isObservable(obj.nested2)).not.toBe(true);
});

test('null throw typeError', () => {
  expect(() => {
    observable(null);
  }).toThrow(TypeError);
});

test('undefined not throw', () => {
  expect(() => {
    observable(undefined);
  }).not.toThrow();
});

test('primitive type typeError', () => {
  expect(() => {
    observable(1);
  }).toThrow(TypeError);
});

test('when observable class has constructor', () => {
  @observable
  class MyCount {
    private count1: number;
    private count2: number;

    constructor(count1: number, count2: number) {
      this.count1 = count1;
      this.count2 = count2;
    }

    public getCount1(): number {
      return this.count1;
    }

    public getCount2(): number {
      return this.count2;
    }
  }

  const myCount = new MyCount(3, 4);

  expect(myCount.getCount1() === 3).toBe(true);
  expect(myCount.getCount2() === 4).toBe(true);
});

/**
 * isObservable
 */
test('should throw a TypeError on invalid arguments', () => {
  expect(isObservable({})).not.toBe(true);
});

test('should return true if an observable is passed as argument', () => {
  const dynamicObj = observable();
  expect(isObservable(dynamicObj)).toBe(true);
});

test('should return false if a non observable is passed as argument', () => {
  const obj1 = { prop: 'value' };
  const obj2 = new Proxy({}, {});
  expect(isObservable(obj1)).not.toBe(true);
  expect(isObservable(obj2)).not.toBe(true);
});

/**
 * Action
 */

test('observe run sync', () => {
  let data = '';
  const dynamicObj = observable({ name: 'b' });

  data += 'a';
  observe(() => (data += dynamicObj.name));
  data += 'c';

  return Promise.resolve().then(() => expect(data === 'abc').toBe(true));
});

test('observe run but not used', () => {
  let runCount = 0;
  const dynamicObj = observable({ name: 'b' });

  observe(() => runCount++);

  dynamicObj.name = 'c';

  return Promise.resolve().then(() => expect(runCount === 1).toBe(true));
});

test('observe run any time', () => {
  let runCount = 0;
  const dynamicObj = observable({ name: 'b' });

  observe(() => {
    runCount += 1;
    // use it!
    // tslint:disable-next-line:no-unused-expression
    dynamicObj.name;
  });

  dynamicObj.name = 'c';
  dynamicObj.name = 'd';

  return Promise.resolve().then(() => expect(runCount === 3).toBe(true));
});

test('Action', () => {
  let runCount = 0;
  let count = 0;
  const dynamicObj = observable({ number: 1 });

  observe(() => {
    runCount += 1;
    // use it!
    count += dynamicObj.number;
  });

  Action(() => {
    dynamicObj.number = 2;
    dynamicObj.number = 3;
  });

  return Promise.resolve()
    .then(() => expect(runCount === 2).toBe(true))
    .then(() => expect(count === 4).toBe(true)); // 1 + 3, do not use 2
});

/**
 * Action
 */

test('Action with Action work', () => {
  let runCount = 0;
  let data = 0;
  const dynamicObj = observable({ counter: 0 });
  observe(() => {
    runCount++;
    data += dynamicObj.counter;
  });

  class MyAction {
    @Action
    public run() {
      dynamicObj.counter = 1;
      dynamicObj.counter = 2;
    }
  }

  new MyAction().run();

  return Promise.resolve()
    .then(() => expect(runCount === 2).toBe(true))
    .then(() => (data = 2)); // 0 + 2, ignore 1
});

test('Action with params', () => {
  let runCount = 0;
  let data = 0;
  const dynamicObj = observable({ counter: 0 });
  observe(() => {
    runCount++;
    data += dynamicObj.counter;
  });

  class MyAction {
    @Action
    public run(num: number) {
      dynamicObj.counter = num + 1;
      dynamicObj.counter = num + 1;
    }
  }

  new MyAction().run(1);

  return Promise.resolve()
    .then(() => expect(runCount === 2).toBe(true))
    .then(() => (data = 3)); // 0 + 3, ignore 2
});

test('Action can get sync return value', () => {
  let data = 0;
  const dynamicObj = observable({ counter: 0 });
  observe(() => {
    data += dynamicObj.counter;
  });

  class MyAction {
    @Action
    public run(num: number) {
      dynamicObj.counter = num + 1;
      return dynamicObj.counter;
    }
  }

  const result = new MyAction().run(1);

  return Promise.resolve().then(() => expect(result === 2).toBe(true));
});

test('Action can get async return value', () => {
  let data = 0;
  const dynamicObj = observable({ counter: 0 });
  observe(() => {
    data += dynamicObj.counter;
  });

  class MyAction {
    @Action
    public async run(num: number) {
      dynamicObj.counter = num + 1;
      return dynamicObj.counter;
    }
  }

  const result = new MyAction().run(1);

  return Promise.resolve().then(() => {
    return result.then(value => {
      expect(value === 2).toBe(true);
    });
  });
});

/**
 * observe
 */

test('should observe basic properties', () => {
  let data = 0;
  const dynamicObj = observable({ counter: 0 });
  observe(() => (data = dynamicObj.counter));

  return Promise.resolve()
    .then(() => expect(data === 0).toBe(true))
    .then(() => (dynamicObj.counter = 7))
    .then(() => expect(data === 7).toBe(true));
});

test('should observe delete operations', () => {
  let data = '';
  const dynamicObj = observable({ prop: 'value' });
  observe(() => (data = dynamicObj.prop));

  return Promise.resolve()
    .then(() => expect(data === 'value').toBe(true))
    .then(() => delete dynamicObj.prop)
    .then(() => expect(data === undefined).toBe(true));
});

test('should observe properties on the prototype chain', () => {
  let data = 0;
  const dynamicObj = observable({ counter: 0 });
  const parentDynamicObj = observable({ counter: 2 });
  Object.setPrototypeOf(dynamicObj, parentDynamicObj);
  observe(() => (data = dynamicObj.counter));

  return Promise.resolve()
    .then(() => expect(data === 0).toBe(true))
    .then(() => delete dynamicObj.counter)
    .then(() => expect(data === 2).toBe(true))
    .then(() => (parentDynamicObj.counter = 4))
    .then(() => expect(data === 4).toBe(true))
    .then(() => (dynamicObj.counter = 3))
    .then(() => expect(data === 3).toBe(true));
});

test('should observe function call chains', () => {
  let data = 0;
  const dynamicObj = observable({ counter: 0 });
  observe(() => (data = getCounter()));

  function getCounter() {
    return dynamicObj.counter;
  }

  return Promise.resolve()
    .then(() => expect(data === 0).toBe(true))
    .then(() => (dynamicObj.counter = 2))
    .then(() => expect(data === 2).toBe(true));
});

test('should observe for of iteration', () => {
  let data = '';
  const dynamicObj = observable({ array: ['Hello'] });
  observe(() => (data = dynamicObj.array.join(' ')));

  return Promise.resolve()
    .then(() => expect(data === 'Hello').toBe(true))
    .then(() => dynamicObj.array.push('World!'))
    .then(() => expect(data === 'Hello World!').toBe(true))
    .then(() => dynamicObj.array.shift())
    .then(() => expect(data === 'World!').toBe(true));
});

// // test('should observe for in iteration', () => {
// //     let data = 0
// //     const dynamicObj: any = observable({prop: 0})
// //     observe(() => {
// //         data = 0
// //         for (let key in dynamicObj) {
// //             data += dynamicObj[key]
// //         }
// //     })
// //
// //     return Promise.resolve()
// //         .then(() => expect(data === 0))
// //         .then(() => dynamicObj.prop = 1)
// //         .then(() => expect(data === 1))
// //         .then(() => dynamicObj.prop1 = 1)
// //         .then(() => expect(data === 2))
// //         .then(() => dynamicObj.prop2 = 3)
// //         .then(() => expect(data === 5))
// //         .then(() => dynamicObj.prop1 = 6)
// //         .then(() => expect(data === 10))
// // })

// // test('should not observe well-known symbols', () => {
// //     let data = ''
// //     const dynamicObj = observable({[Symbol.toStringTag]: 'myString'})
// //     observe(() => data = String(dynamicObj))
// //
// //     return Promise.resolve()
// //         .then(() => expect(data).to.equal('[object myString]'))
// //         .then(() => dynamicObj[Symbol.toStringTag] = 'otherString')
// //         .then(() => expect(data).to.equal('[object myString]'))
// // })

test('should not observe set operations without a value change', () => {
  let data = '';
  const dynamicObj = observable({ prop: 'prop' });

  let numOfRuns = 0;

  function testObserve() {
    data = dynamicObj.prop;
    numOfRuns++;
  }

  observe(testObserve);

  return Promise.resolve()
    .then(() => expect(data === 'prop').toBe(true))
    .then(() => (dynamicObj.prop = 'prop'))
    .then(() => {
      expect(numOfRuns === 1).toBe(true);
      expect(data === 'prop').toBe(true);
    })
    .then(() => (dynamicObj.prop = 'prop2'))
    .then(() => (dynamicObj.prop = 'prop2'))
    .then(() => {
      expect(numOfRuns === 2).toBe(true);
      expect(data === 'prop2').toBe(true);
    });
});

test('should run synchronously after registration', () => {
  let data = '';
  const dynamicObj = observable({ prop: 'prop' });

  let numOfRuns = 0;
  observe(() => {
    data = dynamicObj.prop;
    numOfRuns++;
  });

  expect(numOfRuns === 1).toBe(true);
  expect(data === 'prop').toBe(true);

  return Promise.resolve()
    .then(() => {
      expect(numOfRuns === 1).toBe(true);
      expect(data === 'prop').toBe(true);
    })
    .then(() => {
      dynamicObj.prop = 'new prop';
    })
    .then(() => {
      expect(numOfRuns === 2).toBe(true);
      expect(data === 'new prop').toBe(true);
    });
});

test('should rerun maximum once per stack', () => {
  let data = 0;
  const dynamicObj = observable({ prop1: 0, prop2: 0 });

  let numOfRuns = 0;

  function testObserve() {
    data = dynamicObj.prop1 + dynamicObj.prop2;
    numOfRuns++;
  }

  observe(testObserve);

  return Promise.resolve()
    .then(() => {
      expect(numOfRuns === 1).toBe(true);
      expect(data === 0).toBe(true);
    })
    .then(() => {
      Action(() => {
        dynamicObj.prop1 = 1;
        dynamicObj.prop2 = 3;
        dynamicObj.prop1 = 2;
      });
    })
    .then(() => {
      expect(numOfRuns === 2).toBe(true);
      expect(data === 5).toBe(true);
    });
});

test('should avoid infinite loops', () => {
  const dynamicObj1 = observable({ prop: 'value1' });
  const dynamicObj2 = observable({ prop: 'value2' });

  let numOfRuns1 = 0;
  let numOfRuns2 = 0;

  function test1() {
    dynamicObj1.prop = dynamicObj2.prop;
    numOfRuns1++;
  }

  function test2() {
    dynamicObj2.prop = dynamicObj1.prop;
    numOfRuns2++;
  }

  observe(test1);
  observe(test2);

  return Promise.resolve()
    .then(() => (dynamicObj1.prop = 'Hello'))
    .then(() => expect(dynamicObj2.prop === 'Hello').toBe(true))
    .then(() => (dynamicObj1.prop = 'World!'))
    .then(() => expect(dynamicObj2.prop === 'World!').toBe(true))
    .then(() => {
      expect(numOfRuns1 === 3).toBe(true);
      expect(numOfRuns2 === 3).toBe(true);
    });
});

test('should return an unobserve (object) signal', () => {
  let data = 0;
  const dynamicObj = observable({ counter: 0 });
  const signal = observe(() => (data = dynamicObj.counter));
  expect(typeof signal === 'object').toBe(true);
});

/**
 * set
 */

test('set should observe string', () => {
  let data: boolean;
  const dynamicObj = observable(new Set());
  observe(() => (data = dynamicObj.has('value')));

  return Promise.resolve()
    .then(() => expect(data).not.toBe(true))
    .then(() => dynamicObj.add('value'))
    .then(() => expect(data).toBe(true))
    .then(() => dynamicObj.delete('value'))
    .then(() => expect(data).not.toBe(true));
});

test('should observe iteration', () => {
  let data: number;
  const dynamicObj = observable(new Set());
  observe(() => {
    data = 0;
    dynamicObj.forEach(each => {
      data += each;
    });
  });

  return Promise.resolve()
    .then(() => expect(data === 0).toBe(true))
    .then(() => dynamicObj.add(3))
    .then(() => expect(data === 3).toBe(true))
    .then(() => dynamicObj.add(2))
    .then(() => expect(data === 5).toBe(true))
    .then(() => dynamicObj.delete(2))
    .then(() => expect(data === 3).toBe(true))
    .then(() => dynamicObj.clear())
    .then(() => expect(data === 0).toBe(true));
});

test('set delete test', () => {
  let data: boolean;
  let numOfRuns = 0;
  const dynamicObj = observable(new Set());
  observe(() => {
    numOfRuns++;
    data = dynamicObj.has('value');
  });

  return Promise.resolve()
    .then(() => {
      expect(data).not.toBe(true);
      expect(numOfRuns === 1).toBe(true);
    })
    .then(() => dynamicObj.add('value'))
    .then(() => dynamicObj.add('value'))
    .then(() => {
      expect(data).toBe(true);
      expect(numOfRuns === 2).toBe(true);
    })
    .then(() => dynamicObj.delete('value'))
    .then(() => dynamicObj.delete('value'))
    .then(() => {
      expect(data).not.toBe(true);
      expect(numOfRuns === 3).toBe(true);
    });
});

test('should observe mutations', () => {
  let data: boolean;
  const value = {};
  const dynamicObj = observable(new Set());
  observe(() => (data = dynamicObj.has(value)));

  return Promise.resolve()
    .then(() => expect(data).not.toBe(true))
    .then(() => dynamicObj.add(value))
    .then(() => expect(data).toBe(true))
    .then(() => dynamicObj.delete(value))
    .then(() => expect(data).not.toBe(true));
});

test('should not observe non value changing mutations', () => {
  let data: boolean;
  const value = {};
  let numOfRuns = 0;
  const dynamicObj = observable(new Set());
  observe(() => {
    numOfRuns++;
    data = dynamicObj.has(value);
  });

  return Promise.resolve()
    .then(() => {
      expect(data).not.toBe(true);
      expect(numOfRuns === 1).toBe(true);
    })
    .then(() => dynamicObj.add(value))
    .then(() => dynamicObj.add(value))
    .then(() => {
      expect(data).toBe(true);
      expect(numOfRuns === 2).toBe(true);
    })
    .then(() => dynamicObj.delete(value))
    .then(() => dynamicObj.delete(value))
    .then(() => {
      expect(data).not.toBe(true);
      expect(numOfRuns === 3).toBe(true);
    });
});

/**
 * WeakSet
 */

test('weakSet should observe object', () => {
  let data: boolean;
  const value = {};
  const dynamicObj = observable(new WeakSet());
  observe(() => (data = dynamicObj.has(value)));

  return Promise.resolve()
    .then(() => expect(data).not.toBe(true))
    .then(() => dynamicObj.add(value))
    .then(() => expect(data).toBe(true))
    .then(() => dynamicObj.delete(value))
    .then(() => expect(data).not.toBe(true));
});

/**
 * Map
 */

test('weakSet should observe string', () => {
  let data: string;
  const dynamicObj = observable(new Map());
  observe(() => (data = dynamicObj.get('key')));

  return Promise.resolve()
    .then(() => expect(data === undefined).toBe(true))
    .then(() => dynamicObj.set('key', 'value'))
    .then(() => expect(data === 'value').toBe(true))
    .then(() => dynamicObj.delete('key'))
    .then(() => expect(data === undefined).toBe(true));
});

test('should observe iteration', () => {
  let data: number;
  const dynamicObj = observable(new Map());
  observe(() => {
    data = 0;
    dynamicObj.forEach(each => {
      data += each;
    });
  });

  return Promise.resolve()
    .then(() => expect(data === 0).toBe(true))
    .then(() => dynamicObj.set('key0', 3))
    .then(() => expect(data === 3).toBe(true))
    .then(() => dynamicObj.set('key1', 2))
    .then(() => expect(data === 5).toBe(true))
    .then(() => dynamicObj.delete('key0'))
    .then(() => expect(data === 2).toBe(true))
    .then(() => dynamicObj.clear())
    .then(() => expect(data === 0).toBe(true));
});

test('should not observe non value changing mutations', () => {
  let data: string;
  let numOfRuns = 0;
  const dynamicObj = observable(new Map());
  observe(() => {
    numOfRuns++;
    data = dynamicObj.get('key');
  });

  return Promise.resolve()
    .then(() => {
      expect(data === undefined).toBe(true);
      expect(numOfRuns === 1).toBe(true);
    })
    .then(() => dynamicObj.set('key', 'value'))
    .then(() => dynamicObj.set('key', 'value'))
    .then(() => {
      expect(data === 'value').toBe(true);
      expect(numOfRuns === 2).toBe(true);
    })
    .then(() => dynamicObj.delete('key'))
    .then(() => dynamicObj.delete('key'))
    .then(() => {
      expect(data === undefined).toBe(true);
      expect(numOfRuns === 3).toBe(true);
    });
});

test('should observe map array', () => {
  let data: number;
  const dynamicObj = observable(new Map<string, number[]>([['a', [1, 2, 3]]]));
  observe(() => (data = dynamicObj!.get('a')!.length));

  return Promise.resolve()
    .then(() => expect(data === 3).toBe(true))
    .then(() => dynamicObj!.get('a')!.push(4))
    .then(() => expect(data === 4).toBe(true));
});

test('should observe map.size', () => {
  const map = observable(new Map());
  let count = 0;
  observe(() => {
    count += map.size;
  });
  map.set('banana', 5);
  map.set('apple', 3);

  return Promise.resolve().then(() => expect(count === 3).toBe(true));
});

/**
 * WeakMap
 */

test('should observe mutations', () => {
  let data: string;
  const key = {};
  const dynamicObj = observable(new WeakMap());
  observe(() => (data = dynamicObj.get(key)));

  return Promise.resolve()
    .then(() => expect(data === undefined).toBe(true))
    .then(() => dynamicObj.set(key, 'value'))
    .then(() => expect(data === 'value').toBe(true))
    .then(() => dynamicObj.delete(key))
    .then(() => expect(data === undefined).toBe(true));
});

test('should not observe non value changing mutations', () => {
  let data: string;
  let numOfRuns = 0;
  const key = {};
  const dynamicObj = observable(new WeakMap());
  observe(() => {
    numOfRuns++;
    data = dynamicObj.get(key);
  });

  return Promise.resolve()
    .then(() => {
      expect(data === undefined).toBe(true);
      expect(numOfRuns === 1).toBe(true);
    })
    .then(() => dynamicObj.set(key, 'value'))
    .then(() => dynamicObj.set(key, 'value'))
    .then(() => {
      expect(data === 'value').toBe(true);
      expect(numOfRuns === 2).toBe(true);
    })
    .then(() => dynamicObj.delete(key))
    .then(() => dynamicObj.delete(key))
    .then(() => {
      expect(data === undefined).toBe(true);
      expect(numOfRuns === 3).toBe(true);
    });
});

/**
 * execution order
 */
test('should run in runner order the first time', () => {
  let data = '';
  const dynamicObj = observable({ prop1: 'prop1', prop2: 'prop2', prop3: 'prop3' });

  observe(() => (data += dynamicObj.prop1));
  observe(() => (data += dynamicObj.prop2));
  observe(() => (data += dynamicObj.prop3));

  dynamicObj.prop3 = 'p3';
  dynamicObj.prop1 = 'p1';
  dynamicObj.prop2 = 'p2';

  return Promise.resolve().then(() => expect(data === 'prop1prop2prop3p3p1p2').toBe(true));
});

/**
 * unobserve
 */

test('should unobserve the observed function', () => {
  // TODO:
  // let data = ""
  // const dynamicObj = observable({ prop: "" })
  // let numOfRuns = 0
  // function testObserve() {
  //     data = dynamicObj.prop
  //     numOfRuns++
  // }
  // const signal = observe(testObserve)
  // return Promise.resolve()
  //     .then(() => dynamicObj.prop = "Hello")
  //     .then(() => signal.unobserve())
  //     .then(() => {
  //         expect(signal.callback === undefined)
  //         expect(signal.observedKeys === undefined)
  //     })
  //     .then(() => dynamicObj.prop = "World")
  //     .then(() => dynamicObj.prop = "!")
  //     .then(() => expect(numOfRuns === 2))
});

test('should not unobserve if the function is registered for the stack, because of sync', () => {
  let data: number;
  const dynamicObj = observable({ prop: 0 });

  let numOfRuns = 0;

  function testObserve() {
    data = dynamicObj.prop;
    numOfRuns++;
  }

  const signal = observe(testObserve);

  return Promise.resolve()
    .then(() => {
      dynamicObj.prop = 2; // but also run
      signal.unobserve();
    })
    .then(() => expect(numOfRuns === 2).toBe(true));
});

test('should unobserve even if the function is registered for the stack, when use Action', () => {
  let data: number;
  const dynamicObj = observable({ prop: 0 });

  let numOfRuns = 0;

  function testObserve() {
    data = dynamicObj.prop;
    numOfRuns++;
  }

  const signal = observe(testObserve);

  return Promise.resolve()
    .then(() => {
      Action(() => {
        dynamicObj.prop = 2; // not run
        signal.unobserve();
      });
    })
    .then(() => expect(numOfRuns === 1).toBe(true));
});

test('will trace dependency in anywhere', () => {
  let runCount = 0;

  const dynamicObj = observable({
    a: 0,
    b: 1
  });

  observe(() => {
    // use a
    // tslint:disable-next-line:no-unused-expression
    dynamicObj.a;

    runSomeThing();

    runCount++;
  });

  function runSomeThing() {
    // use b
    // tslint:disable-next-line:no-unused-expression
    dynamicObj.b;
  }

  dynamicObj.a = 2;
  dynamicObj.b = 3;

  return Promise.resolve().then(() => expect(runCount === 3).toBe(true));
});

test('Action will not trace dependency', () => {
  let runCount = 0;

  const dynamicObj = observable({
    a: 0,
    b: 1
  });

  observe(() => {
    // use a
    // tslint:disable-next-line:no-unused-expression
    dynamicObj.a;

    Action(() => {
      // tslint:disable-next-line:no-unused-expression
      dynamicObj.b;
    });

    runCount++;
  });

  dynamicObj.b = 2;

  return Promise.resolve().then(() => expect(runCount === 1).toBe(true));
});

/**
 * Action handle async
 */
test('Action not handle async function!!', async () => {
  let runCount = 0;
  let num = 0;

  const dynamicObj = observable({
    a: 0,
    b: 1
  });

  observe(() => {
    // use a
    num = dynamicObj.a;

    runCount++;
  });

  Action(async () => {
    dynamicObj.a = 1;
    dynamicObj.a = 2;
    await Promise.resolve();
    dynamicObj.a = 3;
    dynamicObj.a = 4;
    dynamicObj.a = 5;
    dynamicObj.a = 6;
  });

  return Promise.resolve()
    .then(() => expect(runCount === 2).toBe(true)) // TODO:6
    .then(() => expect(num === 2).toBe(true)); // TODO:6
});

test('Action handle async function with Action', () => {
  let runCount = 0;
  let num = 0;

  const dynamicObj = observable({
    a: 0,
    b: 1
  });

  observe(() => {
    // use a
    num = dynamicObj.a;

    runCount++;
  });

  Action(async () => {
    dynamicObj.a = 1;
    await Promise.resolve();

    Action(() => {
      dynamicObj.a = 2;
      dynamicObj.a = 3;
      dynamicObj.a = 4;
      dynamicObj.a = 5;
    });
  });

  return Promise.resolve()
    .then(() => expect(runCount === 3).toBe(false)) // TODO: true
    .then(() => expect(num === 5).toBe(false)); // TODO: true
});

/**
 * Branch judgment
 */

test('branch judgment', () => {
  let value = 0;
  let runCount = 0;

  const dynamicObj = observable({
    a: true,
    b: 1,
    c: 2
  });

  observe(() => {
    runCount++;

    // tslint:disable-next-line:prefer-conditional-expression
    if (dynamicObj.a) {
      value = dynamicObj.b;
    } else {
      value = dynamicObj.c;
    }
  });

  return Promise.resolve()
    .then(() => expect(value === 1).toBe(true))
    .then(() => expect(runCount === 1).toBe(true))
    .then(() => (dynamicObj.c = 3)) // nothing happend
    .then(() => expect(value === 1).toBe(true))
    .then(() => expect(runCount === 1).toBe(true))
    .then(() => (dynamicObj.a = false))
    .then(() => expect(value === 3).toBe(true))
    .then(() => expect(runCount === 2).toBe(true))
    .then(() => (dynamicObj.c = 4))
    .then(() => expect(value === 4).toBe(true))
    .then(() => expect(runCount === 3).toBe(true))
    .then(() => (dynamicObj.b = 5))
    .then(() => expect(value === 4).toBe(true))
    .then(() => expect(runCount === 3).toBe(true));
});

/**
 * Static
 */
test('Static will not tracking object', () => {
  let runCount = 0;
  let result = '';
  const dynamicObj = observable(Static({ name: 'b' }));

  observe(() => {
    result = dynamicObj.name;
    runCount++;
  });

  dynamicObj.name = 'c';

  return Promise.resolve()
    .then(() => expect(runCount === 1).toBe(true))
    .then(() => expect(result === 'b').toBe(true));
});

test('Static will not tracking map', () => {
  let runCount = 0;
  let size = 0;
  const dynamicObj = observable(Static(new Map<string, string>()));

  observe(() => {
    size = dynamicObj.size;
    runCount++;
  });

  dynamicObj.set('a', 'a');
  dynamicObj.set('b', 'b');

  return Promise.resolve()
    .then(() => expect(runCount === 1).toBe(true))
    .then(() => expect(size === 0).toBe(true));
});

test('nested observe should eventually run', () => {
  const dynamicObj = observable({
    a: '1',
    b: '2',
    c: '3',
    d: '4'
  });
  let str = '';
  observe(() => {
    str += dynamicObj.a;

    observe(() => {
      str += 5;
      observe(() => {
        str += dynamicObj.b;
      });
      str += 6;
    });

    observe(() => {
      str += 8;
      observe(() => {
        str += dynamicObj.c;
      });
      str += 9;
    });

    str += dynamicObj.d;
  });

  dynamicObj.a = '2';

  return Promise.resolve().then(() => expect(str === '1456289324562893').toBe(true));
});

test('observe in action', () => {
  const dynamicObj = observable({
    a: 'a'
  });

  let count = '';

  Action(() => {
    observe(() => {
      count += dynamicObj.a;
    });
    count += 'b';
  });

  dynamicObj.a = 'c';

  return Promise.resolve().then(() => expect(count === 'bac').toBe(true));
});
