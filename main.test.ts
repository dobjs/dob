import test from 'ava'
import { observe, observable, isObservable, extendObservable, runInAction, Action } from './index'

// /**
//  * observable
//  */

test('should return a new observable when no argument is provided', t => {
    const dynamicObj = observable()
    t.true(isObservable(dynamicObj))
})

test('should return an observable wrapping of an object argument', t => {
    const obj = { prop: 'value' }
    const dynamicObj = observable(obj)
    t.false(obj === dynamicObj)
    t.true(isObservable(dynamicObj))
})

test('should return the argument if test is already an observable', t => {
    const dynamicObj1 = observable()
    const dynamicObj2 = observable(dynamicObj1)
    t.true(dynamicObj1 === dynamicObj2)
})

test('should return the same observable wrapper when called repeatedly with the same argument', t => {
    const obj = { prop: 'value' }
    const dynamicObj1 = observable(obj)
    const dynamicObj2 = observable(obj)
    t.true(dynamicObj1 === dynamicObj2)
})

test('should never modify the underlying plain object', t => {
    const obj = {} as any
    const dynamicObj = observable(obj)
    obj.nested1 = {}
    dynamicObj.nested2 = observable({})
    t.false(isObservable(obj.nested1))
    t.false(isObservable(obj.nested2))
})

/**
 isObservable
 */
test('should throw a TypeError on invalid arguments', t => {
    t.false(isObservable({}))
})

test('should return true if an observable is passed as argument', t => {
    const dynamicObj = observable()
    t.true(isObservable(dynamicObj))
})

test('should return false if a non observable is passed as argument', t => {
    const obj1 = { prop: 'value' }
    const obj2 = new Proxy({}, {})
    t.false(isObservable(obj1))
    t.false(isObservable(obj2))
})

/**
 * runInAction
 */

test('observe run sync', t => {
    let data = ''
    const dynamicObj = observable({ name: 'b' })

    data += 'a'
    observe(() => data += dynamicObj.name)
    data += 'c'

    return Promise.resolve()
        .then(() => t.true(data === 'abc'))
})

test('observe run but not used', t => {
    let runCount = 0
    const dynamicObj = observable({ name: 'b' })

    observe(() => runCount++)

    dynamicObj.name = 'c'

    return Promise.resolve()
        .then(() => t.true(runCount === 1))
})

test('observe run any time', t => {
    let runCount = 0
    const dynamicObj = observable({ name: 'b' })

    observe(() => {
        runCount += 1
        // use it!
        dynamicObj.name
    })

    dynamicObj.name = 'c'
    dynamicObj.name = 'd'

    return Promise.resolve()
        .then(() => t.true(runCount === 3))
})

test('runInAction', t => {
    let runCount = 0
    let count = 0
    const dynamicObj = observable({ number: 1 })

    observe(() => {
        runCount += 1
        // use it!
        count += dynamicObj.number
    })

    runInAction(() => {
        dynamicObj.number = 2
        dynamicObj.number = 3
    })

    return Promise.resolve()
        .then(() => t.true(runCount === 2))
        .then(() => t.true(count === 4)) // 1 + 3, do not use 2
})

/**
 * Action
 */

test('Action with runInAction work', t => {
    let runCount = 0
    let data = 0
    const dynamicObj = observable({ counter: 0 })
    observe(() => {
        runCount++
        data += dynamicObj.counter
    })

    class MyAction {
        @Action run() {
            dynamicObj.counter = 1
            dynamicObj.counter = 2
        }
    }

    new MyAction().run()

    return Promise.resolve()
        .then(() => t.true(runCount === 2))
        .then(() => data = 2) // 0 + 2, ignore 1
})

test('Action with params', t => {
    let runCount = 0
    let data = 0
    const dynamicObj = observable({ counter: 0 })
    observe(() => {
        runCount++
        data += dynamicObj.counter
    })

    class MyAction {
        @Action run(num: number) {
            dynamicObj.counter = num + 1
            dynamicObj.counter = num + 1
        }
    }

    new MyAction().run(1)

    return Promise.resolve()
        .then(() => t.true(runCount === 2))
        .then(() => data = 3) // 0 + 3, ignore 2
})

test('Action can get sync return value', t => {
    let data = 0
    const dynamicObj = observable({ counter: 0 })
    observe(() => {
        data += dynamicObj.counter
    })

    class MyAction {
        @Action run(num: number) {
            dynamicObj.counter = num + 1
            return dynamicObj.counter
        }
    }

    const result = new MyAction().run(1)

    return Promise.resolve()
        .then(() => t.true(result === 2))
})

test('Action can get async return value', t => {
    let data = 0
    const dynamicObj = observable({ counter: 0 })
    observe(() => {
        data += dynamicObj.counter
    })

    class MyAction {
        @Action async run(num: number) {
            dynamicObj.counter = num + 1
            return dynamicObj.counter
        }
    }

    const result = new MyAction().run(1)

    return Promise.resolve()
        .then(() => {
            return result.then(value => {
                t.true(value === 2)
            })
        })
})

/**
 * observe
 */

test('should observe basic properties', t => {
    let data = 0
    const dynamicObj = observable({ counter: 0 })
    observe(() => data = dynamicObj.counter)

    return Promise.resolve()
        .then(() => t.true(data === 0))
        .then(() => dynamicObj.counter = 7)
        .then(() => t.true(data === 7))
})

test('should observe delete operations', t => {
    let data = ''
    const dynamicObj = observable({ prop: 'value' })
    observe(() => data = dynamicObj.prop)

    return Promise.resolve()
        .then(() => t.true(data === 'value'))
        .then(() => delete dynamicObj.prop)
        .then(() => t.true(data === undefined))
})

test('should observe properties on the prototype chain', t => {
    let data = 0
    const dynamicObj = observable({ counter: 0 })
    const parentDynamicObj = observable({ counter: 2 })
    Object.setPrototypeOf(dynamicObj, parentDynamicObj)
    observe(() => data = dynamicObj.counter)

    return Promise.resolve()
        .then(() => t.true(data === 0))
        .then(() => delete dynamicObj.counter)
        .then(() => t.true(data === 2))
        .then(() => parentDynamicObj.counter = 4)
        .then(() => t.true(data === 4))
        .then(() => dynamicObj.counter = 3)
        .then(() => t.true(data === 3))
})

test('should observe function call chains', t => {
    let data = 0
    const dynamicObj = observable({ counter: 0 })
    observe(() => data = getCounter())

    function getCounter() {
        return dynamicObj.counter
    }

    return Promise.resolve()
        .then(() => t.true(data === 0))
        .then(() => dynamicObj.counter = 2)
        .then(() => t.true(data === 2))
})

test('should observe for of iteration', t => {
    let data = ''
    const dynamicObj = observable({ array: ['Hello'] })
    observe(() => data = dynamicObj.array.join(' '))

    return Promise.resolve()
        .then(() => t.true(data === 'Hello'))
        .then(() => dynamicObj.array.push('World!'))
        .then(() => t.true(data === 'Hello World!'))
        .then(() => dynamicObj.array.shift())
        .then(() => t.true(data === 'World!'))
})

// // test('should observe for in iteration', t => {
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
// //         .then(() => t.true(data === 0))
// //         .then(() => dynamicObj.prop = 1)
// //         .then(() => t.true(data === 1))
// //         .then(() => dynamicObj.prop1 = 1)
// //         .then(() => t.true(data === 2))
// //         .then(() => dynamicObj.prop2 = 3)
// //         .then(() => t.true(data === 5))
// //         .then(() => dynamicObj.prop1 = 6)
// //         .then(() => t.true(data === 10))
// // })

// // test('should not observe well-known symbols', t => {
// //     let data = ''
// //     const dynamicObj = observable({[Symbol.toStringTag]: 'myString'})
// //     observe(() => data = String(dynamicObj))
// //
// //     return Promise.resolve()
// //         .then(() => expect(data).to.equal('[object myString]'))
// //         .then(() => dynamicObj[Symbol.toStringTag] = 'otherString')
// //         .then(() => expect(data).to.equal('[object myString]'))
// // })

test('should not observe set operations without a value change', t => {
    let data = ''
    const dynamicObj = observable({ prop: 'prop' })

    let numOfRuns = 0

    function test() {
        data = dynamicObj.prop
        numOfRuns++
    }

    observe(test)

    return Promise.resolve()
        .then(() => t.true(data === 'prop'))
        .then(() => dynamicObj.prop = 'prop')
        .then(() => {
            t.true(numOfRuns === 1)
            t.true(data === 'prop')
        })
        .then(() => dynamicObj.prop = 'prop2')
        .then(() => dynamicObj.prop = 'prop2')
        .then(() => {
            t.true(numOfRuns === 2)
            t.true(data === 'prop2')
        })
})

test('should run synchronously after registration', t => {
    let data = ''
    const dynamicObj = observable({ prop: 'prop' })

    let numOfRuns = 0
    observe(() => {
        data = dynamicObj.prop
        numOfRuns++
    })

    t.true(numOfRuns === 1)
    t.true(data === 'prop')

    return Promise.resolve()
        .then(() => {
            t.true(numOfRuns === 1)
            t.true(data === 'prop')
        })
        .then(() => {
            dynamicObj.prop = 'new prop'
        })
        .then(() => {
            t.true(numOfRuns === 2)
            t.true(data === 'new prop')
        })
})

test('should rerun maximum once per stack', t => {
    let data = 0
    const dynamicObj = observable({ prop1: 0, prop2: 0 })

    let numOfRuns = 0

    function test() {
        data = dynamicObj.prop1 + dynamicObj.prop2
        numOfRuns++
    }

    observe(test)

    return Promise.resolve()
        .then(() => {
            t.true(numOfRuns === 1)
            t.true(data === 0)
        })
        .then(() => {
            runInAction(() => {
                dynamicObj.prop1 = 1
                dynamicObj.prop2 = 3
                dynamicObj.prop1 = 2
            })
        })
        .then(() => {
            t.true(numOfRuns === 2)
            t.true(data === 5)
        })
})

test('should avoid infinite loops', t => {
    const dynamicObj1 = observable({ prop: 'value1' })
    const dynamicObj2 = observable({ prop: 'value2' })

    let numOfRuns1 = 0
    let numOfRuns2 = 0

    function test1() {
        dynamicObj1.prop = dynamicObj2.prop
        numOfRuns1++
    }

    function test2() {
        dynamicObj2.prop = dynamicObj1.prop
        numOfRuns2++
    }

    observe(test1)
    observe(test2)

    return Promise.resolve()
        .then(() => dynamicObj1.prop = 'Hello')
        .then(() => t.true(dynamicObj2.prop === 'Hello'))
        .then(() => dynamicObj1.prop = 'World!')
        .then(() => t.true(dynamicObj2.prop === 'World!'))
        .then(() => {
            t.true(numOfRuns1 === 3)
            t.true(numOfRuns2 === 5)
        })
})

test('should return an unobserve (object) signal', t => {
    let data = 0
    const dynamicObj = observable({ counter: 0 })
    const signal = observe(() => data = dynamicObj.counter)
    t.true(typeof signal === 'object')
})

/**
 * set
 */

test('should observe mutations', t => {
    let data: boolean
    const dynamicObj = observable(new Set())
    observe(() => data = dynamicObj.has('value'))

    return Promise.resolve()
        .then(() => t.false(data))
        .then(() => dynamicObj.add('value'))
        .then(() => t.true(data))
        .then(() => dynamicObj.delete('value'))
        .then(() => t.false(data))
})

test('should observe iteration', t => {
    let data: number
    const dynamicObj = observable(new Set())
    observe(() => {
        data = 0
        for (let num of dynamicObj) {
            data += num
        }
    })

    return Promise.resolve()
        .then(() => t.true(data === 0))
        .then(() => dynamicObj.add(3))
        .then(() => t.true(data === 3))
        .then(() => dynamicObj.add(2))
        .then(() => t.true(data === 5))
        .then(() => dynamicObj.delete(2))
        .then(() => t.true(data === 3))
        .then(() => dynamicObj.clear())
        .then(() => t.true(data === 0))
})

test('should not observe non value changing mutations', t => {
    let data: boolean
    let numOfRuns = 0
    const dynamicObj = observable(new Set())
    observe(() => {
        numOfRuns++
        data = dynamicObj.has('value')
    })

    return Promise.resolve()
        .then(() => {
            t.false(data)
            t.true(numOfRuns === 1)
        })
        .then(() => dynamicObj.add('value'))
        .then(() => dynamicObj.add('value'))
        .then(() => {
            t.true(data)
            t.true(numOfRuns === 2)
        })
        .then(() => dynamicObj.delete('value'))
        .then(() => dynamicObj.delete('value'))
        .then(() => {
            t.false(data)
            t.true(numOfRuns === 3)
        })
})

/**
 * WeakSet
 */

test('should observe mutations', t => {
    let data: boolean
    const value = {}
    const dynamicObj = observable(new Set())
    observe(() => data = dynamicObj.has(value))

    return Promise.resolve()
        .then(() => t.false(data))
        .then(() => dynamicObj.add(value))
        .then(() => t.true(data))
        .then(() => dynamicObj.delete(value))
        .then(() => t.false(data))
})

/**
 * WeakSet
 */

test('should observe mutations', t => {
    let data: boolean
    const value = {}
    const dynamicObj = observable(new Set())
    observe(() => data = dynamicObj.has(value))

    return Promise.resolve()
        .then(() => t.false(data))
        .then(() => dynamicObj.add(value))
        .then(() => t.true(data))
        .then(() => dynamicObj.delete(value))
        .then(() => t.false(data))
})

test('should not observe non value changing mutations', t => {
    let data: boolean
    const value = {}
    let numOfRuns = 0
    const dynamicObj = observable(new Set())
    observe(() => {
        numOfRuns++
        data = dynamicObj.has(value)
    })

    return Promise.resolve()
        .then(() => {
            t.false(data)
            t.true(numOfRuns === 1)
        })
        .then(() => dynamicObj.add(value))
        .then(() => dynamicObj.add(value))
        .then(() => {
            t.true(data)
            t.true(numOfRuns === 2)
        })
        .then(() => dynamicObj.delete(value))
        .then(() => dynamicObj.delete(value))
        .then(() => {
            t.false(data)
            t.true(numOfRuns === 3)
        })
})

/**
 * Map
 */

test('should observe mutations', t => {
    let data: string
    const dynamicObj = observable(new Map())
    observe(() => data = dynamicObj.get('key'))

    return Promise.resolve()
        .then(() => t.true(data === undefined))
        .then(() => dynamicObj.set('key', 'value'))
        .then(() => t.true(data === 'value'))
        .then(() => dynamicObj.delete('key'))
        .then(() => t.true(data === undefined))
})

test('should observe iteration', t => {
    let data: number
    const dynamicObj = observable(new Map())
    observe(() => {
        data = 0
        for (let [key, num] of dynamicObj) {
            data += num
        }
    })

    return Promise.resolve()
        .then(() => t.true(data === 0))
        .then(() => dynamicObj.set('key0', 3))
        .then(() => t.true(data === 3))
        .then(() => dynamicObj.set('key1', 2))
        .then(() => t.true(data === 5))
        .then(() => dynamicObj.delete('key0'))
        .then(() => t.true(data === 2))
        .then(() => dynamicObj.clear())
        .then(() => t.true(data === 0))
})

test('should not observe non value changing mutations', t => {
    let data: string
    let numOfRuns = 0
    const dynamicObj = observable(new Map())
    observe(() => {
        numOfRuns++
        data = dynamicObj.get('key')
    })

    return Promise.resolve()
        .then(() => {
            t.true(data === undefined)
            t.true(numOfRuns === 1)
        })
        .then(() => dynamicObj.set('key', 'value'))
        .then(() => dynamicObj.set('key', 'value'))
        .then(() => {
            t.true(data === 'value')
            t.true(numOfRuns === 2)
        })
        .then(() => dynamicObj.delete('key'))
        .then(() => dynamicObj.delete('key'))
        .then(() => {
            t.true(data === undefined)
            t.true(numOfRuns === 3)
        })
})

test('should observe map array', t => {
    let data: number
    const dynamicObj = observable(new Map<string, number[]>([["a", [1, 2, 3]]]))
    observe(() => data = dynamicObj.get("a").length)

    return Promise.resolve()
        .then(() => t.true(data === 3))
        .then(() => dynamicObj.get('a').push(4))
        .then(() => t.true(data === 4))
})

/**
 * WeakMap
 */

test('should observe mutations', t => {
    let data: string
    const key = {}
    const dynamicObj = observable(new WeakMap())
    observe(() => data = dynamicObj.get(key))

    return Promise.resolve()
        .then(() => t.true(data === undefined))
        .then(() => dynamicObj.set(key, 'value'))
        .then(() => t.true(data === 'value'))
        .then(() => dynamicObj.delete(key))
        .then(() => t.true(data === undefined))
})

test('should not observe non value changing mutations', t => {
    let data: string
    let numOfRuns = 0
    const key = {}
    const dynamicObj = observable(new WeakMap())
    observe(() => {
        numOfRuns++
        data = dynamicObj.get(key)
    })

    return Promise.resolve()
        .then(() => {
            t.true(data === undefined)
            t.true(numOfRuns === 1)
        })
        .then(() => dynamicObj.set(key, 'value'))
        .then(() => dynamicObj.set(key, 'value'))
        .then(() => {
            t.true(data === 'value')
            t.true(numOfRuns === 2)
        })
        .then(() => dynamicObj.delete(key))
        .then(() => dynamicObj.delete(key))
        .then(() => {
            t.true(data === undefined)
            t.true(numOfRuns === 3)
        })
})

/**
 * execution order
 */
test('should run in runner order the first time', t => {
    let data = ''
    const dynamicObj = observable({ prop1: 'prop1', prop2: 'prop2', prop3: 'prop3' })

    observe(() => data += dynamicObj.prop1)
    observe(() => data += dynamicObj.prop2)
    observe(() => data += dynamicObj.prop3)

    dynamicObj.prop3 = 'p3'
    dynamicObj.prop1 = 'p1'
    dynamicObj.prop2 = 'p2'

    return Promise.resolve()
        .then(() => t.true(data === 'prop1prop2prop3p3p1p2'))
})

/**
 * unobserve
 */

test('should unobserve the observed function', t => {
    let data = ''
    const dynamicObj = observable({ prop: '' })

    let numOfRuns = 0

    function test() {
        data = dynamicObj.prop
        numOfRuns++
    }

    const signal = observe(test)

    return Promise.resolve()
        .then(() => dynamicObj.prop = 'Hello')
        .then(() => signal.unobserve())
        .then(() => {
            t.true(signal.callback === undefined)
            t.true(signal.observedKeys === undefined)
        })
        .then(() => dynamicObj.prop = 'World')
        .then(() => dynamicObj.prop = '!')
        .then(() => t.true(numOfRuns === 2))
})

test('should not unobserve if the function is registered for the stack, because of sync', t => {
    let data: number
    const dynamicObj = observable({ prop: 0 })

    let numOfRuns = 0

    function test() {
        data = dynamicObj.prop
        numOfRuns++
    }

    const signal = observe(test)

    return Promise.resolve()
        .then(() => {
            dynamicObj.prop = 2 // but also run
            signal.unobserve()
        })
        .then(() => t.true(numOfRuns === 2))
})

test('should unobserve even if the function is registered for the stack, when use runInAction', t => {
    let data: number
    const dynamicObj = observable({ prop: 0 })

    let numOfRuns = 0

    function test() {
        data = dynamicObj.prop
        numOfRuns++
    }

    const signal = observe(test)

    return Promise.resolve()
        .then(() => {
            runInAction(() => {
                dynamicObj.prop = 2 // not run
                signal.unobserve()
            })
        })
        .then(() => t.true(numOfRuns === 1))
})

/**
 * extendObservable
 */

test('should observe properties when use extendObservable', t => {
    let data1: number
    let data2: number
    let numOfRuns = 0

    const dynamicObj = observable({
        a: 0,
        b: 1
    })

    const signal = observe(() => {
        data1 = dynamicObj.a
        data2 = dynamicObj.b
        numOfRuns++
    })

    return Promise.resolve()
        .then(() => t.true(numOfRuns === 1))
        .then(() => t.true(data1 === 0))
        .then(() => t.true(data2 === 1))
        .then(() => {
            extendObservable(dynamicObj, {
                a: 1,
                b: 2
            })
        })
        .then(() => t.true(numOfRuns === 2))
        .then(() => t.true(data1 === 1))
        .then(() => t.true(data2 === 2))
})

test('will trace dependency in anywhere', t => {
    let runCount = 0

    const dynamicObj = observable({
        a: 0,
        b: 1
    })

    observe(() => {
        // use a
        dynamicObj.a

        runSomeThing()

        runCount++
    })

    function runSomeThing() {
        // use b
        dynamicObj.b
    }

    dynamicObj.a = 2
    dynamicObj.b = 3

    return Promise.resolve()
        .then(() => t.true(runCount === 3))
})

test('runInAction will not trace dependency', t => {
    let runCount = 0

    const dynamicObj = observable({
        a: 0,
        b: 1
    })

    observe(() => {
        // use a
        dynamicObj.a

        runInAction(() => {
            dynamicObj.a = dynamicObj.b
        })

        runCount++
    })

    dynamicObj.b = 2

    return Promise.resolve()
        .then(() => t.true(runCount === 2))
})

/**
 * runInAction handle async
 */
test('runInAction not handle async function!!', t => {
    let runCount = 0
    let num = 0

    const dynamicObj = observable({
        a: 0,
        b: 1
    })

    observe(() => {
        // use a
        num = dynamicObj.a

        runCount++
    })

    runInAction(async () => {
        dynamicObj.a = 1
        await Promise.resolve()
        dynamicObj.a = 2
        dynamicObj.a = 3
        dynamicObj.a = 4
        dynamicObj.a = 5
    })

    return Promise.resolve()
        .then(() => t.true(runCount === 6))
        .then(() => t.true(num === 5))
})

test('runInAction handle async function with runInAction', t => {
    let runCount = 0
    let num = 0

    const dynamicObj = observable({
        a: 0,
        b: 1
    })

    observe(() => {
        // use a
        num = dynamicObj.a

        runCount++
    })

    runInAction(async () => {
        dynamicObj.a = 1
        await Promise.resolve()

        runInAction(() => {
            dynamicObj.a = 2
            dynamicObj.a = 3
            dynamicObj.a = 4
            dynamicObj.a = 5
        })
    })

    return Promise.resolve()
        .then(() => t.true(runCount === 3))
        .then(() => t.true(num === 5))
})

/**
 * Branch judgment
 */

test('branch judgment', t => {
    let value = 0
    let runCount = 0

    const dynamicObj = observable({
        a: true,
        b: 1,
        c: 2
    })

    observe(() => {
        runCount++

        if (dynamicObj.a) {
            value = dynamicObj.b
        } else {
            value = dynamicObj.c
        }
    })

    return Promise.resolve()
        .then(() => t.true(value === 1))
        .then(() => t.true(runCount === 1))
        .then(() => dynamicObj.c = 3) // nothing happend
        .then(() => t.true(value === 1))
        .then(() => t.true(runCount === 1))
        .then(() => dynamicObj.a = false)
        .then(() => t.true(value === 3))
        .then(() => t.true(runCount === 2))
        .then(() => dynamicObj.c = 4)
        .then(() => t.true(value === 4))
        .then(() => t.true(runCount === 3))
        .then(() => dynamicObj.b = 5)
        .then(() => t.true(value === 4))
        .then(() => t.true(runCount === 3))
})
