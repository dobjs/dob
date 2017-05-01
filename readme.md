# dynamic-object

worked with `object` `array` `map` `weakMap` `set` `weakSet`

## observe

Observe will also be executed once at initialization

```typescript
import { observe, observable } from 'dynamic-object'

const dynamicObj = observable({
    a: 1,
    b: 2
})

observe(() => {
    console.log('dynamicObj.b change to', dynamicObj.b) 
})

dynamicObj.b = 4

// # run
// print 'dynamicObj.b change to 2'
// print 'dynamicObj.b change to 4'
```

## runInAction

```typescript
import { observe, observable, runInAction } from 'dynamic-object'

const dynamicObj = observable({
    a: 1,
    b: 2
})

let runCount = 0

observe(() => {
    console.log('dynamicObj.b change to', dynamicObj.b)
    runCount++
})

runInAction(()=>{
    dynamicObj.b = 3
    dynamicObj.b = 4
    dynamicObj.b = 5
    dynamicObj.b = 6
    dynamicObj.b = 7 
})

console.log(runCount)

// # run
// print 'dynamicObj.b change to 2'
// print 'dynamicObj.b change to 7'
// print 2
```

## unobserve

```typescript
import { observe, observable } from 'dynamic-object'

const dynamicObj = observable({
    a: 1,
    b: 2
})

const signal = observe(() => {
    console.log('dynamicObj.b change to', dynamicObj.b) 
})

dynamicObj.b = 4

setInterval(()=>{
    signal.unobserve()
    dynamicObj.b = 5 // nothing happened
})

// # run
// print 'dynamicObj.b change to 2'
// print 'dynamicObj.b change to 4'

// the same as
// setInterval(()=>{
//     dynamicObj.b = 5 // nothing happened
//     signal.unobserve()
// })
```

## Action

```typescript
import { observe, observable, Action } from 'dynamic-object'

const dynamicObj = observable({
    a: 1,
    b: 2
})

let runCount = 0

observe(() => {
    console.log('dynamicObj.b change to', dynamicObj.b)
    runCount++
})

class CustomAction {
    @Action someAction() {
        dynamicObj.b = 3
        dynamicObj.b = 4
        dynamicObj.b = 5
        dynamicObj.b = 6
        dynamicObj.b = 7
    }
}

const customAction = new CustomAction()
customAction.someAction()

console.log(runCount)

// # run
// print 'dynamicObj.b change to 2'
// print 'dynamicObj.b change to 4'
```