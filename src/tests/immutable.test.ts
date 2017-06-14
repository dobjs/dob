import test from "ava"
import { Action, extendObservable, isObservable, observable, observe, onSnapshot, Static } from "../index"

test("basic test", t => {
  const snapshots: any = []

  const user = observable({
    name: "小明",
    age: 5,
    articles: [{
      title: "福尔摩斯探案",
      price: 59
    }, {
      title: "精灵的城堡",
      price: 63
    }]
  })

  onSnapshot(user, snapshot => {
    snapshots.push(snapshot)
  })

  user.name = "小红"
  user.articles = [{
    title: "666",
    price: 777
  }]
  user.name = "小黑"
  user.age = 7
  user.articles[0].title = "福尔摩斯2"

  t.true(snapshots[0] !== snapshots[1])
})
