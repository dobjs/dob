# dynamic-object

worked with `object` `array` `map` `weakMap` `set` `weakSet`

## Dynamic tracking variable

Observe will also be executed once at initialization

```typescript
import { observe, observable } from 'dynamic-object'

const dynamicObj = observable({
    a: 1,
    b: 2
})

observe(() => {
    console.log('dynamicObj.b change to', dynamicObj.b) // print 'dynamicObj.b change to 2'
})

dynamicObj.a = 3 // nothing happened
dynamicObj.b = 4 // print 'dynamicObj.b change to 4'
```

## Performance optimization

```typescript
import { observe, observable } from 'dynamic-object'

const dynamicObj = observable({
    a: 1,
    b: 2
})

let runCount = 0

observe(() => {
    console.log('dynamicObj.b change to', dynamicObj.b) // print 'dynamicObj.b change to 2'
    runCount++
})

dynamicObj.b = 3
dynamicObj.b = 4
dynamicObj.b = 5
dynamicObj.b = 6
dynamicObj.b = 7 // print 'dynamicObj.b change to 7'
console.log(runCount) // 2
```

## unobserve

```typescript
import { observe, observable } from 'dynamic-object'

const dynamicObj = observable({
    a: 1,
    b: 2
})

const signal = observe(() => {
    console.log('dynamicObj.b change to', dynamicObj.b) // print 'dynamicObj.b change to 2'
})

dynamicObj.a = 3 // nothing happened
dynamicObj.b = 4 // print 'dynamicObj.b change to 4'

setInterval(()=>{
    signal.unobserve()
    dynamicObj.b = 5 // nothing happened
})

// the same as
// setInterval(()=>{
//     dynamicObj.b = 5 // nothing happened
//     signal.unobserve()
// })
```