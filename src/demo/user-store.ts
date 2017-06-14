import { observable } from "../index"

export default class User {
  private store = observable({
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

  public setName(name: string) {
    this.store.name = name
  }

  public addArticle(article: any) {
    this.store.articles.push(article)
  }
}
