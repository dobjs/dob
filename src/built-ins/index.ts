import MapShim from "./map"
import SetShim from "./set"
import WeakMapShim from "./weak-map"
import WeakSetShim from "./weak-set"

export default new Map<any, any>([
    [Map, MapShim],
    [Set, SetShim],
    [WeakMap, WeakMapShim],
    [WeakSet, WeakSetShim],
    [Date, true],
    [RegExp, true]
])
