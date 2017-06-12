import { observable, observe, onSnapshot } from "./index"

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
  // console.log(snapshot)
})

user.name = "小红"
user.name = "小黑"
user.age = 7
user.articles[0].title = "福尔摩斯2"
